import os
import json
import time
import base64
import re
import requests
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path)

SUPABASE_URL         = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
NVIDIA_API_KEY       = os.getenv("NVIDIA_API_KEY", "").strip()
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "").strip()
MISTRAL_API_KEY      = os.getenv("MISTRAL_API_KEY", "").strip()
GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "").strip()

# ── Config ────────────────────────────────────────────────────────────────────
AI_DELAY_S = 5   # seconds between products

# ── Model IDs ─────────────────────────────────────────────────────────────────
NVIDIA_MODEL   = "meta/llama-3.2-90b-vision-instruct"
GEMINI_LITE    = "gemini-2.5-flash-lite"
GEMINI_PRIMARY = "gemini-2.0-flash-lite"
MISTRAL_MODEL  = "pixtral-12b-2409"
GROQ_MODEL     = "openai/gpt-oss-120b"

# ── Validate ──────────────────────────────────────────────────────────────────
missing = [k for k, v in {
    "NEXT_PUBLIC_SUPABASE_URL":  SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_KEY,
}.items() if not v]

if missing:
    print(f"✗ Missing env vars: {', '.join(missing)}")
    exit(1)

# ── Supabase headers ──────────────────────────────────────────────────────────
DB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}


# ══════════════════════════════════════════════════════════════════════════════
# ALREADY-ENRICHED DETECTION
# ══════════════════════════════════════════════════════════════════════════════

def is_already_enriched(description: str, keywords: dict) -> bool:
    """
    Heuristic: if the description already contains at least one of the product's
    color or material keywords, it has been enriched — skip it.
    This is more reliable than relying on index order from Supabase.
    """
    if not description or not keywords:
        return False

    desc_lower = description.lower()

    colors    = [c.lower() for c in keywords.get("colors",    [])]
    materials = [m.lower() for m in keywords.get("materials", [])]

    for word in colors + materials:
        if word and word in desc_lower:
            return True

    return False


def has_enrichable_keywords(keywords: dict) -> bool:
    """Need at least colors or materials to produce a meaningful enriched description."""
    return bool(keywords.get("colors") or keywords.get("materials") or keywords.get("patterns"))


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT
# ══════════════════════════════════════════════════════════════════════════════

def build_description_prompt(
    existing_description: str,
    keywords: dict,
    product_name: str,
) -> str:
    colors    = keywords.get("colors",    [])
    materials = keywords.get("materials", [])
    patterns  = keywords.get("patterns",  [])
    categories = keywords.get("categories", [])

    # Derive garment type hint from categories — most specific first
    garment_hint = ""
    garment_priority = [
        "gown", "maxi dress", "midi dress", "mini dress", "bodycon dress", "wrap dress",
        "shift dress", "skater dress", "kaftan", "jumpsuit", "playsuit", "romper",
        "jeans", "trousers", "pants", "shirt", "top", "t-shirt", "dress"
    ]
    for g in garment_priority:
        if g in [c.lower() for c in categories]:
            garment_hint = g
            break

    image_instruction = (
        "You have been given the product image alongside this prompt. "
        "Use it to confirm the garment type, fabric texture, and overall aesthetic — "
        "this will make your description more vivid and accurate."
    )

    return f"""You are a luxury fashion copywriter for RP Apparels, a premium Nigerian fashion store.

{image_instruction}

Your task is to enrich an existing product description by naturally weaving in the garment's 
physical details — color, material, pattern, and garment type. The result must feel warm, 
aspirational, and beautifully written. A buyer should finish reading and have a vivid, 
accurate mental picture of exactly what they are getting.

━━━ PRODUCT INFO ━━━
Name: {product_name}
Existing description: "{existing_description}"

━━━ PHYSICAL DETAILS TO WEAVE IN ━━━
Colors:      {json.dumps(colors)}
Materials:   {json.dumps(materials)}
Patterns:    {json.dumps(patterns)}
Garment type: "{garment_hint}"

━━━ STRICT RULES ━━━
1. PRESERVE the original message and intent of the existing description — do not remove or contradict anything it says
2. Naturally weave in the colors, materials, patterns, and garment type so it flows as one cohesive piece
3. If the existing description already mentions a color/material/pattern, integrate gracefully — do not repeat awkwardly
4. Write in warm, aspirational, sensory language — make the reader want to wear it
5. Mention the garment type clearly so the buyer knows exactly what kind of piece this is (dress, jeans, jumpsuit, etc.)
6. Keep it concise — 2 to 4 sentences maximum. Do not write an essay.
7. Do not use hashtags, bullet points, or markdown — pure flowing prose only
8. Do not start with the product name

━━━ OUTPUT FORMAT ━━━
Return ONLY the enriched description as plain text — no JSON, no surrounding quotes, no extra text whatsoever.
"""


# ══════════════════════════════════════════════════════════════════════════════
# IMAGE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def get_video_thumbnail_url(video_url):
    if not video_url:
        return None
    url = video_url.replace("/video/upload/", "/video/upload/so_2,w_400,h_400,c_fill/")
    return re.sub(r"\.\w+$", ".jpg", url)


def resolve_image_url(product):
    if product.get("image_url"):
        return product["image_url"], "image"
    thumb = get_video_thumbnail_url(product.get("video_url"))
    if thumb:
        return thumb, "video thumbnail"
    return None, "none"


def fetch_image_as_base64(image_url: str):
    resp = requests.get(image_url, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Image fetch failed {resp.status_code}")
    mime = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
    b64  = base64.b64encode(resp.content).decode("utf-8")
    return b64, mime


# ══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ══════════════════════════════════════════════════════════════════════════════

def fetch_all_products():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=DB_HEADERS,
        params={
            "select":  "id,name,description,image_url,video_url,keywords",
            "deleted": "eq.false",
            "limit":   1000,
        }
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Supabase fetch failed {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def save_description(product_id: str, description: str):
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
        headers=DB_HEADERS,
        json={"description": description},
    )
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Save failed {resp.status_code}: {resp.text[:200]}")


# ══════════════════════════════════════════════════════════════════════════════
# AI CALLERS — all vision models so NVIDIA sees the image for better accuracy
# ══════════════════════════════════════════════════════════════════════════════

def call_nvidia(prompt: str, b64: str, mime: str) -> str:
    if not NVIDIA_API_KEY:
        raise RuntimeError("NVIDIA_API_KEY not set")
    resp = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": NVIDIA_MODEL,
            "messages": [{"role": "user", "content": [
                {"type": "text",      "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ]}],
            "max_tokens":  300,
            "temperature": 0.7,
            # Note: no response_format json here — we want plain text
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"NVIDIA {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_gemini(model_id: str, prompt: str, b64: str, mime: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set")
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"role": "user", "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime, "data": b64}},
            ]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 300},
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Gemini {model_id} {resp.status_code}: {resp.text[:200]}")
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def call_mistral(prompt: str, b64: str, mime: str) -> str:
    if not MISTRAL_API_KEY:
        raise RuntimeError("MISTRAL_API_KEY not set")
    resp = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": MISTRAL_MODEL,
            "messages": [{"role": "user", "content": [
                {"type": "text",      "text": prompt},
                {"type": "image_url", "image_url": f"data:{mime};base64,{b64}"},
            ]}],
            "max_tokens":  300,
            "temperature": 0.7,
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Mistral {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_groq(prompt: str, b64: str, mime: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": [
                {"type": "text",      "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ]}],
            "max_tokens":  300,
            "temperature": 0.7,
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Groq {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_description_ai(prompt: str, b64: str, mime: str) -> str:
    """
    Try all models in order — NVIDIA first since it's vision-native and most reliable.
    All models receive the image so they can see the garment directly.
    """
    attempts = [
        ("NVIDIA Llama Vision", lambda: call_nvidia(prompt, b64, mime)),
        ("Gemini Lite",         lambda: call_gemini(GEMINI_LITE,    prompt, b64, mime)),
        ("Mistral Pixtral",     lambda: call_mistral(prompt, b64, mime)),
        ("Gemini Primary",      lambda: call_gemini(GEMINI_PRIMARY, prompt, b64, mime)),
        ("Groq",                lambda: call_groq(prompt, b64, mime)),
    ]
    errors = []
    for label, fn in attempts:
        try:
            result = fn()
            # Basic sanity check — must be non-empty prose
            if result and len(result) > 20:
                print(f"✓ ({label})")
                return result
            raise RuntimeError(f"Response too short: '{result}'")
        except Exception as e:
            errors.append(f"{label}: {e}")
            print(f"  ✗ {label} failed — trying next...", flush=True)

    raise RuntimeError("All models failed:\n  " + "\n  ".join(errors))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════╗")
    print("║   RP Apparels — Description Enrichment       ║")
    print("║           Resume Script                      ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"\n  Skipping products whose description already contains")
    print(f"  a color or material keyword — they were done in the last run.\n")

    print("Fetching products...", end=" ", flush=True)
    products = fetch_all_products()
    print(f"{len(products)} found")

    # ── Categorise ────────────────────────────────────────────────────────────
    already_done  = []
    no_keywords   = []
    no_media      = []
    to_process    = []

    for p in products:
        kw          = p.get("keywords") or {}
        description = p.get("description") or ""
        image_url, _= resolve_image_url(p)

        if is_already_enriched(description, kw):
            already_done.append(p)
        elif not has_enrichable_keywords(kw):
            no_keywords.append(p)
        elif not image_url:
            no_media.append(p)
        else:
            to_process.append(p)

    print(f"\n  ✓ Already enriched  : {len(already_done)}")
    print(f"  ⚠ No usable keywords: {len(no_keywords)}")
    print(f"  ⚠ No media          : {len(no_media)}")
    print(f"  → To process        : {len(to_process)}")

    if no_keywords:
        print(f"\n  Products without color/material keywords (skipped):")
        for p in no_keywords:
            print(f"    - {p['name']}")

    if no_media:
        print(f"\n  Products without image/video (skipped):")
        for p in no_media:
            print(f"    - {p['name']}")

    if not to_process:
        print("\n  Nothing to do ✓")
        return

    est = round(len(to_process) * AI_DELAY_S / 60, 1)
    print(f"\n  ~{est} minutes at {AI_DELAY_S}s delay\n")
    print("─" * 50)

    updated = 0
    errors  = 0

    for i, p in enumerate(to_process, start=1):
        name        = p.get("name", "Unknown")
        description = p.get("description") or ""
        kw          = p.get("keywords") or {}
        image_url, source = resolve_image_url(p)

        print(f"\n  [{i}/{len(to_process)}] \"{name}\" ({source})")

        # Fetch image
        try:
            print(f"    → Fetching image...", end=" ", flush=True)
            b64, mime = fetch_image_as_base64(image_url)
            print("✓")
        except Exception as e:
            print(f"✗ {e}")
            errors += 1
            continue

        # Build prompt
        prompt = build_description_prompt(
            existing_description = description,
            keywords             = kw,
            product_name         = name,
        )

        # Call AI
        try:
            print(f"    → Generating description... ", end="", flush=True)
            enriched = call_description_ai(prompt, b64, mime)

            # Print preview
            preview = enriched[:100] + "..." if len(enriched) > 100 else enriched
            print(f'    Preview: "{preview}"')
        except Exception as e:
            print(f"\n    ✗ All models failed: {e}")
            errors += 1
            if i < len(to_process):
                time.sleep(AI_DELAY_S)
            continue

        # Save to DB
        try:
            print(f"    → Saving...", end=" ", flush=True)
            save_description(p["id"], enriched)
            print("✓")
            updated += 1
        except Exception as e:
            print(f"✗ {e}")
            errors += 1

        if i < len(to_process):
            print(f"    ⏸  {AI_DELAY_S}s...")
            time.sleep(AI_DELAY_S)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n╔══════════════════════════════════════════════╗")
    print("║                   Summary                    ║")
    print("╠══════════════════════════════════════════════╣")
    print(f"║  Already done (skipped) : {str(len(already_done)).ljust(19)}║")
    print(f"║  Descriptions updated   : {str(updated).ljust(19)}║")
    print(f"║  Errors                 : {str(errors).ljust(19)}║")
    print("╚══════════════════════════════════════════════╝")


if __name__ == "__main__":
    main()
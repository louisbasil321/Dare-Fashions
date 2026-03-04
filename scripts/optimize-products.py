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
AI_DELAY_S   = 6    # seconds between products — stays under free tier rate limits
CATEGORY_MAX = 20   # if a product already has >= this many category tags, skip category optimization

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
# PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

def build_keywords_optimization_prompt(
    existing_categories: list,
    existing_occasions:  list,
    skip_categories:     bool,
    product_name:        str,
    product_description: str,
) -> str:
    cats_json  = json.dumps(existing_categories)
    occs_json  = json.dumps(existing_occasions)
    skip_note  = (
        f"The category list already has {len(existing_categories)} tags (≥{CATEGORY_MAX}). "
        "DO NOT touch categories at all — return existing_categories unchanged in your output."
        if skip_categories else
        "The category list has room to grow — optimize it as instructed below."
    )

    return f"""You are an expert fashion cataloger for a Nigerian fashion e-commerce store.
You will be given a clothing product image, its name, its description, and its EXISTING keyword data.

Your job is to OPTIMIZE two keyword fields: categories and occasions.
You must be EXTREMELY careful — study the image closely before making any judgment.
If you are not 100% certain about a tag, do NOT add it.
Never contradict what you can clearly see in the image.

━━━ PRODUCT INFO ━━━
Name: {product_name}
Description: {product_description}

━━━ EXISTING DATA ━━━
existing_categories: {cats_json}
existing_occasions:  {occs_json}

━━━ YOUR TASK ━━━

{skip_note}

── CATEGORIES (only if not skipped) ──
Study the image carefully. Identify the exact garment type, neckline, sleeves, fit, length, and aesthetic.

REMOVAL RULES (strict — only remove if it GRAVELY contradicts the actual garment):
  - "sleeveless" → remove ONLY if the garment clearly has sleeves (short or long)
  - "long sleeve dress" / "long sleeve" → remove ONLY if there are clearly no long sleeves
  - "short sleeve dress" / "short sleeve" → remove ONLY if there are clearly no short sleeves
  - "mini" / "mini dress" → remove ONLY if the garment is clearly midi or maxi length
  - "maxi" / "maxi dress" → remove ONLY if the garment is clearly mini or midi length
  - "strapless" / "boob tube" → remove ONLY if there are clearly visible straps or sleeves
  - Any other tag: DO NOT remove unless it is an absolute glaring contradiction
  - When in doubt → KEEP IT. Never remove based on a guess.

ADDITION RULES:
  - Add tags from the categories reference list below that clearly apply and are NOT already present
  - Only add a tag if you are confident it matches what you see in the image
  - Do not add duplicates — check existing_categories carefully
  - Aim to reach 18–25 total tags for dresses/gowns, 12–20 for jeans/trousers, 8–15 for shirts/tops

── OCCASIONS ──
  - NEVER remove any existing occasion — the existing list is sacred, only grow it
  - Add any additional occasions from the allowed list that clearly suit this garment
  - Only add occasions you are genuinely confident about

━━━ CATEGORIES REFERENCE ━━━
Use ONLY these types of tags. Add only what visually matches.

DRESSES & GOWNS — layers to cover:
  Garment type: mini dress, midi dress, maxi dress, bodycon dress, wrap dress, shift dress,
    shirt dress, skater dress, gown, kaftan, two-piece dress, two-piece set, dress
  Neckline: v-neck, deep v-neck, scoop neck, square neck, high neck, turtleneck neck,
    off shoulder, one shoulder, halter neck, sweetheart neckline, cowl neck, boat neck,
    plunge neckline, open back, backless, keyhole neckline, wide neck, spaghetti strap, strapless, boob tube
  Sleeves: sleeveless, short sleeve dress, long sleeve dress, 3/4 sleeve dress,
    balloon sleeves, puff sleeves, bubble sleeves
  Fit/silhouette: bodycon, fitted, flowy, loose, a-line, ruched, draped, pleated, corset
  Length: mini, midi, maxi, short, long, knee length, floor length, thigh length
  Aesthetic/vibe: elegant dress, classy dress, sexy dress, cute dress, flowy dress,
    date night dress, dinner dress, going out dress, night out dress, wedding guest dress,
    church dress, owambe dress, asoebi dress, red carpet dress, glam dress, rich aunty dress,
    instagram dress, vacation dress, brunch dress

JEANS & TROUSERS:
  Type: jeans, jean, pants, trousers, denim
  Fit: skinny jeans, slim fit jeans, straight leg jeans, wide leg jeans, baggy jeans,
    flare jeans, flared jeans, bootcut jeans, mom jeans, boyfriend jeans, cargo jeans,
    wide leg pants, flare pants, flared pants
  Condition: ripped jeans, ripped, torn jeans, torn, distressed jeans, distressed,
    clean jeans, plain jeans, acid washed, sandwashed, stone washed, patched jeans, embroidered jeans
  Rise: high waist jeans, high rise jeans, low rise jeans, mid rise jeans
  Standalone: baggy, skinny, flare, ripped, torn, wide leg, straight, slim, stacked

SHIRTS:
  Type: shirt, top, button-down shirt, casual shirt, dress shirt
  Style: long sleeve shirt, short sleeve shirt, checkered shirt, plaid shirt,
    flannel shirt, Oxford shirt, linen shirt, oversized shirt
  Fit: fitted shirt, slim fit shirt, regular fit, oversized
  Vibe: office shirt, corporate shirt, smart casual shirt, going out shirt

TOPS & TEES:
  Type: top, t-shirt, tee, crop top, tank top, polo, polo shirt, camisole, vest top, knit top, ribbed top
  Style: graphic tee, plain tee, oversized tee, fitted top, half zip,
    bubble knit, textured top, stretchy top
  Vibe: casual top, everyday top, going out top, night out top

JUMPSUITS:
  Type: jumpsuit, playsuit, romper, one piece, catsuit
  Fit: fitted jumpsuit, wide leg jumpsuit, baggy jumpsuit

━━━ OCCASIONS REFERENCE ━━━
Only use values from this exact list:
  "casual", "streetwear", "corporate", "smart casual", "cocktail", "formal",
  "party", "date night", "night out", "brunch", "owambe", "wedding guest",
  "church", "burial", "vacation", "resort", "athletic", "bridal"

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON object — no markdown, no explanation, no extra text.
Exactly this shape:
{{
  "categories": [...],
  "occasions": [...]
}}

Where:
  - "categories" is the full optimized list (existing + additions - grave contradictions), or unchanged if skipped
  - "occasions" is the full optimized list (existing + additions, never fewer than existing)
"""


def build_description_prompt(
    existing_description: str,
    keywords: dict,
    product_name: str,
) -> str:
    colors     = keywords.get("colors",    [])
    materials  = keywords.get("materials", [])
    patterns   = keywords.get("patterns",  [])
    categories = keywords.get("categories", [])

    # Derive garment type hint from categories
    garment_hint = ""
    garment_priority = [
        "gown", "maxi dress", "midi dress", "mini dress", "bodycon dress", "wrap dress",
        "shift dress", "skater dress", "kaftan", "jumpsuit", "playsuit", "romper",
        "jeans", "trousers", "pants", "shirt", "top", "t-shirt", "dress"
    ]
    for g in garment_priority:
        if g in categories:
            garment_hint = g
            break

    return f"""You are a luxury fashion copywriter for RP Apparels, a premium Nigerian fashion store.

Your task is to enrich an existing product description by weaving in the garment's physical details — 
color, material, pattern, and garment type — in a way that feels natural, beautiful, and informative.
The buyer should finish reading and have a vivid, accurate mental picture of exactly what they are getting.

━━━ PRODUCT INFO ━━━
Name: {product_name}
Existing description: "{existing_description}"

━━━ PHYSICAL DETAILS TO WEAVE IN ━━━
Colors:     {json.dumps(colors)}
Materials:  {json.dumps(materials)}
Patterns:   {json.dumps(patterns)}
Garment type hint: "{garment_hint}"

━━━ RULES ━━━
1. PRESERVE the original message and intent of the existing description completely — do not remove or contradict anything it says
2. Naturally weave in the colors, materials, patterns, and garment type so the description flows as one cohesive piece
3. If the existing description already mentions a color/material/pattern, do not repeat it awkwardly — integrate gracefully
4. Write in warm, aspirational, sensory language — make the reader want to wear it
5. Mention the garment type clearly so the buyer knows exactly what kind of piece it is
6. Keep it concise — 2 to 4 sentences maximum. Do not write an essay.
7. Do not use hashtags, bullet points, or markdown — pure flowing prose only
8. Do not start with the product name

━━━ OUTPUT FORMAT ━━━
Return ONLY the enriched description as a plain string — no JSON, no quotes wrapping it, no extra text.
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
    """Download image and return (base64_str, mime_type)."""
    resp = requests.get(image_url, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Image fetch failed {resp.status_code}: {image_url}")
    mime = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
    b64  = base64.b64encode(resp.content).decode("utf-8")
    return b64, mime


# ══════════════════════════════════════════════════════════════════════════════
# DATABASE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def fetch_all_products():
    url    = f"{SUPABASE_URL}/rest/v1/products"
    params = {
        "select":  "id,name,description,image_url,video_url,keywords",
        "deleted": "eq.false",
        "limit":   1000,
    }
    resp = requests.get(url, headers=DB_HEADERS, params=params)
    if resp.status_code != 200:
        raise RuntimeError(f"Supabase fetch failed {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def save_optimized_to_db(product_id: str, updates: dict):
    """
    updates may contain any subset of: keywords, description
    keywords is merged — we only overwrite categories and occasions, preserving colors/materials/patterns
    """
    url  = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    resp = requests.patch(url, headers=DB_HEADERS, json=updates)
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Save failed {resp.status_code}: {resp.text[:200]}")


# ══════════════════════════════════════════════════════════════════════════════
# JSON EXTRACTOR
# ══════════════════════════════════════════════════════════════════════════════

def extract_json(text: str) -> dict:
    fence = re.search(r"```(?:json)?\n?([\s\S]*?)\n?```", text)
    raw   = fence.group(1) if fence else text
    return json.loads(raw.strip())


# ══════════════════════════════════════════════════════════════════════════════
# AI CALLERS — KEYWORDS OPTIMIZATION (vision)
# ══════════════════════════════════════════════════════════════════════════════

def call_nvidia_keywords(prompt: str, b64: str, mime: str) -> dict:
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
            "max_tokens": 1000,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"NVIDIA error {resp.status_code}: {resp.text[:200]}")
    return extract_json(resp.json()["choices"][0]["message"]["content"])


def call_gemini_keywords(model_id: str, prompt: str, b64: str, mime: str) -> dict:
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
            "generationConfig": {"responseMimeType": "application/json"},
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Gemini {model_id} error {resp.status_code}: {resp.text[:200]}")
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return extract_json(text)


def call_mistral_keywords(prompt: str, b64: str, mime: str) -> dict:
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
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Mistral error {resp.status_code}: {resp.text[:200]}")
    return extract_json(resp.json()["choices"][0]["message"]["content"])


def call_groq_keywords(prompt: str, b64: str, mime: str) -> dict:
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
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"Groq error {resp.status_code}: {resp.text[:200]}")
    return extract_json(resp.json()["choices"][0]["message"]["content"])


def call_keywords_optimization(prompt: str, b64: str, mime: str) -> dict:
    """Try all vision models in order, return first success."""
    attempts = [
        ("NVIDIA Llama Vision", lambda: call_nvidia_keywords(prompt, b64, mime)),
        ("Gemini Lite",         lambda: call_gemini_keywords(GEMINI_LITE,    prompt, b64, mime)),
        ("Mistral Pixtral",     lambda: call_mistral_keywords(prompt, b64, mime)),
        ("Gemini Primary",      lambda: call_gemini_keywords(GEMINI_PRIMARY, prompt, b64, mime)),
        ("Groq",                lambda: call_groq_keywords(prompt, b64, mime)),
    ]
    errors = []
    for label, fn in attempts:
        try:
            result = fn()
            print(f"✓ ({label})", end=" ")
            return result
        except Exception as e:
            errors.append(f"{label}: {e}")
    raise RuntimeError("All models failed:\n  " + "\n  ".join(errors))


# ══════════════════════════════════════════════════════════════════════════════
# AI CALLERS — DESCRIPTION ENRICHMENT (text only — no image needed)
# ══════════════════════════════════════════════════════════════════════════════

def call_groq_description(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "llama-3.3-70b-versatile",   # best free text model on Groq
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 300,
        },
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"Groq description error {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_gemini_description(model_id: str, prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set")
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 300},
        },
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"Gemini description error {resp.status_code}: {resp.text[:200]}")
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def call_description_enrichment(prompt: str) -> str:
    """Try text models in order for description enrichment."""
    attempts = [
        ("Groq Llama",     lambda: call_groq_description(prompt)),
        ("Gemini Lite",    lambda: call_gemini_description(GEMINI_LITE,    prompt)),
        ("Gemini Primary", lambda: call_gemini_description(GEMINI_PRIMARY, prompt)),
    ]
    errors = []
    for label, fn in attempts:
        try:
            result = fn()
            print(f"✓ ({label})", end=" ")
            return result
        except Exception as e:
            errors.append(f"{label}: {e}")
    raise RuntimeError("All description models failed:\n  " + "\n  ".join(errors))


# ══════════════════════════════════════════════════════════════════════════════
# MERGE HELPERS — enforce the rules in Python too, as a safety net
# ══════════════════════════════════════════════════════════════════════════════

def merge_categories(existing: list, ai_result: list) -> list:
    """
    - Start from ai_result (AI already applied removal + addition rules)
    - Re-enforce safety: anything in existing that is NOT a grave contradiction stays
    - Deduplicate, preserve order (existing first, then new additions)
    """
    existing_lower = [t.lower() for t in existing]
    ai_lower       = [t.lower() for t in ai_result]

    # Build final set: union of existing + ai_result, deduplicated
    seen   = set()
    result = []

    for tag in ai_result:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            result.append(tag)

    # Re-add anything from existing that AI dropped but isn't a clear contradiction
    # (extra safety net — the AI should have done this, but just in case)
    ai_set = set(ai_lower)
    for tag in existing:
        key = tag.lower()
        if key not in ai_set and key not in seen:
            seen.add(key)
            result.append(tag)

    return result


def merge_occasions(existing: list, ai_result: list) -> list:
    """
    Occasions: existing is sacred. Only add, never remove.
    """
    allowed = {
        "casual", "streetwear", "corporate", "smart casual", "cocktail", "formal",
        "party", "date night", "night out", "brunch", "owambe", "wedding guest",
        "church", "burial", "vacation", "resort", "athletic", "bridal"
    }
    seen   = set(t.lower() for t in existing)
    result = list(existing)  # start from existing, untouched

    for occ in ai_result:
        key = occ.lower()
        if key in allowed and key not in seen:
            seen.add(key)
            result.append(occ)

    return result


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PROCESSING LOOP
# ══════════════════════════════════════════════════════════════════════════════

def process_product(p: dict, index: int, total: int) -> dict:
    """
    Returns a summary dict: { keywords_updated, description_updated, skipped_categories, error }
    """
    name        = p.get("name", "Unknown")
    description = p.get("description") or ""
    keywords    = p.get("keywords") or {}

    existing_categories = keywords.get("categories", [])
    existing_occasions  = keywords.get("occasions",  [])

    image_url, source = resolve_image_url(p)

    print(f"\n  [{index}/{total}] \"{name}\" ({source})")

    if not image_url:
        print(f"    ⚠ No image or video — skipping")
        return {"keywords_updated": False, "description_updated": False, "skipped_categories": False, "error": "no media"}

    skip_categories = len(existing_categories) >= CATEGORY_MAX
    if skip_categories:
        print(f"    ℹ Categories already has {len(existing_categories)} tags (≥{CATEGORY_MAX}) — will skip category optimization")

    # ── Step 1: Fetch image ───────────────────────────────────────────────────
    try:
        print(f"    → Fetching image...", end=" ", flush=True)
        b64, mime = fetch_image_as_base64(image_url)
        print("✓")
    except Exception as e:
        print(f"✗ {e}")
        return {"keywords_updated": False, "description_updated": False, "skipped_categories": skip_categories, "error": str(e)}

    # ── Step 2: Keywords optimization (vision AI) ─────────────────────────────
    keywords_updated = False
    final_categories = existing_categories
    final_occasions  = existing_occasions

    try:
        print(f"    → Keywords optimization...", end=" ", flush=True)
        kw_prompt = build_keywords_optimization_prompt(
            existing_categories = existing_categories,
            existing_occasions  = existing_occasions,
            skip_categories     = skip_categories,
            product_name        = name,
            product_description = description,
        )
        ai_kw = call_keywords_optimization(kw_prompt, b64, mime)

        # Merge with safety nets
        if not skip_categories:
            final_categories = merge_categories(existing_categories, ai_kw.get("categories", existing_categories))
        final_occasions = merge_occasions(existing_occasions, ai_kw.get("occasions", existing_occasions))

        cats_added = len(final_categories) - len(existing_categories)
        occs_added = len(final_occasions)  - len(existing_occasions)
        print(f"cats +{cats_added} → {len(final_categories)} | occs +{occs_added} → {len(final_occasions)}")
        keywords_updated = True

    except Exception as e:
        print(f"✗ {e}")
        # Don't abort — still try description enrichment

    # ── Step 3: Description enrichment (text AI) ──────────────────────────────
    description_updated = False
    final_description   = description

    # Only enrich if we have at least some keyword data to work with
    has_keyword_data = any([
        keywords.get("colors"),
        keywords.get("materials"),
        keywords.get("patterns"),
    ])

    if not has_keyword_data:
        print(f"    ℹ No color/material/pattern keywords — skipping description enrichment")
    else:
        try:
            print(f"    → Description enrichment...", end=" ", flush=True)
            desc_prompt = build_description_prompt(
                existing_description = description,
                keywords             = keywords,  # use original keywords (colors/materials/patterns unchanged)
                product_name         = name,
            )
            final_description   = call_description_enrichment(desc_prompt)
            description_updated = True
            print(f"\n      \"{final_description[:80]}...\"" if len(final_description) > 80 else f"\n      \"{final_description}\"")
        except Exception as e:
            print(f"✗ {e}")

    # ── Step 4: Save to DB ────────────────────────────────────────────────────
    if keywords_updated or description_updated:
        try:
            print(f"    → Saving to DB...", end=" ", flush=True)

            # Build the updated keywords object — only touch categories and occasions
            updated_keywords = {
                **keywords,                       # preserve colors, materials, patterns, sizes
                "categories": final_categories,
                "occasions":  final_occasions,
            }

            db_payload = {}
            if keywords_updated:
                db_payload["keywords"] = updated_keywords
            if description_updated:
                db_payload["description"] = final_description

            save_optimized_to_db(p["id"], db_payload)
            print("✓")
        except Exception as e:
            print(f"✗ {e}")
            return {
                "keywords_updated": False, "description_updated": False,
                "skipped_categories": skip_categories, "error": f"DB save failed: {e}"
            }

    return {
        "keywords_updated":    keywords_updated,
        "description_updated": description_updated,
        "skipped_categories":  skip_categories,
        "error":               None,
    }


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════╗")
    print("║   RP Apparels — Keywords & Description       ║")
    print("║              Optimizer                       ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Category optimization skipped if tags >= {CATEGORY_MAX}")

    print("\nFetching products...", end=" ", flush=True)
    products = fetch_all_products()
    print(f"{len(products)} found")

    # Filter to products that have at least some keywords (need colors/materials to enrich description)
    # and have media
    with_media    = [p for p in products if p.get("image_url") or p.get("video_url")]
    without_media = [p for p in products if not p.get("image_url") and not p.get("video_url")]

    if without_media:
        print(f"\n  ⚠ {len(without_media)} products have no image or video — will be skipped:")
        for p in without_media:
            print(f"    - {p['name']}")

    total = len(with_media)
    est   = round(total * AI_DELAY_S / 60, 1)
    print(f"\n  Processing {total} products (~{est} minutes at {AI_DELAY_S}s delay)\n")

    stats = {
        "keywords_updated":    0,
        "description_updated": 0,
        "skipped_categories":  0,
        "errors":              0,
    }

    for i, p in enumerate(with_media, start=1):
        result = process_product(p, i, total)

        if result["keywords_updated"]:    stats["keywords_updated"]    += 1
        if result["description_updated"]: stats["description_updated"] += 1
        if result["skipped_categories"]:  stats["skipped_categories"]  += 1
        if result["error"]:               stats["errors"]              += 1

        if i < total:
            print(f"    ⏸  {AI_DELAY_S}s...")
            time.sleep(AI_DELAY_S)

    secs = 0  # timing handled by delay above
    print("\n╔══════════════════════════════════════════════╗")
    print("║                   Summary                    ║")
    print("╠══════════════════════════════════════════════╣")
    print(f"║  Keywords optimized  : {str(stats['keywords_updated']).ljust(22)}║")
    print(f"║  Descriptions updated: {str(stats['description_updated']).ljust(22)}║")
    print(f"║  Categories skipped  : {str(stats['skipped_categories']).ljust(22)}║")
    print(f"║  Errors              : {str(stats['errors']).ljust(22)}║")
    print("╚══════════════════════════════════════════════╝")


if __name__ == "__main__":
    main()
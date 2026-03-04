import os
import json
import time
import requests
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path)

SUPABASE_URL      = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SITE_URL          = os.getenv("BACKFILL_SITE_URL", "http://localhost:3000")

# ── Config ────────────────────────────────────────────────────────────────────
AI_DELAY_S  = 6    # seconds between AI calls — stays under Groq free tier 30 RPM
MAX_RETRIES = 2

# ── Validate ──────────────────────────────────────────────────────────────────
missing = [k for k, v in {
    "NEXT_PUBLIC_SUPABASE_URL":  SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_KEY,
}.items() if not v]

if missing:
    print(f"✗ Missing env vars: {', '.join(missing)}")
    print("  Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role)")
    exit(1)

# ── Supabase REST headers (service role bypasses RLS) ─────────────────────────
DB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}


# ── Cloudinary video → thumbnail (mirrors lib/cloudinary-helpers.ts) ──────────
def get_video_thumbnail_url(video_url):
    if not video_url:
        return None
    import re
    url = video_url.replace("/video/upload/", "/video/upload/so_2,w_400,h_400,c_fill/")
    return re.sub(r"\.\w+$", ".jpg", url)


def resolve_image_url(product):
    """Returns (url, label) — image first, video thumbnail as fallback."""
    if product.get("image_url"):
        return product["image_url"], "image"
    thumb = get_video_thumbnail_url(product.get("video_url"))
    if thumb:
        return thumb, "video thumbnail"
    return None, "none"


# ── Fetch all products ────────────────────────────────────────────────────────
def fetch_all_products():
    url    = f"{SUPABASE_URL}/rest/v1/products"
    params = {
        "select":  "id,name,image_url,video_url,keywords,keywords_embedding",
        "deleted": "eq.false",
        "limit":   1000,
    }
    resp = requests.get(url, headers=DB_HEADERS, params=params)
    if resp.status_code != 200:
        raise RuntimeError(f"Supabase fetch failed {resp.status_code}: {resp.text[:300]}")
    return resp.json()


# ── Helpers ───────────────────────────────────────────────────────────────────
def is_keywords_empty(keywords):
    if not keywords:
        return True
    return all(not keywords.get(g) for g in ["colors", "materials", "patterns", "categories", "occasions"])

def has_embedding(product):
    return bool(product.get("keywords_embedding"))

def save_keywords_to_db(product_id, keywords):
    url  = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    resp = requests.patch(url, headers=DB_HEADERS, json={"keywords": keywords})
    if resp.status_code not in (200, 204):
        raise RuntimeError(f"Keywords save failed {resp.status_code}: {resp.text[:200]}")


# ── Call your existing /api/ai/generate-keywords route ────────────────────────
# This route already has Gemini Lite → Mistral → Gemini Primary → Groq fallback
def call_keywords_route(image_url):
    endpoint = f"{SITE_URL}/api/ai/generate-keywords"
    resp = requests.post(endpoint, json={"imageUrl": image_url}, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(f"Keywords route {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    if data.get("error"):
        raise RuntimeError(data["error"])
    # Route returns { keywords: {...}, suggestions: {...} }
    return data.get("keywords") or data


# ── Generate + save embedding via Groq (free, no new deps) ──────────────────
# Groq's nomic-embed-text is free and fast.
# We save the vector directly to Supabase as a postgres vector literal "[x,y,...]"
def generate_and_save_embedding(product_id, keywords):
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        raise RuntimeError("GROQ_API_KEY not set — add it to .env.local")

    # Build same text as updateProductEmbedding in embedding.ts
    parts = (
        keywords.get("colors",     []) +
        keywords.get("materials",  []) +
        keywords.get("patterns",   []) +
        keywords.get("categories", []) +
        keywords.get("occasions",  [])
    )
    text = " ".join(parts).strip()
    if not text:
        raise RuntimeError("All keyword fields are empty — nothing to embed")

    # Call Groq embeddings API
    resp = requests.post(
        "https://api.groq.com/openai/v1/embeddings",
        headers={
            "Authorization": f"Bearer {groq_key}",
            "Content-Type":  "application/json",
        },
        json={"model": "nomic-embed-text-v1_5", "input": text},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Groq embeddings error {resp.status_code}: {resp.text[:200]}")

    vector = resp.json()["data"][0]["embedding"]

    # Save as postgres vector literal directly to Supabase
    vector_str = "[" + ",".join(str(round(float(x), 8)) for x in vector) + "]"
    url  = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    patch = requests.patch(url, headers=DB_HEADERS, json={"keywords_embedding": vector_str})
    if patch.status_code not in (200, 204):
        raise RuntimeError(f"Embedding save failed {patch.status_code}: {patch.text[:200]}")


# ── PASS 1: embeddings for products that already have keywords ────────────────
def pass1(products):
    candidates = [p for p in products if not is_keywords_empty(p.get("keywords")) and not has_embedding(p)]
    print(f"\n━━━ PASS 1: Fill missing embeddings ({len(candidates)} products) ━━━")

    if not candidates:
        print("  Nothing to do ✓")
        return 0

    filled = 0
    for p in candidates:
        print(f"  \"{p['name']}\"...", end=" ", flush=True)
        try:
            generate_and_save_embedding(p["id"], p["keywords"])
            print("✓")
            filled += 1
        except Exception as e:
            print(f"✗ {e}")

    return filled


# ── PASS 2: keywords + embeddings for products missing keywords ───────────────
def pass2(products):
    candidates  = [p for p in products if is_keywords_empty(p.get("keywords"))]
    with_media  = [p for p in candidates if p.get("image_url") or p.get("video_url")]
    no_media    = [p for p in candidates if not p.get("image_url") and not p.get("video_url")]

    print(f"\n━━━ PASS 2: Fill missing keywords via AI ({len(with_media)} products) ━━━")

    if no_media:
        print(f"  ⚠ {len(no_media)} products have no image or video — skipping:")
        for p in no_media:
            print(f"    - {p['name']}")

    if not with_media:
        print("  Nothing to do ✓")
        return 0

    est = round(len(with_media) * AI_DELAY_S / 60, 1)
    print(f"  {AI_DELAY_S}s delay between calls → ~{est} minutes\n")

    filled = 0
    for i, p in enumerate(with_media):
        image_url, source = resolve_image_url(p)
        print(f"  [{i+1}/{len(with_media)}] \"{p['name']}\" ({source})")

        try:
            # Step 1: AI keywords via your existing route (Groq is last fallback)
            print(f"    → Keywords...", end=" ", flush=True)
            keywords = call_keywords_route(image_url)
            print(f"✓  colors={keywords.get('colors',[])} cats={keywords.get('categories',[])}")

            # Step 2: Save keywords to DB
            print(f"    → Saving keywords...", end=" ", flush=True)
            save_keywords_to_db(p["id"], keywords)
            print("✓")

            # Step 3: Generate + save embedding via Groq (free, no extra deps)
            print(f"    → Embedding...", end=" ", flush=True)
            generate_and_save_embedding(p["id"], keywords)
            print("✓")

            filled += 1

        except Exception as e:
            print(f"\n    ✗ {e}")

        if i < len(with_media) - 1:
            print(f"    ⏸  {AI_DELAY_S}s...")
            time.sleep(AI_DELAY_S)

    return filled


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("╔══════════════════════════════════════════╗")
    print("║     RP Apparels — Product Backfill       ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Supabase : {SUPABASE_URL}")
    print(f"  Dev server: {SITE_URL}")
    print(f"\n  ⚠  Pass 2 needs your dev server running: npm run dev\n")

    print("Fetching products...", end=" ", flush=True)
    products = fetch_all_products()
    print(f"{len(products)} found")

    already_done = sum(1 for p in products if not is_keywords_empty(p.get("keywords")) and has_embedding(p))
    print(f"Already complete: {already_done}/{len(products)}")

    start = time.time()
    p1    = pass1(products)
    p2    = pass2(products)
    secs  = round(time.time() - start)
    m, s  = divmod(secs, 60)

    print("\n╔══════════════════════════════════════════╗")
    print("║                Summary                   ║")
    print("╠══════════════════════════════════════════╣")
    print(f"║  Embeddings only  (Pass 1): {str(p1).ljust(14)}║")
    print(f"║  Keywords + embed (Pass 2): {str(p2).ljust(14)}║")
    print(f"║  Time: {f'{m}m {s}s'.ljust(34)}║")
    print("╚══════════════════════════════════════════╝")

if __name__ == "__main__":
    main()
import os
import json
import time
import requests
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env.local
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path)

# === CONFIGURATION ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# gemini-2.5-flash: 10 RPM, 500 RPD (free)
# gemini-2.5-flash-lite: 15 RPM, 1000 RPD (free, fallback)
PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-2.5-flash-lite"

# 6s between products keeps us safely under 10 RPM
INTER_PRODUCT_DELAY = 6
# ===

if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY. Get one free at aistudio.google.com")
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing Supabase credentials. Check .env.local")

client = genai.Client(api_key=GEMINI_API_KEY)

HEADERS_READ = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}


# ─── Fetch products ────────────────────────────────────────────────────────────

def fetch_products(limit=100, offset=0):
    url = f"{SUPABASE_URL}/rest/v1/products"
    params = {
        "select": "id,name,image_url",
        "image_url": "not.is.null",
        "limit": limit,
        "offset": offset
    }
    resp = requests.get(url, headers=HEADERS_READ, params=params)
    if resp.status_code != 200:
        print(f"❌ Failed to fetch products: {resp.status_code} - {resp.text[:200]}")
        return []
    return resp.json()


# ─── Prompt ────────────────────────────────────────────────────────────────────

def build_prompt(product_name):
    return f"""You are a clothing product cataloger. Your output will be used as search keywords on a fashion store.
Customers search for things like "red dress", "floral gown", "satin blouse" — so return every term a real customer might type to find this item.

Carefully look at the actual image. DO NOT guess from the product name "{product_name}".

Return ONLY a valid JSON object (no markdown, no extra text) with these exact fields:

- "colors": Array of all colors a customer might search to find this item.
  RULES:
  - Always include every visible color, even secondary ones. A black dress with a gold belt → ["black", "gold"].
  - For specific shades, ALWAYS include the basic color too:
      maroon/burgundy → also add "red"
      navy blue → also add "blue"
      cream/ivory → also add "white"
      olive/khaki → also add "green"
      coral → also add "pink" and "orange"
      turquoise/teal → also add "blue"
      charcoal → also add "grey"
  - If one color is clearly dominant (covers 70%+ of garment), list it first.
  - NEVER include "multicolor" — it is useless for search. List the actual colors instead.
  - Lowercase only.

- "materials": Array of fabric materials visible in the image.
  Examples: "satin", "denim", "lace", "leather", "velvet", "knit", "chiffon", "silk", "cotton", "wool", "sequin".
  Only include what you can confidently see from the texture. Empty array [] if unsure.

- "patterns": Array of visible patterns on the garment.
  Allowed values: "striped", "checkered", "floral", "polka dots", "geometric", "animal print", "abstract".
  Empty array [] if the garment is plain/solid.

- "categories": Array of what the item IS — the garment type.
  Examples: "dress", "gown", "shirt", "blouse", "tee", "t-shirt", "top", "skirt", "pants", "jacket", "coat", "suit", "jumpsuit", "shorts", "cardigan".
  Include all that apply.

- "occasions": Array of where/when this item would be worn. Pick all that apply from this list only:
  "formal", "corporate", "cocktail", "casual", "streetwear", "party", "resort", "athletic", "bridal"
  Be generous — a sequin gown → ["formal", "cocktail", "party"]. A plain tee → ["casual", "streetwear"].

- "sizes": Always return an empty array []. Sizes are set by the admin only.

Examples:
{{"colors": ["black"], "materials": ["satin"], "patterns": [], "categories": ["gown", "dress"], "occasions": ["formal", "cocktail", "party"], "sizes": []}}
{{"colors": ["maroon", "red"], "materials": ["velvet"], "patterns": [], "categories": ["dress"], "occasions": ["cocktail", "party", "formal"], "sizes": []}}
{{"colors": ["white", "black"], "materials": ["cotton"], "patterns": ["striped"], "categories": ["shirt", "top"], "occasions": ["casual", "streetwear"], "sizes": []}}
{{"colors": ["navy blue", "blue"], "materials": ["chiffon"], "patterns": ["floral"], "categories": ["dress"], "occasions": ["resort", "casual", "cocktail"], "sizes": []}}"""


# ─── Gemini call ───────────────────────────────────────────────────────────────

def fetch_image_as_bytes(image_url):
    try:
        resp = requests.get(image_url, timeout=15)
        resp.raise_for_status()
        mime_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0]
        return resp.content, mime_type
    except Exception as e:
        print(f"    ⚠️ Failed to fetch image: {e}")
        return None, None

def analyze_image(image_url, product_name, model=PRIMARY_MODEL, max_retries=3):
    prompt = build_prompt(product_name)
    image_bytes, mime_type = fetch_image_as_bytes(image_url)
    if not image_bytes:
        return None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )
            content = response.text.strip()
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            return json.loads(content)

        except json.JSONDecodeError as e:
            print(f"    ⚠️ JSON parse error (attempt {attempt+1}): {e} | Raw: {response.text[:150]}")
            if attempt == max_retries - 1:
                return None

        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = (2 ** attempt) * 5
                print(f"    ⏳ Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
            elif "404" in err_str or "not found" in err_str.lower():
                print(f"    ⚠️ Model {model} not found")
                return None
            else:
                print(f"    ❌ Gemini error (attempt {attempt+1}): {err_str[:200]}")
                if attempt == max_retries - 1:
                    return None
                time.sleep(3)

    return None

def analyze_with_fallback(image_url, product_name):
    print(f"    🤖 {PRIMARY_MODEL}")
    result = analyze_image(image_url, product_name, model=PRIMARY_MODEL)
    if result:
        return result
    print(f"    🔄 Falling back to {FALLBACK_MODEL}")
    return analyze_image(image_url, product_name, model=FALLBACK_MODEL)


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    offset = 0
    limit = 100
    all_results = []

    print("🚀 AI Keyword Generation — No DB writes, draft output only")
    print(f"   Model: {PRIMARY_MODEL} → {FALLBACK_MODEL}")
    print(f"   Delay: {INTER_PRODUCT_DELAY}s between products\n")

    while True:
        products = fetch_products(limit, offset)
        if not products:
            break

        print(f"📦 Fetched {len(products)} products (offset {offset})...")

        for prod in products:
            print(f"\n  🔍 {prod['name']}")
            keywords = analyze_with_fallback(prod['image_url'], prod['name'])

            if keywords:
                # Guarantee sizes is always [] regardless of what model returns
                keywords['sizes'] = []
                result = {
                    "id": prod['id'],
                    "name": prod['name'],
                    "keywords": keywords
                }
                all_results.append(result)
                print(f"    colors    : {keywords.get('colors', [])}")
                print(f"    materials : {keywords.get('materials', [])}")
                print(f"    patterns  : {keywords.get('patterns', [])}")
                print(f"    categories: {keywords.get('categories', [])}")
                print(f"    occasions : {keywords.get('occasions', [])}")
                print(f"    sizes     : []  (admin fills this)")
            else:
                all_results.append({
                    "id": prod['id'],
                    "name": prod['name'],
                    "keywords": None,
                    "error": "analysis failed"
                })
                print(f"    ❌ analysis failed")

            print(f"    ⏸️  Waiting {INTER_PRODUCT_DELAY}s...")
            time.sleep(INTER_PRODUCT_DELAY)

        offset += limit

    # Write results to a JSON file for admin review
    output_path = os.path.join(os.path.dirname(__file__), 'keywords_draft.json')
    with open(output_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    success = sum(1 for r in all_results if r.get('keywords'))
    total = len(all_results)
    print(f"\n✅ Done. {success}/{total} products analyzed.")
    print(f"📄 Draft saved to: {output_path}")
    print(f"   Hand this to your admin/frontend — nothing written to DB.")

if __name__ == "__main__":
    main()
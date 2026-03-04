import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// ── Clients ───────────────────────────────────────────────────────────────────
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ── Model config ──────────────────────────────────────────────────────────────
const MISTRAL_PIXTRAL = 'pixtral-12b-2409'
const GEMINI_LITE     = 'gemini-2.5-flash-lite'
const GEMINI_PRIMARY  = 'gemini-2.0-flash-lite'
const GROQ_MODEL      = 'openai/gpt-oss-120b' // meta-llama/llama-4-scout-17b-16e-instruct'
const NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct"

// ── Prompt (RESTORED FULL VERSION - ABSOLUTELY UNTOUCHED) ──────────────────────
function buildPrompt(): string {
  return `You are a clothing product cataloger for a fashion store. Your output becomes search keywords that real customers use to find items.

Carefully examine the actual image. DO NOT guess from any product name.
Return ONLY a valid JSON object — no markdown, no extra text.

━━━ COLORS ━━━
Use BASIC, GENERAL color names only. Customers search "red" not "maroon". "blue" not "navy blue".

ALWAYS convert specific shades to their basic color:
  maroon, burgundy, wine, claret → "red"
  navy, cobalt, royal blue, teal → "blue"
  cream, ivory, off-white, beige → "white"
  olive, khaki, lime → "green"
  coral, salmon → "pink"
  charcoal, slate → "grey"
  gold, mustard → "yellow"
  lavender, lilac, violet → "purple"

RULES:
  - Include every visible color, even secondary ones (belt, trim, lining)
  - List the most dominant color first
  - NEVER use "multicolor" — list actual colors instead
  - Lowercase only
  - Max 4 colors

━━━ MATERIALS ━━━
Only include fabrics you can confidently identify from texture in the image.
Examples: "satin", "denim", "lace", "leather", "velvet", "knit", "chiffon", "silk", "cotton", "wool", "sequin", "polyester", "organza".
Empty array [] if uncertain.

━━━ PATTERNS ━━━
Only these exact values allowed: "striped", "checkered", "floral", "polka dots", "geometric", "animal print", "abstract".
Empty array [] if plain/solid.

━━━ CATEGORIES ━━━
This is the most critical field. Cover every structural, stylistic, and aesthetic angle a real shopper might search.
NEVER include gender words (male, female, men, women, unisex) — those live elsewhere.
NEVER include occasion words (party, formal, corporate) — those belong in occasions only.

ORDERING RULE: Most specific term FIRST, broader terms after.

REQUIRED LAYERS — include ALL that apply for each product type:

── DRESSES & GOWNS ──
Layer 1 · Garment type (always include both specific and general):
  ["mini dress","dress"], ["midi dress","dress"], ["maxi dress","dress"],
  ["bodycon dress","dress"], ["wrap dress","dress"], ["shift dress","dress"],
  ["shirt dress","dress"], ["skater dress","dress"], ["gown","dress"],
  ["kaftan","dress"], ["two-piece dress","dress","two-piece set"]

Layer 2 · Neckline (always tag if identifiable):
  v-neck, deep v-neck, scoop neck, square neck, high neck, turtleneck neck,
  off shoulder, one shoulder, halter neck, sweetheart neckline, cowl neck,
  boat neck, plunge neckline, open back, backless, keyhole neckline,
  wide neck, spaghetti strap, strapless, boob tube

Layer 3 · Sleeves (always tag):
  sleeveless, short sleeve dress, long sleeve dress, 3/4 sleeve dress,
  balloon sleeves, puff sleeves, bubble sleeves

Layer 4 · Fit/silhouette (always tag):
  bodycon, fitted, flowy, loose, a-line, ruched, draped, pleated, corset

Layer 5 · Length (always tag):
  mini, midi, maxi, short, long, knee length, floor length, thigh length

Layer 6 · Aesthetic/vibe tags — MANDATORY, high-converting search terms:
  elegant dress, classy dress, sexy dress, cute dress, flowy dress,
  date night dress, dinner dress, going out dress, night out dress,
  wedding guest dress, church dress, owambe dress, asoebi dress,
  red carpet dress, glam dress, rich aunty dress, instagram dress,
  vacation dress, brunch dress

  Include 4–8 vibe tags per dress. Pick only those that genuinely match the product's look.

── JEANS & TROUSERS ──
Layer 1 · Garment type: jeans, jean, pants, trousers, denim
Layer 2 · Fit: skinny jeans, slim fit jeans, straight leg jeans, wide leg jeans,
  baggy jeans, flare jeans, flared jeans, bootcut jeans, mom jeans,
  boyfriend jeans, cargo jeans, wide leg pants, flare pants, flared pants
Layer 3 · Condition/wash: ripped jeans, ripped, torn jeans, torn, distressed jeans,
  distressed, clean jeans, plain jeans, acid washed, sandwashed, stone washed,
  patched jeans, embroidered jeans
Layer 4 · Rise: high waist jeans, high rise jeans, low rise jeans, mid rise jeans
Layer 5 · Standalone qualifiers (always add alongside compound): baggy, skinny,
  flare, ripped, torn, wide leg, straight, slim, stacked

── SHIRTS ──
Layer 1 · Garment type: shirt, top, button-down shirt, casual shirt, dress shirt
Layer 2 · Style: long sleeve shirt, short sleeve shirt, checkered shirt,
  plaid shirt, flannel shirt, Oxford shirt, linen shirt, oversized shirt
Layer 3 · Fit: fitted shirt, slim fit shirt, regular fit, oversized
Layer 4 · Vibe: office shirt, corporate shirt, smart casual shirt, going out shirt

── TOPS & TEES ──
Layer 1 · Garment type: top, t-shirt, tee, crop top, tank top, polo, polo shirt,
  camisole, vest top, knit top, ribbed top
Layer 2 · Style: graphic tee, plain tee, oversized tee, fitted top, half zip,
  bubble knit, textured top, stretchy top
Layer 3 · Vibe: casual top, everyday top, going out top, night out top

── JUMPSUITS ──
jumpsuit, playsuit, romper, one piece, catsuit
Add fit: fitted jumpsuit, wide leg jumpsuit, baggy jumpsuit
Add neckline as above

MINIMUM TAG COUNT:
  Dresses/gowns: 18–30 tags
  Jeans/trousers: 12–20 tags
  Shirts: 8–15 tags
  Tops/tees: 8–14 tags
  Jumpsuits: 10–16 tags

━━━ OCCASIONS ━━━
Pick all that genuinely apply from ONLY this exact list.
Be generous — a sequin gown earns 5+ occasions. A plain tee earns 2–3.
NEVER put garment descriptors (bodycon, long sleeve) here.

Allowed values:
  "casual"          – everyday relaxed wear
  "streetwear"      – urban, trend-forward, hype
  "corporate"       – office, 9-5, business formal/casual
  "smart casual"    – between corporate and casual; meetings, brunches
  "cocktail"        – semi-formal evening events
  "formal"          – black tie, red carpet, galas, award nights
  "party"           – birthdays, club, turn up
  "date night"      – dinner dates, intimate evenings out
  "night out"       – going out, clubs, bars
  "brunch"          – daytime social, girls brunch
  "owambe"          – Nigerian parties, owambe, aso-ebi events
  "wedding guest"   – attending weddings as a guest
  "church"          – Sunday service, faith gatherings
  "burial"          – Nigerian burial ceremonies, remembrance events
  "vacation"        – travel, holiday, resort, beach
  "resort"          – poolside, beach resort, tropical
  "athletic"        – gym, sport, active
  "bridal"          – bride, bridal shower, engagement

SELECTION GUIDE:
  Bodycon party dress    → ["party","date night","night out","cocktail","owambe"]
  Sequin gown            → ["formal","cocktail","party","owambe","wedding guest","date night"]
  Smart checkered shirt  → ["corporate","smart casual","casual"]
  Baggy ripped jeans     → ["casual","streetwear","night out"]
  Kaftan dress           → ["casual","owambe","church","vacation","resort"]
  Lace two-piece         → ["owambe","wedding guest","cocktail","formal","church"]
  Plain tee              → ["casual","streetwear"]
  Wide leg trousers      → ["casual","smart casual","corporate","streetwear"]

━━━ SIZES ━━━
Always return [].

━━━ EXAMPLES ━━━
{"colors":["black"],"materials":["satin"],"patterns":[],"categories":["bodycon dress","dress","sleeveless","strapless","midi","fitted","sexy dress","date night dress","night out dress","going out dress","elegant dress"],"occasions":["cocktail","party","date night","night out","formal"],"sizes":[]}

{"colors":["red"],"materials":["velvet"],"patterns":[],"categories":["midi dress","dress","long sleeve dress","bodycon","fitted","elegant dress","date night dress","dinner dress","classy dress","rich aunty dress"],"occasions":["cocktail","party","formal","date night","owambe","wedding guest"],"sizes":[]}

{"colors":["white","black"],"materials":["cotton"],"patterns":["striped"],"categories":["t-shirt","top","casual top","everyday top"],"occasions":["casual","streetwear"],"sizes":[]}

{"colors":["blue"],"materials":["denim"],"patterns":[],"categories":["wide leg jeans","baggy jeans","jeans","pants","denim","baggy","wide leg","high waist jeans","clean jeans"],"occasions":["casual","streetwear","smart casual"],"sizes":[]}

{"colors":["black","gold"],"materials":["sequin"],"patterns":[],"categories":["gown","dress","maxi dress","sleeveless","spaghetti strap","fitted","glam dress","red carpet dress","elegant dress","owambe dress","date night dress"],"occasions":["formal","party","cocktail","owambe","wedding guest","date night"],"sizes":[]}

{"colors":["white"],"materials":["cotton"],"patterns":[],"categories":["turtleneck","top","fitted top","long sleeve","casual top"],"occasions":["casual","corporate","smart casual"],"sizes":[]}}
`
}
// ── Types ─────────────────────────────────────────────────────────────────────
interface KeywordsResult {
  colors:     string[]
  materials:  string[]
  patterns:   string[]
  categories: string[]
  occasions:  string[]
  sizes:      string[]
}

// ── JSON extractor ────────────────────────────────────────────────────────────
function extractJson(text: string): KeywordsResult {
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  const jsonStr    = fenceMatch ? fenceMatch[1] : text
  const parsed     = JSON.parse(jsonStr.trim()) as KeywordsResult
  parsed.sizes     = [] 
  return parsed
}

// ── Image resolver ────────────────────────────────────────────────────────────
async function resolveImage(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  if (imageUrl.startsWith('data:')) {
    const [meta, base64] = imageUrl.split(',')
    const mimeType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
    return { base64, mimeType }
  }
  const resp = await fetch(imageUrl)
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.statusText}`)
  const buffer   = await resp.arrayBuffer()
  const base64   = Buffer.from(buffer).toString('base64')
  const mimeType = resp.headers.get('content-type') ?? 'image/jpeg'
  return { base64, mimeType }
}

// ── Callers ───────────────────────────────────────────────────────────────────
async function callNvidia(base64: string, mimeType: string): Promise<KeywordsResult> {
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt() },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.2,
      top_p: 1,
      response_format: { type: "json_object" }
    })
  })

  if (!response.ok) {
    throw new Error(`NVIDIA error: ${await response.text()}`)
  }

  const data = await response.json()
  return extractJson(data.choices[0].message.content)
}
async function callGemini(modelId: string, base64: string, mimeType: string): Promise<KeywordsResult> {
  const response = await genAI.models.generateContent({
    model: modelId,
    contents: [{
      role: 'user',
      parts: [
        { text: buildPrompt() },
        { inlineData: { data: base64, mimeType } }
      ]
    }],
    config: { responseMimeType: "application/json" }
  })

  // Safe accessor for the @google/genai Unified SDK structure
  const text = (response as any).text || response.candidates?.[0]?.content?.parts?.[0]?.text
  console.log(text)
  if (!text) throw new Error(`Model ${modelId} returned empty response`)
  return extractJson(text)
}

async function callMistral(base64: string, mimeType: string): Promise<KeywordsResult> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_PIXTRAL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt() },
          { type: "image_url", image_url: `data:${mimeType};base64,${base64}` }
        ]
      }],
      response_format: { type: "json_object" }
    })
  })
  if (!response.ok) throw new Error(`Mistral error: ${await response.text()}`)
  const data = await response.json()
  return extractJson(data.choices[0].message.content)
}

async function callGroq(base64: string, mimeType: string): Promise<KeywordsResult> {
  const apiKey = (process.env.GROQ_API_KEY || '').trim()
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Groq-Organization': (process.env.GROQ_ORG_ID || '').trim(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt() },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      response_format: { type: "json_object" }
    })
  })

  if (!response.ok) throw new Error(`Groq error: ${await response.text()}`)
  const data = await response.json()
  return extractJson(data.choices[0].message.content)
}

// ── Main Route ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json() as { imageUrl?: string }
    if (!imageUrl) return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })

    const { base64, mimeType } = await resolveImage(imageUrl)

    const attempts = [
       { label: `NVIDIA Llama Vision`, fn: () => callNvidia(base64, mimeType) },
      { label: `Gemini Lite`, fn: () => callGemini(GEMINI_LITE, base64, mimeType) },
      { label: `Mistral`, fn: () => callMistral(base64, mimeType) },
      { label: `Gemini Primary`, fn: () => callGemini(GEMINI_PRIMARY, base64, mimeType) },
      { label: `Groq`, fn: () => callGroq(base64, mimeType) }
    ]

    const errors: string[] = []

    for (const attempt of attempts) {
      try {
        const result = await attempt.fn()
        console.log(`✓ AI keywords generated via ${attempt.label}`)
        return NextResponse.json({
  keywords: result,
  suggestions: {
    name: "",
    description: ""
  }
})
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ ${attempt.label} failed:`, msg)
        errors.push(`${attempt.label}: ${msg}`)
      }
    }

    return NextResponse.json({ error: 'All models failed', details: errors }, { status: 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
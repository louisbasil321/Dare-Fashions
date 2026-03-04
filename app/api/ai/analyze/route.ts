import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemma-3-12b-it:free";

export async function POST(req: NextRequest) {
  try {
    const { productId, prompt: customPrompt } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

    const supabase = createAdminClient();
    // Fetch product image
    const { data: product, error } = await supabase
      .from('products')
      .select('name, image_url')
      .eq('id', productId)
      .single();

    if (error || !product) throw error || new Error('Product not found');
    if (!product.image_url) return NextResponse.json({ error: 'Product has no image' }, { status: 400 });

    const prompt = customPrompt || "Analyze this clothing item. What is the primary color and material? Return JSON with 'color' and 'material'.";

    const payload = {
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: product.image_url } }
          ]
        }
      ]
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    // Try to parse JSON from response
    let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || [null, content];
    const jsonStr = jsonMatch[1] || content;
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
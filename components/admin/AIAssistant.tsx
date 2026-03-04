'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function AIAssistant({ productId, onAttributeUpdate }: { productId: string; onAttributeUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [prompt, setPrompt] = useState('');

  const analyze = async (customPrompt?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, prompt: customPrompt })
      });
      const data = await res.json();
      setResult(data);
      if (data.color || data.material) {
        // Optionally call a server action to save these attributes automatically
        // You can implement that separately
      }
    } catch (err) {
      setResult({ error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 mt-6">
      <h3 className="text-lg font-semibold mb-2">🤖 AI Assistant</h3>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => analyze()}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Extract Color & Material'}
        </button>
        <button
          onClick={() => analyze("What material is this clothing item made of? Be specific.")}
          disabled={loading}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Ask Material
        </button>
        <button
          onClick={() => analyze("What styling tips do you have for this piece?")}
          disabled={loading}
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Styling Advice
        </button>
      </div>
      <textarea
        placeholder="Custom question..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-3 py-2 mb-2"
        rows={2}
      />
      <button
        onClick={() => analyze(prompt)}
        disabled={loading || !prompt}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        Ask Custom
      </button>
      {result && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
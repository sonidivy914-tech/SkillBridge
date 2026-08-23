// Vercel Serverless Function (CommonJS format for Vercel Node runtime)
module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const prompt = body?.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables.' });
    }

    const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

        lastError = data.error?.message || `HTTP ${response.status} from ${modelName}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({ error: lastError || 'All Gemini model fallbacks failed.' });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

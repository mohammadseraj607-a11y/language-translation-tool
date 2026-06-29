const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// NOTE:
// - This backend is intentionally minimal.
// - You MUST set provider API keys via environment variables.
// - Frontend will call this server at: http://localhost:3000/...

function getEnv(name) {
  const v = process.env[name];
  if (!v) return '';
  return v;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Universal translate endpoint (premium engines)
// body: { engine, text, sourceLang, targetLang, glossaryTerms }
app.post('/translate', async (req, res) => {
  try {
    const { engine, text, sourceLang, targetLang, glossaryTerms } = req.body || {};

    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields: text, targetLang' });
    }

    // Placeholder implementations.
    // Implementations should call DeepL/OpenAI/Gemini.
    // To keep this repo runnable without keys, we only support MyMemory-style fallback here.

    if (engine === 'mymemory') {
      // Let frontend continue to use MyMemory directly if desired.
      return res.status(400).json({ error: 'Use frontend MyMemory (not wired to backend in this minimal scaffold).' });
    }

    return res.status(501).json({
      error: 'Premium engine translation not implemented yet in scaffold. Set up provider integrations first.'
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Back-translation endpoint
// body: { engine, text, sourceLang, targetLang }
app.post('/backtranslate', async (req, res) => {
  try {
    const { engine, text, sourceLang, targetLang } = req.body || {};
    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields: text, sourceLang, targetLang' });
    }

    // In this scaffold, not implemented.
    return res.status(501).json({
      error: 'Premium engine back-translation not implemented yet in scaffold.'
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LingoPulse backend listening on http://localhost:${PORT}`);
});


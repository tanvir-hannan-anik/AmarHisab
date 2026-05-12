// ─────────────────────────────────────────────────────────────────────────────
// Routes / AI advice
//
// POST /api/ai/advice — takes a small summary of the user's recent financial
// activity and returns Bengali-language insights + recommendations produced
// by the Groq chat-completions API. No auth required (matches the rest of the
// "best-effort" sync layer — the dashboard works without login).
//
// Response shape: { summary, highlights: string[], recommendations: string[] }
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const env = require('../config/env');

const router = express.Router();

const SYSTEM_PROMPT = `আপনি "আমার হিসাব" অ্যাপের একজন ব্যক্তিগত আর্থিক পরামর্শদাতা।
ব্যবহারকারীর সাম্প্রতিক হিসাব বিশ্লেষণ করে শুধু একটি বৈধ JSON অবজেক্ট ফেরত দিন।

কাঠামো:
{
  "summary": "১-২ বাক্যে সামগ্রিক চিত্র (বাংলা)",
  "highlights": ["সংক্ষিপ্ত পর্যবেক্ষণ ১", "পর্যবেক্ষণ ২", "পর্যবেক্ষণ ৩", "পর্যবেক্ষণ ৪"],
  "recommendations": ["ব্যবহারিক পরামর্শ ১", "পরামর্শ ২", "পরামর্শ ৩", "পরামর্শ ৪"]
}

নির্দেশনা:
- সব টেক্সট অবশ্যই বাংলা ভাষায়, সাবলীল ও সহজ।
- পর্যবেক্ষণে অন্তর্ভুক্ত করুন: কোন শ্রেণীতে বেশি খরচ, কার থেকে ধার নেওয়া/দেওয়া, ব্যয়ের প্যাটার্ন।
- পরামর্শ হোক বাস্তবসম্মত ও সংক্ষিপ্ত (১ বাক্য করে), অপ্রয়োজনীয় খরচ কমানো ও সঞ্চয় বাড়ানোর দিকে।
- প্রতিটি বুলেট ৮০ অক্ষরের মধ্যে রাখুন।
- highlights এবং recommendations প্রতিটিতে ৩-৫টি আইটেম দিন।
- JSON ছাড়া অন্য কোনো লেখা দেবেন না।`;

function safeJson(text) {
  try { return JSON.parse(text); } catch (e) { /* fall through */ }
  const m = text && text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) { /* fall through */ } }
  return null;
}

function normalise(parsed) {
  const arr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).slice(0, 6) : [];
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    highlights: arr(parsed.highlights),
    recommendations: arr(parsed.recommendations),
  };
}

router.post('/advice', async (req, res) => {
  if (!env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'AI পরামর্শ সেবা কনফিগার করা নেই (GROQ_API_KEY অনুপস্থিত)' });
  }
  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.GROQ_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: 'আমার সাম্প্রতিক আর্থিক তথ্য:\n' + JSON.stringify(payload) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!groqRes.ok) {
      const t = await groqRes.text().catch(() => '');
      console.error('Groq error', groqRes.status, t.slice(0, 500));
      return res.status(502).json({ error: 'AI সার্ভিস সাড়া দিচ্ছে না' });
    }

    const data = await groqRes.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = content && safeJson(content);
    if (!parsed) return res.status(502).json({ error: 'AI প্রতিক্রিয়া পড়া যায়নি' });

    res.json(normalise(parsed));
  } catch (e) {
    console.error('AI advice failed', e);
    res.status(500).json({ error: 'AI পরামর্শ তৈরিতে সমস্যা হয়েছে' });
  }
});

module.exports = router;

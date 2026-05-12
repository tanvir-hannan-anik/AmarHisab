// Vercel Serverless Function — GET /api/health
// Tiny "is anything alive?" probe. Use this after deploy to confirm the
// serverless layer is wired up before debugging the AI route.
module.exports = function handler(req, res) {
  res.status(200).json({ ok: true, ts: Date.now() });
};

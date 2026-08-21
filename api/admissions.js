const { kv } = require('@vercel/kv');
const { validateSubmission } = require('../lib/admissions');

const LIST_KEY = 'admissions:list';

// NOTE: prototype-only auth. A plaintext passcode compared on the server is
// still not real authentication (no hashing, no sessions, no rate limiting).
// Production deployments handling admissions data should use proper
// server-side auth (hashed credentials, session/JWT) and a real database.
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { error, record } = validateSubmission(req.body || {});
    if (error) return res.status(400).json({ error });

    await kv.rpush(LIST_KEY, record);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const passcode = req.headers['x-admin-passcode'];
    if (passcode !== ADMIN_PASSCODE) {
      return res.status(401).json({ error: 'Invalid passcode.' });
    }
    const records = await kv.lrange(LIST_KEY, 0, -1);
    return res.status(200).json(records);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};

const { kv } = require('@vercel/kv');

const LIST_KEY = 'admissions:list';
const REQUIRED_FIELDS = ['name', 'registerNumber', 'department', 'year', 'programTrack'];
const YEAR_OPTIONS = ['II Year', 'III Year', 'Other'];
const TRACK_OPTIONS = ['Only GRE', 'Only IELTS', 'GRE+IELTS'];

// NOTE: prototype-only auth. A plaintext passcode compared on the server is
// still not real authentication (no hashing, no sessions, no rate limiting).
// Production deployments handling admissions data should use proper
// server-side auth (hashed credentials, session/JWT) and a real database.
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body || {};
    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || !String(body[field]).trim()) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    if (!YEAR_OPTIONS.includes(body.year)) {
      return res.status(400).json({ error: 'Invalid year of study.' });
    }
    if (!TRACK_OPTIONS.includes(body.programTrack)) {
      return res.status(400).json({ error: 'Invalid program track.' });
    }

    const record = {
      name: String(body.name).trim(),
      registerNumber: String(body.registerNumber).trim(),
      department: String(body.department).trim(),
      year: body.year,
      programTrack: body.programTrack,
      consent: !!body.consent,
      submittedAt: new Date().toISOString(),
    };
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

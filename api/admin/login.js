// NOTE: prototype-only auth. A plaintext passcode compared on the server is
// still not real authentication (no hashing, no sessions, no rate limiting).
// Production deployments handling admissions data should use proper
// server-side auth (hashed credentials, session/JWT) and a real database.
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { passcode } = req.body || {};
  if (passcode === ADMIN_PASSCODE) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Incorrect passcode.' });
};

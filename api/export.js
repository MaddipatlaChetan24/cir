const { kv } = require('@vercel/kv');
const { buildWorkbookBuffer } = require('../lib/admissions');

const LIST_KEY = 'admissions:list';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const passcode = req.headers['x-admin-passcode'];
  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Invalid passcode.' });
  }

  const records = await kv.lrange(LIST_KEY, 0, -1);
  const buf = await buildWorkbookBuffer(records);

  res.setHeader('Content-Disposition', 'attachment; filename="admissions.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.status(200).send(buf);
};

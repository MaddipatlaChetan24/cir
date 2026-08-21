// Plain local dev server for testing without any Vercel/Upstash setup.
// Storage here is a local JSON file — fine for a one-off local test, but
// NOT what gets deployed. The real deployment (api/*.js) uses Vercel KV
// so every visitor's submission lands in one shared, central store.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { validateSubmission, buildWorkbookBuffer } = require('./lib/admissions');

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';
const DATA_FILE = path.join(__dirname, 'data', 'admissions.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeData(records) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

function checkPasscode(req, res, next) {
  if (req.headers['x-admin-passcode'] !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Invalid passcode.' });
  }
  next();
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/admissions', (req, res) => {
  const { error, record } = validateSubmission(req.body || {});
  if (error) return res.status(400).json({ error });

  const records = readData();
  records.push(record);
  writeData(records);
  res.status(200).json({ ok: true });
});

app.get('/api/admissions', checkPasscode, (req, res) => {
  res.status(200).json(readData());
});

app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body || {};
  if (passcode === ADMIN_PASSCODE) return res.status(200).json({ ok: true });
  res.status(401).json({ ok: false, error: 'Incorrect passcode.' });
});

app.get('/api/export', checkPasscode, async (req, res) => {
  const buf = await buildWorkbookBuffer(readData());
  res.setHeader('Content-Disposition', 'attachment; filename="admissions.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.status(200).send(buf);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local dev server (local JSON storage) running at http://localhost:${PORT}`);
  console.log(`Admin passcode: ${ADMIN_PASSCODE}`);
});

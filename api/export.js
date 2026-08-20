const { kv } = require('@vercel/kv');
const ExcelJS = require('exceljs');

const LIST_KEY = 'admissions:list';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'DYcfNEFRY7drmL7i';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function formatSubmittedAt(isoString) {
  const parts = DATE_FORMATTER.formatToParts(new Date(isoString));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`;
}

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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Admissions');

  sheet.columns = [
    { header: 'S.No', key: 'sNo', width: 8 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Register Number', key: 'registerNumber', width: 24 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Year', key: 'year', width: 14 },
    { header: 'Program Track', key: 'programTrack', width: 20 },
    { header: 'Consent', key: 'consent', width: 12 },
    { header: 'Submitted At', key: 'submittedAt', width: 26 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });

  records.forEach((r, i) => {
    sheet.addRow({
      sNo: i + 1,
      name: r.name,
      registerNumber: r.registerNumber,
      department: r.department,
      year: r.year,
      programTrack: r.programTrack,
      consent: r.consent ? 'Yes' : 'No',
      submittedAt: formatSubmittedAt(r.submittedAt),
    });
  });

  const buf = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename="admissions.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.status(200).send(Buffer.from(buf));
};

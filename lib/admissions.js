const ExcelJS = require('exceljs');

const REQUIRED_FIELDS = ['name', 'registerNumber', 'department', 'year', 'programTrack'];
const YEAR_OPTIONS = ['II Year', 'III Year', 'Other'];
const TRACK_OPTIONS = ['Only GRE', 'Only IELTS', 'GRE+IELTS'];

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

function validateSubmission(body) {
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || !String(body[field]).trim()) {
      return { error: `Missing required field: ${field}` };
    }
  }
  if (!YEAR_OPTIONS.includes(body.year)) {
    return { error: 'Invalid year of study.' };
  }
  if (!TRACK_OPTIONS.includes(body.programTrack)) {
    return { error: 'Invalid program track.' };
  }
  return {
    record: {
      name: String(body.name).trim(),
      registerNumber: String(body.registerNumber).trim(),
      department: String(body.department).trim(),
      year: body.year,
      programTrack: body.programTrack,
      consent: !!body.consent,
      submittedAt: new Date().toISOString(),
    },
  };
}

async function buildWorkbookBuffer(records) {
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

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

module.exports = { validateSubmission, buildWorkbookBuffer };

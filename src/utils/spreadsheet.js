import * as XLSX from 'xlsx';

export async function parseSpreadsheetFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

    const columns = Array.from({ length: maxCols }, (_, colIndex) => {
      const values = rows
        .map((row) => String(row[colIndex] ?? '').trim())
        .filter((cell) => cell.length > 0);
      const header = String(rows[0]?.[colIndex] ?? '').trim() || `Col ${colIndex + 1}`;
      return { header, values, totalLength: values.join('').length };
    });

    return { name, columns };
  });
}

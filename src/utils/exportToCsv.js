/**
 * Helper utility to export tabular data to Excel-compatible CSV files.
 * Uses UTF-8 BOM (\uFEFF) to ensure Microsoft Excel and Google Sheets
 * properly render all characters and symbols without encoding glitches.
 *
 * @param {string} filenamePrefix - Base name for the exported file (e.g. 'ComiVerse_Revenue_Report')
 * @param {Array<string>} headers - Header column titles (e.g. ['User ID', 'Name', 'Email', 'Role', 'Status'])
 * @param {Array<Array<any>>} rows - 2D matrix of row items corresponding to headers
 */
export function exportToCsv(filenamePrefix, headers, rows) {
  if (!headers || !rows) return;

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const fullFilename = `${filenamePrefix}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fullFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

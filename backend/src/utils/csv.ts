import fs from 'fs';

/**
 * Parses a CSV or TSV string/file into an array of key-value objects.
 * Automatically detects tab vs. comma delimiters.
 */
export function parseCsvOrTsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Auto-detect delimiter from first line
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = parseCsvLine(firstLine, delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawFields = parseCsvLine(lines[i], delimiter);
    if (rawFields.length === 0 || (rawFields.length === 1 && rawFields[0] === '')) {
      continue;
    }
    
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = j < rawFields.length ? rawFields[j].trim().replace(/^"|"$/g, '') : '';
      if (header) {
        record[header] = val;
      }
    }
    records.push(record);
  }

  return records;
}

/**
 * Splits a single CSV/TSV line respecting quotes.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentField += char; // Keep quotes, we strip them later
    } else if (char === delimiter && !inQuotes) {
      result.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  result.push(currentField);
  return result;
}

// CSV import for EM results.
//
// Expected schema (header required):
//   date,room,grade,sample_type,value,unit
//
// - date: ISO date or datetime (e.g. 2025-01-15 or 2025-01-15T08:00:00Z)
// - room: non-empty string
// - grade: A | B | C | D
// - sample_type: settle_plate | contact_plate | active_air | nonviable_05um | nonviable_5um
// - value: non-negative number
// - unit: string (validated for consistency but not required to match exactly)
//
// Malformed rows are rejected with a clear, row-numbered message; valid rows are
// normalised into Reading objects.

import type { Grade, Reading, SampleType } from "./types";
import { GRADES } from "./types";

const VALID_SAMPLE_TYPES: SampleType[] = [
  "settle_plate",
  "contact_plate",
  "active_air",
  "nonviable_05um",
  "nonviable_5um",
];

export interface CsvParseResult {
  readings: Reading[];
  errors: string[];
  totalRows: number;
  acceptedRows: number;
}

const EXPECTED_HEADER = ["date", "room", "grade", "sample_type", "value", "unit"];

/** Splits a single CSV line, honouring simple double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const readings: Reading[] = [];

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { readings, errors: ["File is empty."], totalRows: 0, acceptedRows: 0 };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const headerOk =
    header.length === EXPECTED_HEADER.length &&
    EXPECTED_HEADER.every((h, i) => header[i] === h);
  if (!headerOk) {
    errors.push(
      `Invalid header. Expected "${EXPECTED_HEADER.join(",")}" but got "${header.join(",")}".`,
    );
    return { readings, errors, totalRows: 0, acceptedRows: 0 };
  }

  const dataLines = lines.slice(1);
  dataLines.forEach((line, idx) => {
    const rowNum = idx + 2; // account for header + 1-based
    const cols = splitCsvLine(line);
    if (cols.length !== EXPECTED_HEADER.length) {
      errors.push(
        `Row ${rowNum}: expected ${EXPECTED_HEADER.length} columns, found ${cols.length}.`,
      );
      return;
    }
    const [dateRaw, room, gradeRaw, sampleRaw, valueRaw, unit] = cols;

    // date
    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) {
      errors.push(`Row ${rowNum}: invalid date "${dateRaw}".`);
      return;
    }

    // room
    if (!room) {
      errors.push(`Row ${rowNum}: room is required.`);
      return;
    }

    // grade
    const grade = gradeRaw.toUpperCase() as Grade;
    if (!GRADES.includes(grade)) {
      errors.push(`Row ${rowNum}: invalid grade "${gradeRaw}" (expected A, B, C or D).`);
      return;
    }

    // sample_type
    const sampleType = sampleRaw as SampleType;
    if (!VALID_SAMPLE_TYPES.includes(sampleType)) {
      errors.push(
        `Row ${rowNum}: invalid sample_type "${sampleRaw}" (expected one of ${VALID_SAMPLE_TYPES.join(", ")}).`,
      );
      return;
    }

    // value
    const value = Number(valueRaw);
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`Row ${rowNum}: invalid value "${valueRaw}" (expected a non-negative number).`);
      return;
    }

    // unit
    if (!unit) {
      errors.push(`Row ${rowNum}: unit is required.`);
      return;
    }

    readings.push({
      id: `csv-${rowNum}-${date.getTime()}-${room}-${sampleType}`,
      date: date.toISOString(),
      room,
      grade,
      sampleType,
      value,
      unit,
    });
  });

  return {
    readings,
    errors,
    totalRows: dataLines.length,
    acceptedRows: readings.length,
  };
}

/**
 * CSV Parser for auction items
 * Parses CSV content into item objects ready for import
 */

export interface CSVParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedCSVItem {
  tempId: string; // Temporary ID for tracking in UI
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  minBidIncrement: number;
  isPublished: boolean;
  errors: CSVParseError[];
}

export interface CSVParseResult {
  items: ParsedCSVItem[];
  errors: CSVParseError[];
  headers: string[];
}

// Expected CSV headers (case-insensitive)
const HEADER_MAPPINGS: Record<string, string> = {
  name: "name",
  title: "name",
  item: "name",
  description: "description",
  desc: "description",
  currency: "currencyCode",
  currencycode: "currencyCode",
  currency_code: "currencyCode",
  startingbid: "startingBid",
  starting_bid: "startingBid",
  startbid: "startingBid",
  price: "startingBid",
  startingprice: "startingBid",
  starting_price: "startingBid",
  minincrement: "minBidIncrement",
  min_increment: "minBidIncrement",
  minbidincrement: "minBidIncrement",
  min_bid_increment: "minBidIncrement",
  increment: "minBidIncrement",
  published: "isPublished",
  ispublished: "isPublished",
  is_published: "isPublished",
  status: "isPublished",
};

function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[\s-]/g, "");
  return HEADER_MAPPINGS[normalized] || normalized;
}

function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return ["true", "yes", "1", "published", "active"].includes(lower);
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function parseCSV(
  content: string,
  defaultCurrencyCode: string = "USD",
): CSVParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const errors: CSVParseError[] = [];
  const items: ParsedCSVItem[] = [];

  if (lines.length === 0) {
    errors.push({ row: 0, field: "", message: "CSV file is empty" });
    return { items: [], errors, headers: [] };
  }

  // Parse headers
  const headerLine = lines[0];
  const rawHeaders = parseCSVLine(headerLine);
  const headers = rawHeaders.map(normalizeHeader);

  // Check for required headers
  if (!headers.includes("name")) {
    errors.push({
      row: 1,
      field: "name",
      message: "Missing required column: name (or title/item)",
    });
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowErrors: CSVParseError[] = [];

    // Map values to fields
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        rowData[header] = values[index];
      }
    });

    // Validate and create item
    const name = rowData.name?.trim() || "";
    if (!name) {
      rowErrors.push({
        row: i + 1,
        field: "name",
        message: "required",
      });
    }

    const description = rowData.description?.trim() || null;
    if (!description) {
      rowErrors.push({
        row: i + 1,
        field: "description",
        message: "required",
      });
    }

    const currencyCode = rowData.currencyCode?.trim() || defaultCurrencyCode;
    const startingBid = parseNumber(rowData.startingBid || "0");
    const minBidIncrement = parseNumber(rowData.minBidIncrement || "1");

    if (startingBid < 0) {
      rowErrors.push({
        row: i + 1,
        field: "startingBid",
        message: "invalid",
      });
    }

    if (minBidIncrement <= 0) {
      rowErrors.push({
        row: i + 1,
        field: "minBidIncrement",
        message: "invalid",
      });
    }

    const item: ParsedCSVItem = {
      tempId: generateTempId(),
      name,
      description: rowData.description?.trim() || null,
      currencyCode,
      startingBid: Math.max(0, startingBid),
      minBidIncrement: Math.max(1, minBidIncrement),
      isPublished: rowData.isPublished
        ? parseBoolean(rowData.isPublished)
        : false,
      errors: rowErrors,
    };

    items.push(item);
    errors.push(...rowErrors);
  }

  return { items, errors, headers: rawHeaders };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted value
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
      } else if (char === "," || char === ";") {
        // Field separator (support both comma and semicolon)
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = [
    "name",
    "description",
    "currency",
    "startingBid",
    "minIncrement",
    "published",
  ];
  const sampleRow = [
    "Sample Item",
    "Item description here",
    "USD",
    "100",
    "10",
    "false",
  ];

  return [headers.join(","), sampleRow.join(",")].join("\n");
}

/**
 * Validate currency code against available currencies
 */
export function validateCurrencies(
  items: ParsedCSVItem[],
  validCurrencyCodes: string[],
): ParsedCSVItem[] {
  return items.map((item, index) => {
    const errors = [...item.errors];

    if (!validCurrencyCodes.includes(item.currencyCode)) {
      errors.push({
        row: index + 2, // +2 for header row and 0-indexing
        field: "currencyCode",
        message: `Invalid currency: ${item.currencyCode}`,
      });
    }

    return { ...item, errors };
  });
}

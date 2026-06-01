const NULL_BYTE_PATTERN = /\u0000/g;
const DANGEROUS_CONTROL_CHARS = /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;

export const sanitizeTextForDatabase = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .replace(NULL_BYTE_PATTERN, "")
    .replace(DANGEROUS_CONTROL_CHARS, "")
    .replace(HTML_TAG_PATTERN, "")
    .trim();
};

export const sanitizeOptionalTextForDatabase = (value: unknown): string | null => {
  const cleaned = sanitizeTextForDatabase(value);
  return cleaned.length > 0 ? cleaned : null;
};

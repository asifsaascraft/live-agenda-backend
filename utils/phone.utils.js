/**
 * Normalises a mobile number to E.164 ("+919876543210") or returns null.
 *
 * Accepts Indian numbers (9876543210, 09876543210, 919876543210, +91 98765 43210)
 * and international numbers with "+" or "00" (+44 7911 123456).
 * Mirrors the frontend validator; it is repeated here because the backend must
 * never trust the browser.
 */
export function normalizePhoneToE164(input) {
  const value = String(input ?? "").trim();
  if (!value) return null;
  if (/[^\d+\s\-().]/.test(value)) return null;
  if (value.lastIndexOf("+") > 0) return null; // "+" only allowed as a prefix

  const hasPlus = value.startsWith("+");
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const international = (candidate) => {
    if (!/^[1-9]\d{7,14}$/.test(candidate)) return null;
    // Indian numbers: +91 followed by 10 digits starting with 6-9.
    if (candidate.startsWith("91") && !/^91[6-9]\d{9}$/.test(candidate)) return null;
    return `+${candidate}`;
  };

  if (hasPlus) return international(digits);

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return international(digits);
  }

  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

/** AiSensy `destination` = country code + number, digits only ("919876543210"). */
export const toAiSensyDestination = (e164) => String(e164).replace(/\D/g, "");

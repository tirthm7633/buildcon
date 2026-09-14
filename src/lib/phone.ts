/**
 * Digits-only phone number prefixed with India's country code (91).
 * Every number in this app is currently stored as a bare 10-digit local
 * number (confirmed against live data), which is exactly the case wa.me
 * silently gets wrong — it needs the country code to look a number up at
 * all, and fails with "missing or wrong country code" otherwise. Numbers
 * that already carry a country code (12 digits starting with 91, or an
 * 11-digit "0"-prefixed local number) are normalized rather than
 * double-prefixed, so this stays correct if one is ever entered that way.
 */
export function toIndianCountryCodeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

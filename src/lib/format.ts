/**
 * Check if an address string is meaningful (not empty or placeholder).
 * Use this everywhere before displaying addresses to avoid "Адрес не указан".
 */
export function hasAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const trimmed = address.trim();
  if (!trimmed) return false;
  // Filter out placeholder strings
  if (trimmed === "Адрес не указан") return false;
  return true;
}

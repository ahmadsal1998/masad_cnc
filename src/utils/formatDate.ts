/** Returns only the date portion (YYYY-MM-DD) from any ISO date string. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.split('T')[0];
}

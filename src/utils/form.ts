export function toStr(val: unknown): string {
  return String(val ?? '').trim();
}

export function toDateInput(val: unknown): string {
  if (!val) return '';
  const s = String(val);
  return s.includes('T') ? s.split('T')[0] : s;
}

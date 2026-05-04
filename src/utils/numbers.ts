const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function arabicToEnglish(str: string): string {
  return str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(ARABIC_DIGITS.indexOf(d)));
}

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function arabicToEnglish(str: string): string {
  return str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String(ARABIC_DIGITS.indexOf(d)));
}

export const fmt = (n: number) => {
  const cents = Math.abs(Math.round(n * 100) % 100);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: cents !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
};

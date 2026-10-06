export function toLocalDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const thisYear = new Date().getFullYear();

export const YEARS = Array.from({ length: 7 }, (_, i) => thisYear - 4 + i);

export function currentMonth() {
  return String(new Date().getMonth() + 1).padStart(2, '0');
}

export function currentYear() {
  return String(new Date().getFullYear());
}

export function monthLabel(month, year) {
  return `${MONTHS_BN[Number(month) - 1] || ''} ${year}`;
}

export function num(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function money(n) {
  return `৳${num(n)}`;
}

export function taka(n) {
  return `${num(n)}`;
}
// Local-date helpers (CLAUDE.md section 10).
// Every calendar date in the app is a local "YYYY-MM-DD" string.
// Never use toISOString() or new Date("YYYY-MM-DD"): both work in UTC, and
// India is UTC+5:30, so between midnight and 05:30 they give the previous day.

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Date object -> local "YYYY-MM-DD".
export function toDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Today as local "YYYY-MM-DD".
export function todayStr() {
  return toDateStr(new Date());
}

// "YYYY-MM-DD" -> Date at local midnight.
export function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ISO weekday of a "YYYY-MM-DD" string: 1 = Monday ... 7 = Sunday.
export function isoWeekday(str) {
  return parseDateStr(str).getDay() || 7;
}

// Adds n days (n may be negative). Correct across month and year ends,
// because the Date constructor rolls day overflow into the next month.
export function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
}

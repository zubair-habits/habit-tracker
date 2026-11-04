// Test cases for isScheduled and the date helpers (docs/modules/module-1.md).
// Runs in the browser (tests/index.html, via Live Server) and in Node:
//   node tests/schedule.test.js
import { isScheduled } from '../js/schedule.js';
import { isoWeekday, toDateStr, addDays, parseDateStr } from '../js/dates.js';

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

const habitA = {
  activePeriods: [{ start: '2026-10-01', end: null }],
  schedule: [
    { from: '2026-10-01', repeat: true, days: [1, 3, 5], date: null, setTime: '07:00' },
    { from: '2026-10-12', repeat: true, days: [2, 3, 5], date: null, setTime: '07:00' },
  ],
};

const habitB = {
  activePeriods: [
    { start: '2026-10-01', end: '2026-10-07' },
    { start: '2026-10-15', end: null },
  ],
  schedule: [
    { from: '2026-10-01', repeat: true, days: EVERY_DAY, date: null, setTime: '06:00' },
    { from: '2026-10-15', repeat: true, days: EVERY_DAY, date: null, setTime: '06:00' },
  ],
};

const habitC = {
  activePeriods: [{ start: '2026-10-08', end: null }],
  schedule: [
    { from: '2026-10-08', repeat: false, days: [], date: '2026-10-20', setTime: '18:00' },
  ],
};

const habitD = {
  activePeriods: [{ start: '2026-10-01', end: null }],
  schedule: [
    { from: '2026-10-01', repeat: true, days: [1], date: null, setTime: '07:00' },
    { from: '2026-10-08', repeat: true, days: [2], date: null, setTime: '07:00' },
    { from: '2026-10-08', repeat: true, days: [4], date: null, setTime: '07:00' },
  ],
};

const habitE1 = {
  activePeriods: [{ start: '2026-10-01', end: null }],
  schedule: [],
};

const habitE2 = {
  activePeriods: [{ start: '2026-10-01', end: null }],
  schedule: [
    { from: '2026-10-10', repeat: true, days: EVERY_DAY, date: null, setTime: '07:00' },
  ],
};

// [label, actual function, expected]
const cases = [
  ['A 2026-09-30 before the habit started', () => isScheduled(habitA, '2026-09-30'), false],
  ['A 2026-10-05 (Mon) v1', () => isScheduled(habitA, '2026-10-05'), true],
  ['A 2026-10-06 (Tue) v1 has no Tuesday', () => isScheduled(habitA, '2026-10-06'), false],
  ['A 2026-10-09 (Fri) v1', () => isScheduled(habitA, '2026-10-09'), true],
  ['A 2026-10-12 (Mon) v2 applies from its first day', () => isScheduled(habitA, '2026-10-12'), false],
  ['A 2026-10-13 (Tue) v2', () => isScheduled(habitA, '2026-10-13'), true],
  ['A 2026-10-14 (Wed) in both versions', () => isScheduled(habitA, '2026-10-14'), true],

  ['B 2026-10-07 end date is inclusive', () => isScheduled(habitB, '2026-10-07'), true],
  ['B 2026-10-10 gap between active periods', () => isScheduled(habitB, '2026-10-10'), false],
  ['B 2026-10-15 second period', () => isScheduled(habitB, '2026-10-15'), true],

  ['C 2026-10-19 not the date', () => isScheduled(habitC, '2026-10-19'), false],
  ['C 2026-10-20 the date', () => isScheduled(habitC, '2026-10-20'), true],
  ['C 2026-10-27 same weekday a week later', () => isScheduled(habitC, '2026-10-27'), false],

  ['D 2026-10-05 (Mon) v1', () => isScheduled(habitD, '2026-10-05'), true],
  ['D 2026-10-08 (Thu) v3 wins over v2', () => isScheduled(habitD, '2026-10-08'), true],
  ['D 2026-10-13 (Tue) v3 is Thursday only', () => isScheduled(habitD, '2026-10-13'), false],

  ['E empty schedule, 2026-10-05', () => isScheduled(habitE1, '2026-10-05'), false],
  ['E active but no version yet, 2026-10-05', () => isScheduled(habitE2, '2026-10-05'), false],

  ['isoWeekday("2026-10-05") is Monday', () => isoWeekday('2026-10-05'), 1],
  ['isoWeekday("2026-10-11") is Sunday', () => isoWeekday('2026-10-11'), 7],
  ['toDateStr(8 Oct 2026, 01:00 local)', () => toDateStr(new Date(2026, 9, 8, 1, 0)), '2026-10-08'],
  ['addDays("2026-10-31", 1) month end', () => addDays('2026-10-31', 1), '2026-11-01'],
  ['addDays("2026-12-31", 1) year end', () => addDays('2026-12-31', 1), '2027-01-01'],
  ['addDays("2026-03-01", -1) back into February', () => addDays('2026-03-01', -1), '2026-02-28'],
  ['toDateStr(parseDateStr("2026-10-08")) round trip', () => toDateStr(parseDateStr('2026-10-08')), '2026-10-08'],
];

const results = cases.map(([label, fn, expected]) => {
  let actual;
  try {
    actual = fn();
  } catch (err) {
    actual = `error: ${err.message}`;
  }
  return { label, expected, actual, pass: actual === expected };
});

const passed = results.filter((r) => r.pass).length;
const total = `${passed} / ${results.length} passed`;
const allPassed = passed === results.length;

for (const r of results) {
  const line = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
  if (r.pass) console.log(line); else console.error(line);
}
console.log(total);

if (typeof document !== 'undefined') {
  const summary = document.getElementById('summary');
  summary.textContent = total;
  summary.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('results');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
    list.appendChild(li);
  }
} else if (typeof process !== 'undefined' && !allPassed) {
  process.exitCode = 1;
}

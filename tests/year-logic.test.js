// Test cases for the Yearly PDF logic (docs/modules/module-6.md).
// Runs in the browser (tests/index.html) and in Node:
//   node tests/year-logic.test.js
import { habitSummary } from '../js/analysis-logic.js';
import {
  dayMark, habitsForYear, headingText, MAX_HABITS, monthLabels, pageLayout, pageModel, pdfFileName,
  yearFigures, yearOptions, yearWeeks,
} from '../js/year-logic.js';
import {
  COMPLETIONS, dentist, gym, HABITS, read, TODAY, walk,
} from './analysis-fixture.js';

const NEW_YEAR = '2027-01-05';
const ALL_IDS = HABITS.map((h) => h.id);

const round4 = (n) => Math.round(n * 10000) / 10000;
const names = (habits) => habits.map((h) => h.name);
const figures = (habit, year = 2026, today = TODAY) => yearFigures(habit, COMPLETIONS, year, today);
const mark = (habit, date) => dayMark(habit, COMPLETIONS, date, TODAY);
const allDates = (year) => yearWeeks(year).flat().filter(Boolean);
const uniqueCount = (list) => new Set(list).size;
const model = () => pageModel(HABITS, COMPLETIONS, 2026, ALL_IDS, TODAY);
const elevenIds = Array.from({ length: 11 }, (_, i) => `id-${i}`);

const inputsBefore = JSON.stringify({ HABITS, COMPLETIONS });

const cases = [
  // Year grid
  ['yearWeeks 2026 has 53 columns', () => yearWeeks(2026).length, 53],
  ['yearWeeks 2026 column 0', () => yearWeeks(2026)[0], [null, null, null, '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']],
  ['yearWeeks 2026 last column', () => yearWeeks(2026).at(-1), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', null, null, null]],
  ['yearWeeks 2027 has 53 columns', () => yearWeeks(2027).length, 53],
  ['yearWeeks 2027 starts with four nulls', () => yearWeeks(2027)[0].slice(0, 5), [null, null, null, null, '2027-01-01']],
  ['yearWeeks 2028 has 53 columns', () => yearWeeks(2028).length, 53],
  ['yearWeeks 2028 last column is full, ending 31 Dec', () => yearWeeks(2028).at(-1), ['2028-12-25', '2028-12-26', '2028-12-27', '2028-12-28', '2028-12-29', '2028-12-30', '2028-12-31']],
  ['yearWeeks 2040 has 54 columns', () => yearWeeks(2040).length, 54],
  ['yearWeeks 2040 column 0', () => yearWeeks(2040)[0], [null, null, null, null, null, null, '2040-01-01']],
  ['yearWeeks 2040 last column', () => yearWeeks(2040).at(-1), ['2040-12-31', null, null, null, null, null, null]],
  ['Every date of 2026 once', () => [allDates(2026).length, uniqueCount(allDates(2026))], [365, 365]],
  ['Every date of 2028 once', () => [allDates(2028).length, uniqueCount(allDates(2028))], [366, 366]],
  ['monthLabels 2026 columns', () => monthLabels(2026).map((m) => m.col), [0, 4, 8, 13, 17, 22, 26, 30, 35, 39, 43, 48]],
  ['monthLabels 2026 names', () => monthLabels(2026).map((m) => m.label), ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']],

  // Years and habits
  ['yearOptions today 2026', () => yearOptions(HABITS, TODAY), [2026]],
  ['yearOptions today 2027', () => yearOptions(HABITS, NEW_YEAR), [2027, 2026]],
  ['yearOptions no habits', () => yearOptions([], TODAY), [2026]],
  ['habitsForYear 2026', () => names(habitsForYear(HABITS, COMPLETIONS, 2026)), ['Gym', 'Read', 'Dentist', 'Walk']],
  ['habitsForYear 2026 ignores input order', () => names(habitsForYear([...HABITS].reverse(), COMPLETIONS, 2026)), ['Gym', 'Read', 'Dentist', 'Walk']],
  ['habitsForYear 2027', () => names(habitsForYear(HABITS, COMPLETIONS, 2027)), ['Gym', 'Walk']],
  ['habitsForYear 2025', () => names(habitsForYear(HABITS, COMPLETIONS, 2025)), []],

  // Figures, today 2026-11-20
  ['Figures Gym', () => figures(gym), { x: 7, y: 9, percent: 78 }],
  ['Figures Read', () => figures(read), { x: 3, y: 6, percent: 50 }],
  ['Figures Dentist', () => figures(dentist), { x: 0, y: 0, percent: null }],
  ['Figures Walk', () => figures(walk), { x: 0, y: 14, percent: 0 }],
  ['Gym matches Analysis All time', () => {
    const { x, y, percent } = habitSummary(gym, COMPLETIONS, 'all', TODAY);
    return { x, y, percent };
  }, { x: 7, y: 9, percent: 78 }],

  // Figures, today 2027-01-05, year 2026: the last day is capped at 31 December
  ['Capped Gym', () => figures(gym, 2026, NEW_YEAR), { x: 7, y: 27, percent: 26 }],
  ['Capped Read', () => figures(read, 2026, NEW_YEAR), { x: 3, y: 6, percent: 50 }],
  ['Capped Dentist', () => figures(dentist, 2026, NEW_YEAR), { x: 0, y: 1, percent: 0 }],
  ['Capped Walk', () => figures(walk, 2026, NEW_YEAR), { x: 0, y: 26, percent: 0 }],

  // Figures, today 2027-01-05, year 2027
  ['New year Gym', () => figures(gym, 2027, NEW_YEAR), { x: 0, y: 1, percent: 0 }],
  ['New year Walk', () => figures(walk, 2027, NEW_YEAR), { x: 0, y: 2, percent: 0 }],
  ['A year still ahead counts nothing', () => figures(gym, 2027, TODAY), { x: 0, y: 0, percent: null }],

  // Day marks, today 2026-11-20
  ['Gym 11-02 done', () => mark(gym, '2026-11-02'), 'done'],
  ['Gym 11-09 missed', () => mark(gym, '2026-11-09'), 'missed'],
  ['Gym 11-10 done, stored flag says extra', () => mark(gym, '2026-11-10'), 'done'],
  ['Gym 11-16 extra', () => mark(gym, '2026-11-16'), 'extra'],
  ['Gym 11-17 done, a late completion', () => mark(gym, '2026-11-17'), 'done'],
  ['Gym 11-20 due', () => mark(gym, '2026-11-20'), 'due'],
  ['Gym 11-24 upcoming', () => mark(gym, '2026-11-24'), 'upcoming'],
  ['Gym 11-14 a Saturday', () => mark(gym, '2026-11-14'), null],
  ['Gym 10-30 before it started', () => mark(gym, '2026-10-30'), null],
  ['Walk 11-16 extra', () => mark(walk, '2026-11-16'), 'extra'],
  ['Walk 11-17 not scheduled', () => mark(walk, '2026-11-17'), null],
  ['Walk 11-21 upcoming', () => mark(walk, '2026-11-21'), 'upcoming'],
  ['Dentist 11-25 upcoming', () => mark(dentist, '2026-11-25'), 'upcoming'],
  ['Read 11-04 missed', () => mark(read, '2026-11-04'), 'missed'],
  ['Read 11-08 after it was discontinued', () => mark(read, '2026-11-08'), null],

  // Layout
  ['MAX_HABITS', () => MAX_HABITS, 10],
  ['Cell for 1', () => round4(pageLayout(1).cell), 4.9444],
  ['Cell for 3', () => round4(pageLayout(3).cell), 4.9444],
  ['Cell for 4', () => round4(pageLayout(4).cell), 4.4865],
  ['Cell for 6', () => round4(pageLayout(6).cell), 3.0182],
  ['Cell for 10', () => round4(pageLayout(10).cell), 1.8242],
  ['pageLayout(0)', () => pageLayout(0), null],
  ['pageLayout(11)', () => pageLayout(11), null],
  ['stripY[0] for 4', () => round4(pageLayout(4).stripY[0]), 30.4865],
  ['stripY[3] for 4', () => round4(pageLayout(4).stripY[3]), 151.6216],
  ['left and monthRowY', () => [pageLayout(4).left, pageLayout(4).monthRowY], [20, 26]],
  ['fontSize for 1', () => pageLayout(1).fontSize, 4],
  ['fontSize for 10', () => pageLayout(10).fontSize, 2.2],
  ['Last grid ends above the key, for every n', () => Array.from({ length: 10 }, (_, i) => {
    const { stripY, cell } = pageLayout(i + 1);
    return stripY.at(-1) + 8.5 * cell <= 192.0001;
  }), Array(10).fill(true)],

  // Text and model
  ['headingText Gym', () => headingText(gym, figures(gym)), 'Gym · 78% · 7 of 9 scheduled days'],
  ['headingText Read', () => headingText(read, figures(read)), 'Read · 50% · 3 of 6 scheduled days · discontinued'],
  ['headingText Dentist', () => headingText(dentist, figures(dentist)), 'Dentist · no scheduled days yet'],
  ['pageModel title', () => model().title, 'Habit Tracker · 2026'],
  ['pageModel madeLine', () => model().madeLine, 'Made Fri 20 Nov 2026'],
  ['pageModel strips in createdAt order', () => model().strips.map((s) => s.habit.name), ['Gym', 'Read', 'Dentist', 'Walk']],
  ['pageModel cell', () => round4(model().layout.cell), 4.4865],
  ['pageModel marks cover the year', () => Object.keys(model().strips[0].marks).length, 365],
  ['pageModel marks match dayMark', () => {
    const { marks } = model().strips[0];
    return ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-20', '2026-11-24', '2026-11-14'].map((d) => marks[d]);
  }, ['done', 'missed', 'extra', 'due', 'upcoming', null]],
  ['pageModel leaves out unticked habits', () => {
    const m = pageModel(HABITS, COMPLETIONS, 2026, [gym.id, dentist.id, walk.id], TODAY);
    return [m.strips.map((s) => s.habit.name), round4(m.layout.cell)];
  }, [['Gym', 'Dentist', 'Walk'], 4.9444]],
  ['pageModel none ticked', () => pageModel(HABITS, COMPLETIONS, 2026, [], TODAY), { error: 'Tick at least one habit.' }],
  ['pageModel 11 ticked', () => pageModel(HABITS, COMPLETIONS, 2026, elevenIds, TODAY), { error: 'Choose at most 10 habits for one page.' }],
  ['pageModel empty year', () => pageModel(HABITS, COMPLETIONS, 2025, ALL_IDS, TODAY), { error: 'No habits in 2025.' }],
  ['pdfFileName', () => pdfFileName(2026), 'habit-year-2026.pdf'],

  // Keep last: the calls above must not have changed their inputs.
  ['Inputs unchanged after every call', () => JSON.stringify({ HABITS, COMPLETIONS }) === inputsBefore, true],
];

const results = cases.map(([label, fn, expected]) => {
  let actual;
  try {
    actual = fn();
  } catch (err) {
    actual = `threw: ${err.message}`;
  }
  return { label, expected, actual, pass: JSON.stringify(actual) === JSON.stringify(expected) };
});

const passed = results.filter((r) => r.pass).length;
const allPassed = passed === results.length;
const total = `${passed} / ${results.length} passed`;

if (typeof document !== 'undefined') {
  const summaryLine = document.getElementById('year-summary');
  summaryLine.textContent = total;
  summaryLine.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('year-results');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
    list.appendChild(li);
  }
} else if (typeof process !== 'undefined') {
  console.log(total);
  if (!allPassed) process.exitCode = 1;
}

// Test cases for the calendar and completion rules (docs/modules/module-3.md).
// Runs in the browser (tests/index.html) and in Node:
//   node tests/calendar-logic.test.js
import { applyDiscontinue, applyEdit, applyRestart, buildNewHabit } from '../js/habit-logic.js';
import {
  addMonths, buildCompletion, canMark, dayDots, dayEntries, formatClock, formatDeviation,
  inActivePeriod, intendedMs, monthGrid, monthTitle, versionOn,
} from '../js/calendar-logic.js';

const TODAY = '2026-11-10'; // a Tuesday
const RED = '#e5484d';
const BLUE = '#0090ff';
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
const MWF = [1, 3, 5];

const FUTURE = "Future days can't be marked.";
const INACTIVE = "This habit wasn't active on that day.";
const ALREADY = 'Already completed.';

function at(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm).getTime();
}

function input(changes = {}) {
  return { name: 'Gym', colour: RED, repeat: true, days: MWF, date: null, setTime: '07:00', ...changes };
}

function done(habit, date, extra = false) {
  return { habitId: habit.id, date, extra };
}

// Versions and periods
const editedTime = applyEdit(
  buildNewHabit(input(), '2026-11-01', 'edited', 1),
  input({ setTime: '08:00' }),
  '2026-11-10'
);

// Building a completion
const daily = buildNewHabit(input({ days: EVERY_DAY }), '2026-11-01', 'daily', 1);
const mwfHabit = buildNewHabit(input(), '2026-11-01', 'mwf', 1);
const built = (nowMs, habit = daily, date = TODAY) => buildCompletion(habit, date, nowMs);

// A habit with a gap: periods 11-01 to 11-05 and from 11-08.
const stopped = applyDiscontinue(daily, [], '2026-11-06'); // ends 11-05
const gapped = applyRestart(stopped, input({ days: EVERY_DAY }), '2026-11-08');

// Dots and day entries
const gym = buildNewHabit(input({ name: 'Test Gym' }), '2026-11-02', 'gym', 100);
const read = buildNewHabit(
  input({ name: 'Test Read', colour: BLUE, days: EVERY_DAY }), '2026-11-02', 'read', 200
);
const both = [gym, read];

const dots = (date, completions = []) =>
  dayDots(both, completions, date, TODAY).map((d) => [d.habitId, d.state]);
const names = (entries) => entries.map((e) => e.habit.id);
const entries = (date, completions = []) => dayEntries(both, completions, date, TODAY);
const allEntries = (e) => [...e.scheduled, ...e.extras, ...e.extraCandidates];

const nov = monthGrid(2026, 11);
const feb = monthGrid(2027, 2);
const dec = monthGrid(2026, 12);

const cases = [
  // Month grid
  ['Nov 2026 has 6 weeks', () => nov.length, 6],
  ['Nov 2026 week 1', () => nov[0], [null, null, null, null, null, null, '2026-11-01']],
  ['Nov 2026 last real date', () => nov.flat().filter(Boolean).pop(), '2026-11-30'],
  ['Nov 2026 has 30 dates', () => nov.flat().filter(Boolean).length, 30],
  ['Every week has 7 entries', () => nov.every((w) => w.length === 7), true],
  ['Feb 2027 has exactly 4 weeks', () => feb.length, 4],
  ['Feb 2027 has no blanks', () => feb.flat().includes(null), false],
  ['Dec 2026 has 5 weeks', () => dec.length, 5],
  ['Dec 2026 week 1 starts with one blank', () => dec[0].slice(0, 2), [null, '2026-12-01']],
  ['Leap February has 29 dates', () => monthGrid(2028, 2).flat().filter(Boolean).pop(), '2028-02-29'],
  ['addMonths across a year end', () => addMonths(2026, 12, 1), { year: 2027, month: 1 }],
  ['addMonths back across a year', () => addMonths(2026, 1, -1), { year: 2025, month: 12 }],
  ['monthTitle', () => monthTitle(2026, 11), 'November 2026'],

  // Versions and periods
  ['versionOn the day before an edit', () => versionOn(editedTime, '2026-11-09').setTime, '07:00'],
  ['versionOn the day of an edit', () => versionOn(editedTime, '2026-11-10').setTime, '08:00'],
  ['versionOn before the first version', () => versionOn(editedTime, '2026-10-31'), null],
  ['inActivePeriod the day before the start', () => inActivePeriod(editedTime, '2026-10-31'), false],
  ['inActivePeriod on the start', () => inActivePeriod(editedTime, '2026-11-01'), true],
  ['intendedMs is local time', () => intendedMs('2026-11-10', '07:30'), at(2026, 11, 10, 7, 30)],

  // Building a completion
  ['12 minutes after', () => {
    const c = built(at(2026, 11, 10, 7, 12));
    return [c.deviationMin, c.late, c.extra, c.setTime, c.habitId, c.date];
  }, [12, false, false, '07:00', 'daily', TODAY]],
  ['completedAt is the tap time', () => built(at(2026, 11, 10, 7, 12)).completedAt, at(2026, 11, 10, 7, 12)],
  ['10 minutes early', () => built(at(2026, 11, 10, 6, 50)).deviationMin, -10],
  ['Exactly 12 hours is not late', () => {
    const c = built(at(2026, 11, 10, 19, 0));
    return [c.deviationMin, c.late];
  }, [720, false]],
  ['12 hours and 1 minute is late', () => {
    const c = built(at(2026, 11, 10, 19, 1));
    return [c.deviationMin, c.late];
  }, [721, true]],
  ['Two days later', () => {
    const c = built(at(2026, 11, 12, 8, 0));
    return [c.deviationMin, c.late];
  }, [2940, true]],
  ['A few seconds early rounds to a plain 0', () => Object.is(built(at(2026, 11, 10, 7, 0) - 5000).deviationMin, 0), true],
  ['Set time is the one in effect on the date, not today', () => {
    const c = buildCompletion(editedTime, '2026-11-09', at(2026, 11, 10, 7, 30));
    return [c.setTime, c.deviationMin];
  }, ['07:00', 1470]],
  ['Unscheduled day is an extra', () => built(at(2026, 11, 10, 7, 0), mwfHabit).extra, true],

  // Allowed or refused
  ['Future day refused', () => canMark(daily, [], '2026-11-11', TODAY), FUTURE],
  ['Before the habit existed refused', () => canMark(daily, [], '2026-10-31', TODAY), INACTIVE],
  ['In the gap between periods refused', () => canMark(gapped, [], '2026-11-06', TODAY), INACTIVE],
  ['After the gap allowed', () => canMark(gapped, [], '2026-11-08', TODAY), null],
  ['A second completion refused', () => canMark(daily, [done(daily, TODAY)], TODAY, TODAY), ALREADY],
  ['Another habit\'s completion does not count', () => canMark(daily, [done(mwfHabit, TODAY)], TODAY, TODAY), null],
  ['Another day\'s completion does not count', () => canMark(daily, [done(daily, '2026-11-09')], TODAY, TODAY), null],
  ['Today, scheduled, no completion: allowed', () => canMark(daily, [], TODAY, TODAY), null],
  ['Unscheduled but active: allowed as an extra', () => canMark(mwfHabit, [], TODAY, TODAY), null],

  // Deviation wording
  ['Wording 0', () => formatDeviation(0), 'On time'],
  ['Wording 12', () => formatDeviation(12), '12 min late'],
  ['Wording -10', () => formatDeviation(-10), '10 min early'],
  ['Wording 65', () => formatDeviation(65), '1 h 5 min late'],
  ['Wording 120', () => formatDeviation(120), '2 h late'],
  ['Wording 2940', () => formatDeviation(2940), '2 d 1 h late'],
  ['Wording 4320', () => formatDeviation(4320), '3 d late'],
  ['Wording -90', () => formatDeviation(-90), '1 h 30 min early'],
  ['Wording 59', () => formatDeviation(59), '59 min late'],
  ['Wording 1439', () => formatDeviation(1439), '23 h 59 min late'],
  ['Clock is 24-hour local time', () => formatClock(at(2026, 11, 10, 19, 5)), '19:05'],
  ['Clock pads the hour', () => formatClock(at(2026, 11, 10, 7, 12)), '07:12'],

  // Dots and day entries
  ['Monday, nothing done: both missed', () => dots('2026-11-09'), [['gym', 'missed'], ['read', 'missed']]],
  ['Today, Read done: Gym has no dot', () => dots(TODAY, [done(read, TODAY)]), [['read', 'done']]],
  ['Today, nothing done: Read is due', () => dots(TODAY), [['read', 'due']]],
  ['Today, an extra for Gym', () => dots(TODAY, [done(gym, TODAY, true)]), [['gym', 'extra'], ['read', 'due']]],
  ['Wednesday: both upcoming', () => dots('2026-11-11'), [['gym', 'upcoming'], ['read', 'upcoming']]],
  ['Before both started: no dots', () => dots('2026-11-01'), []],
  ['A dot carries the colour', () => dayDots(both, [], TODAY, TODAY)[0].colour, BLUE],
  ['Entries today: Read scheduled', () => names(entries(TODAY).scheduled), ['read']],
  ['Entries today: Gym is a candidate', () => names(entries(TODAY).extraCandidates), ['gym']],
  ['Entries today: no extras yet', () => names(entries(TODAY).extras), []],
  ['Entries today: not future', () => entries(TODAY).future, false],
  ['Entries today: Read can be marked', () => entries(TODAY).scheduled[0].canMark, null],
  ['Entries with an extra done', () => {
    const e = entries(TODAY, [done(gym, TODAY, true)]);
    return [names(e.extras), names(e.extraCandidates)];
  }, [['gym'], []]],
  ['Entries tomorrow: future', () => entries('2026-11-11').future, true],
  ['Entries tomorrow: nothing can be marked', () => allEntries(entries('2026-11-11')).some((e) => e.canMark === null), false],
  ['Entries before both started: nothing at all', () => allEntries(entries('2026-11-01')).length, 0],
  ['Entry shows the set time in effect on that date', () => {
    const e = dayEntries([editedTime], [], '2026-11-09', TODAY);
    return e.scheduled[0].setTime;
  }, '07:00'],
  ['Entry shows the set time copied onto the completion', () => {
    const c = { ...done(editedTime, TODAY), setTime: '06:15' };
    return dayEntries([editedTime], [c], TODAY, TODAY).extras[0].setTime;
  }, '06:15'],
  ['Dots follow createdAt, whatever the list order', () =>
    dayDots([read, gym], [], '2026-11-09', TODAY).map((d) => d.habitId), ['gym', 'read']],
  ['Entries follow createdAt, whatever the list order', () =>
    names(dayEntries([read, gym], [], '2026-11-09', TODAY).scheduled), ['gym', 'read']],
  ['A discontinued habit keeps its old dots', () => {
    const old = applyDiscontinue(read, [], '2026-11-10'); // ends 11-09
    return [
      dayDots([old], [], '2026-11-09', TODAY).map((d) => d.state),
      dayDots([old], [], TODAY, TODAY).length,
    ];
  }, [['missed'], 0]],
];

const results = cases.map(([label, fn, expected]) => {
  let actual;
  let threw = false;
  try {
    actual = fn();
  } catch (err) {
    actual = `threw: ${err.message}`;
    threw = true;
  }
  const pass = !threw && JSON.stringify(actual) === JSON.stringify(expected);
  return { label, expected, actual, pass };
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
  const summary = document.getElementById('calendar-summary');
  summary.textContent = total;
  summary.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('calendar-results');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
    list.appendChild(li);
  }
} else if (typeof process !== 'undefined' && !allPassed) {
  process.exitCode = 1;
}

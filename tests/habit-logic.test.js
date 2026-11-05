// Test cases for the habit rules (docs/modules/module-2.md).
// Runs in the browser (tests/index.html, via Live Server) and in Node:
//   node tests/habit-logic.test.js
import { isScheduled } from '../js/schedule.js';
import {
  PALETTE, normaliseName, validateInput, scheduleFromInput, currentVersion, sameSchedule,
  buildNewHabit, applyEdit, lastCountedDay, countDays, discontinueMessage, applyDiscontinue,
  applyRestart, findByName, mostRecentlyDiscontinued, firstFreeColour, describeSchedule,
  describeHistory,
} from '../js/habit-logic.js';
import { buildCompletion } from '../js/calendar-logic.js';
import { at, COMPLETIONS, gym, read, walk } from './analysis-fixture.js';

const TODAY = '2026-11-10'; // a Tuesday
const RED = '#e5484d';
const ORANGE = '#f76b15';
const AMBER = '#ffb224';
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

function input(changes = {}) {
  return { name: 'Gym', colour: RED, repeat: true, days: [1, 3, 5], date: null, setTime: '07:00', ...changes };
}

function habit(changes = {}, start = '2026-11-01', id = 'id-1') {
  return buildNewHabit(input(changes), start, id, 0);
}

function done(date, extra = false, habitId = 'id-1') {
  return { habitId, date, extra };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

// True when calling fn leaves the habit exactly as it was.
function unchangedBy(h, fn) {
  const before = copy(h);
  fn();
  return JSON.stringify(h) === JSON.stringify(before);
}

const everyDay = habit({ days: EVERY_DAY });
const someDone = [done('2026-11-01'), done('2026-11-02'), done('2026-11-03'), done('2026-11-10')];
const createdToday = habit({ days: EVERY_DAY }, TODAY);
const mwf = habit({}, '2026-11-02');

const edited = applyEdit(habit(), input({ days: [2, 3, 5] }), TODAY);
const editedTwice = applyEdit(applyEdit(habit(), input({ days: [2] }), TODAY), input({ days: [4] }), TODAY);

const stopped = applyDiscontinue(everyDay, [], TODAY); // end 2026-11-09
const restartedLater = applyRestart(stopped, input({ days: EVERY_DAY }), '2026-11-20');
const stoppedSameDayDone = applyDiscontinue(everyDay, [done(TODAY)], TODAY); // end 2026-11-10
const stoppedOnFirstDay = applyDiscontinue(createdToday, [], TODAY);

const activeGym = { ...habit({ name: 'Gym' }), id: 'a' };
const oldGym = { ...habit({ name: 'gym' }), id: 'b', status: 'discontinued' };
const testRead = habit({ name: 'Test Read' });

const oldestStop = { ...stopped, id: 'old', activePeriods: [{ start: '2026-01-01', end: '2026-02-01' }] };
const newestStop = { ...stopped, id: 'new', activePeriods: [{ start: '2026-01-01', end: '2026-03-01' }] };

const oneTimePast = input({ repeat: false, days: [], date: '2026-10-20' });
const oneTimeHabit = buildNewHabit(oneTimePast, '2026-10-01', 'id-1', 0);

function usesColours(...colours) {
  return colours.map((colour, i) => ({ ...habit({ colour }), id: `c${i}` }));
}

const hasErrors = (changes, today = TODAY) => validateInput(input(changes), today).length > 0;

// [label, actual function, expected]
const cases = [
  // Validation
  ['Name of spaces only is refused', () => hasErrors({ name: '   ' }), true],
  ['41-character name is refused', () => hasErrors({ name: 'x'.repeat(41) }), true],
  ['40-character name is accepted', () => hasErrors({ name: 'x'.repeat(40) }), false],
  ['"Gym" is accepted', () => hasErrors({ name: 'Gym' }), false],
  ['Colour outside the palette is refused', () => hasErrors({ colour: '#123456' }), true],
  ['No days ticked is refused', () => hasErrors({ days: [] }), true],
  ['Day 8 is refused', () => hasErrors({ days: [8] }), true],
  ['Repeated day is refused', () => hasErrors({ days: [1, 1] }), true],
  ['Days 5, 1, 3 are accepted', () => hasErrors({ days: [5, 1, 3] }), false],
  ['Days are stored sorted', () => scheduleFromInput(input({ days: [5, 1, 3] }), TODAY).days, [1, 3, 5]],
  ['One-time yesterday is refused', () => hasErrors({ repeat: false, date: '2026-11-09' }), true],
  ['One-time today is accepted', () => hasErrors({ repeat: false, date: TODAY }), false],
  ['One-time impossible date is refused', () => hasErrors({ repeat: false, date: '2026-02-31' }), true],
  ['One-time past date is accepted if it is the existing date',
    () => validateInput(oneTimePast, TODAY, { existingDate: '2026-10-20' }), []],
  ['One-time different past date is still refused',
    () => validateInput(oneTimePast, TODAY, { existingDate: '2026-10-21' }).length, 1],
  ['Set time 7:00 is refused', () => hasErrors({ setTime: '7:00' }), true],
  ['Set time 07:00 is accepted', () => hasErrors({ setTime: '07:00' }), false],
  ['One-time schedule stores no days', () => scheduleFromInput(input({ repeat: false, date: TODAY }), TODAY).days, []],
  ['Weekly schedule stores no date', () => scheduleFromInput(input(), TODAY).date, null],

  // Build and edit
  ['New habit has one open period', () => habit().activePeriods, [{ start: '2026-11-01', end: null }]],
  ['New habit has one version', () => [habit().schedule.length, habit().schedule[0].from], [1, '2026-11-01']],
  ['New habit name is trimmed', () => habit({ name: '  Gym ' }).name, 'Gym'],
  ['Edit of name only adds no version', () => applyEdit(habit(), input({ name: 'Lift' }), TODAY).schedule.length, 1],
  ['Edit of colour only adds no version', () => applyEdit(habit(), input({ colour: ORANGE }), TODAY).schedule.length, 1],
  ['Edit of days adds a version', () => edited.schedule.length, 2],
  ['New version starts today', () => edited.schedule[1].from, TODAY],
  ['Old version is unchanged', () => edited.schedule[0], habit().schedule[0]],
  ['Two edits on one day give three versions', () => editedTwice.schedule.length, 3],
  ['Two edits: Thursday 2026-11-12 is scheduled', () => isScheduled(editedTwice, '2026-11-12'), true],
  ['Two edits: Tuesday 2026-11-17 is not', () => isScheduled(editedTwice, '2026-11-17'), false],
  ['Edit of set time adds a version', () => applyEdit(habit(), input({ setTime: '08:00' }), TODAY).schedule.length, 2],
  ['applyEdit leaves its input unchanged', () => {
    const h = habit();
    return unchangedBy(h, () => applyEdit(h, input({ days: [2], name: 'Lift' }), TODAY));
  }, true],
  ['applyDiscontinue leaves its input unchanged', () => {
    const h = habit();
    return unchangedBy(h, () => applyDiscontinue(h, [], TODAY));
  }, true],
  ['applyRestart leaves its input unchanged', () => {
    const h = applyDiscontinue(habit(), [], TODAY);
    return unchangedBy(h, () => applyRestart(h, input(), '2026-11-20'));
  }, true],
  ['sameSchedule ignores "from"', () => sameSchedule(
    scheduleFromInput(input(), '2026-01-01'), scheduleFromInput(input(), '2026-02-02')), true],
  ['currentVersion picks the last in effect', () => currentVersion(editedTwice, TODAY).days, [4]],

  // Counting and discontinue
  ['No completions: last counted day is yesterday', () => lastCountedDay(everyDay, [], TODAY), '2026-11-09'],
  ['No completions: 0 of 9', () => countDays(everyDay, [], '2026-11-09'), { x: 0, y: 9 }],
  ['No completions: message ends with 0%', () => discontinueMessage({ x: 0, y: 9 }).endsWith(
    '(0%). Are you sure you want to remove this habit?'), true],
  ['Completed today: last counted day is today', () => lastCountedDay(everyDay, someDone, TODAY), TODAY],
  ['Completed today: 4 of 10', () => countDays(everyDay, someDone, TODAY), { x: 4, y: 10 }],
  ['Message reads 4 days out of 10 days (40%)', () => discontinueMessage({ x: 4, y: 10 }),
    'You have continued with this habit for 4 days out of 10 days (40%). Are you sure you want to remove this habit?'],
  ['Extra today does not count as completed', () => lastCountedDay(mwf, [done(TODAY, true)], TODAY), '2026-11-09'],
  ['Extras are left out of x', () => countDays(mwf, [done('2026-11-03', true)], '2026-11-09'), { x: 0, y: 4 }],
  ['Another habit\'s completions are ignored', () => countDays(everyDay, [done('2026-11-01', false, 'other')], '2026-11-09'), { x: 0, y: 9 }],
  ['Created today: 0 of 0', () => countDays(createdToday, [], lastCountedDay(createdToday, [], TODAY)), { x: 0, y: 0 }],
  ['Created today: no scheduled days message', () => discontinueMessage({ x: 0, y: 0 }),
    'This habit has had no scheduled days yet. Are you sure you want to remove it?'],
  ['Mon/Wed/Fri counts only 2, 4, 6 and 9 November', () => countDays(mwf, [], '2026-11-09').y, 4],

  // isScheduled decides, never the stored flag (Module 5, decisions 1 and 5)
  ['Stored extra on a scheduled day still counts: Gym 7 of 9', () => countDays(gym, COMPLETIONS, '2026-11-19'), { x: 7, y: 9 }],
  ['countDays with firstDay: Gym from 11-10 is 4 of 5', () => countDays(gym, COMPLETIONS, '2026-11-19', '2026-11-10'), { x: 4, y: 5 }],
  ['countDays with a firstDay before the first active day', () => countDays(gym, COMPLETIONS, '2026-11-19', '2026-01-01'), { x: 7, y: 9 }],
  ['Read counts 3 of 6', () => countDays(read, COMPLETIONS, '2026-11-07'), { x: 3, y: 6 }],
  ['Read message reads 3 days out of 6 days (50%)', () => discontinueMessage(countDays(read, COMPLETIONS, '2026-11-07')),
    'You have continued with this habit for 3 days out of 6 days (50%). Are you sure you want to remove this habit?'],
  ['Gym pending today: last counted day is yesterday', () => lastCountedDay(gym, COMPLETIONS, '2026-11-20'), '2026-11-19'],
  ['Gym completed today: last counted day is today', () => lastCountedDay(
    gym, [...COMPLETIONS, buildCompletion(gym, '2026-11-20', at(2026, 11, 20, 7, 0))], '2026-11-20'), '2026-11-20'],
  ['Stored non-extra on an unscheduled day: Walk ends yesterday', () => lastCountedDay(walk, COMPLETIONS, '2026-11-16'), '2026-11-15'],
  ['Discontinue uses the same rule: Walk ends yesterday', () => applyDiscontinue(walk, COMPLETIONS, '2026-11-16').activePeriods[0].end, '2026-11-15'],
  ['Discontinue sets the status', () => stopped.status, 'discontinued'],
  ['Discontinue ends the period yesterday', () => stopped.activePeriods, [{ start: '2026-11-01', end: '2026-11-09' }]],
  ['Discontinue keeps the versions', () => stopped.schedule, everyDay.schedule],
  ['Discontinue after completing today ends today', () => stoppedSameDayDone.activePeriods[0].end, TODAY],

  // Restart
  ['Restart after a gap: two periods', () => restartedLater.activePeriods, [
    { start: '2026-11-01', end: '2026-11-09' }, { start: '2026-11-20', end: null },
  ]],
  ['Restart adds a version from that day', () => restartedLater.schedule.at(-1).from, '2026-11-20'],
  ['Restart adds a version even if unchanged', () => restartedLater.schedule.length, 2],
  ['Restart keeps the id', () => restartedLater.id, 'id-1'],
  ['Restart sets the status', () => restartedLater.status, 'active'],
  ['Restart: 2026-11-15 inside the gap is not scheduled', () => isScheduled(restartedLater, '2026-11-15'), false],
  ['Restart: 2026-11-20 is scheduled', () => isScheduled(restartedLater, '2026-11-20'), true],
  ['End today, restart today: one period', () => applyRestart(stoppedSameDayDone, input({ days: EVERY_DAY }), TODAY).activePeriods,
    [{ start: '2026-11-01', end: null }]],
  ['End yesterday, restart today: one period', () => applyRestart(stopped, input({ days: EVERY_DAY }), TODAY).activePeriods,
    [{ start: '2026-11-01', end: null }]],
  ['Removed on the first day: empty period', () => stoppedOnFirstDay.activePeriods, [{ start: TODAY, end: '2026-11-09' }]],
  ['Removed on the first day: not scheduled that day', () => isScheduled(stoppedOnFirstDay, TODAY), false],
  ['Removed on the first day, restarted: one period', () => applyRestart(stoppedOnFirstDay, input({ days: EVERY_DAY }), TODAY).activePeriods,
    [{ start: TODAY, end: null }]],
  ['History shows the empty period', () => describeHistory(stoppedOnFirstDay).periods, ['Removed on the day it was added']],
  ['History lists versions with dates', () => describeHistory(oneTimeHabit).versions,
    ['From Thu 1 Oct 2026: Once · Tue 20 Oct 2026 · 07:00']],

  // Names and colours
  ['normaliseName trims and lower-cases', () => normaliseName('  Test READ '), 'test read'],
  ['findByName ignores case and spaces', () => findByName([testRead], ' test READ ').active.name, 'Test Read'],
  ['findByName separates active and discontinued', () => {
    const found = findByName([activeGym, oldGym], 'GYM');
    return [found.active.id, found.discontinued.map((h) => h.id)];
  }, ['a', ['b']]],
  ['findByName with no match', () => findByName([activeGym], 'Run'), { active: null, discontinued: [] }],
  ['Most recently discontinued wins', () => mostRecentlyDiscontinued([oldestStop, newestStop]).id, 'new'],
  ['First free colour after Red and Orange is Amber', () => firstFreeColour(usesColours(RED, ORANGE)), AMBER],
  ['All colours used gives Red', () => firstFreeColour(usesColours(...PALETTE.map((c) => c.value))), RED],
  ['Discontinued habits do not use up a colour', () => firstFreeColour([{ ...oldGym, colour: RED }]), RED],

  // Labels
  ['Label: every day', () => describeSchedule({ repeat: true, days: EVERY_DAY, date: null, setTime: '06:00' }), 'Every day · 06:00'],
  ['Label: some days', () => describeSchedule({ repeat: true, days: [1, 3, 5], date: null, setTime: '07:00' }), 'Mon, Wed, Fri · 07:00'],
  ['Label: one time', () => describeSchedule({ repeat: false, days: [], date: '2026-10-20', setTime: '18:00' }), 'Once · Tue 20 Oct 2026 · 18:00'],
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
  const summary = document.getElementById('logic-summary');
  summary.textContent = total;
  summary.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('logic-results');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
    list.appendChild(li);
  }
} else if (typeof process !== 'undefined' && !allPassed) {
  process.exitCode = 1;
}

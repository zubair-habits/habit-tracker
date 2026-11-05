// Test cases for the Analysis figures (docs/modules/module-5.md).
// Runs in the browser (tests/index.html) and in Node:
//   node tests/analysis-logic.test.js
import {
  analysisModel, countsLine, deviationSeries, habitSummary, isScheduledCompletion, lateLine, meanAndSpread,
  overviewBars, percentLine, RANGES, rangeStart, shortDate, streakLine, streaks, timingLine, weeklyRates,
} from '../js/analysis-logic.js';
import { buildCompletion } from '../js/calendar-logic.js';
import {
  at, COMPLETIONS, dentist, gym, HABITS, read, TODAY, walk,
} from './analysis-fixture.js';

const LATER = '2026-12-02';
const LAST_DAY = '2026-11-19';

const summary = (habit, range = 'all', today = TODAY, comps = COMPLETIONS) => habitSummary(habit, comps, range, today);
const round4 = (n) => Math.round(n * 10000) / 10000;
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

const withGymToday = [...COMPLETIONS, buildCompletion(gym, TODAY, at(2026, 11, 20, 7, 0))];
const row = (habitId, date) => COMPLETIONS.find((c) => c.habitId === habitId && c.date === date);
const model = () => analysisModel(HABITS, COMPLETIONS, 'all', TODAY);

const cases = [
  // Ranges
  ['RANGES keys in order', () => RANGES.map((r) => r.key), ['last30', 'month', 'all']],
  ['RANGES labels', () => RANGES.map((r) => r.label), ['Last 30 days', 'This month', 'All time']],
  ['rangeStart last30', () => rangeStart('last30', '2026-11-20'), '2026-10-22'],
  ['rangeStart month', () => rangeStart('month', '2026-11-20'), '2026-11-01'],
  ['rangeStart all', () => rangeStart('all', '2026-11-20'), null],
  ['rangeStart last30 across a year end', () => rangeStart('last30', '2027-01-10'), '2026-12-12'],

  // The fixture is what the spec describes
  ['Fixture: Gym 11-10 is stored as extra', () => row('gym-id', '2026-11-10').extra, true],
  ['Fixture: Walk 11-16 is stored as not extra', () => row('walk-id', '2026-11-16').extra, false],
  ['Fixture: Read ended on 11-07', () => read.activePeriods, [{ start: '2026-11-02', end: '2026-11-07' }]],
  ['isScheduledCompletion ignores the stored flag: Gym 11-10', () => isScheduledCompletion(gym, row('gym-id', '2026-11-10')), true],
  ['isScheduledCompletion ignores the stored flag: Walk 11-16', () => isScheduledCompletion(walk, row('walk-id', '2026-11-16')), false],

  // Mean and spread
  ['meanAndSpread of nothing', () => meanAndSpread([]), { n: 0, mean: null, spread: null }],
  ['meanAndSpread of one value', () => meanAndSpread([7]), { n: 1, mean: 7, spread: null }],
  ['meanAndSpread of six: mean', () => meanAndSpread([0, 15, -10, 30, 5, 20]).mean, 10],
  ['meanAndSpread of six: spread', () => round4(meanAndSpread([0, 15, -10, 30, 5, 20]).spread), 13.2288],
  ['meanAndSpread of two', () => meanAndSpread([0, -10]), { n: 2, mean: -5, spread: 5 }],

  // Streaks
  ['streaks Gym', () => streaks(gym, COMPLETIONS, LAST_DAY), { current: 2, best: 3 }],
  ['streaks Read', () => streaks(read, COMPLETIONS, LAST_DAY).best, 2],
  ['streaks Dentist', () => streaks(dentist, COMPLETIONS, LAST_DAY), { current: 0, best: 0 }],
  ['streaks Walk: the 11-16 extra is not a streak', () => streaks(walk, COMPLETIONS, LAST_DAY), { current: 0, best: 0 }],

  // Summaries, All time
  ['Gym: lastDay', () => summary(gym).lastDay, LAST_DAY],
  ['Gym: from is null for All time', () => summary(gym).from, null],
  ['Gym: habitId', () => summary(gym).habitId, 'gym-id'],
  ['Gym: x, y, percent, missed', () => pick(summary(gym), ['x', 'y', 'percent', 'missed']), { x: 7, y: 9, percent: 78, missed: 2 }],
  ['Gym: onTime, late, extra', () => pick(summary(gym), ['onTime', 'late', 'extra']), { onTime: 6, late: 1, extra: 1 }],
  ['Gym: timing mean', () => summary(gym).timing.mean, 10],
  ['Gym: timing spread', () => round4(summary(gym).timing.spread), 13.2288],
  ['Gym: lateTiming', () => pick(summary(gym).lateTiming, ['n', 'mean']), { n: 1, mean: 1500 }],
  ['Gym: streaks', () => pick(summary(gym), ['currentStreak', 'bestStreak']), { currentStreak: 2, bestStreak: 3 }],
  ['Gym completed today: figures', () => pick(summary(gym, 'all', TODAY, withGymToday), ['lastDay', 'x', 'y', 'percent', 'onTime', 'currentStreak', 'bestStreak']),
    { lastDay: TODAY, x: 8, y: 10, percent: 80, onTime: 7, currentStreak: 3, bestStreak: 3 }],

  ['Read: x, y, percent, missed', () => pick(summary(read), ['x', 'y', 'percent', 'missed']), { x: 3, y: 6, percent: 50, missed: 3 }],
  ['Read: onTime, late, extra', () => pick(summary(read), ['onTime', 'late', 'extra']), { onTime: 2, late: 1, extra: 0 }],
  ['Read: timing', () => pick(summary(read).timing, ['mean', 'spread']), { mean: -5, spread: 5 }],
  ['Read: lateTiming mean', () => summary(read).lateTiming.mean, 750],
  ['Read: no current streak, best 2', () => pick(summary(read), ['currentStreak', 'bestStreak']), { currentStreak: null, bestStreak: 2 }],

  ['Dentist: x, y, percent', () => pick(summary(dentist), ['x', 'y', 'percent']), { x: 0, y: 0, percent: null }],
  ['Dentist: percentLine', () => percentLine(summary(dentist)), 'No scheduled days in this range.'],

  ['Walk: x, y, percent, missed', () => pick(summary(walk), ['x', 'y', 'percent', 'missed']), { x: 0, y: 14, percent: 0, missed: 14 }],
  ['Walk: the 11-16 row counts as an extra', () => summary(walk).extra, 1],
  ['Walk: no timing', () => summary(walk).timing.n, 0],
  ['An extra dated today is counted', () => summary(walk, 'all', '2026-11-16').extra, 1],

  // Ranges on a later day, Gym, no new completions
  ['This month on 12-02: x, y, percent', () => pick(summary(gym, 'month', LATER), ['x', 'y', 'percent']), { x: 0, y: 1, percent: 0 }],
  ['This month on 12-02: best streak stays 3', () => summary(gym, 'month', LATER).bestStreak, 3],
  ['Last 30 days on 12-02: x, y, percent, onTime', () => pick(summary(gym, 'last30', LATER), ['x', 'y', 'percent', 'onTime']), { x: 6, y: 13, percent: 46, onTime: 5 }],
  ['Last 30 days on 12-02: timing mean', () => summary(gym, 'last30', LATER).timing.mean, 12],
  ['Last 30 days on 12-02: from', () => summary(gym, 'last30', LATER).from, '2026-11-03'],
  ['All time on 12-02: x, y, percent', () => pick(summary(gym, 'all', LATER), ['x', 'y', 'percent']), { x: 7, y: 14, percent: 50 }],

  // Weekly and series
  ['weeklyRates Gym', () => weeklyRates(gym, COMPLETIONS, null, LAST_DAY), [
    { weekStart: '2026-11-02', label: '2 Nov', x: 3, y: 3, percent: 100 },
    { weekStart: '2026-11-09', label: '9 Nov', x: 2, y: 4, percent: 50 },
    { weekStart: '2026-11-16', label: '16 Nov', x: 2, y: 2, percent: 100 },
  ]],
  ['weeklyRates: a range starting mid-week counts only from there', () => weeklyRates(gym, COMPLETIONS, '2026-11-05', LAST_DAY)[0],
    { weekStart: '2026-11-02', label: '2 Nov', x: 1, y: 1, percent: 100 }],
  ['weeklyRates: a week with no scheduled days is a gap', () => weeklyRates(dentist, COMPLETIONS, null, LAST_DAY).map((w) => w.percent), [null, null, null]],
  ['weeklyRates: nothing before the first active day', () => weeklyRates(gym, COMPLETIONS, null, '2026-11-01'), []],
  ['deviationSeries Gym: dates', () => deviationSeries(gym, COMPLETIONS, null, LAST_DAY).map((d) => d.date),
    ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-10', '2026-11-11', '2026-11-18']],
  ['deviationSeries Gym: minutes', () => deviationSeries(gym, COMPLETIONS, null, LAST_DAY).map((d) => d.min), [0, 15, -10, 30, 5, 20]],
  ['deviationSeries Gym: labels', () => deviationSeries(gym, COMPLETIONS, null, LAST_DAY)[0].label, '2 Nov'],
  ['deviationSeries follows the range', () => deviationSeries(gym, COMPLETIONS, '2026-11-11', LAST_DAY).map((d) => d.min), [5, 20]],

  // Model
  ['analysisModel: active order', () => model().active.map((e) => e.habit.name), ['Gym', 'Dentist', 'Walk']],
  ['analysisModel: discontinued', () => model().discontinued.map((e) => e.habit.name), ['Read']],
  ['overviewBars: only active habits with a scheduled day', () => overviewBars(model()), [
    { name: 'Gym', colour: '#e5484d', percent: 78 },
    { name: 'Walk', colour: '#8e4ec6', percent: 0 },
  ]],

  // Text
  ['percentLine Gym', () => percentLine(summary(gym)), '7 of 9 scheduled days'],
  ['countsLine Gym', () => countsLine(summary(gym)), 'On time 6 · Late 1 · Missed 2 · Extra 1'],
  ['timingLine Gym', () => timingLine(summary(gym).timing), 'Timing: average 10 min late, spread ± 13 min'],
  ['lateLine Gym', () => lateLine(summary(gym).lateTiming), 'Late: 1, average 1 d 1 h late'],
  ['streakLine Gym', () => streakLine(summary(gym)), 'Streak 2 · Best 3'],
  ['timingLine Read', () => timingLine(summary(read).timing), 'Timing: average 5 min early, spread ± 5 min'],
  ['lateLine Read', () => lateLine(summary(read).lateTiming), 'Late: 1, average 12 h 30 min late'],
  ['streakLine Read', () => streakLine(summary(read)), 'Best streak 2'],
  ['lateLine with no late completions', () => lateLine(summary(walk).lateTiming), ''],
  ['timingLine with one value', () => timingLine({ n: 1, mean: 10, spread: null }), 'Timing: 10 min late (1 completion)'],
  ['timingLine with none', () => timingLine({ n: 0, mean: null, spread: null }), 'No on-time completions yet.'],
  ['timingLine: an average that rounds to 0', () => timingLine({ n: 2, mean: 0.4, spread: 3 }), 'Timing: average on time, spread ± 3 min'],
  ['timingLine: a small negative average is still on time', () => timingLine({ n: 2, mean: -0.4, spread: 3 }), 'Timing: average on time, spread ± 3 min'],
  ['timingLine: one value exactly on time', () => timingLine({ n: 1, mean: 0, spread: null }), 'Timing: on time (1 completion)'],
  ['shortDate', () => shortDate('2026-11-02'), '2 Nov'],

  // Inputs
  ['The inputs are unchanged after every call', () => {
    const before = JSON.stringify([HABITS, COMPLETIONS]);
    analysisModel(HABITS, COMPLETIONS, 'all', TODAY);
    analysisModel(HABITS, COMPLETIONS, 'last30', TODAY);
    for (const habit of HABITS) {
      streaks(habit, COMPLETIONS, LAST_DAY);
      weeklyRates(habit, COMPLETIONS, null, LAST_DAY);
      deviationSeries(habit, COMPLETIONS, null, LAST_DAY);
    }
    return JSON.stringify([HABITS, COMPLETIONS]) === before;
  }, true],
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
  const summaryLine = document.getElementById('analysis-summary');
  summaryLine.textContent = total;
  summaryLine.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('analysis-results');
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

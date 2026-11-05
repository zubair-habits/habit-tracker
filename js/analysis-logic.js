// Analysis figures as pure functions (docs/modules/module-5.md).
// No database, no page access and no Chart.js, so everything here can be tested on
// its own. "today" and dates are "YYYY-MM-DD" strings, passed in. Whether a day is
// scheduled is answered only by isScheduled, and X and Y only by countDays.
import { formatDeviation } from './calendar-logic.js';
import { addDays, isoWeekday, parseDateStr } from './dates.js';
import { countDays, lastCountedDay } from './habit-logic.js';
import { isScheduled } from './schedule.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const RANGES = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

// The first day of the range, or null for All time.
export function rangeStart(rangeKey, today) {
  if (rangeKey === 'last30') return addDays(today, -29);
  if (rangeKey === 'month') return `${today.slice(0, 7)}-01`;
  return null;
}

// Scheduled or extra is decided here, never by the stored "extra" flag.
export function isScheduledCompletion(habit, c) {
  return isScheduled(habit, c.date);
}

// spread is the population standard deviation. Nothing is rounded here.
export function meanAndSpread(values) {
  const n = values.length;
  if (n === 0) return { n, mean: null, spread: null };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  if (n < 2) return { n, mean, spread: null };
  const squares = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return { n, mean, spread: Math.sqrt(squares / n) };
}

function firstActiveDay(habit) {
  return habit.activePeriods.map((p) => p.start).sort()[0] ?? null;
}

function completionsOf(habit, completions) {
  return completions.filter((c) => c.habitId === habit.id);
}

function inRange(date, from, to) {
  return (from === null || from <= date) && date <= to;
}

// Consecutive scheduled days completed, skipping unscheduled days. Always all-time.
export function streaks(habit, completions, lastDay) {
  const first = firstActiveDay(habit);
  if (first === null) return { current: 0, best: 0 };

  const done = new Set(completionsOf(habit, completions).map((c) => c.date));
  let current = 0;
  let best = 0;
  for (let date = first; date <= lastDay; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) {
      current = done.has(date) ? current + 1 : 0;
      if (current > best) best = current;
    }
  }
  return { current, best };
}

export function habitSummary(habit, completions, rangeKey, today) {
  const from = rangeStart(rangeKey, today);
  const lastDay = lastCountedDay(habit, completions, today);
  const { x, y } = countDays(habit, completions, lastDay, from);
  const own = completionsOf(habit, completions);

  const scheduled = own.filter((c) => isScheduledCompletion(habit, c) && inRange(c.date, from, lastDay));
  const onTime = scheduled.filter((c) => !c.late);
  const late = scheduled.filter((c) => c.late);
  const extra = own.filter((c) => !isScheduledCompletion(habit, c) && inRange(c.date, from, today));
  const { current, best } = streaks(habit, completions, lastDay);

  return {
    habitId: habit.id,
    lastDay,
    from,
    x,
    y,
    percent: y === 0 ? null : Math.round((100 * x) / y),
    missed: y - x,
    onTime: onTime.length,
    late: late.length,
    extra: extra.length,
    timing: meanAndSpread(onTime.map((c) => c.deviationMin)),
    lateTiming: meanAndSpread(late.map((c) => c.deviationMin)),
    currentStreak: habit.status === 'discontinued' ? null : current,
    bestStreak: best,
  };
}

// "2026-11-02" -> "2 Nov".
export function shortDate(date) {
  const parsed = parseDateStr(date);
  return `${parsed.getDate()} ${MONTHS[parsed.getMonth()]}`;
}

// One entry per Monday-start week, from the first counted day to lastDay. A week
// with no scheduled days has percent null, so the chart leaves a gap.
export function weeklyRates(habit, completions, from, lastDay) {
  const active = firstActiveDay(habit);
  if (active === null) return [];
  const first = from !== null && from > active ? from : active;

  const weeks = [];
  let weekStart = addDays(first, 1 - isoWeekday(first));
  while (weekStart <= lastDay) {
    const weekEnd = addDays(weekStart, 6);
    const { x, y } = countDays(
      habit,
      completions,
      weekEnd < lastDay ? weekEnd : lastDay,
      weekStart > first ? weekStart : first
    );
    weeks.push({
      weekStart,
      label: shortDate(weekStart),
      x,
      y,
      percent: y === 0 ? null : Math.round((100 * x) / y),
    });
    weekStart = addDays(weekStart, 7);
  }
  return weeks;
}

// The deviations of on-time scheduled completions, in date order.
export function deviationSeries(habit, completions, from, lastDay) {
  return completionsOf(habit, completions)
    .filter((c) => isScheduledCompletion(habit, c) && !c.late && inRange(c.date, from, lastDay))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((c) => ({ date: c.date, label: shortDate(c.date), min: c.deviationMin }));
}

export function analysisModel(habits, completions, rangeKey, today) {
  const entries = [...habits]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((habit) => ({ habit, summary: habitSummary(habit, completions, rangeKey, today) }));
  return {
    active: entries.filter((e) => e.habit.status !== 'discontinued'),
    discontinued: entries.filter((e) => e.habit.status === 'discontinued'),
  };
}

// The Overview chart's bars: active habits with at least one scheduled day.
export function overviewBars(model) {
  return model.active
    .filter((e) => e.summary.y > 0)
    .map((e) => ({ name: e.habit.name, colour: e.habit.colour, percent: e.summary.percent }));
}

export function percentLine(summary) {
  if (summary.y === 0) return 'No scheduled days in this range.';
  return `${summary.x} of ${summary.y} scheduled days`;
}

export function countsLine(summary) {
  return `On time ${summary.onTime} · Late ${summary.late} · Missed ${summary.missed} · Extra ${summary.extra}`;
}

function roundedDeviation(mean) {
  const min = Math.round(mean);
  return min === 0 ? 'on time' : formatDeviation(min);
}

export function timingLine(timing) {
  if (timing.n === 0) return 'No on-time completions yet.';
  if (timing.n === 1) return `Timing: ${roundedDeviation(timing.mean)} (1 completion)`;
  return `Timing: average ${roundedDeviation(timing.mean)}, spread ± ${Math.round(timing.spread)} min`;
}

export function lateLine(lateTiming) {
  if (lateTiming.n === 0) return '';
  return `Late: ${lateTiming.n}, average ${roundedDeviation(lateTiming.mean)}`;
}

export function streakLine(summary) {
  if (summary.currentStreak === null) return `Best streak ${summary.bestStreak}`;
  return `Streak ${summary.currentStreak} · Best ${summary.bestStreak}`;
}

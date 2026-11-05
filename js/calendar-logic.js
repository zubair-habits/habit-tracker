// Calendar and completion rules as pure functions (docs/modules/module-3.md).
// No database and no page access, so everything here can be tested on its own.
// "today" and dates are "YYYY-MM-DD" strings and "nowMs" is a number, all passed in.
import { addDays, isoWeekday, toDateStr } from './dates.js';
import { isScheduled } from './schedule.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const LATE_AFTER_MIN = 720; // 12 hours

function pad2(n) {
  return String(n).padStart(2, '0');
}

// A list of weeks; each is 7 entries, a date string or null, Monday first.
export function monthGrid(year, month) {
  const first = toDateStr(new Date(year, month - 1, 1));
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = Array(isoWeekday(first) - 1).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function addMonths(year, month, n) {
  const date = new Date(year, month - 1 + n, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function monthTitle(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// The last version with "from" on or before the date, or null if there is none.
// Unlike currentVersion in habit-logic.js, it never falls back to a later version.
export function versionOn(habit, date) {
  for (let i = habit.schedule.length - 1; i >= 0; i--) {
    if (habit.schedule[i].from <= date) return habit.schedule[i];
  }
  return null;
}

export function inActivePeriod(habit, date) {
  return habit.activePeriods.some((p) => p.start <= date && (p.end === null || date <= p.end));
}

// The date at the set time, in local time.
export function intendedMs(date, setTime) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = setTime.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

function completionOf(habit, completions, date) {
  return completions.find((c) => c.habitId === habit.id && c.date === date) ?? null;
}

// null if a completion is allowed, otherwise the reason it is not.
export function canMark(habit, completions, date, today) {
  if (date > today) return "Future days can't be marked.";
  if (!inActivePeriod(habit, date)) return "This habit wasn't active on that day.";
  if (completionOf(habit, completions, date)) return 'Already completed.';
  return null;
}

// The row to store. The set time is the one in effect on the completion's date, so
// editing the habit later never rewrites this deviation (CLAUDE.md section 10).
export function buildCompletion(habit, date, nowMs) {
  const { setTime } = versionOn(habit, date);
  // "+ 0" turns the -0 that rounding can produce into a plain 0.
  const deviationMin = Math.round((nowMs - intendedMs(date, setTime)) / 60000) + 0;
  return {
    habitId: habit.id,
    date,
    setTime,
    completedAt: nowMs,
    deviationMin,
    late: deviationMin > LATE_AFTER_MIN,
    extra: !isScheduled(habit, date),
  };
}

export function formatDeviation(min) {
  if (min === 0) return 'On time';
  const word = min > 0 ? 'late' : 'early';
  const abs = Math.abs(min);
  if (abs < 60) return `${abs} min ${word}`;
  if (abs < 1440) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `${h} h ${word}` : `${h} h ${m} min ${word}`;
  }
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  return h === 0 ? `${d} d ${word}` : `${d} d ${h} h ${word}`;
}

// Local "HH:MM", 24-hour.
export function formatClock(ms) {
  const date = new Date(ms);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function oldestFirst(habits) {
  return [...habits].sort((a, b) => a.createdAt - b.createdAt);
}

function dotState(scheduled, completion, date, today) {
  if (completion) return scheduled ? 'done' : 'extra';
  if (date === today) return 'due';
  return date < today ? 'missed' : 'upcoming';
}

// One dot per habit that appears on the day: scheduled, or completed as an extra.
export function dayDots(habits, completions, date, today) {
  const dots = [];
  for (const habit of oldestFirst(habits)) {
    const scheduled = isScheduled(habit, date);
    const completion = completionOf(habit, completions, date);
    if (scheduled || completion) {
      dots.push({ habitId: habit.id, colour: habit.colour, state: dotState(scheduled, completion, date, today) });
    }
  }
  return dots;
}

// What the day sheet shows. "setTime" is what the row displays: the one copied onto
// the completion if there is one, otherwise the one in effect on the date.
export function dayEntries(habits, completions, date, today) {
  const result = { scheduled: [], extras: [], extraCandidates: [], future: date > today };
  for (const habit of oldestFirst(habits)) {
    const completion = completionOf(habit, completions, date);
    const entry = {
      habit,
      completion,
      canMark: canMark(habit, completions, date, today),
      setTime: completion ? completion.setTime : versionOn(habit, date)?.setTime ?? null,
    };
    if (isScheduled(habit, date)) result.scheduled.push(entry);
    else if (completion) result.extras.push(entry);
    else if (inActivePeriod(habit, date)) result.extraCandidates.push(entry);
  }
  return result;
}

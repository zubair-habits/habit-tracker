// Habit rules as pure functions (docs/modules/module-2.md).
// No database and no page access, so everything here can be tested on its own.
// Every function returns new objects and never changes its arguments.
// "today" is always passed in as a "YYYY-MM-DD" string.
import { isScheduled } from './schedule.js';
import { addDays, isoWeekday, parseDateStr, toDateStr } from './dates.js';

export const PALETTE = [
  { name: 'Red', value: '#e5484d' },
  { name: 'Orange', value: '#f76b15' },
  { name: 'Amber', value: '#ffb224' },
  { name: 'Green', value: '#30a46c' },
  { name: 'Teal', value: '#12a594' },
  { name: 'Blue', value: '#0090ff' },
  { name: 'Indigo', value: '#3e63dd' },
  { name: 'Purple', value: '#8e4ec6' },
  { name: 'Pink', value: '#d6409f' },
  { name: 'Brown', value: '#ad7f58' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_NAME = 40;

// Used only for comparing names; the stored name keeps the owner's spelling.
export function normaliseName(name) {
  return String(name).trim().toLowerCase();
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  // A date like 2026-02-31 rolls over to March, so it comes back different.
  return toDateStr(parseDateStr(str)) === str;
}

// Returns a list of error messages; empty means valid.
// options.existingDate: the date a one-time habit already has. When editing, it
// is accepted even if it has passed, so an old one-time habit can still be renamed.
export function validateInput(input, today, options = {}) {
  const errors = [];

  const name = String(input.name ?? '').trim();
  if (name.length < 1 || name.length > MAX_NAME) {
    errors.push(`Name must be 1 to ${MAX_NAME} characters.`);
  }

  if (!PALETTE.some((c) => c.value === input.colour)) {
    errors.push('Choose a colour.');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.setTime ?? ''))) {
    errors.push('Choose a set time.');
  }

  if (input.repeat) {
    const days = Array.isArray(input.days) ? input.days : [];
    const inRange = days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    if (days.length < 1 || days.length > 7 || !inRange || new Set(days).size !== days.length) {
      errors.push('Tick at least one day of the week.');
    }
  } else if (!isValidDate(input.date)) {
    errors.push('Choose a date.');
  } else if (input.date < today && input.date !== options.existingDate) {
    errors.push('The date must be today or later.');
  }

  return errors;
}

export function scheduleFromInput(input, today) {
  return {
    from: today,
    repeat: Boolean(input.repeat),
    days: input.repeat ? [...input.days].sort((a, b) => a - b) : [],
    date: input.repeat ? null : input.date,
    setTime: input.setTime,
  };
}

// The version in effect today: the last one whose "from" is on or before today,
// otherwise the last in the list.
export function currentVersion(habit, today) {
  for (let i = habit.schedule.length - 1; i >= 0; i--) {
    if (habit.schedule[i].from <= today) return habit.schedule[i];
  }
  return habit.schedule[habit.schedule.length - 1];
}

// Compares everything except "from".
export function sameSchedule(a, b) {
  return a.repeat === b.repeat
    && a.date === b.date
    && a.setTime === b.setTime
    && a.days.length === b.days.length
    && a.days.every((d, i) => d === b.days[i]);
}

export function buildNewHabit(input, today, id, nowMs) {
  return {
    id,
    name: input.name.trim(),
    colour: input.colour,
    status: 'active',
    createdAt: nowMs,
    activePeriods: [{ start: today, end: null }],
    schedule: [scheduleFromInput(input, today)],
  };
}

// Name and colour are replaced directly. A schedule version from today is added
// only if the schedule really changed. Earlier versions are never touched.
export function applyEdit(habit, input, today) {
  const next = scheduleFromInput(input, today);
  const changed = !sameSchedule(currentVersion(habit, today), next);
  return {
    ...habit,
    name: input.name.trim(),
    colour: input.colour,
    schedule: changed ? [...habit.schedule, next] : [...habit.schedule],
  };
}

function hasNonExtraCompletion(habit, completions, date) {
  return completions.some((c) => c.habitId === habit.id && c.date === date && !c.extra);
}

// The last day a discontinued habit counts: today only if it was completed today,
// so the day a habit is removed is never counted as missed.
export function lastCountedDay(habit, completions, today) {
  return hasNonExtraCompletion(habit, completions, today) ? today : addDays(today, -1);
}

// y = scheduled days up to lastDay; x = those with a non-extra completion.
export function countDays(habit, completions, lastDay) {
  let x = 0;
  let y = 0;
  if (habit.activePeriods.length === 0) return { x, y };

  const done = new Set(
    completions.filter((c) => c.habitId === habit.id && !c.extra).map((c) => c.date)
  );
  const first = habit.activePeriods.map((p) => p.start).sort()[0];
  for (let date = first; date <= lastDay; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) {
      y += 1;
      if (done.has(date)) x += 1;
    }
  }
  return { x, y };
}

export function discontinueMessage({ x, y }) {
  if (y === 0) return 'This habit has had no scheduled days yet. Are you sure you want to remove it?';
  const z = Math.round((100 * x) / y);
  return `You have continued with this habit for ${x} days out of ${y} days (${z}%). Are you sure you want to remove this habit?`;
}

export function applyDiscontinue(habit, completions, today) {
  const end = lastCountedDay(habit, completions, today);
  return {
    ...habit,
    status: 'discontinued',
    activePeriods: habit.activePeriods.map((p) => (p.end === null ? { ...p, end } : { ...p })),
  };
}

// If the last period ended yesterday or later, the habit simply continues with
// no missed gap. Otherwise a new period starts today. A version is always added,
// so the restart is visible in the history.
export function applyRestart(habit, input, today) {
  const periods = habit.activePeriods.map((p) => ({ ...p }));
  const last = periods[periods.length - 1];
  if (last && (last.end === null || last.end >= addDays(today, -1))) {
    last.end = null;
  } else {
    periods.push({ start: today, end: null });
  }
  return {
    ...habit,
    status: 'active',
    name: input.name.trim(),
    colour: input.colour,
    activePeriods: periods,
    schedule: [...habit.schedule, scheduleFromInput(input, today)],
  };
}

export function findByName(habits, name) {
  const wanted = normaliseName(name);
  const matches = habits.filter((h) => normaliseName(h.name) === wanted);
  return {
    active: matches.find((h) => h.status === 'active') ?? null,
    discontinued: matches.filter((h) => h.status === 'discontinued'),
  };
}

// The habit whose last period ended latest. There is no "discontinued at" field,
// so ties go to the habit created later.
export function mostRecentlyDiscontinued(habits) {
  const lastEnd = (h) => h.activePeriods[h.activePeriods.length - 1]?.end ?? '';
  return [...habits].sort((a, b) => {
    if (lastEnd(a) !== lastEnd(b)) return lastEnd(a) < lastEnd(b) ? 1 : -1;
    return b.createdAt - a.createdAt;
  })[0] ?? null;
}

export function firstFreeColour(habits) {
  const used = new Set(habits.filter((h) => h.status === 'active').map((h) => h.colour));
  const free = PALETTE.find((c) => !used.has(c.value));
  return (free ?? PALETTE[0]).value;
}

// "2026-10-20" -> "Tue 20 Oct 2026".
export function formatDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return `${WEEKDAYS[isoWeekday(str) - 1]} ${d} ${MONTHS[m - 1]} ${y}`;
}

export function describeSchedule(version) {
  if (!version.repeat) return `Once · ${formatDate(version.date)} · ${version.setTime}`;
  if (version.days.length === 7) return `Every day · ${version.setTime}`;
  const names = [...version.days].sort((a, b) => a - b).map((d) => WEEKDAYS[d - 1]);
  return `${names.join(', ')} · ${version.setTime}`;
}

// The text of the read-only History section.
export function describeHistory(habit) {
  return {
    periods: habit.activePeriods.map((p) => {
      if (p.end !== null && p.end < p.start) return 'Removed on the day it was added';
      return `${formatDate(p.start)} to ${p.end === null ? 'now' : formatDate(p.end)}`;
    }),
    versions: habit.schedule.map((v) => `From ${formatDate(v.from)}: ${describeSchedule(v)}`),
  };
}

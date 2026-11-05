// The figures and page geometry behind the Yearly PDF (docs/modules/module-6.md).
// Pure functions: no database, no page or canvas access. Day states come only from
// dayDots, and counts only from countDays and lastCountedDay.
import { dayDots } from './calendar-logic.js';
import { addDays, isoWeekday } from './dates.js';
import { countDays, formatDate, lastCountedDay } from './habit-logic.js';
import { isScheduled } from './schedule.js';

export const MAX_HABITS = 10;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Page geometry in millimetres (decision 4).
const USABLE_WIDTH = 267;
const USABLE_HEIGHT = 166;
const WIDEST_YEAR = 54; // columns; every year uses this width, so the look never changes
const GRID_LEFT = 20;
const MONTH_ROW_Y = 26;
const CELLS_PER_HABIT = 9; // 1.5 heading line, 7 grid, 0.5 gap

const firstDay = (year) => `${year}-01-01`;
const lastDay = (year) => `${year}-12-31`;
const yearOf = (date) => Number(date.slice(0, 4));
const oldestFirst = (habits) => [...habits].sort((a, b) => a.createdAt - b.createdAt);

// A list of columns, one per Monday-start week. Each is 7 entries, Monday first: a
// date string, or null for a day outside the year.
export function yearWeeks(year) {
  const weeks = [];
  const start = firstDay(year);
  const last = lastDay(year);
  for (let monday = addDays(start, 1 - isoWeekday(start)); monday <= last; monday = addDays(monday, 7)) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const date = addDays(monday, i);
      week.push(date >= start && date <= last ? date : null);
    }
    weeks.push(week);
  }
  return weeks;
}

// Each month's name and the column that holds its 1st.
export function monthLabels(year) {
  const weeks = yearWeeks(year);
  return MONTHS.map((label, index) => {
    const first = `${year}-${String(index + 1).padStart(2, '0')}-01`;
    return { col: weeks.findIndex((week) => week.includes(first)), label };
  });
}

// Newest first, from the earliest active-period start of any habit to today's year.
export function yearOptions(habits, today) {
  const todayYear = yearOf(today);
  const starts = habits.flatMap((h) => h.activePeriods.map((p) => yearOf(p.start)));
  const earliest = Math.min(todayYear, ...starts);
  const years = [];
  for (let year = todayYear; year >= earliest; year -= 1) years.push(year);
  return years;
}

function isScheduledInYear(habit, year) {
  const last = lastDay(year);
  for (let date = firstDay(year); date <= last; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) return true;
  }
  return false;
}

// The habits with a scheduled day or a completion in the year, oldest first.
export function habitsForYear(habits, completions, year) {
  const withCompletion = new Set(
    completions.filter((c) => yearOf(c.date) === year).map((c) => c.habitId)
  );
  return oldestFirst(habits).filter((h) => withCompletion.has(h.id) || isScheduledInYear(h, year));
}

// That year's figures (decision 6): the same count Analysis gives for the same days.
export function yearFigures(habit, completions, year, today) {
  const first = firstDay(year);
  const counted = lastCountedDay(habit, completions, today);
  const last = counted < lastDay(year) ? counted : lastDay(year);
  const { x, y } = last < first ? { x: 0, y: 0 } : countDays(habit, completions, last, first);
  return { x, y, percent: y === 0 ? null : Math.round((100 * x) / y) };
}

// The state from decision 3: done, extra, due, missed, upcoming, or null.
export function dayMark(habit, completions, date, today) {
  return dayDots([habit], completions, date, today)[0]?.state ?? null;
}

// The decision 4 geometry for n ticked habits, or null if n is not allowed.
export function pageLayout(n) {
  if (n < 1 || n > MAX_HABITS) return null;
  const cell = Math.min(USABLE_WIDTH / WIDEST_YEAR, USABLE_HEIGHT / (1 + CELLS_PER_HABIT * n));
  const stripY = [];
  for (let i = 0; i < n; i += 1) stripY.push(MONTH_ROW_Y + cell * (1 + CELLS_PER_HABIT * i));
  return {
    cell,
    left: GRID_LEFT,
    monthRowY: MONTH_ROW_Y,
    stripY,
    fontSize: Math.min(4, Math.max(2.2, 1.1 * cell)),
    dot: 0.7 * cell,
    ring: 0.12 * cell,
  };
}

// The heading beside the colour dot. It always starts with the habit's whole name.
export function headingText(habit, { x, y, percent }) {
  const figures = y === 0 ? 'no scheduled days yet' : `${percent}% · ${x} of ${y} scheduled days`;
  const ending = habit.status === 'discontinued' ? ' · discontinued' : '';
  return `${habit.name} · ${figures}${ending}`;
}

function yearMarks(habit, completions, weeks, today) {
  const marks = {};
  for (const week of weeks) {
    for (const date of week) {
      if (date) marks[date] = dayMark(habit, completions, date, today);
    }
  }
  return marks;
}

// Everything drawYear needs, or { error } with the message the card shows.
export function pageModel(habits, completions, year, ticked, today) {
  const available = habitsForYear(habits, completions, year);
  if (available.length === 0) return { error: `No habits in ${year}.` };
  if (ticked.length > MAX_HABITS) return { error: `Choose at most ${MAX_HABITS} habits for one page.` };
  const chosen = available.filter((h) => ticked.includes(h.id));
  if (chosen.length === 0) return { error: 'Tick at least one habit.' };

  const weeks = yearWeeks(year);
  const strips = chosen.map((habit) => {
    // Only this habit's rows in this year, so years of data can't slow all 365 days.
    const own = completions.filter((c) => c.habitId === habit.id);
    const ownInYear = own.filter((c) => yearOf(c.date) === year);
    return {
      habit,
      heading: headingText(habit, yearFigures(habit, own, year, today)),
      marks: yearMarks(habit, ownInYear, weeks, today),
    };
  });
  return {
    year,
    title: `Habit Tracker · ${year}`,
    madeLine: `Made ${formatDate(today)}`,
    layout: pageLayout(chosen.length),
    weeks,
    months: monthLabels(year),
    strips,
  };
}

export function pdfFileName(year) {
  return `habit-year-${year}.pdf`;
}

// The Main view: the month calendar and the day sheet (docs/modules/module-3.md).
// Names are always written with textContent, never as HTML.
import { refreshAbout } from './about.js';
import {
  addMonths, dayDots, dayEntries, formatClock, formatDeviation, monthGrid, monthTitle,
} from './calendar-logic.js';
import { completionsBetween, markCompleted, undoCompletion } from './completions.js';
import { parseDateStr, todayStr } from './dates.js';
import { confirmDialog } from './dialog.js';
import { formatDate } from './habit-logic.js';
import { listHabits } from './habits.js';
import { onViewShown } from './views.js';

const MAX_DOTS = 6;

const el = (id) => document.getElementById(id);

const shown = { year: 0, month: 0 };
let sheetDate = null;
let busy = false;
let renderCount = 0;

// ---------- The month grid ----------

function dotElement({ colour, state }) {
  const dot = document.createElement('span');
  dot.className = `cal-dot cal-dot-${state}`;
  dot.style.color = colour;
  return dot;
}

function dayCell(date, dots, today) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = date === today ? 'cal-day cal-today' : 'cal-day';
  cell.dataset.date = date;
  const habitCount = dots.length === 1 ? '1 habit' : `${dots.length} habits`;
  cell.setAttribute('aria-label', `${formatDate(date)}${date === today ? ', today' : ''}, ${habitCount}`);
  if (date === today) cell.setAttribute('aria-current', 'date');

  const number = document.createElement('span');
  number.className = 'cal-number';
  number.textContent = parseDateStr(date).getDate();

  const area = document.createElement('span');
  area.className = 'cal-dots';
  const overflow = dots.length > MAX_DOTS;
  const drawn = overflow ? dots.slice(0, MAX_DOTS - 1) : dots;
  area.append(...drawn.map(dotElement));
  if (overflow) {
    const more = document.createElement('span');
    more.className = 'cal-more';
    more.textContent = `+${dots.length - drawn.length}`;
    area.append(more);
  }

  cell.append(number, area);
  return cell;
}

async function renderCalendar() {
  const render = ++renderCount;
  const today = todayStr();
  const { year, month } = shown;
  const weeks = monthGrid(year, month);
  const dates = weeks.flat().filter(Boolean);

  const [habits, completions] = await Promise.all([
    listHabits(),
    completionsBetween(dates[0], dates[dates.length - 1]),
  ]);
  if (render !== renderCount) return; // a newer render has started

  el('cal-note').hidden = habits.some((h) => h.status === 'active');
  el('cal-title').textContent = monthTitle(year, month);
  el('cal-grid').replaceChildren(...weeks.flat().map((date) => {
    if (date === null) {
      const blank = document.createElement('span');
      blank.className = 'cal-blank';
      return blank;
    }
    return dayCell(date, dayDots(habits, completions, date, today), today);
  }));
}

function showMonth({ year, month }) {
  shown.year = year;
  shown.month = month;
  return renderCalendar();
}

function showCurrentMonth() {
  const [year, month] = todayStr().split('-').map(Number);
  return showMonth({ year, month });
}

// ---------- The day sheet ----------

function showSheetError(message) {
  el('day-error').textContent = message;
  el('day-error').hidden = !message;
}

function resultText(completion, extra) {
  const parts = [
    `Completed ${formatClock(completion.completedAt)}`,
    formatDeviation(completion.deviationMin),
  ];
  if (completion.late) parts.push('Late');
  if (extra) parts.push('Extra');
  return parts.join(' · ');
}

function dayRow(entry, date, { extra }) {
  const { habit, completion, setTime } = entry;

  const row = document.createElement('li');
  row.className = 'day-row';
  row.dataset.habit = habit.name;

  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = habit.colour;

  const text = document.createElement('span');
  text.className = 'habit-text';
  const name = document.createElement('span');
  name.className = 'habit-name';
  name.textContent = habit.name;
  const time = document.createElement('span');
  time.className = 'habit-schedule';
  time.textContent = setTime ? `Set time ${setTime}` : '';
  text.append(name, time);
  if (completion) {
    const result = document.createElement('span');
    result.className = 'day-result';
    result.textContent = resultText(completion, extra);
    text.append(result);
  }

  row.append(dot, text);

  if (completion) {
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'secondary';
    undo.textContent = 'Undo';
    undo.addEventListener('click', () => onUndo(habit, completion));
    row.append(undo);
  } else if (entry.canMark === null) {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'primary';
    mark.textContent = 'Completed';
    mark.addEventListener('click', () => onMark(habit, date));
    row.append(mark);
  }
  return row;
}

function rowList(entries, date, options) {
  const list = document.createElement('ul');
  list.className = 'day-list';
  list.append(...entries.map((entry) => dayRow(entry, date, options)));
  return list;
}

function heading(text) {
  const h3 = document.createElement('h3');
  h3.textContent = text;
  return h3;
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'placeholder';
  p.textContent = text;
  return p;
}

async function renderSheet() {
  if (sheetDate === null) return;
  const date = sheetDate;
  const today = todayStr();
  const [habits, completions] = await Promise.all([listHabits(), completionsBetween(date, date)]);
  const entries = dayEntries(habits, completions, date, today);

  const parts = [];
  if (entries.scheduled.length > 0) {
    parts.push(heading('Scheduled'), rowList(entries.scheduled, date, { extra: false }));
  }
  if (entries.extras.length > 0) {
    parts.push(
      heading(date === today ? 'Also done today' : 'Also done on this day'),
      rowList(entries.extras, date, { extra: true })
    );
  }
  if (!entries.future && entries.extraCandidates.length > 0) {
    const details = document.createElement('details');
    details.className = 'day-extras';
    const summary = document.createElement('summary');
    summary.textContent = 'Mark an extra';
    details.append(summary, rowList(entries.extraCandidates, date, { extra: true }));
    parts.push(details);
  }
  if (parts.length === 0) parts.push(note('Nothing scheduled on this day.'));
  if (entries.future) parts.push(note("Future days can't be marked yet."));

  el('day-title').textContent = formatDate(date);
  el('day-body').replaceChildren(...parts);
}

async function openSheet(date) {
  const sheet = el('day-sheet');
  if (sheet.open) return;
  sheetDate = date;
  showSheetError('');
  await renderSheet();
  sheet.showModal();
}

// Runs one write, then redraws everything it affects. Refusals appear in the sheet.
async function write(fn) {
  if (busy) return;
  busy = true;
  showSheetError('');
  try {
    await fn();
  } catch (err) {
    console.error(err);
    showSheetError(err.message || 'Could not save.');
  } finally {
    busy = false;
  }
  try {
    await Promise.all([renderCalendar(), renderSheet()]);
    await refreshAbout();
  } catch (err) {
    console.error(err);
  }
}

function onMark(habit, date) {
  return write(() => markCompleted(habit.id, date));
}

function onUndo(habit, completion) {
  return write(async () => {
    const yes = await confirmDialog({
      title: 'Undo completion?',
      message: `${habit.name}, ${formatDate(completion.date)}, completed at ${formatClock(completion.completedAt)}. Remove this completion?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true,
    });
    if (yes) await undoCompletion(habit.id, completion.date);
  });
}

// ---------- Start-up ----------

export async function initCalendarView() {
  el('cal-prev').addEventListener('click', () => {
    showMonth(addMonths(shown.year, shown.month, -1)).catch((err) => console.error(err));
  });
  el('cal-next').addEventListener('click', () => {
    showMonth(addMonths(shown.year, shown.month, 1)).catch((err) => console.error(err));
  });
  el('cal-today').addEventListener('click', () => {
    showCurrentMonth().catch((err) => console.error(err));
  });
  el('cal-grid').addEventListener('click', (event) => {
    const cell = event.target.closest('[data-date]');
    if (cell) openSheet(cell.dataset.date).catch((err) => console.error(err));
  });
  el('day-close').addEventListener('click', () => el('day-sheet').close());
  el('day-sheet').addEventListener('close', () => {
    sheetDate = null;
  });

  onViewShown((view) => {
    if (view === 'main') renderCalendar().catch((err) => console.error(err));
  });

  // Today may have changed while the app was away. The shown month stays as it is.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    Promise.all([renderCalendar(), renderSheet()]).catch((err) => console.error(err));
  });

  await showCurrentMonth();
}

// The Habits view: the list, the add/edit/restart form, and the discontinued list.
// Names are always written with textContent, never as HTML.
import { refreshAbout } from './about.js';
import { todayStr } from './dates.js';
import { choiceDialog, closeAllDialogs, confirmDialog } from './dialog.js';
import {
  PALETTE, currentVersion, describeHistory, describeSchedule, findByName, firstFreeColour,
  mostRecentlyDiscontinued, normaliseName, validateInput,
} from './habit-logic.js';
import {
  addHabit, daysOfHistory, discontinueHabit, discontinuePreview, editHabit, listHabits, restartHabit,
} from './habits.js';
import { onViewShown } from './views.js';

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const el = (id) => document.getElementById(id);

// The open form: mode is 'add', 'edit' or 'restart'; target is the habit being
// edited or restarted; declinedName is a name the owner chose "Start a new record"
// for, which stays refused until they type a different one.
const form = { mode: 'add', target: null, colour: PALETTE[0].value, days: new Set(), declinedName: null };
let busy = false;

// ---------- The list ----------

function habitRow(habit, today, onTap) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'habit-row';
  button.addEventListener('click', onTap);

  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = habit.colour;

  const text = document.createElement('span');
  text.className = 'habit-text';
  const name = document.createElement('span');
  name.className = 'habit-name';
  name.textContent = habit.name;
  const schedule = document.createElement('span');
  schedule.className = 'habit-schedule';
  schedule.textContent = describeSchedule(currentVersion(habit, today));
  text.append(name, schedule);

  button.append(dot, text);
  li.append(button);
  return li;
}

async function renderList() {
  const today = todayStr();
  const habits = await listHabits();
  const active = habits.filter((h) => h.status === 'active');
  const discontinued = habits.filter((h) => h.status === 'discontinued');

  el('habits-empty').hidden = active.length > 0;
  el('habit-list').hidden = active.length === 0;
  el('habit-list').replaceChildren(...active.map((h) => habitRow(h, today, () => openForm('edit', h))));

  el('discontinued').hidden = discontinued.length === 0;
  el('discontinued-count').textContent = discontinued.length;
  el('discontinued-list').replaceChildren(
    ...discontinued.map((h) => habitRow(h, today, () => openDiscontinued(h)))
  );
}

async function refresh() {
  await renderList();
  await refreshAbout();
}

// ---------- History ----------

function fillHistory(listsId, habit) {
  const { periods, versions } = describeHistory(habit);
  const area = el(listsId);
  const list = (heading, lines) => {
    const title = document.createElement('h4');
    title.textContent = heading;
    const ul = document.createElement('ul');
    ul.replaceChildren(...lines.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }));
    return [title, ul];
  };
  area.replaceChildren(...list('Active periods', periods), ...list('Schedule versions', versions));
}

// ---------- The form ----------

function renderSwatches() {
  for (const swatch of el('habit-swatches').children) {
    swatch.setAttribute('aria-pressed', String(swatch.dataset.colour === form.colour));
  }
}

function renderDays() {
  for (const chip of el('habit-days').children) {
    chip.setAttribute('aria-pressed', String(form.days.has(Number(chip.dataset.day))));
  }
  el('habit-every-day').setAttribute('aria-pressed', String(form.days.size === 7));
}

function renderRepeat() {
  const repeat = el('habit-repeat').checked;
  el('habit-repeat-on').hidden = !repeat;
  el('habit-repeat-off').hidden = repeat;
  if (!repeat && !el('habit-date').value) el('habit-date').value = todayStr();
}

function showErrors(errors) {
  const area = el('habit-errors');
  area.hidden = errors.length === 0;
  area.replaceChildren(...errors.map((message) => {
    const li = document.createElement('li');
    li.textContent = message;
    return li;
  }));
}

async function openForm(mode, target = null) {
  const today = todayStr();
  form.mode = mode;
  form.target = target;
  form.declinedName = null;

  const version = target ? currentVersion(target, today) : null;
  form.colour = target ? target.colour : firstFreeColour(await listHabits());
  form.days = new Set(version && version.repeat ? version.days : []);

  el('habit-form-title').textContent = { add: 'Add habit', edit: 'Edit habit', restart: 'Restart habit' }[mode];
  el('habit-name').value = target ? target.name : '';
  el('habit-repeat').checked = version ? version.repeat : true;
  el('habit-date').value = version && !version.repeat ? version.date : '';
  el('habit-date').min = today;
  el('habit-time').value = version ? version.setTime : '';

  renderSwatches();
  renderDays();
  renderRepeat();
  showErrors([]);

  el('habit-discontinue').hidden = mode !== 'edit';
  el('habit-history').hidden = !target;
  if (target) fillHistory('habit-history-lists', target);

  el('habit-dialog').showModal();
}

function readForm() {
  return {
    name: el('habit-name').value,
    colour: form.colour,
    repeat: el('habit-repeat').checked,
    days: [...form.days],
    date: el('habit-date').value,
    setTime: el('habit-time').value,
  };
}

// Returns true when the form's work is finished and it should close.
async function saveForm() {
  const today = todayStr();
  const input = readForm();
  const { mode, target } = form;

  // An edit may keep a one-time date that has since passed; a restart may not.
  const existingDate = mode === 'edit' ? currentVersion(target, today).date : undefined;
  const errors = validateInput(input, today, { existingDate });
  if (errors.length > 0) {
    showErrors(errors);
    return false;
  }

  const { active, discontinued } = findByName(await listHabits(), input.name);
  if (active && active.id !== target?.id) {
    showErrors([`You already have a habit called ${active.name}.`]);
    return false;
  }

  if (mode === 'edit') {
    await editHabit(target.id, input);
    return true;
  }
  if (mode === 'restart') {
    await restartHabit(target.id, input);
    return true;
  }

  if (discontinued.length === 0) {
    await addHabit(input);
    return true;
  }

  // Add, with the name of a discontinued habit: continue it, or pick another name.
  if (normaliseName(input.name) === form.declinedName) {
    showErrors(['Choose a different name for the new record.']);
    return false;
  }
  const old = mostRecentlyDiscontinued(discontinued);
  const days = await daysOfHistory(old);
  const choice = await choiceDialog({
    title: 'This name already exists',
    message: `A discontinued habit called ${old.name} exists, with ${days} ${days === 1 ? 'day' : 'days'} of history.`,
    firstLabel: 'Continue the old habit',
    secondLabel: 'Start a new record',
  });
  if (choice === 'first') {
    // The habit keeps its existing name; only schedule, colour and time come from the form.
    await restartHabit(old.id, { ...input, name: old.name });
    return true;
  }
  if (choice === 'second') {
    form.declinedName = normaliseName(input.name);
    showErrors(['Choose a different name for the new record.']);
    el('habit-name').focus();
  }
  return false;
}

async function onSave() {
  if (busy) return;
  busy = true;
  try {
    if (await saveForm()) {
      el('habit-dialog').close();
      await refresh();
    }
  } catch (err) {
    console.error(err);
    showErrors([err.message || 'Could not save.']);
  } finally {
    busy = false;
  }
}

async function onDiscontinue() {
  if (busy) return;
  busy = true;
  try {
    const { target } = form;
    const yes = await confirmDialog({
      title: `Remove ${target.name}?`,
      message: await discontinuePreview(target),
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true,
    });
    if (yes) {
      await discontinueHabit(target.id);
      el('habit-dialog').close();
      await refresh();
    }
  } catch (err) {
    console.error(err);
    showErrors([err.message || 'Could not remove the habit.']);
  } finally {
    busy = false;
  }
}

// ---------- A discontinued habit (read-only, apart from Restart) ----------

function openDiscontinued(habit) {
  form.target = habit;
  el('discontinued-title').textContent = habit.name;
  el('discontinued-schedule').textContent = describeSchedule(currentVersion(habit, todayStr()));
  fillHistory('discontinued-history-lists', habit);
  el('discontinued-dialog').showModal();
}

// ---------- Start-up ----------

function buildControls() {
  el('habit-swatches').replaceChildren(...PALETTE.map(({ name, value }) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.dataset.colour = value;
    swatch.setAttribute('aria-label', name);
    swatch.style.background = value;
    swatch.addEventListener('click', () => {
      form.colour = value;
      renderSwatches();
    });
    return swatch;
  }));

  el('habit-days').replaceChildren(...ALL_DAYS.map((day) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.day = day;
    chip.textContent = WEEKDAY_NAMES[day - 1];
    chip.addEventListener('click', () => {
      if (form.days.has(day)) form.days.delete(day);
      else form.days.add(day);
      renderDays();
    });
    return chip;
  }));
}

export async function initHabitsView() {
  buildControls();

  el('add-habit').addEventListener('click', () => {
    openForm('add').catch((err) => console.error(err));
  });
  el('habit-every-day').addEventListener('click', () => {
    form.days = new Set(ALL_DAYS);
    renderDays();
  });
  el('habit-repeat').addEventListener('change', renderRepeat);
  el('habit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    onSave();
  });
  el('habit-cancel').addEventListener('click', () => el('habit-dialog').close());
  el('habit-discontinue').addEventListener('click', onDiscontinue);

  el('discontinued-close').addEventListener('click', () => el('discontinued-dialog').close());
  el('discontinued-restart').addEventListener('click', () => {
    const habit = form.target;
    el('discontinued-dialog').close();
    openForm('restart', habit).catch((err) => console.error(err));
  });

  onViewShown((view) => {
    closeAllDialogs();
    if (view === 'habits') renderList().catch((err) => console.error(err));
  });

  await renderList();
}

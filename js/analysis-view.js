// The Analysis view: range buttons, Overview, habit cards and their charts
// (docs/modules/module-5.md). It only reads data; nothing here writes to the database.
// Names are always written with textContent, never as HTML.
import {
  analysisModel, countsLine, deviationSeries, lateLine, overviewBars, percentLine, RANGES,
  streakLine, timingLine, weeklyRates,
} from './analysis-logic.js';
import { destroyCharts, drawOverview, drawTiming, drawWeekly, loadCharts } from './charts.js';
import { completionsBetween } from './completions.js';
import { todayStr } from './dates.js';
import { currentVersion, describeSchedule, formatDate } from './habit-logic.js';
import { listHabits } from './habits.js';
import { onViewShown } from './views.js';

const DEFAULT_RANGE = 'last30';
const CHARTS_FAILED = "Charts couldn't load.";
const NOTHING_TO_CHART = 'Nothing to chart in this range.';
const NO_DAYS = 'No scheduled days in this range.';
const OVERVIEW_ROW_PX = 36;
const OVERVIEW_AXIS_PX = 36;

const el = (id) => document.getElementById(id);

let range = DEFAULT_RANGE;
let openHabitId = null;
let renderCount = 0;
let chartsReady = false;
let latest = null; // what the cards were last drawn from
const cards = new Map(); // habit id -> { head, detail, entry }

function isShown() {
  return !document.querySelector('[data-view="analysis"]').hidden;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// ---------- Charts ----------

// A fixed-height box holding a canvas, passed to draw once it is on the page.
function chartBox(heightClass) {
  const box = document.createElement('div');
  box.className = `chart-box ${heightClass}`;
  const canvas = document.createElement('canvas');
  box.append(canvas);
  return { box, canvas };
}

function fillOverview(bars) {
  const area = el('analysis-overview-chart');
  if (bars.length === 0) {
    area.replaceChildren(textElement('p', 'placeholder', NO_DAYS));
    return;
  }
  if (!chartsReady) {
    area.replaceChildren(textElement('p', 'placeholder', CHARTS_FAILED));
    return;
  }
  const { box, canvas } = chartBox('chart-overview');
  box.style.height = `${bars.length * OVERVIEW_ROW_PX + OVERVIEW_AXIS_PX}px`;
  area.replaceChildren(box);
  drawOverview(canvas, bars);
}

// One titled chart in the detail area, or a message in its place.
function detailChart(title, heightClass, hasData) {
  const section = document.createElement('div');
  section.className = 'detail-chart';
  section.append(textElement('h3', 'detail-title', title));
  if (!hasData || !chartsReady) {
    section.append(textElement('p', 'placeholder', chartsReady ? NOTHING_TO_CHART : CHARTS_FAILED));
    return { section, canvas: null };
  }
  const { box, canvas } = chartBox(heightClass);
  section.append(box);
  return { section, canvas };
}

async function fillDetail(habitId) {
  chartsReady = await loadCharts(); // a tap can arrive before the first load finishes
  const card = cards.get(habitId);
  if (!card || !latest || openHabitId !== habitId) return;
  const { habit, summary } = card.entry;
  const { completions } = latest;

  const weeks = weeklyRates(habit, completions, summary.from, summary.lastDay);
  const points = deviationSeries(habit, completions, summary.from, summary.lastDay);

  const weekly = detailChart('Weekly completion', 'chart-detail', weeks.some((w) => w.y > 0));
  const timing = detailChart('Timing', 'chart-detail', points.length > 0);
  timing.section.append(textElement('p', 'chart-note', 'Late completions are not plotted.'));
  card.detail.replaceChildren(weekly.section, timing.section);

  destroyCharts('weekly', 'timing');
  if (weekly.canvas) drawWeekly(weekly.canvas, weeks, habit.colour);
  if (timing.canvas) drawTiming(timing.canvas, points, habit.colour);
}

// ---------- Cards ----------

function setOpenCard(habitId) {
  const previous = cards.get(openHabitId);
  if (previous) {
    previous.head.setAttribute('aria-expanded', 'false');
    previous.detail.hidden = true;
    previous.detail.replaceChildren();
  }
  destroyCharts('weekly', 'timing');

  openHabitId = habitId;
  const card = cards.get(habitId);
  if (!card) {
    openHabitId = null;
    return;
  }
  card.head.setAttribute('aria-expanded', 'true');
  card.detail.hidden = false;
  fillDetail(habitId).catch((err) => console.error(err));
}

function habitCard(entry, today) {
  const { habit, summary } = entry;
  const discontinued = habit.status === 'discontinued';

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'analysis-head';
  head.setAttribute('aria-expanded', 'false');

  const title = document.createElement('span');
  title.className = 'analysis-title';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = habit.colour;
  const text = document.createElement('span');
  text.className = 'habit-text';
  const under = discontinued
    ? `Discontinued ${formatDate(habit.activePeriods[habit.activePeriods.length - 1].end)}`
    : describeSchedule(currentVersion(habit, today));
  text.append(textElement('span', 'habit-name', habit.name), textElement('span', 'habit-schedule', under));
  title.append(dot, text);
  head.append(title);

  if (summary.percent !== null) head.append(textElement('span', 'analysis-percent', `${summary.percent}%`));
  head.append(
    textElement('span', 'analysis-line', percentLine(summary)),
    textElement('span', 'analysis-line', streakLine(summary)),
    textElement('span', 'analysis-line', countsLine(summary)),
    textElement('span', 'analysis-line', timingLine(summary.timing))
  );
  const late = lateLine(summary.lateTiming);
  if (late) head.append(textElement('span', 'analysis-line', late));

  const detail = document.createElement('div');
  detail.className = 'analysis-detail';
  detail.hidden = true;

  head.addEventListener('click', () => setOpenCard(openHabitId === habit.id ? null : habit.id));

  const card = document.createElement('article');
  card.className = 'card analysis-card';
  card.append(head, detail);
  cards.set(habit.id, { head, detail, entry });
  return card;
}

// ---------- Drawing the view ----------

function renderRanges() {
  for (const button of el('analysis-ranges').children) {
    button.setAttribute('aria-pressed', String(button.dataset.range === range));
  }
}

async function render() {
  const thisRender = ++renderCount;
  const today = todayStr();
  const [habits, completions] = await Promise.all([
    listHabits(),
    completionsBetween('0000-01-01', today),
  ]);
  if (thisRender !== renderCount || !isShown()) return; // a newer render started, or the view closed

  const scrollY = window.scrollY;
  const keepOpen = openHabitId;
  destroyCharts();

  const empty = habits.length === 0;
  el('analysis-empty').hidden = !empty;
  el('analysis-ranges').hidden = empty;
  el('analysis-overview').hidden = empty;
  renderRanges();

  const model = analysisModel(habits, completions, range, today);
  latest = { completions };
  cards.clear();
  openHabitId = null;

  // The figures appear first and never wait for Chart.js.
  el('analysis-active').replaceChildren(...model.active.map((entry) => habitCard(entry, today)));
  el('analysis-discontinued').hidden = model.discontinued.length === 0;
  el('analysis-discontinued-count').textContent = model.discontinued.length;
  el('analysis-discontinued-list').replaceChildren(...model.discontinued.map((entry) => habitCard(entry, today)));

  chartsReady = empty ? chartsReady : await loadCharts();
  if (thisRender !== renderCount || !isShown()) return;

  fillOverview(overviewBars(model));
  if (cards.has(keepOpen)) setOpenCard(keepOpen);
  window.scrollTo(0, scrollY);
}

function redraw() {
  render().catch((err) => console.error(err));
}

function closeOpenCardIfInside(container) {
  const card = cards.get(openHabitId);
  if (card && container.contains(card.head)) setOpenCard(null);
}

export function initAnalysisView() {
  el('analysis-ranges').replaceChildren(...RANGES.map(({ key, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'range-button';
    button.dataset.range = key;
    button.textContent = label;
    button.addEventListener('click', () => {
      range = key;
      redraw();
    });
    return button;
  }));

  // Collapsing the section would leave a chart running out of sight.
  const discontinued = el('analysis-discontinued');
  discontinued.addEventListener('toggle', () => {
    if (!discontinued.open) closeOpenCardIfInside(discontinued);
  });

  // Each opening starts afresh; the range choice is not stored.
  function open() {
    range = DEFAULT_RANGE;
    openHabitId = null;
    discontinued.open = false;
    redraw();
  }

  onViewShown((view) => {
    if (view === 'analysis') {
      open();
    } else {
      renderCount += 1; // a render still reading the data must not draw
      destroyCharts();
      openHabitId = null;
    }
  });

  // Coming back to the screen, or the phone switching light or dark, keeps the range
  // and the open card. The data or today may have changed while away.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isShown()) redraw();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (isShown()) redraw();
  });

  // The app may have opened directly at #analysis, before this listener existed.
  if (isShown()) open();
}

// The Yearly PDF card in the Export view (docs/modules/module-6.md, decisions 2, 5 to 7).
// It only reads: nothing is written to the database, and lastBackupAt is never touched.
import { canShareFile, downloadFile, shareFile } from './backup.js';
import { todayStr } from './dates.js';
import { db } from './db.js';
import { listHabits } from './habits.js';
import { onViewShown } from './views.js';
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, drawYear, PAGE_HEIGHT_MM, PAGE_WIDTH_MM,
} from './year-draw.js';
import {
  habitsForYear, pageModel, pdfFileName, yearOptions,
} from './year-logic.js';

const BUILD_DELAY_MS = 300; // after the preview is last redrawn
const PREPARING = 'Preparing PDF…';
const LOAD_FAILED = "PDF maker couldn't load.";
const BUILD_FAILED = "PDF couldn't be made.";

let habits = [];
let completions = [];
let today = '';
let year = 0;
let ticked = new Set();
let openCount = 0; // an open still reading the data must not draw after a newer one
let pageCount = 0; // a PDF still building must not be kept once the page has changed
let buildTimer = null;
let pdfFile = null;
let busy = false; // Android refuses a second share while one is open.
let loading = null;

const el = {};

// Loads jsPDF once, the first time the card prepares a PDF.
function loadJsPdf() {
  if (!loading) {
    loading = import('../vendor/jspdf.umd.min.js')
      .then(() => {
        if (!globalThis.jspdf?.jsPDF) throw new Error('jsPDF did not set globalThis.jspdf.');
        return globalThis.jspdf.jsPDF;
      })
      .catch((err) => {
        console.error('jsPDF could not load:', err);
        return null;
      });
  }
  return loading;
}

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.status.hidden = !text;
  el.status.classList.toggle('status-error', isError);
}

function setButtons(enabled) {
  el.share.disabled = !enabled;
  el.download.disabled = !enabled;
}

function stopBuilding() {
  pageCount += 1;
  clearTimeout(buildTimer);
  pdfFile = null;
  setButtons(false);
}

function buildPdf(JsPdf) {
  const doc = new JsPdf({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Habit Tracker ${year}` });
  doc.addImage(el.canvas, 'PNG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'FAST');
  return new File([doc.output('blob')], pdfFileName(year), { type: 'application/pdf' });
}

// The PDF is built ahead of time, so a tap only shares the ready file: Chrome allows a
// share only shortly after a tap, and building can take a second on the phone.
async function preparePdf(page) {
  const JsPdf = await loadJsPdf();
  if (page !== pageCount) return;
  if (!JsPdf) {
    setStatus(LOAD_FAILED, true);
    return;
  }
  try {
    pdfFile = buildPdf(JsPdf);
  } catch (err) {
    console.error('PDF could not be made:', err);
    setStatus(BUILD_FAILED, true);
    return;
  }
  setStatus('');
  setButtons(true);
}

function redraw() {
  stopBuilding();
  const model = pageModel(habits, completions, year, [...ticked], today);
  el.message.textContent = model.error ?? '';
  el.message.hidden = !model.error;
  el.canvas.hidden = Boolean(model.error);
  if (model.error) {
    setStatus('');
    return;
  }
  drawYear(el.canvas.getContext('2d'), model);
  setStatus(PREPARING);
  const page = pageCount;
  buildTimer = setTimeout(() => preparePdf(page), BUILD_DELAY_MS);
}

function renderTickList() {
  const list = habitsForYear(habits, completions, year);
  ticked = new Set(list.map((h) => h.id));
  el.list.hidden = list.length === 0;
  el.list.replaceChildren(...list.map((habit) => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = true;
    box.addEventListener('change', () => {
      if (box.checked) ticked.add(habit.id);
      else ticked.delete(habit.id);
      redraw();
    });

    const dot = document.createElement('span');
    dot.className = 'year-habit-dot';
    dot.style.background = habit.colour;

    const name = document.createElement('span');
    name.className = 'year-habit-name';
    name.textContent = habit.status === 'discontinued' ? `${habit.name} (discontinued)` : habit.name;

    const row = document.createElement('label');
    row.className = 'toggle year-habit';
    row.append(box, dot, name);
    return row;
  }));
}

function chooseYear(chosen) {
  year = chosen;
  renderTickList();
  redraw();
}

async function open() {
  stopBuilding();
  const thisOpen = ++openCount;
  const [readHabits, readCompletions] = await Promise.all([listHabits(), db.completions.toArray()]);
  if (thisOpen !== openCount) return;
  habits = readHabits;
  completions = readCompletions;
  today = todayStr();

  const years = yearOptions(habits, today);
  el.year.replaceChildren(...years.map((y) => new Option(String(y), String(y))));
  el.year.value = String(years[0]);
  chooseYear(years[0]);
}

function close() {
  openCount += 1;
  stopBuilding();
}

// Only one action at a time; a tap while another runs does nothing.
async function save(action) {
  if (busy || !pdfFile) return;
  busy = true;
  setStatus('');
  try {
    setStatus(await action(pdfFile));
  } catch (err) {
    console.error('PDF not saved:', err);
    setStatus('PDF not saved.', true);
  } finally {
    busy = false;
  }
}

function downloadPdf(file) {
  downloadFile(file, file.name);
  return 'PDF downloaded.';
}

async function sharePdf(file) {
  if (!canShareFile(file)) return downloadPdf(file);
  const outcome = await shareFile(file);
  if (outcome === 'shared') return 'PDF shared.';
  if (outcome === 'cancelled') return 'PDF not saved.';
  return downloadPdf(file);
}

export function initYearView() {
  el.year = document.getElementById('year-select');
  el.list = document.getElementById('year-habits');
  el.message = document.getElementById('year-message');
  el.canvas = document.getElementById('year-preview');
  el.share = document.getElementById('year-share');
  el.download = document.getElementById('year-download');
  el.status = document.getElementById('year-status');

  el.canvas.width = CANVAS_WIDTH;
  el.canvas.height = CANVAS_HEIGHT;

  el.year.addEventListener('change', () => chooseYear(Number(el.year.value)));
  el.share.addEventListener('click', () => save(sharePdf));
  el.download.addEventListener('click', () => save(downloadPdf));

  const show = (view) => {
    if (view === 'export') open().catch((err) => console.error('Yearly PDF card failed:', err));
    else close();
  };
  onViewShown(show);

  // The app may have opened directly at #export, before this listener existed.
  if (!document.querySelector('[data-view="export"]').hidden) show('export');
}

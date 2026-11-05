// The Analysis charts (docs/modules/module-5.md, decision 3). Loads Chart.js once, the
// first time it is needed, and builds the three chart types from plain data. Every
// chart lives in a named slot, and anything already in that slot is destroyed first.
// Category axes only: the time axis would need a date adapter, which is not installed.

let loading = null;
const slots = new Map();

// True if Chart.js is ready. The figures never depend on this.
export function loadCharts() {
  if (!loading) {
    loading = import('../vendor/chart.umd.min.js')
      .then(() => {
        if (!globalThis.Chart) throw new Error('Chart.js did not set globalThis.Chart.');
        return true;
      })
      .catch((err) => {
        console.error('Charts could not load:', err);
        return false;
      });
  }
  return loading;
}

export function destroyCharts(...names) {
  for (const name of names.length > 0 ? names : [...slots.keys()]) {
    slots.get(name)?.destroy();
    slots.delete(name);
  }
}

// Read at draw time, so a redraw picks up the current theme.
function themeColours() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => style.getPropertyValue(name).trim();
  return { text: read('--text'), muted: read('--muted'), border: read('--border') };
}

function draw(name, canvas, config) {
  destroyCharts(name);
  const { options, ...rest } = config;
  slots.set(name, new globalThis.Chart(canvas, {
    ...rest,
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      ...options,
    },
  }));
}

function axis(colours, extra = {}) {
  const { ticks, ...rest } = extra;
  return {
    grid: { color: colours.border },
    border: { color: colours.border },
    ticks: { color: colours.muted, ...ticks },
    ...rest,
  };
}

function percentAxis(colours) {
  return axis(colours, { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } });
}

function shortened(label) {
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

// bars: [{ name, colour, percent }]. Horizontal, one bar per habit.
export function drawOverview(canvas, bars) {
  const colours = themeColours();
  draw('overview', canvas, {
    type: 'bar',
    data: {
      labels: bars.map((b) => b.name),
      datasets: [{
        data: bars.map((b) => b.percent),
        backgroundColor: bars.map((b) => b.colour),
        maxBarThickness: 24,
      }],
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: percentAxis(colours),
        y: axis(colours, {
          grid: { display: false },
          ticks: {
            color: colours.text,
            autoSkip: false,
            callback(value) {
              return shortened(this.getLabelForValue(value));
            },
          },
        }),
      },
    },
  });
}

// weeks: [{ label, percent }]. A null percent leaves a gap.
export function drawWeekly(canvas, weeks, colour) {
  const colours = themeColours();
  draw('weekly', canvas, {
    type: 'bar',
    data: {
      labels: weeks.map((w) => w.label),
      datasets: [{
        data: weeks.map((w) => w.percent),
        backgroundColor: colour,
        maxBarThickness: 32,
      }],
    },
    options: {
      scales: {
        x: axis(colours, { grid: { display: false } }),
        y: percentAxis(colours),
      },
    },
  });
}

// points: [{ label, min }]. Points only, with a stronger grid line at 0.
export function drawTiming(canvas, points, colour) {
  const colours = themeColours();
  const isZero = (context) => context.tick?.value === 0;
  draw('timing', canvas, {
    type: 'line',
    data: {
      labels: points.map((p) => p.label),
      datasets: [{
        data: points.map((p) => p.min),
        showLine: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colour,
        pointBorderColor: colour,
      }],
    },
    options: {
      scales: {
        x: axis(colours, { grid: { display: false } }),
        y: {
          ...axis(colours),
          suggestedMin: 0,
          suggestedMax: 0,
          grid: {
            color: (context) => (isZero(context) ? colours.text : colours.border),
            lineWidth: (context) => (isZero(context) ? 2 : 1),
          },
          title: { display: true, text: 'Minutes early (−) or late (+)', color: colours.muted },
        },
      },
    },
  });
}

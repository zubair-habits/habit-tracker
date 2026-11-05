// Draws one Yearly PDF page from the plain model (docs/modules/module-6.md, decision 4).
// All drawing is in millimetres on a white page, whatever the app's theme. The preview
// and the PDF are this one picture, so they always match. No database access.

export const PAGE_WIDTH_MM = 297;
export const PAGE_HEIGHT_MM = 210;
export const PX_PER_MM = 8;
export const CANVAS_WIDTH = PAGE_WIDTH_MM * PX_PER_MM; // 2376
export const CANVAS_HEIGHT = PAGE_HEIGHT_MM * PX_PER_MM; // 1680

const FONT = 'system-ui, sans-serif';
const WHITE = '#ffffff';
const TEXT = '#1a1a1a';
const SECONDARY = '#666666';
const SQUARE = '#ebedf0';
const UPCOMING = '#b0b4ba';

const MARGIN = 10;
const RIGHT_EDGE = PAGE_WIDTH_MM - MARGIN;
const KEY_TOP = PAGE_HEIGHT_MM - MARGIN - 8;
const KEY_CELL = 4;
const KEY_FONT = 3;
const LABEL_FONT_MAX = 3;
const LABEL_GAP = 1;
const WEEKDAY_ROWS = [[0, 'Mon'], [2, 'Wed'], [4, 'Fri']];

function setFont(ctx, size, weight = '') {
  ctx.font = `${weight} ${size}px ${FONT}`.trim();
}

function fillCircle(ctx, x, y, radius, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// The mark's outer size is the same as a filled circle's: the line sits inside it.
function drawRing(ctx, x, y, size, lineWidth, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, (size - lineWidth) / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function fillDiamond(ctx, x, y, size, colour) {
  const half = size / 2;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x, y + half);
  ctx.lineTo(x - half, y);
  ctx.closePath();
  ctx.fill();
}

function drawSquare(ctx, x, y, cell) {
  const size = 0.9 * cell;
  ctx.fillStyle = SQUARE;
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, 0.15 * cell);
  ctx.fill();
}

function drawMark(ctx, state, x, y, cell, colour) {
  const size = 0.7 * cell;
  if (state === 'done') fillCircle(ctx, x, y, size / 2, colour);
  else if (state === 'extra') fillDiamond(ctx, x, y, size, colour);
  else if (state === 'missed' || state === 'due') drawRing(ctx, x, y, size, 0.12 * cell, colour);
  else if (state === 'upcoming') fillCircle(ctx, x, y, 0.15 * cell, UPCOMING);
}

// Whole letters only, so a cut never breaks a Hindi or Nepali letter in two.
function letters(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  }
  return Array.from(text);
}

// The name is cut with "…" if the line is too long; the figures are always kept.
function fitHeading(ctx, name, rest, maxWidth) {
  if (ctx.measureText(name + rest).width <= maxWidth) return name + rest;
  const parts = letters(name);
  for (let keep = parts.length - 1; keep > 0; keep -= 1) {
    const line = `${parts.slice(0, keep).join('')}…${rest}`;
    if (ctx.measureText(line).width <= maxWidth) return line;
  }
  return `…${rest}`;
}

function drawHeader(ctx, model) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  setFont(ctx, 6, 'bold');
  ctx.fillText(model.title, MARGIN, MARGIN + 6);
  ctx.textAlign = 'right';
  ctx.fillStyle = SECONDARY;
  setFont(ctx, 3.5);
  ctx.fillText(model.madeLine, RIGHT_EDGE, MARGIN + 6);
}

function drawMonths(ctx, model) {
  const { cell, left, monthRowY, fontSize } = model.layout;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = SECONDARY;
  setFont(ctx, Math.min(fontSize, LABEL_FONT_MAX));
  for (const { col, label } of model.months) {
    ctx.fillText(label, left + col * cell, monthRowY + cell / 2);
  }
}

function drawStrip(ctx, model, strip, top) {
  const { cell, left, fontSize } = model.layout;
  const colour = strip.habit.colour;

  // Heading line: colour dot, then the name and figures.
  const headingY = top + 0.75 * cell;
  const dotRadius = 0.35 * fontSize;
  const textX = left + 2 * dotRadius + 0.6 * fontSize;
  fillCircle(ctx, left + dotRadius, headingY, dotRadius, colour);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  setFont(ctx, fontSize);
  const { name } = strip.habit;
  const rest = strip.heading.slice(name.length);
  ctx.fillText(fitHeading(ctx, name, rest, RIGHT_EDGE - textX), textX, headingY);

  // Weekday labels, in the column to the left of the grid.
  const gridY = top + 1.5 * cell;
  ctx.textAlign = 'right';
  ctx.fillStyle = SECONDARY;
  setFont(ctx, Math.min(fontSize, LABEL_FONT_MAX));
  for (const [row, label] of WEEKDAY_ROWS) {
    ctx.fillText(label, left - LABEL_GAP, gridY + (row + 0.5) * cell);
  }

  // The grid: a faint square for every day of the year, then its mark.
  model.weeks.forEach((week, col) => {
    week.forEach((date, row) => {
      if (!date) return;
      const x = left + (col + 0.5) * cell;
      const y = gridY + (row + 0.5) * cell;
      drawSquare(ctx, x, y, cell);
      drawMark(ctx, strip.marks[date], x, y, cell, colour);
    });
  });
}

function drawKey(ctx, left) {
  const y = KEY_TOP + 4;
  const items = [['done', 'Done'], ['extra', 'Extra'], ['missed', 'Missed'], ['upcoming', 'Upcoming'], [null, 'Not scheduled']];
  let x = left + KEY_CELL / 2;
  setFont(ctx, KEY_FONT);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const [state, word] of items) {
    drawSquare(ctx, x, y, KEY_CELL);
    drawMark(ctx, state, x, y, KEY_CELL, SECONDARY);
    ctx.fillStyle = SECONDARY;
    ctx.fillText(word, x + KEY_CELL / 2 + 1, y);
    x += KEY_CELL + 1 + ctx.measureText(word).width + 6;
  }
}

export function drawYear(ctx, model) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.scale(PX_PER_MM, PX_PER_MM);

  drawHeader(ctx, model);
  drawMonths(ctx, model);
  model.strips.forEach((strip, i) => drawStrip(ctx, model, strip, model.layout.stripY[i]));
  drawKey(ctx, model.layout.left);
}

// Backup, restore and CSV rules as pure functions (docs/modules/module-4.md).
// No database and no page access, so everything here can be tested on its own.
// "nowMs", dates and the schema version are all passed in.
import { toDateStr } from './dates.js';
import { formatClock, formatDeviation } from './calendar-logic.js';
import { formatDate } from './habit-logic.js';

const DAY_MS = 86400000;
const OLDEST_SCHEMA = 2; // Backups only exist from schema 2.
const THEMES = ['system', 'light', 'dark'];

const NOT_A_BACKUP = "This isn't a Habit Tracker backup.";
const TOO_NEW = 'This backup was made by a newer version of the app. Update the app first.';
const TOO_OLD = 'This backup is too old to restore.';

// Upgrades older backups to the current schema, one step at a time. Keyed by the
// version a step upgrades FROM: { 2: fn } upgrades 2 to 3. Every new Dexie version
// must add its step here in the same commit (CLAUDE.md section 6).
export const MIGRATIONS = {};

export function backupFileName(dateStr, ext) {
  return `habit-backup-${dateStr}.${ext}`;
}

export function csvFileName(dateStr) {
  return `habit-completions-${dateStr}.csv`;
}

function localDateTime(ms) {
  return `${toDateStr(new Date(ms))} ${formatClock(ms)}`;
}

// The whole backup file as an object. Rows are copied exactly as stored; nothing
// is recalculated. Only the theme setting travels with the file.
export function buildBackup({ habits, completions, settings }, { appVersion, schemaVersion, nowMs }) {
  return {
    app: 'habit-tracker',
    kind: 'backup',
    schemaVersion,
    appVersion,
    exportedAt: nowMs,
    exportedAtLocal: localDateTime(nowMs),
    counts: { habits: habits.length, completions: completions.length },
    data: {
      habits: structuredClone(habits),
      completions: structuredClone(completions),
      settings: settings.filter((row) => row.key === 'theme').map(({ key, value }) => ({ key, value })),
    },
  };
}

export function serialiseBackup(obj) {
  return JSON.stringify(obj, null, 2);
}

// Returns a new object at the target version, or throws when a step is missing.
export function upgradeBackup(backup, migrations, target) {
  let copy = structuredClone(backup);
  for (let version = copy.schemaVersion; version < target; version++) {
    const step = migrations[version];
    if (typeof step !== 'function') throw new Error(TOO_OLD);
    copy = { ...step(copy), schemaVersion: version + 1 };
  }
  return copy;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A real calendar date in "YYYY-MM-DD" form; 2026-02-31 is refused.
function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d)) === value;
}

function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function periodProblem(period) {
  if (!isObject(period) || !isDate(period.start)) return 'an active period with no valid start date';
  if (period.end !== null && !isDate(period.end)) return 'an active period with no valid end date';
  return null;
}

function versionProblem(version) {
  if (!isObject(version) || !isDate(version.from)) return "a schedule version with no valid 'from' date";
  if (typeof version.repeat !== 'boolean') return 'a schedule version with no valid repeat setting';
  if (!Array.isArray(version.days) || !version.days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    return 'a schedule version with invalid days';
  }
  if (version.date !== null && !isDate(version.date)) return 'a schedule version with an invalid date';
  if (!isTime(version.setTime)) return 'a schedule version with an invalid set time';
  return null;
}

function habitProblem(habit, seenIds) {
  if (!isObject(habit)) return 'is not a valid record';
  if (typeof habit.id !== 'string' || habit.id === '') return 'has no id';
  if (seenIds.has(habit.id)) return 'has the same id as another habit';
  if (typeof habit.name !== 'string' || habit.name.trim() === '') return 'has no name';
  if (typeof habit.colour !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(habit.colour)) return 'has an invalid colour';
  if (habit.status !== 'active' && habit.status !== 'discontinued') return 'has an invalid status';
  if (!isNumber(habit.createdAt)) return 'has no valid creation time';
  if (!Array.isArray(habit.activePeriods) || habit.activePeriods.length === 0) return 'has no active periods';
  for (const period of habit.activePeriods) {
    const problem = periodProblem(period);
    if (problem) return `has ${problem}`;
  }
  if (!Array.isArray(habit.schedule) || habit.schedule.length === 0) return 'has no schedule';
  for (const version of habit.schedule) {
    const problem = versionProblem(version);
    if (problem) return `has ${problem}`;
  }
  return null;
}

function completionProblem(completion, habitIds, seenKeys) {
  if (!isObject(completion)) return 'is not a valid record';
  if (!habitIds.has(completion.habitId)) return 'belongs to a habit that is not in the file';
  if (!isDate(completion.date)) return 'has an invalid date';
  // JSON.stringify keeps the two parts apart, whatever characters an id contains.
  const key = JSON.stringify([completion.habitId, completion.date]);
  if (seenKeys.has(key)) return 'is a second completion for the same habit and date';
  if (!isTime(completion.setTime)) return 'has an invalid set time';
  if (!isNumber(completion.completedAt)) return 'has no valid completion time';
  if (!isNumber(completion.deviationMin)) return 'has no valid deviation';
  if (typeof completion.late !== 'boolean') return 'has no valid late flag';
  if (typeof completion.extra !== 'boolean') return 'has no valid extra flag';
  return null;
}

// Returns null, or the first problem as text.
export function validateBackup(backup) {
  if (!isNumber(backup.exportedAt)) return 'it has no valid backup time';
  if (typeof backup.exportedAtLocal !== 'string') return 'it has no valid backup date';
  if (typeof backup.appVersion !== 'string') return 'it has no valid app version';
  if (!isObject(backup.data)) return 'it has no data section';
  const { habits, completions } = backup.data;
  if (!Array.isArray(habits)) return 'it has no list of habits';
  if (!Array.isArray(completions)) return 'it has no list of completions';

  const habitIds = new Set();
  for (const [i, habit] of habits.entries()) {
    const problem = habitProblem(habit, habitIds);
    if (problem) return `habit ${i + 1} ${problem}`;
    habitIds.add(habit.id);
  }

  const seenKeys = new Set();
  for (const [i, completion] of completions.entries()) {
    const problem = completionProblem(completion, habitIds, seenKeys);
    if (problem) return `completion ${i + 1} ${problem}`;
    seenKeys.add(JSON.stringify([completion.habitId, completion.date]));
  }
  return null;
}

// Returns { ok: true, backup } at the current schema, or { ok: false, error }.
// The file is refused whole if anything is wrong.
export function parseBackup(text, currentSchema, migrations = MIGRATIONS) {
  let file;
  try {
    // A byte-order mark is not valid JSON, and another app may have added one.
    file = JSON.parse(text.replace(/^﻿/, ''));
  } catch (err) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isObject(file) || file.app !== 'habit-tracker' || file.kind !== 'backup'
    || !Number.isInteger(file.schemaVersion)) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (file.schemaVersion > currentSchema) return { ok: false, error: TOO_NEW };
  if (file.schemaVersion < OLDEST_SCHEMA) return { ok: false, error: TOO_OLD };

  let backup;
  try {
    backup = upgradeBackup(file, migrations, currentSchema);
  } catch (err) {
    return { ok: false, error: TOO_OLD };
  }
  const problem = validateBackup(backup);
  if (problem) return { ok: false, error: `This backup is damaged: ${problem}.` };
  return { ok: true, backup };
}

function cleanHabit(h) {
  return {
    id: h.id,
    name: h.name,
    colour: h.colour,
    status: h.status,
    createdAt: h.createdAt,
    activePeriods: h.activePeriods.map((p) => ({ start: p.start, end: p.end })),
    schedule: h.schedule.map((v) => ({
      from: v.from, repeat: v.repeat, days: [...v.days], date: v.date, setTime: v.setTime,
    })),
  };
}

function cleanCompletion(c) {
  return {
    habitId: c.habitId,
    date: c.date,
    setTime: c.setTime,
    completedAt: c.completedAt,
    deviationMin: c.deviationMin,
    late: c.late,
    extra: c.extra,
  };
}

// The rows with unknown fields dropped; known fields are kept exactly.
export function cleanRows(backup) {
  return {
    habits: backup.data.habits.map(cleanHabit),
    completions: backup.data.completions.map(cleanCompletion),
  };
}

function themeOf(backup) {
  const rows = Array.isArray(backup.data.settings) ? backup.data.settings : [];
  const row = rows.find((r) => isObject(r) && r.key === 'theme');
  return row && THEMES.includes(row.value) ? row.value : 'system';
}

// The exact rows the restore transaction writes.
export function restorePlan(backup) {
  return {
    ...cleanRows(backup),
    settings: [
      { key: 'schemaVersion', value: backup.schemaVersion },
      { key: 'theme', value: themeOf(backup) },
      { key: 'lastBackupAt', value: backup.exportedAt },
    ],
  };
}

// current: { habits, completions }, the counts now in the app.
export function previewText(backup, current) {
  const { habits, completions } = backup.data;
  return `Backup from ${backup.exportedAtLocal} (app ${backup.appVersion}): `
    + `${habits.length} habits, ${completions.length} completions. `
    + `This replaces everything now in the app (${current.habits} habits, ${current.completions} completions). `
    + 'This cannot be undone. Take a backup first if you want to keep the current data.';
}

// Whole days, rounded down; null when there has been no backup.
export function daysSince(lastMs, nowMs) {
  if (lastMs === null) return null;
  return Math.floor((nowMs - lastMs) / DAY_MS);
}

export function needsReminder(lastMs, nowMs, habitCount) {
  if (habitCount <= 0) return false;
  return lastMs === null || nowMs - lastMs > 7 * DAY_MS;
}

// "Thu 5 Nov 2026 21:30", for the Settings card and About.
export function formatBackupTime(ms) {
  return `${formatDate(toDateStr(new Date(ms)))} ${formatClock(ms)}`;
}

function agoText(days) {
  if (days <= 0) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function lastBackupLine(lastMs, nowMs) {
  if (lastMs === null) return 'Last backup: never';
  return `Last backup: ${formatBackupTime(lastMs)} (${agoText(daysSince(lastMs, nowMs))})`;
}

export function bannerText(lastMs, nowMs) {
  if (lastMs === null) return 'No backup yet';
  return `Last backup: ${agoText(daysSince(lastMs, nowMs))}`;
}

// One CSV field: RFC 4180 quoting, plus a guard so Excel never treats text as a
// formula. Numbers are written as they are.
export function csvField(value) {
  if (typeof value === 'number') return String(value);
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_HEADER = [
  'Date', 'Habit', 'Set time', 'Completed at', 'Deviation (min)', 'Deviation',
  'Late', 'Extra', 'Habit status', 'Habit ID',
];

function yesNo(flag) {
  return flag ? 'Yes' : 'No';
}

// One row per completion, by date, then habit createdAt. Starts with a byte-order
// mark so Excel shows non-English names correctly.
export function buildCsv(habits, completions) {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const created = (c) => {
    const habit = byId.get(c.habitId);
    return habit ? habit.createdAt : 0;
  };
  const sorted = [...completions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return created(a) - created(b);
  });
  const rows = sorted.map((c) => {
    const habit = byId.get(c.habitId);
    return [
      c.date,
      habit ? habit.name : '',
      c.setTime,
      localDateTime(c.completedAt),
      c.deviationMin,
      formatDeviation(c.deviationMin),
      yesNo(c.late),
      yesNo(c.extra),
      habit ? habit.status : '',
      c.habitId,
    ];
  });
  const lines = [CSV_HEADER, ...rows].map((row) => row.map(csvField).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

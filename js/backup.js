// Backup, restore and CSV: reads the database, builds the files, shares or downloads
// them, and runs the restore transaction. The rules themselves are in backup-logic.js.
// Restore is one of the only two paths in the app allowed to delete data (CLAUDE.md
// section 6), and it does so in one transaction, so a failure leaves the old data alone.
import { APP_VERSION } from '../version.js';
import { db, getSetting, setSetting, SCHEMA_VERSION } from './db.js';
import { todayStr } from './dates.js';
import {
  backupFileName, buildBackup, buildCsv, csvFileName, parseBackup, restorePlan, serialiseBackup,
} from './backup-logic.js';

const THEME_CACHE_KEY = 'ht-theme'; // Same key as js/theme.js.

export function getLastBackupAt() {
  return getSetting('lastBackupAt', null);
}

export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The browser needs the address for a moment after the click.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function canShareFile(file) {
  return Boolean(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
}

// Returns 'shared', or 'cancelled' if the owner closed the share sheet, or 'failed'.
export async function shareFile(file) {
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (err) {
    if (err.name === 'AbortError') return 'cancelled';
    console.error('Share failed:', err);
    return 'failed';
  }
}

// Reads everything and builds the backup. Returns its text, the time it was taken,
// and any reason Restore would refuse it (normally null).
async function prepareBackup() {
  const [habits, completions, settings] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.settings.toArray(),
  ]);
  const nowMs = Date.now();
  const backup = buildBackup(
    { habits, completions, settings },
    { appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION, nowMs }
  );
  const text = serialiseBackup(backup);
  const check = parseBackup(text, SCHEMA_VERSION);
  return { text, exportedAt: backup.exportedAt, problem: check.ok ? null : check.error };
}

// The file was handed over, so record it, unless Restore would refuse this file.
// Returns { outcome, problem } for the view to report.
async function finishBackup(outcome, { exportedAt, problem }) {
  if (!problem) await setSetting('lastBackupAt', exportedAt);
  return { outcome, problem };
}

function saveJson(prepared) {
  const name = backupFileName(todayStr(), 'json');
  downloadFile(new Blob([prepared.text], { type: 'application/json' }), name);
  return finishBackup('downloaded', prepared);
}

// "Download instead": saves habit-backup-<date>.json.
export async function downloadBackup() {
  return saveJson(await prepareBackup());
}

// "Back up": shares habit-backup-<date>.txt, because Android Chrome refuses to share
// .json. Nothing but the database read may wait between the tap and the share, or
// Chrome refuses the share. Falls back to download if sharing is impossible or fails.
export async function shareBackup() {
  const prepared = await prepareBackup();
  const file = new File([prepared.text], backupFileName(todayStr(), 'txt'), { type: 'text/plain' });
  if (!canShareFile(file)) return saveJson(prepared);

  const result = await shareFile(file);
  if (result === 'cancelled') return { outcome: 'cancelled', problem: prepared.problem };
  if (result === 'failed') return saveJson(prepared);
  return finishBackup('shared', prepared);
}

// Returns 'shared', 'downloaded' or 'cancelled'. CSV never updates lastBackupAt.
export async function exportCsv() {
  const [habits, completions] = await Promise.all([db.habits.toArray(), db.completions.toArray()]);
  const name = csvFileName(todayStr());
  const file = new File([buildCsv(habits, completions)], name, { type: 'text/csv' });
  if (canShareFile(file)) {
    const result = await shareFile(file);
    if (result !== 'failed') return result;
  }
  downloadFile(file, name);
  return 'downloaded';
}

// Returns parseBackup's answer. Judged by the contents, never by the file's name.
export async function readBackupFile(file) {
  return parseBackup(await file.text(), SCHEMA_VERSION);
}

// Replaces all data with the backup, in one transaction: if anything throws, the
// whole thing rolls back and the old data stays.
export async function restoreBackup(backup) {
  const plan = restorePlan(backup);
  await db.transaction('rw', db.habits, db.completions, db.settings, async () => {
    await Promise.all([db.habits.clear(), db.completions.clear(), db.settings.clear()]);
    await db.habits.bulkAdd(plan.habits);
    await db.completions.bulkAdd(plan.completions);
    await db.settings.bulkAdd(plan.settings);
  });
  try {
    localStorage.setItem(THEME_CACHE_KEY, plan.settings.find((row) => row.key === 'theme').value);
  } catch (err) {
    // Not fatal: the theme still comes from the database on start.
  }
}

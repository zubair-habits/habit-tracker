// Backup buttons in Settings and Export, the Restore file picker, the CSV button and
// the 7-day banner (docs/modules/module-4.md, decisions 9 to 11).
import { recordCounts, db } from './db.js';
import { refreshAbout } from './about.js';
import { confirmDialog } from './dialog.js';
import { onViewShown } from './views.js';
import { bannerText, lastBackupLine, needsReminder, previewText } from './backup-logic.js';
import {
  downloadBackup, exportCsv, getLastBackupAt, readBackupFile, restoreBackup, shareBackup,
} from './backup.js';

const RESTORE_FAILED = 'Restore failed. Nothing was changed.';

let busy = false; // Android refuses a second share while one is open.
let bannerDismissed = false; // "Later": hidden until the app is next opened.
let bannerCheck = 0;

// Only one action at a time; a tap while another runs does nothing.
async function oneAtATime(action) {
  if (busy) return;
  busy = true;
  try {
    await action();
  } finally {
    busy = false;
  }
}

function setStatus(line, text, isError = false) {
  line.textContent = text;
  line.hidden = !text;
  line.classList.toggle('status-error', isError);
}

function statusNear(button) {
  return button.closest('.card').querySelector('.status-line');
}

function backupMessage({ outcome, problem }) {
  if (outcome === 'cancelled') return { text: 'Backup not saved.', isError: false };
  if (problem) {
    return { text: `File saved, but Restore would refuse it, so Last backup was not updated. ${problem}`, isError: true };
  }
  return { text: outcome === 'shared' ? 'Backup shared.' : 'Backup downloaded.', isError: false };
}

function csvMessage(outcome) {
  if (outcome === 'cancelled') return 'CSV not saved.';
  return outcome === 'shared' ? 'CSV shared.' : 'CSV downloaded.';
}

async function refreshLastBackup() {
  const line = lastBackupLine(await getLastBackupAt(), Date.now());
  document.getElementById('backup-last').textContent = line;
}

// A check that finishes after a newer one has started is ignored, so a share sheet
// closing and the app returning to the screen cannot leave the wrong answer showing.
async function refreshBanner() {
  const check = ++bannerCheck;
  const [lastMs, habitCount] = await Promise.all([getLastBackupAt(), db.habits.count()]);
  if (check !== bannerCheck) return;
  const nowMs = Date.now();
  const show = !bannerDismissed && needsReminder(lastMs, nowMs, habitCount);
  document.getElementById('backup-banner').hidden = !show;
  if (show) document.getElementById('backup-banner-text').textContent = bannerText(lastMs, nowMs);
}

async function refreshAll() {
  await Promise.all([refreshLastBackup(), refreshBanner(), refreshAbout()]);
}

async function runBackup(action, statusLine) {
  await oneAtATime(async () => {
    setStatus(statusLine, '');
    try {
      const { text, isError } = backupMessage(await action());
      setStatus(statusLine, text, isError);
    } catch (err) {
      console.error('Backup failed:', err);
      setStatus(statusLine, 'Backup not saved.', true);
    }
    await refreshAll();
  });
}

async function runCsv(statusLine) {
  await oneAtATime(async () => {
    setStatus(statusLine, '');
    try {
      setStatus(statusLine, csvMessage(await exportCsv()));
    } catch (err) {
      console.error('CSV export failed:', err);
      setStatus(statusLine, 'CSV not saved.', true);
    }
  });
}

async function runRestore(file, statusLine) {
  await oneAtATime(async () => {
    setStatus(statusLine, '');
    let result;
    try {
      result = await readBackupFile(file);
    } catch (err) {
      console.error('Could not read the file:', err);
      setStatus(statusLine, "That file couldn't be read.", true);
      return;
    }
    if (!result.ok) {
      setStatus(statusLine, result.error, true);
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Replace all data?',
      message: previewText(result.backup, await recordCounts()),
      confirmLabel: 'Replace',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await restoreBackup(result.backup);
    } catch (err) {
      console.error('Restore failed:', err);
      setStatus(statusLine, RESTORE_FAILED, true);
      return;
    }
    location.reload(); // Every view redraws from the restored data.
  });
}

export async function initBackupView() {
  for (const button of document.querySelectorAll('[data-backup="share"]')) {
    button.addEventListener('click', () => runBackup(shareBackup, statusNear(button)));
  }
  for (const button of document.querySelectorAll('[data-backup="download"]')) {
    button.addEventListener('click', () => runBackup(downloadBackup, statusNear(button)));
  }

  const csvButton = document.getElementById('csv-export');
  csvButton.addEventListener('click', () => runCsv(statusNear(csvButton)));

  const restoreButton = document.getElementById('backup-restore');
  const picker = document.getElementById('restore-file');
  restoreButton.addEventListener('click', () => {
    picker.value = ''; // So choosing the same file twice still counts as a change.
    picker.click();
  });
  picker.addEventListener('change', () => {
    if (picker.files[0]) runRestore(picker.files[0], statusNear(restoreButton));
  });

  const bannerStatus = document.getElementById('backup-banner-status');
  document.getElementById('backup-banner-now').addEventListener('click', () => {
    runBackup(shareBackup, bannerStatus);
  });
  document.getElementById('backup-banner-later').addEventListener('click', () => {
    bannerDismissed = true;
    setStatus(bannerStatus, '');
    refreshBanner();
  });

  onViewShown((view) => {
    setStatus(bannerStatus, '');
    if (view === 'settings') refreshLastBackup().catch((err) => console.error(err));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAll().catch((err) => console.error(err));
  });

  await Promise.all([refreshLastBackup(), refreshBanner()]);
}

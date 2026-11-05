// About panel: app version, schema version, persistent storage, record counts, last backup.
import { APP_VERSION } from '../version.js';
import { getSetting, isPersisted, recordCounts } from './db.js';
import { formatBackupTime } from './backup-logic.js';

function set(id, value) {
  document.getElementById(id).textContent = value;
}

export async function refreshAbout() {
  set('about-version', APP_VERSION);
  set('about-schema', await getSetting('schemaVersion', '–'));
  set('about-persist', isPersisted() ? 'Granted' : 'Not granted');
  const counts = await recordCounts();
  set('about-habits', counts.habits);
  set('about-completions', counts.completions);
  set('about-settings', counts.settings);
  const lastBackup = await getSetting('lastBackupAt', null);
  set('about-last-backup', lastBackup === null ? 'Never' : formatBackupTime(lastBackup));
}

// Database (CLAUDE.md sections 6 and 10).
// Schema changes happen only by adding a new db.version() with a migration.
// Never edit or remove an existing version.
import Dexie from '../vendor/dexie.mjs';

// The schema version written into settings and into every backup (Module 4).
export const SCHEMA_VERSION = 2;

export const db = new Dexie('habit-tracker');

// Version 1 (Module 0): test counter only. Kept exactly as it was.
db.version(1).stores({
  testCounter: 'id',
});

// Version 2 (Module 1): the real tables. "testCounter: null" deletes the
// Module 0 test table; it only ever held test data.
db.version(2).stores({
  habits: 'id, status',
  completions: '[habitId+date], habitId, date',
  settings: 'key',
  testCounter: null,
});

let persisted = false;

// Opens the database, makes sure the schemaVersion row is current, and asks
// Android to keep the app's storage. Call once at start-up.
export async function openDb() {
  await db.open();
  await ensureSchemaVersion();
  persisted = await requestPersistentStorage();
}

// Dexie runs no upgrade function on a brand-new install, so this runs on
// every open instead of inside .upgrade().
async function ensureSchemaVersion() {
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get('schemaVersion');
    if (!row || typeof row.value !== 'number' || row.value < SCHEMA_VERSION) {
      await db.settings.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    }
  });
}

async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persisted) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (err) {
    console.error('Persistent storage request failed:', err);
    return false;
  }
}

// True when the browser has promised not to clear this app's storage.
export function isPersisted() {
  return persisted;
}

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// Record counts for the About panel.
export async function recordCounts() {
  const [habits, completions, settings] = await Promise.all([
    db.habits.count(),
    db.completions.count(),
    db.settings.count(),
  ]);
  return { habits, completions, settings };
}

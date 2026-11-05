// Test cases for the backup, restore and CSV rules (docs/modules/module-4.md).
// Runs in the browser (tests/index.html) and in Node:
//   node tests/backup-logic.test.js
import { applyDiscontinue, applyEdit, buildNewHabit } from '../js/habit-logic.js';
import { buildCompletion } from '../js/calendar-logic.js';
import {
  backupFileName, bannerText, buildBackup, buildCsv, cleanRows, csvField, csvFileName, daysSince,
  formatBackupTime, lastBackupLine, MIGRATIONS, needsReminder, parseBackup, previewText, restorePlan, serialiseBackup,
  upgradeBackup, validateBackup,
} from '../js/backup-logic.js';
import { COMPLETIONS as ANALYSIS_COMPLETIONS, HABITS as ANALYSIS_HABITS } from './analysis-fixture.js';

const NOT_A_BACKUP = "This isn't a Habit Tracker backup.";
const TOO_NEW = 'This backup was made by a newer version of the app. Update the app first.';
const TOO_OLD = 'This backup is too old to restore.';
const BOM = '﻿';
const DAY = 86400000;
const MIN = 60000;

function at(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm).getTime();
}

function input(changes = {}) {
  return { name: 'Gym', colour: '#e5484d', repeat: true, days: [1, 3, 5], date: null, setTime: '07:00', ...changes };
}

// Fixture from the spec. Today is 2026-11-10; all habits created 2026-11-01.
const NOW = at(2026, 11, 10, 21, 30);

const gymV1 = buildNewHabit(input(), '2026-11-01', 'gym-id', at(2026, 11, 1, 8, 0));
const gym = applyEdit(gymV1, input({ days: [2, 3, 5] }), '2026-11-05');
const readV1 = buildNewHabit(
  input({ name: 'Read', colour: '#0090ff', days: [1, 2, 3, 4, 5, 6, 7], setTime: '22:00' }),
  '2026-11-01', 'read-id', at(2026, 11, 1, 8, 1)
);
const dentist = buildNewHabit(
  input({ name: 'Dentist', colour: '#30a46c', repeat: false, days: [], date: '2026-11-20', setTime: '18:00' }),
  '2026-11-01', 'dentist-id', at(2026, 11, 1, 8, 2)
);

const c1 = buildCompletion(gym, '2026-11-02', at(2026, 11, 2, 7, 0));
const c2 = buildCompletion(readV1, '2026-11-03', at(2026, 11, 4, 10, 30));
const c3 = buildCompletion(readV1, '2026-11-05', at(2026, 11, 5, 21, 50));
const c4 = buildCompletion(gym, '2026-11-08', at(2026, 11, 8, 9, 0));

const read = applyDiscontinue(readV1, [c2, c3], '2026-11-08');

const HABITS = [gym, read, dentist];
const COMPLETIONS = [c1, c2, c3, c4];
const SETTINGS = [
  { key: 'schemaVersion', value: 2 },
  { key: 'theme', value: 'dark' },
  { key: 'lastBackupAt', value: 123 },
];
const INPUT = { habits: HABITS, completions: COMPLETIONS, settings: SETTINGS };
const META = { appVersion: '0.5.0', schemaVersion: 2, nowMs: NOW };

function backup() {
  return buildBackup(INPUT, META);
}

// A fresh backup, changed by fn, then put through parseBackup.
function parsed(fn) {
  const file = JSON.parse(serialiseBackup(backup()));
  fn(file);
  return parseBackup(JSON.stringify(file), 2);
}

function damagedBy(fn) {
  const result = parsed(fn);
  return !result.ok && result.error.startsWith('This backup is damaged:');
}

function restored(fn = () => {}) {
  return restorePlan(parsed(fn).backup);
}

function settingOf(plan, key) {
  return plan.settings.find((row) => row.key === key).value;
}

const addFieldX = (file) => ({ ...file, x: 'added', order: [...(file.order || []), 'x'] });
const addFieldY = (file) => ({ ...file, y: 'added', order: [...(file.order || []), 'y'] });

const csvLines = () => buildCsv(HABITS, COMPLETIONS).replace(BOM, '').split('\r\n');

// The Extra column of one row of the Module 5 fixture's CSV.
function analysisCsvExtra(date, name) {
  const lines = buildCsv(ANALYSIS_HABITS, ANALYSIS_COMPLETIONS).replace(BOM, '').split('\r\n');
  return lines.find((line) => line.startsWith(`${date},${name},`)).split(',')[7];
}

const cases = [
  // Building
  ['backupFileName, txt', () => backupFileName('2026-11-06', 'txt'), 'habit-backup-2026-11-06.txt'],
  ['backupFileName, json', () => backupFileName('2026-11-06', 'json'), 'habit-backup-2026-11-06.json'],
  ['csvFileName', () => csvFileName('2026-11-06'), 'habit-completions-2026-11-06.csv'],
  ['buildBackup: top-level fields', () => {
    const b = backup();
    return [b.app, b.kind, b.schemaVersion, b.appVersion, b.exportedAt === NOW, b.exportedAtLocal, b.counts];
  }, ['habit-tracker', 'backup', 2, '0.5.0', true, '2026-11-10 21:30', { habits: 3, completions: 4 }]],
  ['Settings in the file hold only theme', () => backup().data.settings, [{ key: 'theme', value: 'dark' }]],
  ['Habit rows deep-equal the input', () => JSON.stringify(backup().data.habits) === JSON.stringify(HABITS), true],
  ['Completion rows deep-equal the input', () => JSON.stringify(backup().data.completions) === JSON.stringify(COMPLETIONS), true],
  ['Gym still has two versions', () => backup().data.habits[0].schedule.map((v) => v.days), [[1, 3, 5], [2, 3, 5]]],
  ['Read still discontinued with its period end', () => {
    const r = backup().data.habits[1];
    return [r.status, r.activePeriods];
  }, ['discontinued', [{ start: '2026-11-01', end: '2026-11-07' }]]],
  ['Fixture completions: late and extra as expected', () => [
    [c1.deviationMin, c1.late, c1.extra],
    [c2.deviationMin, c2.late, c2.extra],
    [c3.deviationMin, c3.late, c3.extra],
    c4.extra,
  ], [[0, false, false], [750, true, false], [-10, false, false], true]],
  ['The input objects are unchanged after every call', () => {
    const before = JSON.stringify(INPUT);
    const b = buildBackup(INPUT, META);
    serialiseBackup(b);
    validateBackup(b);
    cleanRows(b);
    restorePlan(b);
    previewText(b, { habits: 0, completions: 0 });
    buildCsv(HABITS, COMPLETIONS);
    upgradeBackup(b, {}, 2);
    return JSON.stringify(INPUT) === before;
  }, true],
  ['A backup does not share rows with the database objects', () => backup().data.habits[0] === gym, false],
  ['Pretty-printed with 2-space indents', () => serialiseBackup(backup()).startsWith('{\n  "app": "habit-tracker",'), true],

  // Round trip
  ['Round trip: ok', () => parseBackup(serialiseBackup(backup()), 2).ok, true],
  ['Round trip: habits deep-equal the originals', () => JSON.stringify(restored().habits) === JSON.stringify(HABITS), true],
  ['Round trip: completions deep-equal the originals', () => JSON.stringify(restored().completions) === JSON.stringify(COMPLETIONS), true],
  ['restorePlan settings', () => restored().settings, [
    { key: 'schemaVersion', value: 2 },
    { key: 'theme', value: 'dark' },
    { key: 'lastBackupAt', value: NOW },
  ]],
  ['A file with no theme restores as system', () => settingOf(restored((f) => { f.data.settings = []; }), 'theme'), 'system'],
  ['A file with no settings list restores as system', () => settingOf(restored((f) => { delete f.data.settings; }), 'theme'), 'system'],
  ['Theme "blue" restores as system', () => settingOf(restored((f) => { f.data.settings = [{ key: 'theme', value: 'blue' }]; }), 'theme'), 'system'],
  ['A byte-order mark on the file is ignored', () => parseBackup(BOM + serialiseBackup(backup()), 2).ok, true],

  // Refusals
  ['"hello" is refused', () => parseBackup('hello', 2), { ok: false, error: NOT_A_BACKUP }],
  ['An empty file is refused', () => parseBackup('', 2), { ok: false, error: NOT_A_BACKUP }],
  ['A JSON list is refused', () => parseBackup('[]', 2), { ok: false, error: NOT_A_BACKUP }],
  ['app "other" is refused', () => parsed((f) => { f.app = 'other'; }), { ok: false, error: NOT_A_BACKUP }],
  ['kind "other" is refused', () => parsed((f) => { f.kind = 'other'; }), { ok: false, error: NOT_A_BACKUP }],
  ['A missing schemaVersion is refused', () => parsed((f) => { delete f.schemaVersion; }), { ok: false, error: NOT_A_BACKUP }],
  ['schemaVersion 3 with current 2', () => parsed((f) => { f.schemaVersion = 3; }), { ok: false, error: TOO_NEW }],
  ['schemaVersion 1', () => parsed((f) => { f.schemaVersion = 1; }), { ok: false, error: TOO_OLD }],
  ['A missing upgrade step reads as too old', () => parseBackup(serialiseBackup(backup()), 3), { ok: false, error: TOO_OLD }],
  ['A file with no data section is damaged', () => damagedBy((f) => { delete f.data; }), true],
  ['Completion with an unknown habitId is damaged', () => damagedBy((f) => { f.data.completions[0].habitId = 'nobody'; }), true],
  ['Two completions with the same habit and date are damaged', () => damagedBy((f) => { f.data.completions[1] = { ...f.data.completions[0] }; }), true],
  ['Two habits with the same id are damaged', () => damagedBy((f) => { f.data.habits[1].id = f.data.habits[0].id; }), true],
  ['Habit with an empty name is damaged', () => damagedBy((f) => { f.data.habits[0].name = ''; }), true],
  ['The first problem is named', () => parsed((f) => { f.data.habits[2].name = ''; }).error, 'This backup is damaged: habit 3 has no name.'],
  ['Habit with colour "red" is damaged', () => damagedBy((f) => { f.data.habits[0].colour = 'red'; }), true],
  ['Version with setTime "7:00" is damaged', () => damagedBy((f) => { f.data.habits[0].schedule[0].setTime = '7:00'; }), true],
  ['Version with weekday 8 is damaged', () => damagedBy((f) => { f.data.habits[0].schedule[0].days = [8]; }), true],
  ['Completion with date "2026-11-1" is damaged', () => damagedBy((f) => { f.data.completions[0].date = '2026-11-1'; }), true],
  ['Completion with impossible date is damaged', () => damagedBy((f) => { f.data.completions[0].date = '2026-02-31'; }), true],
  ['Habit with an empty schedule is damaged', () => damagedBy((f) => { f.data.habits[0].schedule = []; }), true],
  ['Habit with no active periods is damaged', () => damagedBy((f) => { f.data.habits[0].activePeriods = []; }), true],
  ['Completion with a text late flag is damaged', () => damagedBy((f) => { f.data.completions[0].late = 'no'; }), true],
  ['Colour outside the palette is accepted', () => parsed((f) => { f.data.habits[0].colour = '#123456'; }).ok, true],
  ['An empty period (removed on the day it was added) is accepted', () => parsed((f) => {
    f.data.habits[1].activePeriods = [{ start: '2026-11-08', end: '2026-11-07' }];
  }).ok, true],
  ['A one-time habit with no days is accepted', () => parsed(() => {}).backup.data.habits[2].schedule[0].days, []],
  ['Extra field on a habit: accepted', () => parsed((f) => { f.data.habits[0].foo = 1; }).ok, true],
  ['Extra field on a habit: dropped by cleanRows', () => {
    const { backup: b } = parsed((f) => { f.data.habits[0].foo = 1; });
    return 'foo' in cleanRows(b).habits[0];
  }, false],
  ['Extra fields on nested rows and completions are dropped', () => {
    const { backup: b } = parsed((f) => {
      f.data.habits[0].schedule[0].foo = 1;
      f.data.habits[0].activePeriods[0].foo = 1;
      f.data.completions[0].foo = 1;
    });
    const rows = cleanRows(b);
    return ['foo' in rows.habits[0].schedule[0], 'foo' in rows.habits[0].activePeriods[0], 'foo' in rows.completions[0]];
  }, [false, false, false]],
  ['A CSV text is refused', () => parseBackup(buildCsv(HABITS, COMPLETIONS), 2), { ok: false, error: NOT_A_BACKUP }],
  ['A valid backup has no problems', () => validateBackup(backup()), null],

  // Upgrades
  ['Upgrade: both steps applied, in order', () => {
    const up = upgradeBackup(backup(), { 2: addFieldX, 3: addFieldY }, 4);
    return [up.schemaVersion, up.x, up.y, up.order];
  }, [4, 'added', 'added', ['x', 'y']]],
  ['Upgrade: a missing step throws', () => {
    try {
      upgradeBackup(backup(), { 3: addFieldY }, 4);
      return 'did not throw';
    } catch (err) {
      return err.message;
    }
  }, TOO_OLD],
  ['Upgrade: no steps gives an unchanged copy', () => {
    const b = backup();
    const up = upgradeBackup(b, {}, 2);
    return [up === b, JSON.stringify(up) === JSON.stringify(b)];
  }, [false, true]],
  ['Upgrade: the argument is unchanged', () => {
    const b = backup();
    const before = JSON.stringify(b);
    upgradeBackup(b, { 2: addFieldX, 3: addFieldY }, 4);
    return JSON.stringify(b) === before;
  }, true],
  ['parseBackup applies migrations, then validates', () => {
    const result = parseBackup(serialiseBackup(backup()), 3, { 2: addFieldX });
    return [result.ok, result.backup.schemaVersion, result.backup.x];
  }, [true, 3, 'added']],
  ['MIGRATIONS is empty at schema 2', () => MIGRATIONS, {}],

  // Reminder
  ['No backup, 3 habits: reminder', () => needsReminder(null, NOW, 3), true],
  ['No backup, 0 habits: no reminder', () => needsReminder(null, NOW, 0), false],
  ['Exactly 7 days ago: no reminder', () => needsReminder(NOW - 7 * DAY, NOW, 3), false],
  ['7 days and 1 minute ago: reminder', () => needsReminder(NOW - 7 * DAY - MIN, NOW, 3), true],
  ['2 days ago: no reminder', () => needsReminder(NOW - 2 * DAY, NOW, 3), false],
  ['8 days ago, 0 habits: no reminder', () => needsReminder(NOW - 8 * DAY, NOW, 0), false],
  ['daysSince(null)', () => daysSince(null, NOW), null],
  ['daysSince, 8 days 23 hours ago', () => daysSince(NOW - 8 * DAY - 23 * 60 * MIN, NOW), 8],

  // Wording
  ['formatBackupTime', () => formatBackupTime(at(2026, 11, 5, 21, 30)), 'Thu 5 Nov 2026 21:30'],
  ['lastBackupLine, never', () => lastBackupLine(null, NOW), 'Last backup: never'],
  ['lastBackupLine, today', () => lastBackupLine(NOW - MIN, NOW), 'Last backup: Tue 10 Nov 2026 21:29 (today)'],
  ['lastBackupLine, 1 day ago', () => lastBackupLine(NOW - DAY, NOW), 'Last backup: Mon 9 Nov 2026 21:30 (1 day ago)'],
  ['bannerText, no backup', () => bannerText(null, NOW), 'No backup yet'],
  ['bannerText, 8 days ago', () => bannerText(NOW - 8 * DAY, NOW), 'Last backup: 8 days ago'],

  // CSV
  ['CSV starts with the byte-order mark and header', () => buildCsv(HABITS, COMPLETIONS).startsWith(
    `${BOM}Date,Habit,Set time,Completed at,Deviation (min),Deviation,Late,Extra,Habit status,Habit ID\r\n`
  ), true],
  ['CSV lines end with CRLF, and no bare LF', () => {
    const text = buildCsv(HABITS, COMPLETIONS);
    return [text.endsWith('\r\n'), text.replace(/\r\n/g, '').includes('\n')];
  }, [true, false]],
  ['CSV has one row per completion', () => csvLines().length, 6], // header, 4 rows, empty after the last CRLF
  ['CSV sorted by date', () => {
    const shuffled = [c4, c2, c1, c3];
    return buildCsv(HABITS, shuffled).split('\r\n').slice(1, 5).map((l) => l.split(',')[0]);
  }, ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-08']],
  ['CSV same date sorted by habit createdAt', () => {
    const r = { ...c2, date: '2026-11-02' };
    return buildCsv(HABITS, [r, c1]).split('\r\n').slice(1, 3).map((l) => l.split(',')[1]);
  }, ['Gym', 'Read']],
  ['csvField with a comma', () => csvField('a,b'), '"a,b"'],
  ['csvField with quotes', () => csvField('say "hi"'), '"say ""hi"""'],
  ['csvField formula guard', () => csvField('=SUM(A1)'), "'=SUM(A1)"],
  ['csvField guard on a leading minus', () => csvField('-5 min'), "'-5 min"],
  ['csvField guard on + and @', () => [csvField('+1'), csvField('@x')], ["'+1", "'@x"]],
  ['csvField with a line break is quoted', () => csvField('line\nbreak'), '"line\nbreak"'],
  ['csvField guard and quoting together', () => csvField('=Test, "quoted"'), '"\'=Test, ""quoted"""'],
  ['A late completion has Late = Yes', () => csvLines()[2], '2026-11-03,Read,22:00,2026-11-04 10:30,750,12 h 30 min late,Yes,No,discontinued,read-id'],
  ['The extra has Extra = Yes', () => csvLines()[4], '2026-11-08,Gym,07:00,2026-11-08 09:00,120,2 h late,No,Yes,active,gym-id'],
  ['Deviation (min) -10 has no quote mark', () => csvLines()[3], '2026-11-05,Read,22:00,2026-11-05 21:50,-10,10 min early,No,No,discontinued,read-id'],
  ['CSV Extra ignores the stored flag: Gym 2026-11-10 is No', () => analysisCsvExtra('2026-11-10', 'Gym'), 'No'],
  ['CSV Extra ignores the stored flag: Walk 2026-11-16 is Yes', () => analysisCsvExtra('2026-11-16', 'Walk'), 'Yes'],
  ['CSV Extra with no habit to ask uses the stored flag', () => buildCsv([], [{ ...c4, habitId: 'gone' }]).split('\r\n')[1].split(',')[7], 'Yes'],

  // Preview
  ['previewText, exact wording', () => previewText(backup(), { habits: 1, completions: 2 }),
    'Backup from 2026-11-10 21:30 (app 0.5.0): 3 habits, 4 completions. This replaces everything now in the app (1 habits, 2 completions). This cannot be undone. Take a backup first if you want to keep the current data.'],
];

const results = cases.map(([label, fn, expected]) => {
  let actual;
  let threw = false;
  try {
    actual = fn();
  } catch (err) {
    actual = `threw: ${err.message}`;
    threw = true;
  }
  const pass = !threw && JSON.stringify(actual) === JSON.stringify(expected);
  return { label, expected, actual, pass };
});

const passed = results.filter((r) => r.pass).length;
const total = `${passed} / ${results.length} passed`;
const allPassed = passed === results.length;

for (const r of results) {
  const line = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
  if (r.pass) console.log(line); else console.error(line);
}
console.log(total);

if (typeof document !== 'undefined') {
  const summary = document.getElementById('backup-summary');
  summary.textContent = total;
  summary.className = allPassed ? 'pass' : 'fail';
  const list = document.getElementById('backup-results');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'pass' : 'fail';
    li.textContent = `${r.pass ? 'PASS' : 'FAIL'}  ${r.label}  (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`;
    list.appendChild(li);
  }
} else if (typeof process !== 'undefined' && !allPassed) {
  process.exitCode = 1;
}

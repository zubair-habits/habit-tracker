# Module 4: Backup and restore

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 4. It changes three things in `CLAUDE.md` (permission mode, backup file name, Restore wording), listed under "Decisions made for this module"; step 1 writes them. Every other rule in sections 6, 7, 8 and 10 stays as it is. If anything here disagrees with `CLAUDE.md`, stop and ask the owner.

## Goal

The owner can back up everything to Google Drive in two taps, restore it onto an empty app, export completions as CSV for Excel, and is reminded when the last backup is over 7 days old. The module ends with a real destructive test: back up, clear the app's data on the phone, restore, and get every record back. **Real daily use starts after this module.**

## Starting point (state of `main` after Module 3)

- Version `0.4.1`. Schema version 2 (`SCHEMA_VERSION` in `js/db.js`). **No database version and no migration in this module.** The `settings` key `lastBackupAt` is already defined in section 10; it is simply written for the first time.
- `js/db.js` exports `db`, `openDb`, `getSetting`, `setSetting`, `recordCounts`, `isPersisted`, `SCHEMA_VERSION`.
- `js/dialog.js` exports `confirmDialog`, `choiceDialog`, `closeAllDialogs`. `js/about.js` exports `refreshAbout()`. `js/habit-logic.js` exports `PALETTE`, `formatDate`. `js/calendar-logic.js` exports `formatClock`, `formatDeviation`. `js/dates.js` exports `todayStr`, `toDateStr`.
- `js/theme.js` reads `theme` from settings on start and copies it to `localStorage` (`ht-theme`).
- The Export view holds the placeholder "Coming in Module 4". Settings holds Theme and About.
- The phone holds test habits (Test Gym, Test Read, Test Dentist, maybe Test Late) and a few completions. All of it is test data.
- Node is **not** installed on the laptop. Tests run on the browser test page (`tests/index.html`).
- **How this module is run:** a Local session in the Claude desktop app on `app_3`, permission mode **Auto**, with the project rules in `.claude/settings.json` (step 1). The owner may drive it from the phone through Remote Control. Claude runs the browser checks itself, as in Modules 2 and 3; the owner does the phone tests.

## Decisions made for this module

If the owner wants a different choice, they change it before step 2.

1. **Permission mode Auto is allowed from this module on**, but only with the committed `.claude/settings.json`. Its `ask` rules force a permission box for `git push`, `git merge`, `git rebase`, `git reset` and `git config` even in Auto mode, so the section 14 push rule still holds. Its `deny` rules block recursive deletes, `git clean`, `git restore`, force pushes, network downloads (`curl`, `wget`), package installers, and edits to `manifest.webmanifest`, `vendor/` and `.claude/settings.json` itself. If a step needs a denied action, stop and ask the owner; never work round a rule with another command spelling. Auto mode is not a reason to skip the stop points in "Steps".
2. **The backup file is shared as text, not JSON.** Android Chrome's share sheet refuses `.json` files (Chromium allows only PDF, images, audio, video and a few text types: `.txt`, `.csv`, `.html`, `.css`). So:
   - **Back up** shares `habit-backup-YYYY-MM-DD.txt` with type `text/plain`. The contents are JSON.
   - A second button, **Download instead**, saves `habit-backup-YYYY-MM-DD.json` to the phone's Downloads folder. It is also used automatically when `navigator.canShare({ files })` is false.
   - Restore accepts both `.txt` and `.json`. It decides by the contents, never by the name.
   Section 7's file name changes accordingly (step 1). `.gitignore` already blocks `habit-backup-*.json`; step 1 changes that line to `habit-backup-*` so `.txt` backups are blocked too.
3. **File format** (`kind` and `app` identify it; `schemaVersion` drives upgrades):
   ```json
   {
     "app": "habit-tracker",
     "kind": "backup",
     "schemaVersion": 2,
     "appVersion": "0.5.0",
     "exportedAt": 1793000000000,
     "exportedAtLocal": "2026-11-06 21:30",
     "counts": { "habits": 4, "completions": 7 },
     "data": {
       "habits": [ …rows exactly as stored… ],
       "completions": [ …rows exactly as stored… ],
       "settings": [ { "key": "theme", "value": "dark" } ]
     }
   }
   ```
   - Rows are copied exactly as stored (section 10), including discontinued habits, every active period and every schedule version. Nothing is recalculated (the stored `extra`, `late`, `setTime` and `deviationMin` are kept as they are).
   - `settings` in the file holds only `theme`. `schemaVersion` is the top-level field; `lastBackupAt` is not copied (see decision 6).
   - Pretty-printed with 2-space indents, so the owner can open it in a text viewer.
4. **When a backup counts as taken.** `lastBackupAt` is set to `exportedAt` only when the share promise resolves, or when the download starts. If the owner closes the share sheet (`AbortError`), nothing is recorded and the message reads "Backup not saved." The share must be started straight from the tap: read the database first, then call `navigator.share` with no other waiting in between, because Chrome allows a share only shortly after a tap.
5. **Restore checks** (all in pure logic, `js/backup-logic.js`). The file is refused **whole** if any check fails; nothing is partly restored. Messages:
   - not valid JSON, or `app`/`kind` wrong → "This isn't a Habit Tracker backup."
   - `schemaVersion` higher than `SCHEMA_VERSION` → "This backup was made by a newer version of the app. Update the app first."
   - `schemaVersion` lower than 2, or no upgrade path → "This backup is too old to restore." (Backups only exist from schema 2, so this should never be seen.)
   - any row fails the section 10 shape checks below → "This backup is damaged: <first problem>." (for example "habit 3 has no name")
   Row checks: every habit has a string `id` (unique), a non-empty `name`, `colour` matching `#rrggbb`, `status` `active` or `discontinued`, numeric `createdAt`, a non-empty `activePeriods` list of `{ start, end }` with valid dates and `end` `null` or a date, and a non-empty `schedule` list whose versions have a valid `from`, boolean `repeat`, `days` of ISO weekdays, `date` (`null` or a date) and `setTime` `HH:MM`. Every completion has a `habitId` that exists in the file's habits, a valid `date`, `setTime` `HH:MM`, numeric `completedAt` and `deviationMin`, boolean `late` and `extra`, and no two completions share `[habitId+date]`. Unknown fields on a row are dropped; known fields are kept exactly.
   Colours outside `PALETTE` are **allowed** (the palette may change later; old backups must still restore).
6. **Restore flow.** Settings → **Restore** → file picker (`accept=".json,.txt,application/json,text/plain"`). After the checks pass, `confirmDialog` with `danger: true`:
   - title "Replace all data?"
   - message: "Backup from <exportedAtLocal> (app <appVersion>): <H> habits, <C> completions. This replaces everything now in the app (<h> habits, <c> completions). This cannot be undone. Take a backup first if you want to keep the current data."
   - buttons **Replace** / **Cancel**
   On Replace, **one** Dexie `rw` transaction over `habits`, `completions` and `settings`: clear the three tables, `bulkAdd` the upgraded rows, write `schemaVersion = SCHEMA_VERSION`, `theme` from the file (or `system` if missing or invalid), and `lastBackupAt = exportedAt` (the data now matches that backup). If anything throws, the transaction rolls back and the old data stays; show "Restore failed. Nothing was changed." Then copy the theme to `localStorage` (`ht-theme`) and reload the page (`location.reload()`), so every view redraws from the restored data. Restore is one of the only two delete paths in the app (section 6); nothing else in this module deletes anything.
7. **Upgrading older backups.** `upgradeBackup(file, migrations, target)` applies migrations one step at a time, from `file.schemaVersion` up to `target`. `MIGRATIONS` is an object keyed by the version it upgrades **from** (`{ 2: fn }` upgrades 2 to 3). Today it is empty, because the current schema is 2. Every future module that adds a Dexie version **must** add the matching backup migration in the same commit; step 1 adds this rule to section 6. The tests prove the chain with fake migrations.
8. **CSV export** (Export view → **Export CSV**). One file `habit-completions-YYYY-MM-DD.csv`, shared as `text/csv` (allowed by Chrome), with download as the fallback. One row per completion, sorted by date, then habit `createdAt`. Columns:
   `Date, Habit, Set time, Completed at, Deviation (min), Deviation, Late, Extra, Habit status, Habit ID`
   - `Completed at` is local "YYYY-MM-DD HH:MM". `Deviation` is `formatDeviation`. `Late` and `Extra` are `Yes`/`No`.
   - RFC 4180 quoting: a field containing `,` `"` or a line break is wrapped in quotes, with `"` doubled. Lines end with `\r\n`. The file starts with a UTF-8 byte-order mark so Excel shows any non-English names correctly.
   - A field starting with `=`, `+`, `-` or `@` gets a leading `'`, so Excel never treats a habit name as a formula. `Deviation (min)` is a number and is exempt.
   CSV never updates `lastBackupAt` and is never accepted by Restore.
9. **Where the buttons live.**
   - **Settings**, new **Backup** card above About: "Last backup: <date and time> (N days ago)" or "Last backup: never"; **Back up**, **Download instead**, **Restore**.
   - **Export** view: the placeholder goes. A **Backup** card with **Back up** and **Download instead** (same functions), and a **CSV** card with **Export CSV** and one line: "For reading in Excel. Can't be restored." The yearly PDF arrives in Module 6.
   - **About** gains "Last backup" (date and time, or "Never").
10. **7-day banner.** On start, and whenever the app returns to the screen (`visibilitychange`), show a banner under the header when **there is at least one habit** and `lastBackupAt` is `null` or more than 7 × 24 hours ago: "Last backup: N days ago" (or "No backup yet") with **Back up** and **Later**. Back up runs decision 4 straight from that tap; on success the banner hides. Later hides it until the app is next opened. It never covers the update banner; if both show, the update banner stays on top.
11. **Messages** after each action appear in a small status line under the buttons ("Backup shared.", "Backup downloaded.", "Backup not saved.", "CSV shared."), not in `alert()`.

## Files

| File | Action |
|---|---|
| `js/backup-logic.js` | New. **Pure functions, no database and no page access.** See below |
| `js/backup.js` | New. Reads the database, builds files, share/download, restore transaction, last-backup reads |
| `js/backup-view.js` | New. Settings Backup card, Export view cards, 7-day banner, file picker |
| `js/about.js` | Adds "Last backup" |
| `index.html` | Backup card in Settings, Export view cards, backup banner, hidden file input; Export placeholder removed |
| `app.js` | Start the backup view and banner |
| `styles.css` | Cards, banner, status line; both themes and 360 px wide |
| `sw.js` | Add the new `js/` files to `APP_FILES` |
| `version.js` | `0.5.0`, then `0.5.1` for the update test |
| `tests/backup-logic.test.js` | New, on the browser test page |
| `tests/index.html` | Also runs `backup-logic.test.js` |
| `.gitignore` | `habit-backup-*.json` → `habit-backup-*` (step 1) |
| `.claude/settings.json` | New, supplied by the owner with this spec (step 1 commits it) |
| `.claude/skills/build-module/SKILL.md`, `docs/setup/build-module-SKILL.md` | Push line updated (step 1); edit both together |
| `CLAUDE.md` | Step 1 changes, and Status at the end |

## `js/backup-logic.js` (pure functions)

`nowMs`, dates and `SCHEMA_VERSION` are passed in, so tests choose them. Use `js/dates.js` helpers; never `toISOString()`.

- `backupFileName(dateStr, ext)` → `habit-backup-2026-11-06.txt` / `.json`.
- `csvFileName(dateStr)` → `habit-completions-2026-11-06.csv`.
- `buildBackup({ habits, completions, settings }, { appVersion, schemaVersion, nowMs })` returns the object from decision 3. `exportedAtLocal` is local "YYYY-MM-DD HH:MM" from `nowMs`. Only the `theme` setting is copied.
- `serialiseBackup(obj)` → `JSON.stringify(obj, null, 2)`.
- `parseBackup(text, currentSchema)` returns `{ ok: true, backup }` or `{ ok: false, error }` with decision 5's exact messages. It runs `validateBackup` after `upgradeBackup`.
- `validateBackup(backup)` returns `null` or the first problem as text.
- `cleanRows(backup)` returns the rows with unknown fields dropped.
- `upgradeBackup(backup, migrations, target)` returns a new object at `target`, or throws "This backup is too old to restore." when a step is missing. Never changes its argument.
- `MIGRATIONS` = `{}`.
- `restorePlan(backup)` returns `{ habits, completions, settings }`, the exact rows the restore transaction writes, including `schemaVersion`, `theme` (or `system`) and `lastBackupAt = exportedAt`.
- `previewText(backup, current)` returns decision 6's message.
- `daysSince(lastMs, nowMs)` → whole days, rounded down; `null` when `lastMs` is `null`.
- `needsReminder(lastMs, nowMs, habitCount)` → true when `habitCount > 0` and (`lastMs` is `null` or `nowMs − lastMs > 7 × 86 400 000`).
- `buildCsv(habits, completions)` returns the CSV text from decision 8, BOM included.
- `csvField(value)` quoting and formula guard.

## Steps

The owner said Auto mode for this module, so Claude does not stop before every step. It **must** stop at: step 2 (plan), every push, both phone tests, and the clear-data test in step 10. It also stops for any decision this spec does not settle, any guess that could affect data, any denied action, or any problem it cannot solve after two attempts.

1. **Check the starting point and update `CLAUDE.md`.**
   - Check you are on an up-to-date `main` with nothing uncommitted apart from `docs/modules/module-4.md` and `.claude/settings.json`. Check that `.claude/settings.json` is the file the owner supplied (it has `ask` rules for `git push` and `deny` rules for `rm -rf` and `curl`); if it is missing, stop.
   - Edit `CLAUDE.md`:
     - Section 14: replace "Do not use Auto, Accept edits or Bypass permissions modes in this project; Manual only." with "Permission mode **Manual** or **Auto**. Auto is allowed only while `.claude/settings.json` (committed) is in place: its `ask` rules force a permission box for `git push` and other history-changing git commands even in Auto, and its `deny` rules block destructive and network commands. Never edit that file, and never work round a rule with another command spelling. Accept edits and Bypass permissions are never used." Also change "permission mode **Manual**" in the Session setup line to "permission mode **Manual** or **Auto** (see below)".
     - Section 7, Backup: the file is shared as `habit-backup-YYYY-MM-DD.txt` (JSON inside), because Android Chrome cannot share `.json`; **Download instead** saves `habit-backup-YYYY-MM-DD.json`. Restore accepts either and judges by contents.
     - Section 6: add "Every new Dexie version must ship with a matching backup migration in `MIGRATIONS` (`js/backup-logic.js`) in the same commit, so older backups always restore."
     - Section 5: add the row "Backup shared as `.json` | Shared as `.txt` with JSON inside; `.json` by download | Android Chrome's share sheet refuses `.json` files".
     - Section 15: add `.claude/settings.json` ("Project permission rules for Auto mode. Never edited by Claude").
   - `.gitignore`: `habit-backup-*.json` → `habit-backup-*`.
   - Both copies of the build-module instructions: replace "You cannot push to GitHub or download files. When either is due, give the owner the exact command to type, starting with `!` (Git Bash syntax)." with "Pushing follows the **Pushing (Local sessions)** rule in `CLAUDE.md` section 14. Downloads: give the owner the exact command to type."
   - Commit: "Module 4 spec, Auto-mode permission rules and CLAUDE.md updates".
2. **Plan.** List the files and anything you would do differently, with the reason. **Stop and wait for approval.**
3. **`js/backup-logic.js`** and **`tests/backup-logic.test.js`** (cases below). Add the test file to `tests/index.html` and run the page in the desktop app's built-in browser against a temporary local web server sending `Cache-Control: no-store` (Module 3 note). All earlier tests must still pass. **Do not continue until every case passes.**
4. **`js/backup.js`.**
5. **The views:** `index.html`, `js/backup-view.js`, `js/about.js`, `styles.css`, `app.js`.
6. **Service worker and version:** add every new file to `APP_FILES`, set `version.js` to `0.5.0`.
7. **Checks before deploying.** Run these yourself in the built-in browser against the temporary server, with fake data created for the check. Unregister the service worker and clear its caches before each reload of new code. Report each as PASS or FAIL. Remove the temporary data, server script and any downloaded test files afterwards (the deny rules block `rm -r`; delete single files by name, and ask the owner if a folder must go).
   - Test page: every case passes
   - With 3 fake habits (one discontinued, one with two schedule versions) and 4 completions (one late, one extra): **Download instead** produces `habit-backup-<today>.json`; its contents match decision 3 and the counts are right; Last backup in Settings and About updates
   - The desktop browser has no file share: **Back up** falls back to download (the `.txt` share is tested on the phone)
   - The 7-day banner: shows with habits and no backup; hidden after a backup; shows again when `lastBackupAt` is set by hand to 8 days ago; hidden with zero habits; **Later** hides it until reload
   - Restore the downloaded file onto a different set of fake data: preview text is right; **Cancel** changes nothing; **Replace** gives back exactly the backed-up rows (compare every row in IndexedDB with the file), theme from the file, `schemaVersion` 2, `lastBackupAt` = the file's `exportedAt`
   - The same file renamed to `.txt` restores the same way
   - Refused files, each with nothing changed afterwards: a CSV export, a file with `"schemaVersion": 3`, a file with one completion's `habitId` changed to an unknown ID, a file with two completions sharing a key, an empty file
   - A forced failure in the middle of the restore transaction (temporary code, removed afterwards) leaves the old data in place and shows "Restore failed. Nothing was changed."
   - **Export CSV**: opens in a text viewer with the BOM, header row, one row per completion, a habit named `=Test, "quoted"` written as `"'=Test, ""quoted"""`
   - Offline reload: Settings and Export work
   - Both themes and a 360 px wide window: cards, banner and status line are readable
8. **Commit and deploy.** Commit on `main`. **Stop** and push under the section 14 rule (the permission box will appear even in Auto mode).
9. **Phone test, part 1.** The owner opens the installed app and taps the update banner (version 0.5.0). On the phone:
   - The 7-day banner shows "No backup yet"
   - **Back up** → the share sheet opens with `habit-backup-<today>.txt` → **Drive** → save it in a folder named `Habit backups`. The banner hides; Settings shows Last backup today
   - **Download instead** → the `.json` file appears in Downloads
   - Open the Drive file in Drive's viewer: readable JSON with the test habits
   - **Export CSV** → share to Drive or download; open it in the Excel or Sheets app: one row per completion, correct times
   - Note the About counts (habits H, completions C)
   **Phone test, part 2 (the update is safe).** Make one tiny visible change, set `version.js` to `0.5.1`, commit, push under the section 14 rule. The owner reopens the app and taps the banner. Expected: version 0.5.1, About counts still H and C, Last backup unchanged.
10. **Phone test, part 3 (the real test: clear and restore).** **Stop first** and check with the owner that the Drive backup from part 1 exists and opens. Then the owner:
    1. Takes one more **Back up** to Drive (so the file has the current data).
    2. Closes the app fully.
    3. Chrome → ⋮ → Settings → Site settings → All sites → `zubair-habits.github.io` → **Delete data** (wording varies by Chrome version: "Clear & reset" or "Delete"). This deletes the app's database. It does **not** uninstall the app.
    4. Opens the app from the home-screen icon. Expected: empty calendar, About shows habits 0, completions 0, no 7-day banner (there are no habits).
    5. Settings → **Restore** → picks the `.txt` file from Drive → checks the preview counts are H and C → **Replace**.
    Expected after the reload: About shows habits H, completions C; the calendar shows the same dots; Test Gym's History shows both schedule versions; the discontinued habit is still in Discontinued; Theme is what it was; persistent storage Granted (if Not granted, close and reopen from the icon once, as in Module 1).
    If the restore fails: do not retry blindly. Record the exact message, and restore from the downloaded `.json` instead.
11. **Close the module.** Update Status in `CLAUDE.md`: "Module 4 complete (date), next is Module 5", current version `0.5.1`, "Real daily use started (date). The test habits may now be discontinued or kept; all data from here on is real", and "Notes from Module 4" with anything that differed from this spec. Commit, push under the section 14 rule, then stop. Do not start Module 5.

## Test cases (`tests/backup-logic.test.js`)

Build habits with `buildNewHabit` and `applyEdit`/`applyDiscontinue` from `habit-logic.js`, and completions with `buildCompletion` from `calendar-logic.js`, so the modules are tested together. Create `nowMs` with `new Date(y, m − 1, d, hh, mm).getTime()`. Fixture: today `2026-11-10`. Habits, all created 2026-11-01: Gym (Mon/Wed/Fri 07:00, edited to Tue/Wed/Fri on 2026-11-05), Read (every day 22:00, discontinued with today 2026-11-08), Dentist (one-time 2026-11-20 18:00). Completions: Gym 2026-11-02 at 2026-11-02 07:00 (on time); Read 2026-11-03 at 2026-11-04 10:30 (750 min, late); Read 2026-11-05 at 21:50 (10 min early); Gym 2026-11-08 (Sunday) at 09:00 (extra).

**Building**
- `backupFileName("2026-11-06", "txt")` → `habit-backup-2026-11-06.txt`; `csvFileName` likewise
- `buildBackup` → `app`, `kind`, `schemaVersion` 2, `appVersion` as passed, `exportedAt` = `nowMs`, `exportedAtLocal` "2026-11-10 21:30" for 21:30 local, `counts` 3 and 4
- Settings in the file hold only `theme`; `schemaVersion` and `lastBackupAt` rows are not copied
- Habit rows deep-equal the input rows (Gym still has two versions; Read still discontinued with its period end)
- The input objects are unchanged after every call

**Round trip**
- `parseBackup(serialiseBackup(buildBackup(...)), 2)` → `ok: true`, and `restorePlan` gives habits and completions deep-equal to the originals
- `restorePlan` settings → `schemaVersion` 2, `theme` from the file, `lastBackupAt` = `exportedAt`; a file with no theme → `system`; theme `"blue"` → `system`

**Refusals** (exact messages from decision 5)
- `"hello"` → "This isn't a Habit Tracker backup."
- valid JSON with `app: "other"` → same
- `schemaVersion: 3` with current 2 → "This backup was made by a newer version of the app. Update the app first."
- `schemaVersion: 1` → "This backup is too old to restore."
- a completion whose `habitId` is not in habits → starts "This backup is damaged:"
- two completions with the same `habitId` and `date` → damaged
- a habit with empty `name`, a habit with `colour: "red"`, a version with `setTime: "7:00"`, a completion with `date: "2026-11-1"`, a habit with an empty `schedule` → each damaged
- a habit with `colour: "#123456"` (not in `PALETTE`) → **accepted**
- an extra field `foo` on a habit → accepted, and `cleanRows` drops it
- a CSV text → "This isn't a Habit Tracker backup."

**Upgrades** (fake migrations)
- `upgradeBackup(v2file, { 2: addFieldX, 3: addFieldY }, 4)` → `schemaVersion` 4, both fields present, applied in order
- `upgradeBackup(v2file, { 3: fn }, 4)` → throws "This backup is too old to restore."
- `upgradeBackup(v2file, {}, 2)` → unchanged copy, not the same object
- the argument is unchanged after an upgrade

**Reminder**
- `needsReminder(null, now, 3)` → true; `needsReminder(null, now, 0)` → false
- exactly 7 days ago → false; 7 days and 1 minute ago → true; 2 days ago → false
- `daysSince(null, now)` → `null`; 8 days 23 hours ago → 8

**CSV**
- the text starts with `﻿` and the header row; lines end with `\r\n`
- rows are sorted by date, then habit `createdAt`
- `csvField('a,b')` → `"a,b"`; `csvField('say "hi"')` → `"say ""hi"""`; `csvField('=SUM(A1)')` → `'=SUM(A1)`; `csvField('-5 min')` → `'-5 min`; `csvField('line\nbreak')` is quoted
- a late completion has `Late` = Yes; the extra has `Extra` = Yes; `Deviation (min)` −10 is written as `-10` with no `'`
- a discontinued habit's rows show `Habit status` = discontinued

**Preview**
- `previewText` contains the backup's counts, the current counts, `exportedAtLocal` and `appVersion`

## Done when

- [ ] Every test-page case passes, including all Module 1 to 3 tests.
- [ ] Every item in the step 7 checklist passes.
- [ ] Phone part 1: `.txt` share to Drive, `.json` download, CSV, banner all work.
- [ ] Phone part 2: after the update to 0.5.1, counts and Last backup unchanged.
- [ ] Phone part 3: after deleting the site data, Restore brings back exactly H habits and C completions, both schedule versions, the discontinued habit and the theme.
- [ ] Status in `CLAUDE.md` updated, real use started, pushed.

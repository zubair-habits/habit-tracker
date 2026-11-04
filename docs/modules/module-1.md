# Module 1: Data layer and app shell

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 1; it does not change any rule in sections 6, 7, 8 or 10. If the two ever disagree, stop and ask the owner.

## Goal

Build the parts every later module relies on, and prove that the new database survives an app update on the phone:

1. The real database (Dexie version 2, storage format in `CLAUDE.md` section 10), replacing the test counter through a migration.
2. Local-date helpers that cannot give the wrong day in India (UTC+5:30).
3. `isScheduled(habit, date)`, proven correct by a browser test page.
4. The app shell: top-corner menu and four views (Main, Settings, Analysis, Export).
5. Theme setting (System, Light, Dark) and an extended About panel.

## Starting point (state of `main` at the start of Module 1)

- Version `0.1.2`, set only in `version.js`; `app.js` and `sw.js` import it. `sw.js` is a module service worker.
- `app.js` holds everything: Eruda loader (`?debug=1`), Dexie `version(1)` with `testCounter: 'id'`, the counter, service-worker registration and update banner.
- `styles.css` switches to dark colours with `@media (prefers-color-scheme: dark)` only. There is no manual override yet.
- The phone's app holds the test counter (value 5). Removing it in this module is intended; it is test data.
- The Content Security Policy in `index.html` allows scripts only from `'self'`. **Inline scripts are blocked**, so every script must be a separate file.

## Files

| File | Action |
|---|---|
| `js/dates.js` | New. Local-date helpers |
| `js/db.js` | New. Dexie database, versions 1 and 2, schema-version row, persistent storage |
| `js/schedule.js` | New. `isScheduled` (pure function, no database access) |
| `js/theme.js` | New. Applies the theme from settings; updates the `theme-color` meta tag |
| `js/theme-boot.js` | New, **classic** (non-module) script. Reads the cached theme from `localStorage` and sets `data-theme` on `<html>` before the page draws, so it never flashes the wrong colours |
| `js/views.js` | New. Menu, view switching, browser history for the Android back button |
| `js/about.js` | New. About panel values |
| `app.js` | Rewritten as a short entry file that imports the modules above. Keeps the service-worker and update-banner code unchanged in behaviour |
| `index.html` | Header with menu button; four view sections; counter removed; `<script src="./js/theme-boot.js"></script>` placed in `<head>` **before** the stylesheet |
| `styles.css` | Theme via `data-theme`; menu and view styles |
| `sw.js` | Every new `js/` file added to `APP_FILES`. Nothing else changes |
| `version.js` | `0.2.0`, then `0.2.1` for the second phone test |
| `tests/index.html`, `tests/schedule.test.js` | New test page (not added to `APP_FILES`) |
| `CLAUDE.md` | Status updated at the end |

## Details that are easy to get wrong

**Migration.** Keep `db.version(1).stores({ testCounter: 'id' })` exactly as it is. Add `db.version(2).stores({ habits: 'id, status', completions: '[habitId+date], habitId, date', settings: 'key', testCounter: null })`. Setting `testCounter: null` is how Dexie removes a table. Never edit or remove version 1.

**Schema-version row.** Dexie does not run an upgrade function on a brand-new install, so do not write `schemaVersion` only inside `.upgrade()`. After the database opens, every time, write `settings.schemaVersion = SCHEMA_VERSION` if it is missing or lower. Export `SCHEMA_VERSION = 2` from `js/db.js` only.

**Persistent storage.** After opening: if `navigator.storage.persisted()` is false, call `navigator.storage.persist()`. Android Chrome shows no prompt; it usually grants this to an installed app. Show the result in About.

**Dates.** `js/dates.js` exports:
- `todayStr()` returns today as local `"YYYY-MM-DD"`
- `toDateStr(date)` builds the string from `getFullYear()`, `getMonth() + 1` and `getDate()`, zero-padded
- `parseDateStr(str)` returns `new Date(y, m - 1, d)` at local midnight
- `isoWeekday(str)` returns 1 (Monday) to 7 (Sunday)
- `addDays(str, n)` returns a date string, correct across month and year ends

Never use `toISOString()` or `new Date("YYYY-MM-DD")`. Both work in UTC and give the previous day between midnight and 05:30 in India.

**`isScheduled(habit, dateStr)`**, in this order:
1. If `dateStr` is not inside any active period (`start <= dateStr` and (`end === null` or `dateStr <= end`)), return `false`.
2. Version in effect = the **last** version in `habit.schedule` whose `from <= dateStr`. If there is none, return `false`.
3. If `repeat` is true, return `days.includes(isoWeekday(dateStr))`. Otherwise return `version.date === dateStr`.

Date strings of the form `YYYY-MM-DD` compare correctly as plain strings, so no `Date` objects are needed in this function.

**Theme.** The settings table is the source of truth. `js/theme.js` also copies the choice into `localStorage` (key `ht-theme`) purely so `theme-boot.js` can apply it before the first paint. If `localStorage` fails, the app still works and takes the theme from the settings table a moment later. CSS:
- `:root` holds the light colours.
- `:root[data-theme="dark"]` holds the dark colours.
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …dark colours… } }` handles System.
- "System" means the `data-theme` attribute is removed.
- Update `<meta name="theme-color">` to match the colours actually shown.

**Back button.** Opening a view other than Main pushes a history entry (`history.pushState({ view }, '', '#settings')` and so on). `popstate` returns to the view in the state, defaulting to Main. Pressing back on Main leaves the app as normal. Opening the app with a hash such as `#settings` shows that view. The part after `#` is never sent in the request, so `./#settings` is served from the cached `./` page. Still check it offline.

**Service-worker update code.** Move it from `app.js` into the new entry file unchanged. Do not add `skipWaiting()` to the install event. Updates must still wait for the banner tap.

## Steps

Before every step: explain it in one or two plain sentences, then wait for approval.

1. **Check the starting point and install the command.** Branch `main`. The only uncommitted changes should be `CLAUDE.md`, `.gitignore` and the new `docs/` folder. If anything else is uncommitted, stop and show it. Then create `.claude/skills/build-module/SKILL.md` as an exact copy of `docs/setup/build-module-SKILL.md`; it gives the owner the `/build-module N` command for later modules. Commit everything with the message "Add Module 1 spec and Claude Code helpers", then ask the owner to run `! git push`.
2. **Plan.** List the files from the table above and anything you would do differently, with the reason. Wait for approval.
3. **`js/dates.js`.** Write it. Tell the owner in one sentence why `toISOString()` is banned.
4. **`js/db.js`.** Before writing it, tell the owner plainly: "This removes the test counter from the phone's database when the update is tapped. Nothing else exists there yet." Then write it.
5. **`js/schedule.js`.** Write `isScheduled` exactly as specified.
6. **Test page.** `tests/index.html` uses the same CSP `<meta>` as the app and loads `tests/schedule.test.js` as a module, which imports `../js/schedule.js` and `../js/dates.js`. Each case shows PASS or FAIL, with a total at the top. Cases are below. Write `tests/schedule.test.js` so it also runs in Node with `node tests/schedule.test.js` (printing PASS/FAIL lines and the total; touch the page only when `document` exists), so a cloud session can run the cases without a browser. Ask the owner to open `tests/index.html` with Live Server (right-click the file in VS Code → Open with Live Server). **Do not continue until every case passes.** A CSP error about Live Server's injected script is expected and harmless.
7. **App shell.** `js/views.js`, the new `index.html` structure, menu and views. Main shows "Calendar comes in Module 3"; Analysis shows "Coming in Module 5"; Export shows "Coming in Module 4". Remove every piece of counter code and markup.
8. **Theme and About.** In Settings, a theme choice (System, Light, Dark), then the About panel showing: app version, schema version, persistent storage (Granted / Not granted), and record counts for habits, completions and settings.
9. **Service worker and version.** Add every new `js/` file to `APP_FILES`. Set `version.js` to `0.2.0`. The owner then tests locally with Live Server and Chrome DevTools:
   - Application → IndexedDB → `habit-tracker`: tables `habits`, `completions`, `settings`; no `testCounter`; `settings` has `schemaVersion` = 2.
   - Network set to Offline, then reload: the app still works, including `#settings`.
   - Open Settings, press the browser back button: returns to Main.
   - Theme switches correctly in all three settings, and the choice survives a reload.
   - The test page still passes.
   Wait for the owner's report.
10. **Commit and push.** Commit "Module 1: data layer, isScheduled, app shell, theme". Ask the owner to run `! git push`.
11. **Phone test, part 1** (migration). Wait about a minute for GitHub Pages, then the owner opens the installed app and taps the update banner. Expected: counter gone; About shows version 0.2.0, schema 2, persistent storage Granted, habits 0, completions 0, settings 1 (only `schemaVersion`; `theme` is written when first changed). The owner then sets Theme to **Dark**, and settings becomes 2.
    **Phone test, part 2** (new tables survive an update). Make one tiny visible change (for example the Main placeholder wording), set `version.js` to `0.2.1`, commit, then ask the owner to run `! git push`. The owner reopens the app and taps the banner. Expected: version 0.2.1, Theme still Dark, settings still 2.
    If persistent storage shows Not granted, do not mark the module done. Suggest: open the app from the home-screen icon (not a Chrome tab), use it once, close and reopen. If it is still not granted, record this in Status as an open issue and ask the owner whether to accept it until Module 4.
12. **Close the module.** Update Status in `CLAUDE.md`: "Module 1 complete (date), next is Module 2", current version `0.2.1`, and a "Notes from Module 1" list with anything that differed from this spec. Commit, ask the owner to run `! git push`, then stop. Do not start Module 2.

## Test cases for the test page

Weekday reference: 2026-10-05 is a Monday, 2026-10-08 a Thursday, 2026-10-20 a Tuesday.

**Habit A: schedule change.** Active `{ start: 2026-10-01, end: null }`.
- v1 from 2026-10-01, repeat, days `[1,3,5]` (Mon, Wed, Fri), 07:00
- v2 from 2026-10-12, repeat, days `[2,3,5]` (Tue, Wed, Fri), 07:00

| Date | Expected | Why |
|---|---|---|
| 2026-09-30 | false | before the habit started |
| 2026-10-05 (Mon) | true | v1 |
| 2026-10-06 (Tue) | false | v1 has no Tuesday |
| 2026-10-09 (Fri) | true | v1 |
| 2026-10-12 (Mon) | false | v2 applies from its first day |
| 2026-10-13 (Tue) | true | v2 |
| 2026-10-14 (Wed) | true | in both versions |

**Habit B: discontinued, then merged.** Active `{ 2026-10-01 → 2026-10-07 }` and `{ 2026-10-15 → null }`.
- v1 from 2026-10-01, repeat, every day `[1,2,3,4,5,6,7]`, 06:00
- v2 from 2026-10-15, repeat, every day, 06:00

| Date | Expected | Why |
|---|---|---|
| 2026-10-07 | true | end date is inclusive |
| 2026-10-10 | false | gap between active periods |
| 2026-10-15 | true | second period |

**Habit C: one-time.** Active `{ 2026-10-08 → null }`.
- v1 from 2026-10-08, repeat false, date 2026-10-20, 18:00

| Date | Expected | Why |
|---|---|---|
| 2026-10-19 | false | not the date |
| 2026-10-20 | true | the date |
| 2026-10-27 | false | same weekday a week later |

**Habit D: edited twice on one day.** Active `{ 2026-10-01 → null }`.
- v1 from 2026-10-01, repeat, days `[1]`
- v2 from 2026-10-08, repeat, days `[2]`
- v3 from 2026-10-08, repeat, days `[4]`

| Date | Expected | Why |
|---|---|---|
| 2026-10-05 (Mon) | true | v1 |
| 2026-10-08 (Thu) | true | v3 wins over v2 |
| 2026-10-13 (Tue) | false | v3 is Thursday only |

**Habit E: edge cases.**
- Active `{ 2026-10-01 → null }`, empty schedule: 2026-10-05 → false.
- Active `{ 2026-10-01 → null }`, v1 from 2026-10-10, every day: 2026-10-05 → false (active, but no version yet).

**Date helpers.**
- `isoWeekday("2026-10-05")` → 1; `isoWeekday("2026-10-11")` → 7
- `toDateStr(new Date(2026, 9, 8, 1, 0))` (8 October 2026, 01:00 local) → `"2026-10-08"`
- `addDays("2026-10-31", 1)` → `"2026-11-01"`; `addDays("2026-12-31", 1)` → `"2027-01-01"`; `addDays("2026-03-01", -1)` → `"2026-02-28"`
- `toDateStr(parseDateStr("2026-10-08"))` → `"2026-10-08"`

## Done when

All of these are true:

- [ ] Every test-page case passes.
- [ ] Local checks in step 9 pass.
- [ ] Phone part 1: counter gone, schema 2, persistent storage Granted, counts as expected.
- [ ] Phone part 2: version 0.2.1, Theme still Dark, counts unchanged.
- [ ] Status in `CLAUDE.md` updated and pushed.

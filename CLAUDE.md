# Habit Tracker: Project Handoff and Rules

This file is the single source of truth for the project. It serves two purposes:
- Attach it to a new Claude chat to continue planning without re-explaining.
- Keep it in the root of the repository so Claude Code reads it at the start of every session.

Update the **Status** section at the end of every session.

---

## 1. Status

- **Phase:** Module 5 complete (2026-11-05), next is Module 6.
- **Real daily use started (2026-11-05).** The test habits may now be discontinued or kept; all data from here on is real.
- **Done:**
  - GitHub organisation `zubair-habits` created.
  - GitHub email privacy on: "Keep my email addresses private" and "Block command line pushes that expose my email".
  - No-reply commit email identified (section 3).
  - All data and scheduling decisions settled (section 10).
  - Two-factor authentication turned on.
  - Public repository `habit-tracker` (all lowercase, confirmed) created inside `zubair-habits`, with a README.
  - Repository cloned directly into `C:\Users\zzuba\mera wala\app_3`.
  - Claude Code terminal tool installed (v2.1.294, `C:\Users\zzuba\.local\bin`), added to PATH, and started in `app_3`.
  - **Module 0 (2026-10-08):** scaffold, manifest, service worker, update banner, CSP, Dexie 4.0.11 and Eruda 3.4.1 in `vendor/`, IndexedDB test counter, About panel. GitHub Pages live from `main`, root. App installed on the phone; phone update test passed (0.1.1 → 0.1.2, counter unchanged at 5).
  - **Module 1 (2026-11-05):** Dexie version 2 (`habits`, `completions`, `settings`; `testCounter` removed by migration), `schemaVersion` row, persistent storage request, `js/dates.js`, `isScheduled` in `js/schedule.js` (25 / 25 test cases pass), top-corner menu with Main, Settings, Analysis and Export views and back-button history, theme (System, Light, Dark), extended About panel. Built in a cloud session; merged through pull requests #1 (0.2.0) and #2 (0.2.1). Phone part 1 passed (counter gone; 0.2.0, schema 2, persistent storage Granted, counts 0 / 0 / 1, then settings 2 after choosing Dark). Phone part 2 passed (0.2.1, Theme still Dark, settings still 2).
  - **Module 2 (2026-11-05):** Habits view in the menu: add, edit, recolour, re-time, reschedule, discontinue (soft delete), restart and same-name "continue or new record", with read-only History. New files `js/habit-logic.js` (77 / 77 test cases pass), `js/habits.js`, `js/habits-view.js`, `js/dialog.js`. No database version change (schema still 2). Phone part 1 passed (on 0.3.1, see notes). Phone part 2 passed (0.3.2, the same 3 habits, Test Gym's two-version History kept, About shows Habits 3).
  - **Module 3 (2026-11-05):** the Main view is now the month calendar with coloured dots (done, extra, due, missed, upcoming) and a day sheet: Completed with deviation, Undo, late flag, extras, future days blocked, one completion per habit per day. New files `js/calendar-logic.js` (70 / 70 test cases pass), `js/completions.js`, `js/calendar-view.js`. No database version change (schema still 2). Laptop checks passed. Phone part 1 passed on 0.4.0 (marking a past day was not possible on the phone, see notes). Phone part 2 passed on 0.4.1 (dots, completion times and About counts unchanged).
  - **Module 4 (2026-11-05):** backup and restore. **Back up** shares `habit-backup-<date>.txt` (JSON inside), **Download instead** saves `.json`, Restore accepts both and judges by contents, with checks, a preview and one replace transaction. CSV export, 7-day banner, Last backup in Settings and About. New files `js/backup-logic.js` (88 / 88 test cases pass), `js/backup.js`, `js/backup-view.js`. No database version change (schema still 2). Phone part 1 passed on 0.5.0, part 2 on 0.5.1, part 3 passed: after deleting the site data, Restore from Drive brought everything back.
  - **Module 5 (2026-11-05):** the Analysis view: range buttons, Overview chart, a card per habit with percentage, streaks, timing and on-time, late, missed and extra counts, and weekly and timing charts on tap. Chart.js 4.5.1 in `vendor/`. Counting now uses `isScheduled`, never the stored `extra` flag, in `countDays`, `lastCountedDay`, Analysis and the CSV `Extra` column. New files `js/analysis-logic.js` (74 / 74 test cases pass), `js/charts.js`, `js/analysis-view.js`. No database version change (schema still 2). Test page total 346 / 346. Laptop checks passed. Phone part 1 passed on 0.6.0, part 2 on 0.6.1.
- **Current version:** `0.6.1`. The only place it is set is `version.js`; both `app.js` and `sw.js` (a module service worker) import it.
- **Module 0 decisions:** CSP loosened only for Eruda (inline styles, `data:` fonts/images; no `unsafe-eval`); version lives only in `version.js`; updates wait for the banner tap; offline is cache-first; icon is white "12" on black with green theme colour kept; owner runs `git push` and downloads via `!` (Git Bash).
- **Permanent app address:** `https://zubair-habits.github.io/habit-tracker/`
- **Next:** Module 6 (yearly PDF). Its spec `docs/modules/module-6.md` does not exist yet; write it in the claude.ai planning chat first, add it to the repository, then start with `/build-module 6`.
- **To do once a habit has a week of real data:** repeat the Module 5 manual count (see Notes from Module 5).

### Notes from Module 0
- **CSP:** `style-src 'unsafe-inline'`, `img-src data:` and `font-src data:` are allowed only because Eruda needs them. `unsafe-eval` is refused, so Eruda shows logs and errors but cannot run typed commands. `connect-src 'self'` is unchanged.
- **Icons:** white bold "12" on black, generated locally with a PowerShell `System.Drawing` script. Theme colour is still green `#2e7d5b` (owner may change it to black later; safe to change).
- **New app files** must be added to `APP_FILES` in `sw.js`, or they will not work offline.
- **Local testing:** Live Server's injected inline script is blocked by the CSP. This error is expected and harmless; the page does not auto-reload.
- **Push and downloads:** Claude Code cannot sign in to GitHub or download vendor files itself. The owner runs these by typing `!` before the command in Claude Code. The `!` prompt runs **Git Bash**, so commands must use Bash syntax, not PowerShell.

### Notes from Module 1
- **Cloud session instead of Local:** steps 1 to 9 were done in a cloud session. The owner's Live Server (step 6) and DevTools (step 9) checks were replaced by automated checks with Playwright and headless Chromium against a local web server: 21 checks (test page, IndexedDB tables and `schemaVersion`, offline including `#settings`, back button, theme survives reload) plus simulated upgrades 0.1.2 → 0.2.0 (counter 5 → `testCounter` removed) and 0.2.0 → 0.2.1 (Dark and settings 2 kept). The owner did the phone tests and merged on the GitHub website. Claude pushed only its session branch and never pushed to or merged into `main`.
- **Tests run in Node too:** `node tests/schedule.test.js` (run with `TZ=Asia/Kolkata` and `TZ=UTC`). The test page has its own `tests/tests.css`, which the spec did not list.
- **Back button:** moving from one non-Main view to another replaces the history entry, so one back press always returns to Main. Opening the app at `#settings` puts Main underneath it. A history entry without a saved view (address changed by hand) shows the view named after `#`. This last rule was added after the automated checks found the gap.
- **Theme colours:** dark-mode header `#1d4a37`, dark accent `#4fb386`. The `theme-color` meta reads `--header` from the CSS, so the phone's status bar always matches the header.
- **Update without the banner (known, unchanged since Module 0):** if a new version finishes downloading while the app is open and the app is then fully closed without tapping the banner, Chrome switches to the new version on the next open without a banner. Data is safe either way (migrations run on open). No change made.
- **Update timing:** the app checks for an update only when it opens and when it comes back to the screen. GitHub Pages publishes about 30 seconds after a merge. If the banner does not appear, switch away from the app and back, or close it fully and reopen it.
- **Unverified commits:** commits use the no-reply email without a signature, so GitHub labels them Unverified. The owner accepted this; commits are never re-authored to another email.
- **Laptop updates:** the Claude desktop app has no Terminal pane in cloud sessions. After each merge, update the laptop from the VS Code terminal or PowerShell in `app_3` with `git checkout main`, then `git pull origin main`.
- **Backup before data deploys:** not possible before Module 4 (no backup feature yet). Acceptable in Module 1 because the phone held only the test counter.

### Notes from Module 2
- **Versions differ from the spec:** the spec expected 0.3.0 for phone part 1 and 0.3.1 for part 2. An extra commit (`ca6c0c8`, 0.3.1, wording change only) was already on the laptop when the owner pushed, so the phone went straight to 0.3.1 and part 1 ran on that. Part 2 used 0.3.2 instead. Where that commit came from was not established: it carries Claude's attribution but is not in the session's visible history, and the session restarted around then. Uncommitted edits that undid it also appeared on the laptop. They were checked and the wording went into the 0.3.2 commit; the version was not rolled back.
- **Fewer approval stops:** for this module the owner told Claude not to stop at every step, only for major decisions, big guesses or problems it cannot solve. The section 14 rule is unchanged for other sessions unless the owner says the same again.
- **Local checks without the owner:** Node is not installed on the laptop, so the tests ran on the browser test page, on Indian time only (no UTC run). The owner's Live Server and DevTools checklist (step 7) was replaced by scripted checks in the desktop app's built-in browser against a temporary local Python web server, including a reload with that server shut down for the offline check. The temporary settings file and test data were removed afterwards. The Android back button can only be tested on the phone, and it passed there.
- **Choices the spec left open:** "Continue the old habit" keeps the old habit's spelling of the name. An edit may keep a one-time date that has passed; a restart needs a new date. A restart is refused if an active habit has that name. Tapping a discontinued habit opens a read-only screen with History, Restart and Close. "N days of history" counts scheduled days completed. If several discontinued habits share a name, "most recently discontinued" means the latest last-period end, then the later `createdAt`.
- **Added beyond the spec:** `mostRecentlyDiscontinued`, `formatDate` and `describeHistory` in `js/habit-logic.js`, and an optional `existingDate` for `validateInput`. Changing view closes any open dialog, because a laptop browser's back button changes the view without closing it.
- **Dialogs:** buttons in `js/dialog.js` answer straight away instead of waiting for the `close` event, because the browser delivers that event only when it next draws the page. Module 3's Undo should reuse these dialogs.
- **Known wording:** the discontinue message can read "1 days", because the spec fixes its exact wording. One-time habits stay in the active list after their date until discontinued; the spec has no rule for removing them.
- **Service worker in testing:** it serves files from its cache first, so after editing code on a test address, unregister it and clear its caches before reloading, or the old code runs.

### Notes from Module 3
- **Fewer approval stops:** the owner said "Build mod 3" and Claude took that to mean no stop at every step. Claude stopped for pushes and phone tests. The section 14 rule is unchanged for other sessions unless the owner says the same again.
- **Past-day marking was tested on the laptop only:** the phone's test habits were created on 2026-11-05, so they had no earlier active days. On the laptop a past day showed "3 d 11 h late · Late". The owner accepted the laptop result. Claude offered a "Test Late" habit with a set time of 00:05 to show the Late flag on the phone; whether it was used was not recorded. All data is test data until Module 4 anyway.
- **Pushes:** the owner ran `git push` in the Terminal pane for 0.4.0 and 0.4.1. Claude's own `git push` found nothing left to send both times. The completions count on the phone was reported as unchanged, not as a number.
- **Local checks:** Node is still not installed, so the tests ran on the browser test page, on Indian time only. The Android back button can only be tested on the phone, and it passed there.
- **Choices the spec left open:** the extras heading reads "Also done today" only on today, and "Also done on this day" on other dates. Completed rows show the set time copied onto the completion. The day sheet starts with focus on its title, so no button is ready to fire. A future day with nothing scheduled shows both "Nothing scheduled on this day." and the future-day message.
- **Added beyond the spec:** each `dayEntries` entry also has `setTime`. `dayDots` and `dayEntries` sort by `createdAt` themselves. Undo does not re-check rule 6, because that rule would refuse it with "Already completed."; it deletes the one row by key, in a transaction over `completions` only.
- **Part 2's visible change, kept:** today's date number is green (`--brand`).
- **For Module 5 (dot and flag can disagree):** dots and sheet sections use `isScheduled`, as the spec says, but percentages use the stored `extra` flag. If an extra is marked and the habit is edited the same day so that day becomes scheduled, the dot fills as a normal completion while the row stays `extra: true`. The reverse also happens: a scheduled completion followed by an edit the same day shows as a diamond with `extra: false`. Decide which one Analysis trusts.
- **Testing:** a plain Python web server lets the browser keep old copies of files (0.3.2 ran instead of the new code at first). A throwaway server sending `Cache-Control: no-store`, plus a `cache: 'reload'` fetch of each file once, cured it. Both the server script and `.claude/launch.json` were temporary and are gone.
- **`/build-module` instructions:** they still say Claude cannot push, which is out of date with the section 14 rule. Not changed.

### Notes from Module 4
- **Permission rules file:** the owner's `settings.json` was first found at `.claude/skills/settings.json`, where its rules did nothing. With the owner's approval Claude moved it, unchanged, to `.claude/settings.json`. The rules took effect without a restart: a `curl` command was denied straight away.
- **PowerShell:** the Bash deny rules in `.claude/settings.json` also turn Claude Code's PowerShell tool off on Windows with Git Bash (Claude Code docs, checked 2026-11-05). Adding any `PowerShell(...)` rule would turn it back on, so none are added. Each module's step 1 confirms the PowerShell tool is absent.
- **Added beyond the spec (owner approved):** every new backup gets the same checks Restore uses. If they fail, the file still saves, the status line warns, and `lastBackupAt` is not updated. A share failure other than closing the sheet falls back to download. Neither path was triggered in testing: the first needs a bad row, the second cannot happen on the laptop.
- **Also added:** `formatBackupTime`, `lastBackupLine` and `bannerText` in `js/backup-logic.js`, and extra test cases beyond the spec's list. `CLAUDE.md` section 8 now names `habit-backup-*`.
- **Choices the spec left open:** the backup age reads "today" or "1 day ago". The Restore preview counts the rows in the file, not its `counts` field. Restore ignores a leading byte-order mark. No valid `schemaVersion` reads "This isn't a Habit Tracker backup."; no `data` section reads "This backup is damaged: …". An unreadable file shows "That file couldn't be read." A cancelled CSV share shows "CSV not saved."
- **"Backup shared" limit:** Android reports success when a target such as Drive is picked, not when it finishes saving. Cancelling in Drive's save screen still records a backup. Check the file in Drive now and then.
- **Clearing site data:** this probably removes the app's offline copy too, so the phone was kept online for part 3.
- **Laptop checks that changed:** the built-in browser refused to start a service worker (`register` failed fetching `sw.js`, though the page could fetch it), so the offline check moved to the phone, in airplane mode, and passed in part 1. Downloads were caught inside the page to check their contents, so no real file was saved on the laptop; the phone covered real saving. The forced restore failure replaced `bulkAdd` from the test script, so no temporary code was needed. An old service worker on `localhost:8765` from an earlier module broke that address, so the checks ran on `127.0.0.1:8765`.
- **Node:** still not installed, so tests ran on the browser test page, on Indian time only.
- **Part 2's visible change, kept:** the Export view's CSV heading reads "CSV for Excel".
- **Not recorded:** the owner reported all three phone tests as passed, and "All came back" for part 3, but the Habits and Completions numbers were not given.

### Notes from Module 5
- **The manual count on the phone was thin:** the spec asks for a habit with a week of history, but as far as this file shows, the real habits started on the day of the test, so the count could only be about "1 of 1". The owner reported both phone tests as passed; the Habits and Completions numbers and the card's figures were not given. Multi-week data and a schedule change were checked on the laptop only. With a week of real data, repeat the count: on **This month**, X = filled circles before today plus today's dot if filled, Y = X + faded rings before today, extras = diamonds; the card must match.
- **Two old tests rewritten, with the owner's approval:** "Extra today does not count as completed" and "Extras are left out of x" in `tests/habit-logic.test.js` used a stored `extra: true` on a scheduled day, which decision 1 no longer treats as an extra. They now use a real extra on an unscheduled day.
- **Fake date, differing from the spec (owner approved):** a temporary test server outside the repository served a changed copy of `js/dates.js` with a fixed `todayStr`, in place of a temporary query parameter. The whole app saw that date and no temporary code touched the repository. The same server gave the 404 for Chart.js. It sent `Cache-Control: no-store` on `127.0.0.1:8765`, and it and the fake data were removed afterwards.
- **Chart.js loading:** `await import(...)` worked under the CSP, so the `<script>` fallback was not needed.
- **Bug found by the 360 px check, fixed:** a chart keeps its drawn width, so a chart drawn in a wide window held the page wide after it shrank. `minmax(0, 1fr)` columns and `min-width: 0` on the Analysis grids cured it. Rechecked after a reload at 360 px, not by shrinking a wide window again.
- **Added beyond the spec:** `tests/analysis-fixture.js` (shared by the test files and the laptop checks, not cached by the service worker); `overviewBars` in `js/analysis-logic.js`; a comment correction in `js/habits.js`.
- **Choices the spec left open (owner approved):** an average that rounds to 0 reads "average on time" or "on time (1 completion)", in lower case. An Overview with no bars shows "No scheduled days in this range." An open card with nothing to chart shows "Nothing to chart in this range." Only the top of a card opens and closes it, so touching a chart does not close it. Returning from another app keeps the range and open card; opening Analysis from the menu resets to Last 30 days and collapses Discontinued. A CSV row with no matching habit uses the stored `extra` flag. Also: collapsing Discontinued closes any card open inside it.
- **Known wording:** "1 of 1 scheduled days" follows the spec's fixed wording.
- **Charts stop outside Analysis:** they are destroyed on leaving the view and redrawn on return, so a theme change in Settings shows when Analysis reopens.
- **Laptop checks that changed:** the built-in browser still refuses service workers, so offline moved to the phone (reported as passed in part 1). The CSV was caught inside the page, so no real file was saved. The Android back button was not part of this module's checks.
- **Node:** still not installed, so tests ran on the browser test page, in the laptop's time zone only.
- **Chart.js line endings:** Git warns that it may rewrite `vendor/chart.umd.min.js` with Windows line endings in the laptop's folder. The committed copy is unchanged, so to re-check it use `git cat-file blob HEAD:vendor/chart.umd.min.js | sha256sum`, which gave the spec's SHA-256 at commit time.
- **Part 2's visible change, kept:** the Analysis heading reads "Overview: completion %".
- **Fewer approval stops:** the spec itself set this for Module 5 (Auto mode, stopping at the plan, pushes, phone tests and problems). The section 14 rule is unchanged for other sessions.

---

## 2. Project in one paragraph

A personal habit tracker that runs as an installable web app (PWA) on one Android phone. It opens to a full-month calendar showing every habit as a coloured dot on each day it is scheduled. Each habit repeats on the weekdays the owner picks. Tapping "Completed" records the exact time of the tap and shows how early or late that was against the habit's set time. All data stays on the phone. There is no server. Other people can use the same link and get their own empty, separate copy of the app.

---

## 3. Owner and constraints

- **Owner:** Zubair. New to Git, terminals and web development; explain steps in plain words.
- **GitHub username:** `Zbr-ansr`
- **GitHub organisation (hosts the app):** `zubair-habits`
- **Commit email (no-reply):** `145891905+Zbr-ansr@users.noreply.github.com`. Never use any other email for commits in this repository.
- **Cost:** completely free. The only paid item is Claude Pro. No other paid service, card, or paid tier anywhere.
- **Devices:** Windows 11 laptop (development; only a C: drive), one Android phone with Chrome (daily use). No iOS. No second device.
- **Project folder on the laptop:** `C:\Users\zzuba\mera wala\app_3`. The repository is cloned directly into this folder (no subfolder). Any file for this project saved on the laptop goes here. The path contains a space, so it must be wrapped in quotes in PowerShell.
- **Tools installed:** Git for Windows, VS Code, Claude Code terminal tool (run `claude` from inside `app_3`), Claude desktop app (its Code tab is an alternative to the terminal).
- **Model:** Fable 5.1 or Opus 5.5, chosen with `/model` at the start of each session. The cost rule above decides: if the Fable row in the `/model` picker says **"Requires usage credits"**, Fable would cost extra money, so use Opus. Never accept a usage-credits prompt.
- **Schedule:** built in free time, no deadline. One module per session; each session must end with nothing half-finished.

---

## 4. Features (final)

### Main screen
- Full-month calendar on open, weeks starting on **Monday**; each habit shown as a coloured dot on each day it is scheduled.
- Top-corner menu with four sections: Habits, Settings, Analysis, Export.

### Habits
- Add, edit, recolour, and set the time of any habit at any time.
- **Schedule:** when creating or editing a habit, the owner picks:
  - **Days of the week:** tick any one to seven days (for example Mon, Wed, Fri). An **Every day** shortcut ticks all seven.
  - **Repeats every week** (on by default): the habit appears on the ticked days every week without being re-entered.
  - **Does not repeat:** the habit is for one chosen date only.
- **One set time per habit**, the same on every scheduled day. A habit needing two different times is made as two habits.
- **Changing the schedule later** (for example Mon/Wed/Fri → Tue/Wed/Fri) stays within the same habit. The change applies from the day it is made; past days stay judged against the old schedule; future days use the new one. Analysis, CSV and the PDF follow this automatically. No new habit is needed.
- **Discontinue:** shows "You have continued with this habit for X days out of Y days (Z%). Are you sure you want to remove this habit?" Removal is a soft delete; all history is kept.
- **Re-adding a name that already exists:** ask whether to merge with the old record (continue it) or start a new record under a different name.

### Recording a completion
- Tap a day → choose a habit → tap "Completed".
- The app saves the exact time of the tap and shows the deviation from the set time immediately.
- **One completion per habit per day.**
- **Undo:** a mistaken completion can be removed after a confirmation.
- **Late completion:** a missed past day can be marked completed later. Its deviation is the time from the original intended date and time to the tap. A completion more than 12 hours after the set time is flagged **late**.
- **Extra completion:** a habit can be marked completed on a day it is not scheduled (gym on a Tuesday when it is set for Mon/Wed/Fri). It shows on the calendar but does not count towards percentages.
- **Future days cannot be marked.** Only today and past days.
- A scheduled day with no completion counts as incomplete.

### Analysis
- Completion percentage per habit, based on scheduled days only.
- **Streaks** count consecutive scheduled days completed (Mon, Wed, Fri, Mon is a streak of four).
- Graphs.
- Time deviation per habit: how early or late completions run on average, and how much they vary.
- On-time and late completions are shown separately, so long delays do not distort the timing averages. Extras are shown separately and excluded from percentages.

### Export menu
- **JSON backup** (restorable). See section 7.
- **CSV export** for reading in Excel. Not used for restore.
- **Yearly PDF:** A single-page A4 landscape PDF with one GitHub-contribution-style year grid per habit (weeks starting Monday, at most 10 habits, chosen by tick boxes), each day marked as on the month calendar. Shows a preview before saving.

### Appearance
- Mobile-first.
- Theme follows the phone's light/dark setting by default, with a manual override in Settings.

### Works offline
- Everything works with no internet connection.

---

## 5. Decisions changed from the original idea

| Original | Now | Reason |
|---|---|---|
| PWA plus Cloudflare backend for reminders | PWA only, no backend | Removing reminders removed the only reason for a server |
| Per-habit reminder notifications | **Archived** (section 11) | Every open risk came from notifications |
| Monthly pushed backup reminder | In-app banner if last backup is over 7 days old | No server needed; app is opened daily |
| localStorage | IndexedDB via Dexie.js | Room for years of data; safe schema upgrades |
| CSV as the backup | JSON backup + restore; CSV kept for reading only | CSV cannot rebuild the app's data reliably |
| Backup built near the end | Backup is Module 4, before real daily use | Previous app lost data on reinstall |
| Hosted at `<username>.github.io` | Hosted at `zubair-habits.github.io` | Separate origin; no other app can touch the storage |
| USB debugging with `chrome://inspect` | On-screen console (Eruda) and About panel | USB debugging did not work on the owner's setup |
| Custom-drawn PDF | Year grid drawn on a canvas (the preview), placed on one page with jsPDF | Preview and PDF always match |
| Daily habits only (implied) | Weekday picker with weekly repeat, or a one-time date | Owner decision |
| Schedule fixed once set (unspecified) | Schedule can change; history kept per habit | Owner decision |
| No undo, late or extra entries (unspecified) | Undo, late (over 12 h) and extra completions allowed | Owner decision |
| Menu: Settings, Analysis, Export | Habits, Settings, Analysis, Export | Habits need their own view; Settings gains Backup in Module 4 |
| Backup shared as `.json` | Shared as `.txt` with JSON inside; `.json` by download | Android Chrome's share sheet refuses `.json` files |
| Single year grid with a dot per habit per day | One small grid per habit, stacked, up to 10 per page | Six dots in a 5 mm square are unreadable on paper |

---

## 6. Non-negotiable 1: updates never lose data

Updates and backups are linked: updates must not touch data, and backups are the safety net if something goes wrong anyway.

### How updates work
1. Code changes are pushed to GitHub. GitHub Pages publishes them.
2. Next time the app opens, the service worker downloads the new version in the background.
3. A banner shows "Update available, tap to reload". Tapping it switches to the new version.
4. Data in IndexedDB is never touched by this process.

### Rules that must never be broken
- **Never uninstall the app to update it.** If an update seems to need a reinstall, that is a bug to fix.
- **Never change the address:** never rename the organisation `zubair-habits`, the repository `habit-tracker`, or the manifest's `id`, `start_url` or `scope`. Any of these creates a new, empty storage area.
- The service worker may delete only its own caches (names starting with `ht-`). It must never touch IndexedDB.
- Schema changes happen only through a Dexie version upgrade with a migration. Never delete or rename a table without a migration.
- Every new Dexie version must ship with a matching backup migration in `MIGRATIONS` (`js/backup-logic.js`) in the same commit, so older backups always restore.
- The only code paths allowed to delete data are Restore (after confirmation) and Undo of a single completion (after confirmation).
- One version number, in one place. Bumping it must trigger the update banner.
- **Before deploying any change to the data structure:** take a JSON backup on the phone first.
- **After every deploy:** open the app on the phone, tap the update banner, and check that the record counts in the About panel are unchanged.

---

## 7. Non-negotiable 2: backup and restore

### Backup
- Settings or Export → **Back up** creates a backup file and shares it as `habit-backup-YYYY-MM-DD.txt` (JSON inside), because Android Chrome cannot share `.json`. **Download instead** saves `habit-backup-YYYY-MM-DD.json`.
- Back up opens Android's share sheet with the file attached; the owner saves it to Google Drive. Fallback: download to the Downloads folder.
- The file contains everything: habits (including discontinued ones and their full schedule history), completions, settings, the app version, and a **schema version number**.
- The app records the time of the last backup.

### Backup reminder
- On opening the app, if the last backup is more than 7 days old, a banner asks for a backup.

### Restore
- Settings → **Restore** → pick a backup file. Restore accepts `.txt` or `.json` and judges by the contents, never the name.
- The app checks the file is a habit-tracker backup, then shows its contents (number of habits, number of completions, backup date).
- After confirmation it **replaces** all current data. No merging.
- Older backups are upgraded to the current schema before restoring, using the schema version number. A backup from any earlier version must always restore.

### Persistent storage
- The app requests `navigator.storage.persist()` so Android does not clear its data under storage pressure. The About panel shows whether it was granted. This is the first line of defence; backups are the safety net.

### Real use begins after Module 4
- Data entered before Module 4 is complete counts as test data.

---

## 8. Privacy and security

### What protects the owner's data
- **Data lives only in Chrome's storage on the owner's phone.** There is no server and no database online.
- **The repository contains code only, never data.**
- **Other people using the same link** get their own empty storage on their own device. They cannot see the owner's data, and the owner cannot see theirs. Anyone who forks the repository gets the code only.
- **Separate origin:** the app is hosted under the `zubair-habits` organisation so its storage is isolated from every other GitHub Pages app (browsers isolate storage by domain, not by folder).
- **Content Security Policy:** the app may load files only from itself and may not send data to any other website (`connect-src 'self'`).
- **No outside scripts:** all libraries (Dexie, Chart.js, jsPDF, Eruda) are saved inside the repository in `vendor/`. Nothing is loaded from a CDN.

### Rules
- Two-factor authentication on the GitHub account. No collaborators on the repository.
- GitHub email privacy settings stay on (already done).
- Commits use only the no-reply address in section 3, set as this repository's local Git email.
- `.gitignore` blocks backup and export files (`habit-backup-*`, `*.csv`, exported PDFs, `backups/`, `exports/`).
- Never commit personal data. Test data must be fake.
- Keep the Google Drive backup file private; never share its link.
- Backups are not encrypted. A forgotten password would make every backup useless, and loss is the bigger risk.

### Not covered
- Anyone holding the owner's unlocked phone can open the app. The phone's screen lock is the protection.

---

## 9. Technical stack

| Part | Choice |
|---|---|
| App type | PWA: plain HTML, CSS, JavaScript modules |
| Build step | None. Files run in the browser as written |
| Hosting | GitHub Pages, branch `main`, root folder; includes a `.nojekyll` file |
| Local storage | IndexedDB through Dexie.js (in `vendor/`) |
| Charts | Chart.js (in `vendor/`) |
| PDF | Canvas drawing + jsPDF (in `vendor/`) |
| Debug console | Eruda (in `vendor/`), loaded only when the address ends in `?debug=1` |
| Local testing | VS Code Live Server extension; Chrome DevTools phone-sized view |
| Paths | All paths relative (`./`), so the app works both locally and at `/habit-tracker/` |

---

## 10. Data rules

### Habits
- Every habit has a **permanent ID**. The name is only a label and can change.
- Each habit stores: ID, name, colour, status (active or discontinued), its **active periods** (start and end dates), and its **schedule history**.
- **Schedule history:** a list of schedule versions. Each version holds:
  - `from`: the date it takes effect (local `YYYY-MM-DD`)
  - `days`: the ticked weekdays (Monday to Sunday), for repeating habits
  - `repeat`: true (weekly) or false (one-time)
  - `date`: the single date, for one-time habits
  - `setTime`: the habit's set time
- Editing the days, repeat setting or set time **adds a new version** starting today. Earlier versions are never changed.
- To decide whether a given day is scheduled, the app uses the version in effect on that day. A day only counts if it also falls inside an active period.
- **Merge** reactivates the old ID using the Restart rule below, and adds a schedule version for the chosen schedule. **New record** creates a new ID under a different name.
- **Restart** (merge): if the last period's end is yesterday or later, set it to `null`; otherwise add `{ start: today, end: null }`. Then append a schedule version from today. A habit removed on the day it was added keeps an empty period (`end = start − 1`), shown in History as "Removed on the day it was added".
- Habit names are compared trimmed and case-insensitively; two active habits never share a name.

### Completions
- Each completion stores: habit ID, the date it belongs to (local `YYYY-MM-DD`), the **set time copied at the moment of completion**, the exact completion timestamp, the deviation in minutes, a `late` flag, and an `extra` flag.
- Copying the set time onto each completion means editing a habit's time later never rewrites past deviations.
- `late` is true when the completion is more than 12 hours after the set time on its date.
- `extra` is true when the date was not a scheduled day for that habit. Extras are excluded from percentages and streaks.
- At most **one completion per habit per date**.
- Completions for future dates are refused.

### Counting rules
- **Y days** (discontinue message and percentages) = scheduled days within active periods, up to and including today.
- **X days** = scheduled days within that range that have a completion. Whether a completion is scheduled or extra is decided by `isScheduled` on its date, never by the stored `extra` flag. The flag is a record of the moment of marking and is kept unchanged.
- **Streak** = consecutive scheduled days completed, skipping unscheduled days.
- **Discontinue** sets the open period's end to today if today is scheduled and has a completion, otherwise yesterday. The discontinue message counts up to the same day.
- Weeks start on **Monday** everywhere: month view, weekly maths, yearly PDF.

### Settings and records
- A key-value table holds: schema version, theme choice, last backup time.

### Storage format (fixed in Module 1; every later module must use it exactly)
Database name `habit-tracker`. Dexie version 1 = Module 0 test counter. Dexie version 2 = the tables below, with `testCounter` removed.

| Table | Primary key and indexes | Row shape |
|---|---|---|
| `habits` | `id`; index `status` | `{ id, name, colour, status, createdAt, activePeriods, schedule }` |
| `completions` | compound `[habitId+date]`; indexes `habitId`, `date` | `{ habitId, date, setTime, completedAt, deviationMin, late, extra }` |
| `settings` | `key` | `{ key, value }` |

Field rules:
- `id`: `crypto.randomUUID()`, set once, never changed.
- `colour`: `"#rrggbb"`. `status`: `"active"` or `"discontinued"`. `createdAt` and `completedAt`: milliseconds since 1970 (a number, so there is no time-zone ambiguity).
- `activePeriods`: list of `{ start, end }`. `end` is `null` while active and **inclusive** (the last day that counts).
- `schedule`: **append-only** list of `{ from, repeat, days, date, setTime }`. `days` uses ISO weekday numbers, Monday = 1 … Sunday = 7. `date` is `null` for repeating habits. If two versions share the same `from`, the one later in the list wins.
- All calendar dates are local `"YYYY-MM-DD"` strings; all set times are `"HH:MM"` (24-hour).
- `deviationMin`: whole minutes, completion time minus intended date-and-time; **positive = late, negative = early**.
- Settings keys: `schemaVersion` (number), `theme` (`"system"`, `"light"` or `"dark"`), `lastBackupAt` (milliseconds or `null`).
- **Never** use `toISOString()` or `new Date("YYYY-MM-DD")` for calendar dates. India is UTC+5:30, so both give the wrong day around midnight. Use the helpers in `js/dates.js`.
- "Is habit H scheduled on date D?" is answered only by `isScheduled(habit, date)` in `js/schedule.js`. No other code may re-implement that rule.

### Decisions settled
1. Schedule: weekday picker with weekly repeat, or a one-time date.
2. One set time per habit.
3. Schedule changes keep history within the same habit (see Schedule history above).
4. Extra completions on unscheduled days are allowed and excluded from percentages.
5. One completion per habit per day.
6. Late = more than 12 hours after the set time.
7. Week starts on Monday.
8. Only weekly repeats; no every-other-week or monthly patterns.
9. Future days cannot be marked.
10. Undo is allowed after confirmation.

---

## 11. Archived: reminders

Not part of the current plan. Kept for later.
- The earlier design used a Cloudflare Worker, Cron Trigger, D1 database and Web Push. Dropped.
- **Preferred route if revived:** wrap this same app with Capacitor (free) to make an Android APK that schedules notifications on the phone itself, with no server. This is an assumption to verify at the time. Costs: Android Studio is needed to build the APK, and native updates need a reinstall, so data survival must be planned before choosing it.

---

## 12. What the app cannot do

- No reminder notifications (archived).
- No silent automatic backup. Android Chrome requires a tap for every file save or share.
- No syncing between devices. One Android phone only. No iOS.
- CSV cannot be restored. Only JSON backups restore.
- Restore replaces all data. It does not merge.
- No every-other-week, monthly, or custom repeat patterns; weekly repeats only.
- No different set times on different days within one habit.
- No more than one completion per habit per day.
- No marking of future days.
- No paid services of any kind.
- No USB debugging; use the on-screen console and About panel instead.
- No more than 10 habits in one yearly PDF.
- The yearly PDF's text is part of a picture; it cannot be selected or searched.

---

## 13. Module plan

One module per Claude Code session. Each module ends with a commit, a deploy, the update test on the phone, and an update to the Status section.

### Module 0: Scaffold and update-safety proof
- Files: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `.gitignore`, `.nojekyll`.
- Repository's local Git identity set to `Zbr-ansr` and the no-reply email in section 3.
- Manifest with `id`, `start_url` and `scope` set to `./`, name, theme colour, `display: standalone`, and placeholder icons (192 px, 512 px, 512 px maskable) generated locally without outside services.
- Service worker: versioned cache with the `ht-` prefix, works offline, update banner.
- Content Security Policy in `index.html`.
- Dexie and Eruda saved in `vendor/`; Eruda only with `?debug=1`.
- A test counter button stored in IndexedDB.
- An About panel showing the app version and the counter value.
- **Done when:** the app is installed on the phone from `https://zubair-habits.github.io/habit-tracker/`, the counter is tapped a few times, a version bump is deployed, the update banner appears and is tapped, and the counter value is unchanged.

### Module 1: Data layer and app shell
- Dexie schema from section 10, including schedule history; request persistent storage.
- A single shared function that answers "is habit H scheduled on date D?" using section 10's rules. Every later module uses it.
- Top-corner menu and view switching (Main, Settings, Analysis, Export).
- Theme: follows the device, with a manual override.
- Remove the test counter through a proper migration.
- About panel adds persistent-storage status and record counts.
- **Done when:** the update test passes, the About panel shows persistent storage granted, and the "is scheduled" function gives correct answers for test cases including a schedule change.

### Module 2: Habit management
- Add, edit, recolour, set time.
- Schedule picker: weekday ticks, Every day shortcut, repeat on/off, one-time date.
- Editing the schedule adds a new version from today.
- Discontinue with X / Y / Z% confirmation and soft delete.
- Same-name re-add: merge or new record.
- **Done when:** all flows work on the phone, and history survives discontinue, merge and a schedule change.

### Module 3: Month view and completion entry
- Month calendar (Monday start) with coloured dots on scheduled days; move between months.
- Tap day → choose habit → Completed → save tap time → show deviation.
- Undo; late flag (over 12 hours); extras on unscheduled days; future days blocked; one per habit per day.
- **Done when:** completions, undo, late entries, extras and a mid-month schedule change all show correctly on the phone.

### Module 4: Backup and restore
- JSON backup via share sheet; download fallback.
- Restore with checks, preview and confirmation; upgrade of older backups.
- CSV export.
- 7-day backup banner.
- **Done when:** a backup taken on the phone restores correctly after clearing the app's data. **Real daily use starts here.**

### Module 5: Analysis
- Percentages and streaks on scheduled days only, graphs (Chart.js), time deviation per habit; on-time, late and extra completions shown separately.
- **Done when:** figures match a manual check of the data, including across a schedule change.

### Module 6: Yearly PDF
- Contribution-style year grid (Monday start) on a canvas as the preview; jsPDF single page; download.
- **Done when:** the downloaded PDF matches the preview and fits one page.

---

## 14. Working rules for Claude (chat and Claude Code)

- Read this file fully before starting any work.
- Work on one module per session. Do not start the next module unprompted.
- Before each step, explain in one or two plain sentences what will happen and why, then wait for approval.
- Always ask before `git push`, deleting files, downloading anything, or changing anything outside the project folder.
- Never break the rules in sections 6, 7 and 8. If a request would break one, say so and stop.
- If anything here is unclear or seems wrong, ask rather than guess.
- Use British English.
- At the end of each session: update the Status section, commit, and state the next module.
- Each module has a full spec in `docs/modules/module-N.md`. Follow its steps in order. If the spec and this file disagree, stop and ask; do not guess. If the spec for a module does not exist yet, stop: specs are written in the claude.ai planning chat, not invented in Claude Code.
- **Pushing (Local sessions):** never push without the owner's approval. When the owner is at the laptop, they type `git push` in the Terminal pane. When the owner is driving the session from the phone through Remote Control, Claude may run `git push` itself, but only after the owner approves that exact command in the permission box. If the push asks for a GitHub sign-in on the laptop, stop and tell the owner it must wait until they are at the laptop. The owner works in the **Claude desktop app** (Code tab, Local environment, folder `app_3`): the Terminal pane opens with Ctrl+`. In the terminal version of Claude Code it is `! git push` (Git Bash syntax). Wherever a module spec says `! git push`, give the Desktop form. Downloads work the same way.
- **Session setup (Desktop app):** normally environment **Local**, folder `app_3`, permission mode **Manual** or **Auto** (see below).
- **Cloud sessions** (environment such as `P1`, working from the GitHub copy of the repository) are allowed **only for writing code and running automated tests**. In a cloud session:
  - Before the first commit, run `git config user.name "Zbr-ansr"` and `git config user.email "145891905+Zbr-ansr@users.noreply.github.com"`.
  - Commit to the session's own branch, push only that branch, and open a pull request into `main`. **Never push to `main` or merge anything**: merging deploys to the phone, so the owner merges after the local tests.
  - Steps that need Live Server, Chrome DevTools or the phone are done later in a Local session, after checking out that branch.
- **Running out of usage mid-module:** stop at the end of a step, commit locally, and **do not push** (pushing to `main` deploys to the phone). Record in Status "Module N in progress: steps 1 to X done, not pushed".
- Permission mode **Manual** or **Auto**. Auto is allowed only while `.claude/settings.json` (committed) is in place: its `ask` rules force a permission box for `git push` and other history-changing git commands even in Auto, and its `deny` rules block destructive and network commands. Never edit that file, and never work round a rule with another command spelling. Accept edits and Bypass permissions are never used.

---

## 15. Repository layout

| Path | Purpose |
|---|---|
| `index.html`, `app.js`, `styles.css`, `version.js` | App page, entry script, styles, the one version number |
| `sw.js` | Service worker. Stays at the root so its scope covers the whole app. Every app file must be listed in `APP_FILES` |
| `manifest.webmanifest`, `icons/` | Install details. Never change `id`, `start_url` or `scope` |
| `js/` | App modules from Module 1 on (`dates.js`, `db.js`, `schedule.js`, views) |
| `vendor/` | Third-party libraries saved locally (Dexie, Eruda, Chart.js 4.5.1, jsPDF 4.2.1) |
| `tests/` | Browser test pages opened with Live Server. Not cached by the service worker |
| `docs/modules/` | One spec per module, written before that module starts |
| `docs/HOW-TO-USE-CLAUDE-CODE.md` | Beginner guide for the owner |
| `.claude/skills/build-module/SKILL.md` | The `/build-module N` command (created in Module 1 step 1 from `docs/setup/build-module-SKILL.md`; edit both together) |
| `.claude/settings.json` | Project permission rules for Auto mode. Never edited by Claude |
| `CLAUDE.md` | This file |

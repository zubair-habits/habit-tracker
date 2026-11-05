# Habit Tracker: Project Handoff and Rules

This file is the single source of truth for the project. It serves two purposes:
- Attach it to a new Claude chat to continue planning without re-explaining.
- Keep it in the root of the repository so Claude Code reads it at the start of every session.

Update the **Status** section at the end of every session.

---

## 1. Status

- **Phase:** Module 1 complete (2026-11-05), next is Module 2.
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
- **Current version:** `0.2.1`. The only place it is set is `version.js`; both `app.js` and `sw.js` (a module service worker) import it.
- **Module 0 decisions:** CSP loosened only for Eruda (inline styles, `data:` fonts/images; no `unsafe-eval`); version lives only in `version.js`; updates wait for the banner tap; offline is cache-first; icon is white "12" on black with green theme colour kept; owner runs `git push` and downloads via `!` (Git Bash).
- **Permanent app address:** `https://zubair-habits.github.io/habit-tracker/`
- **Next:** Module 2 (habit management). Its spec `docs/modules/module-2.md` does not exist yet; write it in the claude.ai planning chat first, add it to the repository, then start with `/build-module 2`.

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
- **Yearly PDF:** a single-page, GitHub-contribution-style calendar of one year (weeks starting Monday), with a coloured dot per habit per day. Shows a preview before download.

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
- The only code paths allowed to delete data are Restore (after confirmation) and Undo of a single completion (after confirmation).
- One version number, in one place. Bumping it must trigger the update banner.
- **Before deploying any change to the data structure:** take a JSON backup on the phone first.
- **After every deploy:** open the app on the phone, tap the update banner, and check that the record counts in the About panel are unchanged.

---

## 7. Non-negotiable 2: backup and restore

### Backup
- Settings or Export → **Back up** creates a JSON file named `habit-backup-YYYY-MM-DD.json`.
- It opens Android's share sheet with the file attached; the owner saves it to Google Drive. Fallback: download to the Downloads folder.
- The file contains everything: habits (including discontinued ones and their full schedule history), completions, settings, the app version, and a **schema version number**.
- The app records the time of the last backup.

### Backup reminder
- On opening the app, if the last backup is more than 7 days old, a banner asks for a backup.

### Restore
- Settings → **Restore** → pick a JSON backup file.
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
- `.gitignore` blocks backup and export files (`habit-backup-*.json`, `*.csv`, exported PDFs, `backups/`, `exports/`).
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
- **X days** = scheduled days within that range that have a non-extra completion.
- **Streak** = consecutive scheduled days completed, skipping unscheduled days.
- **Discontinue** sets the open period's end to today if the habit has a non-extra completion today, otherwise yesterday. The discontinue message counts up to the same day.
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
- **Pushing (Local sessions):** never push yourself. When a push is due, ask the owner to push. The owner works in the **Claude desktop app** (Code tab, Local environment, folder `app_3`): there they type `git push` in the Terminal pane (Ctrl+`). In the terminal version of Claude Code it is `! git push` (Git Bash syntax). Wherever a module spec says `! git push`, give the Desktop form. Downloads work the same way.
- **Session setup (Desktop app):** normally environment **Local**, folder `app_3`, permission mode **Manual**.
- **Cloud sessions** (environment such as `P1`, working from the GitHub copy of the repository) are allowed **only for writing code and running automated tests**. In a cloud session:
  - Before the first commit, run `git config user.name "Zbr-ansr"` and `git config user.email "145891905+Zbr-ansr@users.noreply.github.com"`.
  - Commit to the session's own branch, push only that branch, and open a pull request into `main`. **Never push to `main` or merge anything**: merging deploys to the phone, so the owner merges after the local tests.
  - Steps that need Live Server, Chrome DevTools or the phone are done later in a Local session, after checking out that branch.
- **Running out of usage mid-module:** stop at the end of a step, commit locally, and **do not push** (pushing to `main` deploys to the phone). Record in Status "Module N in progress: steps 1 to X done, not pushed".
- Do not use Auto, Accept edits or Bypass permissions modes in this project; Manual only.

---

## 15. Repository layout

| Path | Purpose |
|---|---|
| `index.html`, `app.js`, `styles.css`, `version.js` | App page, entry script, styles, the one version number |
| `sw.js` | Service worker. Stays at the root so its scope covers the whole app. Every app file must be listed in `APP_FILES` |
| `manifest.webmanifest`, `icons/` | Install details. Never change `id`, `start_url` or `scope` |
| `js/` | App modules from Module 1 on (`dates.js`, `db.js`, `schedule.js`, views) |
| `vendor/` | Third-party libraries saved locally (Dexie, Eruda; Chart.js and jsPDF later) |
| `tests/` | Browser test pages opened with Live Server. Not cached by the service worker |
| `docs/modules/` | One spec per module, written before that module starts |
| `docs/HOW-TO-USE-CLAUDE-CODE.md` | Beginner guide for the owner |
| `.claude/skills/build-module/SKILL.md` | The `/build-module N` command (created in Module 1 step 1 from `docs/setup/build-module-SKILL.md`; edit both together) |
| `CLAUDE.md` | This file |

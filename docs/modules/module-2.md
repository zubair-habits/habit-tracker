# Module 2: Habit management

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 2. It changes two things in `CLAUDE.md`, listed under "Decisions made for this module"; step 1 writes those changes into `CLAUDE.md`. Every other rule in sections 6, 7, 8 and 10 stays as it is. If anything here disagrees with `CLAUDE.md`, stop and ask the owner.

## Goal

The owner can add, edit, recolour, re-time, reschedule, discontinue and restart habits on the phone. Every change keeps the full history described in section 10, and that history survives an app update.

## Starting point (state of `main` after Module 1)

- Version `0.2.1`. Schema version 2. **This module adds no database version and no migration**: the `habits` table already has the right shape.
- `js/db.js` exports `db`, `openDb`, `getSetting`, `setSetting`, `recordCounts`, `isPersisted`, `SCHEMA_VERSION`.
- `js/schedule.js` exports `isScheduled(habit, dateStr)`, the only allowed scheduling check.
- `js/dates.js` exports `toDateStr`, `todayStr`, `parseDateStr`, `isoWeekday`, `addDays`.
- `js/views.js` handles `VIEWS = ['main', 'settings', 'analysis', 'export']`, the menu (`data-go` buttons) and back-button history. Moving between two non-Main views replaces the history entry, so one back press returns to Main.
- `js/about.js` exports `refreshAbout()`.
- `index.html` has one `<section data-view="…">` per view. Settings holds the Theme and About cards.
- Tests: `tests/schedule.test.js` runs in the browser (`tests/index.html`) and in Node (`node tests/schedule.test.js`).
- The phone holds no habits yet. All data until Module 4 is test data, and test habits must have obviously fake names.
- **This module runs in a Local session** on the laptop (Claude desktop app, environment Local, folder `app_3`, permission mode Manual). Cloud credits have ended, so there is no cloud session and no Playwright: the owner does the browser checks by hand. Node may not be installed on the laptop; step 3 checks.

## Decisions made for this module

These were settled in the planning chat. If the owner wants a different choice, they change it before step 2.

1. **Habits get their own view.** The menu becomes **Habits, Settings, Analysis, Export**, and `habits` is added to `VIEWS`. This changes section 4 ("three sections"), which step 1 updates. Reason: Settings will also hold Backup and Restore in Module 4, and habits are opened far more often.
2. **Discontinue end date.** Discontinuing on day T sets the open period's `end` to **T if the habit has a non-extra completion on T, otherwise T − 1**. So the day a habit is removed is never counted as missed. The X / Y / Z% message uses the same last day. Step 1 adds this to section 10.
3. **Restarting a discontinued habit** (the "merge" in section 10): if the last period's `end` is **yesterday or later** (`end >= addDays(today, -1)`), set it back to `null`, because the habit continues with no missed gap. Otherwise add a new period `{ start: today, end: null }`. Then append a schedule version from today with the chosen schedule. The `id` never changes. Using yesterday rather than today means removing and restarting on the same day leaves one clean period instead of two.
4. **Names.** Trimmed, 1 to 40 characters. Names are compared trimmed and case-insensitively ("Read" = " read "). Two **active** habits can never share a name.
   - **Add or rename** to a name an **active** habit already has: refused with "You already have a habit called …".
   - **Add** with a name a **discontinued** habit has: ask "**Continue the old habit**" (restart it with the new form's schedule, colour and time, keeping its history) or "**Start a new record**" (the owner must then type a different name). This is section 4's "merge or new record".
5. **Colours** come from a fixed palette of 10 swatches (below), chosen to stay distinct as small dots on light and dark backgrounds. There is no free colour picker. A new habit starts on the first palette colour no active habit uses. Two habits may share a colour if the owner chooses it.
6. **New habits start today.** First period `{ start: today, end: null }`, first schedule version `from: today`. A one-time habit's date must be today or later; a past date would never count, because it falls before the start.
7. **What adds a schedule version:** a change to `repeat`, `days`, `date` or `setTime`. A change to name or colour edits the habit directly and adds no version. Saving with no schedule change adds nothing.
8. **Discontinued habits** appear in a collapsed "Discontinued" list under the active list. They are read-only apart from a **Restart** button, which opens the form filled with the last schedule and colour and then uses decision 3.
9. **Forms and confirmations use `<dialog>`** with `showModal()`. Android Chrome closes a modal dialog on the back button, so back closes the dialog and does not leave the Habits view. No `window.confirm()` or `alert()`.
10. **Removed on the day it was added.** A habit discontinued on its first day with no completion gets `end = start − 1`. That period is empty and counts nothing. This is allowed and is not an error. History shows it as "Removed on the day it was added".

### Palette

| Name | Value |
|---|---|
| Red | `#e5484d` |
| Orange | `#f76b15` |
| Amber | `#ffb224` |
| Green | `#30a46c` |
| Teal | `#12a594` |
| Blue | `#0090ff` |
| Indigo | `#3e63dd` |
| Purple | `#8e4ec6` |
| Pink | `#d6409f` |
| Brown | `#ad7f58` |

## Files

| File | Action |
|---|---|
| `js/habit-logic.js` | New. **Pure functions, no database and no page access**, so they can be tested in Node. See below |
| `js/habits.js` | New. Database reads and writes for habits. Each write is one Dexie transaction that calls a function from `habit-logic.js` and saves its result |
| `js/habits-view.js` | New. The Habits view: list, form dialog, confirmation dialogs |
| `js/dialog.js` | New. `confirmDialog({ title, message, confirmLabel, cancelLabel })`, which resolves to `true` or `false`, plus a two-choice version for "Continue the old habit / Start a new record". Module 3's Undo reuses it |
| `js/views.js` | Add `habits` to `VIEWS` |
| `index.html` | Menu button "Habits" first; `<section data-view="habits">`; dialog markup. The Main placeholder becomes "Add habits from Menu → Habits. The calendar arrives in Module 3." |
| `app.js` | Start the Habits view |
| `styles.css` | Habit list, form, weekday chips, swatches, dialogs; checked in both themes |
| `sw.js` | Add every new `js/` file to `APP_FILES` |
| `version.js` | `0.3.0`, then `0.3.1` for the second phone test |
| `tests/habit-logic.test.js` | New. Runs in Node and in the browser test page |
| `tests/index.html` | Also runs `habit-logic.test.js` |
| `CLAUDE.md` | Step 1 changes, and Status at the end |

## `js/habit-logic.js` (pure functions)

Every function takes plain objects and returns new objects. Never change an argument in place. `today` is always passed in as a `"YYYY-MM-DD"` string, so tests can choose the date.

- `PALETTE`: the 10 colours above, in order.
- `normaliseName(name)`: trims, then lower-cases. Used only for comparison; the stored name keeps the owner's spelling, trimmed.
- `validateInput(input, today)` returns a list of error messages, empty when valid. `input` is `{ name, colour, repeat, days, date, setTime }`. Checks:
  - name 1 to 40 characters after trimming
  - colour is in `PALETTE`
  - `setTime` matches `HH:MM`
  - `repeat` true: `days` has 1 to 7 distinct values, each 1 to 7, stored sorted ascending
  - `repeat` false: `date` is a valid date and `date >= today`
- `scheduleFromInput(input, today)` returns `{ from: today, repeat, days, date, setTime }`. For `repeat` true, `date` is `null`. For `repeat` false, `days` is `[]`.
- `currentVersion(habit, today)` returns the version in effect today: the last one whose `from <= today`, otherwise the last one in the list.
- `sameSchedule(a, b)` compares `repeat`, `days`, `date` and `setTime`, ignoring `from`.
- `buildNewHabit(input, today, id, nowMs)` returns the full habit row (section 10 storage format): `status: 'active'`, `createdAt: nowMs`, `activePeriods: [{ start: today, end: null }]`, `schedule: [scheduleFromInput(input, today)]`.
- `applyEdit(habit, input, today)`: name and colour are replaced. A version from today is appended **only if** `!sameSchedule(currentVersion(habit, today), newVersion)`. Earlier versions are never touched.
- `lastCountedDay(habit, completions, today)` returns `today` if `completions` holds a non-extra completion of this habit dated `today`, otherwise `addDays(today, -1)`.
- `countDays(habit, completions, lastDay)` returns `{ x, y }`. It walks every date from the earliest period `start` to `lastDay`. `y` counts dates where `isScheduled(habit, date)` is true; `x` counts those that also have a non-extra completion. It must call `isScheduled` and must not re-implement it. Module 5 reuses this function.
- `discontinueMessage({ x, y })` returns exactly "You have continued with this habit for X days out of Y days (Z%). Are you sure you want to remove this habit?", with Z = `Math.round(100 * x / y)`. When `y` is 0 it returns "This habit has had no scheduled days yet. Are you sure you want to remove it?"
- `applyDiscontinue(habit, completions, today)`: sets `status: 'discontinued'` and sets the open period's `end` to `lastCountedDay(...)`.
- `applyRestart(habit, input, today)`: decision 3 (`end >= addDays(today, -1)` gives `end = null`, otherwise a new period), then `status: 'active'`, name and colour from `input`, and a new version from today. The version is always appended, even if it equals the old one, so the restart is visible in the history.
- `findByName(habits, name)` returns `{ active, discontinued }`: the active habit with that name or `null`, and the list of discontinued habits with that name.
- `firstFreeColour(habits)` returns the first `PALETTE` colour no active habit uses, otherwise `PALETTE[0]`.
- `describeSchedule(version)` returns the label shown in the list:
  - "Every day · 07:00" when all seven days are ticked
  - "Mon, Wed, Fri · 07:00" otherwise, in Monday-first order
  - "Once · Tue 20 Oct 2026 · 18:00" for a one-time habit

## The Habits view

**List.** One row per active habit, oldest `createdAt` first. Each row shows: colour dot, name, `describeSchedule(currentVersion(habit, today))`. Tapping a row opens the edit form. An **Add habit** button sits at the top. When there are no active habits, show "No habits yet. Tap Add habit to create one." Underneath is a collapsed **Discontinued (N)** list, hidden when N is 0.

**Form dialog** (used for add, edit and restart):
1. Name (text, maximum 40 characters)
2. Colour: 10 swatch buttons. The chosen one is marked by more than colour alone, for example a tick, for accessibility
3. "Repeats every week", on by default:
   - **On:** seven weekday chips Mon to Sun, plus an **Every day** button that ticks all seven
   - **Off:** a date input, with today as the minimum
4. Set time (`<input type="time">`)
5. Errors from `validateInput` appear under the form. Save stays tappable, so the owner sees why it fails
6. Buttons: **Save**, **Cancel**. When editing an active habit, also **Discontinue habit**, styled as dangerous and placed apart from Save
7. When editing, a read-only **History** section at the bottom lists every active period and every schedule version with its `from` date, written with `describeSchedule`. An empty period (decision 10) reads "Removed on the day it was added". The phone tests check history here, since there is no other way to see it on the phone

**Discontinue.** Read the habit's completions (none exist until Module 3, but the code must read them anyway), compute `countDays` up to `lastCountedDay`, and show `discontinueMessage` in a `confirmDialog` with the buttons **Remove** and **Keep**. On Remove, save `applyDiscontinue`. Nothing is deleted.

**Add with a discontinued name.** After Save, if `findByName` returns a discontinued match, show the two-choice dialog: "A discontinued habit called … exists, with N days of history. **Continue the old habit** or **Start a new record**?" If several discontinued habits share the name, continue the most recently discontinued one.
- **Continue the old habit:** `applyRestart` on that habit with the form's input.
- **Start a new record:** return to the form with the message "Choose a different name for the new record". Save stays refused while the name matches.

**Refresh.** After every write, refresh the list and call `refreshAbout()`.

## Steps

Before every step: explain it in one or two plain sentences, then wait for approval.

1. **Check the starting point and update `CLAUDE.md`.**
   - Check you are on an up-to-date `main` with nothing uncommitted apart from this file.
   - Then edit `CLAUDE.md`:
     - Section 4, Main screen: "Top-corner menu with four sections: Habits, Settings, Analysis, Export."
     - Section 5: add the row "Menu: Settings, Analysis, Export | Habits, Settings, Analysis, Export | Habits need their own view; Settings gains Backup in Module 4".
     - Section 10, Counting rules: add "**Discontinue** sets the open period's end to today if the habit has a non-extra completion today, otherwise yesterday. The discontinue message counts up to the same day."
     - Section 10, Habits: add "**Restart** (merge): if the last period's end is yesterday or later, set it to `null`; otherwise add `{ start: today, end: null }`. Then append a schedule version from today. A habit removed on the day it was added keeps an empty period (`end = start − 1`), shown in History as 'Removed on the day it was added'." Also add "Habit names are compared trimmed and case-insensitively; two active habits never share a name."
   - Commit: "Module 2 spec and CLAUDE.md updates".
2. **Plan.** List the files and anything you would do differently, with the reason. Wait for approval.
3. **`js/habit-logic.js`** and **`tests/habit-logic.test.js`** (cases below). First ask the owner to type `node --version` in the desktop app's Terminal pane.
   - **Node present:** ask the owner to run, in Git Bash (VS Code terminal set to Git Bash, or `!` in the terminal version of Claude Code): `TZ=Asia/Kolkata node tests/habit-logic.test.js`, `TZ=UTC node tests/habit-logic.test.js`, and the same two for `tests/schedule.test.js`.
   - **Node missing:** do not install anything. Add `habit-logic.test.js` to `tests/index.html` now, and ask the owner to open `tests/index.html` with Live Server.
   **Do not continue until every case passes.**
4. **`js/dialog.js`** and **`js/habits.js`.**
5. **The Habits view:** `views.js`, `index.html`, `js/habits-view.js`, `styles.css`, `app.js`, and `tests/index.html` if not already done.
6. **Service worker and version:** add every new file to `APP_FILES`, set `version.js` to `0.3.0`.
7. **Checks before deploying.** The owner does the checklist below with Live Server (right-click `index.html` → Open with Live Server) and Chrome DevTools (F12). Give it as a numbered list; the owner reports each item as PASS or FAIL:
   - Test page: every case passes
   - Add "Test Gym": Mon, Wed, Fri at 07:00, Red. The list shows "Mon, Wed, Fri · 07:00"
   - Add "Test Read": Every day at 22:00. The list shows "Every day · 22:00"
   - Add "Test Dentist": one-time, a date next week at 18:00. The list shows "Once · …"
   - Edit Test Gym to Tue, Wed, Fri. History shows two versions, both from today
   - Rename Test Read to "test gym": refused
   - Discontinue Test Read. The message reads "This habit has had no scheduled days yet …", because it was created today and today is not completed. Test Read moves to Discontinued (1), and its History shows "Removed on the day it was added"
   - Add "test read" (different case): the two-choice dialog appears. Choose Continue: Test Read is active again, with the same `id` (DevTools → Application → IndexedDB → `habit-tracker` → `habits`) and **one** period whose `end` is back to `null` (decision 3)
   - Back button: closes an open dialog first; then returns to Main
   - Offline (DevTools → Network → Offline, then reload): the Habits view works
   - Both themes: dots, chips and dialogs are readable
   - About shows habits 3
8. **Commit and deploy.** Commit on `main`, then ask the owner to push (`git push` in the desktop app's Terminal pane). Pushing to `main` is the deploy.
9. **Phone test, part 1.** The owner opens the installed app, taps the update banner (version 0.3.0), and repeats the "Add", "Edit", "Discontinue" and "Continue" items from step 7 on the phone, using the same fake names.
   **Phone test, part 2 (habits survive an update).** Make one tiny visible change, set `version.js` to `0.3.1`, commit, and ask the owner to push. The owner reopens the app and taps the banner. Expected: version 0.3.1, the same 3 active habits, Test Gym's History still shows two versions, and About shows habits 3.
10. **Close the module.** Update Status in `CLAUDE.md`: "Module 2 complete (date), next is Module 3", current version `0.3.1`, and "Notes from Module 2" with anything that differed from this spec. Commit, ask the owner to push, then stop. Do not start Module 3.

## Test cases (`tests/habit-logic.test.js`)

Use `today = "2026-11-10"` (a Tuesday) unless a case says otherwise. Build habits with `buildNewHabit(..., "2026-11-01", "id-1", 0)` and then the functions under test, so the tests also check that the functions work together.

**Validation**
- Name "   " → error; a 41-character name → error; "Gym" → no error
- Colour `"#123456"` (not in the palette) → error
- `repeat: true, days: []` → error; `days: [8]` → error; `days: [5, 1, 3]` → valid, and `scheduleFromInput` stores `[1, 3, 5]`
- `repeat: false, date: "2026-11-09"` (yesterday) → error; `date: "2026-11-10"` → valid
- `setTime: "7:00"` → error; `"07:00"` → valid

**Build and edit**
- `buildNewHabit` gives one period `{ start: "2026-11-01", end: null }` and one version `from: "2026-11-01"`
- `applyEdit` changing only the name → `schedule.length` unchanged
- `applyEdit` changing days `[1,3,5]` → `[2,3,5]` on 2026-11-10 → two versions; the second has `from: "2026-11-10"`; the first is unchanged (deep-equal to before)
- `applyEdit` twice on the same day (`[2]`, then `[4]`) → three versions; `isScheduled` on 2026-11-12 (Thursday) is true and on 2026-11-17 (Tuesday) is false
- `applyEdit` changing only `setTime` → a new version is added
- The input habit object is unchanged after each call (no in-place change)

**Counting and discontinue** (habit: every day, start 2026-11-01)
- No completions, today 2026-11-10 → `lastCountedDay` = 2026-11-09; `countDays` = `{ x: 0, y: 9 }`; the message ends "(0%). Are you sure you want to remove this habit?"
- Completions on 2026-11-01, 02, 03 (non-extra) and on 2026-11-10 → `lastCountedDay` = 2026-11-10; `{ x: 4, y: 10 }`; message "… for 4 days out of 10 days (40%). …"
- An extra completion on 2026-11-10 only → `lastCountedDay` = 2026-11-09 (extras do not count)
- Habit created today (start 2026-11-10), no completions → `{ x: 0, y: 0 }` and the "no scheduled days yet" message
- Mon/Wed/Fri habit, start 2026-11-02 (Monday), today 2026-11-10 → y counts only 2, 4, 6 and 9 November → `y = 4`
- `applyDiscontinue` → `status: 'discontinued'`, period end 2026-11-09, versions unchanged

**Restart**
- Discontinued with end 2026-11-09, restart on 2026-11-20 → two periods; the second is `{ start: "2026-11-20", end: null }`; a new version from 2026-11-20; same `id`
- After that restart: `isScheduled` on 2026-11-15 (inside the gap) → false; on 2026-11-20 → true
- Discontinued with end 2026-11-10, restart on 2026-11-10 → still one period, `end: null`
- Discontinued with end 2026-11-09, restart on 2026-11-10 → still one period, `end: null` (yesterday counts as continuing)
- Created 2026-11-10 and discontinued on 2026-11-10 with no completion → period `{ start: "2026-11-10", end: "2026-11-09" }`; `isScheduled` on 2026-11-10 → false; restarting on 2026-11-10 → one period, `end: null`

**Names and colours**
- `findByName` with " test READ " matches an active "Test Read"
- An active "Gym" plus a discontinued "gym" → `{ active: Gym, discontinued: [gym] }`
- `firstFreeColour` with active habits on Red and Orange → Amber; with all 10 used → Red

**Labels**
- `[1,2,3,4,5,6,7]` at 06:00 → "Every day · 06:00"
- `[1,3,5]` at 07:00 → "Mon, Wed, Fri · 07:00"
- One-time on 2026-10-20 at 18:00 → "Once · Tue 20 Oct 2026 · 18:00"

## Done when

- [ ] All tests pass (Node in both time zones if Node is installed; otherwise the browser test page).
- [ ] Every item in the step 7 checklist passes.
- [ ] Phone part 1: add, edit, discontinue and continue all work on the phone.
- [ ] Phone part 2: after the update to 0.3.1, the 3 habits and Test Gym's two-version history are unchanged.
- [ ] Status in `CLAUDE.md` updated and pushed.

# Module 3: Month view and completion entry

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 3. It changes one working rule in `CLAUDE.md` (pushing during a Remote Control session); step 1 writes that change. Every rule in sections 6, 7, 8 and 10 stays as it is. If anything here disagrees with `CLAUDE.md`, stop and ask the owner.

## Goal

The Main view becomes the month calendar from section 4. The owner taps a day, sees that day's habits, taps **Completed**, and immediately sees how early or late it was. Undo, late entries, extra completions, the future-day block and the one-per-day rule all work, and completions survive an app update.

## Starting point (state of `main` after Module 2)

- Version `0.3.2`. Schema version 2. **No database version and no migration in this module**: the `completions` table already exists with primary key `[habitId+date]` and indexes `habitId`, `date` (section 10).
- `js/habit-logic.js` exports, among others, `PALETTE` (objects `{ name, value }`), `currentVersion`, `countDays`, `formatDate` ("Tue 20 Oct 2026"), `describeSchedule`.
- `js/habits.js` exports `listHabits()` (all habits, oldest first) and the habit writes. `js/dialog.js` exports `confirmDialog`, `choiceDialog`, `closeAllDialogs`; reuse them for Undo. `js/about.js` exports `refreshAbout()`.
- `js/views.js` has `VIEWS = ['main', 'habits', 'settings', 'analysis', 'export']` and `onViewShown(fn)`. The Main view holds a placeholder card.
- The phone holds test habits Test Gym, Test Read and Test Dentist and no completions. All data before Module 4 is test data.
- Node is **not** installed on the laptop. Tests run on the browser test page (`tests/index.html`).
- **How this module is run:** a Local session in the Claude desktop app on `app_3`, driven from the owner's phone through **Remote Control**. The owner may not be at the laptop, so Claude runs the browser checks itself (as in Module 2) and the owner does the phone tests.

## Decisions made for this module

If the owner wants a different choice, they change it before step 2.

1. **Calendar layout.** One month at a time, weeks starting Monday, seven columns. Only the month's own dates are shown; the leading and trailing cells are blank. A header row shows "Mon … Sun". Above the grid: **‹** (previous month), the title ("November 2026"), **›** (next month), and a **Today** button that returns to the current month. No swipe gestures. The app always opens on the current month.
2. **Which habits appear on a day.** Habit H appears on date D if `isScheduled(H, D)` is true, **or** H has a completion dated D (an extra). This includes discontinued habits on days inside their old active periods, so history stays visible. Order: habit `createdAt`, oldest first.
3. **Dot states** (one dot per habit that appears on the day):

   | State | When | Drawn as |
   |---|---|---|
   | `done` | scheduled, completion exists | filled circle |
   | `extra` | not scheduled, completion exists | filled diamond (a small rotated square) |
   | `due` | scheduled, date is today, no completion | ring (outline circle) |
   | `missed` | scheduled, date before today, no completion | ring at 40% opacity |
   | `upcoming` | scheduled, date after today | ring at 40% opacity |

   Each dot uses the habit's colour. At most **6 dots** per cell (two rows of three); if there are more, show 5 dots and "+N". Today's cell has a visible outline. A cell must be at least 44 px tall so it is easy to tap.
4. **Tapping a day** opens the **day sheet**, a `<dialog>` with `showModal()`, titled with `formatDate(D)`. It has two sections:
   - **Scheduled:** every habit scheduled on D, in order. Each row has the colour dot, the name, the set time, and one of:
     - not completed: a **Completed** button (only if D ≤ today)
     - completed: "Completed 07:12 · 12 min late" (plus "· Late" when the late flag is set), and an **Undo** button
   - **Also done today / Mark an extra:** habits with an extra completion on D (shown like completed rows, with "Extra"), then a collapsed **Mark an extra** list of the other habits that could have an extra on D (rule 6). Each has a **Completed** button.
   - For a future date, the sheet lists the scheduled habits and shows "Future days can't be marked yet." There are no buttons.
   - When nothing is scheduled and no extra is possible: "Nothing scheduled on this day."
   - Android's back button closes the sheet, as with Module 2's dialogs.
5. **Recording a completion** (section 10). When **Completed** is tapped, the time of the tap is `completedAt = Date.now()`. The stored row is:
   - `setTime`: the `setTime` of the schedule version **in effect on D** (`versionOn(habit, D)` below), copied onto the row
   - `deviationMin`: `Math.round((completedAt − intendedMs) / 60000)`, where `intendedMs` is D at `setTime` in local time. **Positive means late, negative means early**
   - `late`: `deviationMin > 720` (more than 12 hours after the set time)
   - `extra`: `!isScheduled(habit, D)`
   After saving, the row immediately shows the result, and the calendar and About counts refresh.
6. **When a completion is allowed** (checked in pure logic and again inside the database write):
   - D ≤ today (local), otherwise "Future days can't be marked."
   - D is inside one of the habit's active periods, otherwise "This habit wasn't active on that day." This applies to extras too, so an extra cannot be added before a habit existed or in a gap between periods.
   - There is no completion for `[habitId+D]` yet, otherwise "Already completed." The compound primary key also refuses a second row.
7. **Undo** asks with `confirmDialog({ title: 'Undo completion?', message: '<name>, <formatDate(D)>, completed at 07:12. Remove this completion?', confirmLabel: 'Remove', cancelLabel: 'Keep', danger: true })`. On Remove, delete that one row by its key `[habitId, D]`. This is one of the only two allowed delete paths (section 6); nothing else in this module deletes anything.
8. **Deviation wording** (`formatDeviation(min)`):
   - `0` → "On time"
   - under 60 → "12 min late" / "10 min early"
   - under 1440 → "1 h 5 min late" (minutes omitted when 0: "2 h late")
   - 1440 or more → "2 d 1 h late" (hours omitted when 0: "3 d late")
   Early completions are worded the same way with "early".
9. **Today changes at midnight.** `todayStr()` is read fresh on every render, and the calendar re-renders when the app returns to the screen (`visibilitychange`). If the shown month was the old current month, it stays on that month.
10. **Main placeholder removed.** The Main view shows only the calendar. If there are no active habits, a one-line note above the calendar says "Add habits from Menu → Habits."

## Files

| File | Action |
|---|---|
| `js/calendar-logic.js` | New. **Pure functions, no database and no page access**. See below |
| `js/completions.js` | New. Database reads and writes for completions: `completionsBetween(from, to)`, `markCompleted(habitId, date)`, `undoCompletion(habitId, date)`. Each write is one Dexie transaction over `habits` and `completions` that re-checks rule 6 with `calendar-logic.js` |
| `js/calendar-view.js` | New. Month grid, navigation, day sheet |
| `index.html` | Main view: calendar markup and the day-sheet `<dialog>`; placeholder removed |
| `app.js` | Start the calendar view |
| `styles.css` | Grid, dots (all five states), today outline, day sheet; checked in both themes and at 360 px wide |
| `sw.js` | Add the new `js/` files to `APP_FILES` |
| `version.js` | `0.4.0`, then `0.4.1` for the second phone test |
| `tests/calendar-logic.test.js` | New. Runs on the browser test page (and in Node if it is ever installed) |
| `tests/index.html` | Also runs `calendar-logic.test.js` |
| `CLAUDE.md` | Step 1 change, and Status at the end |

## `js/calendar-logic.js` (pure functions)

Every function takes plain objects and returns new values. `today` and dates are `"YYYY-MM-DD"` strings passed in, and `nowMs` is passed in, so tests can choose them. Use `js/dates.js` helpers; never `toISOString()`.

- `monthGrid(year, month)` (`month` 1 to 12) returns a list of weeks; each week is 7 entries, each a date string or `null` for a blank cell, Monday first.
- `addMonths(year, month, n)` returns `{ year, month }`.
- `monthTitle(year, month)` returns "November 2026".
- `versionOn(habit, date)` returns the last schedule version with `from <= date`, or `null` if there is none. (Unlike `currentVersion`, it never falls back to a later version.)
- `inActivePeriod(habit, date)` returns true if `date` is inside any active period.
- `intendedMs(date, setTime)` returns the local time in milliseconds: `new Date(y, m − 1, d, hh, mm).getTime()`.
- `canMark(habit, completions, date, today)` returns `null` if allowed, otherwise the exact message from rule 6.
- `buildCompletion(habit, date, nowMs)` returns the row from rule 5: `{ habitId, date, setTime, completedAt: nowMs, deviationMin, late, extra }`.
- `formatDeviation(min)` returns rule 8's text.
- `formatClock(ms)` returns local "HH:MM" (24-hour) for display.
- `dayDots(habits, completions, date, today)` returns the dots for one cell, in habit order: `[{ habitId, colour, state }]` with states from rule 3. Must call `isScheduled`.
- `dayEntries(habits, completions, date, today)` returns what the day sheet shows: `{ scheduled: [...], extras: [...], extraCandidates: [...], future: boolean }`. Each entry has the habit, its completion or `null`, and `canMark`. `extraCandidates` are habits not scheduled on D, with no completion on D, and inside an active period on D.

## Steps

Before every step: explain it in one or two plain sentences, then wait for approval. The owner may say "only stop for major decisions", as in Module 2. If so, record it in the Notes at the end.

1. **Check the starting point and update `CLAUDE.md`.**
   - Check you are on an up-to-date `main` with nothing uncommitted apart from this file.
   - In section 14, replace the start of the **Pushing (Local sessions)** rule with: "**Pushing (Local sessions):** never push without the owner's approval. When the owner is at the laptop, they type `git push` in the Terminal pane. When the owner is driving the session from the phone through Remote Control, Claude may run `git push` itself, but only after the owner approves that exact command in the permission box. If the push asks for a GitHub sign-in on the laptop, stop and tell the owner it must wait until they are at the laptop."
   - Commit: "Module 3 spec and CLAUDE.md update".
2. **Plan.** List the files and anything you would do differently, with the reason. Wait for approval.
3. **`js/calendar-logic.js`** and **`tests/calendar-logic.test.js`** (cases below). Add the new test file to `tests/index.html` and run the test page yourself in the desktop app's built-in browser against a temporary local web server, as in Module 2. All old tests must still pass. **Do not continue until every case passes.**
4. **`js/completions.js`.**
5. **The calendar:** `index.html`, `js/calendar-view.js`, `styles.css`, `app.js`.
6. **Service worker and version:** add every new file to `APP_FILES`, set `version.js` to `0.4.0`.
7. **Checks before deploying.** Run these yourself in the built-in browser against a temporary local web server, with fake habits created for the check, and report each as PASS or FAIL. Unregister the service worker and clear its caches before each reload of new code (Module 2 note). Remove the temporary data and any temporary files afterwards.
   - Test page: every case passes
   - Calendar for the current month: Monday first, correct number of weeks, today outlined
   - ‹ and › change months; **Today** returns; November 2026 shows 6 weeks, February 2027 shows 4
   - A Mon/Wed/Fri habit shows dots only on Mondays, Wednesdays and Fridays from its start date
   - Tap today and mark a scheduled habit: the row shows "Completed HH:MM · …", the dot becomes filled, About completions goes up by 1
   - Mark the same habit again: impossible (no button; a forced second write is refused)
   - Undo it: the confirmation appears; Keep changes nothing; Remove deletes it and the dot becomes a ring again
   - Mark an extra on an unscheduled day: diamond dot; the row says "Extra"
   - A past day inside the habit's period: marking works and shows the deviation from that day's set time; more than 12 hours after it is flagged Late
   - A future day: no buttons, the message is shown
   - A day before the habit started: no buttons and no extra candidates for that habit
   - After a schedule change (edit a test habit's days today), past days keep their old dots
   - Offline reload: the calendar works
   - Both themes and a 360 px wide window: dots, today outline and day sheet are readable
8. **Commit and deploy.** Commit on `main`, then push under the step 1 rule.
9. **Phone test, part 1.** The owner opens the installed app and taps the update banner (version 0.4.0). On the phone:
   - Today: mark Test Read **Completed**; the deviation appears and the dot fills
   - Undo it with Remove, then mark it again
   - Yesterday (if Test Gym was scheduled): mark it; it should show Late if more than 12 hours have passed
   - Mark one extra on a day a test habit isn't scheduled
   - Try a future day: no buttons
   - The Android back button closes the day sheet first, then returns as before
   - Note the About counts (completions should be 3)
   **Phone test, part 2 (completions survive an update).** Make one tiny visible change, set `version.js` to `0.4.1`, commit, and push under the step 1 rule. The owner reopens the app and taps the banner. Expected: version 0.4.1, the same dots and completion times, About completions unchanged.
10. **Close the module.** Update Status in `CLAUDE.md`: "Module 3 complete (date), next is Module 4", current version `0.4.1`, and "Notes from Module 3" with anything that differed from this spec. Commit, push under the step 1 rule, then stop. Do not start Module 4.

## Test cases (`tests/calendar-logic.test.js`)

Build habits with `buildNewHabit` from `habit-logic.js` so the modules are tested together. Use `today = "2026-11-10"` (a Tuesday) unless a case says otherwise. Create `nowMs` with `new Date(y, m − 1, d, hh, mm).getTime()` (local time), never from a UTC string, so the cases pass in any time zone.

**Month grid**
- `monthGrid(2026, 11)` (1 November is a Sunday) → 6 weeks; week 1 is six `null`s then "2026-11-01"; the last real date is "2026-11-30"
- `monthGrid(2027, 2)` (1 February is a Monday) → exactly 4 weeks, no `null`s
- `monthGrid(2026, 12)` → 5 weeks; week 1 starts with one `null`
- `addMonths(2026, 12, 1)` → `{ year: 2027, month: 1 }`; `addMonths(2026, 1, -1)` → `{ year: 2025, month: 12 }`
- `monthTitle(2026, 11)` → "November 2026"

**Versions and periods**
- Habit created 2026-11-01 at 07:00 with Mon/Wed/Fri, edited to 08:00 on 2026-11-10 → `versionOn(h, "2026-11-09").setTime` = "07:00"; `versionOn(h, "2026-11-10").setTime` = "08:00"; `versionOn(h, "2026-10-31")` = `null`
- `inActivePeriod` is false on 2026-10-31 and true on 2026-11-01

**Building a completion** (habit: every day at 07:00, created 2026-11-01)
- Date 2026-11-10, now 2026-11-10 07:12 → `deviationMin` 12, `late` false, `extra` false, `setTime` "07:00"
- now 2026-11-10 06:50 → `deviationMin` −10
- now 2026-11-10 19:00 → 720, `late` **false** (exactly 12 hours is not more than 12)
- now 2026-11-10 19:01 → 721, `late` true
- Date 2026-11-10, now 2026-11-12 08:00 → 2940, `late` true
- The set time copied is the one in effect on the completion's date, not today's (habit edited from 07:00 to 08:00 on 2026-11-10; completion for 2026-11-09 made at 2026-11-10 07:30 → `setTime` "07:00", `deviationMin` 1470)
- Mon/Wed/Fri habit, date 2026-11-10 (Tuesday) → `extra` true

**Allowed or refused** (`canMark`)
- Date 2026-11-11 with today 2026-11-10 → "Future days can't be marked."
- Date 2026-10-31 for a habit created 2026-11-01 → "This habit wasn't active on that day."
- Date in the gap of a discontinued-then-restarted habit (periods 11-01 to 11-05 and from 11-08; date 11-06) → "This habit wasn't active on that day."
- A completion already exists for that habit and date → "Already completed."
- Today, scheduled, no completion → `null`

**Deviation wording**
- 0 → "On time"; 12 → "12 min late"; −10 → "10 min early"; 65 → "1 h 5 min late"; 120 → "2 h late"; 2940 → "2 d 1 h late"; 4320 → "3 d late"; −90 → "1 h 30 min early"

**Dots and day entries** (today 2026-11-10; Test Gym Mon/Wed/Fri and Test Read every day, both created 2026-11-02)
- 2026-11-09 (Monday), no completions → Gym `missed`, Read `missed`
- 2026-11-10 (today), Read completed → Read `done`; Gym has no dot (not scheduled)
- 2026-11-10 with an extra completion for Gym → Gym `extra`
- 2026-11-11 → Gym `upcoming`, Read `upcoming`
- 2026-11-01 (before both started) → no dots
- `dayEntries` on 2026-11-10 with no completions → scheduled [Read]; extraCandidates [Gym]; `future` false
- `dayEntries` on 2026-11-11 → `future` true and no habit has `canMark` `null`
- Order follows `createdAt`

## Done when

- [ ] Every test-page case passes, including all Module 1 and 2 tests.
- [ ] Every item in the step 7 checklist passes.
- [ ] Phone part 1: mark, undo, late, extra, future block and back button all work on the phone.
- [ ] Phone part 2: after the update to 0.4.1, the dots, completion times and About counts are unchanged.
- [ ] Status in `CLAUDE.md` updated and pushed.

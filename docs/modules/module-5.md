# Module 5: Analysis

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 5. It changes two things in `CLAUDE.md`: the counting rules in section 10 (the stored `extra` flag is no longer used for counting), and the Module 4 note about PowerShell, which turned out to be wrong. Both are listed under "Decisions made for this module", and step 1 writes them. Every other rule in sections 6, 7, 8 and 10 stays as it is. If anything here disagrees with `CLAUDE.md`, stop and ask the owner.

## Goal

The Analysis view shows, for every habit:
- the completion percentage on scheduled days only;
- the current and best streaks;
- timing: average deviation and spread, over on-time completions only;
- separate counts of on-time, late, missed and extra completions;
- Chart.js graphs.

The figures must match a manual count from the calendar, including across a schedule change. Calendar, Analysis, CSV and the discontinue message must all agree on which day counts.

## Starting point (state of `main` after Module 4)

- Version `0.5.1`. Schema version 2. **No database version and no migration in this module.** Nothing new is stored: Analysis only reads.
- `js/habit-logic.js` exports `countDays(habit, completions, lastDay)`, `lastCountedDay(habit, completions, today)`, `discontinueMessage`, `formatDate`, `describeSchedule`, `buildNewHabit`, `applyEdit`, `applyDiscontinue`. Both `countDays` and `lastCountedDay` currently filter on the stored `!c.extra` flag. This module changes that (decision 1).
- `js/calendar-logic.js` exports `buildCompletion`, `formatDeviation`, `versionOn`, `inActivePeriod`. `js/schedule.js` exports `isScheduled`. `js/dates.js` exports `todayStr`, `addDays`, `isoWeekday`, `parseDateStr`, `toDateStr`.
- `js/habits.js` exports `listHabits()`. `js/completions.js` exports `completionsBetween(from, to)`. `js/views.js` exports `onViewShown(fn)`. `js/backup-logic.js` exports `buildCsv(habits, completions)`.
- The Analysis view in `index.html` holds the placeholder "Coming in Module 5".
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; …`. It has no `unsafe-eval` and must not gain one.
- **The phone holds real data** (real use started on 2026-11-05). Nothing in this module may add, change or remove a row on the phone. Every check that needs fake data runs on the laptop at `http://127.0.0.1:8765`, whose storage is separate from the phone and from `localhost`.
- Node is **not** installed on the laptop. Tests run on the browser test page (`tests/index.html`).
- **How this module is run:** a Local session in the Claude desktop app on `app_3`, permission mode **Auto**, with `.claude/settings.json` unchanged. Claude runs the browser checks itself; the owner does the phone tests.
- **Owner's preparation before the session** (step 1 checks both):
  1. This file is saved as `docs/modules/module-5.md`.
  2. Chart.js 4.5.1 is saved as `vendor/chart.umd.min.js` (decision 3). Claude cannot do this, because the deny rules block downloads and edits to `vendor/`.

## Decisions made for this module

If the owner wants a different choice, they change it before step 2.

1. **Analysis classifies completions with `isScheduled`, not with the stored `extra` flag.**

   **Why the flag is wrong.** The flag is a copy of `isScheduled(habit, date)` taken at the moment of the tap. A schedule edit the same day makes that copy out of date. Two cases (Module 3 note):
   - An extra is marked, then the habit is edited so that day becomes scheduled. The calendar shows a filled dot, but the row says `extra: true`.
   - A scheduled completion is made, then the habit is edited so that day is no longer scheduled. The calendar shows a diamond, but the row says `extra: false`.

   Today's `countDays` takes Y from `isScheduled` and X from the flag:
   - In the first case, the day is counted as **missed** although it was done.
   - In the second case, the completion **disappears**: it is neither scheduled nor an extra.

   The flag cannot drive Y anyway, because missed days have no row to carry a flag. Section 10 also says `isScheduled` is the only answer to "is H scheduled on D".

   **The rule from this module on:**
   - A completion counts as **scheduled** when `isScheduled(habit, c.date)` is true, and as **extra** when it is false.
   - This applies in `countDays`, `lastCountedDay`, Analysis and the CSV `Extra` column.
   - The stored `extra` field stays as it is. It is still written by `buildCompletion`, and still copied by backups and Restore exactly as stored. Nothing rewrites existing rows.
   - The `late` flag **is** trusted. It comes from `deviationMin`, which uses the set time copied onto the row, so no edit can make it out of date.

   **Tradeoff accepted:** in the edit-on-the-same-day case, a stored row can say `extra: true` while every screen calls it scheduled.

   Step 1 changes section 10's counting rules to:
   - "**X days** = scheduled days within that range that have a completion. Whether a completion is scheduled or extra is decided by `isScheduled` on its date, never by the stored `extra` flag. The flag is a record of the moment of marking and is kept unchanged."
   - "**Discontinue** sets the open period's end to today if today is scheduled and has a completion, otherwise yesterday."

2. **No PowerShell rules are added to `.claude/settings.json`.**

   The current Claude Code permissions docs say that on Windows with Git Bash installed, **any `Bash(...)` deny rule turns the PowerShell tool off for the session**. The committed file already has such rules, so the PowerShell tool is off. The docs also say that adding a scoped `PowerShell(...)` rule turns PowerShell back **on**. "Matching" rules would therefore give Claude a second shell, guarded only by rules written alias by alias.

   The rule syntax, for the record, would be `"PowerShell(Remove-Item *)"`. It has the same shape as Bash rules, matching ignores case, and common aliases are matched automatically.

   The file stays exactly as it is, and Claude never edits it (section 14).

   **Step 1 check:** Claude confirms that no `PowerShell` tool appears in its own tool list. If one does, **stop**. The owner then decides how to change the file; Claude does not edit it.

   **Tradeoff accepted:** if a future Claude Code version changes this behaviour, the step 1 check catches it, and the owner edits the file at that point.

   Step 1 replaces the Module 4 note "Gap in the rules, not changed: …" with: "**PowerShell:** the Bash deny rules in `.claude/settings.json` also turn Claude Code's PowerShell tool off on Windows with Git Bash (Claude Code docs, checked 2026-11-05). Adding any `PowerShell(...)` rule would turn it back on, so none are added. Each module's step 1 confirms the PowerShell tool is absent."

3. **Chart.js 4.5.1, saved by hand as `vendor/chart.umd.min.js`.**

   | Item | Value |
   |---|---|
   | Download link | `https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js` |
   | Saved as | `vendor/chart.umd.min.js` |
   | Size | 208,522 bytes |
   | SHA-256 | `48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a` |

   The owner saves it in either of two ways:
   - Type in the desktop app's Terminal pane in `app_3`: `curl.exe -L -o vendor/chart.umd.min.js https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js`. `curl.exe` works in both PowerShell and Git Bash.
   - Or open the link in a browser and save the page into `app_3\vendor\` under that name.

   **Why 4.5.1:** it has been stable for a year. 4.6.1 came out on 22 October 2026, two weeks before this spec, and npm has no 4.6.0. Nothing in this module needs 4.6.

   **Checked against the CSP:**
   - The build contains no `eval` and no `new Function`.
   - It adds no `<style>` elements. It sets styles only through `element.style`, which the CSP does not restrict.
   - It makes no network requests.
   - Its last line points to a `chart.umd.min.js.map` file, which is not saved. DevTools may show a harmless 404 for it; the app never requests it.

   **How it loads:** the file is a UMD build that sets `globalThis.Chart` even when imported from a module. `js/charts.js` loads it only when Analysis is first shown, with `await import('../vendor/chart.umd.min.js')`, then reads `globalThis.Chart`. This keeps 200 KB off the start-up path, and `script-src 'self'` allows it. Step 3 confirms that this works in the browser. If it does not, fall back to a plain `<script src="./vendor/chart.umd.min.js" defer>` in `index.html` and record that in the Notes.

   The file is added to `APP_FILES` so Analysis works offline.

   **Chart rules:**
   - Category axes only. The time axis needs a date adapter, which is not installed. Labels come from pure logic.
   - `animation: false`.
   - `responsive: true` and `maintainAspectRatio: false`, inside a container with a fixed CSS height.
   - Every chart is destroyed before it is redrawn.
   - Colours are read from the CSS variables at draw time. Charts redraw on theme change and on `visibilitychange`.

   **Tradeoff accepted:** no 4.6 features.

4. **Time ranges, today, streaks and discontinued habits.**

   **Ranges.** A row of three buttons at the top of Analysis. **Last 30 days** is selected each time the view opens; the choice is not stored.

   | Range | From | To |
   |---|---|---|
   | Last 30 days | today − 29 days | today |
   | This month | the 1st of the current month | today |
   | All time | the habit's first active day | today |

   **Today counts only once it is done.** For each habit, the last counted day is today if today is scheduled and has a completion, otherwise yesterday. This is the rule the discontinue message already uses, so a pending habit does not lower the percentage each morning, and does not break a streak. Extras dated today still count in the extras number.

   **What follows the range:**
   - The percentage, the on-time, late, missed and extra counts, the timing figures and both detail charts all follow the range.
   - **Streaks are always all-time**, because a streak cut off by a range would mislead.

   **Discontinued habits:**
   - They appear under a collapsed `<details>` titled **Discontinued (N)**, below the active habits, in `createdAt` order.
   - Their figures cover only their active periods. `isScheduled` already limits this.
   - They show the best streak and no current streak.
   - Under the name they show "Discontinued <formatDate(last period end)>".

   **Empty cases:**
   - A habit with no scheduled days in the range shows "No scheduled days in this range." in place of the percentage. This covers a one-time habit whose date is still ahead.
   - With no habits at all, the view shows "Add habits from Menu → Habits."

   **Tradeoff accepted:** no custom date range, and the range choice resets each time.

5. **`countDays` is reused, so Analysis and the discontinue message always agree.**

   - Its signature becomes `countDays(habit, completions, lastDay, firstDay = null)`. When `firstDay` is given, the loop starts at the later of `firstDay` and the first period start.
   - The `!c.extra` filter is removed. The loop already counts only days where `isScheduled` is true, so "has a completion" is enough (decision 1).
   - `lastCountedDay` changes to "today if `isScheduled(habit, today)` and a completion exists for today, otherwise yesterday". The private helper `hasNonExtraCompletion` becomes `hasScheduledCompletion`.
   - The existing discontinue call is unchanged. All time in Analysis therefore gives exactly the X / Y the discontinue message would show today.
   - The percentage is `Math.round(100 × X / Y)`, the same formula as `discontinueMessage`.

6. **Timing figures** (on-time completions only, so long delays do not distort them).

   Take the deviations `d₁ … dₙ`, in minutes, of the scheduled, non-late completions in the range.
   - **Average:** `mean = (d₁ + … + dₙ) / n`. This is the typical offset from the set time: positive means late, negative means early.
   - **Spread:** the population standard deviation, `spread = √( Σ (dᵢ − mean)² / n )`. It measures how far a typical completion sits from that average, in minutes. A small spread means a steady routine, even if the average is late.
   - **Display:** both are rounded to whole minutes. The average uses `formatDeviation`, and the spread shows as "± N min". The spread is shown only when `n ≥ 2`, because one value has no spread.
   - **Late completions** are counted separately, with their own average (for example "1 d 1 h late"). They are left out of both figures above.
   - **Extras** are counted only. They are not timed, because they had no scheduled slot.

7. **Layout** (mobile-first, readable at 360 px, both themes).

   **Top of the view:**
   - The range buttons.
   - An **Overview** card with a horizontal bar chart: completion % per active habit with Y > 0. Each bar uses its habit's colour, and the axis runs from 0 to 100.

   **One card per active habit, in `createdAt` order:**
   - Colour dot, name, and `describeSchedule(current version)`.
   - The percentage in large type, and "7 of 9 scheduled days" under it.
   - "Streak 2 · Best 3".
   - "On time 6 · Late 1 · Missed 2 · Extra 1".
   - "Timing: average 10 min late, spread ± 13 min". With one value: "Timing: 10 min late (1 completion)". With none: "No on-time completions yet."
   - If there are late completions: "Late: 1, average 1 d 1 h late".

   **Tapping a card** toggles its detail area, one open at a time. The detail area holds two charts:
   - **Weekly completion:** bars of the % per week (weeks start on Monday). Each label is the Monday's short date ("2 Nov"). A week with no scheduled days gets a gap, not 0.
   - **Timing:** points showing the deviation in minutes per on-time completion, labelled by short date, with a line at 0. The note under it reads "Late completions are not plotted."

   **Refresh:** the view re-reads the data whenever it is shown (`onViewShown`) and when the app returns to the screen.

8. **CSV `Extra` column** (in `js/backup-logic.js`). `buildCsv` writes `Extra` from `isScheduled(habit, c.date)`, not from the stored flag. CSV, calendar and Analysis then always agree. The backup file is unchanged: it still copies rows exactly.

9. **Messages** for the Chart.js loader:
   - If the import fails, or `globalThis.Chart` is missing, every chart area shows "Charts couldn't load." and the figures still show. The figures never depend on Chart.js.
   - The error goes to the console, where Eruda shows it.

## Files

| File | Action |
|---|---|
| `js/analysis-logic.js` | New. **Pure functions, no database, no page access, no Chart.js.** See below |
| `js/charts.js` | New. Loads Chart.js once, builds the three chart configs from plain data, destroys old charts |
| `js/analysis-view.js` | New. Range buttons, Overview, habit cards, detail toggle, discontinued section, refresh |
| `js/habit-logic.js` | `countDays` gets `firstDay` and drops the flag filter; `lastCountedDay` uses `isScheduled` (decision 5) |
| `js/backup-logic.js` | CSV `Extra` from `isScheduled` (decision 8) |
| `index.html` | Analysis view markup; placeholder removed |
| `app.js` | Start the Analysis view |
| `styles.css` | Range buttons, cards, chart containers (fixed height); both themes, 360 px |
| `sw.js` | Add `./js/analysis-logic.js`, `./js/analysis-view.js`, `./js/charts.js`, `./vendor/chart.umd.min.js` to `APP_FILES` |
| `version.js` | `0.6.0`, then `0.6.1` for the update test |
| `vendor/chart.umd.min.js` | Saved by the owner (decision 3). Step 1 checks and commits it |
| `tests/analysis-logic.test.js` | New, on the browser test page |
| `tests/habit-logic.test.js`, `tests/backup-logic.test.js` | Cases added for decisions 1, 5 and 8 |
| `tests/index.html` | Also runs `analysis-logic.test.js` |
| `CLAUDE.md` | Step 1 changes, and Status at the end |

`.claude/settings.json` is **not** changed (decision 2).

## `js/analysis-logic.js` (pure functions)

`today` and dates are `"YYYY-MM-DD"` strings passed in. Use `js/dates.js` helpers; never `toISOString()`. Whether a day is scheduled is answered only by `isScheduled`. Counting goes through `countDays` and `lastCountedDay` from `habit-logic.js`, never a second loop.

- `RANGES`: `[{ key: 'last30', label: 'Last 30 days' }, { key: 'month', label: 'This month' }, { key: 'all', label: 'All time' }]`.
- `rangeStart(rangeKey, today)` returns `addDays(today, -29)`, the 1st of today's month, or `null` for `all`.
- `isScheduledCompletion(habit, c)` returns `isScheduled(habit, c.date)`.
- `meanAndSpread(values)` returns `{ n, mean, spread }`:
  - `mean` is `null` when `n = 0`;
  - `spread` is `null` when `n < 2`;
  - otherwise it is the population standard deviation (decision 6).
  - Values are not rounded here.
- `streaks(habit, completions, lastDay)` returns `{ current, best }`, scanning scheduled days from the first period start to `lastDay`. A completed day extends the run and a missed one resets it to 0. `current` is the run at the end.
- `habitSummary(habit, completions, rangeKey, today)` returns:
  `{ habitId, lastDay, from, x, y, percent, missed, onTime, late, extra, timing, lateTiming, currentStreak, bestStreak }`
  - `lastDay = lastCountedDay(...)`.
  - `{ x, y } = countDays(habit, completions, lastDay, from)`.
  - `percent` is `null` when `y = 0`.
  - `missed = y − x`.
  - `onTime` and `late` count the scheduled completions with `from ≤ date ≤ lastDay`, split by the stored `late`.
  - `extra` counts the non-scheduled completions with `from ≤ date ≤ today`.
  - `timing = meanAndSpread(on-time deviations)`.
  - `lateTiming = meanAndSpread(late deviations)`.
  - `currentStreak` is `null` for a discontinued habit.
  - `from` is `null` for `all`.
- `weeklyRates(habit, completions, from, lastDay)` returns `[{ weekStart, label, x, y, percent }]`, one entry per Monday-start week from the first counted day to `lastDay`, in order. `percent` is `null` when `y = 0`.
- `deviationSeries(habit, completions, from, lastDay)` returns `[{ date, label, min }]` for on-time scheduled completions, in date order.
- `analysisModel(habits, completions, rangeKey, today)` returns `{ active: [{ habit, summary }], discontinued: [{ habit, summary }] }`, each in `createdAt` order.
- `shortDate(date)` returns "2 Nov".
- Text helpers with decision 7's exact wording:
  - `percentLine(summary)` returns "7 of 9 scheduled days" or "No scheduled days in this range."
  - `countsLine(summary)` returns "On time 6 · Late 1 · Missed 2 · Extra 1".
  - `timingLine(timing)` gives the three forms from decision 7, with the average rounded and passed through `formatDeviation`, and the spread rounded.
  - `lateLine(lateTiming)` returns "" when there are no late completions.
  - `streakLine(summary)` returns "Streak 2 · Best 3" for active habits and "Best streak 3" for discontinued ones.

## Steps

Auto mode. Claude does not stop before every step. It **must** stop at:
- step 2 (plan);
- every push;
- both phone tests;
- any failing earlier test in step 3 that comes from decision 1 or 5 (report the case; do not "fix" an old test without approval);
- any decision this spec does not settle, any denied action, or any problem it cannot solve after two attempts.

1. **Check the starting point and update `CLAUDE.md`.**
   - Check you are on an up-to-date `main`. The only things uncommitted should be `docs/modules/module-5.md` and `vendor/chart.umd.min.js`.
   - Check that `.claude/settings.json` is unchanged since Module 4: it has `ask` for `git push` and `deny` for `rm -rf`, `curl` and `Edit(./vendor/**)`.
   - Confirm that no `PowerShell` tool is in your tool list (decision 2). If one is, **stop**.
   - Check `vendor/chart.umd.min.js` with `sha256sum vendor/chart.umd.min.js` (a read-only command). The output must be `48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a`, the size 208,522 bytes, and the first comment line `Chart.js v4.5.1`. If the file is missing or different, **stop** and give the owner the decision 3 command.
   - Edit `CLAUDE.md`:
     - Section 10, Counting rules: the two lines from decision 1.
     - Notes from Module 4: the PowerShell line from decision 2.
     - Section 15: the `vendor/` row reads "Third-party libraries saved locally (Dexie, Eruda, Chart.js 4.5.1; jsPDF later)".
   - Commit: "Module 5 spec, Chart.js 4.5.1 and CLAUDE.md updates".
2. **Plan.** List the files and anything you would do differently, with the reason. **Stop and wait for approval.**
3. **Logic and tests.**
   - Make the `habit-logic.js` changes (decision 5) and the `backup-logic.js` change (decision 8).
   - Write `js/analysis-logic.js` and `tests/analysis-logic.test.js`.
   - Add the new cases to the existing test files.
   - Add the test file to `tests/index.html` and run the page in the built-in browser against a temporary local web server sending `Cache-Control: no-store`, on `127.0.0.1:8765` (Module 4 note).
   - In the same browser, confirm that `await import('./vendor/chart.umd.min.js')` from a module script sets `globalThis.Chart.version === '4.5.1'` with the app's CSP in force (decision 3).
   - **Do not continue until every case passes.**
4. **`js/charts.js`.**
5. **The view:** `index.html`, `js/analysis-view.js`, `styles.css`, `app.js`.
6. **Service worker and version:** add the four files to `APP_FILES` and set `version.js` to `0.6.0`.
7. **Checks before deploying.** Run these yourself in the built-in browser on `127.0.0.1:8765`, with fake data only.
   - **Getting the fake data in:** build a fake backup file in the page from the test fixture below, and load it with the app's own Restore.
   - **Before each reload of new code:** unregister the service worker and clear its caches.
   - **Reporting:** report each item as PASS or FAIL.
   - **Afterwards:** clear that origin's IndexedDB from the page, and delete the server script and any temporary file by name (the deny rules block `rm -r`).

   The checks:
   - Test page: every case passes, including all Module 1 to 4 tests.
   - The console shows no CSP violation on opening Analysis. The Network panel shows Chart.js loaded from `./vendor/` only, with no other host.
   - With the fixture, on the fake date 2026-11-20, set by passing `today` through a temporary query parameter that is removed afterwards. If that is impractical, check the same figures through the test page instead, and say so. All time:
     - Gym shows 78%, "7 of 9 scheduled days", "Streak 2 · Best 3", "On time 6 · Late 1 · Missed 2 · Extra 1", "average 10 min late, spread ± 13 min", "Late: 1, average 1 d 1 h late".
     - Read is under Discontinued (1), with 50%, 3 of 6 days, "Best streak 2".
     - Walk shows 0%, 0 of 14 days, Extra 1.
     - Dentist shows "No scheduled days in this range."
   - The figures match the calendar: for Gym in November, filled circles before 2026-11-20 = 7, filled circles plus faded rings before 2026-11-20 = 9, and the only diamond is on 16 Nov. 10 Nov shows a filled circle even though its stored flag says extra (decision 1).
   - **This month** and **Last 30 days** change the figures as the test cases say, and the streaks stay the same.
   - Tapping Gym opens the weekly chart (100, 50, 100 for the weeks of 2, 9 and 16 Nov) and the timing chart (6 points). Tapping another card closes Gym's detail area.
   - The Overview chart has bars for Gym and Walk only. Read is discontinued, and Dentist has Y = 0.
   - Switching theme redraws the charts in the new colours. No old chart is left behind: `Chart.instances` holds only the charts on screen.
   - With Chart.js renamed away by a temporary route in the test server, "Charts couldn't load." shows and the figures still show.
   - The CSV export of the fixture shows `Extra` = No for Gym on 2026-11-10 and Yes for Walk on 2026-11-16.
   - The discontinue message for Gym, opened and cancelled, reads "7 days out of 9 days (78%)", the same as Analysis All time.
   - Both themes and a 360 px wide window: buttons, cards and charts are readable, with no sideways scrolling.
   - (Offline is checked on the phone, because the built-in browser refuses service workers; Module 4 note.)
8. **Commit and deploy.** Commit on `main`. **Stop.** The owner takes a **Back up** to Drive on the phone first. Analysis changes no data, but this is the first deploy over real data. Then push under the section 14 rule.
9. **Phone test, part 1 (read-only on real data).** The owner opens the installed app and taps the update banner (version 0.6.0). **Do not add, undo or edit anything for this test.**
   - Note the About counts (habits H, completions C).
   - Open Analysis. The range buttons, Overview and one card per habit show, with no error.
   - **Manual check, for one habit with at least a week of history,** with **This month** selected. On the calendar for this month, count:
     - **X** = filled circles on days before today, plus today's dot if it is filled;
     - **Y** = X + faded rings on days before today;
     - **extras** = diamonds.

     The card must show X of Y, the same extras number, and `round(100 × X / Y)`%. If any real habit has had a schedule change, check that one too, because it covers both schedule versions.
   - Tap a card: both charts draw.
   - Airplane mode, close the app fully, reopen: Analysis and its charts still work offline.
   - Close Analysis and check the About counts: still H and C.

   **Phone test, part 2 (the update is safe).** Make one tiny visible change, set `version.js` to `0.6.1`, commit, and push under the section 14 rule. The owner reopens the app and taps the banner. Expected: version 0.6.1, About counts still H and C, and the manually checked card shows the same figures, unless a completion was added in between.
10. **Close the module.** Update Status in `CLAUDE.md`:
    - "Module 5 complete (date), next is Module 6".
    - Current version `0.6.1`.
    - The Module 5 entry under Done, with the test count.
    - "Notes from Module 5" with anything that differed from this spec.

    Commit, push under the section 14 rule, then stop. Do not start Module 6.

## Test cases

Build habits with `buildNewHabit`, `applyEdit` and `applyDiscontinue`, and completions with `buildCompletion`, so the modules are tested together. Create `nowMs` with `new Date(y, m − 1, d, hh, mm).getTime()`. These figures were computed by running the real Module 1 to 4 code with the decision 1 and 5 changes, and give the same results in Indian time and in UTC.

### Fixture

All four habits are created on 2026-11-02, a Monday, in this order.

**Gym:** Mon/Wed/Fri at 07:00. Edited **on 2026-11-10** to Tue/Wed/Fri at 07:00.

| Date | Built with | Tapped at | Result |
|---|---|---|---|
| 11-02 | Gym after edit | 11-02 07:00 | 0 min |
| 11-04 | Gym after edit | 11-04 07:15 | +15 |
| 11-06 | Gym after edit | 11-06 06:50 | −10 |
| 11-10 | **Gym before the edit** | 11-10 07:30 | stored `extra: true`, +30 |
| 11-11 | Gym after edit | 11-11 07:05 | +5 |
| 11-16 (Mon) | Gym after edit | 11-16 18:00 | +660, extra |
| 11-17 | Gym after edit | **11-18 08:00** | +1500, late |
| 11-18 | Gym after edit | 11-18 07:20 | +20 |

None on 11-09, 11-13 or 11-20. The 11-10 row is decision 1's first case.

**Read:** every day at 22:00.

| Date | Tapped at | Result |
|---|---|---|
| 11-02 | 22:00 | 0 min |
| 11-03 | **11-04 10:30** | +750, late |
| 11-05 | 21:50 | −10 |

Then discontinued with today 2026-11-08, giving the period 11-02 to 11-07.

**Dentist:** one-time on 2026-11-25 at 18:00. No completions.

**Walk:** every day at 06:00. Completion 11-16 at 06:10, built **before** the edit, with stored `extra: false`. Then edited **on 2026-11-16** to Sat/Sun only. This is decision 1's second case.

Today is **2026-11-20** (a Friday) unless a case says otherwise.

### habit-logic changes

- `countDays(gym, comps, "2026-11-19")` → `{ x: 7, y: 9 }`. Before this module it gave `{ x: 6, y: 9 }`: the 11-10 row was counted as missed.
- `countDays(gym, comps, "2026-11-19", "2026-11-10")` → `{ x: 4, y: 5 }`.
- `countDays(read, comps, "2026-11-07")` → `{ x: 3, y: 6 }`, and `discontinueMessage` → "…for 3 days out of 6 days (50%)…".
- `lastCountedDay(gym, comps, "2026-11-20")` → "2026-11-19".
- With a Gym completion on 11-20 at 07:00 added → "2026-11-20".
- `lastCountedDay(walk, comps, "2026-11-16")` → "2026-11-15": 11-16 has a completion but is no longer scheduled.
- Every existing Module 2 case still passes. If one fails, stop (step list).

### Ranges

- `rangeStart('last30', '2026-11-20')` → "2026-10-22".
- `rangeStart('month', '2026-11-20')` → "2026-11-01".
- `rangeStart('all', …)` → `null`.
- `rangeStart('last30', '2027-01-10')` → "2026-12-12".

### Mean and spread

- `meanAndSpread([])` → `{ n: 0, mean: null, spread: null }`.
- `[7]` → `{ n: 1, mean: 7, spread: null }`.
- `[0, 15, -10, 30, 5, 20]` → `mean` 10, `spread` 13.2288 (to 4 decimal places).
- `[0, -10]` → `mean` −5, `spread` 5.

### Summaries, All time, today 2026-11-20

**Gym:**
- `lastDay` "2026-11-19", x 7, y 9, percent 78, missed 2.
- onTime 6, late 1, extra 1.
- timing mean 10, spread 13.2288.
- lateTiming n 1, mean 1500.
- currentStreak 2, bestStreak 3.
- With a completion on 11-20 at 07:00 added: x 8, y 10, percent 80, onTime 7, currentStreak 3, bestStreak 3.

**Read** (discontinued):
- x 3, y 6, percent 50, missed 3.
- onTime 2, late 1, extra 0.
- timing mean −5, spread 5.
- lateTiming mean 750.
- currentStreak `null`, bestStreak 2.

**Dentist:** x 0, y 0, percent `null`. `percentLine` → "No scheduled days in this range."

**Walk:**
- x 0, y 14, percent 0, missed 14.
- extra **1**. Before this module, the 11-16 row counted nowhere.
- timing n 0.

### Ranges on a later day, Gym, today 2026-12-02, no new completions

- **This month:** x 0, y 1, percent 0. bestStreak still 3.
- **Last 30 days** (from 11-03): x 6, y 13, percent 46, onTime 5, timing mean 12.
- **All time:** x 7, y 14, percent 50.

### Weekly and series, Gym, All time, today 2026-11-20

- `weeklyRates`:
  - week of 2 Nov: x 3, y 3, 100;
  - week of 9 Nov: x 2, y 4, 50;
  - week of 16 Nov: x 2, y 2, 100.
  - Labels "2 Nov", "9 Nov", "16 Nov".
- `deviationSeries` → dates 11-02, 11-04, 11-06, 11-10, 11-11, 11-18 with minutes 0, 15, −10, 30, 5, 20. 11-17 is late and 11-16 is an extra, so neither is included.

### Model and text

- `analysisModel` → `active` [Gym, Dentist, Walk] and `discontinued` [Read], in `createdAt` order.
- Gym's lines:
  - `percentLine` → "7 of 9 scheduled days";
  - `countsLine` → "On time 6 · Late 1 · Missed 2 · Extra 1";
  - `timingLine` → "Timing: average 10 min late, spread ± 13 min";
  - `lateLine` → "Late: 1, average 1 d 1 h late";
  - `streakLine` → "Streak 2 · Best 3".
- Read's lines:
  - `timingLine` → "Timing: average 5 min early, spread ± 5 min";
  - `lateLine` → "Late: 1, average 12 h 30 min late";
  - `streakLine` → "Best streak 2".
- `timingLine({ n: 1, mean: 10, spread: null })` → "Timing: 10 min late (1 completion)".
- `timingLine({ n: 0, … })` → "No on-time completions yet."
- `shortDate("2026-11-02")` → "2 Nov".
- The input arrays and objects are unchanged after every call.

### CSV (backup-logic)

- With the fixture, `buildCsv` writes `Extra` = No for Gym 2026-11-10 (stored flag `true`), and Yes for Walk 2026-11-16 (stored flag `false`).
- All Module 4 CSV cases still pass.

## Done when

- [ ] Every test-page case passes, including all Module 1 to 4 tests.
- [ ] Every item in the step 7 checklist passes, with no CSP violation and no request outside the app.
- [ ] Phone part 1: Analysis works online and offline, and one real habit's This month figures match the manual calendar count. Any real habit with a schedule change also matches.
- [ ] Phone part 2: after the update to 0.6.1, About counts and the checked figures are unchanged.
- [ ] Status in `CLAUDE.md` updated and pushed.

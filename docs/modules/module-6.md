# Module 6: Yearly PDF

Read `CLAUDE.md` fully before this file. This file adds detail to section 13, Module 6. It changes the description of the yearly PDF in sections 4, 5 and 12 (one small grid per habit, chosen by tick boxes, at most 10 per page). Step 1 writes those changes; they are listed under "Decisions made for this module". Every other rule in sections 6, 7, 8 and 10 stays as it is. If anything here disagrees with `CLAUDE.md`, stop and ask the owner.

## Goal

The Export view gains a **Yearly PDF** card. The owner picks a year and the habits to include, sees a preview, and shares or downloads a one-page A4 PDF. On that page each habit has its own GitHub-style year grid (weeks start on Monday), with a mark on every day that matches the month calendar.

The downloaded PDF must match the preview and fit on one page. This is the **last module** in section 13.

## Starting point (state of `main` after Module 5)

- **Version and data:**
  - Version `0.6.1`, schema version 2.
  - **No database version and no migration in this module.** Nothing new is stored; the card only reads.
- **Functions this module reuses:**
  - `js/calendar-logic.js` exports `dayDots(habits, completions, date, today)`. Its states are `done`, `extra`, `due`, `missed` and `upcoming`, decided with `isScheduled` (Module 5 decision 1).
  - `js/habit-logic.js` exports `countDays(habit, completions, lastDay, firstDay = null)`, `lastCountedDay` and `formatDate`.
  - `js/dates.js` exports `todayStr`, `addDays`, `isoWeekday`, `parseDateStr`, `toDateStr`.
- **Code this module changes:**
  - `js/backup.js` has three private helpers: `downloadFile(blob, name)`, `canShareFile(file)` and `shareFile(file)` (returns `'shared'`, `'cancelled'` or `'failed'`). This module exports them unchanged.
  - `js/charts.js` shows the lazy-loading pattern that worked under the CSP: `import('../vendor/…')`, then read `globalThis`.
  - The Export view holds the **Backup** and **CSV for Excel** cards.
- **Already in place:**
  - `.gitignore` already blocks `*.pdf`.
  - `tests/analysis-fixture.js` holds the Module 5 fake data (Gym, Read, Dentist, Walk; today 2026-11-20). This module's tests reuse it.
- **Data and testing:**
  - **The phone holds real data.** Nothing in this module may add, change or remove a row on the phone. Fake data is used only on the laptop at `http://127.0.0.1:8765`.
  - Node is **not** installed on the laptop. Tests run on the browser test page.
- **How this module is run:**
  - A Local session in the Claude desktop app on `app_3`, permission mode **Auto**, with `.claude/settings.json` unchanged.
  - Claude runs the browser checks; the owner does the phone tests.
- **Owner's preparation before the session** (step 1 checks both):
  1. This file is saved as `docs/modules/module-6.md`.
  2. jsPDF 4.2.1 is saved as `vendor/jspdf.umd.min.js` (decision 5).

## Decisions made for this module

If the owner wants a different choice, they change it before step 2.

1. **One small year grid per habit, stacked down the page.**
   - One combined grid would need up to six dots inside a 5 mm square, which is unreadable on paper. The month calendar already gives the combined view.
   - Each habit gets a grid of 7 rows (Monday at the top) by one column per Monday-start week:
     - 53 columns for 2026, 2027 and 2028;
     - 54 columns when 1 January is a Sunday in a leap year (2040).
   - Days outside the year are left blank.
   - Month labels (Jan … Dec) appear once, above the first grid, over the column that holds each month's 1st. Mon, Wed and Fri labels sit to the left of every grid.
   - **Tradeoff accepted:** no single combined year view.

2. **Tick boxes choose the habits, at most 10 per page.**
   - **The list:** every habit with at least one scheduled day **or** completion in the chosen year, active or discontinued, in `createdAt` order. A discontinued habit shows "(discontinued)" after its name.
   - **Default:** all ticked. The owner unticks habits such as old test habits; this changes nothing in the data.
   - **Too many:** with more than 10 ticked, the preview is not drawn, both save buttons are disabled, and the card says "Choose at most 10 habits for one page."
   - **None:** with none ticked, the card says "Tick at least one habit."
   - **Empty year:** if the year has no habits at all, the card says "No habits in <year>." and the buttons are disabled.
   - The ticks are not stored and reset when the year changes.
   - **Tradeoff accepted:** more than 10 habits need two PDFs.

3. **Day marks come from `dayDots`, so the PDF always matches the month calendar.** For each habit and each date in the year, the state is `dayDots([habit], completions, date, today)[0]?.state ?? null`. Every day of the year first gets a faint grey square (`#ebedf0`, 90% of the cell, rounded corners); then:

   | State | Mark on top of the square |
   |---|---|
   | `done` | filled circle in the habit's colour |
   | `extra` | filled diamond in the habit's colour |
   | `missed` or `due` | ring in the habit's colour |
   | `upcoming` | small grey dot (`#b0b4ba`), so it can't be mistaken for missed |
   | `null` (not scheduled, or outside an active period) | nothing |

   The circle, diamond and ring use 70% of the cell size, and the ring's line width is 12% of the cell. A key at the bottom of the page shows each mark with its word: Done, Extra, Missed, Upcoming, Not scheduled.

4. **Page and drawing.**
   - **Page:** A4 landscape, 297 × 210 mm, always on a white background whatever the app's theme. Text colours are fixed (`#1a1a1a`, with `#666666` for secondary text), so the page prints well.
   - **Canvas:** the page is drawn **once**, on a canvas of **2376 × 1680 px** (8 px per mm, about 203 dpi). Use `ctx.scale(8, 8)` so all drawing is in millimetres.
   - **Preview:** that same canvas, scaled by CSS to the card's width with the 297:210 shape kept.
   - **PDF:** embeds that canvas as a PNG. The preview and the PDF are therefore the same picture by construction.
   - **Text:** all text is drawn on the canvas in `system-ui, sans-serif`. Names in Hindi, Nepali or any script show correctly. (jsPDF's built-in fonts cover only Western European letters, so text drawn by jsPDF would break such names.)
   - **Tradeoff accepted:** the PDF's text is part of a picture, so it cannot be selected or searched.

   **Layout in millimetres** (`pageLayout(n)` in the pure logic, for n ticked habits):

   | Part | Size |
   |---|---|
   | Margins | 10 mm on every side |
   | Header (title and made date) | 16 mm |
   | Key | 8 mm at the bottom |
   | Weekday label column | 10 mm |
   | Usable area | 267 × 166 mm |

   - **Cell size:** `cell = min(267 / 54, 166 / (1 + 9n))`. The width always allows 54 columns, so the look is the same every year.
     - The `1` in `1 + 9n` is the month-label row.
     - Each habit takes 9 cells of height: 1.5 for its heading line, 7 for its grid and 0.5 for the gap below.
   - **Resulting sizes:** 4.9444 mm for 1 to 3 habits, 4.4865 for 4, 3.0182 for 6 and 1.8242 for 10. 10 is the most allowed (decision 2).
   - **Heading font size:** `min(4, max(2.2, 1.1 × cell))` mm.
   - **Header:**
     - "Habit Tracker · <year>" in bold at the left;
     - "Made <formatDate(today)>" at the right, in secondary text.
   - **Grid heading per habit:**
     - Colour dot, the name, then " · <percent>% · <x> of <y> scheduled days" (decision 6).
     - When `y = 0`: " · no scheduled days yet".
     - A discontinued habit adds " · discontinued".
     - A name too long for the line is cut with "…".

5. **jsPDF 4.2.1, saved by hand as `vendor/jspdf.umd.min.js`.**

   | Item | Value |
   |---|---|
   | Download link | `https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js` |
   | Saved as | `vendor/jspdf.umd.min.js` |
   | Size | 420,165 bytes |
   | SHA-256 | `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54` |

   The owner saves it in either of two ways:
   - In the Terminal pane in `app_3`: `curl.exe -L -o vendor/jspdf.umd.min.js https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js`.
   - Or open the link in a browser and save the file into `app_3\vendor\` under that name.

   **Why 4.2.1:** it is the current version, released 17 March 2026, so it has had eight months to settle. The 4.x line comes after the 2025 security fixes in 3.x.

   **Checked against the CSP and tested:**
   - The build has no `eval` and no `new Function`. Its compression code is bundled inside.
   - It has one `<style>` element and some `XMLHttpRequest` calls, but only in features this app never calls: opening the PDF in a new window, saving from a web address, and loading fonts or images by address.
   - Its optional add-ons (`html2canvas`, `dompurify`, `canvg`) are used only by `.html()` and `.svg()`, which are not called and not installed.
   - It sets `globalThis.jspdf` when loaded.
   - Tested in headless Chromium: a 2376 × 1680 canvas containing Devanagari text, embedded with `addImage(canvas, 'PNG', 0, 0, 297, 210, undefined, 'FAST')`, gave 1 page of 297 × 210 mm and 64 KB.

   **The only jsPDF calls allowed:**
   - `new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })`
   - `setProperties({ title: 'Habit Tracker <year>' })`
   - that `addImage` call
   - `output('blob')`
   - **Never** `save()`, `output('dataurlnewwindow')` or `html()`.

   **How it loads:** `js/year-view.js` loads it once with `await import('../vendor/jspdf.umd.min.js')` the first time the card prepares a PDF, then reads `globalThis.jspdf.jsPDF`. Step 3 confirms this works under the CSP. If it does not, fall back to a `<script defer>` tag and record that in the Notes. The file is added to `APP_FILES`, so PDFs work offline.

   **If it fails to load:** the preview still shows, both buttons stay disabled, the status line says "PDF maker couldn't load.", and the error goes to the console.

   **Tradeoff accepted:** about 420 KB more kept offline.

6. **Year and figures.**
   - **Year picker:** a `<select>` lists every year from the year of the earliest active-period start of any habit up to today's year, newest first. The current year is selected each time Export opens.
   - **Figures:** each grid heading shows that year's figures from `countDays`:
     - `first = "<year>-01-01"`;
     - `last` = the earlier of `"<year>-12-31"` and `lastCountedDay(habit, completions, today)`;
     - if `last < first`, the figures are `{ x: 0, y: 0 }`;
     - otherwise `countDays(habit, completions, last, first)`.
   - The percentage is `Math.round(100 × x / y)`. For the same days, this is the same number Analysis gives.
   - **Tradeoff accepted:** no custom date range.

7. **Saving, as with backups.**
   - **Button labels:** **Share PDF** (primary) and **Download instead**.
   - **File:** `habit-year-<year>.pdf`, type `application/pdf`. Chrome allows PDFs in the share sheet.
   - **The PDF is built ahead of time:** 300 ms after the preview is last redrawn, the card builds the PDF blob and keeps it, so the tap only shares the ready file. Chrome allows a share only shortly after a tap, and building the PDF can take a second on the phone. The buttons are disabled, with "Preparing PDF…", until the blob is ready, and again after any change.
   - **Share PDF:**
     - uses `canShareFile` and `shareFile` from `js/backup.js` (now exported);
     - `'shared'` → "PDF shared.";
     - `'cancelled'` → "PDF not saved.";
     - `'failed'`, or sharing impossible → download instead, then "PDF downloaded."
   - **Download instead:** `downloadFile`, then "PDF downloaded."
   - Nothing is written to the database. `lastBackupAt` is never touched.

## Files

| File | Action |
|---|---|
| `js/year-logic.js` | New. **Pure functions, no database, no page or canvas access.** See below |
| `js/year-draw.js` | New. `drawYear(ctx, model)`: draws one page from the plain model onto a 2D context. No database access |
| `js/year-view.js` | New. The Yearly PDF card: year picker, tick list, preview, jsPDF loader, building the blob ahead of time, share and download |
| `js/backup.js` | Export `downloadFile`, `canShareFile`, `shareFile` unchanged |
| `index.html` | The Yearly PDF card in the Export view, below CSV |
| `app.js` | Start the year view |
| `styles.css` | Card, tick list, preview (`width: 100%`, `aspect-ratio: 297 / 210`, a light border); both themes, 360 px |
| `sw.js` | Add `./js/year-logic.js`, `./js/year-draw.js`, `./js/year-view.js`, `./vendor/jspdf.umd.min.js` to `APP_FILES` |
| `version.js` | `0.7.0`, then `0.7.1` for the update test |
| `vendor/jspdf.umd.min.js` | Saved by the owner (decision 5). Step 1 checks and commits it |
| `tests/year-logic.test.js` | New, on the browser test page; uses `tests/analysis-fixture.js` |
| `tests/index.html` | Also runs `year-logic.test.js` |
| `CLAUDE.md` | Step 1 changes, and Status at the end |

`.claude/settings.json` and `.gitignore` are **not** changed.

## `js/year-logic.js` (pure functions)

`today` and dates are `"YYYY-MM-DD"` strings passed in. Use `js/dates.js` helpers; never `toISOString()`. Day states come only from `dayDots`, and counts only from `countDays` and `lastCountedDay`.

- `MAX_HABITS` = 10.
- `yearWeeks(year)` returns a list of columns. Each column is 7 entries, Monday first, each a date string or `null` for a day outside the year.
- `monthLabels(year)` returns `[{ col, label }]` for the 12 months, `col` being the column that holds the month's 1st.
- `yearOptions(habits, today)` returns years, newest first, from the earliest active-period start to today's year. It returns `[todayYear]` when there are no habits.
- `habitsForYear(habits, completions, year)` returns the habits with a scheduled day or a completion in the year, in `createdAt` order.
- `yearFigures(habit, completions, year, today)` returns `{ x, y, percent }` (decision 6), with `percent` `null` when `y = 0`.
- `dayMark(habit, completions, date, today)` returns the state from decision 3, or `null`.
- `pageLayout(n)` returns the decision 4 geometry in millimetres, or `null` when `n < 1` or `n > MAX_HABITS`:
  `{ cell, left, monthRowY, stripY: [...], fontSize, dot, ring }`
  - `left = 20`, the grid's left edge;
  - `monthRowY = 26`;
  - `stripY[i] = 26 + cell × (1 + 9i)`, the top of habit i's heading line, whose grid starts 1.5 cells lower.
- `headingText(habit, figures)` returns decision 4's heading text, without the dot.
- `pageModel(habits, completions, year, ticked, today)` returns everything `drawYear` needs, or `{ error }` with decision 2's message:
  `{ year, title, madeLine, layout, weeks, months, strips: [{ habit, heading, marks }] }`
  - `marks` maps each date of the year to its state.
  - `ticked` is a list of habit IDs.
- `pdfFileName(year)` returns `habit-year-2026.pdf`.

## Steps

Auto mode. Claude does not stop before every step. It **must** stop at:
- step 2 (plan);
- every push;
- both phone tests;
- any earlier test that fails;
- any decision this spec does not settle, any denied action, or any problem it cannot solve after two attempts.

1. **Check the starting point and update `CLAUDE.md`.**
   - Check you are on an up-to-date `main`. The only things uncommitted should be `docs/modules/module-6.md` and `vendor/jspdf.umd.min.js`.
   - Check that `.claude/settings.json` is unchanged since Module 5, and confirm that no `PowerShell` tool is in your tool list. If one is, **stop**.
   - Check `vendor/jspdf.umd.min.js` with `sha256sum vendor/jspdf.umd.min.js`. The output must be `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54`, the size 420,165 bytes, and the header comment must contain `Version 4.2.1`. If the file is missing or different, **stop** and give the owner the decision 5 command.
   - Edit `CLAUDE.md`:
     - **Section 4, Export menu,** Yearly PDF: "A single-page A4 landscape PDF with one GitHub-contribution-style year grid per habit (weeks starting Monday, at most 10 habits, chosen by tick boxes), each day marked as on the month calendar. Shows a preview before saving."
     - **Section 5:** add the row "Single year grid with a dot per habit per day | One small grid per habit, stacked, up to 10 per page | Six dots in a 5 mm square are unreadable on paper".
     - **Section 12:** add "No more than 10 habits in one yearly PDF." and "The yearly PDF's text is part of a picture; it cannot be selected or searched."
     - **Section 15:** the `vendor/` row reads "Third-party libraries saved locally (Dexie, Eruda, Chart.js 4.5.1, jsPDF 4.2.1)".
   - Commit: "Module 6 spec, jsPDF 4.2.1 and CLAUDE.md updates".
   - After the commit, re-check with `git cat-file blob HEAD:vendor/jspdf.umd.min.js | sha256sum` (Module 5 note on line endings).
2. **Plan.** List the files and anything you would do differently, with the reason. **Stop and wait for approval.**
3. **Logic and tests.**
   - Write `js/year-logic.js` and `tests/year-logic.test.js` (cases below), and add the test file to `tests/index.html`.
   - Run the page in the built-in browser against the temporary server on `127.0.0.1:8765`, sending `Cache-Control: no-store`.
   - In the same browser, with the app's CSP in force, confirm:
     - `await import('./vendor/jspdf.umd.min.js')` sets `globalThis.jspdf.jsPDF.version === '4.2.1'`;
     - a test canvas turns into a one-page PDF blob.
   - **Do not continue until every case passes**, including all 346 earlier ones.
4. **`js/year-draw.js`** and the `js/backup.js` exports.
5. **The card:** `index.html`, `js/year-view.js`, `styles.css`, `app.js`.
6. **Service worker and version:** add the four files to `APP_FILES` and set `version.js` to `0.7.0`.
7. **Checks before deploying.** Run these yourself in the built-in browser on `127.0.0.1:8765`, with the fixture loaded through the app's own Restore.
   - **Fake date:** set to 2026-11-20 the way Module 5 did, with a temporary server outside the repository serving a changed `js/dates.js`.
   - **Before each reload of new code:** unregister the service worker and clear its caches.
   - **Reporting:** report each item as PASS or FAIL.
   - **Afterwards:** clear that origin's IndexedDB, and delete the server and any temporary file by name.

   The checks:
   - Test page: every case passes.
   - The console shows no CSP violation while the card prepares a PDF, and the Network panel shows jsPDF loaded from `./vendor/` only.
   - **Year picker:** shows 2026 only. The tick list shows Gym, Read (discontinued), Dentist and Walk, all ticked.
   - **Preview, compared with the month calendar for November 2026:**
     - Gym has filled circles on 2, 4, 6, 10, 11, 17 and 18 Nov, rings on 9, 13 and 20 Nov, a diamond on 16 Nov and grey dots from 24 Nov onwards.
     - Gym's heading reads "Gym · 78% · 7 of 9 scheduled days".
     - Read reads "Read · 50% · 3 of 6 scheduled days · discontinued".
     - Dentist reads "Dentist · no scheduled days yet" and shows a grey dot on 25 Nov.
     - Walk shows a diamond on 16 Nov.
   - The month labels sit over the right columns (Feb over column 4, Dec over column 48). 1 January 2026 is in the Thursday row of the first column.
   - **Tick limits:**
     - Unticking Read redraws with three grids and cell 4.9444 mm.
     - Unticking all four shows "Tick at least one habit." with both buttons disabled.
     - With 11 fake habits ticked (added for this check only), the card shows "Choose at most 10 habits for one page." and draws no preview.
   - **The PDF blob:**
     - exactly one page: one `/Type /Page` that is not `/Pages`;
     - MediaBox `[0 0 841.89 595.28]`;
     - one image of `/Width 2376 /Height 1680`;
     - title "Habit Tracker 2026".
   - **Preview matches the PDF:** open the blob in a new tab of the built-in browser if it shows PDFs, and compare it with the preview. If it cannot show PDFs, say so; the phone covers this.
   - **Saving:**
     - **Share PDF** falls back to download on the laptop, giving "PDF downloaded.".
     - The file name is `habit-year-2026.pdf`.
     - No real file is left on the laptop: catch it inside the page, as in Module 4.
   - A habit named "व्यायाम" (fake, for this check only) shows correctly in the preview.
   - With jsPDF given a 404 by the test server, the preview shows, the buttons stay disabled, and the status line says "PDF maker couldn't load."
   - The page stays white in dark theme. The card, tick list and preview are readable in both themes at 360 px with no sideways scrolling.
   - The Backup and CSV cards still work.
8. **Commit and deploy.** Commit on `main`. **Stop.** The owner takes a **Back up** to Drive on the phone first. Then push under the section 14 rule.
9. **Phone test, part 1 (read-only on real data).** The owner opens the installed app and taps the update banner (version 0.7.0). **Do not add, undo or edit any completion or habit for this test.**
   - Note the About counts (habits H, completions C).
   - Export → Yearly PDF: the current year is selected and the preview draws. Untick any test habits.
   - **Manual check, for one habit:** compare its grid with the month calendar for the current month, on at least three days, including today and one missed or extra day if there is one. The marks must match.
   - **Share PDF** → Drive (or Files). Open the PDF in Drive's viewer: one landscape page, the same as the preview, names readable.
   - **Download instead** → the PDF appears in Downloads and opens.
   - Airplane mode, close the app fully, reopen: the preview and **Download instead** still work.
   - About counts still H and C.

   **Phone test, part 2 (the update is safe).** Make one tiny visible change, set `version.js` to `0.7.1`, commit, and push under the section 14 rule. The owner reopens the app and taps the banner. Expected: version 0.7.1, About counts still H and C, and the preview unchanged apart from today's mark if the day has moved on.
10. **Close the module.** Update Status in `CLAUDE.md`:
    - "Module 6 complete (date). All modules in section 13 are done."
    - Current version `0.7.1`.
    - The Module 6 entry under Done, with the test count.
    - "Notes from Module 6" with anything that differed from this spec.
    - **Next:** "No module planned. Any new feature needs a new module spec, written in the claude.ai planning chat, before work starts."

    Commit, push under the section 14 rule, then stop.

## Test cases (`tests/year-logic.test.js`)

Use the habits and completions from `tests/analysis-fixture.js`, with today `2026-11-20` unless a case says otherwise. These figures were computed by running the real Module 1 to 5 code, and give the same results in Indian time and in UTC.

**Year grid**
- `yearWeeks(2026)`:
  - 53 columns;
  - column 0 is `[null, null, null, "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]`;
  - the last column is `["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", null, null, null]`.
- `yearWeeks(2027)`: 53 columns, column 0 starting with four `null`s.
- `yearWeeks(2028)` (a leap year starting on a Saturday): 53 columns, the last one full, ending "2028-12-31".
- `yearWeeks(2040)` (a leap year starting on a Sunday): **54** columns. Column 0 is six `null`s then "2040-01-01"; the last column is "2040-12-31" then six `null`s.
- Every date of 2026 appears exactly once (365), and of 2028 exactly once (366).
- `monthLabels(2026)` columns: Jan 0, Feb 4, Mar 8, Apr 13, May 17, Jun 22, Jul 26, Aug 30, Sep 35, Oct 39, Nov 43, Dec 48.

**Years and habits**
- `yearOptions(HABITS, "2026-11-20")` → `[2026]`.
- `yearOptions(HABITS, "2027-01-05")` → `[2027, 2026]`.
- `yearOptions([], "2026-11-20")` → `[2026]`.
- `habitsForYear(HABITS, COMPLETIONS, 2026)` → Gym, Read, Dentist, Walk, in that order.
- `habitsForYear(…, 2027)` → Gym, Walk. Read is discontinued, and Dentist's one date is in 2026.
- `habitsForYear(…, 2025)` → `[]`.

**Figures**
- Today 2026-11-20, year 2026:
  - Gym `{ x: 7, y: 9, percent: 78 }`;
  - Read `{ 3, 6, 50 }`;
  - Dentist `{ 0, 0, null }`;
  - Walk `{ 0, 14, 0 }`.
  - Gym matches Analysis All time on the same day.
- Today 2027-01-05, year 2026 (the last day is capped at 31 December):
  - Gym `{ 7, 27, 26 }`;
  - Read `{ 3, 6, 50 }`;
  - Dentist `{ 0, 1, 0 }`;
  - Walk `{ 0, 26, 0 }`.
- Today 2027-01-05, year 2027:
  - Gym `{ 0, 1, 0 }`: 1 January is a Friday, and 5 January is today and not done, so the last counted day is 4 January.
  - Walk `{ 0, 2, 0 }`.

**Day marks** (`dayMark`, today 2026-11-20)
- Gym:
  - 11-02 `done`;
  - 11-09 `missed`;
  - 11-10 `done` (stored flag says extra; Module 5 decision 1);
  - 11-16 `extra`;
  - 11-17 `done` (a late completion is still done);
  - 11-20 `due`;
  - 11-24 `upcoming`;
  - 11-14 (a Saturday) `null`;
  - 2026-10-30 (before it started) `null`.
- Walk: 11-16 `extra`, 11-17 `null`, 11-21 `upcoming`.
- Dentist: 11-25 `upcoming`.
- Read: 11-04 `missed`, 11-08 `null` (after it was discontinued).

**Layout**
- `pageLayout(n).cell`, to 4 decimal places: 1 → 4.9444; 3 → 4.9444; 4 → 4.4865; 6 → 3.0182; 10 → 1.8242.
- `pageLayout(0)` → `null`; `pageLayout(11)` → `null`.
- `pageLayout(4)`: `stripY[0]` = 26 + 4.4865 = 30.4865; `stripY[3]` = 26 + 4.4865 × 28 = 151.6216.
- `fontSize`: 4 for one habit; 2.2 for 10 habits.

**Text and model**
- `headingText`:
  - Gym → "Gym · 78% · 7 of 9 scheduled days";
  - Read → "Read · 50% · 3 of 6 scheduled days · discontinued";
  - Dentist → "Dentist · no scheduled days yet".
- `pageModel(HABITS, COMPLETIONS, 2026, all four IDs, TODAY)`:
  - title "Habit Tracker · 2026";
  - madeLine "Made Fri 20 Nov 2026";
  - four strips in `createdAt` order;
  - `layout.cell` 4.4865.
- `pageModel` with `[]` ticked → `{ error: "Tick at least one habit." }`.
- `pageModel` with 11 IDs ticked → `{ error: "Choose at most 10 habits for one page." }`.
- `pageModel(…, 2025, …)` → `{ error: "No habits in 2025." }`.
- `pdfFileName(2026)` → "habit-year-2026.pdf".
- The input arrays and objects are unchanged after every call.

## Done when

- [ ] Every test-page case passes, including all Module 1 to 5 tests.
- [ ] Every item in the step 7 checklist passes, with no CSP violation and no request outside the app.
- [ ] Phone part 1: the shared PDF and the downloaded PDF are each one landscape page, match the preview, and match the month calendar on the checked days; it works offline.
- [ ] Phone part 2: after the update to 0.7.1, About counts unchanged.
- [ ] Status in `CLAUDE.md` updated ("All modules in section 13 are done") and pushed.

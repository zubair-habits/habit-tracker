// The single answer to "is habit H scheduled on date D?" (CLAUDE.md section 10).
// No other code may re-implement this rule. Pure function: no database access.
// "YYYY-MM-DD" strings compare correctly as plain strings, so no Date objects
// are needed apart from the weekday lookup.
import { isoWeekday } from './dates.js';

export function isScheduled(habit, dateStr) {
  // 1. The day must fall inside an active period (end is inclusive; null = still active).
  const active = habit.activePeriods.some(
    (p) => p.start <= dateStr && (p.end === null || dateStr <= p.end)
  );
  if (!active) return false;

  // 2. The version in effect is the LAST one whose "from" is on or before the day.
  //    Searching from the end makes a later entry with the same "from" win.
  let version = null;
  for (let i = habit.schedule.length - 1; i >= 0; i--) {
    if (habit.schedule[i].from <= dateStr) {
      version = habit.schedule[i];
      break;
    }
  }
  if (!version) return false;

  // 3. Weekly habit: is the weekday ticked? One-time habit: is it that date?
  if (version.repeat) return version.days.includes(isoWeekday(dateStr));
  return version.date === dateStr;
}

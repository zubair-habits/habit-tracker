// Database reads and writes for completions (docs/modules/module-3.md).
// undoCompletion is one of the only two delete paths allowed in the app (CLAUDE.md section 6).
import { buildCompletion, canMark } from './calendar-logic.js';
import { todayStr } from './dates.js';
import { db } from './db.js';

// Every completion dated from "from" to "to", both included.
export function completionsBetween(from, to) {
  return db.completions.where('date').between(from, to, true, true).toArray();
}

// Saves a completion and returns it, or throws with the reason it is refused.
// The rules are checked again here, in case anything changed after the sheet was drawn.
export function markCompleted(habitId, date) {
  const nowMs = Date.now(); // the moment of the tap
  return db.transaction('rw', db.habits, db.completions, async () => {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new Error('This habit no longer exists.');

    const existing = await db.completions.get([habitId, date]);
    const refusal = canMark(habit, existing ? [existing] : [], date, todayStr());
    if (refusal) throw new Error(refusal);

    const row = buildCompletion(habit, date, nowMs);
    await db.completions.add(row);
    return row;
  });
}

// Removes one completion by its key. The caller has already asked for confirmation.
export function undoCompletion(habitId, date) {
  return db.transaction('rw', db.completions, () => db.completions.delete([habitId, date]));
}

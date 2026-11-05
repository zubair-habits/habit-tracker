// Database reads and writes for habits. Each write is one transaction that uses a
// function from habit-logic.js and saves the result. Nothing here deletes a habit:
// discontinuing is a soft delete (CLAUDE.md section 6).
import { db } from './db.js';
import { todayStr } from './dates.js';
import {
  applyDiscontinue, applyEdit, applyRestart, buildNewHabit, countDays,
  discontinueMessage, findByName, lastCountedDay,
} from './habit-logic.js';

// All habits, oldest first.
export async function listHabits() {
  const habits = await db.habits.toArray();
  return habits.sort((a, b) => a.createdAt - b.createdAt);
}

function completionsOf(id) {
  return db.completions.where('habitId').equals(id).toArray();
}

// Two active habits can never share a name. Checked inside each write as well as in
// the form, so this holds even if something changed after the form checked.
async function refuseIfNameTaken(name, ownId) {
  const { active } = findByName(await db.habits.toArray(), name);
  if (active && active.id !== ownId) throw new Error(`You already have a habit called ${active.name}.`);
}

export function addHabit(input) {
  return db.transaction('rw', db.habits, async () => {
    await refuseIfNameTaken(input.name, null);
    await db.habits.add(buildNewHabit(input, todayStr(), crypto.randomUUID(), Date.now()));
  });
}

export function editHabit(id, input) {
  return db.transaction('rw', db.habits, async () => {
    await refuseIfNameTaken(input.name, id);
    await db.habits.put(applyEdit(await db.habits.get(id), input, todayStr()));
  });
}

export function restartHabit(id, input) {
  return db.transaction('rw', db.habits, async () => {
    await refuseIfNameTaken(input.name, id);
    await db.habits.put(applyRestart(await db.habits.get(id), input, todayStr()));
  });
}

export function discontinueHabit(id) {
  return db.transaction('rw', db.habits, db.completions, async () => {
    const habit = await db.habits.get(id);
    await db.habits.put(applyDiscontinue(habit, await completionsOf(id), todayStr()));
  });
}

// The X / Y / Z% message, counted up to the same day discontinuing would end on.
export async function discontinuePreview(habit) {
  const completions = await completionsOf(habit.id);
  const lastDay = lastCountedDay(habit, completions, todayStr());
  return discontinueMessage(countDays(habit, completions, lastDay));
}

// Scheduled days with a completion, for "with N days of history".
export async function daysOfHistory(habit) {
  return countDays(habit, await completionsOf(habit.id), todayStr()).x;
}

// The fake data from docs/modules/module-5.md, "Test cases". Used by the test page and
// for the laptop checks. It is never part of the app and never reaches the phone.
import { buildCompletion } from '../js/calendar-logic.js';
import { applyDiscontinue, applyEdit, buildNewHabit } from '../js/habit-logic.js';

export function at(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm).getTime();
}

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
const START = '2026-11-02';

function input(changes) {
  return { colour: '#e5484d', repeat: true, days: [1, 3, 5], date: null, setTime: '07:00', ...changes };
}

// Gym: Mon/Wed/Fri, edited on 2026-11-10 to Tue/Wed/Fri.
const gymInput = input({ name: 'Gym' });
const gymBefore = buildNewHabit(gymInput, START, 'gym-id', at(2026, 11, 2, 8, 0));
export const gym = applyEdit(gymBefore, { ...gymInput, days: [2, 3, 5] }, '2026-11-10');

const gymCompletions = [
  buildCompletion(gym, '2026-11-02', at(2026, 11, 2, 7, 0)),
  buildCompletion(gym, '2026-11-04', at(2026, 11, 4, 7, 15)),
  buildCompletion(gym, '2026-11-06', at(2026, 11, 6, 6, 50)),
  buildCompletion(gymBefore, '2026-11-10', at(2026, 11, 10, 7, 30)), // stored extra: true
  buildCompletion(gym, '2026-11-11', at(2026, 11, 11, 7, 5)),
  buildCompletion(gym, '2026-11-16', at(2026, 11, 16, 18, 0)), // a Monday: an extra
  buildCompletion(gym, '2026-11-17', at(2026, 11, 18, 8, 0)), // late
  buildCompletion(gym, '2026-11-18', at(2026, 11, 18, 7, 20)),
];

// Read: every day, discontinued with today 2026-11-08.
const readBefore = buildNewHabit(
  input({ name: 'Read', colour: '#0090ff', days: EVERY_DAY, setTime: '22:00' }),
  START, 'read-id', at(2026, 11, 2, 8, 1)
);
const readCompletions = [
  buildCompletion(readBefore, '2026-11-02', at(2026, 11, 2, 22, 0)),
  buildCompletion(readBefore, '2026-11-03', at(2026, 11, 4, 10, 30)), // late
  buildCompletion(readBefore, '2026-11-05', at(2026, 11, 5, 21, 50)),
];
export const read = applyDiscontinue(readBefore, readCompletions, '2026-11-08');

// Dentist: one-time, on a date still ahead.
export const dentist = buildNewHabit(
  input({ name: 'Dentist', colour: '#30a46c', repeat: false, days: [], date: '2026-11-25', setTime: '18:00' }),
  START, 'dentist-id', at(2026, 11, 2, 8, 2)
);

// Walk: every day, completed on 11-16, then edited that day to Sat/Sun only.
const walkInput = input({ name: 'Walk', colour: '#8e4ec6', days: EVERY_DAY, setTime: '06:00' });
const walkBefore = buildNewHabit(walkInput, START, 'walk-id', at(2026, 11, 2, 8, 3));
const walkCompletions = [buildCompletion(walkBefore, '2026-11-16', at(2026, 11, 16, 6, 10))]; // stored extra: false
export const walk = applyEdit(walkBefore, { ...walkInput, days: [6, 7] }, '2026-11-16');

export const HABITS = [gym, read, dentist, walk];
export const COMPLETIONS = [...gymCompletions, ...readCompletions, ...walkCompletions];
export const TODAY = '2026-11-20'; // a Friday

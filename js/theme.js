// Theme: "system" (follow the phone), "light" or "dark".
// Source of truth: the settings table (key "theme"). The choice is also copied
// to localStorage ("ht-theme") only so js/theme-boot.js can apply it early.
import { getSetting, setSetting } from './db.js';

const THEMES = ['system', 'light', 'dark'];
const CACHE_KEY = 'ht-theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
  else root.removeAttribute('data-theme');
  try {
    localStorage.setItem(CACHE_KEY, choice);
  } catch (err) {
    // Not fatal: the theme still comes from the database on the next start.
  }
  updateThemeColour();
}

// The phone's status bar colour follows the header colour actually shown.
function updateThemeColour() {
  const colour = getComputedStyle(document.documentElement).getPropertyValue('--header').trim();
  if (colour) document.querySelector('meta[name="theme-color"]').setAttribute('content', colour);
}

// onChange runs after the owner picks a new theme (used to refresh About).
export async function initTheme(onChange = () => {}) {
  let choice = await getSetting('theme', 'system');
  if (!THEMES.includes(choice)) choice = 'system';
  applyTheme(choice);

  for (const input of document.querySelectorAll('input[name="theme"]')) {
    input.checked = input.value === choice;
    input.addEventListener('change', async () => {
      if (!input.checked) return;
      applyTheme(input.value);
      await setSetting('theme', input.value);
      onChange();
    });
  }

  // "System" follows the phone when its light/dark setting changes.
  darkQuery.addEventListener('change', updateThemeColour);
}

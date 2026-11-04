// Classic (non-module) script, loaded in <head> before the stylesheet.
// Applies the cached theme before the page draws, so it never flashes the
// wrong colours. The settings table is the source of truth; js/theme.js
// corrects this a moment later if the cache is missing or out of date.
(function () {
  try {
    var theme = localStorage.getItem('ht-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (err) {
    // localStorage unavailable: js/theme.js applies the theme from the database.
  }
})();

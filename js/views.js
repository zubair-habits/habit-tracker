// Top-corner menu and view switching (Main, Settings, Analysis, Export).
// Opening a view other than Main adds a browser history entry, so the
// Android back button returns to Main. Back on Main leaves the app as normal.

const VIEWS = ['main', 'settings', 'analysis', 'export'];
const listeners = [];
let current = null;

// Register a function to run whenever a view is shown: fn(viewName).
export function onViewShown(fn) {
  listeners.push(fn);
}

function show(name) {
  current = VIEWS.includes(name) ? name : 'main';
  for (const section of document.querySelectorAll('[data-view]')) {
    section.hidden = section.dataset.view !== current;
  }
  for (const item of document.querySelectorAll('[data-go]')) {
    if (item.dataset.go === current) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  for (const fn of listeners) fn(current);
}

// Address without the "#view" part; keeps "?debug=1".
function baseUrl() {
  return location.pathname + location.search;
}

export function navigate(name) {
  if (name === current) return;
  if (name === 'main') {
    // The entry below every non-Main view is always Main, so step back to it.
    history.back();
    return;
  }
  // From Main: add an entry. From another view: replace it, so one press of
  // back always returns to Main.
  const state = { view: name };
  if (current === 'main') history.pushState(state, '', `#${name}`);
  else history.replaceState(state, '', `#${name}`);
  show(name);
}

function initMenu() {
  const button = document.getElementById('menu-button');
  const menu = document.getElementById('menu');

  function setOpen(open) {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });
  menu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-go]');
    if (!item) return;
    setOpen(false);
    navigate(item.dataset.go);
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  document.getElementById('home-button').addEventListener('click', () => {
    setOpen(false);
    navigate('main');
  });
}

export function initViews() {
  initMenu();

  window.addEventListener('popstate', (event) => {
    show(event.state && event.state.view ? event.state.view : 'main');
  });

  const fromHash = location.hash.slice(1);
  const state = history.state;

  if (state && VIEWS.includes(state.view) && state.view === (fromHash || 'main')) {
    // Reload of an entry this app already set up: keep the history as it is.
    show(state.view);
  } else if (VIEWS.includes(fromHash) && fromHash !== 'main') {
    // Opened directly at "#settings" etc.: put Main underneath so back returns to it.
    history.replaceState({ view: 'main' }, '', baseUrl());
    history.pushState({ view: fromHash }, '', `#${fromHash}`);
    show(fromHash);
  } else {
    history.replaceState({ view: 'main' }, '', baseUrl());
    show('main');
  }
}

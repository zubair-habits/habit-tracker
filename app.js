import Dexie from './vendor/dexie.mjs';
import { APP_VERSION } from './version.js';

// On-screen debug console, only when the address ends in ?debug=1.
if (location.search === '?debug=1') {
  const script = document.createElement('script');
  script.src = './vendor/eruda.js';
  script.onload = () => window.eruda.init();
  document.head.appendChild(script);
}

// Database. Schema changes only ever happen by adding a new db.version()
// with a migration (CLAUDE.md section 6). The test counter table is removed
// by a migration in Module 1.
const db = new Dexie('habit-tracker');
db.version(1).stores({
  testCounter: 'id',
});

const COUNTER_ID = 'counter';

async function readCounter() {
  const row = await db.testCounter.get(COUNTER_ID);
  return row ? row.value : 0;
}

async function incrementCounter() {
  return db.transaction('rw', db.testCounter, async () => {
    const value = (await readCounter()) + 1;
    await db.testCounter.put({ id: COUNTER_ID, value });
    return value;
  });
}

function showCounter(value) {
  document.getElementById('counter-value').textContent = value;
  document.getElementById('about-counter').textContent = value;
}

// Service worker and update banner (CLAUDE.md section 6).
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const banner = document.getElementById('update-banner');
  const hadController = Boolean(navigator.serviceWorker.controller);

  function showBanner(worker) {
    banner.hidden = false;
    banner.onclick = () => {
      banner.disabled = true;
      worker.postMessage('SKIP_WAITING');
    };
  }

  // Reload once when the new version takes over. Skipped on the very first
  // install, when there was no previous version to replace.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  const reg = await navigator.serviceWorker.register('./sw.js', {
    type: 'module',
    updateViaCache: 'none',
  });

  if (reg.waiting && navigator.serviceWorker.controller) showBanner(reg.waiting);

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) showBanner(worker);
    });
  });

  // Check for a new version whenever the app comes back to the screen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });
}

registerServiceWorker().catch((err) => console.error('Service worker registration failed:', err));

document.getElementById('about-version').textContent = APP_VERSION;
document.getElementById('counter-button').addEventListener('click', async () => {
  showCounter(await incrementCounter());
});
showCounter(await readCounter());

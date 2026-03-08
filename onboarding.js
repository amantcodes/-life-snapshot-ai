/**
 * Life Snapshot AI — onboarding.js
 * ════════════════════════════════════════════════════════════
 * Handles:
 *  1. First-time onboarding (4-step animated flow)
 *  2. PWA install prompt (Add to Home Screen banner)
 *  3. Push notifications at 9pm daily ("Log your day!")
 *
 * Drop this file next to script.js and add to index.html:
 *   <link rel="stylesheet" href="onboarding.css" />
 *   <script src="onboarding.js" defer></script>
 * ════════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const OB_DONE_KEY    = 'lsai_onboarding_done';   // has user completed onboarding?
const OB_NAME_KEY    = 'lsai_user_name';          // user's first name
const OB_NOTIF_KEY   = 'lsai_notif_time';         // notification time pref
const PWA_HIDDEN_KEY = 'lsai_pwa_banner_hidden';  // did user dismiss PWA banner?

/* Suggested starter habits for Step 2 */
const STARTER_HABITS = [
  { icon: '🏃', label: 'Exercise'         },
  { icon: '💧', label: 'Drink water'      },
  { icon: '🧘', label: 'Meditate'         },
  { icon: '📚', label: 'Read'             },
  { icon: '😴', label: 'Sleep by 11pm'    },
  { icon: '🥗', label: 'Eat healthy'      },
  { icon: '📵', label: 'No phone AM'      },
  { icon: '✍️', label: 'Journal'          },
];

/* ─────────────────────────────────────────────────────────────
   MAIN INIT — runs when DOM is ready
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Only show onboarding once ever
  if (!localStorage.getItem(OB_DONE_KEY)) {
    buildOnboardingHTML();
    showOnboarding();
  }

  // PWA install banner (separate from onboarding)
  initPWABanner();

  // Register service worker for offline + notifications
  initServiceWorker();

  // Personalise greeting if name is saved
  personaliseGreeting();
});

/* ─────────────────────────────────────────────────────────────
   1. ONBOARDING HTML BUILDER
   Injects the overlay HTML into the page dynamically
───────────────────────────────────────────────────────────── */
function buildOnboardingHTML() {
  // Build habit chips HTML
  const habitChips = STARTER_HABITS.map(h => `
    <button class="ob-habit-chip" data-habit="${h.label}" type="button">
      <span class="chip-icon">${h.icon}</span>
      <span>${h.label}</span>
    </button>
  `).join('');

  const html = `
  <div id="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Life Snapshot AI">
    <div class="ob-card">

      <!-- Progress dots -->
      <div class="ob-dots" aria-hidden="true">
        <div class="ob-dot active" id="ob-dot-0"></div>
        <div class="ob-dot"        id="ob-dot-1"></div>
        <div class="ob-dot"        id="ob-dot-2"></div>
        <div class="ob-dot"        id="ob-dot-3"></div>
      </div>

      <!-- ── STEP 0: Welcome ── -->
      <div class="ob-step active" id="ob-step-0">
        <span class="ob-icon">✦</span>
        <h1 class="ob-title">Hey, I'm <em>Life Snapshot AI</em></h1>
        <p class="ob-sub">
          Your private daily tracker for mood, habits, and life patterns.
          No login. No ads. Just you and your data.
        </p>
        <div class="ob-input-wrap">
          <label class="ob-label" for="ob-name-input">What should I call you?</label>
          <input
            type="text"
            id="ob-name-input"
            class="ob-input"
            placeholder="Your first name…"
            maxlength="30"
            autocomplete="given-name"
            autofocus
          />
        </div>
        <div class="ob-btn-row">
          <button class="ob-btn-primary" id="ob-next-0">Let's go →</button>
        </div>
      </div>

      <!-- ── STEP 1: Pick habits ── -->
      <div class="ob-step" id="ob-step-1">
        <span class="ob-icon">✅</span>
        <h1 class="ob-title">Pick your <em>starter habits</em></h1>
        <p class="ob-sub">
          Choose a few to track daily. You can always add or remove more later.
        </p>
        <div class="ob-habits-grid" id="ob-habits-grid">
          ${habitChips}
        </div>
        <div class="ob-btn-row">
          <button class="ob-btn-skip" id="ob-back-1">← Back</button>
          <button class="ob-btn-primary" id="ob-next-1">Continue →</button>
        </div>
      </div>

      <!-- ── STEP 2: Notifications ── -->
      <div class="ob-step" id="ob-step-2">
        <span class="ob-icon">🔔</span>
        <h1 class="ob-title">Daily <em>reminders</em></h1>
        <p class="ob-sub">
          Want a nudge to log your day? Pick a time and we'll remind you.
        </p>
        <div class="ob-notif-options">
          <button class="ob-notif-btn" data-time="09:00" type="button">
            <span class="notif-icon">🌅</span>
            <span class="notif-text">
              Morning — 9:00 AM
              <span class="notif-desc">Start the day with intention</span>
            </span>
          </button>
          <button class="ob-notif-btn" data-time="13:00" type="button">
            <span class="notif-icon">☀️</span>
            <span class="notif-text">
              Afternoon — 1:00 PM
              <span class="notif-desc">Midday check-in</span>
            </span>
          </button>
          <button class="ob-notif-btn" data-time="21:00" type="button">
            <span class="notif-icon">🌙</span>
            <span class="notif-text">
              Evening — 9:00 PM
              <span class="notif-desc">Reflect on your day</span>
            </span>
          </button>
          <button class="ob-notif-btn" data-time="none" type="button">
            <span class="notif-icon">🔕</span>
            <span class="notif-text">
              No reminders
              <span class="notif-desc">I'll remember on my own</span>
            </span>
          </button>
        </div>
        <div class="ob-btn-row">
          <button class="ob-btn-skip" id="ob-back-2">← Back</button>
          <button class="ob-btn-primary" id="ob-next-2">Continue →</button>
        </div>
      </div>

      <!-- ── STEP 3: All set ── -->
      <div class="ob-step" id="ob-step-3">
        <span class="ob-icon">🎉</span>
        <h1 class="ob-title" id="ob-finish-title">You're all set!</h1>
        <p class="ob-sub">Here's what's waiting for you:</p>
        <ul class="ob-finish-list">
          <li><span class="fi-icon">◑</span> Log mood, energy & notes daily</li>
          <li><span class="fi-icon">↗</span> See beautiful charts of your patterns</li>
          <li><span class="fi-icon">✦</span> Get AI insights about your life</li>
          <li><span class="fi-icon">🔥</span> Build streaks & earn badges</li>
        </ul>
        <div class="ob-btn-row">
          <button class="ob-btn-primary" id="ob-finish">Start tracking ✦</button>
        </div>
      </div>

    </div><!-- /ob-card -->
  </div><!-- /onboarding-overlay -->
  `;

  // Inject into body
  document.body.insertAdjacentHTML('afterbegin', html);

  // Wire up interactions AFTER HTML is in DOM
  wireOnboardingEvents();
}

/* ─────────────────────────────────────────────────────────────
   2. ONBOARDING LOGIC
───────────────────────────────────────────────────────────── */

let currentStep = 0;
let selectedHabits = [];
let selectedNotifTime = null;

function showOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function wireOnboardingEvents() {

  /* ── Step 0: Welcome → Next ── */
  document.getElementById('ob-next-0').addEventListener('click', () => {
    const nameInput = document.getElementById('ob-name-input');
    const name = nameInput.value.trim();

    if (!name) {
      // Shake animation if empty
      nameInput.animate([
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)'  },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)'  },
        { transform: 'translateX(0)'    },
      ], { duration: 400, easing: 'ease' });
      nameInput.focus();
      return;
    }

    // Save name
    localStorage.setItem(OB_NAME_KEY, name);
    goToStep(1);
  });

  // Allow Enter key on name input
  document.getElementById('ob-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('ob-next-0').click();
  });

  /* ── Step 1: Habit chips ── */
  document.getElementById('ob-habits-grid').addEventListener('click', e => {
    const chip = e.target.closest('.ob-habit-chip');
    if (!chip) return;

    chip.classList.toggle('selected');
    const habitName = chip.dataset.habit;

    if (chip.classList.contains('selected')) {
      selectedHabits.push(habitName);
      // Micro-bounce
      chip.animate([
        { transform: 'scale(0.93)' },
        { transform: 'scale(1.06)' },
        { transform: 'scale(1)'    },
      ], { duration: 280, easing: 'cubic-bezier(0.34,1.2,0.64,1)' });
    } else {
      selectedHabits = selectedHabits.filter(h => h !== habitName);
    }
  });

  document.getElementById('ob-back-1').addEventListener('click', () => goToStep(0));
  document.getElementById('ob-next-1').addEventListener('click', () => {
    // Inject selected habits into the app's habit list
    if (selectedHabits.length > 0) {
      applySelectedHabits(selectedHabits);
    }
    goToStep(2);
  });

  /* ── Step 2: Notification time ── */
  document.querySelectorAll('.ob-notif-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Visual select
      document.querySelectorAll('.ob-notif-btn').forEach(b => {
        b.style.borderColor = '';
        b.style.background  = '';
        b.style.color       = '';
      });
      btn.style.borderColor = 'var(--sage)';
      btn.style.background  = 'var(--sage-soft)';
      selectedNotifTime = btn.dataset.time;
    });
  });

  document.getElementById('ob-back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('ob-next-2').addEventListener('click', () => {
    // Request notification permission if a time was chosen
    if (selectedNotifTime && selectedNotifTime !== 'none') {
      localStorage.setItem(OB_NOTIF_KEY, selectedNotifTime);
      requestNotificationPermission(selectedNotifTime);
    }
    // Update finish title with name
    const name = localStorage.getItem(OB_NAME_KEY) || '';
    if (name) {
      document.getElementById('ob-finish-title').innerHTML =
        `You're all set, <em>${name}</em>!`;
    }
    goToStep(3);
  });

  /* ── Step 3: Finish ── */
  document.getElementById('ob-finish').addEventListener('click', finishOnboarding);
}

/** Animate to a specific step */
function goToStep(n) {
  const steps = document.querySelectorAll('.ob-step');
  const dots   = document.querySelectorAll('.ob-dot');

  steps.forEach((s, i) => s.classList.toggle('active', i === n));

  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i === n) d.classList.add('active');
    if (i < n)  d.classList.add('done');
  });

  currentStep = n;
}

/** Save onboarding complete, hide overlay */
function finishOnboarding() {
  localStorage.setItem(OB_DONE_KEY, '1');

  const overlay = document.getElementById('onboarding-overlay');
  overlay.classList.add('ob-hide');

  setTimeout(() => {
    overlay.remove();
    personaliseGreeting(); // Update the main app with name
  }, 500);
}

/** Inject chosen habits into the existing app habit list */
function applySelectedHabits(habits) {
  // The app stores habits in localStorage under HABITS_KEY = 'lsai_v2_habits'
  const existing = JSON.parse(localStorage.getItem('lsai_v2_habits') || '[]');
  const merged   = [...new Set([...existing, ...habits])];
  localStorage.setItem('lsai_v2_habits', JSON.stringify(merged));

  // If the app's renderItem function is available, call it for each new habit
  // (It's defined in script.js — onboarding.js runs after it so it's available)
  habits.forEach(name => {
    if (typeof renderItem === 'function' && !existing.includes(name)) {
      renderItem('habit', name);
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   3. PERSONALISE GREETING
   Updates today's heading with the user's name
───────────────────────────────────────────────────────────── */
function personaliseGreeting() {
  const name    = localStorage.getItem(OB_NAME_KEY);
  const heading = document.getElementById('today-date-heading');
  if (!name || !heading) return;

  const now  = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : 'Good evening';

  // Show personalised greeting alongside the date
  const datePart = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  heading.innerHTML = `${greeting}, <em style="color:var(--terra);font-style:italic">${name}</em>`;

  // Update the sub-text with the date
  const sub = document.getElementById
    ? document.querySelector('#tab-today .page-sub')
    : null;
  if (sub) sub.textContent = datePart;
}

/* ─────────────────────────────────────────────────────────────
   4. NOTIFICATIONS
   Uses the Notifications API + Service Worker scheduling
───────────────────────────────────────────────────────────── */

/** Ask for permission then schedule */
async function requestNotificationPermission(time) {
  if (!('Notification' in window)) return;

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    showNotifConfirmToast(time);
    scheduleNotifications(time);
  }
}

/** Show a small confirmation toast after permission granted */
function showNotifConfirmToast(time) {
  const label = { '09:00': '9:00 AM', '13:00': '1:00 PM', '21:00': '9:00 PM' }[time] || time;

  const toast = document.createElement('div');
  toast.className = 'notif-toast';
  toast.innerHTML = `
    <div class="notif-toast-title">🔔 Reminders set!</div>
    <div class="notif-toast-sub">
      You'll get a daily nudge at ${label} to log your day.
    </div>
    <button class="notif-toast-btn" onclick="this.parentElement.remove()">Got it</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

/**
 * Schedules a daily notification at the chosen time.
 * Uses a repeating check via Service Worker message.
 */
function scheduleNotifications(time) {
  if (!time || time === 'none') return;

  // Save to localStorage so SW can read it
  localStorage.setItem(OB_NOTIF_KEY, time);

  // Tell the service worker to schedule
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      time: time,
    });
  }

  // Fallback: use a simple interval check every minute
  scheduleNotificationFallback(time);
}

/** Fallback scheduler using setInterval — checks every minute */
function scheduleNotificationFallback(time) {
  // Clear any existing interval
  if (window._notifInterval) clearInterval(window._notifInterval);

  window._notifInterval = setInterval(() => {
    const now  = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const savedTime = localStorage.getItem(OB_NOTIF_KEY);

    if (hhmm === savedTime && Notification.permission === 'granted') {
      // Only fire once per day
      const lastFired = localStorage.getItem('lsai_notif_last_fired');
      const today     = new Date().toISOString().slice(0, 10);

      if (lastFired !== today) {
        localStorage.setItem('lsai_notif_last_fired', today);
        fireNotification();
      }
    }
  }, 60 * 1000); // check every 60 seconds
}

/** Fire the actual browser notification */
function fireNotification() {
  const name = localStorage.getItem(OB_NAME_KEY) || '';
  const entries = JSON.parse(localStorage.getItem('lsai_v2_entries') || '[]');
  const today   = new Date().toISOString().slice(0, 10);
  const alreadyLogged = entries.some(e => e.date === today);

  if (alreadyLogged) return; // Don't nag if they already logged today

  const title = name ? `Hey ${name}! ✦` : 'Life Snapshot AI ✦';
  const body  = "Time to log your day. How are you feeling right now?";

  const notif = new Notification(title, {
    body,
    icon:  '/favicon.ico',
    badge: '/favicon.ico',
    tag:   'daily-reminder',    // prevents duplicate notifications
    renotify: false,
  });

  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

/* ─────────────────────────────────────────────────────────────
   5. SERVICE WORKER REGISTRATION
   Enables offline + background notifications
───────────────────────────────────────────────────────────── */
async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('✦ Service Worker registered:', reg.scope);

    // Resume notification scheduling if permission already granted
    const savedTime = localStorage.getItem(OB_NOTIF_KEY);
    if (savedTime && savedTime !== 'none' && Notification.permission === 'granted') {
      scheduleNotificationFallback(savedTime);
    }
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    // App still works perfectly without SW — just no offline/notifications
  }
}

/* ─────────────────────────────────────────────────────────────
   6. PWA INSTALL BANNER
   Shows "Add to Home Screen" prompt for mobile users
───────────────────────────────────────────────────────────── */

let deferredInstallPrompt = null;

function initPWABanner() {
  // Capture the browser's install prompt event
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // Stop auto-prompt
    deferredInstallPrompt = e;

    // Only show if user hasn't dismissed it before
    if (!localStorage.getItem(PWA_HIDDEN_KEY)) {
      // Wait 30s before showing banner (don't interrupt right away)
      setTimeout(showPWABanner, 30000);
    }
  });

  // Hide banner if app gets installed
  window.addEventListener('appinstalled', () => {
    hidePWABanner();
    showInAppToast('App installed! ✦ Find it on your home screen.');
  });
}

function showPWABanner() {
  // Don't show if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (!deferredInstallPrompt) return;

  const existing = document.getElementById('pwa-banner');
  if (existing) { existing.classList.add('show'); return; }

  const banner = document.createElement('div');
  banner.id = 'pwa-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', 'Install app banner');

  banner.innerHTML = `
    <span class="pwa-icon">✦</span>
    <div class="pwa-text">
      <div class="pwa-title">Install Life Snapshot AI</div>
      <div class="pwa-sub">Add to home screen for quick access</div>
    </div>
    <button class="pwa-install-btn" id="pwa-install-btn">Install</button>
    <button class="pwa-dismiss" id="pwa-dismiss-btn" aria-label="Dismiss">×</button>
  `;

  document.body.appendChild(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  });

  // Install button
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hidePWABanner();
  });

  // Dismiss button
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    localStorage.setItem(PWA_HIDDEN_KEY, '1');
    hidePWABanner();
  });
}

function hidePWABanner() {
  const banner = document.getElementById('pwa-banner');
  if (!banner) return;
  banner.classList.remove('show');
  setTimeout(() => banner.remove(), 500);
}

/* ─────────────────────────────────────────────────────────────
   7. UTILS
───────────────────────────────────────────────────────────── */

/** Shows the main app's existing toast (defined in script.js) */
function showInAppToast(msg) {
  if (typeof showToast === 'function') {
    showToast(msg);
  } else {
    // Fallback if script.js hasn't loaded yet
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
  }
}
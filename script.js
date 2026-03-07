/**
 * Life Snapshot AI v2 — script.js
 * ══════════════════════════════════════════════════════════════
 * Privacy-first daily tracker. All data in localStorage.
 * Features: mood, habits, tasks, notes, charts, AI insights,
 *           streaks, badges, undo/redo, PDF export, dark mode.
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */
const STORE_KEY    = 'lsai_v2_entries';
const HABITS_KEY   = 'lsai_v2_habits';
const TASKS_KEY    = 'lsai_v2_tasks';
const THEME_KEY    = 'lsai_v2_theme';

const DEFAULT_HABITS = ['Exercise', 'Hydration (8 glasses)', 'Meditation', 'Read / Learn', 'Quality sleep'];
const DEFAULT_TASKS  = ['Review my goals', 'Plan tomorrow'];

const MOOD_CAPTIONS = {
  '😄': 'Wonderful — you\'re radiating good energy.',
  '🙂': 'Good — the day is treating you well.',
  '😐': 'Neutral — steady and grounded.',
  '😔': 'Low — be kind to yourself today.',
  '😢': 'Rough — this too shall pass.',
};

const BADGES = [
  { id: 'first',   streak: 1,  emoji: '✨', title: 'First Entry!',      sub: 'You\'ve begun the journey.' },
  { id: 'week',    streak: 7,  emoji: '🔥', title: '7-Day Streak!',     sub: 'One full week of tracking.' },
  { id: 'bi',      streak: 14, emoji: '⚡', title: '2 Week Warrior!',   sub: 'Remarkable consistency.' },
  { id: 'month',   streak: 30, emoji: '🏆', title: '30-Day Champion!',  sub: 'A whole month. Legendary.' },
  { id: 'quarter', streak: 90, emoji: '💎', title: '90-Day Diamond!',   sub: 'Unstoppable momentum.' },
];

/* ──────────────────────────────────────────────────────────────
   APP STATE
────────────────────────────────────────────────────────────── */
const S = {
  mood:         null,   // { emoji, val }
  stars:        0,
  habitNames:   [],     // master habit name list
  taskNames:    [],     // master task name list
  undoSnapshot: null,   // last saved entry (for undo)
  chartRange:   'week',
  charts:       {},     // Chart.js instances
  earnedBadges: new Set(),
};

/* ──────────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDate();
  initLists();
  initMood();
  initStars();
  initEnergy();
  initNotes();
  initTabs();
  initDrawer();
  initRangePills();
  updateStats();
  renderBadgeChips();

  // Button binds
  q('#save-btn').addEventListener('click', saveEntry);
  q('#undo-btn').addEventListener('click', undoSave);
  q('#gen-btn').addEventListener('click', generateInsights);
  q('#export-btn').addEventListener('click', exportPDF);
  q('#clear-btn').addEventListener('click', clearAll);
  q('#habit-add-btn').addEventListener('click', () => addListItem('habit'));
  q('#task-add-btn').addEventListener('click',  () => addListItem('task'));

  // Enter key on inputs
  q('#habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addListItem('habit'); });
  q('#task-input').addEventListener('keydown',  e => { if (e.key === 'Enter') addListItem('task'); });

  // Theme toggles
  q('#theme-toggle').addEventListener('click', toggleTheme);
  q('#theme-toggle-mobile').addEventListener('click', toggleTheme);
});

/* ──────────────────────────────────────────────────────────────
   THEME
────────────────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  // Update mobile toggle icon
  q('#theme-toggle-mobile').querySelector('span').textContent = theme === 'dark' ? '☀' : '☾';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
  // Re-render charts to match new theme
  if (q('#tab-trends').classList.contains('active')) renderCharts();
}

/* ──────────────────────────────────────────────────────────────
   DATE
────────────────────────────────────────────────────────────── */
function initDate() {
  const now = new Date();
  q('#today-date-heading').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

/* ──────────────────────────────────────────────────────────────
   HABIT & TASK LISTS
────────────────────────────────────────────────────────────── */
function initLists() {
  // Load or set defaults
  S.habitNames = loadJSON(HABITS_KEY, DEFAULT_HABITS);
  S.taskNames  = loadJSON(TASKS_KEY,  DEFAULT_TASKS);

  // Render both lists
  S.habitNames.forEach(name => renderItem('habit', name));
  S.taskNames.forEach(name  => renderItem('task',  name));

  updateCounts();
}

/**
 * Renders a single checklist item (habit or task).
 * @param {'habit'|'task'} type
 * @param {string} name
 */
function renderItem(type, name) {
  const listId = type === 'habit' ? '#habit-list' : '#task-list';
  const ul     = q(listId);

  const li = document.createElement('li');
  li.className = 'check-item';
  li.dataset.name = name;
  li.dataset.type = type;

  li.innerHTML = `
    <span class="check-box" role="checkbox" aria-checked="false" tabindex="0" aria-label="${esc(name)}"></span>
    <span class="check-name">${esc(name)}</span>
    <button class="item-remove" aria-label="Remove ${esc(name)}" title="Remove">×</button>
  `;

  // Toggle check
  const box  = li.querySelector('.check-box');
  const lbl  = li.querySelector('.check-name');

  const toggle = () => {
    li.classList.toggle('checked');
    const isChecked = li.classList.contains('checked');
    box.setAttribute('aria-checked', isChecked);
    updateCounts();
    // Micro-interaction: wiggle on check
    if (isChecked) li.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.03)' },
      { transform: 'scale(1)' },
    ], { duration: 200, easing: 'ease' });
  };

  box.addEventListener('click', toggle);
  lbl.addEventListener('click', toggle);
  box.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

  // Remove button
  li.querySelector('.item-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    removeItem(type, name, li);
  });

  ul.appendChild(li);
  updateCounts();
}

/** Removes a list item with an exit animation */
function removeItem(type, name, li) {
  li.classList.add('removing');

  // Remove from master list & persist
  if (type === 'habit') {
    S.habitNames = S.habitNames.filter(n => n !== name);
    localStorage.setItem(HABITS_KEY, JSON.stringify(S.habitNames));
  } else {
    S.taskNames = S.taskNames.filter(n => n !== name);
    localStorage.setItem(TASKS_KEY, JSON.stringify(S.taskNames));
  }

  setTimeout(() => { li.remove(); updateCounts(); }, 260);
  showToast(`"${name}" removed`);
}

/** Adds a new item from input field */
function addListItem(type) {
  const inputId = type === 'habit' ? '#habit-input' : '#task-input';
  const input   = q(inputId);
  const name    = input.value.trim();
  if (!name) { input.focus(); return; }

  const masterList = type === 'habit' ? S.habitNames : S.taskNames;
  const storeKey   = type === 'habit' ? HABITS_KEY   : TASKS_KEY;

  if (masterList.includes(name)) { showToast('Already in the list!'); input.focus(); return; }

  masterList.push(name);
  localStorage.setItem(storeKey, JSON.stringify(masterList));
  renderItem(type, name);
  input.value = '';
  input.focus();
  showToast(`"${name}" added ✓`);
}

/** Returns checked names for a given type */
function getChecked(type) {
  const selector = type === 'habit' ? '#habit-list .check-item.checked' : '#task-list .check-item.checked';
  return Array.from(qAll(selector)).map(li => li.dataset.name);
}

/** Resets all checkboxes */
function resetChecks() {
  qAll('.check-item').forEach(li => {
    li.classList.remove('checked');
    li.querySelector('.check-box').setAttribute('aria-checked', 'false');
  });
  updateCounts();
}

/** Updates the "X done" counters */
function updateCounts() {
  const hTotal   = qAll('#habit-list .check-item').length;
  const hChecked = qAll('#habit-list .check-item.checked').length;
  const tTotal   = qAll('#task-list .check-item').length;
  const tChecked = qAll('#task-list .check-item.checked').length;

  q('#habit-count').textContent = `${hChecked}/${hTotal} done`;
  q('#task-count').textContent  = `${tChecked}/${tTotal} done`;

  // Animate count change
  [q('#habit-count'), q('#task-count')].forEach(el => {
    el.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 200 });
  });
}

/* ──────────────────────────────────────────────────────────────
   MOOD PICKER
────────────────────────────────────────────────────────────── */
function initMood() {
  qAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qAll('.mood-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      S.mood = { emoji: btn.dataset.mood, val: parseInt(btn.dataset.val, 10) };
      q('#mood-caption').textContent = MOOD_CAPTIONS[btn.dataset.mood] || '';

      // Ripple the button
      btn.animate([
        { transform: 'scale(1.2) rotate(-8deg)' },
        { transform: 'scale(1.1) rotate(0)' },
      ], { duration: 300, easing: 'cubic-bezier(0.34,1.2,0.64,1)' });
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   STAR RATING
────────────────────────────────────────────────────────────── */
function initStars() {
  const stars = qAll('.star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => {
      const v = +star.dataset.v;
      stars.forEach(s => s.classList.toggle('lit', +s.dataset.v <= v));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.toggle('lit', +s.dataset.v <= S.stars));
    });
    star.addEventListener('click', () => {
      S.stars = +star.dataset.v;
      stars.forEach(s => s.classList.toggle('lit', +s.dataset.v <= S.stars));

      // Starburst animation
      star.animate([
        { transform: 'scale(1.5) rotate(20deg)', color: '#c49a3c' },
        { transform: 'scale(1)', color: '#c49a3c' },
      ], { duration: 300, easing: 'cubic-bezier(0.34,1.2,0.64,1)' });
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   ENERGY SLIDER
────────────────────────────────────────────────────────────── */
function initEnergy() {
  const slider = q('#energy-slider');
  const valEl  = q('#energy-val');
  slider.addEventListener('input', () => {
    valEl.textContent = slider.value;
    slider.setAttribute('aria-valuenow', slider.value);
  });
}

/* ──────────────────────────────────────────────────────────────
   NOTES COUNTER
────────────────────────────────────────────────────────────── */
function initNotes() {
  const ta = q('#notes-ta');
  ta.addEventListener('input', () => { q('#char-cnt').textContent = ta.value.length; });
}

/* ──────────────────────────────────────────────────────────────
   SAVE & UNDO
────────────────────────────────────────────────────────────── */
function saveEntry() {
  if (!S.mood) { showToast('Please select your mood first!'); return; }

  const today   = todayKey();
  const entries = loadEntries();

  const entry = {
    date:         today,
    ts:           Date.now(),
    mood:         S.mood,
    energy:       +q('#energy-slider').value,
    productivity: S.stars,
    habits:       getChecked('habit'),
    tasks:        getChecked('task'),
    notes:        q('#notes-ta').value.trim(),
  };

  // Stash for undo
  const prev = entries.find(e => e.date === today);
  S.undoSnapshot = { entry: prev || null, replaced: !!prev };

  // Upsert
  const idx = entries.findIndex(e => e.date === today);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  localStorage.setItem(STORE_KEY, JSON.stringify(entries));

  // Animate save button
  const btn = q('#save-btn');
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => { btn.style.transform = ''; }, 200);

  resetForm();
  updateStats();
  checkBadges();
  showUndoBar();
  showToast('Snapshot saved! ✓');
}

function undoSave() {
  if (!S.undoSnapshot) return;
  const entries = loadEntries();
  const today   = todayKey();

  if (S.undoSnapshot.replaced) {
    // Restore previous entry
    const idx = entries.findIndex(e => e.date === today);
    if (idx >= 0) entries[idx] = S.undoSnapshot.entry;
  } else {
    // Remove the entry we just added
    const idx = entries.findIndex(e => e.date === today);
    if (idx >= 0) entries.splice(idx, 1);
  }

  localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  S.undoSnapshot = null;
  hideUndoBar();
  updateStats();
  showToast('Snapshot undone.');
}

function showUndoBar() {
  const bar = q('#undo-bar');
  bar.style.display = 'flex';
  // Auto-hide after 8 s
  clearTimeout(showUndoBar._timer);
  showUndoBar._timer = setTimeout(hideUndoBar, 8000);
}

function hideUndoBar() { q('#undo-bar').style.display = 'none'; }

function resetForm() {
  // Mood
  qAll('.mood-btn').forEach(b => b.classList.remove('sel'));
  q('#mood-caption').textContent = 'Pick one that fits.';
  S.mood = null;

  // Energy
  q('#energy-slider').value = 3;
  q('#energy-val').textContent = '3';

  // Stars
  S.stars = 0;
  qAll('.star').forEach(s => s.classList.remove('lit'));

  // Notes
  q('#notes-ta').value = '';
  q('#char-cnt').textContent = '0';

  // Checks
  resetChecks();
}

/* ──────────────────────────────────────────────────────────────
   STATS ROW
────────────────────────────────────────────────────────────── */
function updateStats() {
  const entries = loadEntries();
  const streak  = calcStreak(entries);

  q('#st-streak').textContent = streak;
  q('#st-total').textContent  = entries.length;
  q('#sb-streak').textContent = streak;

  if (entries.length) {
    const avgM = entries.reduce((s, e) => s + (e.mood?.val || 0), 0) / entries.length;
    const moodMap = { 1:'😢', 2:'😔', 3:'😐', 4:'🙂', 5:'😄' };
    q('#st-avg').textContent = moodMap[Math.round(avgM)] || avgM.toFixed(1);
  } else {
    q('#st-avg').textContent = '—';
  }

  // Top habit
  const habitFreq = {};
  entries.forEach(e => (e.habits || []).forEach(h => { habitFreq[h] = (habitFreq[h] || 0) + 1; }));
  const top = Object.entries(habitFreq).sort((a, b) => b[1] - a[1])[0];
  q('#st-habits').textContent = top ? top[0].slice(0, 8) + (top[0].length > 8 ? '…' : '') : '—';

  // Animate stats
  qAll('.stat-num').forEach(el => {
    el.animate([{ transform: 'scale(1.15)', color: 'var(--terra)' }, { transform: 'scale(1)' }],
               { duration: 300, easing: 'cubic-bezier(0.34,1.2,0.64,1)' });
  });
}

/* ──────────────────────────────────────────────────────────────
   BADGES
────────────────────────────────────────────────────────────── */
function checkBadges() {
  const streak = calcStreak(loadEntries());
  BADGES.forEach(b => {
    if (streak >= b.streak && !S.earnedBadges.has(b.id)) {
      S.earnedBadges.add(b.id);
      showBadgePopup(b);
      renderBadgeChips();
    }
  });
}

function showBadgePopup(badge) {
  const popup = q('#badge-popup');
  q('#badge-emoji').textContent = badge.emoji;
  q('#badge-title').textContent = badge.title;
  q('#badge-sub').textContent   = badge.sub;
  popup.style.display = 'block';

  clearTimeout(showBadgePopup._timer);
  showBadgePopup._timer = setTimeout(() => {
    popup.animate([{ opacity: 1, transform: 'translateX(0)' },
                   { opacity: 0, transform: 'translateX(120%)' }],
                  { duration: 300, fill: 'forwards' });
    setTimeout(() => { popup.style.display = 'none'; }, 320);
  }, 4500);
}

function renderBadgeChips() {
  const entries = loadEntries();
  const streak  = calcStreak(entries);
  const cont    = q('#header-badges');
  cont.innerHTML = '';
  BADGES.filter(b => streak >= b.streak).forEach(b => {
    const chip = document.createElement('div');
    chip.className = 'badge-chip';
    chip.innerHTML = `<span>${b.emoji}</span><span>${b.title.replace('!','')}</span>`;
    chip.title = b.sub;
    cont.appendChild(chip);
  });
}

/* ──────────────────────────────────────────────────────────────
   TABS
────────────────────────────────────────────────────────────── */
function initTabs() {
  const navItems = qAll('.nav-item');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  // Sidebar
  qAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Drawer
  qAll('.drawer-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Panels
  qAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));

  // Lazy renders
  if (tab === 'trends')  { setTimeout(renderCharts,  50); }
  if (tab === 'history') { renderHistory(); }
  if (tab === 'insights') { renderInsightsGate(); }

  // Close drawer
  closeDrawer();
}

/* ──────────────────────────────────────────────────────────────
   MOBILE DRAWER
────────────────────────────────────────────────────────────── */
function initDrawer() {
  const hamburger = q('#hamburger');
  const overlay   = q('#drawer-overlay');
  const drawer    = q('#mobile-drawer');

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) closeDrawer(); else openDrawer();
  });

  overlay.addEventListener('click', closeDrawer);

  qAll('.drawer-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function openDrawer() {
  q('#hamburger').classList.add('open');
  q('#hamburger').setAttribute('aria-expanded', 'true');
  q('#drawer-overlay').classList.add('open');
  q('#drawer-overlay').style.display = 'block';
  q('#mobile-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  q('#hamburger').classList.remove('open');
  q('#hamburger').setAttribute('aria-expanded', 'false');
  q('#drawer-overlay').classList.remove('open');
  q('#mobile-drawer').classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { q('#drawer-overlay').style.display = 'none'; }, 300);
}

/* ──────────────────────────────────────────────────────────────
   RANGE PILLS
────────────────────────────────────────────────────────────── */
function initRangePills() {
  qAll('.range-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      qAll('.range-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.chartRange = btn.dataset.range;
      renderCharts();
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   CHARTS
────────────────────────────────────────────────────────────── */

// Chart.js global defaults
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
Chart.defaults.animation.duration = 700;
Chart.defaults.animation.easing = 'easeOutQuart';

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

function themeColors() {
  return {
    grid:   isDark() ? 'rgba(200,160,110,0.07)' : 'rgba(160,120,80,0.08)',
    text:   isDark() ? '#8a6e54'                : '#9c7a5e',
    border: isDark() ? 'rgba(200,160,110,0.12)' : 'rgba(160,120,80,0.12)',
  };
}

function renderCharts() {
  const all      = loadEntries();
  const filtered = filterRange(all, S.chartRange);

  const emptyEl  = q('#trends-empty');
  const gridEl   = q('#charts-grid');

  if (!filtered.length) {
    emptyEl.style.display = 'block';
    gridEl.style.display  = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  gridEl.style.display  = 'grid';

  renderMoodChart(filtered);
  renderHabitBar(filtered);
  renderEPChart(filtered);
  renderDonut(filtered);
}

/** Destroys and recreates a chart */
function makeChart(id, config) {
  const key = id;
  if (S.charts[key]) { S.charts[key].destroy(); }
  const ctx = q('#' + id).getContext('2d');
  S.charts[key] = new Chart(ctx, config);
}

/** Shared tooltip style */
function tooltipDefaults() {
  return {
    backgroundColor: isDark() ? '#211a12' : '#fdf8f3',
    borderColor:     isDark() ? 'rgba(200,160,110,0.2)' : 'rgba(160,120,80,0.15)',
    borderWidth:     1,
    titleColor:      isDark() ? '#f0e8de' : '#2a1f14',
    bodyColor:       isDark() ? '#c4a882' : '#6b5040',
    padding:         10,
    cornerRadius:    8,
  };
}

/* Mood line chart */
function renderMoodChart(entries) {
  const tc = themeColors();
  makeChart('mood-chart', {
    type: 'line',
    data: {
      labels: entries.map(e => fmtDate(e.date)),
      datasets: [{
        label: 'Mood',
        data:  entries.map(e => e.mood?.val || 0),
        borderColor:     '#c4674a',
        backgroundColor: 'rgba(196,103,74,0.1)',
        borderWidth:     2.5,
        pointBackgroundColor: '#c4674a',
        pointRadius:     5,
        pointHoverRadius: 7,
        tension:         0.4,
        fill:            true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults() },
      },
      scales: {
        y: {
          min: 0, max: 5,
          ticks: { stepSize: 1, color: tc.text, callback: v => ['','😢','😔','😐','🙂','😄'][v] || v },
          grid:  { color: tc.grid },
        },
        x: { ticks: { color: tc.text, maxRotation: 30, font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

/* Habit completion bar chart */
function renderHabitBar(entries) {
  const tc     = themeColors();
  const counts = {};
  entries.forEach(e => (e.habits || []).forEach(h => { counts[h] = (counts[h] || 0) + 1; }));
  const labels = Object.keys(counts);
  const data   = labels.map(h => Math.round(counts[h] / entries.length * 100));

  makeChart('habit-bar-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '%',
        data,
        backgroundColor: labels.map((_, i) => `hsla(${150 + i * 28}, 38%, 55%, 0.8)`),
        borderRadius:  6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults(), callbacks: { label: ctx => ctx.parsed.y + '%' } },
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%', color: tc.text }, grid: { color: tc.grid } },
        x: { ticks: { color: tc.text, font: { size: 11 }, maxRotation: 30 }, grid: { display: false } },
      },
    },
  });
}

/* Energy & Productivity dual line */
function renderEPChart(entries) {
  const tc = themeColors();
  makeChart('ep-chart', {
    type: 'line',
    data: {
      labels: entries.map(e => fmtDate(e.date)),
      datasets: [
        {
          label: 'Energy',
          data:  entries.map(e => e.energy || 0),
          borderColor:     '#6b8f71',
          backgroundColor: 'rgba(107,143,113,0.08)',
          borderWidth: 2,
          pointRadius: 4,
          tension:     0.4,
          fill:        true,
        },
        {
          label: 'Productivity',
          data:  entries.map(e => e.productivity || 0),
          borderColor:     '#c49a3c',
          backgroundColor: 'rgba(196,154,60,0.06)',
          borderWidth: 2,
          pointRadius: 4,
          tension:     0.4,
          fill:        true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: tc.text, boxWidth: 12, font: { size: 12 } } },
        tooltip: { ...tooltipDefaults() },
      },
      scales: {
        y: { min: 0, max: 5, ticks: { color: tc.text }, grid: { color: tc.grid } },
        x: { ticks: { color: tc.text, maxRotation: 30, font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

/* Habit donut */
function renderDonut(entries) {
  const counts = {};
  entries.forEach(e => (e.habits || []).forEach(h => { counts[h] = (counts[h] || 0) + 1; }));
  const labels = Object.keys(counts);
  const data   = Object.values(counts);
  if (!labels.length) return;
  const bg = labels.map((_, i) => `hsl(${(i * 55 + 145) % 360}, 42%, 58%)`);

  makeChart('donut-chart', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: bg, borderColor: isDark() ? '#211a12' : '#fdf8f3', borderWidth: 3, hoverOffset: 8 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '63%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: themeColors().text, boxWidth: 10, font: { size: 11 }, padding: 10 },
        },
        tooltip: { ...tooltipDefaults() },
      },
    },
  });
}

/* ──────────────────────────────────────────────────────────────
   AI INSIGHTS (local engine)
────────────────────────────────────────────────────────────── */
function renderInsightsGate() {
  const entries = loadEntries();
  const empty   = q('#insights-empty');
  const grid    = q('#insights-grid');
  if (entries.length < 3 && !grid.children.length) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
  }
}

async function generateInsights() {
  const entries = loadEntries();
  const btn     = q('#gen-btn');
  const grid    = q('#insights-grid');
  const empty   = q('#insights-empty');

  if (entries.length < 3) {
    empty.style.display = 'block';
    showToast('Need at least 3 entries for insights.');
    return;
  }

  empty.style.display = 'none';
  btn.disabled = true;
  q('#gen-btn-text').innerHTML = '<span class="spinner"></span>Thinking…';
  grid.innerHTML = '';

  await pause(900);  // Feels deliberate

  const cards = buildInsightCards(entries);
  cards.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = `insight-card${c.wide ? ' wide' : ''}`;
    div.style.animationDelay = `${i * 0.07}s`;
    div.innerHTML = `
      <div class="insight-tag ${c.type}">${c.icon} ${c.label}</div>
      <p class="insight-text">${c.text}</p>
    `;
    grid.appendChild(div);
  });

  // Try server (graceful fallback)
  tryServer(entries).catch(() => {});

  btn.disabled = false;
  q('#gen-btn-text').textContent = 'Refresh ✦';
}

/**
 * Rule-based insight engine — produces rich, personal observations.
 */
function buildInsightCards(entries) {
  const cards   = [];
  const recent  = entries.slice(-30);
  const n       = recent.length;

  // ── Mood ──
  const moodVals  = recent.map(e => e.mood?.val || 0).filter(Boolean);
  const avgMood   = mean(moodVals);
  const moodSlope = slope(moodVals);

  const moodDesc = avgMood >= 4.2 ? 'consistently uplifting'
    : avgMood >= 3.4 ? 'mostly positive'
    : avgMood >= 2.6 ? 'mixed'
    : 'notably low';

  cards.push({
    type: 'mood', icon: '🌡', label: 'Mood',
    text: `Your mood has been ${moodDesc} with an average of ${avgMood.toFixed(1)}/5 across ${n} entries. `
      + (moodSlope > 0.12 ? 'The upward trajectory is clear — whatever you\'re doing is working.'
         : moodSlope < -0.12 ? 'A gradual dip is visible. Small moments of joy — a walk, a call — compound quickly.'
         : 'Emotional consistency is underrated. You\'re holding steady.'),
  });

  // ── Habits ──
  const habitCounts = {};
  recent.forEach(e => (e.habits || []).forEach(h => { habitCounts[h] = (habitCounts[h] || 0) + 1; }));
  const habitArr = Object.entries(habitCounts).sort((a, b) => b[1] - a[1]);

  if (habitArr.length) {
    const [topH, topC] = habitArr[0];
    const topPct = Math.round(topC / n * 100);
    cards.push({
      type: 'habits', icon: '✅', label: 'Top Habit',
      text: `"${topH}" leads your habits at ${topPct}% consistency. `
        + (topPct >= 85 ? 'That\'s elite-level follow-through. It\'s become identity, not effort.'
           : topPct >= 65 ? 'Solid. One more push and this becomes automatic.'
           : 'Habits below 50% often need a trigger or a smaller version. What would a 5-minute version look like?'),
    });

    if (habitArr.length > 1) {
      const [botH, botC] = habitArr[habitArr.length - 1];
      const botPct = Math.round(botC / n * 100);
      if (botH !== topH) cards.push({
        type: 'habits', icon: '📌', label: 'Habit Gap',
        text: `"${botH}" sits at only ${botPct}%. Consider whether it still serves you — or if a lighter version (even 2 minutes) might rebuild the pattern.`,
      });
    }
  }

  // ── Energy ──
  const energyVals = recent.map(e => e.energy || 0).filter(Boolean);
  if (energyVals.length > 2) {
    const avgE  = mean(energyVals);
    const eSlope = slope(energyVals);
    cards.push({
      type: 'energy', icon: '⚡', label: 'Energy',
      text: `Average energy: ${avgE.toFixed(1)}/5. `
        + (eSlope > 0.05 ? 'Your vitality is building — protect your sleep and recovery.'
           : eSlope < -0.05 ? 'Energy is declining. Examine your sleep, nutrition, and how much you\'re giving to others.'
           : 'Energy is stable. To go higher, morning movement and consistent sleep times have the strongest evidence.'),
    });
  }

  // ── Productivity ──
  const prodVals = recent.map(e => e.productivity || 0).filter(Boolean);
  if (prodVals.length > 2) {
    const avgP = mean(prodVals);
    const corr = pearson(moodVals.slice(0, prodVals.length), prodVals);
    cards.push({
      type: 'prod', icon: '🎯', label: 'Productivity',
      text: `Self-rated productivity averages ${avgP.toFixed(1)}/5. `
        + (Math.abs(corr) > 0.45
          ? `There's a ${corr > 0 ? 'strong positive' : 'notable inverse'} link with your mood. `
            + (corr > 0 ? 'Invest in your emotional state — it directly funds your output.' : 'Pressure seems to sharpen you.')
          : 'Productivity appears somewhat independent of mood — your drive is internally sourced.'),
    });
  }

  // ── Best day of week ──
  const dowScores = {};
  const dowCounts = {};
  recent.forEach(e => {
    const dow = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
    dowScores[dow] = (dowScores[dow] || 0) + (e.mood?.val || 0);
    dowCounts[dow] = (dowCounts[dow] || 0) + 1;
  });
  const dowAvg = Object.entries(dowScores)
    .map(([d, s]) => ({ d, avg: s / dowCounts[d] }))
    .sort((a, b) => b.avg - a.avg);

  if (dowAvg.length >= 3) {
    cards.push({
      type: 'mood', icon: '📅', label: 'Best Day', wide: true,
      text: `Your highest-mood day tends to be ${dowAvg[0].d} (avg ${dowAvg[0].avg.toFixed(1)}), while ${dowAvg[dowAvg.length-1].d} is typically lower. Use this rhythm intentionally — schedule creative or demanding work when your natural energy peaks.`,
    });
  }

  // ── Streak ──
  const streak = calcStreak(entries);
  if (streak >= 3) {
    cards.push({
      type: 'streak', icon: '🔥', label: 'Streak', wide: true,
      text: `You're on a ${streak}-day tracking streak. `
        + (streak >= 30 ? 'A month of consistent self-reflection — this is rare and genuinely transformative. The data you\'ve built is uniquely yours.'
           : streak >= 14 ? 'Two weeks in. Research suggests it takes 21+ days for self-reflection to become habitual. You\'re most of the way there.'
           : streak >= 7 ? 'One week strong. The pattern is forming. Trust the process.'
           : 'Every streak begins exactly here. Keep it alive.'),
    });
  }

  // ── Motivational closer ──
  const closers = [
    'The simple act of noticing your days is more powerful than any optimization. You\'re already doing the thing.',
    'Self-tracking isn\'t about perfection — it\'s about paying attention. And attention is a form of love.',
    'Your data is uniquely yours. These patterns can\'t be found in any productivity book. They\'re written in your lived experience.',
    'Every entry is proof you showed up. Some days that\'s everything.',
  ];
  cards.push({
    type: 'gen', icon: '✦', label: 'Note to Self', wide: true,
    text: closers[entries.length % closers.length],
  });

  return cards;
}

/** Try optional Flask backend for enhanced insight */
async function tryServer(entries) {
  const res = await fetch('http://localhost:5000/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: entries.slice(-14) }),
  });
  if (!res.ok) return;
  const json = await res.json();
  if (!json.insight) return;
  const grid = q('#insights-grid');
  const div  = document.createElement('div');
  div.className = 'insight-card wide';
  div.style.borderColor = 'rgba(196,103,74,0.3)';
  div.innerHTML = `
    <div class="insight-tag gen">✦ AI Enhanced</div>
    <p class="insight-text">${esc(json.insight)}</p>
  `;
  grid.insertBefore(div, grid.firstChild);
}

/* ──────────────────────────────────────────────────────────────
   HISTORY
────────────────────────────────────────────────────────────── */
function renderHistory() {
  const entries = loadEntries().slice().reverse();
  const list    = q('#history-list');
  const empty   = q('#history-empty');

  list.innerHTML = '';

  if (!entries.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  entries.forEach((entry, i) => {
    const el = buildHistoryCard(entry);
    el.style.animationDelay = `${i * 0.04}s`;
    list.appendChild(el);
  });
}

function buildHistoryCard(entry) {
  const d       = new Date(entry.date + 'T00:00:00');
  const day     = d.getDate();
  const month   = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const habits  = (entry.habits || []).map(h => `<span class="h-tag">${esc(h)}</span>`).join('');
  const tasks   = (entry.tasks  || []).map(t => `<span class="h-tag" style="background:var(--terra-soft);color:var(--terra);border-color:rgba(196,103,74,0.2)">${esc(t)}</span>`).join('');

  const div = document.createElement('div');
  div.className = 'h-entry';
  div.innerHTML = `
    <div class="h-date-col">
      <div class="h-day">${day}</div>
      <div class="h-mon">${month}</div>
    </div>
    <div class="h-main">
      <div class="h-top">
        <span class="h-emoji">${entry.mood?.emoji || '—'}</span>
        <div class="h-meta">
          <span>⚡ ${entry.energy || '—'}/5</span>
          <span>★ ${entry.productivity || '—'}/5</span>
          <span>✅ ${(entry.habits||[]).length} habits</span>
          <span>☑ ${(entry.tasks||[]).length} tasks</span>
        </div>
      </div>
      ${(habits || tasks) ? `<div class="h-tags">${habits}${tasks}</div>` : ''}
      ${entry.notes ? `<p class="h-note">${esc(entry.notes)}</p>` : ''}
    </div>
    <button class="h-del-btn" aria-label="Delete entry for ${entry.date}">Delete</button>
  `;

  div.querySelector('.h-del-btn').addEventListener('click', () => {
    if (!confirm('Remove this snapshot?')) return;
    div.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.95)' }],
                { duration: 220, fill: 'forwards' });
    setTimeout(() => {
      const updated = loadEntries().filter(e => e.date !== entry.date);
      localStorage.setItem(STORE_KEY, JSON.stringify(updated));
      div.remove();
      updateStats();
      showToast('Entry deleted.');
      if (!loadEntries().length) q('#history-empty').style.display = 'block';
    }, 230);
  });

  return div;
}

function clearAll() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  localStorage.removeItem(STORE_KEY);
  renderHistory();
  updateStats();
  showToast('All data cleared.');
}

/* ──────────────────────────────────────────────────────────────
   PDF EXPORT
────────────────────────────────────────────────────────────── */
async function exportPDF() {
  const btn = q('#export-btn');
  btn.textContent = '⏳ Exporting…';
  btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const entries  = loadEntries();
    const filtered = filterRange(entries, S.chartRange);

    const isDk = isDark();
    const bgC  = isDk ? [22,18,13]   : [245,237,228];
    const inkC = isDk ? [240,232,222] : [42,31,20];
    const subC = isDk ? [139,110,84]  : [156,122,94];
    const acC  = [196,103,74];

    // Background
    pdf.setFillColor(...bgC);
    pdf.rect(0, 0, 210, 297, 'F');

    // Header
    pdf.setTextColor(...acC);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bolditalic');
    pdf.text('Life Snapshot AI', 20, 26);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...subC);
    const rangeLabel = { week: 'Last 7 Days', month: 'Last 30 Days', all: 'All Time' }[S.chartRange];
    pdf.text(`${rangeLabel}  ·  ${filtered.length} entries  ·  ${new Date().toLocaleDateString()}`, 20, 34);

    // Divider
    pdf.setDrawColor(...acC);
    pdf.setLineWidth(0.4);
    pdf.line(20, 38, 190, 38);

    let y = 48;

    // ── Summary blocks ──
    if (filtered.length) {
      const avgM = mean(filtered.map(e => e.mood?.val || 0));
      const avgE = mean(filtered.map(e => e.energy || 0));
      const avgP = mean(filtered.map(e => e.productivity || 0));
      const totalHabits = filtered.reduce((s, e) => s + (e.habits?.length || 0), 0);

      const stats = [
        { l: 'Avg Mood',    v: avgM.toFixed(1) + '/5' },
        { l: 'Avg Energy',  v: avgE.toFixed(1) + '/5' },
        { l: 'Avg Prod.',   v: avgP.toFixed(1) + '/5' },
        { l: 'Habits Done', v: String(totalHabits) },
        { l: 'Streak',      v: calcStreak(entries) + ' days' },
      ];

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(...inkC);
      pdf.text('Summary', 20, y);
      y += 7;

      stats.forEach((s, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const sx  = 20 + col * 58;
        const sy  = y + row * 18;
        pdf.setFillColor(isDk ? 33 : 253, isDk ? 26 : 248, isDk ? 18 : 243);
        pdf.roundedRect(sx, sy, 52, 15, 3, 3, 'F');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...subC);
        pdf.text(s.l.toUpperCase(), sx + 4, sy + 6);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...acC);
        pdf.text(s.v, sx + 4, sy + 13);
      });

      y += Math.ceil(stats.length / 3) * 18 + 10;
    }

    // ── Entries ──
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...inkC);
    pdf.text('Daily Entries', 20, y);
    y += 7;

    filtered.slice().reverse().forEach(entry => {
      if (y > 260) {
        pdf.addPage();
        pdf.setFillColor(...bgC);
        pdf.rect(0, 0, 210, 297, 'F');
        y = 20;
      }

      pdf.setFillColor(isDk ? 33 : 253, isDk ? 26 : 248, isDk ? 18 : 243);
      pdf.roundedRect(18, y, 174, 20, 3, 3, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...acC);
      pdf.text(entry.date, 22, y + 8);

      pdf.setTextColor(...inkC);
      pdf.text(
        `${entry.mood?.emoji || ''} Mood ${entry.mood?.val || '—'}/5  ⚡ ${entry.energy}/5  ★ ${entry.productivity}/5`,
        22, y + 15,
      );

      if (entry.habits?.length) {
        pdf.setTextColor(107, 143, 113);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const hs = entry.habits.join(' · ');
        pdf.text(hs.length > 85 ? hs.slice(0, 85) + '…' : hs, 100, y + 8);
      }

      if (entry.notes) {
        const note = entry.notes.slice(0, 120) + (entry.notes.length > 120 ? '…' : '');
        pdf.setTextColor(...subC);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        const lines = pdf.splitTextToSize(note, 150);
        lines.forEach((ln, li) => {
          if (li < 2) pdf.text(ln, 22, y + 22 + li * 4.5);
        });
        y += lines.slice(0, 2).length * 4.5;
      }

      y += 26;
    });

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...subC);
    pdf.text('Life Snapshot AI · Privacy-first · All data stays on your device', 20, 291);

    // Charts page
    const cg = q('#charts-grid');
    if (cg && cg.style.display !== 'none') {
      try {
        pdf.addPage();
        pdf.setFillColor(...bgC);
        pdf.rect(0, 0, 210, 297, 'F');
        pdf.setFont('helvetica', 'bolditalic');
        pdf.setFontSize(14);
        pdf.setTextColor(...acC);
        pdf.text('Trend Charts', 20, 20);
        const canvas = await html2canvas(cg, { backgroundColor: null, scale: 1.4 });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 28, 190, 115);
      } catch (err) { console.warn('Chart capture:', err); }
    }

    pdf.save(`life-snapshot-${todayKey()}.pdf`);
    showToast('PDF exported ✓');
  } catch (err) {
    console.error('PDF error:', err);
    showToast('Export failed. Try again.');
  } finally {
    btn.textContent = '↓ Export';
    btn.disabled = false;
  }
}

/* ──────────────────────────────────────────────────────────────
   DATA UTILS
────────────────────────────────────────────────────────────── */
function loadEntries()  { return loadJSON(STORE_KEY, []); }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

function filterRange(entries, range) {
  if (range === 'all') return entries;
  const days = range === 'week' ? 7 : 30;
  const cut  = new Date();
  cut.setDate(cut.getDate() - days + 1);
  const cutStr = cut.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutStr);
}

function calcStreak(entries) {
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
  let streak  = 0;
  let check   = todayKey();
  for (const d of dates) {
    if (d === check) { streak++; check = prevDay(check); }
    else if (d < check) break;
  }
  return streak;
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ──────────────────────────────────────────────────────────────
   MATH
────────────────────────────────────────────────────────────── */
function mean(arr) {
  const clean = arr.filter(x => x != null && !isNaN(x));
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

function slope(vals) {
  const n = vals.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(vals);
  let num = 0, den = 0;
  vals.forEach((y, x) => { num += (x - mx) * (y - my); den += (x - mx) ** 2; });
  return den === 0 ? 0 : num / den;
}

function pearson(xs, ys) {
  const n  = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx  += (xs[i] - mx) ** 2;
    dy  += (ys[i] - my) ** 2;
  }
  return (dx * dy === 0) ? 0 : num / Math.sqrt(dx * dy);
}

/* ──────────────────────────────────────────────────────────────
   UI UTILS
────────────────────────────────────────────────────────────── */
function showToast(msg, ms = 3000) {
  const t = q('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Shorthand selectors */
function q(sel) { return document.querySelector(sel); }
function qAll(sel) { return document.querySelectorAll(sel); }
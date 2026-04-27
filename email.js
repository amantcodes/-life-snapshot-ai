/**
 * Life Snapshot AI — email.js
 * ════════════════════════════════════════════════════════════
 * Weekly email report system using EmailJS (free, no backend).
 *
 * HOW TO SET UP (one-time, 10 minutes):
 * ─────────────────────────────────────
 * 1. Go to https://emailjs.com → Sign up free
 * 2. Add Email Service → Connect Gmail → Copy SERVICE_ID
 * 3. Create Email Template → Copy TEMPLATE_ID
 * 4. Get your PUBLIC_KEY from Account → API Keys
 * 5. Paste the 3 values below in CONFIG
 *
 * WHAT THIS FILE DOES:
 * ─────────────────────
 * • Collects email from landing page form
 * • Saves email + subscription date to localStorage
 * • Every Sunday at 8am, composes + sends weekly summary
 * • Weekly summary includes: mood avg, top habits, streak, wins
 * ════════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   ⚠️  PASTE YOUR EMAILJS CREDENTIALS HERE
   Get them from: https://emailjs.com
───────────────────────────────────────────────────────────── */
const EMAILJS_CONFIG = {
  PUBLIC_KEY:  'YOUR_PUBLIC_KEY_HERE',    // e.g. "user_abc123xyz"
  SERVICE_ID:  'YOUR_SERVICE_ID_HERE',    // e.g. "service_gmail"
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID_HERE',  // e.g. "template_weekly"
};

/* ─────────────────────────────────────────────────────────────
   STORAGE KEYS
───────────────────────────────────────────────────────────── */
const EMAIL_KEY       = 'lsai_report_email';
const LAST_SENT_KEY   = 'lsai_last_report_sent';
const SUBSCRIBED_KEY  = 'lsai_email_subscribed';

/* ─────────────────────────────────────────────────────────────
   INIT — runs on every page load
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize EmailJS with your public key
  if (EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE') {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  }

  // Wire up email form on index.html (sidebar email collector)
  initAppEmailForm();

  // Check if it's Sunday and time to send the weekly report
  checkWeeklyReport();
});

/* ─────────────────────────────────────────────────────────────
   1. EMAIL SUBSCRIPTION
───────────────────────────────────────────────────────────── */

/**
 * Called from landing.html when user submits email.
 * Saves email, sends a welcome email, marks subscribed.
 */
async function subscribeEmail(email) {
  if (!email || !email.includes('@')) return;

  // Save to localStorage
  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(SUBSCRIBED_KEY, '1');

  // Send welcome email via EmailJS
  await sendWelcomeEmail(email);

  // Show success in landing page
  if (typeof showEmailSuccess === 'function') {
    showEmailSuccess();
  }

  console.log('✦ Subscribed:', email);
}

/**
 * Adds a small email input to the app's sidebar
 * so users can subscribe from within the app too.
 */
function initAppEmailForm() {
  const sidebar = document.querySelector('.sidebar-bottom');
  if (!sidebar) return;

  const savedEmail = localStorage.getItem(EMAIL_KEY);
  const subscribed = localStorage.getItem(SUBSCRIBED_KEY);

  if (subscribed && savedEmail) {
    // Already subscribed — show small indicator
    const el = document.createElement('div');
    el.style.cssText = `
      font-size:11px; color:var(--ink3); text-align:center;
      padding:6px 8px; background:var(--sage-soft);
      border-radius:8px; line-height:1.4;
    `;
    el.innerHTML = `📧 Weekly reports<br/><span style="color:var(--sage);font-weight:600">${savedEmail.slice(0,18)}${savedEmail.length > 18 ? '…' : ''}</span>`;
    sidebar.insertBefore(el, sidebar.firstChild);
    return;
  }

  // Not subscribed — show small subscribe widget
  const widget = document.createElement('div');
  widget.style.cssText = `
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 2px;
  `;
  widget.innerHTML = `
    <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:7px">
      📧 Weekly Report
    </div>
    <input
      type="email"
      id="sidebar-email-input"
      placeholder="your@email.com"
      style="
        width:100%; background:var(--surface); border:1px solid var(--border);
        border-radius:7px; color:var(--ink); font-family:var(--font-body);
        font-size:12px; padding:7px 10px; outline:none; margin-bottom:6px;
        transition:border-color 0.2s;
      "
    />
    <button
      id="sidebar-email-btn"
      style="
        width:100%; background:var(--terra); border:none; border-radius:7px;
        color:white; font-family:var(--font-body); font-size:12px;
        font-weight:600; padding:7px; cursor:pointer; transition:all 0.2s;
      "
    >Subscribe free</button>
  `;

  sidebar.insertBefore(widget, sidebar.firstChild);

  // Input focus style
  const input = document.getElementById('sidebar-email-input');
  input.addEventListener('focus', () => { input.style.borderColor = 'var(--terra)'; });
  input.addEventListener('blur',  () => { input.style.borderColor = 'var(--border)'; });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('sidebar-email-btn').click();
  });

  // Submit
  document.getElementById('sidebar-email-btn').addEventListener('click', async () => {
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = 'var(--terra)';
      input.focus();
      return;
    }
    await subscribeEmail(email);
    widget.innerHTML = `
      <div style="font-size:12px;color:var(--sage);font-weight:600;text-align:center;padding:6px">
        ✅ Subscribed!<br/>
        <span style="font-size:11px;color:var(--ink3);font-weight:400">Reports every Sunday</span>
      </div>
    `;
  });
}

/* ─────────────────────────────────────────────────────────────
   2. WEEKLY REPORT — CHECK & SEND
───────────────────────────────────────────────────────────── */

/**
 * Checks if it's Sunday and time to send the weekly report.
 * Runs on every page load — fires once per week max.
 */
function checkWeeklyReport() {
  const email     = localStorage.getItem(EMAIL_KEY);
  const subscribed = localStorage.getItem(SUBSCRIBED_KEY);
  if (!email || !subscribed) return;
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY_HERE') return;

  const now       = new Date();
  const isSunday  = now.getDay() === 0;
  const isReportTime = now.getHours() >= 8; // after 8am
  const lastSent  = localStorage.getItem(LAST_SENT_KEY);
  const thisWeek  = getWeekKey(now);

  if (isSunday && isReportTime && lastSent !== thisWeek) {
    console.log('✦ Sunday! Sending weekly report to:', email);
    sendWeeklyReport(email);
  }
}

/**
 * Builds and sends the weekly report email.
 */
async function sendWeeklyReport(email) {
  const entries    = loadEntries();
  const weekData   = getThisWeekData(entries);
  const userName   = localStorage.getItem('lsai_user_name') || 'there';
  const params     = buildEmailParams(email, userName, weekData);

  try {
    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      params
    );
    localStorage.setItem(LAST_SENT_KEY, getWeekKey(new Date()));
    console.log('✦ Weekly report sent successfully!');
  } catch (err) {
    console.error('✦ Email send failed:', err);
  }
}

/**
 * Sends a welcome email when user first subscribes.
 */
async function sendWelcomeEmail(email) {
  if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY_HERE') return;

  const userName = localStorage.getItem('lsai_user_name') || 'there';

  try {
    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      {
        to_email:   email,
        to_name:    userName,
        subject:    '✦ Welcome to Life Snapshot AI weekly reports!',
        week_range: 'Welcome!',
        mood_avg:   '—',
        mood_emoji: '✦',
        streak:     localStorage.getItem('lsai_v2_streak') || '0',
        habits_done: '—',
        top_habit:  '—',
        best_day:   '—',
        entries_count: '0',
        insight:    `Hey ${userName}! You'll receive a beautiful weekly summary every Sunday. Start logging your days and watch your patterns emerge. — Life Snapshot AI`,
        app_url:    'https://amantcodes.github.io/life-snapshot-ai',
      }
    );
  } catch (err) {
    console.warn('Welcome email failed (non-critical):', err);
  }
}

/* ─────────────────────────────────────────────────────────────
   3. DATA BUILDERS
───────────────────────────────────────────────────────────── */

/**
 * Returns entries from the past 7 days.
 */
function getThisWeekData(entries) {
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1); // Start of week (Mon)
  monday.setHours(0, 0, 0, 0);
  const monStr = monday.toISOString().slice(0, 10);

  return entries.filter(e => e.date >= monStr);
}

/**
 * Builds the template params object for EmailJS.
 * These variable names must match your EmailJS template.
 */
function buildEmailParams(email, name, weekEntries) {
  const n = weekEntries.length;

  // Mood average
  const moodVals = weekEntries.map(e => e.mood?.val || 0).filter(Boolean);
  const avgMood  = moodVals.length
    ? (moodVals.reduce((a,b) => a+b, 0) / moodVals.length).toFixed(1)
    : '—';
  const moodEmoji = { 1:'😢', 2:'😔', 3:'😐', 4:'🙂', 5:'😄' }[Math.round(+avgMood)] || '✦';

  // Top habit
  const habitCounts = {};
  weekEntries.forEach(e => (e.habits||[]).forEach(h => {
    habitCounts[h] = (habitCounts[h]||0) + 1;
  }));
  const topHabit = Object.entries(habitCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  // Total habits done
  const totalHabits = weekEntries.reduce((s,e) => s + (e.habits?.length||0), 0);

  // Best mood day
  const dayScores = {};
  const dayCounts = {};
  weekEntries.forEach(e => {
    const dow = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
    dayScores[dow] = (dayScores[dow]||0) + (e.mood?.val||0);
    dayCounts[dow] = (dayCounts[dow]||0) + 1;
  });
  const bestDay = Object.entries(dayScores)
    .map(([d,s]) => ({ d, avg: s/dayCounts[d] }))
    .sort((a,b) => b.avg-a.avg)[0]?.d || '—';

  // Streak
  const allEntries = loadEntries();
  const streak = calcStreak(allEntries);

  // Week range label e.g. "Jan 6 – Jan 12"
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekRange = `${weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${now.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;

  // AI insight for the week
  const insight = buildWeekInsight(weekEntries, avgMood, topHabit, streak, name);

  return {
    to_email:      email,
    to_name:       name,
    subject:       `✦ Your Life Snapshot — Week of ${weekRange}`,
    week_range:    weekRange,
    entries_count: String(n),
    mood_avg:      avgMood,
    mood_emoji:    moodEmoji,
    streak:        String(streak),
    habits_done:   String(totalHabits),
    top_habit:     topHabit,
    best_day:      bestDay,
    insight:       insight,
    app_url:       'https://amantcodes.github.io/life-snapshot-ai',
  };
}

/**
 * Generates a short personalised insight for the email.
 */
function buildWeekInsight(entries, avgMood, topHabit, streak, name) {
  if (!entries.length) {
    return `Hey ${name}! No entries this week — that's okay. Every day is a fresh start. Open the app and log today. ✦`;
  }

  const parts = [];
  const moodN = +avgMood;

  if (moodN >= 4)      parts.push(`This was a genuinely good week for you — your mood averaged ${avgMood}/5.`);
  else if (moodN >= 3) parts.push(`A steady week. Your mood held at ${avgMood}/5 — solid and consistent.`);
  else                 parts.push(`This week had its challenges (mood avg: ${avgMood}/5). That's real life, and you tracked it anyway.`);

  if (topHabit !== '—') parts.push(`"${topHabit}" was your most consistent habit this week — keep nurturing it.`);

  if (streak >= 7)      parts.push(`🔥 ${streak}-day streak! You've built something real here.`);
  else if (streak >= 3) parts.push(`${streak} days in a row — the habit of tracking is forming.`);

  parts.push('See you next Sunday. ✦');
  return parts.join(' ');
}

/* ─────────────────────────────────────────────────────────────
   4. UTILS
───────────────────────────────────────────────────────────── */

function loadEntries() {
  try { return JSON.parse(localStorage.getItem('lsai_v2_entries') || '[]'); }
  catch { return []; }
}

function calcStreak(entries) {
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let check  = today;
  for (const d of dates) {
    if (d === check) {
      streak++;
      const prev = new Date(check + 'T00:00:00');
      prev.setDate(prev.getDate() - 1);
      check = prev.toISOString().slice(0, 10);
    } else if (d < check) break;
  }
  return streak;
}

/** Returns a string like "2025-W03" to track which week was sent */
function getWeekKey(date) {
  const d   = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

// Expose for landing.html
window.subscribeEmail = subscribeEmail;
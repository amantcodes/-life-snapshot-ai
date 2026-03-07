# ✦ Life Snapshot AI

> A privacy-first daily life tracker that lives entirely in your browser.  
> No login. No ads. No data ever leaves your device.

🔗 **Live App:** [amantcodes.github.io/-life-snapshot-ai](https://amantcodes.github.io/-life-snapshot-ai)

---

## 📸 What It Does

Life Snapshot AI helps you track your daily mood, habits, tasks, and energy — then turns that data into beautiful charts and AI-powered insights. Everything is saved locally on your device. No servers. No accounts. Just you and your data.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎭 **Mood Tracking** | 5-emoji picker with daily captions |
| ⚡ **Energy Logging** | Slider-based energy level (1–5) |
| ✅ **Habit Tracker** | Built-in + fully custom habits with remove button |
| ☑ **Task Tracker** | Daily tasks with add/remove/check |
| ★ **Productivity Score** | 5-star self-rating |
| 📝 **Daily Notes** | Freeform journal entry |
| 📈 **Trend Charts** | Mood, habits, energy, productivity over time |
| 🧠 **AI Insights** | Local pattern analysis + optional Flask backend |
| 🔥 **Streaks & Badges** | 1, 7, 14, 30, 90-day achievement system |
| ↩ **Undo Last Save** | 8-second undo window after every snapshot |
| 📄 **PDF Export** | Full snapshot with charts and entries |
| 🌙 **Dark / Light Mode** | Smooth toggle, persisted across sessions |
| 📱 **Mobile Friendly** | Responsive sidebar + touch-friendly drawer |
| 📴 **Fully Offline** | Works 100% without internet after first load |
| 🔒 **Privacy First** | All data in localStorage — never sent anywhere |

---

## 🚀 Use It Now

Just open the link — no install needed:
```
https://amantcodes.github.io/-life-snapshot-ai
```

Or run it locally:
```bash
# Clone the repo
git clone https://github.com/amantcodes/-life-snapshot-ai.git

# Open in browser
cd -life-snapshot-ai
open index.html
```

---

## 🗂 File Structure
```
life-snapshot-ai/
├── index.html     ← Full single-page app
├── style.css      ← Warm organic theme, light/dark mode
├── script.js      ← All logic: storage, charts, AI, PDF, badges
├── server.py      ← Optional Python backend for enhanced insights
└── README.md      ← This file
```

---

## 🧠 Optional AI Backend

The app has a full built-in insight engine with zero dependencies.  
For server-enhanced insights, run the Python backend:
```bash
pip install flask flask-cors
python server.py
# → Listening on http://localhost:5000
```

The frontend auto-detects it. If offline, the local engine runs seamlessly.

---

## 📊 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Charts | Chart.js |
| PDF Export | jsPDF + html2canvas |
| Storage | localStorage (offline-first) |
| Analytics | Umami |
| Backend (optional) | Python + Flask |
| Hosting | GitHub Pages |

---

## 🔒 Privacy

- ✅ All data stored in **your browser only**
- ✅ No accounts or login required
- ✅ No data sent to any server
- ✅ Works completely offline
- ✅ Delete everything via **History → Clear All**

---

## 🛠 Built By

Made with ♥ by **Aman**  
GitHub: [@amantcodes](https://github.com/amantcodes)

---

## 📄 License

MIT — free to use, fork, and build upon.
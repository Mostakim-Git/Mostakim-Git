# CaCa · ক্যাকা 📅

**CaCa** is an offline-first class calendar for *any* student at *any* university. Android 10+ (API 29+).
Nothing is pre-filled: on first launch you enter your name, university, department, year and courses — everything is editable later.

## Features
- **Dashboard** – today's progress, next class, upcoming exams/deadlines, your courses
- **Calendar** – month grid, per-day agenda and a **note for every day**
- **Schedule by time** – day/week timeline with a live "now" line; tap an hour slot to add
- **Daily Notes** – auto-saving note (with mood) per day, searchable
- **Class Notes (PDF)** – import PDFs; each is saved to **Internal storage › Documents › CaCa › `Class Note <date>.pdf`** (visible in any file manager) and opens in the built-in viewer offline
- **Courses** – add/edit/delete your own courses (code, title, teacher, credit, colour)
- **Alarms** – repeating/one-off alarms via exact local notifications + full-screen in-app ringer with snooze
- **Home-screen widgets** – *Today's Classes*, *Daily Note*, *Next Alarm*; "Add to home screen" buttons inside the app, auto-refresh on every change and at midnight
- **Editable profile**, dark mode, JSON backup/restore, erase-all

## Tech
React 18 + TypeScript + Vite + Tailwind · Dexie (IndexedDB) · Capacitor 6 · pdf.js · native Java `AppWidgetProvider`s

## Develop
```bash
npm install && npm run dev
```

## Build the APK
- **GitHub Actions** (no local SDK): every push touching `ju-urp-calendar/` runs `.github/workflows/build-apk.yml` and publishes `CaCa.apk` to the **`apk-latest`** release + as a workflow artifact.
- **Locally** (JDK 17 + Android SDK 34): `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`

## Install
Copy `CaCa.apk` to the phone → open → allow "Install unknown apps" → Install. Grant notification permission (and "Alarms & reminders" on Android 12+) so alarms ring while the app is closed.

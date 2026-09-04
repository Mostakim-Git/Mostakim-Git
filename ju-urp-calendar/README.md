# JU URP Calendar 📅

An **offline-first academic calendar app** for students of the Department of Urban & Regional Planning (URP), Jahangirnagar University, Bangladesh. Android 10+ (API 29+).

## Features
- **Dashboard** – greeting, today's progress, next class, upcoming exams/deadlines, course cards
- **Calendar** – month grid with type-coloured dots, per-day agenda and per-day **note**
- **Schedule** – day/week timeline by hour, live "now" indicator, tap an hour slot to add
- **Daily Notes** – one auto-saving note (with mood) for every day, searchable journal
- **Lecture PDFs** – import PDFs, stored in IndexedDB, built-in viewer (pdf.js), share/export
- **Alarms** – repeating/one-off alarms via native exact local notifications + full-screen in-app ringer with snooze
- **Android home-screen widgets** – *Today's Classes*, *Daily Note*, *Next Alarm* (native `AppWidgetProvider`s fed by the app's data)
- **Editable profile**, dark mode, JSON backup/restore, demo-data reset
- Empty states, skeleton loaders, optimistic updates with undo toasts, responsive sidebar/bottom-nav layout
- Seeded with a realistic 3rd-year URP semester on first launch

## Tech
React 18 + TypeScript + Vite + Tailwind · Dexie (IndexedDB) · Capacitor 6 (Android) · pdf.js

## Develop
```bash
npm install
npm run dev          # web preview at http://localhost:5173
```

## Build the APK
### Option A – GitHub Actions (no local SDK needed)
Every push touching `ju-urp-calendar/` runs `.github/workflows/build-apk.yml`, which uploads
`JU-URP-Calendar.apk` as a workflow artifact and to the **`apk-latest`** GitHub release.

### Option B – locally (JDK 17 + Android SDK 34)
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug      # → android/app/build/outputs/apk/debug/app-debug.apk
```

## Install on Android
Copy the APK to the phone → open it → allow "Install unknown apps" → Install.
On first launch, grant the notification permission (and "Alarms & reminders" on Android 12+) so alarms ring while the app is closed.

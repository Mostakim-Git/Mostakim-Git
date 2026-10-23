package app.caca.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

import app.caca.R;

/**
 * Reads the snapshot written by the web layer via Capacitor Preferences
 * (SharedPreferences "CapacitorStorage", key "widget_snapshot").
 * The snapshot contains data for the next 14 days so the widgets can resolve
 * "today" on their own, even if the app hasn't been opened since yesterday.
 */
public final class WidgetData {
    public static final String ACTION_REFRESH = "app.caca.WIDGET_REFRESH";
    private static final String PREFS = "CapacitorStorage";
    private static final String KEY = "widget_snapshot";

    private WidgetData() {}

    public static JSONObject load(Context ctx) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = sp.getString(KEY, null);
            return raw == null ? new JSONObject() : new JSONObject(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    public static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static JSONArray todayEvents(JSONObject snap) {
        JSONObject days = snap.optJSONObject("days");
        JSONArray a = days == null ? null : days.optJSONArray(todayKey());
        return a == null ? new JSONArray() : a;
    }

    public static String todayNote(JSONObject snap) {
        JSONObject notes = snap.optJSONObject("notes");
        return notes == null ? "" : notes.optString(todayKey(), "");
    }

    /** Next enabled alarm relative to now, honouring repeat days. Returns {timeLabel,label} or null. */
    public static JSONObject nextAlarm(JSONObject snap) {
        JSONArray alarms = snap.optJSONArray("alarms");
        if (alarms == null || alarms.length() == 0) return null;
        Calendar now = Calendar.getInstance();
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int todayDow = now.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sunday
        JSONObject best = null; long bestDelta = Long.MAX_VALUE;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject a = alarms.optJSONObject(i);
            if (a == null) continue;
            String[] hm = a.optString("time", "00:00").split(":");
            int min;
            try { min = Integer.parseInt(hm[0]) * 60 + Integer.parseInt(hm[1]); } catch (Exception e) { continue; }
            JSONArray days = a.optJSONArray("days");
            for (int off = 0; off < 8; off++) {
                int dow = (todayDow + off) % 7;
                boolean dayOk = days == null || days.length() == 0;
                if (!dayOk) for (int k = 0; k < days.length(); k++) if (days.optInt(k) == dow) { dayOk = true; break; }
                if (!dayOk) continue;
                long delta = off * 1440L + min - nowMin;
                if (delta <= 0) continue;
                if (delta < bestDelta) { bestDelta = delta; best = a; }
                break;
            }
        }
        return best;
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        Class<?>[] providers = { TodayWidget.class, NoteWidget.class, AlarmWidget.class };
        for (Class<?> p : providers) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, p));
            if (ids.length == 0) continue;
            if (p == TodayWidget.class) mgr.notifyAppWidgetViewDataChanged(ids, R.id.list);
            try {
                BaseWidget w = (BaseWidget) p.newInstance();
                w.onUpdate(ctx, mgr, ids);
            } catch (Exception ignored) {}
        }
    }

    public static int colorForType(String type) {
        if (type == null) return 0xFF3B63F6;
        switch (type) {
            case "lab": return 0xFF8B5CF6;
            case "exam": return 0xFFF43F5E;
            case "assignment": return 0xFFF59E0B;
            case "holiday": return 0xFF10B981;
            case "seminar": return 0xFF06B6D4;
            case "fieldwork": return 0xFF65A30D;
            case "personal": return 0xFF64748B;
            default: return 0xFF3B63F6;
        }
    }
}

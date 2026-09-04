package bd.ac.juniv.urp.calendar.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONObject;

/**
 * Reads the snapshot written by the web layer through Capacitor Preferences
 * (SharedPreferences file "CapacitorStorage", key "widget_snapshot") and
 * provides helpers to refresh every widget of this app.
 */
public final class WidgetData {
    public static final String ACTION_REFRESH = "bd.ac.juniv.urp.calendar.WIDGET_REFRESH";
    private static final String PREFS = "CapacitorStorage";
    private static final String KEY = "widget_snapshot";

    private WidgetData() {}

    public static JSONObject load(Context ctx) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = sp.getString(KEY, null);
            if (raw == null) return new JSONObject();
            return new JSONObject(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        Class<?>[] providers = { TodayWidget.class, NoteWidget.class, AlarmWidget.class };
        for (Class<?> p : providers) {
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, p));
            if (ids.length == 0) continue;
            Intent i = new Intent(ctx, p);
            i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            ctx.sendBroadcast(i);
            if (p == TodayWidget.class) mgr.notifyAppWidgetViewDataChanged(ids, bd.ac.juniv.urp.calendar.R.id.list);
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

package app.caca.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Locale;

import app.caca.R;

public class AlarmWidget extends BaseWidget {
    @Override protected String route() { return "alarms"; }

    @Override
    protected RemoteViews build(Context ctx, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_alarm);
        JSONObject snap = WidgetData.load(ctx);
        JSONObject next = WidgetData.nextAlarm(snap);
        if (next == null) {
            rv.setTextViewText(R.id.time, "Off");
            rv.setTextViewText(R.id.label, "No alarm set");
        } else {
            rv.setTextViewText(R.id.time, next.optString("timeLabel", next.optString("time")));
            rv.setTextViewText(R.id.label, next.optString("label", "Alarm"));
        }
        JSONArray d = snap.optJSONArray("deadlines");
        String today = WidgetData.todayKey();
        JSONObject first = null;
        if (d != null) for (int i = 0; i < d.length(); i++) { JSONObject o = d.optJSONObject(i); if (o != null && o.optString("date").compareTo(today) >= 0) { first = o; break; } }
        if (first != null) {
            rv.setTextViewText(R.id.deadline, first.optString("title"));
            rv.setTextViewText(R.id.deadline_date, prettyDate(first.optString("date")));
        } else {
            rv.setTextViewText(R.id.deadline, "None upcoming");
            rv.setTextViewText(R.id.deadline_date, "");
        }
        return rv;
    }

    private static String prettyDate(String iso) {
        try {
            return new SimpleDateFormat("EEE, d MMM", Locale.ENGLISH).format(new SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH).parse(iso));
        } catch (ParseException | NullPointerException e) { return iso; }
    }
}

package bd.ac.juniv.urp.calendar.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Locale;

import bd.ac.juniv.urp.calendar.R;

public class AlarmWidget extends BaseWidget {
    @Override protected String route() { return "alarms"; }

    @Override
    protected RemoteViews build(Context ctx, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_alarm);
        JSONObject snap = WidgetData.load(ctx);
        String next = snap.isNull("nextAlarm") ? null : snap.optString("nextAlarm", null);
        if (next == null || next.isEmpty()) {
            rv.setTextViewText(R.id.time, "Off");
            rv.setTextViewText(R.id.label, "No alarm set");
        } else {
            String[] parts = next.split(" · ", 2);
            rv.setTextViewText(R.id.time, parts[0]);
            rv.setTextViewText(R.id.label, parts.length > 1 ? parts[1] : "");
        }
        JSONArray d = snap.optJSONArray("deadlines");
        if (d != null && d.length() > 0) {
            JSONObject first = d.optJSONObject(0);
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

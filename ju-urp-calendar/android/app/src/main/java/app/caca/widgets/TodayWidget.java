package app.caca.widgets;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import app.caca.R;

public class TodayWidget extends BaseWidget {
    @Override protected String route() { return "schedule"; }

    @Override
    protected RemoteViews build(Context ctx, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        JSONObject snap = WidgetData.load(ctx);
        JSONArray events = WidgetData.todayEvents(snap);
        int n = events.length();

        rv.setTextViewText(R.id.title, new SimpleDateFormat("EEE, d MMM", Locale.ENGLISH).format(new Date()));
        rv.setTextViewText(R.id.count, n == 0 ? "" : n + (n == 1 ? " event" : " events"));
        String name = snap.optString("studentName", "");
        rv.setTextViewText(R.id.subtitle, name.isEmpty() ? "CaCa" : name + " · CaCa");

        Intent svc = new Intent(ctx, TodayWidgetService.class);
        svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        // Unique data URI so Android doesn't cache a stale adapter between widgets/updates
        svc.setData(Uri.parse("caca://widget/today/" + id + "/" + snap.optLong("updatedAt", 0)));
        rv.setRemoteAdapter(R.id.list, svc);
        rv.setEmptyView(R.id.list, R.id.empty);
        rv.setViewVisibility(R.id.empty, n == 0 ? View.VISIBLE : View.GONE);
        rv.setViewVisibility(R.id.list, n == 0 ? View.GONE : View.VISIBLE);
        rv.setPendingIntentTemplate(R.id.list, openApp(ctx, "schedule", 1000 + id));
        return rv;
    }
}

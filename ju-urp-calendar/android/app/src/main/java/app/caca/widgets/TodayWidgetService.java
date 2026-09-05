package app.caca.widgets;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import app.caca.R;

public class TodayWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    static class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private JSONArray events = new JSONArray();
        Factory(Context ctx) { this.ctx = ctx; }

        @Override public void onCreate() { load(); }
        @Override public void onDataSetChanged() { load(); }
        private void load() { events = WidgetData.todayEvents(WidgetData.load(ctx)); }
        @Override public void onDestroy() {}
        @Override public int getCount() { return events.length(); }
        @Override public RemoteViews getViewAt(int pos) {
            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_today_row);
            JSONObject e = events.optJSONObject(pos);
            if (e != null) {
                rv.setTextViewText(R.id.row_title, e.optString("title"));
                String loc = e.optString("location", "");
                String code = e.optString("courseCode", "");
                rv.setTextViewText(R.id.row_sub, loc.isEmpty() ? code : (code.isEmpty() ? loc : code + " · " + loc));
                rv.setTextViewText(R.id.row_time, e.optString("startLabel"));
                rv.setInt(R.id.bar, "setBackgroundColor", WidgetData.colorForType(e.optString("type")));
            }
            rv.setOnClickFillInIntent(R.id.row_root, new Intent());
            return rv;
        }
        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return false; }
    }
}

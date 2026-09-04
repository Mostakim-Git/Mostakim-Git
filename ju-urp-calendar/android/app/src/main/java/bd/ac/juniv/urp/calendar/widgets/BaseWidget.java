package bd.ac.juniv.urp.calendar.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import bd.ac.juniv.urp.calendar.MainActivity;

public abstract class BaseWidget extends AppWidgetProvider {

    protected abstract String route();
    protected abstract RemoteViews build(Context ctx, int appWidgetId);

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            RemoteViews rv = build(ctx, id);
            rv.setOnClickPendingIntent(bd.ac.juniv.urp.calendar.R.id.widget_root, openApp(ctx, route(), id));
            mgr.updateAppWidget(id, rv);
        }
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (WidgetData.ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(ctx, getClass()));
            onUpdate(ctx, mgr, ids);
        }
    }

    protected static PendingIntent openApp(Context ctx, String route, int reqCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setAction(Intent.ACTION_VIEW);
        i.setData(Uri.parse("juurp://" + route));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, reqCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}

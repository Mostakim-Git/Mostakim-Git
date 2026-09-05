package app.caca;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.caca.widgets.AlarmWidget;
import app.caca.widgets.NoteWidget;
import app.caca.widgets.TodayWidget;
import app.caca.widgets.WidgetData;

/** Capacitor plugin: window.Capacitor.Plugins.Widgets — refresh() and requestPin({kind}). */
@CapacitorPlugin(name = "Widgets")
public class WidgetsPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        WidgetData.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        String kind = call.getString("kind", "today");
        Context ctx = getContext();
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            Class<?> cls = "note".equals(kind) ? NoteWidget.class : "alarm".equals(kind) ? AlarmWidget.class : TodayWidget.class;
            if (mgr.isRequestPinAppWidgetSupported()) {
                Intent cb = new Intent(ctx, cls).setAction(WidgetData.ACTION_REFRESH);
                PendingIntent pi = PendingIntent.getBroadcast(ctx, 0, cb, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                boolean ok = mgr.requestPinAppWidget(new ComponentName(ctx, cls), null, pi);
                ret.put("supported", ok);
                call.resolve(ret);
                return;
            }
        }
        ret.put("supported", false);
        call.resolve(ret);
    }
}

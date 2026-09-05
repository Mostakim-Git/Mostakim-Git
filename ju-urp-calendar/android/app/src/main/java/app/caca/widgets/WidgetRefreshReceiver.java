package app.caca.widgets;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Refreshes widgets on date/time changes and after reboot so "today" stays correct. */
public class WidgetRefreshReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetData.refreshAll(context);
    }
}

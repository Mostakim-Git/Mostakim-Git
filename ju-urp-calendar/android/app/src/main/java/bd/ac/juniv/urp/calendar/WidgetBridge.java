package bd.ac.juniv.urp.calendar;

import android.content.Context;
import android.webkit.JavascriptInterface;

import bd.ac.juniv.urp.calendar.widgets.WidgetData;

/** Exposed to the WebView as window.JUWidgets so the web layer can trigger widget refreshes. */
public class WidgetBridge {
    private final Context ctx;
    public WidgetBridge(Context ctx) { this.ctx = ctx.getApplicationContext(); }

    @JavascriptInterface
    public void refresh() { WidgetData.refreshAll(ctx); }
}

package bd.ac.juniv.urp.calendar;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import bd.ac.juniv.urp.calendar.widgets.WidgetData;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView wv = getBridge().getWebView();
        wv.addJavascriptInterface(new WidgetBridge(this), "JUWidgets");
    }

    @Override
    public void onPause() {
        super.onPause();
        // Make sure home-screen widgets reflect the latest edits when the user leaves the app.
        WidgetData.refreshAll(this);
    }
}

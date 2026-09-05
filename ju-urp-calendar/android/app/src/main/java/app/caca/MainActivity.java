package app.caca;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import app.caca.widgets.WidgetData;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Home-screen widgets should reflect the latest edits as soon as the user leaves the app.
        WidgetData.refreshAll(this);
    }
}

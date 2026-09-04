package bd.ac.juniv.urp.calendar.widgets;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import bd.ac.juniv.urp.calendar.R;

public class NoteWidget extends BaseWidget {
    @Override protected String route() { return "notes"; }

    @Override
    protected RemoteViews build(Context ctx, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_note);
        JSONObject snap = WidgetData.load(ctx);
        String note = snap.optString("note", "").trim();
        rv.setTextViewText(R.id.date, new SimpleDateFormat("EEE d MMM", Locale.ENGLISH).format(new Date()));
        rv.setTextViewText(R.id.note, note.isEmpty() ? "Tap to write today's note…" : note);
        return rv;
    }
}

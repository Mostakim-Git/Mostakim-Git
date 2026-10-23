package app.caca;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.util.Base64;
import java.io.OutputStream;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;


/**
 * CaCa alarm channel manager.
 *  - Notification channels use USAGE_ALARM, so the ALARM volume slider controls loudness (not media).
 *  - A custom tone (file in Documents/CaCa/Tones) becomes a new channel version, because Android
 *    freezes a channel's sound once created.
 *  - pickTone() opens the system ringtone picker filtered to alarms.
 */
@CapacitorPlugin(name = "CacaAlarms")
public class AlarmsPlugin extends Plugin {
    public static final String PREFS = "caca_alarm_channel";

    public static String currentAlarmChannel(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("alarm_channel", "caca_alarm_v1");
    }

    @PluginMethod
    public void configureChannels(PluginCall call) {
        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        String toneUri = call.getString("toneUri", null);   // content:// URI (MediaStore / system ringtone) or null for default
        int version = call.getInt("version", 1);
        String channelId = "caca_alarm_v" + version;

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        try {
            if (toneUri != null && !toneUri.isEmpty()) sound = Uri.parse(toneUri);
        } catch (Exception ignored) {}

        AudioAttributes alarmAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        // Alarm channel (loud, alarm stream, bypasses DND-ish)
        NotificationChannel alarm = new NotificationChannel(channelId, "Alarms", NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("Alarm clock and first-class alarm. Volume follows the Alarm slider.");
        alarm.setSound(sound, alarmAttrs);
        alarm.enableVibration(true);
        alarm.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 500});
        alarm.enableLights(true);
        alarm.setLightColor(0xFF0E7490);
        alarm.setBypassDnd(true);
        alarm.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alarm);

        // Class reminder channel (notification only, default notification sound, no alarm)
        NotificationChannel reminders = new NotificationChannel("caca_class_reminders", "Class reminders", NotificationManager.IMPORTANCE_DEFAULT);
        reminders.setDescription("A quiet heads-up a few minutes before each class");
        reminders.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        reminders.enableVibration(true);
        nm.createNotificationChannel(reminders);

        // Remove older alarm channel versions
        for (NotificationChannel c : nm.getNotificationChannels()) {
            String id = c.getId();
            if (id.startsWith("caca_alarm_v") && !id.equals(channelId)) nm.deleteNotificationChannel(id);
            if (id.equals("alarms")) nm.deleteNotificationChannel(id);
        }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("alarm_channel", channelId).apply();

        JSObject ret = new JSObject();
        ret.put("alarmChannelId", channelId);
        ret.put("reminderChannelId", "caca_class_reminders");
        call.resolve(ret);
    }

    @PluginMethod
    public void pickTone(PluginCall call) {
        Intent i = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        i.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM);
        i.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "CaCa alarm tone");
        i.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
        i.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false);
        String current = call.getString("currentUri", null);
        if (current != null) i.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(current));
        startActivityForResult(call, i, "onTonePicked");
    }

    @ActivityCallback
    private void onTonePicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
            if (uri != null) {
                ret.put("uri", uri.toString());
                try { ret.put("title", RingtoneManager.getRingtone(getContext(), uri).getTitle(getContext())); } catch (Exception e) { ret.put("title", "Custom tone"); }
                call.resolve(ret); return;
            }
        }
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    /** Import an audio file (base64) into MediaStore's Alarms collection so the system can play it. */
    @PluginMethod
    public void importTone(PluginCall call) {
        String name = call.getString("name", "CaCa tone");
        String mime = call.getString("mime", "audio/mpeg");
        String data = call.getString("data", null);
        if (data == null) { call.reject("no data"); return; }
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Audio.Media.DISPLAY_NAME, name);
            v.put(MediaStore.Audio.Media.TITLE, name.replaceAll("\\.[^.]+$", ""));
            v.put(MediaStore.Audio.Media.MIME_TYPE, mime);
            v.put(MediaStore.Audio.Media.IS_ALARM, true);
            v.put(MediaStore.Audio.Media.IS_NOTIFICATION, false);
            v.put(MediaStore.Audio.Media.IS_RINGTONE, false);
            v.put(MediaStore.Audio.Media.IS_MUSIC, false);
            v.put(MediaStore.Audio.Media.RELATIVE_PATH, "Alarms/CaCa");
            v.put(MediaStore.Audio.Media.IS_PENDING, 1);
            Uri collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri uri = getContext().getContentResolver().insert(collection, v);
            if (uri == null) { call.reject("insert failed"); return; }
            try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
                os.write(Base64.decode(data, Base64.DEFAULT));
            }
            v.clear(); v.put(MediaStore.Audio.Media.IS_PENDING, 0);
            getContext().getContentResolver().update(uri, v, null, null);
            JSObject ret = new JSObject(); ret.put("uri", uri.toString()); ret.put("title", name);
            call.resolve(ret);
        } catch (Exception e) { call.reject("import failed: " + e.getMessage()); }
    }

    @PluginMethod
    public void openChannelSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
        i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        i.putExtra(Settings.EXTRA_CHANNEL_ID, currentAlarmChannel(getContext()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}

package com.workedumusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class UploadForegroundService extends Service {

    private static final String CHANNEL_ID = "upload_progress_channel";
    private static final int NOTIFICATION_ID = 2001;
    private NotificationManager notificationManager;
    private NotificationCompat.Builder notificationBuilder;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // 1. Handle the Cancel Button Click from the Notification
        if (intent != null && "ACTION_CANCEL_UPLOAD".equals(intent.getAction())) {
            // Broadcast to NativeSettingsPlugin to tell React to stop
            sendBroadcast(new Intent("com.workedumusic.app.NATIVE_CANCEL_UPLOAD"));
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        // 2. Handle standard Service Stop
        if (intent != null && "STOP_SERVICE".equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String fileName = intent != null ? intent.getStringExtra("fileName") : "Media";
        int progress = intent != null ? intent.getIntExtra("progress", 0) : 0;

        // 3. Create the Cancel Button Intent
        Intent cancelIntent = new Intent(this, UploadForegroundService.class);
        cancelIntent.setAction("ACTION_CANCEL_UPLOAD");
        android.app.PendingIntent cancelPendingIntent = android.app.PendingIntent.getService(
                this, 0, cancelIntent, 
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
        );

        // 4. Build the Notification with the Action Button
        notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("Uploading " + fileName)
                .setContentText(progress + "% Complete")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setProgress(100, progress, false)
                // 👇 THIS ADDS THE CANCEL BUTTON 👇
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel Upload", cancelPendingIntent);

        startForeground(NOTIFICATION_ID, notificationBuilder.build());

        return START_STICKY;
    }

    public void updateProgress(int progress, String fileName) {
        if (notificationBuilder != null && notificationManager != null) {
            notificationBuilder.setProgress(100, progress, false);
            notificationBuilder.setContentText(progress + "% Complete");
            notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Media Uploads",
                    NotificationManager.IMPORTANCE_LOW // Low importance = no sound, just visual progress
            );
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // We don't need binding
    }
}
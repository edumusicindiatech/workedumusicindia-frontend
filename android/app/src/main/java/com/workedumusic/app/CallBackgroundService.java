package com.workedumusic.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class CallBackgroundService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        // 1. Check if this is our custom background VoIP call payload
        if (remoteMessage.getData().size() > 0) {
            String type = remoteMessage.getData().get("type");
            
            if ("incoming_call".equals(type)) {
                wakeUpDeviceAndLaunchApp();
            }
        }
    }

    private void wakeUpDeviceAndLaunchApp() {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "voip_incoming_calls";

        // 2. Create a High-Importance VoIP Channel (Required for Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Incoming Calls",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Ringing for incoming VoIP calls");
            notificationManager.createNotificationChannel(channel);
        }

        // 3. Create the Intent that launches your React App (MainActivity)
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 
                0,
                fullScreenIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 4. Build the Full-Screen Intent Notification
        // The OS sees this and says "The screen is off, I must wake it up and launch this intent immediately!"
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_menu_call) // Replace with your app's icon resource later (e.g., R.mipmap.ic_launcher)
                .setContentTitle("Incoming Call")
                .setContentText("Tap to answer")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true) // TRUE is the magic boolean that wakes the screen
                .setAutoCancel(true)
                .setOngoing(true);

        // 5. Fire it
        notificationManager.notify(1001, builder.build());
    }
}
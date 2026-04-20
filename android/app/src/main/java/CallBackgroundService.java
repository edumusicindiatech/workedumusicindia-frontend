package com.workedumusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class CallBackgroundService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        // 🚨 GRAB WAKE LOCK IMMEDIATELY TO DEFEAT DOZE MODE CPU SLEEP
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WorkEduMusic:VoIPWakeLock");
        wakeLock.acquire(60000); // Hold for max 60 seconds

        try {
            android.util.Log.e("VOIP_DEBUG", "GATE 1: FCM Message Received! WakeLock acquired.");

            if (remoteMessage.getData().size() > 0) {
                String type = remoteMessage.getData().get("type");
                android.util.Log.e("VOIP_DEBUG", "GATE 1: Message Type is: " + type);
                
                if ("incoming_call".equals(type)) {
                    String callerId = remoteMessage.getData().get("callerId");
                    String callerName = remoteMessage.getData().get("callerName");
                    String callType = remoteMessage.getData().get("callType");
                    String profilePicture = remoteMessage.getData().get("profilePicture");
                    String signal = remoteMessage.getData().get("signal");

                    android.util.Log.e("VOIP_DEBUG", "GATE 2: Attempting to wake screen for: " + callerName);
                    wakeUpDeviceAndLaunchApp(callerId, callerName, callType, profilePicture, signal);
                }
            }
        } finally {
            // Ensure we release the CPU lock so we don't drain the user's battery!
            if (wakeLock.isHeld()) {
                wakeLock.release();
                android.util.Log.e("VOIP_DEBUG", "WakeLock released.");
            }
        }
    }

    private void wakeUpDeviceAndLaunchApp(String callerId, String callerName, String callType, String profilePicture, String signal) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "voip_incoming_calls";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Incoming Calls",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Ringing for incoming VoIP calls");
            channel.setBypassDnd(true); 
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC); 
            channel.enableVibration(true);
            
            notificationManager.createNotificationChannel(channel);
        }

        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        fullScreenIntent.putExtra("isIncomingCall", true);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("profilePicture", profilePicture);
        fullScreenIntent.putExtra("signal", signal);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 
                (int) System.currentTimeMillis(),
                fullScreenIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(callerName != null ? callerName : "Incoming Call")
                .setContentText(callType != null && callType.equals("video") ? "Incoming Video Call" : "Incoming Voice Call")
                .setPriority(NotificationCompat.PRIORITY_MAX) // 🚀 Changed to MAX for Doze
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVibrate(new long[]{0, 500, 200, 500}) // 🚀 Force vibration pattern
                .setFullScreenIntent(fullScreenPendingIntent, true) 
                .setAutoCancel(false) // 🚀 Don't auto-cancel, wait for user action
                .setOngoing(true);

        notificationManager.notify(1001, builder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }
}
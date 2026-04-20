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
        
        // DEBUG: Did the OS even wake up this service?
        android.util.Log.e("VOIP_DEBUG", "GATE 1: FCM Message Received in Background!");

        if (remoteMessage.getData().size() > 0) {
            String type = remoteMessage.getData().get("type");
            android.util.Log.e("VOIP_DEBUG", "GATE 1: Message Type is: " + type);
            
            if ("incoming_call".equals(type)) {
                String callerId = remoteMessage.getData().get("callerId");
                String callerName = remoteMessage.getData().get("callerName");
                String callType = remoteMessage.getData().get("callType");
                String profilePicture = remoteMessage.getData().get("profilePicture");
                String signal = remoteMessage.getData().get("signal");

                android.util.Log.e("VOIP_DEBUG", "GATE 2: Attempting to wake screen and launch MainActivity for: " + callerName);
                wakeUpDeviceAndLaunchApp(callerId, callerName, callType, profilePicture, signal);
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
            notificationManager.createNotificationChannel(channel);
        }

        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        
        // 🚀 Added SINGLE_TOP to prevent duplicate app instances
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        // 🟢 PACK THE DATA INTO THE NATIVE INTENT SO REACT CAN READ IT 🟢
        fullScreenIntent.putExtra("isIncomingCall", true);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("profilePicture", profilePicture);
        fullScreenIntent.putExtra("signal", signal);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 
                (int) System.currentTimeMillis(), // Ensures a fresh intent every time
                fullScreenIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_menu_call) // You can change to your app icon later
                .setContentTitle(callerName != null ? callerName : "Incoming Call")
                .setContentText(callType != null && callType.equals("video") ? "Incoming Video Call" : "Incoming Voice Call")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true) // 🚀 THIS WAKES THE SCREEN
                .setAutoCancel(true)
                .setOngoing(true);

        notificationManager.notify(1001, builder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        android.util.Log.e("VOIP_DEBUG", "New FCM Token Generated: " + token);
    }
}
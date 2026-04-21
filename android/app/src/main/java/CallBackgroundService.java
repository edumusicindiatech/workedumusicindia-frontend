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

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class CallBackgroundService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WorkEduMusic:VoIPWakeLock");
        wakeLock.acquire(60000); 

        try {
            if (remoteMessage.getData().size() > 0) {
                String type = remoteMessage.getData().get("type");
                String callerId = remoteMessage.getData().get("callerId");
                // Note: Make sure your FCM payload from server sends 'senderId' for chats!
                String senderId = remoteMessage.getData().get("senderId"); 

                // 🚀 BUG FIX: Immediately tell the server we received the FCM
                // This turns Single Tick -> Double Tick OR Calling -> Ringing
                if ("incoming_call".equals(type)) {
                    sendAckToServer(callerId, "incoming_call");
                    wakeUpDeviceAndLaunchApp(callerId, 
                        remoteMessage.getData().get("callerName"), 
                        remoteMessage.getData().get("callType"), 
                        remoteMessage.getData().get("profilePicture"), 
                        remoteMessage.getData().get("signal"));
                } else if ("chat_message".equals(type)) {
                    sendAckToServer(senderId, "chat_message");
                }
            }
        } finally {
            if (wakeLock.isHeld()) wakeLock.release();
        }
    }

    // 🚀 NEW: The Native HTTP Bridge
    private void sendAckToServer(String senderId, String type) {
        new Thread(() -> {
            try {
                // REPLACE WITH YOUR ACTUAL BACKEND URL
                URL url = new URL("https://workedumusicindia-backend-1.onrender.com/api/voip/acknowledge");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setDoOutput(true);

                // Get My User ID from SharedPreferences (you should save it there during Login)
                String myUserId = getSharedPreferences("CapacitorStorage", MODE_PRIVATE).getString("userId", "");

                String jsonInputString = "{\"senderId\": \"" + senderId + "\", \"recipientId\": \"" + myUserId + "\", \"type\": \"" + type + "\"}";

                try(OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonInputString.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                android.util.Log.e("VOIP_DEBUG", "ACK Sent! Response Code: " + code);
            } catch (Exception e) {
                android.util.Log.e("VOIP_DEBUG", "ACK Failed: " + e.getMessage());
            }
        }).start();
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
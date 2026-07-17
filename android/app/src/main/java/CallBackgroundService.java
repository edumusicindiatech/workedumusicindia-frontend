package com.workedumusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver; 
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes; 
import android.net.Uri; 
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
                String senderId = remoteMessage.getData().get("senderId"); 

                if ("incoming_call".equals(type)) {
                    sendAckToServer(callerId, "incoming_call");
                    wakeUpDeviceAndLaunchApp(callerId, 
                        remoteMessage.getData().get("callerName"), 
                        remoteMessage.getData().get("callType"), 
                        remoteMessage.getData().get("profilePicture"), 
                        remoteMessage.getData().get("signal"));
                } 
                else if ("chat_message".equals(type)) {
                    sendAckToServer(senderId, "chat_message");
                    
                    String senderName = remoteMessage.getData().get("senderName");
                    String msgText = remoteMessage.getData().get("messageText");
                    if (senderName != null && msgText != null) {
                        // 🚀 FIXED: Added 'false' for the isEmergency parameter!
                        showTrayNotification(senderName, msgText, "chat", false);
                    }
                } 
                else if ("system_notification".equals(type)) {
                    String title = remoteMessage.getData().get("title");
                    String msgText = remoteMessage.getData().get("messageText");
                    
                    if (title != null && msgText != null) {
                        boolean isSOS = title.contains("SOS") || title.contains("EMERGENCY");
                        showTrayNotification(title, msgText, "notifications", isSOS); 
                    }
                } else if ("new_media_upload".equals(type)) {
                    String title = remoteMessage.getData().get("title");
                    String msgText = remoteMessage.getData().get("message");
                    String route = remoteMessage.getData().get("route");
                    
                    if (title != null && msgText != null) {
                        // reuse your existing tray notification logic!
                        showTrayNotification(title, msgText, route, false);
                    }
                } else if ("call_cancelled".equals(type)) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(1001); 

                // 🟢 NEW: Get the caller name from the FCM data
                String callerName = remoteMessage.getData().get("callerName");
                String notificationText = (callerName != null && !callerName.equals("Someone")) 
                                        ? "Missed call from " + callerName 
                                        : "You have a missed call.";

                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                intent.putExtra("notification_route", "chat"); 

                PendingIntent pendingIntent = PendingIntent.getActivity(
                        this, (int) System.currentTimeMillis(), intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "system_alerts_channel_v2")
                        .setSmallIcon(getApplicationInfo().icon)
                        .setContentTitle("Missed Call")
                        .setContentText(notificationText) // 🟢 NEW: Use the dynamic text here
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);

                notificationManager.notify(1002, builder.build());
            }

            Intent broadcastIntent = new Intent("com.workedumusic.app.CALL_CANCELLED");
            sendBroadcast(broadcastIntent);
        }
            }
        } finally {
            if (wakeLock.isHeld()) wakeLock.release();
        }
    }

    private void sendAckToServer(String senderId, String type) {
        new Thread(() -> {
            try {
                URL url = new URL("https://workedumusicindia-backend.onrender.com/api/voip/acknowledge");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setDoOutput(true);

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
        
        String channelId = "voip_incoming_calls_v2"; 
        Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/incoming");

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
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            channel.setSound(soundUri, audioAttributes);
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
                .setSmallIcon(getApplicationInfo().icon) // 🚀 FIXED: Dynamic Website App Logo!
                .setContentTitle(callerName != null ? callerName : "Incoming Call")
                .setContentText(callType != null && callType.equals("video") ? "Incoming Video Call" : "Incoming Voice Call")
                .setPriority(NotificationCompat.PRIORITY_MAX) 
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setSound(soundUri) 
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500}) 
                .setFullScreenIntent(fullScreenPendingIntent, true) 
                .setAutoCancel(false) 
                .setOngoing(true);

        notificationManager.notify(1001, builder.build());
    }

    private void showTrayNotification(String title, String messageText, String routeTarget, boolean isEmergency) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        String channelId = isEmergency ? "emergency_alerts_channel" : "system_alerts_channel_v2"; // Renamed channel for new sound
        String channelName = isEmergency ? "Emergency SOS Alerts" : "System Alerts";
        
        // 🚀 FIXED: Point to sos.mp3 or notification_ting.mp3
        Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + (isEmergency ? "/raw/sos" : "/raw/notification_ting"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(true);
            
            if (isEmergency) {
                channel.setBypassDnd(true);
                channel.setVibrationPattern(new long[]{0, 1000, 500, 1000}); 
            }

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(isEmergency ? AudioAttributes.USAGE_ALARM : AudioAttributes.USAGE_NOTIFICATION)
                    .build();
            channel.setSound(soundUri, audioAttributes);
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("notification_route", routeTarget); 

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, (int) System.currentTimeMillis(), intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(isEmergency ? android.R.drawable.ic_dialog_alert : getApplicationInfo().icon) // 🚀 FIXED: SOS vs App Logo!
                .setContentTitle(title)
                .setContentText(messageText)
                .setAutoCancel(true) 
                .setSound(soundUri)
                .setPriority(NotificationCompat.PRIORITY_MAX) 
                .setContentIntent(pendingIntent);
        
        if (isEmergency) {
            builder.setCategory(NotificationCompat.CATEGORY_ALARM);
            builder.setColor(0xFFFF0000); 
        }

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }
}
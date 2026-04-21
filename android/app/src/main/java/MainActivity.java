package com.workedumusic.app;

import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.view.WindowManager;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.content.Context;
import android.app.KeyguardManager; // <-- NEW IMPORT
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import android.app.NotificationManager;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        
        // 🚀 THE FIX: Must be called BEFORE super.onCreate in Capacitor
        wakeUpScreen(); 
        
        super.onCreate(savedInstanceState);
    }

    // 🚀 NEW: Consolidated, hyper-aggressive screen wake method
    private void wakeUpScreen() {
        // 1. Hardware Wake Lock (Forces screen to illuminate)
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock screenWakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "WorkEduMusic:ScreenWakeLock"
            );
            screenWakeLock.acquire(30000); // Hold for 30 seconds
        }

        // 2. OS Window Flags (Bypass lock screen)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            
            // Ask Keyguard to get out of the way
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        checkAndFireCallIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        wakeUpScreen(); // 🚀 Fire the wake up command again on warm starts
        checkAndFireCallIntent(intent);
    }

   private void checkAndFireCallIntent(Intent intent) {
        if (intent != null && intent.hasExtra("isIncomingCall")) {
            boolean isIncoming = intent.getBooleanExtra("isIncomingCall", false);
            
            if (isIncoming) {
                // 🚀 BUG 1 FIX: Cancel the ringing native notification instantly so they don't overlap!
                NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(1001);
                }

                try {
                    JSONObject json = new JSONObject();
                    json.put("from", intent.getStringExtra("callerId"));
                    json.put("callerName", intent.getStringExtra("callerName"));
                    json.put("callType", intent.getStringExtra("callType"));
                    json.put("profilePicture", intent.getStringExtra("profilePicture"));
                    
                    String signalStr = intent.getStringExtra("signal");
                    json.put("signal", signalStr != null ? signalStr : "{}");

                    String jsCode = "window.dispatchEvent(new CustomEvent('native_call_trigger', { detail: " + json.toString() + " }));";
                    
                    injectWhenReady(jsCode, 20);

                } catch (Exception e) {
                    android.util.Log.e("VOIP_DEBUG", "GATE 3 FAILED: " + e.getMessage());
                }

                intent.removeExtra("isIncomingCall");
            }
        }
        
        if (intent != null && intent.hasExtra("notification_route")) {
            String route = intent.getStringExtra("notification_route");
            
            try {
                // 🚀 BUG 2 FIX: Save to LocalStorage so React can read it if the app is booting from cold!
                String jsCode = "window.localStorage.setItem('pending_route', '" + route + "'); window.dispatchEvent(new CustomEvent('notification_tap', { detail: '" + route + "' }));";
                injectWhenReady(jsCode, 20);
            } catch (Exception e) {
                android.util.Log.e("VOIP_DEBUG", "Failed to inject route: " + e.getMessage());
            }
            
            intent.removeExtra("notification_route"); 
        }
    }

    private void injectWhenReady(String jsCode, int attemptsLeft) {
        if (bridge == null || bridge.getWebView() == null || attemptsLeft <= 0) return;

        bridge.getWebView().evaluateJavascript(
            "(typeof window.__voipReady !== 'undefined' && window.__voipReady === true).toString()",
            result -> {
                if ("true".equals(result) || "\"true\"".equals(result)) {
                    android.util.Log.e("VOIP_DEBUG", "REACT IS READY! Injecting call data.");
                    bridge.getWebView().evaluateJavascript(jsCode, null);
                } else {
                    android.util.Log.e("VOIP_DEBUG", "React not ready. Waiting 300ms... Attempts left: " + attemptsLeft);
                    new Handler(Looper.getMainLooper()).postDelayed(
                        () -> injectWhenReady(jsCode, attemptsLeft - 1), 300
                    );
                }
            }
        );
    }
}
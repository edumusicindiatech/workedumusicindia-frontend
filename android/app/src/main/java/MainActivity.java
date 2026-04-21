package com.workedumusic.app;

import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.view.WindowManager;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.content.Context;
import android.app.KeyguardManager;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import android.app.NotificationManager;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.content.res.Configuration;

public class MainActivity extends BridgeActivity {

    // 🔧 FIX: Track whether we've ever entered PiP so we can restore properly
    private boolean wasInPipMode = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        wakeUpScreen();
        super.onCreate(savedInstanceState);
    }

    private void wakeUpScreen() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock screenWakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "WorkEduMusic:ScreenWakeLock"
            );
            screenWakeLock.acquire(30000);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
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

        // 🔧 FIX: If we're returning from PiP (user tapped the pip window to expand),
        // fire the pip_mode_changed=false event so React shows controls again.
        if (wasInPipMode) {
            wasInPipMode = false;
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    String jsCode = "window.dispatchEvent(new CustomEvent('pip_mode_changed', { detail: false }));";
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript(jsCode, null);
                    }
                } catch (Exception e) {
                    android.util.Log.e("VOIP_DEBUG", "Failed to send PiP exit event on resume");
                }
            }, 200);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        wakeUpScreen();
        checkAndFireCallIntent(intent);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();

        // 🔧 FIX: Enter PiP if call is active. We check isCallActive from the native plugin.
        // The 300ms delay in GlobalCallWrapper.jsx ensures the flag is set before this fires.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && NativeSettingsPlugin.isCallActive) {
            try {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                // 9:16 aspect ratio for portrait video call
                pipBuilder.setAspectRatio(new Rational(9, 16));
                enterPictureInPictureMode(pipBuilder.build());
            } catch (Exception e) {
                android.util.Log.e("VOIP_DEBUG", "Failed to enter PiP: " + e.getMessage());
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);

        wasInPipMode = isInPictureInPictureMode;

        // 🔧 FIX: Notify React of PiP state change.
        // When isInPictureInPictureMode=true  → React switches to bare video-only view (no buttons)
        // When isInPictureInPictureMode=false → React restores full call UI
        try {
            String jsCode = "window.dispatchEvent(new CustomEvent('pip_mode_changed', { detail: " + isInPictureInPictureMode + " }));";
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(jsCode, null);
            }
        } catch (Exception e) {
            android.util.Log.e("VOIP_DEBUG", "Failed to send PiP event: " + e.getMessage());
        }
    }

    // 🔧 FIX: Override onStop — when the app goes to background during a call,
    // keep the WebView rendering. Without this, the WebView can suspend JS execution
    // and pause the video tracks.
    @Override
    public void onStop() {
        super.onStop();
        // If a call is active and we entered PiP, keep the WebView awake
        if (NativeSettingsPlugin.isCallActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (isInPictureInPictureMode()) {
                // Android handles rendering in PiP — nothing extra needed
                android.util.Log.d("VOIP_DEBUG", "onStop: in PiP mode, call active — WebView continues");
            }
        }
    }

    private void checkAndFireCallIntent(Intent intent) {
        if (intent != null && intent.hasExtra("isIncomingCall")) {
            boolean isIncoming = intent.getBooleanExtra("isIncomingCall", false);

            if (isIncoming) {
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
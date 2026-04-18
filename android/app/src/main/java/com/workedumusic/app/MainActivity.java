package com.workedumusic.app;

import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.view.WindowManager;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // --- NATIVE WAKE LOCK & LOCK SCREEN BYPASS ---
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
    }

    // Runs when the app is restored from the background
    @Override
    public void onResume() {
        super.onResume();
        checkAndFireCallIntent(getIntent());
    }

    // Runs when the app gets a new intent while already running
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        checkAndFireCallIntent(intent);
    }

    // THE MAGIC BRIDGE: Pulls data from Android and fires it into React
    private void checkAndFireCallIntent(Intent intent) {
        if (intent != null && intent.hasExtra("isIncomingCall")) {
            boolean isIncoming = intent.getBooleanExtra("isIncomingCall", false);
            if (isIncoming) {
                try {
                    // Securely build the JSON payload
                    JSONObject json = new JSONObject();
                    json.put("from", intent.getStringExtra("callerId"));
                    json.put("callerName", intent.getStringExtra("callerName"));
                    json.put("callType", intent.getStringExtra("callType"));
                    json.put("profilePicture", intent.getStringExtra("profilePicture"));
                    
                    String signalStr = intent.getStringExtra("signal");
                    JSONObject signalJson = new JSONObject(signalStr != null ? signalStr : "{}");
                    json.put("signal", signalJson);

                    // Create the JavaScript command
                    String jsCode = "window.dispatchEvent(new CustomEvent('native_call_trigger', { detail: " + json.toString() + " }));";
                    
                    // Delay injection by 1.5 seconds to guarantee React has loaded the DOM
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().evaluateJavascript(jsCode, null);
                        }
                    }, 1500);

                } catch (Exception e) {
                    e.printStackTrace();
                }

                // Remove the extra so it doesn't trigger again if the user rotates the screen
                intent.removeExtra("isIncomingCall");
            }
        }
    }
}
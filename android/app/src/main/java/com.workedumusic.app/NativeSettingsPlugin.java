package com.workedumusic.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSettingsPlugin")
public class NativeSettingsPlugin extends Plugin {

    @PluginMethod
    public void checkSpecialPermissions(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();

        boolean hasOverlay = Settings.canDrawOverlays(context);
        ret.put("hasOverlayPermission", hasOverlay);

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean hasBatteryBypass = false;
        if (pm != null) {
            hasBatteryBypass = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }
        ret.put("hasBatteryBypass", hasBatteryBypass);

        boolean hasFullScreenIntent = true; 
        if (Build.VERSION.SDK_INT >= 34) { 
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                hasFullScreenIntent = nm.canUseFullScreenIntent();
            }
        }
        ret.put("hasFullScreenIntent", hasFullScreenIntent);

        call.resolve(ret);
    }

   @PluginMethod
    public void openSettings(PluginCall call) {
        String type = call.getString("type");
        
        if (getActivity() == null) {
            call.reject("Activity is null.");
            return;
        }

        try {
            if ("overlay".equals(type)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getActivity().getPackageName()));
                getActivity().startActivity(intent);
                call.resolve();

            } else if ("battery".equals(type)) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + getActivity().getPackageName()));
                getActivity().startActivity(intent);
                call.resolve();

            } else if ("fullscreen".equals(type)) {
                if (Build.VERSION.SDK_INT >= 34) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                    intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
                    getActivity().startActivity(intent);
                    call.resolve();
                } else {
                    call.reject("Not applicable below Android 14.");
                }
            } else {
                call.reject("Invalid setting type.");
            }
        } catch (Exception e) {
            call.reject("Failed: " + e.getMessage());
        }
    }

    // 🚀 BUG 2 FIX: ALLOW REACT TO CANCEL THE STUCK NOTIFICATION
    @PluginMethod
    public void cancelCallNotification(PluginCall call) {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(1001); // 1001 is the ID you used in CallBackgroundService
        }
        call.resolve();
    }
}
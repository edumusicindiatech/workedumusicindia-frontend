package com.workedumusic.app;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
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

        // 1. Check if "Draw over other apps" (Overlay) is granted
        boolean hasOverlay = Settings.canDrawOverlays(context);
        ret.put("hasOverlayPermission", hasOverlay);

        // 2. Check if Battery Optimization is ignored (Background running)
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean hasBatteryBypass = false;
        if (pm != null) {
            hasBatteryBypass = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }
        ret.put("hasBatteryBypass", hasBatteryBypass);

        call.resolve(ret);
    }

   @PluginMethod
    public void openSettings(PluginCall call) {
        String type = call.getString("type");
        
        // Safety check: Make sure the app is in the foreground
        if (getActivity() == null) {
            call.reject("Activity is null. Cannot open settings.");
            return;
        }

        try {
            if ("overlay".equals(type)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getActivity().getPackageName()));
                // Removed FLAG_ACTIVITY_NEW_TASK, letting the Activity handle it directly
                getActivity().startActivity(intent);
                call.resolve();

            } else if ("battery".equals(type)) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + getActivity().getPackageName()));
                getActivity().startActivity(intent);
                call.resolve();

            } else {
                call.reject("Invalid setting type requested.");
            }
        } catch (Exception e) {
            call.reject("Failed to open settings: " + e.getMessage());
        }
    }
}
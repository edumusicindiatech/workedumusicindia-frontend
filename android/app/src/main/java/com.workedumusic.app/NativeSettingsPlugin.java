package com.workedumusic.app;

import android.app.NotificationManager;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothHeadset;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSettingsPlugin")
public class NativeSettingsPlugin extends Plugin {

    // 🔧 Global flag for MainActivity to check during onUserLeaveHint
    public static boolean isCallActive = false;

    // 🔧 Bluetooth SCO connection state tracking
    private BroadcastReceiver bluetoothScoReceiver = null;
    private BroadcastReceiver audioDeviceReceiver = null;
    private boolean bluetoothScoRequested = false;

    // ─────────────────────────────────────────────
    // EXISTING METHODS (unchanged)
    // ─────────────────────────────────────────────

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
    public void setNativeUser(PluginCall call) {
        String userId = call.getString("userId");
        if (userId == null) {
            call.reject("userId is required");
            return;
        }
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("userId", userId);
            editor.apply();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void setCallState(PluginCall call) {
        isCallActive = call.getBoolean("isActive", false);
        call.resolve();
    }

    @PluginMethod
    public void cancelCallNotification(PluginCall call) {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(1001);
        }
        call.resolve();
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

    // ─────────────────────────────────────────────
    // 🔧 NEW: AUDIO DEVICE MANAGEMENT
    // ─────────────────────────────────────────────

    /**
     * Returns the list of currently available audio output devices.
     * React uses this to show the audio route picker UI.
     *
     * Returns a JSArray of objects: [{ id: string, name: string, type: string }]
     * type is one of: "earpiece" | "speaker" | "wired_headset" | "bluetooth"
     */
    @PluginMethod
    public void getAvailableAudioDevices(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray devices = new JSArray();

        // Earpiece is always available on phones
        JSObject earpiece = new JSObject();
        earpiece.put("id", "earpiece");
        earpiece.put("name", "Earpiece");
        earpiece.put("type", "earpiece");
        devices.put(earpiece);

        // Speaker is always available
        JSObject speaker = new JSObject();
        speaker.put("id", "speaker");
        speaker.put("name", "Speaker");
        speaker.put("type", "speaker");
        devices.put(speaker);

        if (audioManager != null) {
            // Check for wired headset (3.5mm or USB-C)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo deviceInfo : outputDevices) {
                    int type = deviceInfo.getType();

                    if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                        type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                        type == AudioDeviceInfo.TYPE_USB_HEADSET) {
                        JSObject wired = new JSObject();
                        wired.put("id", "wired_headset");
                        wired.put("name", "Headphones");
                        wired.put("type", "wired_headset");
                        devices.put(wired);
                        break; // Only add once
                    }

                    if (type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) {
                        String deviceName = deviceInfo.getProductName() != null
                            ? deviceInfo.getProductName().toString()
                            : "Bluetooth";
                        JSObject bluetooth = new JSObject();
                        bluetooth.put("id", "bluetooth_" + deviceInfo.getId());
                        bluetooth.put("name", deviceName);
                        bluetooth.put("type", "bluetooth");
                        devices.put(bluetooth);
                    }
                }
            } else {
                // Fallback for older Android (below API 23)
                if (audioManager.isWiredHeadsetOn()) {
                    JSObject wired = new JSObject();
                    wired.put("id", "wired_headset");
                    wired.put("name", "Headphones");
                    wired.put("type", "wired_headset");
                    devices.put(wired);
                }
                if (audioManager.isBluetoothScoAvailableOffCall() || audioManager.isBluetoothA2dpOn()) {
                    JSObject bluetooth = new JSObject();
                    bluetooth.put("id", "bluetooth");
                    bluetooth.put("name", "Bluetooth");
                    bluetooth.put("type", "bluetooth");
                    devices.put(bluetooth);
                }
            }
        }

        JSObject result = new JSObject();
        result.put("devices", devices);
        call.resolve(result);
    }

    /**
     * Routes audio to the specified device.
     * deviceType: "earpiece" | "speaker" | "wired_headset" | "bluetooth"
     */
    @PluginMethod
    public void setAudioDevice(PluginCall call) {
        String deviceType = call.getString("deviceType", "earpiece");
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);

        if (audioManager == null) {
            call.reject("AudioManager unavailable");
            return;
        }

        // Always set communication mode for VoIP
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

        switch (deviceType) {
            case "speaker":
                // Stop any Bluetooth SCO first
                stopBluetoothSco(audioManager);
                audioManager.setSpeakerphoneOn(true);
                break;

            case "earpiece":
                stopBluetoothSco(audioManager);
                audioManager.setSpeakerphoneOn(false);
                break;

            case "wired_headset":
                // Wired headset is automatic when plugged in — just disable speaker + BT
                stopBluetoothSco(audioManager);
                audioManager.setSpeakerphoneOn(false);
                // Android routes to wired headset automatically when speaker is off
                break;

            case "bluetooth":
                audioManager.setSpeakerphoneOn(false);
                startBluetoothSco(audioManager);
                break;

            default:
                // Fallback to earpiece
                stopBluetoothSco(audioManager);
                audioManager.setSpeakerphoneOn(false);
                break;
        }

        call.resolve();
    }

    /**
     * Resets audio manager mode to normal — call this on hangup.
     */
    @PluginMethod
    public void resetAudioMode(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            stopBluetoothSco(audioManager);
            audioManager.setSpeakerphoneOn(false);
            audioManager.setMode(AudioManager.MODE_NORMAL);
        }
        call.resolve();
    }

    /**
     * Legacy: kept for backward compat with existing GlobalCallWrapper.jsx toggleSpeakerphone calls.
     */
    @PluginMethod
    public void toggleSpeakerphone(PluginCall call) {
        Boolean isSpeaker = call.getBoolean("isSpeaker", false);
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            stopBluetoothSco(audioManager);
            audioManager.setSpeakerphoneOn(isSpeaker);
        }
        call.resolve();
    }

    // ─────────────────────────────────────────────
    // 🔧 BLUETOOTH SCO HELPERS
    // ─────────────────────────────────────────────

    private void startBluetoothSco(AudioManager audioManager) {
        if (bluetoothScoRequested) return; // Already started

        // Register receiver to know when SCO is actually connected
        if (bluetoothScoReceiver == null) {
            bluetoothScoReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    int state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1);
                    if (state == AudioManager.SCO_AUDIO_STATE_CONNECTED) {
                        // SCO connected — audio is now routing to Bluetooth
                        android.util.Log.d("VOIP_DEBUG", "Bluetooth SCO connected");
                        // Notify React
                        try {
                            String jsCode = "window.dispatchEvent(new CustomEvent('audio_device_changed', { detail: 'bluetooth' }));";
                            if (bridge != null && bridge.getWebView() != null) {
                                bridge.getWebView().post(() ->
                                    bridge.getWebView().evaluateJavascript(jsCode, null)
                                );
                            }
                        } catch (Exception e) { /* ignore */ }
                    } else if (state == AudioManager.SCO_AUDIO_STATE_DISCONNECTED) {
                        bluetoothScoRequested = false;
                        android.util.Log.d("VOIP_DEBUG", "Bluetooth SCO disconnected");
                    }
                }
            };
            getContext().registerReceiver(
                bluetoothScoReceiver,
                new IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
            );
        }

        audioManager.startBluetoothSco();
        audioManager.setBluetoothScoOn(true);
        bluetoothScoRequested = true;
    }

    private void stopBluetoothSco(AudioManager audioManager) {
        if (!bluetoothScoRequested) return;
        audioManager.stopBluetoothSco();
        audioManager.setBluetoothScoOn(false);
        bluetoothScoRequested = false;

        if (bluetoothScoReceiver != null) {
            try {
                getContext().unregisterReceiver(bluetoothScoReceiver);
            } catch (Exception e) { /* already unregistered */ }
            bluetoothScoReceiver = null;
        }
    }

    // ─────────────────────────────────────────────
    // 🔧 REGISTER AUDIO DEVICE CHANGE LISTENER
    // Call this when a call starts so React gets notified if earphones
    // are plugged/unplugged mid-call (e.g. user removes headphones)
    // ─────────────────────────────────────────────

    @PluginMethod
    public void startAudioDeviceListener(PluginCall call) {
        if (audioDeviceReceiver != null) {
            call.resolve(); // Already listening
            return;
        }

        audioDeviceReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                // Wired headset plugged or unplugged
                if (Intent.ACTION_HEADSET_PLUG.equals(action)) {
                    int state = intent.getIntExtra("state", -1);
                    String eventType = state == 1 ? "wired_headset" : "earpiece";
                    try {
                        String jsCode = "window.dispatchEvent(new CustomEvent('audio_devices_changed', { detail: '" + eventType + "' }));";
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().post(() ->
                                bridge.getWebView().evaluateJavascript(jsCode, null)
                            );
                        }
                    } catch (Exception e) { /* ignore */ }
                }
                // Bluetooth connected/disconnected
                if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action) ||
                    BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action)) {
                    try {
                        String jsCode = "window.dispatchEvent(new CustomEvent('audio_devices_changed', { detail: 'bluetooth_change' }));";
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().post(() ->
                                bridge.getWebView().evaluateJavascript(jsCode, null)
                            );
                        }
                    } catch (Exception e) { /* ignore */ }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_HEADSET_PLUG);
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
        getContext().registerReceiver(audioDeviceReceiver, filter);

        call.resolve();
    }

    @PluginMethod
    public void stopAudioDeviceListener(PluginCall call) {
        if (audioDeviceReceiver != null) {
            try {
                getContext().unregisterReceiver(audioDeviceReceiver);
            } catch (Exception e) { /* ignore */ }
            audioDeviceReceiver = null;
        }
        call.resolve();
    }
}
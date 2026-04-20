import React, { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import toast from 'react-hot-toast';

// This links React to the custom Java code we will write next
const NativeSettingsPlugin = registerPlugin('NativeSettingsPlugin');

const PermissionShield = ({ onAllCleared }) => {
    const [permissions, setPermissions] = useState({
        notifications: false,
        location: false,
        overlay: false,
        battery: false,
    });

    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkAllPermissions();
    }, []);

    const checkAllPermissions = async () => {
        // If running in browser/web, bypass the shield entirely
        if (!Capacitor.isNativePlatform()) {
            onAllCleared();
            return;
        }

        setIsChecking(true);

        try {
            // 1. Check Push Notifications
            const pushStatus = await PushNotifications.checkPermissions();

            // 2. Check Location
            const locStatus = await Geolocation.checkPermissions();

            // 3. Check Special Android Permissions via Custom Plugin
            const nativeStatus = await NativeSettingsPlugin.checkSpecialPermissions();

            const currentStatus = {
                notifications: pushStatus.receive === 'granted',
                location: locStatus.location === 'granted',
                overlay: nativeStatus.hasOverlayPermission,
                battery: nativeStatus.hasBatteryBypass,
            };

            setPermissions(currentStatus);
            setIsChecking(false);

            // If all required permissions are true, let them into the app!
            if (Object.values(currentStatus).every((status) => status === true)) {
                onAllCleared();
            }
        } catch (error) {
            console.error("Error checking permissions:", error);
            setIsChecking(false);
        }
    };

    const requestNotifications = async () => {
        try {
            const status = await PushNotifications.requestPermissions();
            if (status.receive === 'granted') {
                PushNotifications.register();
                checkAllPermissions();
                toast.success("Notifications enabled!");
            } else {
                toast.error("Permission denied by the OS.");
            }
        } catch (error) {
            toast.error("Notification Error: " + (error.message || "Failed to request"));
        }
    };

    const requestLocation = async () => {
        try {
            await Geolocation.requestPermissions();
            checkAllPermissions();
        } catch (error) {
            toast.error("Location Error: " + (error.message || "Failed to request"));
        }
    };

    const openSystemSettings = async (settingType) => {
        try {
            // 🚀 2. Show a quick loading toast so the user knows something is happening
            toast.loading("Opening Android Settings...", { duration: 1500 });
            await NativeSettingsPlugin.openSettings({ type: settingType });
        } catch (error) {
            // 🚀 3. Graceful error handling if the Java side fails
            toast.error("Device Setup Error: " + error.message, { duration: 4000 });
        }
    };

    if (isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#12161f]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300 font-medium">Verifying Device Access...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#f8f9fa] dark:bg-[#12161f] z-9999 flex flex-col justify-center items-center p-6">
            <div className="bg-white dark:bg-[#1e2330] rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Device Setup Required</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    EduMusic requires these permissions to receive VoIP calls and track active assignments.
                </p>

                <div className="space-y-4">

                    {/* Notifications */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Push Notifications</p>
                            <p className="text-xs text-gray-500">For incoming calls & alerts</p>
                        </div>
                        {permissions.notifications ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button onClick={requestNotifications} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90">
                                Allow
                            </button>
                        )}
                    </div>

                    {/* Location */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Location Access</p>
                            <p className="text-xs text-gray-500">For assignment geofencing</p>
                        </div>
                        {permissions.location ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button onClick={requestLocation} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90">
                                Allow
                            </button>
                        )}
                    </div>

                    {/* Overlay / Draw over apps */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Display Over Apps</p>
                            <p className="text-xs text-gray-500">To show call screen when locked</p>
                        </div>
                        {permissions.overlay ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button onClick={() => openSystemSettings('overlay')} className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600">
                                Setup
                            </button>
                        )}
                    </div>

                    {/* Battery Optimization */}
                    <div className="flex justify-between items-center pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Background Activity</p>
                            <p className="text-xs text-gray-500">Unrestricted battery for location</p>
                        </div>
                        {permissions.battery ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button onClick={() => openSystemSettings('battery')} className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600">
                                Setup
                            </button>
                        )}
                    </div>

                </div>

                <button
                    onClick={checkAllPermissions}
                    className="mt-8 w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    I've Updated Settings (Re-Check)
                </button>
            </div>
        </div>
    );
};

export default PermissionShield;
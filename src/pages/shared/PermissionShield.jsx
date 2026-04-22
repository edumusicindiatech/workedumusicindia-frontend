import { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import toast from 'react-hot-toast';
 
const NativeSettingsPlugin = registerPlugin('NativeSettingsPlugin');
 
const PermissionShield = ({ onAllCleared }) => {
    const [permissions, setPermissions] = useState({
        notifications: false,
        location: false,
        overlay: false,
        battery: false,
        fullscreen: false,
    });
 
    const [isChecking, setIsChecking] = useState(true);
 
    useEffect(() => {
        // ── FIX 1: If the app just reloaded from an OTA update,
        // skip the permission check entirely this one time.
        // The flag is set in App.jsx's applyUpdate() before CapacitorUpdater.set().
        if (localStorage.getItem('ota_just_applied') === 'true') {
            localStorage.removeItem('ota_just_applied'); // consume the flag
            console.log('OTA just applied — skipping PermissionShield check.');
            setIsChecking(false);
            onAllCleared();
            return;
        }
 
        // ── FIX 2: Increased from 1500ms → 3000ms so the native bridge
        // has enough time to re-initialize after a Capgo bundle swap.
        const bridgeTimer = setTimeout(() => {
            checkAllPermissions();
        }, 3000);
 
        return () => clearTimeout(bridgeTimer);
    }, []);
 
    // Forces a promise to reject if it takes longer than ms
    const withTimeout = (promise, ms = 5000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Plugin connection timed out')), ms)
            ),
        ]);
    };
 
    const checkAllPermissions = async () => {
        // Web bypass
        if (!Capacitor.isNativePlatform()) {
            setIsChecking(false);
            onAllCleared();
            return;
        }
 
        setIsChecking(true);
 
        try {
            const pushStatus = await withTimeout(PushNotifications.checkPermissions());
            const locStatus = await withTimeout(Geolocation.checkPermissions());
            const nativeStatus = await withTimeout(
                NativeSettingsPlugin.checkSpecialPermissions()
            );
 
            const currentStatus = {
                notifications: pushStatus.receive === 'granted',
                location: locStatus.location === 'granted',
                overlay: nativeStatus.hasOverlayPermission,
                battery: nativeStatus.hasBatteryBypass,
                fullscreen: nativeStatus.hasFullScreenIntent,
            };
 
            setPermissions(currentStatus);
            setIsChecking(false);
 
            if (Object.values(currentStatus).every((status) => status === true)) {
                onAllCleared();
            }
        } catch (error) {
            console.error('Bridge Error: Native plugins failed to respond.', error);
            setIsChecking(false);
 
            if (error.message === 'Plugin connection timed out') {
                toast.error("Device sync delayed. Please try clicking 'Re-Check'.");
            }
        }
    };
 
    const requestNotifications = async () => {
        try {
            const status = await PushNotifications.requestPermissions();
            if (status.receive === 'granted') {
                PushNotifications.register();
                checkAllPermissions();
                toast.success('Notifications enabled!');
            } else {
                toast.error('Permission denied by the OS.');
            }
        } catch (error) {
            toast.error('Notification Error: ' + (error.message || 'Failed to request'));
        }
    };
 
    const requestLocation = async () => {
        try {
            await Geolocation.requestPermissions();
            checkAllPermissions();
        } catch (error) {
            toast.error('Location Error: ' + (error.message || 'Failed to request'));
        }
    };
 
    const openSystemSettings = async (settingType) => {
        try {
            toast.loading('Opening Android Settings...', { duration: 1500 });
            await NativeSettingsPlugin.openSettings({ type: settingType });
        } catch (error) {
            toast.error('Device Setup Error: ' + error.message, { duration: 4000 });
        }
    };
 
    if (isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#12161f]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300 font-medium">
                    Verifying Device Access...
                </p>
            </div>
        );
    }
 
    return (
        <div className="fixed inset-0 bg-[#f8f9fa] dark:bg-[#12161f] z-9999 flex flex-col justify-center items-center p-6">
            <div className="bg-white dark:bg-[#1e2330] rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                    Device Setup Required
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    EduMusic requires these permissions to receive VoIP calls and track active
                    assignments.
                </p>
 
                <div className="space-y-4">
                    {/* Notifications */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Push Notifications
                            </p>
                            <p className="text-xs text-gray-500">For incoming calls & alerts</p>
                        </div>
                        {permissions.notifications ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button
                                onClick={requestNotifications}
                                className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90"
                            >
                                Allow
                            </button>
                        )}
                    </div>
 
                    {/* Location */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Location Access
                            </p>
                            <p className="text-xs text-gray-500">For assignment geofencing</p>
                        </div>
                        {permissions.location ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button
                                onClick={requestLocation}
                                className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90"
                            >
                                Allow
                            </button>
                        )}
                    </div>
 
                    {/* Overlay */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Display Over Apps
                            </p>
                            <p className="text-xs text-gray-500">To show call screen when locked</p>
                        </div>
                        {permissions.overlay ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button
                                onClick={() => openSystemSettings('overlay')}
                                className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600"
                            >
                                Setup
                            </button>
                        )}
                    </div>
 
                    {/* Battery */}
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Background Activity
                            </p>
                            <p className="text-xs text-gray-500">
                                Unrestricted battery for location
                            </p>
                        </div>
                        {permissions.battery ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button
                                onClick={() => openSystemSettings('battery')}
                                className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600"
                            >
                                Setup
                            </button>
                        )}
                    </div>
 
                    {/* Full-Screen Intent */}
                    <div className="flex justify-between items-center pb-3">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                Incoming Call Screen
                            </p>
                            <p className="text-xs text-gray-500">Wake screen for VoIP calls</p>
                        </div>
                        {permissions.fullscreen ? (
                            <span className="text-green-500 font-bold">Granted ✓</span>
                        ) : (
                            <button
                                onClick={() => openSystemSettings('fullscreen')}
                                className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-600"
                            >
                                Setup
                            </button>
                        )}
                    </div>
                </div>
 
                <button
                    onClick={checkAllPermissions}
                    className="mt-8 w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    I've Updated Settings (Re-Check)
                </button>
            </div>
        </div>
    );
};
 
export default PermissionShield;
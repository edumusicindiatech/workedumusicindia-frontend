import { useState, useEffect, useLayoutEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, logout, setHydrationComplete } from "./store/slices/authSlice";
import api, { setAxiosToken } from "./api/axios";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import { Capacitor, registerPlugin } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics } from '@capacitor/haptics';
import { io } from "socket.io-client";

// --- NATIVE UPDATE IMPORTS ---
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import { useRegisterSW } from 'virtual:pwa-register/react';
import { DownloadCloud } from "lucide-react";

import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicRoute from "./components/routing/PublicRoute";
import AdminLayout from "./components/admin/AdminLayout";
import EmployeeLayout from "./components/employee/EmployeeLayout";
import FloatingUploadManager from "./modals/employee/FloatingUploadManager";
import PermissionShield from "./pages/shared/PermissionShield";

const Login = lazy(() => import("./pages/shared/Login"));
const NotFound = lazy(() => import("./pages/shared/Notfound"));
const AdminContact = lazy(() => import("./pages/admin/AdminContact"));
const LearningHub = lazy(() => import("./pages/shared/LearningHub"));

const Dashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const EmployeeRoster = lazy(() => import("./pages/admin/EmployeeRoster"));
const EmployeeProfile = lazy(() => import("./pages/admin/EmployeeProfile"));
const Communication = lazy(() => import("./pages/admin/Communication"));
const AttendanceFeed = lazy(() => import("./pages/admin/AttendenceFeed"));
const ProgressReport = lazy(() => import("./pages/admin/ProgressReport"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLeaveRequests = lazy(() => import("./pages/admin/AdminLeaveRequests"));
const AdminMediaGallery = lazy(() => import("./pages/admin/AdminMediaGallery"));
const AdminLeaderboard = lazy(() => import("./pages/admin/AdminLeaderBoard"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));

const EmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboard"));
const MyProfile = lazy(() => import("./pages/employee/MyProfile"));
const AssignedSchools = lazy(() => import("./pages/employee/AssignedSchools"));
const OptionalTasks = lazy(() => import("./pages/employee/Tasks"));
const EmployeeMedia = lazy(() => import("./pages/employee/EmployeeMedia"));
const DailyReport = lazy(() => import("./pages/employee/DailyReport"));
const EmployeeNotifications = lazy(() => import("./pages/employee/EmployeeNotifications"));
const EmployeeResetPassword = lazy(() => import("./pages/employee/EmployeeResetPassword"));
const EmployeeLeaderBoard = lazy(() => import("./pages/employee/EmployeeLeaderBoard"));

const HelpFAQ = lazy(() => import("./pages/employee/HelpFAQ"));
const SharedChat = lazy(() => import("./pages/shared/SharedChat"));

const GlobalCallWrapper = lazy(() => import("./components/calling/GlobalCallWrapper"));

const CURRENT_APP_VERSION = "1.0.0"; // Update this with each release for native update checks

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#12161f]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const GlobalToaster = () => {
  return (
    <Toaster position="top-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          fontSize: '14px',
          fontWeight: '500',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
        },
      }}
    />
  );
};

// Wrapper to handle the permission state globally for authenticated routes
const PermissionGate = ({ children }) => {
  const [permissionsCleared, setPermissionsCleared] = useState(false);

  if (!permissionsCleared) {
    return <PermissionShield onAllCleared={() => setPermissionsCleared(true)} />;
  }

  return children;
};
const NativeSettings = registerPlugin('NativeSettingsPlugin');
function App() {
  const dispatch = useDispatch();
  const { user, isHydrating, token } = useSelector((state) => state.auth);
  const { i18n, t } = useTranslation();
  const currentTheme = useSelector((state) => state.theme?.mode || 'light');

  const isNative = Capacitor.isNativePlatform();

  // --- NATIVE UPDATE STATE ---
  const [mandatoryNativeUpdate, setMandatoryNativeUpdate] = useState(null);

  // 🚀 GLOBAL CALL FIX: State to intercept and hold background call data instantly
  const [backgroundCallData, setBackgroundCallData] = useState(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r && !isNative) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    }
  });

  // --- CAPGO STABILITY FIX (CRITICAL: useLayoutEffect + No Dynamic Import) ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady()
        .then(() => console.log("✅ Capgo notified: App is stable!"))
        .catch(err => console.error("Capgo Notification Failed:", err));
    }
  }, []);

  useEffect(() => {
    const handleNotificationTap = (e) => {
      // Check event detail OR localStorage (if app just woke up)
      const target = e?.detail || localStorage.getItem('pending_route');
      if (!target) return;

      console.log("📲 Notification Tapped! Routing to:", target);
      localStorage.removeItem('pending_route'); // Clean up

      const basePath = user?.role === 'Admin' || user?.role === 'SuperAdmin' ? '/admin' : '/employee';

      // Force navigation to the correct page
      if (target === 'chat') {
        window.location.href = `${basePath}/chat`;
      } else if (target === 'notifications') {
        window.location.href = `${basePath}/notifications`;
      }
    };

    // Check immediately on mount in case the app was completely killed
    if (user && localStorage.getItem('pending_route')) {
      handleNotificationTap({});
    }

    window.addEventListener('notification_tap', handleNotificationTap);
    return () => window.removeEventListener('notification_tap', handleNotificationTap);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('themeMode', currentTheme);
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  useEffect(() => {
    const initializeApp = async () => {
      if (token) {
        setAxiosToken(token);
        dispatch(setHydrationComplete());

        try {
          const profileRes = await api.get('/employee/me/profile');
          if (profileRes.data.success) {
            dispatch(setCredentials({
              user: profileRes.data.user,
              access_token: token
            }));
          }
        } catch (error) {
          if (error.response && error.response.status === 401) {
            dispatch(logout());
          }
          console.warn("Background profile sync failed (offline or expired). Using cache.");
        }
        return;
      }

      try {
        const refreshRes = await api.get('/auth/refresh-token', {
          withCredentials: true
        });

        const newAccessToken = refreshRes.data.access_token;
        setAxiosToken(newAccessToken);

        const profileRes = await api.get('/employee/me/profile');

        if (profileRes.data.success) {
          dispatch(setCredentials({
            user: profileRes.data.user,
            access_token: newAccessToken
          }));
        } else {
          dispatch(logout());
        }
      } catch (error) {
        dispatch(logout());
      } finally {
        dispatch(setHydrationComplete());
      }
    };

    initializeApp();
  }, []);

  // --- NATIVE HYBRID UPDATE LOGIC ---
  useEffect(() => {
    const checkAppUpdates = async () => {
      if (!isNative) return;

      try {
        const appInfo = await CapApp.getInfo();
        const otaInfo = await CapacitorUpdater.current();

        const platform = Capacitor.getPlatform();
        const current_native_version = appInfo.version;
        const current_ota_version =
          otaInfo.version ||
          otaInfo.bundle?.version ||
          otaInfo.bundle?.id ||
          current_native_version;

        const response = await api.get('/app/check-update', {
          params: { platform, current_native_version, current_ota_version },
        });

        const data = response.data;
        if (data.action === 'NONE') return;

        // ── APK (full native update) ─────────────────────────────
        if (data.action === 'APK') {
          if (data.is_mandatory) {
            setMandatoryNativeUpdate(data);
          } else {
            toast.success(
              'A major app update is available! Check settings to download.',
              { duration: 5000 }
            );
          }
          return;
        }

        // ── OTA (web/JS bundle update) ───────────────────────────
        if (data.action === 'OTA') {
          const previouslyAppliedOta = localStorage.getItem('capgo_applied_ota');

          // Guard: already on this version
          if (
            String(data.release_version) === String(current_ota_version) ||
            String(data.release_version) === previouslyAppliedOta
          ) {
            console.log('Already on latest OTA version. Skipping.');
            return;
          }

          // ── FIX: Silent background download FIRST ──────────────
          // Show a subtle "downloading…" indicator so the user knows
          // something is happening, but it doesn't block the UI.
          const downloadToastId = toast.loading('Downloading update in background…', {
            position: 'bottom-center',
            style: { fontSize: '13px' },
          });

          let bundle;
          try {
            bundle = await CapacitorUpdater.download({
              url: data.download_url,
              version: data.release_version,
            });
          } catch (downloadErr) {
            toast.dismiss(downloadToastId);
            console.error('OTA download failed:', downloadErr);
            return; // Fail silently — try again next launch
          }

          // Download done — dismiss the loading indicator
          toast.dismiss(downloadToastId);

          // ── FIX: applyUpdate separated from download ────────────
          // Cache/SW wipe happens INSIDE restart, not before,
          // so a "Later" choice leaves the app in a working state.
          const applyUpdate = async () => {
            // 1. Mark version BEFORE reloading so PermissionShield
            //    doesn't trigger on the fresh WebView mount.
            localStorage.setItem('capgo_applied_ota', data.release_version);
            // 2. Flag so PermissionShield skips its check on next mount
            localStorage.setItem('ota_just_applied', 'true');

            // 3. Unregister SW & wipe cache RIGHT BEFORE set(),
            //    not before download — this keeps the app usable if
            //    the user taps "Later".
            if ('serviceWorker' in navigator) {
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              } catch (e) {
                console.error('SW unregister failed', e);
              }
            }
            if ('caches' in window) {
              try {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              } catch (e) {
                console.error('Cache wipe failed', e);
              }
            }

            // 4. Small delay so the WebView thread clears before swap
            await new Promise((r) => setTimeout(r, 300));

            // 5. Apply bundle — Capgo reloads the WebView natively
            try {
              await CapacitorUpdater.set({ id: bundle.id });
            } catch (err) {
              console.error('Capgo set failed, forcing reload', err);
              window.location.reload(true);
            }
          };

          if (data.is_mandatory) {
            // Mandatory: apply immediately with a brief notice
            toast('Applying mandatory update…', {
              icon: '⚡',
              duration: 2000,
              position: 'bottom-center',
            });
            await new Promise((r) => setTimeout(r, 2000)); // let toast show
            await applyUpdate();
          } else {
            // Optional: show "Update Ready" toast with Restart / Later
            // ── FIX: toast shown WHILE user is in the app ─────────
            toast(
              (toastInstance) => (
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-bold text-foreground">
                    Update Ready 🎉
                  </span>
                  <span className="text-xs text-muted-foreground">
                    A new version was downloaded. Apply it now?
                  </span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={async () => {
                        toast.dismiss(toastInstance.id);
                        toast.loading('Applying update…', { id: 'updating-toast' });
                        await applyUpdate();
                      }}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-2.5 rounded-lg font-bold transition-colors shadow-sm"
                    >
                      Restart Now
                    </button>
                    <button
                      onClick={() => toast.dismiss(toastInstance.id)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-xs py-2.5 rounded-lg font-bold transition-colors border border-border"
                    >
                      Later
                    </button>
                  </div>
                </div>
              ),
              {
                duration: Infinity,
                position: 'top-center',
              }
            );
          }
        }
      } catch (error) {
        console.error('Hybrid Update Error:', error);
      }
    };

    checkAppUpdates();
  }, [isNative]);

  useEffect(() => {
    const setupFirebase = async () => {
      if (token && isNative) {
        try {
          const result = await FirebaseMessaging.requestPermissions();

          if (result.receive === 'granted') {
            const { token: fcmToken } = await FirebaseMessaging.getToken();
            console.log("🔥 FCM Token generated:", fcmToken);
            await api.post('/auth/update-fcm-token', { fcmToken, userId: user?.id || user?._id });
          } else {
            console.warn("User denied push notification permissions");
          }
        } catch (error) {
          console.error("Firebase setup failed:", error);
        }
      }
    };

    setupFirebase();
  }, [token, isNative, user]);

  useEffect(() => {
    if (isNative) {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        const data = notification.data;

        if (data.type === 'incoming_call') {
          console.log("☎️ Background Call Received via FCM:", data);
          Haptics.vibrate({ duration: 1500 });

          const payload = {
            from: data.callerId,
            callerName: data.callerName,
            callType: data.callType,
            profilePicture: data.profilePicture,
            signal: JSON.parse(data.signal)
          };

          // 🛡️ THE FIX: Protect the perfect Socket data from the truncated FCM data!
          setBackgroundCallData(currentData => {
            if (currentData && currentData.from === payload.from) {
              console.log("🛡️ Keeping full Socket SDP. Ignoring truncated FCM payload.");
              return currentData;
            }
            return payload;
          });

          const event = new CustomEvent('fcm_incoming_call', { detail: payload });
          window.dispatchEvent(event);
        }
      });

      window.addEventListener('native_call_trigger', (e) => {
        console.log("🔥 App woke up from Custom Native Intent!", e.detail);
        Haptics.vibrate({ duration: 1500 });

        let parsedSignal = e.detail.signal;
        if (typeof parsedSignal === 'string') {
          try {
            parsedSignal = JSON.parse(parsedSignal);
          } catch (err) {
            console.error("Failed to parse native intent signal:", err);
          }
        }

        const payload = {
          from: e.detail.from,
          callerName: e.detail.callerName,
          callType: e.detail.callType,
          profilePicture: e.detail.profilePicture,
          signal: parsedSignal
        };

        // 🛡️ THE FIX: Protect the perfect Socket data from the truncated FCM Intent!
        setBackgroundCallData(currentData => {
          if (currentData && currentData.from === payload.from) {
            console.log("🛡️ Keeping full Socket SDP. Ignoring truncated FCM Intent SDP.");
            return currentData;
          }
          return payload;
        });

        const event = new CustomEvent('fcm_incoming_call', { detail: payload });
        window.dispatchEvent(event);
      });

      // 🚀 Tell Java that React is mounted and listening!
      window.__voipReady = true;
    }
  }, [isNative]);

  // 🚀 NEW: Sync User ID to Android SharedPreferences for Killed-App support
  useEffect(() => {
    if (user && Capacitor.isNativePlatform()) {
      const syncId = async () => {
        try {
          const NativeSettings = registerPlugin('NativeSettingsPlugin');
          await NativeSettings.setNativeUser({ userId: user.id || user._id });
          console.log("💾 [DEBUG] User ID synced to Native Storage.");
        } catch (e) { console.error("Sync Failed", e); }
      };
      syncId();
    }
  }, [user]);

  // 🚀 EXTREME NETWORK TRACKING TEST
  useEffect(() => {
    const handleOnline = () => {
      console.log("=========================================");
      console.log("🟢 [NETWORK TEST] INTERNET CONNECTION RESTORED!");
      console.log("=========================================");
      if (window.__GLOBAL_SOCKET__) window.__GLOBAL_SOCKET__.connect();
    };

    const handleOffline = () => {
      console.log("=========================================");
      console.log("🔴 [NETWORK TEST] INTERNET CONNECTION LOST!");
      console.log("=========================================");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    console.log(`⚡ [NETWORK TEST] Initial State: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user?.preferences?.systemLanguage) {
      const langCode = user.preferences.systemLanguage === "हिन्दी (Hindi)" ? "hi" : "en";
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [user?.preferences?.systemLanguage, i18n]);

  useEffect(() => {
    const handleInitiateCall = (e) => {
      const peerToCall = e.detail;
      console.log("🚀 Outgoing call triggered to:", peerToCall.name);

      // Set the state so App.jsx mounts the GlobalCallWrapper
      setBackgroundCallData({
        isOutgoing: true,
        peer: peerToCall,
        callType: peerToCall.callType
      });
    };

    window.addEventListener('initiate_global_call', handleInitiateCall);
    return () => window.removeEventListener('initiate_global_call', handleInitiateCall);
  }, []);

  // 🚀 FIX: Initialize Socket explicitly ABOVE early returns
  if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
      autoConnect: true,
    });
  }
  const socket = window.__GLOBAL_SOCKET__;

  // 🚀 FIX: Move `useEffect` hooks ABOVE early returns to satisfy React rules
  useEffect(() => {
    const handleForegroundCall = (data) => {
      console.log("☎️ Foreground Call Received via Socket:", data);
      Haptics.vibrate({ duration: 1500 });

      const payload = {
        from: data.from || data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        profilePicture: data.profilePicture,
        signal: typeof data.signalData === 'string' ? JSON.parse(data.signalData) : (data.signalData || data.signal)
      };

      // 🛡️ DEDUPLICATION: Check if we are already showing this exact call!
      setBackgroundCallData(currentData => {
        if (currentData && currentData.from === payload.from) {
          console.log("🛡️ Deduplicating call. Ignoring duplicate socket trigger.");
          return currentData;
        }
        return payload;
      });
    };

    socket.on("incoming_call", handleForegroundCall);

    return () => {
      socket.off("incoming_call", handleForegroundCall);
    };
  }, []); // Safe dependency array

  useEffect(() => {
    const checkAndClearCache = async () => {
      const savedVersion = localStorage.getItem('app_version');

      if (savedVersion !== CURRENT_APP_VERSION) {
        console.log("New version detected! Clearing old caches...");

        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          } catch (err) {
            console.error("Cache clearing failed", err);
          }
        }

        const userToken = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        localStorage.clear();

        if (userToken) localStorage.setItem('token', userToken);
        if (userData) localStorage.setItem('user', userData);

        localStorage.setItem('app_version', CURRENT_APP_VERSION);
        window.location.reload(true);
      }
    };

    checkAndClearCache();
  }, []);

  const showBlankScreen = isHydrating && !token;

  if (showBlankScreen) {
    return <div className="min-h-screen w-full bg-[#f8f9fa] dark:bg-[#12161f]"></div>;
  }



  return (
    <>
      {/* PWA UPDATE BLOCKER */}
      {needRefresh && !isNative && (
        <div className="fixed inset-0 z-999999999 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-[90%] flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <DownloadCloud className="w-8 h-8 text-primary animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Update Required</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              A new mandatory version of the app is available. You must update to continue using the system.
            </p>
            <button
              onClick={async () => {
                if ('caches' in window) {
                  try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map((name) => caches.delete(name)));
                  } catch (err) { console.error("Cache wipe failed", err); }
                }
                updateServiceWorker(true);
              }}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base transition-transform active:scale-95 shadow-lg"
            >
              Update App Now
            </button>
          </div>
        </div>
      )}

      {/* NATIVE APK UPDATE BLOCKER */}
      {mandatoryNativeUpdate && isNative && (
        <div className="fixed inset-0 z-999999999 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-[90%] flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <DownloadCloud className="w-8 h-8 text-primary animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Major Update Required</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {mandatoryNativeUpdate.release_notes || "A new mandatory version of the app is available. Please download the latest APK to continue."}
            </p>
            <button
              onClick={() => { window.location.href = mandatoryNativeUpdate.download_url; }}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base transition-transform active:scale-95 shadow-lg"
            >
              Download APK Now
            </button>
          </div>
        </div>
      )}

      <Router>
        <GlobalToaster />
        <FloatingUploadManager />

        {/* 🚀 GLOBAL CALL FIX: Render your Call UI absolutely on top of everything! */}
        <Suspense fallback={null}>
          {backgroundCallData && (
            <div className="fixed inset-0 z-1000000 pointer-events-auto">
              <GlobalCallWrapper
                incomingPayload={backgroundCallData}
                clearCall={() => setBackgroundCallData(null)}
              />
            </div>
          )}
        </Suspense>

        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/contact-admin" element={<PublicRoute><AdminContact /></PublicRoute>} />

            <Route
              path="/admin/reset-password"
              element={<ProtectedRoute requireAdmin={true}><AdminResetPassword /></ProtectedRoute>}
            />
            <Route
              path="/employee/reset-password"
              element={<ProtectedRoute requireAdmin={false}><EmployeeResetPassword /></ProtectedRoute>}
            />

            <Route path="/employee" element={<ProtectedRoute requireAdmin={false}><PermissionGate><EmployeeLayout /></PermissionGate></ProtectedRoute>}>
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="profile" element={<MyProfile />} />
              <Route path="assignments" element={<AssignedSchools />} />
              <Route path="optional" element={<OptionalTasks />} />
              <Route path="media" element={<EmployeeMedia />} />
              <Route path="learning-hub" element={<LearningHub />} />
              <Route path="report" element={<DailyReport />} />
              <Route path="leaderboard" element={<EmployeeLeaderBoard />} />
              <Route path="notifications" element={<EmployeeNotifications />} />
              <Route path="help" element={<HelpFAQ />} />
              <Route path="chat" element={<SharedChat />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><PermissionGate><AdminLayout /></PermissionGate></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="employees" element={<EmployeeRoster />} />
              <Route path="employees/:id" element={<EmployeeProfile />} />
              <Route path="attendance" element={<AttendanceFeed />} />
              <Route path="progress" element={<ProgressReport />} />
              <Route path="leaderboard" element={<AdminLeaderboard />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="media" element={<AdminMediaGallery />} />
              <Route path="learning-hub" element={<LearningHub />} />
              <Route path="leave-requests" element={<AdminLeaveRequests />} />
              <Route path="communication" element={<Communication />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="chat" element={<SharedChat />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}

export default App;
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import store, { persistor } from './store/store.js';
import { PersistGate } from 'redux-persist/integration/react';
import i18n from './i18n.js';

import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { setAxiosToken } from './api/axios.js';

// 1. Set up your store subscription
store.subscribe(() => {
  const state = store.getState();
  setAxiosToken(state.auth.token);
});

// 2. MOUNT REACT FIRST (Do not block this!)
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
);

// 3. FIRE NOTIFYAPPREADY NON-BLOCKING
// This happens immediately after render starts, ensuring we don't hold up the JS thread
// and avoid the Capgo Semaphore Timeout.
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady()
    .then(() => console.log("🚀 [STABILITY LOCKED] Capgo confirmed bundle is safe."))
    .catch(err => console.error("Critical: Capgo anchor failed:", err));
}
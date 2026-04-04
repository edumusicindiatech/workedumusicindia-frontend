import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
// 1. Import both the default store and the named persistor
import store, { persistor } from './store/store.js'
// 2. Import PersistGate
import { PersistGate } from 'redux-persist/integration/react'
import i18n from './i18n.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      {/* 3. Wrap App in PersistGate */}
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
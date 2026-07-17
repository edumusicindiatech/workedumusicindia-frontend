import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Defaults to localStorage

// Slice Imports
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import locationReducer from './slices/locationSlice';
import uploadReducer from './slices/uploadSlice';

// 1. Combine your reducers
const rootReducer = combineReducers({
    auth: authReducer,
    theme: themeReducer,
    location: locationReducer,
    upload: uploadReducer
});

// 2. Configure persistence
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['auth', 'theme']
};

// 3. Create the persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// 4. Configure the store
const store = configureStore({
    reducer: persistedReducer,
    devTools: import.meta.env.DEV,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // THIS IS THE MAGIC LINE: It allows File objects in Redux AND handles persist actions
            serializableCheck: {
                ignoredActions: [
                    'upload/startBackgroundUpload',
                    // Ignore redux-persist under-the-hood actions
                    FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER
                ],
                ignoredPaths: ['upload.jobQueue.files'],
            },
        }),
});

// 5. Export the persistor alongside the store
export const persistor = persistStore(store);
export default store;
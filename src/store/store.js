import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import locationReducer from './slices/locationSlice';
import uploadReducer from './slices/uploadSlice'

const store = configureStore({
    reducer: {
        auth: authReducer,
        theme: themeReducer,
        location: locationReducer,
        upload: uploadReducer
    },
    // Redux Toolkit includes thunk and devtools automatically
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['upload/startBackgroundUpload'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['payload.files'],
                // Ignore these paths in the state
                ignoredPaths: ['upload.jobQueue.files'],
            },
        }),
});

export default store;
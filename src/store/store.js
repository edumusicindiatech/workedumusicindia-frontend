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

    devTools: import.meta.env.DEV,

    // Redux Toolkit includes thunk and devtools automatically
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // THIS IS THE MAGIC LINE: It allows File objects in Redux
            serializableCheck: {
                ignoredActions: ['upload/startBackgroundUpload'],
                ignoredPaths: ['upload.jobQueue.files'],
            },
        }),
});

export default store;
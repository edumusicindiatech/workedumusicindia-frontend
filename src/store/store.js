import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import locationReducer from './slices/locationSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        theme: themeReducer,
        location: locationReducer,
    },
    // Redux Toolkit includes thunk and devtools automatically
});

export default store;
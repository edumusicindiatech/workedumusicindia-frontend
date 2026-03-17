// src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isHydrating: true, // <-- NEW: Tells the app we are checking auth on boot
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, access_token } = action.payload;
            if (user) state.user = user;
            if (access_token) state.token = access_token;
            state.isAuthenticated = true;
            state.isHydrating = false; // Hydration complete!
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isHydrating = false; // Hydration complete (as guest)
        },
        setHydrationComplete: (state) => {
            state.isHydrating = false;
        }
    }
});

export const { setCredentials, logout, setHydrationComplete } = authSlice.actions;
export default authSlice.reducer;
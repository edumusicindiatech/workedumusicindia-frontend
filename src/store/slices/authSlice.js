import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isHydrating: true,
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
            state.isHydrating = false;
        },
        // Updates only the preferences inside the user object
        updateUserPreferences: (state, action) => {
            if (state.user) {
                state.user.preferences = action.payload;
            }
        },
        // 🔥 NEW REDUCER: Instantly updates the profile picture in the UI
        updateProfilePicture: (state, action) => {
            if (state.user) {
                state.user.profilePicture = action.payload;
            }
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isHydrating = false;
        },
        setHydrationComplete: (state) => {
            state.isHydrating = false;
        }
    }
});

export const { setCredentials, updateUserPreferences, updateProfilePicture, logout, setHydrationComplete } = authSlice.actions;
export default authSlice.reducer;
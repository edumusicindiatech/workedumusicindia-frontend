import { createSlice } from '@reduxjs/toolkit';

// Get initial theme cleanly
const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) return savedTheme;

    // Optional: Default to system preference if they've never visited before
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialState = {
    mode: getInitialTheme(),
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
        },
        setTheme: (state, action) => {
            state.mode = action.payload;
        }
    }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
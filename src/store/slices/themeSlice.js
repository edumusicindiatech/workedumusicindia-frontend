import { createSlice } from '@reduxjs/toolkit';

// 1. INSTANT THEME APPLY (Fixes the 2-click bug & prevents white screen flash)
const savedTheme = localStorage.getItem('themeMode') || 'light';
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

const initialState = {
    mode: savedTheme,
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
            localStorage.setItem('themeMode', state.mode);

            if (state.mode === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        setTheme: (state, action) => {
            state.mode = action.payload;
            localStorage.setItem('themeMode', action.payload);

            if (action.payload === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
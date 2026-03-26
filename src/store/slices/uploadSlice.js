import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isUploading: false,
    jobQueue: null, // Will hold { files, metadata }
};

const uploadSlice = createSlice({
    name: 'upload',
    initialState,
    reducers: {
        startBackgroundUpload: (state, action) => {
            state.isUploading = true;
            state.jobQueue = action.payload;
        },
        clearUploadJob: (state) => {
            state.isUploading = false;
            state.jobQueue = null;
        }
    }
});

export const { startBackgroundUpload, clearUploadJob } = uploadSlice.actions;
export default uploadSlice.reducer;
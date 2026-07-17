import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    latitude: null,
    longitude: null,
    inRadius: false,
    locationReady: false,
    error: null,
};

const locationSlice = createSlice({
    name: 'location',
    initialState,
    reducers: {
        updateLocation: (state, action) => {
            state.latitude = action.payload.latitude;
            state.longitude = action.payload.longitude;
            state.locationReady = true;
            state.error = null;
        },
        setLocationError: (state, action) => {
            state.error = action.payload;
            state.locationReady = false;
        },
        setInRadiusStatus: (state, action) => {
            state.inRadius = action.payload;
        },
        clearLocation: (state) => {
            state.latitude = null;
            state.longitude = null;
            state.inRadius = false;
            state.locationReady = false;
        }
    }
});

export const { updateLocation, setLocationError, setInRadiusStatus, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
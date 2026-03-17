// src/api/axios.js
import axios from 'axios';

const BASE_URL = import.meta.env?.VITE_BASE_URL || 'http://localhost:5000';

// 1. Create the base instance
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true, // IMPORTANT: Allows sending HTTP-only cookies (your refresh token)
});

// Variables to handle multiple requests failing at the exact same time
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// 2. Request Interceptor: Attach the access token to every outgoing request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor: Catch 401s and auto-refresh
api.interceptors.response.use(
    (response) => response, // If the request succeeds, just return it
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 (Unauthorized) and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {

            // Prevent infinite loop if the refresh route itself fails
            if (originalRequest.url.includes('/auth/refresh')) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If a refresh is already happening, queue this request until it finishes
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // 4. Call your backend refresh endpoint
                // We use standard axios here so it doesn't trigger the interceptors
                const { data } = await axios.post(
                    `${BASE_URL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = data.access_token;

                // 5. Save the new token
                localStorage.setItem('access_token', newAccessToken);

                // 6. Update the header for the original failed request
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                // Process any other requests that were waiting
                processQueue(null, newAccessToken);

                // 7. Retry the original request
                return api(originalRequest);

            } catch (refreshError) {
                // If the refresh call fails, the user is truly logged out
                processQueue(refreshError, null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/'; // Redirect to login
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
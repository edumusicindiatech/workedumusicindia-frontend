import axios from 'axios';

const BASE_URL = import.meta.env?.VITE_BASE_URL || 'http://localhost:5000';

// 1. In-Memory Token Storage
let currentAccessToken = null;

// Export a setter function so we can update this variable from Login or App.jsx
export const setAxiosToken = (token) => {
    currentAccessToken = token;
};

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true, // Critical for sending the HttpOnly refresh cookie
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// 2. Request Interceptor: Use the in-memory token
api.interceptors.request.use(
    (config) => {
        // --- STEP 2 FIX: BYPASS LOGIN ROUTE ---
        // Do not attach any ghost tokens if the user is trying to log in
        const isLoginRoute = config.url && config.url.includes('/auth/login');
        
        if (currentAccessToken && !isLoginRoute) {
            config.headers['Authorization'] = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor: Handle 401s and Auto-Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url.includes('/auth/refresh-token')) {
                // If the refresh route itself fails, the user is fully logged out
                setAxiosToken(null);
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint to use the HttpOnly cookie
                const { data } = await axios.get(
                    `${BASE_URL}/api/auth/refresh-token`,
                    { withCredentials: true }
                );

                const newAccessToken = data.access_token;

                // Update in-memory token
                setAxiosToken(newAccessToken);

                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                setAxiosToken(null);
                // Redirect logic can be handled at the router/component level now
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
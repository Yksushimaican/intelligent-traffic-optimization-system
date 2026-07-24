import axios from 'axios';

// ============================================================
// IMPORTANT: Use your BACKEND ngrok URL here
// Replace YOUR_BACKEND_URL with your actual ngrok URL for port 5000
// Example: https://xyz123.ngrok-free.dev
// ============================================================
const BACKEND_URL = 'https://elated-clapper-municipal.ngrok-free.dev';
const API_URL = `${BACKEND_URL}/api`;

console.log('API URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000,
});

// Add token to requests if logged in
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ============================================================
// AUTH API
// ============================================================
export const authAPI = {
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            return response;
        } catch (error) {
            console.error('Register error:', error.response?.data);
            throw error;
        }
    },
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);
            return response;
        } catch (error) {
            console.error('Login error:', error.response?.data);
            throw error;
        }
    },
};

// ============================================================
// ROUTES API
// ============================================================
export const routesAPI = {
    optimize: (routeData) => api.post('/routes/optimize', routeData),
    save: (routeData) => api.post('/routes/save', routeData),
    getSaved: (userId) => api.get(`/routes/saved/${userId}`),
    delete: (routeId) => api.delete(`/routes/saved/${routeId}`),
};

// ============================================================
// TRAFFIC API
// ============================================================
export const trafficAPI = {
    report: (reportData) => api.post('/traffic/report', reportData),
    getReports: (params) => api.get('/traffic/reports', { params }),
};

// ============================================================
// WEATHER API
// ============================================================
export const weatherAPI = {
    getWeather: (params) => api.get('/weather', { params }),
};

export default api;
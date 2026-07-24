import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if logged in
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
};

export const routesAPI = {
    optimize: (routeData) => api.post('/routes/optimize', routeData),
    save: (routeData) => api.post('/routes/save', routeData),
    getSaved: (userId) => api.get(`/routes/saved/${userId}`),
};

export const trafficAPI = {
    report: (reportData) => api.post('/traffic/report', reportData),
    getReports: (params) => api.get('/traffic/reports', { params }),
};

export const weatherAPI = {
    getWeather: (params) => api.get('/weather', { params }),
};

export default api;
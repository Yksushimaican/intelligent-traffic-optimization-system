import React, { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaCloudSun, FaCloudRain, FaCloud, FaCar, FaMapMarkerAlt, FaFlag, FaRoute, FaRedo, FaSave } from 'react-icons/fa';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard';
import { useTheme } from './context/ThemeContext';
import { routesAPI, weatherAPI } from './services/api';
import './App.css';

// ============================================================
// HELPER FUNCTION: Validate coordinates (flexible)
// ============================================================
const isValidLatLng = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    return !isNaN(latNum) && !isNaN(lngNum);
};

function App() {
    const { darkMode } = useTheme();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [weather, setWeather] = useState(null);
    const [mode, setMode] = useState('start');
    const [error, setError] = useState(null);
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [isNavigating, setIsNavigating] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distanceTraveled, setDistanceTraveled] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setIsLoggedIn(true);
            loadSavedRoutes(userData.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSavedRoutes = async (userId) => {
        const targetUserId = userId || user?.id;
        if (!targetUserId) return;
        try {
            const response = await routesAPI.getSaved(targetUserId);
            setSavedRoutes(response.data || []);
        } catch (error) {
            console.error('Failed to load saved routes:', error);
        }
    };

    const handleLogin = (userData) => {
        setUser(userData);
        setIsLoggedIn(true);
        setTimeout(() => loadSavedRoutes(userData.id), 100);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsLoggedIn(false);
        setSavedRoutes([]);
        setRoute(null);
        setStartPoint(null);
        setEndPoint(null);
        setIsNavigating(false);
        setIsTracking(false);
        setCurrentLocation(null);
        setDistanceTraveled(0);
        setTimeElapsed(0);
    };

    const handleStartSelect = (location) => {
        if (location && isValidLatLng(location.lat, location.lng)) {
            setStartPoint(location);
            setMode('end');
            setError(null);
        }
    };

    const handleEndSelect = (location) => {
        if (location && isValidLatLng(location.lat, location.lng)) {
            setEndPoint(location);
            setMode(null);
            setError(null);
        }
    };

    const handleMapClick = (latlng) => {
        const { lat, lng } = latlng;
        if (isValidLatLng(lat, lng)) {
            if (mode === 'start') {
                setStartPoint({ lat, lng, name: 'Selected on map' });
                setMode('end');
                setError(null);
            } else if (mode === 'end') {
                setEndPoint({ lat, lng, name: 'Selected on map' });
                setMode(null);
                setError(null);
            }
        }
    };

    const handleOptimizeRoute = async () => {
        if (!startPoint || !endPoint) {
            setError('Please select both start point and destination');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const routeResponse = await routesAPI.optimize({
                start_lat: startPoint.lat,
                start_lng: startPoint.lng,
                end_lat: endPoint.lat,
                end_lng: endPoint.lng,
            });
            
            const routeData = routeResponse.data;
            if (routeData && routeData.path) {
                routeData.path = routeData.path.filter(point => {
                    if (!Array.isArray(point) || point.length < 2) return false;
                    const lat = parseFloat(point[0]);
                    const lng = parseFloat(point[1]);
                    return !isNaN(lat) && !isNaN(lng);
                });
                
                if (routeData.path.length < 2) {
                    routeData.path = [
                        [parseFloat(startPoint.lat), parseFloat(startPoint.lng)],
                        [parseFloat(endPoint.lat), parseFloat(endPoint.lng)]
                    ];
                }
            }
            
            setRoute(routeData);
            
            const weatherResponse = await weatherAPI.getWeather({
                lat: startPoint.lat,
                lng: startPoint.lng,
            });
            setWeather(weatherResponse.data);
            
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to get route. Make sure backend is running on port 5000');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStartPoint(null);
        setEndPoint(null);
        setRoute(null);
        setWeather(null);
        setMode('start');
        setError(null);
        setIsNavigating(false);
        setIsTracking(false);
        setCurrentLocation(null);
        setDistanceTraveled(0);
        setTimeElapsed(0);
    };

    const saveCurrentRoute = async () => {
        if (!user) {
            alert('Please login first to save routes');
            return;
        }
        if (!route) {
            alert('Please calculate a route first');
            return;
        }
        if (!startPoint || !endPoint) {
            alert('Please set both start and end points');
            return;
        }
        try {
            const startName = startPoint.name || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`;
            const endName = endPoint.name || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`;
            
            const routeData = {
                user_id: user.id,
                route_name: `${startName} to ${endName}`,
                start_lat: parseFloat(startPoint.lat),
                start_lng: parseFloat(startPoint.lng),
                end_lat: parseFloat(endPoint.lat),
                end_lng: parseFloat(endPoint.lng),
                start_name: startName,
                end_name: endName,
                distance: parseFloat(route.distance_km),
                eta: parseInt(route.eta_minutes)
            };
            
            const response = await routesAPI.save(routeData);
            if (response.data.success) {
                alert('Route saved successfully');
                await loadSavedRoutes(user.id);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert(`Failed to save route: ${error.response?.data?.error || error.message}`);
        }
    };

    const loadSavedRoute = (savedRoute) => {
        if (savedRoute && isValidLatLng(savedRoute.start_lat, savedRoute.start_lng) && 
            isValidLatLng(savedRoute.end_lat, savedRoute.end_lng)) {
            setStartPoint({
                lat: savedRoute.start_lat,
                lng: savedRoute.start_lng,
                name: savedRoute.start_name || 'Saved Route'
            });
            setEndPoint({
                lat: savedRoute.end_lat,
                lng: savedRoute.end_lng,
                name: savedRoute.end_name || 'Saved Route'
            });
            setMode(null);
            setTimeout(() => handleOptimizeRoute(), 500);
        }
    };

    const getTrafficColor = (level) => {
        switch(level) {
            case 'low': return '#4CAF50';
            case 'moderate': return '#FFC107';
            case 'heavy': return '#FF9800';
            case 'gridlock': return '#F44336';
            default: return '#757575';
        }
    };

    const getWeatherIcon = (condition) => {
        switch(condition?.toLowerCase()) {
            case 'clear': return <FaSun />;
            case 'rain': return <FaCloudRain />;
            case 'clouds': return <FaCloud />;
            case 'storm': return <FaCloudSun />;
            default: return <FaCloudSun />;
        }
    };

    if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
            <Dashboard
                user={user}
                onLogout={handleLogout}
                startPoint={startPoint}
                endPoint={endPoint}
                route={route}
                loading={loading}
                weather={weather}
                mode={mode}
                error={error}
                savedRoutes={savedRoutes}
                handleMapClick={handleMapClick}
                handleStartSelect={handleStartSelect}
                handleEndSelect={handleEndSelect}
                handleOptimizeRoute={handleOptimizeRoute}
                handleReset={handleReset}
                saveCurrentRoute={saveCurrentRoute}
                loadSavedRoute={loadSavedRoute}
                getTrafficColor={getTrafficColor}
                getWeatherIcon={getWeatherIcon}
                loadSavedRoutes={loadSavedRoutes}
                isNavigating={isNavigating}
                setIsNavigating={setIsNavigating}
                currentLocation={currentLocation}
                setCurrentLocation={setCurrentLocation}
                distanceTraveled={distanceTraveled}
                setDistanceTraveled={setDistanceTraveled}
                timeElapsed={timeElapsed}
                setTimeElapsed={setTimeElapsed}
                isTracking={isTracking}
                setIsTracking={setIsTracking}
                setRoute={setRoute}
                setWeather={setWeather}
                setLoading={setLoading}
                setError={setError}
            />
        </div>
    );
}

export default App;
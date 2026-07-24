import React, { useState } from 'react';
import { 
    FaMap, 
    FaSave, 
    FaCloudSun, 
    FaTachometerAlt,
    FaCar,
    FaRoute,
    FaHistory,
    FaTrafficLight,
    FaCog,
    FaChevronLeft,
    FaChevronRight,
    FaSignOutAlt
} from 'react-icons/fa';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardStats from './DashboardStats';
import RoutePlanner from './RoutePlanner';
import SavedRoutes from './SavedRoutes';
import History from './History';
import TrafficReports from './TrafficReports';
import Settings from './Settings';
import WeatherDashboard from './WeatherDashboard';
import WeatherSummary from './WeatherSummary';

function Dashboard({ 
    user, 
    onLogout,
    startPoint,
    endPoint,
    route,
    loading,
    weather,
    mode,
    error,
    savedRoutes,
    handleMapClick,
    handleStartSelect,
    handleEndSelect,
    handleOptimizeRoute,
    handleReset,
    saveCurrentRoute,
    loadSavedRoute,
    getTrafficColor,
    getWeatherIcon,
    loadSavedRoutes,
    isNavigating,
    setIsNavigating,
    currentLocation,
    setCurrentLocation,
    distanceTraveled,
    setDistanceTraveled,
    timeElapsed,
    setTimeElapsed,
    isTracking,
    setIsTracking
}) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showWeatherDetail, setShowWeatherDetail] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const calculateStats = () => {
        const totalTrips = savedRoutes?.length || 0;
        let totalDistance = 0;
        let totalTime = 0;
        savedRoutes?.forEach(r => {
            totalDistance += parseFloat(r.distance_km) || 0;
            totalTime += parseInt(r.eta_minutes) || 0;
        });
        return { totalTrips, totalDistance, totalTime, savedRoutes: totalTrips };
    };

    const stats = calculateStats();

    const formatCoord = (value) => {
        if (value === null || value === undefined) return '--';
        const num = parseFloat(value);
        return isNaN(num) ? '--' : num.toFixed(4);
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard':
                return (
                    <>
                        <DashboardStats stats={stats} />
                        <div className="quick-actions">
                            <button className="quick-action-btn" onClick={() => setActiveTab('routes')}>
                                <FaMap /> Plan a Route
                            </button>
                            <button className="quick-action-btn" onClick={() => setActiveTab('saved')}>
                                <FaSave /> View Saved Routes
                            </button>
                            <button className="quick-action-btn" onClick={() => setActiveTab('weather')}>
                                <FaCloudSun /> Check Weather
                            </button>
                        </div>
                        {savedRoutes?.length > 0 && (
                            <div className="recent-activity">
                                <h3>Recent Activity</h3>
                                <div className="activity-list">
                                    {savedRoutes.slice(0, 3).map((routeItem, index) => {
                                        const startLat = parseFloat(routeItem.start_lat) || 0;
                                        const startLng = parseFloat(routeItem.start_lng) || 0;
                                        
                                        return (
                                            <div key={index} className="activity-item">
                                                <span className="activity-icon"><FaCar /></span>
                                                <span className="activity-desc">
                                                    Route from {formatCoord(startLat)}, {formatCoord(startLng)}
                                                </span>
                                                <span className="activity-time">
                                                    {routeItem.created_at ? new Date(routeItem.created_at).toLocaleDateString() : 'Unknown'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                );
            case 'routes':
                return (
                    <RoutePlanner
                        startPoint={startPoint}
                        endPoint={endPoint}
                        route={route}
                        loading={loading}
                        weather={weather}
                        mode={mode}
                        error={error}
                        savedRoutes={savedRoutes}
                        onMapClick={handleMapClick}
                        onStartSelect={handleStartSelect}
                        onEndSelect={handleEndSelect}
                        onOptimize={handleOptimizeRoute}
                        onReset={handleReset}
                        onSave={saveCurrentRoute}
                        user={user}
                        loadSavedRoute={loadSavedRoute}
                        loadSavedRoutes={loadSavedRoutes}
                        getTrafficColor={getTrafficColor}
                        getWeatherIcon={getWeatherIcon}
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
                    />
                );
            case 'saved':
                return (
                    <SavedRoutes 
                        user={user}
                        onLoadRoute={loadSavedRoute}
                        onRouteDeleted={() => loadSavedRoutes(user.id)}
                    />
                );
            case 'history':
                return (
                    <History 
                        savedRoutes={savedRoutes}
                        onLoadRoute={loadSavedRoute}
                    />
                );
            case 'traffic':
                return <TrafficReports user={user} />;
            case 'weather':
                return showWeatherDetail ? (
                    <WeatherDashboard 
                        currentLocation={currentLocation} 
                        onBack={() => setShowWeatherDetail(false)}
                    />
                ) : (
                    <div className="weather-container">
                        <div className="weather-summary-card" onClick={() => setShowWeatherDetail(true)}>
                            <WeatherSummary currentLocation={currentLocation} />
                            <div className="weather-summary-click-hint">
                                Click for detailed forecast
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return <Settings />;
            default:
                return <div>Page not found</div>;
        }
    };

    return (
        <div className={`dashboard ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={onLogout}
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
            />
            <div className="dashboard-main">
                <Header user={user} toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
                <div className="dashboard-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
import React, { useState, useRef } from 'react';
import { 
    FaCar, 
    FaClock, 
    FaRulerCombined, 
    FaFolderOpen, 
    FaSatellite 
} from 'react-icons/fa';
import { formatTime, formatDistance } from '../utils/timeUtils';

function Navigation({ 
    startPoint, 
    endPoint, 
    route, 
    onStopNavigation,
    onLoadSavedRoute,
    savedRoutes,
    isNavigating,
    setIsNavigating,
    currentLocation,
    setCurrentLocation,
    distanceTraveled,
    setDistanceTraveled,
    timeElapsed,
    setTimeElapsed,
    isTracking,
    setIsTracking,
    onLocationUpdate,
    onLocationError,
    onStartNavigation  // Add this new prop
}) {
    const timerRef = useRef(null);
    const lastLocationRef = useRef(null);
    const [showSavedRoutes, setShowSavedRoutes] = useState(false);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const handleLocationUpdate = (location) => {
        if (setCurrentLocation) {
            setCurrentLocation(location);
        }
        if (setIsTracking) {
            setIsTracking(true);
        }
        
        if (lastLocationRef.current) {
            const dist = calculateDistance(
                lastLocationRef.current.lat,
                lastLocationRef.current.lng,
                location.lat,
                location.lng
            );
            if (setDistanceTraveled) {
                setDistanceTraveled(prev => prev + dist);
            }
        }
        lastLocationRef.current = location;

        if (onLocationUpdate) {
            onLocationUpdate(location);
        }

        if (endPoint && isNavigating) {
            const distToDest = calculateDistance(
                location.lat,
                location.lng,
                endPoint.lat,
                endPoint.lng
            );
            
            if (distToDest < 0.05) {
                if (setIsNavigating) {
                    setIsNavigating(false);
                }
                if (setIsTracking) {
                    setIsTracking(false);
                }
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                alert('You have arrived at your destination!');
            }
        }
    };

    const startNavigation = () => {
        if (!startPoint || !endPoint) {
            alert('Please set start point and destination first');
            return;
        }
        
        // Call the parent's start navigation handler if provided
        if (onStartNavigation) {
            onStartNavigation();
            return;
        }
        
        // Fallback: start navigation directly
        if (setIsNavigating) {
            setIsNavigating(true);
        }
        if (setIsTracking) {
            setIsTracking(true);
        }
        if (setDistanceTraveled) {
            setDistanceTraveled(0);
        }
        if (setTimeElapsed) {
            setTimeElapsed(0);
        }
        lastLocationRef.current = null;

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            if (setTimeElapsed) {
                setTimeElapsed(prev => prev + 1);
            }
        }, 1000);

        if (!navigator.geolocation) {
            alert('GPS not available. Please enable location services.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed
                };
                handleLocationUpdate(location);
            },
            (error) => {
                alert('Please enable GPS/location services for navigation');
                console.error(error);
            }
        );
    };

    const stopNavigation = () => {
        if (setIsNavigating) {
            setIsNavigating(false);
        }
        if (setIsTracking) {
            setIsTracking(false);
        }
        if (setDistanceTraveled) {
            setDistanceTraveled(0);
        }
        if (setTimeElapsed) {
            setTimeElapsed(0);
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (onStopNavigation) {
            onStopNavigation();
        }
    };

    const getSpeed = () => {
        if (!currentLocation?.speed) return '0';
        const speed = currentLocation.speed * 3.6;
        return speed.toFixed(0);
    };

    const getAccuracy = () => {
        if (!currentLocation?.accuracy) return 'Unknown';
        return `${currentLocation.accuracy.toFixed(0)}m`;
    };

    return (
        <div className="navigation-overlay">
            <div className="navigation-header">
                <div className="nav-header-left">
                    <h3><FaCar /> Navigation</h3>
                    <span className={`nav-status ${isNavigating ? 'active' : ''}`}>
                        {isNavigating ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="nav-header-right">
                    <button className="nav-toggle-routes" onClick={() => setShowSavedRoutes(!showSavedRoutes)}>
                        <FaFolderOpen /> Routes
                    </button>
                </div>
            </div>

            {isNavigating && (
                <div className="navigation-stats">
                    <div className="nav-stat">
                        <span className="nav-stat-label"><FaRulerCombined /> Distance</span>
                        <span className="nav-stat-value">{formatDistance(distanceTraveled)}</span>
                    </div>
                    <div className="nav-stat">
                        <span className="nav-stat-label"><FaClock /> Time</span>
                        <span className="nav-stat-value">{formatTime(timeElapsed)}</span>
                    </div>
                    <div className="nav-stat">
                        <span className="nav-stat-label"><FaCar /> Speed</span>
                        <span className="nav-stat-value">{getSpeed()} km/h</span>
                    </div>
                    <div className="nav-stat">
                        <span className="nav-stat-label"><FaSatellite /> Accuracy</span>
                        <span className="nav-stat-value">{getAccuracy()}</span>
                    </div>
                </div>
            )}

            {isNavigating && route && (
                <div className="nav-progress-compact">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ 
                                width: `${Math.min((distanceTraveled / (route.distance_km || 1)) * 100, 100)}%` 
                            }}
                        ></div>
                    </div>
                    <span className="progress-text">
                        {Math.min((distanceTraveled / (route.distance_km || 1)) * 100, 100).toFixed(0)}% complete
                    </span>
                </div>
            )}

            <div className="nav-buttons">
                {!isNavigating ? (
                    <>
                        <button className="nav-start-btn" onClick={startNavigation}>
                            <FaCar /> Start Navigation
                        </button>
                        {route && (
                            <button className="nav-route-info-btn" onClick={() => {
                                alert(`Route Details:\nDistance: ${route.distance_km} km\nTime: ${route.eta_minutes} min\nTraffic: ${route.traffic_level}`);
                            }}>
                                <FaFolderOpen /> Route Info
                            </button>
                        )}
                    </>
                ) : (
                    <button className="nav-stop-btn" onClick={stopNavigation}>
                        Stop Navigation
                    </button>
                )}
            </div>

            {showSavedRoutes && (
                <div className="nav-saved-dropdown">
                    <h4>Saved Routes</h4>
                    {savedRoutes?.length > 0 ? (
                        <div className="saved-list">
                            {savedRoutes.slice(0, 5).map((routeItem, index) => (
                                <div key={index} className="saved-item" onClick={() => {
                                    if (onLoadSavedRoute) {
                                        onLoadSavedRoute(routeItem);
                                        setShowSavedRoutes(false);
                                    }
                                }}>
                                    <span className="saved-icon">📌</span>
                                    <span className="saved-name">
                                        {routeItem.route_name || `Route ${index + 1}`}
                                    </span>
                                    <span className="saved-dist">
                                        {formatDistance(parseFloat(routeItem.distance_km) || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="saved-empty">No saved routes</div>
                    )}
                </div>
            )}

            <div className="nav-gps-status">
                <span className="gps-icon">📡</span>
                <span className="gps-text">
                    {isTracking ? 'GPS Connected' : 'GPS Disconnected'}
                </span>
                <span className="gps-coords">
                    {currentLocation ? 
                        `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 
                        'No signal'
                    }
                </span>
            </div>
        </div>
    );
}

export default Navigation;
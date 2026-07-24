import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaLocationArrow, 
    FaFlag, 
    FaRoute, 
    FaCopy, 
    FaSave, 
    FaRedo, 
    FaMapPin, 
    FaCloudSun, 
    FaCar,
    FaTrafficLight,
    FaClock,
    FaRulerCombined,
    FaHistory,
    FaLightbulb,
    FaBuilding,
    FaCity,
    FaRoad,
    FaInfoCircle,
    FaGlobe,
    FaMapMarkerAlt
} from 'react-icons/fa';
import Map from './Map';
import SearchBar from './SearchBar';
import SavedRoutes from './SavedRoutes';
import Navigation from './Navigation';
import TrafficAnalysis from './TrafficAnalysis';
import TurnByTurnNavigation from './TurnByTurnNavigation';
import WeatherDashboard from './WeatherDashboard';
import { formatTime, formatDistance } from '../utils/timeUtils';
import axios from 'axios';
import locationIntelligence from '../services/locationIntelligence';
import navigationService from '../services/navigationService';
import { routesAPI, weatherAPI } from '../services/api';

function RoutePlanner({
    startPoint,
    endPoint,
    route,
    loading,
    weather,
    mode,
    error,
    onMapClick,
    onStartSelect,
    onEndSelect,
    onOptimize,
    onReset,
    onSave,
    user,
    savedRoutes,
    loadSavedRoute,
    loadSavedRoutes,
    getTrafficColor,
    getWeatherIcon,
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
    setRoute,
    setWeather,
    setLoading,
    setError
}) {
    const formatCoord = (value) => {
        if (value === null || value === undefined) return '--';
        const num = parseFloat(value);
        return isNaN(num) ? '--' : num.toFixed(4);
    };

    const [startSearchValue, setStartSearchValue] = useState('');
    const [endSearchValue, setEndSearchValue] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [speedHistory, setSpeedHistory] = useState([]);
    const [locationIntelligenceData, setLocationIntelligenceData] = useState(null);
    const [showLocationIntelligence, setShowLocationIntelligence] = useState(false);
    const [showNavigation, setShowNavigation] = useState(false);

    useEffect(() => {
        if (currentLocation?.speed) {
            setSpeedHistory(prev => {
                const newHistory = [...prev, currentLocation.speed * 3.6];
                if (newHistory.length > 50) {
                    return newHistory.slice(-50);
                }
                return newHistory;
            });
        }
    }, [currentLocation]);

    const handleLocationIntelligence = (info) => {
        setLocationIntelligenceData(info);
        setShowLocationIntelligence(true);
        setTimeout(() => setShowLocationIntelligence(false), 10000);
    };

    const getPlaceName = async (lat, lng) => {
        try {
            const geonamesInfo = await locationIntelligence.reverseGeocodeGeoNames(lat, lng);
            if (geonamesInfo && geonamesInfo.name) {
                return geonamesInfo.name;
            }

            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`
            );
            if (response.data && response.data.address) {
                const address = response.data.address;
                const areaParts = [];
                
                if (address.suburb) areaParts.push(address.suburb);
                else if (address.neighbourhood) areaParts.push(address.neighbourhood);
                
                if (address.city) areaParts.push(address.city);
                else if (address.town) areaParts.push(address.town);
                else if (address.village) areaParts.push(address.village);
                else if (address.municipality) areaParts.push(address.municipality);
                
                if (address.state) areaParts.push(address.state);
                else if (address.region) areaParts.push(address.region);
                else if (address.county) areaParts.push(address.county);
                
                if (address.country) areaParts.push(address.country);
                
                return areaParts.length > 0 ? areaParts.join(', ') : response.data.display_name;
            }
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    };

    const handleStartCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                const placeName = await getPlaceName(location.lat, location.lng);
                location.name = placeName;
                setStartSearchValue(placeName);
                onStartSelect(location);
                setIsGettingLocation(false);
            },
            (error) => {
                alert('Unable to get current location. Please enable GPS.');
                console.error('Location error:', error);
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleStartSelect = (location) => {
        setStartSearchValue(location.name || location.fullAddress || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
        onStartSelect(location);
    };

    const handleEndSelect = (location) => {
        setEndSearchValue(location.name || location.fullAddress || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
        onEndSelect(location);
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
            const startName = startPoint.name || startPoint.fullAddress || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`;
            const endName = endPoint.name || endPoint.fullAddress || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`;
            
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

    const startNavigation = async () => {
        if (!route || !startPoint || !endPoint) {
            alert('Please calculate a route first');
            return;
        }
        
        try {
            const routeData = await navigationService.getRealRoute(
                startPoint.lat, startPoint.lng,
                endPoint.lat, endPoint.lng
            );
            
            if (routeData && routeData.steps && routeData.steps.length > 0) {
                setShowNavigation(true);
                if (setRoute) {
                    setRoute({
                        ...route,
                        path: routeData.path,
                        distance_km: routeData.distance,
                        eta_minutes: routeData.duration,
                        steps: routeData.steps
                    });
                }
            } else {
                alert('Could not find a valid route. Please try different locations.');
            }
        } catch (error) {
            console.error('Navigation start error:', error);
            alert('Failed to start navigation. Please try again.');
        }
    };

    const closeNavigation = () => {
        setShowNavigation(false);
        if (setIsNavigating) setIsNavigating(false);
        if (setIsTracking) setIsTracking(false);
    };

    const renderLocationIntelligence = () => {
        if (!locationIntelligenceData) return null;

        const info = locationIntelligenceData;
        const items = [];

        if (info.geonames?.name) {
            items.push({ icon: <FaBuilding />, label: 'Place', value: info.geonames.name });
        }
        if (info.geonames?.city) {
            items.push({ icon: <FaCity />, label: 'City', value: info.geonames.city });
        }
        if (info.geonames?.region) {
            items.push({ icon: <FaMapPin />, label: 'Region', value: info.geonames.region });
        }
        if (info.geonames?.country) {
            items.push({ icon: <FaGlobe />, label: 'Country', value: info.geonames.country });
        }
        if (info.addresses && info.addresses.length > 0) {
            items.push({ icon: <FaRoad />, label: 'Address', value: info.addresses[0].fullAddress });
        }

        if (items.length === 0) return null;

        return (
            <div className="panel-section location-intelligence-panel">
                <h3><FaInfoCircle /> Location Intelligence</h3>
                <div className="location-intelligence-grid">
                    {items.map((item, index) => (
                        <div key={index} className="li-item">
                            <span className="li-icon">{item.icon}</span>
                            <div className="li-content">
                                <span className="li-label">{item.label}</span>
                                <span className="li-value">{item.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="li-sources">
                    <span className="source-badge">GeoNames</span>
                    <span className="source-badge">Who's On First</span>
                    <span className="source-badge">OpenAddresses</span>
                    <span className="source-badge">OpenStreetMap</span>
                </div>
            </div>
        );
    };

    return (
        <div className="route-planner-container">
            {showNavigation && route && (
                <div className="navigation-modal-overlay">
                    <div className="navigation-modal-content">
                        <TurnByTurnNavigation
                            startPoint={startPoint}
                            endPoint={endPoint}
                            route={route}
                            onClose={closeNavigation}
                            onStepChange={(step) => {
                                console.log('Step changed:', step);
                            }}
                            onLocationUpdate={(location) => {
                                console.log('Location updated:', location);
                                if (setCurrentLocation) setCurrentLocation(location);
                            }}
                            onNavigationComplete={() => {
                                alert('You have arrived at your destination!');
                                closeNavigation();
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="map-column">
                <div className="map-section">
                    <div className="map-control-bar">
                        <div className="mode-indicator">
                            <span className={`mode-badge ${mode === 'start' ? 'active' : ''}`}>
                                {mode === 'start' ? <><FaLocationArrow /> Set Start Point</> : mode === 'end' ? <><FaFlag /> Set Destination</> : <><FaRoute /> Ready</>}
                            </span>
                        </div>
                    </div>
                    <div className="map-wrapper">
                        <Map 
                            startPoint={startPoint}
                            endPoint={endPoint}
                            onMapClick={onMapClick}
                            route={route}
                            currentLocation={currentLocation}
                            isTracking={isTracking}
                            isNavigating={isNavigating}
                            onLocationUpdate={(location) => {
                                console.log('Location updated:', location);
                                if (setCurrentLocation) setCurrentLocation(location);
                            }}
                            onLocationError={(error) => {
                                console.error('Location error:', error);
                            }}
                            onLocationIntelligence={handleLocationIntelligence}
                        />
                    </div>
                </div>
                
                {route && (
                    <div className="navigation-section-wrapper">
                        <Navigation 
                            startPoint={startPoint}
                            endPoint={endPoint}
                            route={route}
                            savedRoutes={savedRoutes}
                            onLoadSavedRoute={loadSavedRoute}
                            onStopNavigation={() => {
                                if (setIsNavigating) setIsNavigating(false);
                                if (setIsTracking) setIsTracking(false);
                            }}
                            onStartNavigation={() => {
                                if (route && startPoint && endPoint) {
                                    setShowNavigation(true);
                                } else {
                                    alert('Please calculate a route first');
                                }
                            }}
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
                    </div>
                )}
            </div>
            
            <div className="info-panel">
                <div className="panel-section location-search-section">
                    <h3><FaMapPin /> Where to?</h3>
                    
                    <div className="search-group">
                        <label><FaLocationArrow /> Pickup Location</label>
                        <div className="search-with-current">
                            <SearchBar 
                                placeholder="Search for start point..."
                                onSelect={handleStartSelect}
                                icon={<FaSearch />}
                                value={startSearchValue}
                                setValue={setStartSearchValue}
                                userLocation={currentLocation}
                            />
                            <button 
                                className="current-location-btn"
                                onClick={handleStartCurrentLocation}
                                disabled={isGettingLocation}
                                title="Use current location"
                            >
                                <FaLocationArrow /> {isGettingLocation ? 'Getting...' : 'Current'}
                            </button>
                        </div>
                        {startPoint && (
                            <div className="selected-location">
                                <span className="selected-location-label">
                                    <FaMapMarkerAlt className="selected-icon" /> Selected:
                                </span>
                                <span className="selected-location-name">
                                    {startPoint.name || startPoint.fullAddress || `${formatCoord(startPoint.lat)}, ${formatCoord(startPoint.lng)}`}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="search-group">
                        <label><FaFlag /> Destination</label>
                        <SearchBar 
                            placeholder="Search for destination..."
                            onSelect={handleEndSelect}
                            icon={<FaSearch />}
                            value={endSearchValue}
                            setValue={setEndSearchValue}
                            userLocation={currentLocation}
                        />
                        {endPoint && (
                            <div className="selected-location">
                                <span className="selected-location-label">
                                    <FaMapMarkerAlt className="selected-icon" /> Selected:
                                </span>
                                <span className="selected-location-name">
                                    {endPoint.name || endPoint.fullAddress || `${formatCoord(endPoint.lat)}, ${formatCoord(endPoint.lng)}`}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="search-hint">
                        <span><FaMapPin /> Click on map to select location directly</span>
                    </div>
                </div>

                {showLocationIntelligence && renderLocationIntelligence()}
                
                <div className="panel-section action-section">
                    <button className="btn-primary" onClick={onOptimize} disabled={loading || !startPoint || !endPoint}>
                        {loading ? 'Calculating...' : <><FaRoute /> Find Best Route</>}
                    </button>
                    <button className="btn-secondary" onClick={onReset}>
                        <FaRedo /> Reset All
                    </button>
                    <button 
                        className="btn-save" 
                        onClick={saveCurrentRoute} 
                        disabled={!route || !user}
                        style={{
                            background: 'var(--primary)',
                            color: 'var(--on-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-pill)',
                            padding: 'var(--md)',
                            cursor: (!route || !user) ? 'not-allowed' : 'pointer',
                            opacity: (!route || !user) ? 0.5 : 1,
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            flex: 1,
                            fontFamily: 'UberMoveText, system-ui, sans-serif',
                            fontSize: '16px',
                            minHeight: '44px'
                        }}
                    >
                        <FaSave /> Save Route
                    </button>
                    <button 
                        className="btn-navigation" 
                        onClick={startNavigation} 
                        disabled={!route || isNavigating}
                        style={{
                            background: 'var(--primary)',
                            color: 'var(--on-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-pill)',
                            padding: 'var(--md)',
                            cursor: (!route || isNavigating) ? 'not-allowed' : 'pointer',
                            opacity: (!route || isNavigating) ? 0.5 : 1,
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            flex: 1,
                            fontFamily: 'UberMoveText, system-ui, sans-serif',
                            fontSize: '16px',
                            minHeight: '44px'
                        }}
                    >
                        <FaRoute /> Start Navigation
                    </button>
                </div>
                
                {error && (
                    <div className="panel-section error-section">
                        <div className="error-message">{error}</div>
                    </div>
                )}
                
                {route && (
                    <div className="panel-section route-section">
                        <h3><FaCar /> Route Information</h3>
                        
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label"><FaRulerCombined /> Distance</span>
                                <span className="info-value">{formatDistance(route.distance_km)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label"><FaClock /> Est. Time</span>
                                <span className="info-value">{formatTime(route.eta_minutes)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label"><FaTrafficLight /> Traffic</span>
                                <span className="info-value" style={{ color: getTrafficColor(route.traffic_level) }}>
                                    {route.traffic_level?.toUpperCase() || 'UNKNOWN'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label"><FaCloudSun /> Weather</span>
                                <span className="info-value">
                                    {getWeatherIcon(route.weather_condition || weather?.condition)} 
                                    {route.temperature || weather?.temperature || '--'}°C
                                </span>
                            </div>
                        </div>
                        
                        <div className="weather-impact">
                            <span className="impact-label">Weather Impact:</span>
                            <span className="impact-value">{route.weather_impact || 'none'}</span>
                        </div>
                        
                        <div className="route-actions-extra">
                            <button className="share-btn" onClick={() => {
                                const text = `TrafficRoute Trip:\nDistance: ${route.distance_km} km\nTime: ${route.eta_minutes} min\nTraffic: ${route.traffic_level}`;
                                navigator.clipboard.writeText(text);
                                alert('Route details copied to clipboard!');
                            }}>
                                <FaCopy /> Copy Details
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="panel-section traffic-analysis-section">
                    <TrafficAnalysis 
                        currentLocation={currentLocation}
                        speeds={speedHistory}
                    />
                </div>
                
                <div className="panel-section report-section">
                    <h3><FaTrafficLight /> Report Traffic Incident</h3>
                    <div className="report-form">
                        <select className="report-select">
                            <option value="accident">Accident</option>
                            <option value="flood">Flood</option>
                            <option value="road_work">Road Work</option>
                            <option value="congestion">Congestion</option>
                        </select>
                        <input 
                            type="text" 
                            placeholder="Describe the incident..."
                            className="report-input"
                        />
                        <button className="report-btn">Submit Report</button>
                    </div>
                </div>
                
                <div className="panel-section weather-section">
                    <WeatherDashboard currentLocation={currentLocation} />
                </div>
                
                <div className="panel-section saved-routes-section">
                    <SavedRoutes 
                        user={user}
                        onLoadRoute={loadSavedRoute}
                        onRouteDeleted={() => loadSavedRoutes(user.id)}
                    />
                </div>
                
                <div className="panel-section history-section">
                    <h3><FaHistory /> Recent Trips</h3>
                    {savedRoutes?.length > 0 ? (
                        savedRoutes.slice(0, 5).map((routeItem, index) => {
                            const startLat = parseFloat(routeItem.start_lat) || 0;
                            const startLng = parseFloat(routeItem.start_lng) || 0;
                            const endLat = parseFloat(routeItem.end_lat) || 0;
                            const endLng = parseFloat(routeItem.end_lng) || 0;
                            const distance = parseFloat(routeItem.distance_km) || 0;
                            const eta = parseInt(routeItem.eta_minutes) || 0;
                            
                            return (
                                <div key={index} className="history-item">
                                    <div className="history-route">
                                        From: {startLat.toFixed(4)}, {startLng.toFixed(4)}
                                    </div>
                                    <div className="history-route">
                                        To: {endLat.toFixed(4)}, {endLng.toFixed(4)}
                                    </div>
                                    <div className="history-meta">
                                        {formatDistance(distance)} • {formatTime(eta)}
                                        <span className="history-date">
                                            {routeItem.created_at ? new Date(routeItem.created_at).toLocaleDateString() : 'Unknown date'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="history-empty">No trips yet. Save a route to see it here.</div>
                    )}
                </div>
                
                <div className="panel-section tips-section">
                    <h3><FaLightbulb /> Navigation Tips for Tanzania</h3>
                    <ul className="tips-list">
                        <li>Best travel times: 10 AM - 3 PM</li>
                        <li>Avoid: 7-9 AM and 4-7 PM peak hours</li>
                        <li>During rain, avoid low-lying areas</li>
                        <li>Sunday mornings have light traffic</li>
                        <li>Use GeoNames for accurate place names</li>
                        <li>Traffic analysis based on GPS speed data</li>
                        <li>Check weather dashboard for road conditions</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default RoutePlanner;
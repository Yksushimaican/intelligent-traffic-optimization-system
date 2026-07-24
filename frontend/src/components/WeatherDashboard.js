import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaCloudSun, 
    FaCloudRain, 
    FaCloud, 
    FaSun, 
    FaWind, 
    FaTint, 
    FaEye, 
    FaCloudShowersHeavy,
    FaSnowflake,
    FaBolt,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaClock,
    FaCalendarAlt,
    FaUmbrella,
    FaCheckCircle,
    FaInfoCircle,
    FaTemperatureHigh,
    FaThermometerHalf,
    FaArrowLeft,
    FaSearch,
    FaCrosshairs
} from 'react-icons/fa';
import WeatherLocationSearch from './WeatherLocationSearch';

function WeatherDashboard({ currentLocation, onBack }) {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('current');
    const [alerts, setAlerts] = useState([]);
    const [locationName, setLocationName] = useState('Loading...');
    const [searchLocation, setSearchLocation] = useState(null);
    const [isUsingGPS, setIsUsingGPS] = useState(true);

    const getLocationName = async (lat, lng) => {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`
            );
            if (response.data && response.data.address) {
                const addr = response.data.address;
                return addr.city || addr.town || addr.village || addr.municipality || 'Unknown Location';
            }
            return 'Unknown Location';
        } catch (error) {
            console.error('Location name error:', error);
            return 'Unknown Location';
        }
    };

    const fetchWeather = async (lat, lng) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weathercode,wind_speed_10m,visibility&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
            );

            if (response.data) {
                const data = response.data;
                const name = await getLocationName(lat, lng);
                setLocationName(name);

                const current = data.current_weather;
                const currentWeather = {
                    temperature: current.temperature,
                    weathercode: current.weathercode,
                    windspeed: current.windspeed,
                    time: current.time,
                    location: name
                };

                const weatherCondition = getWeatherCondition(current.weathercode);
                currentWeather.condition = weatherCondition;

                const now = new Date();
                const hourIndex = now.getHours();
                const humidity = data.hourly?.relative_humidity_2m?.[hourIndex] || 65;
                currentWeather.humidity = humidity;

                const precipProb = data.hourly?.precipitation_probability?.[hourIndex] || 0;
                currentWeather.precipitation = precipProb;

                const visibility = data.hourly?.visibility?.[hourIndex] || 10000;
                currentWeather.visibility = (visibility / 1000).toFixed(1);

                const hourly = data.hourly;
                const hourlyForecast = [];
                for (let i = 0; i < 24 && i < hourly.time.length; i++) {
                    hourlyForecast.push({
                        time: new Date(hourly.time[i]),
                        temperature: hourly.temperature_2m?.[i],
                        humidity: hourly.relative_humidity_2m?.[i],
                        precipitation: hourly.precipitation_probability?.[i] || 0,
                        weathercode: hourly.weathercode?.[i] || 0,
                        windspeed: hourly.wind_speed_10m?.[i] || 0,
                        visibility: hourly.visibility?.[i] || 10000
                    });
                }

                const daily = data.daily;
                const dailyForecast = [];
                for (let i = 0; i < 7 && i < daily.time.length; i++) {
                    dailyForecast.push({
                        date: new Date(daily.time[i]),
                        maxTemp: daily.temperature_2m_max?.[i],
                        minTemp: daily.temperature_2m_min?.[i],
                        precipitation: daily.precipitation_probability_max?.[i] || 0,
                        weathercode: daily.weathercode?.[i] || 0
                    });
                }

                setWeatherData({
                    current: currentWeather,
                    hourly: hourlyForecast,
                    daily: dailyForecast
                });

                const generatedAlerts = generateAlerts(currentWeather, dailyForecast);
                setAlerts(generatedAlerts);

                setLoading(false);
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            setError('Failed to fetch weather data');
            setLoading(false);
        }
    };

    const getWeatherCondition = (code) => {
        const weatherCodes = {
            0: { condition: 'Clear', icon: <FaSun />, color: '#FF9800' },
            1: { condition: 'Clear', icon: <FaSun />, color: '#FF9800' },
            2: { condition: 'Partly Cloudy', icon: <FaCloud />, color: '#78909C' },
            3: { condition: 'Cloudy', icon: <FaCloud />, color: '#78909C' },
            45: { condition: 'Foggy', icon: <FaCloud />, color: '#90A4AE' },
            48: { condition: 'Foggy', icon: <FaCloud />, color: '#90A4AE' },
            51: { condition: 'Drizzle', icon: <FaCloudRain />, color: '#4FC3F7' },
            53: { condition: 'Drizzle', icon: <FaCloudRain />, color: '#4FC3F7' },
            55: { condition: 'Rain', icon: <FaCloudShowersHeavy />, color: '#0288D1' },
            61: { condition: 'Rain', icon: <FaCloudRain />, color: '#4FC3F7' },
            63: { condition: 'Rain', icon: <FaCloudShowersHeavy />, color: '#0288D1' },
            65: { condition: 'Heavy Rain', icon: <FaCloudShowersHeavy />, color: '#01579B' },
            71: { condition: 'Snow', icon: <FaSnowflake />, color: '#B3E5FC' },
            73: { condition: 'Snow', icon: <FaSnowflake />, color: '#81D4FA' },
            75: { condition: 'Heavy Snow', icon: <FaSnowflake />, color: '#4FC3F7' },
            80: { condition: 'Rain Showers', icon: <FaCloudShowersHeavy />, color: '#0288D1' },
            81: { condition: 'Rain Showers', icon: <FaCloudShowersHeavy />, color: '#01579B' },
            82: { condition: 'Heavy Showers', icon: <FaCloudShowersHeavy />, color: '#01579B' },
            95: { condition: 'Thunderstorm', icon: <FaBolt />, color: '#F44336' },
            96: { condition: 'Thunderstorm', icon: <FaBolt />, color: '#D32F2F' },
            99: { condition: 'Thunderstorm', icon: <FaBolt />, color: '#C62828' }
        };
        return weatherCodes[code] || { condition: 'Unknown', icon: <FaCloud />, color: '#78909C' };
    };

    const generateAlerts = (current, daily) => {
        const alerts = [];

        if (current.precipitation > 70) {
            alerts.push({
                type: 'rain',
                severity: 'high',
                message: 'Heavy Rain Alert',
                description: 'Expected heavy rainfall. Possible flooding in low areas.',
                icon: <FaExclamationTriangle />
            });
        }

        if (current.precipitation > 80 && current.weathercode >= 61) {
            alerts.push({
                type: 'flood',
                severity: 'critical',
                message: 'Flood Risk Alert',
                description: 'High risk of flooding in low-lying areas.',
                icon: <FaExclamationTriangle />
            });
        }

        if (current.weathercode >= 95) {
            alerts.push({
                type: 'storm',
                severity: 'high',
                message: 'Thunderstorm Warning',
                description: 'Severe thunderstorms expected. Seek shelter.',
                icon: <FaExclamationTriangle />
            });
        }

        if (current.temperature > 35) {
            alerts.push({
                type: 'heat',
                severity: 'moderate',
                message: 'Heat Warning',
                description: 'Extreme heat expected. Stay hydrated.',
                icon: <FaExclamationTriangle />
            });
        }

        if (current.windspeed > 40) {
            alerts.push({
                type: 'wind',
                severity: 'moderate',
                message: 'High Wind Alert',
                description: 'Strong winds expected. Secure outdoor objects.',
                icon: <FaExclamationTriangle />
            });
        }

        if (daily && daily.length > 0) {
            daily.slice(0, 3).forEach(day => {
                if (day.precipitation > 70) {
                    const dateStr = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    alerts.push({
                        type: 'forecast',
                        severity: 'moderate',
                        message: `${dateStr}: Heavy Rain Expected`,
                        description: `Heavy rain expected on ${dateStr}. Plan accordingly.`,
                        icon: <FaCloudRain />
                    });
                }
            });
        }

        return alerts;
    };

    const getWeatherDisplay = (weathercode) => {
        return getWeatherCondition(weathercode);
    };

    const formatHour = (date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    };

    const formatDay = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleLocationSelect = (location) => {
        if (location) {
            setSearchLocation(location);
            setIsUsingGPS(false);
            fetchWeather(location.lat, location.lng);
        } else {
            // Reset to GPS
            setIsUsingGPS(true);
            setSearchLocation(null);
            if (currentLocation) {
                fetchWeather(currentLocation.lat, currentLocation.lng);
            }
        }
    };

    const handleUseGPS = () => {
        if (currentLocation) {
            setIsUsingGPS(true);
            setSearchLocation(null);
            setLocationName('Loading...');
            fetchWeather(currentLocation.lat, currentLocation.lng);
        } else {
            alert('GPS location not available. Please enable location services.');
        }
    };

    useEffect(() => {
        if (currentLocation && isUsingGPS) {
            fetchWeather(currentLocation.lat, currentLocation.lng);
        }
    }, [currentLocation]);

    // Initial load with GPS
    useEffect(() => {
        if (currentLocation && isUsingGPS) {
            fetchWeather(currentLocation.lat, currentLocation.lng);
        } else if (!currentLocation) {
            // Fallback to Arusha
            fetchWeather(-3.3869, 36.6820);
        }
    }, []);

    if (loading) {
        return (
            <div className="weather-dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading weather data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="weather-dashboard-error">
                <FaExclamationTriangle />
                <p>{error}</p>
                <button onClick={() => fetchWeather(searchLocation?.lat || currentLocation?.lat || -3.3869, searchLocation?.lng || currentLocation?.lng || 36.6820)}>
                    Retry
                </button>
            </div>
        );
    }

    if (!weatherData) {
        return (
            <div className="weather-dashboard-error">
                <p>No weather data available</p>
            </div>
        );
    }

    const { current, hourly, daily } = weatherData;
    const weatherDisplay = getWeatherDisplay(current.weathercode);

    return (
        <div className="weather-dashboard">
            {/* Back Button */}
            <button className="weather-back-btn" onClick={onBack}>
                <FaArrowLeft /> Back
            </button>

            {/* Location Search */}
            <div className="weather-search-section">
                <WeatherLocationSearch 
                    onLocationSelect={handleLocationSelect}
                    currentLocation={currentLocation}
                />
                <button 
                    className="weather-gps-btn" 
                    onClick={handleUseGPS}
                    title="Use current location"
                >
                    <FaCrosshairs /> GPS
                </button>
            </div>

            {/* Location Info */}
            <div className="weather-location-info">
                <div className="weather-location">
                    <FaMapMarkerAlt className="location-icon" />
                    <h2>{locationName}</h2>
                    {!isUsingGPS && searchLocation && (
                        <span className="weather-search-badge">🔍 Searched</span>
                    )}
                    {isUsingGPS && (
                        <span className="weather-gps-badge">📍 GPS</span>
                    )}
                    <span className="weather-time">
                        <FaClock /> {new Date().toLocaleString('en-US', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="weather-alerts">
                    {alerts.slice(0, 3).map((alert, index) => (
                        <div key={index} className={`alert-item ${alert.severity}`}>
                            <span className="alert-icon">{alert.icon}</span>
                            <div className="alert-content">
                                <div className="alert-title">{alert.message}</div>
                                <div className="alert-description">{alert.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Current Weather */}
            <div className="weather-current">
                <div className="weather-main">
                    <div className="weather-icon-large" style={{ color: weatherDisplay.color }}>
                        {weatherDisplay.icon}
                    </div>
                    <div className="weather-temp">
                        <span className="temp-value">{Math.round(current.temperature)}°C</span>
                        <span className="temp-condition">{weatherDisplay.condition}</span>
                    </div>
                </div>

                <div className="weather-details-grid">
                    <div className="weather-detail">
                        <FaTint className="detail-icon" />
                        <span className="detail-label">Humidity</span>
                        <span className="detail-value">{current.humidity}%</span>
                    </div>
                    <div className="weather-detail">
                        <FaWind className="detail-icon" />
                        <span className="detail-label">Wind</span>
                        <span className="detail-value">{current.windspeed} km/h</span>
                    </div>
                    <div className="weather-detail">
                        <FaCloudRain className="detail-icon" />
                        <span className="detail-label">Precipitation</span>
                        <span className="detail-value">{current.precipitation}%</span>
                    </div>
                    <div className="weather-detail">
                        <FaEye className="detail-icon" />
                        <span className="detail-label">Visibility</span>
                        <span className="detail-value">{current.visibility} km</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="weather-tabs">
                <button 
                    className={`tab-btn ${selectedTab === 'current' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('current')}
                >
                    Current
                </button>
                <button 
                    className={`tab-btn ${selectedTab === 'hourly' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('hourly')}
                >
                    Hourly
                </button>
                <button 
                    className={`tab-btn ${selectedTab === 'daily' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('daily')}
                >
                    7-Day
                </button>
            </div>

            {/* Hourly Forecast */}
            {selectedTab === 'hourly' && (
                <div className="weather-hourly">
                    <h4>Hourly Forecast</h4>
                    <div className="hourly-scroll">
                        {hourly.slice(0, 24).map((hour, index) => {
                            const display = getWeatherDisplay(hour.weathercode);
                            return (
                                <div key={index} className="hourly-item">
                                    <span className="hourly-time">{formatHour(hour.time)}</span>
                                    <span className="hourly-icon" style={{ color: display.color }}>
                                        {display.icon}
                                    </span>
                                    <span className="hourly-temp">{Math.round(hour.temperature)}°</span>
                                    <span className="hourly-precip">{hour.precipitation}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Daily Forecast */}
            {selectedTab === 'daily' && (
                <div className="weather-daily">
                    <h4>7-Day Forecast</h4>
                    {daily.map((day, index) => {
                        const display = getWeatherDisplay(day.weathercode);
                        return (
                            <div key={index} className="daily-item">
                                <span className="daily-day">{formatDay(day.date)}</span>
                                <span className="daily-icon" style={{ color: display.color }}>
                                    {display.icon}
                                </span>
                                <span className="daily-temp">
                                    <span className="daily-high">{Math.round(day.maxTemp)}°</span>
                                    <span className="daily-low">{Math.round(day.minTemp)}°</span>
                                </span>
                                <span className="daily-precip">{day.precipitation}%</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tips */}
            <div className="weather-tips">
                <h4><FaInfoCircle /> Weather Tips</h4>
                <ul>
                    {current.precipitation > 50 && (
                        <li><FaUmbrella /> Carry an umbrella - rain expected</li>
                    )}
                    {current.temperature > 30 && (
                        <li><FaTemperatureHigh /> Stay hydrated - high temperature</li>
                    )}
                    {current.windspeed > 30 && (
                        <li><FaWind /> Secure loose objects - strong winds</li>
                    )}
                    {current.visibility < 2 && (
                        <li><FaEye /> Drive carefully - low visibility</li>
                    )}
                    {current.precipitation > 70 && (
                        <li><FaExclamationTriangle /> Avoid low-lying areas - flood risk</li>
                    )}
                    {alerts.length === 0 && (
                        <li><FaCheckCircle /> Good weather conditions for travel</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

export default WeatherDashboard;
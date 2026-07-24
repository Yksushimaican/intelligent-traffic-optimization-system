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
    FaThermometerHalf,
    FaUmbrella
} from 'react-icons/fa';

function WeatherSummary({ currentLocation }) {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locationName, setLocationName] = useState('Loading...');

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
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weathercode,wind_speed_10m,visibility&timezone=auto`
            );

            if (response.data) {
                const data = response.data;
                const name = await getLocationName(lat, lng);
                setLocationName(name);

                const current = data.current_weather;
                const now = new Date();
                const hourIndex = now.getHours();
                const humidity = data.hourly?.relative_humidity_2m?.[hourIndex] || 65;
                const precipProb = data.hourly?.precipitation_probability?.[hourIndex] || 0;
                const visibility = data.hourly?.visibility?.[hourIndex] || 10000;

                const weatherDisplay = getWeatherCondition(current.weathercode);

                setWeatherData({
                    temperature: Math.round(current.temperature),
                    condition: weatherDisplay.condition,
                    icon: weatherDisplay.icon,
                    color: weatherDisplay.color,
                    humidity: humidity,
                    windspeed: Math.round(current.windspeed),
                    precipitation: precipProb,
                    visibility: (visibility / 1000).toFixed(1),
                    location: name
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Weather fetch error:', error);
            setError('Failed to fetch weather');
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

    useEffect(() => {
        if (currentLocation) {
            fetchWeather(currentLocation.lat, currentLocation.lng);
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        fetchWeather(position.coords.latitude, position.coords.longitude);
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        fetchWeather(-3.3869, 36.6820);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                fetchWeather(-3.3869, 36.6820);
            }
        }
    }, [currentLocation]);

    if (loading) {
        return (
            <div className="weather-summary-loading">
                <div className="loading-spinner-small"></div>
                <span>Loading weather...</span>
            </div>
        );
    }

    if (error || !weatherData) {
        return (
            <div className="weather-summary-error">
                <FaExclamationTriangle />
                <span>Weather unavailable</span>
            </div>
        );
    }

    return (
        <div className="weather-summary">
            <div className="weather-summary-main">
                <div className="weather-summary-icon" style={{ color: weatherData.color }}>
                    {weatherData.icon}
                </div>
                <div className="weather-summary-info">
                    <div className="weather-summary-temp">{weatherData.temperature}°C</div>
                    <div className="weather-summary-condition">{weatherData.condition}</div>
                </div>
            </div>
            <div className="weather-summary-details">
                <div className="weather-summary-item">
                    <FaTint className="ws-icon" />
                    <span>{weatherData.humidity}%</span>
                </div>
                <div className="weather-summary-item">
                    <FaWind className="ws-icon" />
                    <span>{weatherData.windspeed} km/h</span>
                </div>
                <div className="weather-summary-item">
                    <FaUmbrella className="ws-icon" />
                    <span>{weatherData.precipitation}%</span>
                </div>
                <div className="weather-summary-item">
                    <FaMapMarkerAlt className="ws-icon" />
                    <span>{weatherData.location}</span>
                </div>
            </div>
        </div>
    );
}

export default WeatherSummary;
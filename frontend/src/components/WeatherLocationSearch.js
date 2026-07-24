import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FaSearch, 
    FaMapMarkerAlt, 
    FaBuilding, 
    FaHome, 
    FaCity,
    FaSpinner,
    FaTimes
} from 'react-icons/fa';

function WeatherLocationSearch({ onLocationSelect, currentLocation }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update selected location when currentLocation changes from GPS
    useEffect(() => {
        if (currentLocation && !selectedLocation) {
            // Show GPS location name in search bar
            getLocationName(currentLocation.lat, currentLocation.lng);
        }
    }, [currentLocation]);

    const getLocationName = async (lat, lng) => {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`
            );
            if (response.data && response.data.address) {
                const addr = response.data.address;
                const name = addr.city || addr.town || addr.village || addr.municipality || 'Unknown Location';
                setQuery(name);
                setSelectedLocation({ lat, lng, name });
            }
        } catch (error) {
            console.error('Location name error:', error);
        }
    };

    const searchLocations = async (searchQuery) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=8&dedupe=1`
            );
            
            // Filter and prioritize results
            let results = response.data;
            
            // Prioritize places with cities, towns, or streets
            results = results.sort((a, b) => {
                const aScore = getResultScore(a);
                const bScore = getResultScore(b);
                return bScore - aScore;
            });
            
            setSuggestions(results.slice(0, 8));
        } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const getResultScore = (place) => {
        let score = 0;
        const type = place.type || place.class;
        
        // Prioritize cities, towns, and streets
        if (type === 'city' || type === 'town') score += 30;
        else if (type === 'village' || type === 'suburb') score += 20;
        else if (type === 'road' || type === 'street') score += 15;
        else if (type === 'country') score += 25;
        else if (type === 'state' || type === 'region') score += 20;
        
        // Importance from Nominatim
        if (place.importance) {
            score += place.importance * 10;
        }
        
        return score;
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        setShowSuggestions(true);
        
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            if (value.length >= 2) {
                searchLocations(value);
            } else {
                setSuggestions([]);
            }
        }, 400);
    };

    const handleSelect = (place) => {
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        const name = getDisplayName(place);
        
        setQuery(name);
        setSelectedLocation({ lat, lng, name });
        setShowSuggestions(false);
        setSuggestions([]);
        
        if (onLocationSelect) {
            onLocationSelect({ lat, lng, name, place });
        }
    };

    const getDisplayName = (place) => {
        if (place.address) {
            const parts = [];
            if (place.address.road) parts.push(place.address.road);
            if (place.address.suburb) parts.push(place.address.suburb);
            if (place.address.city || place.address.town) parts.push(place.address.city || place.address.town);
            if (place.address.state) parts.push(place.address.state);
            if (place.address.country) parts.push(place.address.country);
            if (parts.length > 0) return parts.join(', ');
        }
        return place.display_name.split(',')[0] || place.display_name;
    };

    const getPlaceType = (place) => {
        const type = place.type || place.class;
        const typeMap = {
            'city': 'City',
            'town': 'Town',
            'village': 'Village',
            'suburb': 'Suburb',
            'neighbourhood': 'Neighborhood',
            'road': 'Street',
            'street': 'Street',
            'country': 'Country',
            'state': 'State',
            'region': 'Region'
        };
        return typeMap[type] || 'Location';
    };

    const getPlaceIcon = (place) => {
        const type = place.type || place.class;
        const iconMap = {
            'city': <FaCity />,
            'town': <FaBuilding />,
            'village': <FaHome />,
            'suburb': <FaHome />,
            'neighbourhood': <FaHome />,
            'road': <FaMapMarkerAlt />,
            'street': <FaMapMarkerAlt />,
            'country': <FaMapMarkerAlt />
        };
        return iconMap[type] || <FaMapMarkerAlt />;
    };

    const clearSearch = () => {
        setQuery('');
        setSelectedLocation(null);
        setSuggestions([]);
        setShowSuggestions(false);
        if (onLocationSelect) {
            onLocationSelect(null);
        }
    };

    return (
        <div className="weather-location-search" ref={wrapperRef}>
            <div className="weather-search-container">
                <span className="weather-search-icon">
                    <FaMapMarkerAlt />
                </span>
                <input
                    type="text"
                    className="weather-search-input"
                    placeholder="Search for a city, town, street, or country..."
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (query.length >= 2) {
                            setShowSuggestions(true);
                            searchLocations(query);
                        }
                    }}
                />
                {loading && <FaSpinner className="weather-search-loading" />}
                {query && (
                    <button className="weather-search-clear" onClick={clearSearch}>
                        <FaTimes />
                    </button>
                )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
                <div className="weather-search-suggestions">
                    {suggestions.map((place, index) => {
                        const placeType = getPlaceType(place);
                        const displayName = getDisplayName(place);
                        
                        return (
                            <div 
                                key={index} 
                                className="weather-suggestion-item"
                                onClick={() => handleSelect(place)}
                            >
                                <span className="weather-suggestion-icon">
                                    {getPlaceIcon(place)}
                                </span>
                                <div className="weather-suggestion-details">
                                    <div className="weather-suggestion-name">{displayName}</div>
                                    <div className="weather-suggestion-address">
                                        <span className="weather-suggestion-type">{placeType}</span>
                                        {place.address?.country && (
                                            <span> • {place.address.country}</span>
                                        )}
                                        {place.importance && place.importance > 0.5 && (
                                            <span className="weather-suggestion-popular"> ★ Popular</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {showSuggestions && query.length >= 2 && suggestions.length === 0 && !loading && (
                <div className="weather-search-suggestions">
                    <div className="weather-suggestion-no-results">
                        <FaMapMarkerAlt style={{ marginRight: '8px' }} />
                        No locations found. Try a different search.
                    </div>
                </div>
            )}
        </div>
    );
}

export default WeatherLocationSearch;
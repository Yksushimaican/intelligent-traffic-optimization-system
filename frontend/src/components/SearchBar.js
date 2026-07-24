import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaSpinner, FaMapMarkerAlt, FaBuilding, FaRoad, FaStore, FaHome, FaStreetView, FaStar, FaClock, FaFire } from 'react-icons/fa';
import searchEngine from '../services/searchEngine';

function SearchBar({ placeholder, onSelect, icon, value: externalValue, setValue: externalSetValue, userLocation }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    const searchValue = externalValue !== undefined ? externalValue : query;
    const setSearchValue = externalSetValue || setQuery;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (searchQuery) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            // Use the enhanced search engine with Uber/Bolt algorithm
            const results = await searchEngine.getSuggestions(searchQuery, userLocation);
            
            const formattedResults = results.map(place => ({
                ...place,
                displayText: place.displayText || place.fullAddress || place.displayName,
                type: place.type || 'Location',
                isPopular: place.isPopular || place.score > 30,
                isEvent: place.isEvent || false,
                rank: place.rank || 0,
                distance: place.distance,
                score: place.score,
                fullAddress: place.fullAddress || place.displayName
            }));
            
            setSuggestions(formattedResults);
        } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        setShowSuggestions(true);
        
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            if (value.length >= 2) {
                performSearch(value);
            } else {
                setSuggestions([]);
            }
        }, 300);
    };

    const handleSelect = (place) => {
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lng);
        
        // Add to search history
        searchEngine.addToHistory({
            name: place.displayText || place.fullAddress || place.displayName,
            lat: lat,
            lng: lng
        });
        
        setSearchValue(place.displayText || place.fullAddress || place.displayName);
        setShowSuggestions(false);
        onSelect({ 
            lat, 
            lng, 
            name: place.displayText || place.fullAddress || place.displayName,
            fullAddress: place.fullAddress || place.displayName,
            place: place
        });
    };

    const getPlaceIcon = (place) => {
        if (place.isEvent) return <FaFire />;
        if (place.isPopular) return <FaStar />;
        
        const type = place.type || 'Location';
        const iconMap = {
            'city': <FaBuilding />,
            'town': <FaBuilding />,
            'village': <FaHome />,
            'suburb': <FaHome />,
            'neighbourhood': <FaHome />,
            'road': <FaStreetView />,
            'street': <FaStreetView />,
            'highway': <FaStreetView />,
            'shop': <FaStore />,
            'amenity': <FaMapMarkerAlt />
        };
        return iconMap[type] || <FaMapMarkerAlt />;
    };

    const getBadge = (place) => {
        if (place.isEvent) {
            return <span className="suggestion-badge event"><FaFire /> Trending</span>;
        }
        if (place.isPopular && place.rank <= 3) {
            return <span className="suggestion-badge popular"><FaStar /> Top</span>;
        }
        return null;
    };

    return (
        <div className="search-bar-wrapper" ref={wrapperRef}>
            <div className="search-bar-container">
                <span className="search-icon">{icon || <FaSearch />}</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder={placeholder || 'Search for a location...'}
                    value={searchValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (searchValue.length >= 2) {
                            setShowSuggestions(true);
                            performSearch(searchValue);
                        }
                    }}
                />
                {loading && <FaSpinner className="search-loading" />}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                    {suggestions.map((place, index) => (
                        <div 
                            key={index} 
                            className={`suggestion-item ${place.isEvent ? 'event-item' : ''} ${place.rank <= 3 ? 'top-item' : ''}`}
                            onClick={() => handleSelect(place)}
                        >
                            <span className="suggestion-icon">{getPlaceIcon(place)}</span>
                            <div className="suggestion-details">
                                <div className="suggestion-name">
                                    {place.displayText}
                                    {getBadge(place)}
                                    {place.rank <= 3 && !place.isEvent && (
                                        <span className="suggestion-rank">#{place.rank}</span>
                                    )}
                                </div>
                                <div className="suggestion-address">
                                    <span className="suggestion-type">{place.type}</span>
                                    {place.distance !== null && place.distance !== undefined && (
                                        <span className="suggestion-distance">
                                            • {place.distance < 1 ? `${(place.distance * 1000).toFixed(0)}m` : `${place.distance.toFixed(1)}km`}
                                        </span>
                                    )}
                                    {place.score > 20 && (
                                        <span className="suggestion-score-badge">✓ High match</span>
                                    )}
                                </div>
                            </div>
                            {place.score > 30 && (
                                <span className="suggestion-score">{place.score}%</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {showSuggestions && searchValue.length >= 2 && suggestions.length === 0 && !loading && (
                <div className="search-suggestions">
                    <div className="suggestion-no-results">
                        <FaMapMarkerAlt style={{ marginRight: '8px' }} />
                        No places found. Try a different search.
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchBar;
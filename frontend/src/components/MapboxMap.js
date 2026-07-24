import React, { useState, useEffect, useRef } from 'react';
import { FaCar, FaMapMarkerAlt, FaFlag, FaExclamationTriangle, FaLocationArrow } from 'react-icons/fa';

function MapboxMap({ 
    startPoint, 
    endPoint, 
    onMapClick,
    route,
    currentLocation,
    isTracking,
    isNavigating,
    onLocationUpdate,
    onLocationError
}) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [currentStyle, setCurrentStyle] = useState('streets');
    const [markers, setMarkers] = useState([]);
    const [hasZoomedToStart, setHasZoomedToStart] = useState(false);
    const [hasZoomedToEnd, setHasZoomedToEnd] = useState(false);

    const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

    const mapStyles = {
        streets: 'mapbox://styles/mapbox/streets-v12',
        satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
        dark: 'mapbox://styles/mapbox/dark-v11',
        light: 'mapbox://styles/mapbox/light-v11',
        outdoors: 'mapbox://styles/mapbox/outdoors-v12',
        navigation: 'mapbox://styles/mapbox/navigation-day-v1'
    };

    // Validate coordinates
    const isValidCoordinate = (coord) => {
        return Array.isArray(coord) && 
               coord.length === 2 && 
               typeof coord[0] === 'number' && 
               typeof coord[1] === 'number' &&
               !isNaN(coord[0]) && 
               !isNaN(coord[1]);
    };

    useEffect(() => {
        if (!MAPBOX_TOKEN) {
            setLoadError('Mapbox token not configured');
            return;
        }

        if (window.mapboxgl) {
            initializeMap();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.js';
        script.async = true;
        script.onload = () => {
            const link = document.createElement('link');
            link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.css';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            initializeMap();
        };
        script.onerror = () => {
            setLoadError('Failed to load Mapbox library');
        };
        document.head.appendChild(script);

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [MAPBOX_TOKEN]);

    const initializeMap = () => {
        if (!mapContainer.current || map.current) return;

        const mapboxgl = window.mapboxgl;
        if (!mapboxgl) {
            setLoadError('Mapbox library not loaded');
            return;
        }

        try {
            mapboxgl.accessToken = MAPBOX_TOKEN;

            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: mapStyles[currentStyle],
                center: [34.8888, -6.3690],
                zoom: 6
            });

            map.current.on('load', () => {
                setMapLoaded(true);
                setLoadError(null);
            });

            map.current.on('error', (e) => {
                console.warn('Mapbox error:', e);
                setLoadError(e.error?.message || 'Mapbox error occurred');
            });

            map.current.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                if (onMapClick) {
                    onMapClick({ lat, lng });
                }
            });

            map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            const geolocate = new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserLocation: true
            });
            map.current.addControl(geolocate, 'top-right');
            
            geolocate.on('geolocate', (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed
                };
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
            });

        } catch (error) {
            console.error('Mapbox initialization error:', error);
            setLoadError(error.message || 'Failed to initialize map');
        }
    };

    useEffect(() => {
        if (map.current && mapLoaded) {
            try {
                map.current.setStyle(mapStyles[currentStyle]);
            } catch (error) {
                console.warn('Style change error:', error);
            }
        }
    }, [currentStyle, mapLoaded]);

    const createMarkerElement = (icon, color, label) => {
        const el = document.createElement('div');
        el.innerHTML = icon;
        el.style.cssText = `
            font-size: 28px;
            text-align: center;
            transform: translate(-50%, -100%);
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
            background: ${color};
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            cursor: pointer;
            transition: transform 0.2s ease;
        `;
        el.onmouseenter = () => {
            el.style.transform = 'translate(-50%, -100%) scale(1.15)';
        };
        el.onmouseleave = () => {
            el.style.transform = 'translate(-50%, -100%) scale(1)';
        };
        el.title = label;
        return el;
    };

    const zoomToLocation = (lng, lat, zoom = 16) => {
        if (map.current && mapLoaded) {
            map.current.flyTo({
                center: [lng, lat],
                zoom: zoom,
                duration: 1500,
                essential: true
            });
        }
    };

    useEffect(() => {
        if (startPoint && mapLoaded && !hasZoomedToStart) {
            zoomToLocation(startPoint.lng, startPoint.lat);
            setHasZoomedToStart(true);
            setHasZoomedToEnd(false);
        }
    }, [startPoint, mapLoaded]);

    useEffect(() => {
        if (endPoint && mapLoaded && !hasZoomedToEnd) {
            zoomToLocation(endPoint.lng, endPoint.lat);
            setHasZoomedToEnd(true);
            setHasZoomedToStart(false);
        }
    }, [endPoint, mapLoaded]);

    useEffect(() => {
        if (startPoint && endPoint) {
            setHasZoomedToStart(false);
            setHasZoomedToEnd(false);
        }
    }, [startPoint, endPoint]);

    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        const mapboxgl = window.mapboxgl;
        if (!mapboxgl) return;

        try {
            if (map.current._markers) {
                map.current._markers.forEach(m => m.remove());
            }
            map.current._markers = [];

            const newMarkers = [];

            if (currentLocation && isTracking) {
                const el = createMarkerElement(
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-3"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/></svg>',
                    '#2196F3',
                    'Your Location'
                );
                el.style.animation = 'pulse 2s infinite';
                
                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([currentLocation.lng, currentLocation.lat])
                    .addTo(map.current);
                newMarkers.push(marker);
            }

            if (startPoint && !isNavigating) {
                const el = createMarkerElement(
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="3"/></svg>',
                    '#4CAF50',
                    'Start Point'
                );
                
                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([startPoint.lng, startPoint.lat])
                    .addTo(map.current);
                newMarkers.push(marker);
                
                new mapboxgl.Popup({ offset: 25, closeButton: false })
                    .setLngLat([startPoint.lng, startPoint.lat])
                    .setHTML(`
                        <div style="font-family: 'UberMoveText', sans-serif; padding: 4px;">
                            <strong style="color: #4CAF50;">Start Point</strong><br>
                            <span style="font-size: 12px; color: #666;">${startPoint.name || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`}</span>
                        </div>
                    `)
                    .addTo(map.current);
            }

            if (endPoint) {
                const el = createMarkerElement(
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
                    '#F44336',
                    'Destination'
                );
                
                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([endPoint.lng, endPoint.lat])
                    .addTo(map.current);
                newMarkers.push(marker);
                
                new mapboxgl.Popup({ offset: 25, closeButton: false })
                    .setLngLat([endPoint.lng, endPoint.lat])
                    .setHTML(`
                        <div style="font-family: 'UberMoveText', sans-serif; padding: 4px;">
                            <strong style="color: #F44336;">Destination</strong><br>
                            <span style="font-size: 12px; color: #666;">${endPoint.name || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`}</span>
                        </div>
                    `)
                    .addTo(map.current);
            }

            map.current._markers = newMarkers;
        } catch (error) {
            console.warn('Marker update error:', error);
        }
    }, [currentLocation, startPoint, endPoint, isTracking, isNavigating, mapLoaded]);

    useEffect(() => {
        if (!map.current || !mapLoaded || !route?.path) return;

        const mapboxgl = window.mapboxgl;
        if (!mapboxgl) return;

        try {
            const coordinates = route.path
                .filter(coord => 
                    Array.isArray(coord) && 
                    coord.length === 2 && 
                    typeof coord[0] === 'number' && 
                    typeof coord[1] === 'number' &&
                    !isNaN(coord[0]) && 
                    !isNaN(coord[1])
                )
                .map(point => [point[1], point[0]]);

            if (coordinates.length < 2) {
                console.warn('Not enough valid coordinates for route');
                return;
            }

            if (map.current.getLayer('route')) {
                map.current.removeLayer('route');
                map.current.removeSource('route');
            }

            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                }
            });

            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                paint: {
                    'line-color': isNavigating ? '#4CAF50' : '#2196F3',
                    'line-width': 4,
                    'line-opacity': 0.8,
                    'line-dasharray': isNavigating ? [] : [10, 10]
                }
            });
        } catch (error) {
            console.warn('Route drawing error:', error);
        }
    }, [route, isNavigating, mapLoaded]);

    if (!MAPBOX_TOKEN) {
        return (
            <div style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center'
            }}>
                <FaExclamationTriangle style={{ fontSize: '48px', color: '#FF9800', marginBottom: '16px' }} />
                <h3 style={{ color: '#1a237e' }}>Mapbox Not Configured</h3>
                <p style={{ color: '#666' }}>
                    Please add your Mapbox token to <code>frontend/.env</code>
                </p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                    REACT_APP_MAPBOX_TOKEN=your_token_here
                </p>
                <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
                    Get your free token at: account.mapbox.com/access-tokens/
                </p>
                <p style={{ color: '#999', fontSize: '11px', marginTop: '10px' }}>
                    <strong>Tip:</strong> Use OSM (OpenStreetMap) as default
                </p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffebee',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center'
            }}>
                <FaExclamationTriangle style={{ fontSize: '48px', color: '#F44336', marginBottom: '16px' }} />
                <h3 style={{ color: '#c62828' }}>Mapbox Error</h3>
                <p style={{ color: '#666' }}>{loadError}</p>
                <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
                    <strong>Tip:</strong> Use OSM (OpenStreetMap) as default
                </p>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <div 
                ref={mapContainer} 
                style={{ height: '100%', width: '100%', borderRadius: '10px' }}
            />

            <div className="mapbox-style-selector">
                <div className="style-selector-header">Style:</div>
                <div className="style-selector-grid">
                    {Object.entries(mapStyles).map(([key, value]) => (
                        <button
                            key={key}
                            className={`style-selector-btn ${currentStyle === key ? 'active' : ''}`}
                            onClick={() => setCurrentStyle(key)}
                            title={key}
                        >
                            <span className="style-name">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {!mapLoaded && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    zIndex: 10,
                    fontSize: '14px'
                }}>
                    Loading Mapbox...
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: translate(-50%, -100%) scale(1); }
                    50% { transform: translate(-50%, -100%) scale(1.1); }
                    100% { transform: translate(-50%, -100%) scale(1); }
                }
            `}</style>
        </div>
    );
}

export default MapboxMap;
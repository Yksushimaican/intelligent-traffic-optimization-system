import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
    FaLayerGroup, 
    FaGlobe, 
    FaMap, 
    FaInfoCircle, 
    FaCar, 
    FaMapMarkerAlt, 
    FaFlag,
    FaPlus,
    FaMinus,
    FaBuilding,
    FaRoad,
    FaCity
} from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import MapboxMap from './MapboxMap';
import axios from 'axios';
import locationIntelligence from '../services/locationIntelligence';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// OpenStreetMap tile layers
const osmLayers = {
    standard: {
        name: 'Standard',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: 'OpenStreetMap'
    },
    satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri'
    },
    dark: {
        name: 'Dark Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: 'CartoDB'
    },
    light: {
        name: 'Light Mode',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: 'CartoDB'
    },
    terrain: {
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'OpenTopoMap'
    },
    transportation: {
        name: 'Transport',
        url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        attribution: 'CyclOSM'
    }
};

// Validate coordinates for markers
const isValidLatLng = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    return !isNaN(latNum) && !isNaN(lngNum) && isFinite(latNum) && isFinite(lngNum) &&
           latNum >= -90 && latNum <= 90 &&
           lngNum >= -180 && lngNum <= 180;
};

// Safe parse route path
const safeParseRoutePath = (path) => {
    if (!path || !Array.isArray(path)) return [];
    
    return path.filter(point => {
        if (!Array.isArray(point) || point.length < 2) return false;
        const lat = parseFloat(point[0]);
        const lng = parseFloat(point[1]);
        return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
    }).map(point => [
        parseFloat(point[0]),
        parseFloat(point[1])
    ]);
};

// Custom icons
const createIcon = (html, size = 40, anchor = [20, 20]) => {
    return L.divIcon({
        className: 'custom-marker',
        html: html,
        iconSize: [size, size],
        iconAnchor: anchor,
        popupAnchor: [0, -20],
    });
};

const startIcon = createIcon(`
    <div style="
        background: #4CAF50; 
        color: white; 
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        border: 3px solid white;
    ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="3"/>
        </svg>
    </div>
`, 40, [20, 40]);

const destinationIcon = createIcon(`
    <div style="
        background: #F44336; 
        color: white; 
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
        border: 3px solid white;
    ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
        </svg>
    </div>
`, 40, [20, 40]);

const carIcon = createIcon(`
    <div style="
        background: #2196F3; 
        color: white; 
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
        border: 3px solid white;
        animation: pulse 2s infinite;
    ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 5v3h-3"/>
            <circle cx="5.5" cy="18" r="2.5"/>
            <circle cx="18.5" cy="18" r="2.5"/>
        </svg>
    </div>
`, 44, [22, 22]);

function MapClickHandler({ onMapClick, onStreetDetect, onLocationIntelligence }) {
    const map = useMap();
    
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            onMapClick(e.latlng);
            
            map.flyTo([lat, lng], 16, {
                duration: 1.5,
                easeLinearity: 0.25
            });
            
            if (onStreetDetect) {
                axios.get(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`
                )
                .then(response => {
                    if (response.data && response.data.address) {
                        const address = response.data.address;
                        const streetName = address.road || 
                                          address.pedestrian || 
                                          address.footway || 
                                          address.path || 
                                          address.street ||
                                          address.track ||
                                          address.cycleway ||
                                          address.bridleway;
                        
                        const city = address.city || 
                                    address.town || 
                                    address.village || 
                                    address.suburb ||
                                    address.municipality;
                        
                        const country = address.country || 'Tanzania';
                        
                        let locationName = '';
                        if (streetName) {
                            locationName = streetName;
                            if (city) {
                                locationName += `, ${city}`;
                            }
                        } else if (city) {
                            locationName = city;
                        } else {
                            locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        }
                        
                        onStreetDetect({
                            name: locationName,
                            street: streetName || null,
                            city: city || null,
                            country: country,
                            lat: lat,
                            lng: lng,
                            fullAddress: response.data.display_name || locationName
                        });
                    }
                })
                .catch(error => {
                    console.error('Street detection error:', error);
                    onStreetDetect({
                        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        street: null,
                        city: null,
                        country: 'Tanzania',
                        lat: lat,
                        lng: lng,
                        fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                    });
                });
            }

            if (onLocationIntelligence) {
                locationIntelligence.getCompleteLocationInfo(lat, lng)
                    .then(info => {
                        onLocationIntelligence(info);
                    })
                    .catch(error => {
                        console.error('Location intelligence error:', error);
                    });
            }
        },
    });
    return null;
}

function ZoomToLocation({ position }) {
    const map = useMap();
    
    useEffect(() => {
        if (position && isValidLatLng(position.lat, position.lng)) {
            map.flyTo([position.lat, position.lng], 16, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [map, position]);
    
    return null;
}

function LeafletMap({ 
    startPoint, 
    endPoint, 
    onMapClick,
    route,
    currentLocation,
    isTracking,
    isNavigating,
    onStreetDetect,
    onLocationIntelligence,
    onMapReady
}) {
    const [currentLayer, setCurrentLayer] = useState('standard');
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const tanzaniaCenter = [-6.3690, 34.8888];
    const mapRef = useRef(null);
    const [zoomTarget, setZoomTarget] = useState(null);

    const handleMapReady = (map) => {
        mapRef.current = map;
        if (onMapReady) {
            onMapReady(map);
        }
    };

    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    const handleLayerChange = (layerKey) => {
        setCurrentLayer(layerKey);
        setShowLayerMenu(false);
    };

    const currentLayerData = osmLayers[currentLayer];
    const routePath = route?.path || [];
    const safePath = safeParseRoutePath(routePath);

    // Validate marker positions
    const validStartPoint = startPoint && isValidLatLng(startPoint.lat, startPoint.lng);
    const validEndPoint = endPoint && isValidLatLng(endPoint.lat, endPoint.lng);
    const validCurrentLocation = currentLocation && isValidLatLng(currentLocation.lat, currentLocation.lng);

    useEffect(() => {
        if (validEndPoint) {
            setZoomTarget(endPoint);
        } else if (validStartPoint) {
            setZoomTarget(startPoint);
        }
    }, [startPoint, endPoint]);

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <div className="zoom-controls">
                <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">
                    <FaPlus />
                </button>
                <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                    <FaMinus />
                </button>
            </div>

            <div className="layer-control">
                <button 
                    className="layer-btn"
                    onClick={() => setShowLayerMenu(!showLayerMenu)}
                    title="Change Map Style"
                >
                    <FaLayerGroup />
                </button>
                
                {showLayerMenu && (
                    <div className="layer-menu">
                        <div className="layer-menu-header">Map Style</div>
                        {Object.entries(osmLayers).map(([key, layer]) => (
                            <div 
                                key={key}
                                className={`layer-item ${currentLayer === key ? 'active' : ''}`}
                                onClick={() => handleLayerChange(key)}
                            >
                                <span className="layer-item-dot"></span>
                                <span className="layer-item-name">{layer.name}</span>
                                {currentLayer === key && (
                                    <span className="layer-item-check">✓</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="zoom-level-display">
                Zoom: {mapRef.current?.getZoom() || 6}
            </div>

            <MapContainer 
                center={tanzaniaCenter} 
                zoom={6} 
                style={{ height: '100%', width: '100%', borderRadius: '10px' }}
                zoomControl={false}
                scrollWheelZoom={true}
                minZoom={3}
                maxZoom={19}
                whenReady={({ target }) => handleMapReady(target)}
                ref={mapRef}
            >
                <TileLayer
                    url={currentLayerData.url}
                    attribution={currentLayerData.attribution}
                />
                
                <MapClickHandler 
                    onMapClick={onMapClick} 
                    onStreetDetect={onStreetDetect}
                    onLocationIntelligence={onLocationIntelligence}
                />

                <ZoomToLocation position={zoomTarget} />

                {validCurrentLocation && isTracking && (
                    <>
                        <CircleMarker 
                            center={[currentLocation.lat, currentLocation.lng]}
                            radius={8}
                            fillColor="#2196F3"
                            fillOpacity={0.8}
                            stroke={true}
                            color="#1565C0"
                            weight={2}
                        />
                        <Marker 
                            position={[currentLocation.lat, currentLocation.lng]}
                            icon={carIcon}
                        />
                        {currentLocation?.accuracy && (
                            <CircleMarker 
                                center={[currentLocation.lat, currentLocation.lng]}
                                radius={currentLocation.accuracy / 2}
                                fillColor="#2196F3"
                                fillOpacity={0.1}
                                stroke={true}
                                color="#2196F3"
                                weight={1}
                            />
                        )}
                    </>
                )}

                {validStartPoint && !isNavigating && (
                    <Marker 
                        position={[startPoint.lat, startPoint.lng]}
                        icon={startIcon}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center' }}>
                                <strong style={{ color: '#4CAF50' }}>Start Point</strong><br />
                                {startPoint.name || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {validEndPoint && (
                    <Marker 
                        position={[endPoint.lat, endPoint.lng]}
                        icon={destinationIcon}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center' }}>
                                <strong style={{ color: '#F44336' }}>Destination</strong><br />
                                {endPoint.name || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {safePath.length > 0 && (
                    <Polyline 
                        positions={safePath}
                        color={isNavigating ? "#4CAF50" : "#2196F3"}
                        weight={4}
                        opacity={0.8}
                        dashArray={isNavigating ? null : "10, 10"}
                    />
                )}
            </MapContainer>
        </div>
    );
}

// Main Map component
function Map({ 
    startPoint, 
    endPoint, 
    onMapClick,
    route,
    currentLocation,
    isTracking,
    isNavigating,
    onLocationUpdate,
    onLocationError,
    onLocationIntelligence
}) {
    const [mapProvider, setMapProvider] = useState('osm');
    const [detectedStreet, setDetectedStreet] = useState(null);
    const [showStreetInfo, setShowStreetInfo] = useState(false);
    const [showLocationInfo, setShowLocationInfo] = useState(false);
    const [locationInfo, setLocationInfo] = useState(null);

    const handleStreetDetect = (streetInfo) => {
        setDetectedStreet(streetInfo);
        setShowStreetInfo(true);
        setTimeout(() => setShowStreetInfo(false), 5000);
    };

    const handleLocationIntelligence = (info) => {
        setLocationInfo(info);
        setShowLocationInfo(true);
        setTimeout(() => setShowLocationInfo(false), 8000);
        if (onLocationIntelligence) {
            onLocationIntelligence(info);
        }
    };

    const formatLocationInfo = (info) => {
        if (!info) return null;
        const parts = [];
        if (info.geonames?.name) parts.push({ label: 'Place', value: info.geonames.name });
        if (info.geonames?.city) parts.push({ label: 'City', value: info.geonames.city });
        if (info.geonames?.region) parts.push({ label: 'Region', value: info.geonames.region });
        if (info.geonames?.country) parts.push({ label: 'Country', value: info.geonames.country });
        if (info.addresses && info.addresses.length > 0) {
            parts.push({ label: 'Address', value: info.addresses[0].fullAddress });
        }
        return parts;
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {showStreetInfo && detectedStreet && (
                <div className="street-info-popup">
                    <div className="street-info-content">
                        <FaInfoCircle className="street-info-icon" />
                        <div className="street-info-text">
                            <div className="street-name">{detectedStreet.street || detectedStreet.name}</div>
                            {detectedStreet.city && (
                                <div className="street-city">{detectedStreet.city}</div>
                            )}
                            <div className="street-country">{detectedStreet.country}</div>
                        </div>
                    </div>
                </div>
            )}

            {showLocationInfo && locationInfo && (
                <div className="location-intelligence-popup">
                    <div className="location-intelligence-content">
                        <div className="location-intelligence-title">Location Intelligence</div>
                        {formatLocationInfo(locationInfo)?.map((item, index) => (
                            <div key={index} className="location-intelligence-detail">
                                <span className="label">{item.label}:</span>
                                <span className="value">{item.value}</span>
                            </div>
                        ))}
                        <div className="location-intelligence-source">
                            <span className="badge">GeoNames</span>
                            <span className="badge">WOF</span>
                            <span className="badge">OpenAddresses</span>
                            <span className="badge">OSM</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="map-provider-toggle">
                <button
                    className={`provider-btn ${mapProvider === 'osm' ? 'active' : ''}`}
                    onClick={() => setMapProvider('osm')}
                    title="OpenStreetMap (Free, no API key)"
                >
                    <FaGlobe /> OSM
                </button>
                <button
                    className={`provider-btn ${mapProvider === 'mapbox' ? 'active' : ''}`}
                    onClick={() => setMapProvider('mapbox')}
                    title="Mapbox (Better quality, requires API key)"
                >
                    <FaMap /> Mapbox
                </button>
            </div>

            {mapProvider === 'osm' ? (
                <LeafletMap
                    startPoint={startPoint}
                    endPoint={endPoint}
                    onMapClick={onMapClick}
                    route={route}
                    currentLocation={currentLocation}
                    isTracking={isTracking}
                    isNavigating={isNavigating}
                    onStreetDetect={handleStreetDetect}
                    onLocationIntelligence={handleLocationIntelligence}
                />
            ) : (
                <MapboxMap
                    startPoint={startPoint}
                    endPoint={endPoint}
                    onMapClick={onMapClick}
                    route={route}
                    currentLocation={currentLocation}
                    isTracking={isTracking}
                    isNavigating={isNavigating}
                    onLocationUpdate={onLocationUpdate}
                    onLocationError={onLocationError}
                />
            )}
        </div>
    );
}

export default Map;
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Available map layers
const mapLayers = {
    standard: {
        name: 'Standard Map',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: 'OpenStreetMap',
        description: 'Regular street map'
    },
    satellite: {
        name: 'Satellite',
        url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attribution: 'Google Satellite',
        description: 'Satellite imagery',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    terrain: {
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'OpenTopoMap',
        description: 'Shows elevation and terrain'
    },
    humanitarian: {
        name: 'Humanitarian',
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: 'Humanitarian OSM',
        description: 'Detailed roads for disaster response'
    },
    cycle: {
        name: 'Cycle Map',
        url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        attribution: 'CyclOSM',
        description: 'Shows all roads and paths'
    },
    dark: {
        name: 'Dark Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: 'CartoDB',
        description: 'Dark theme for night driving'
    }
};

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
}

function ZoomHandler({ onZoomChange }) {
    const map = useMap();
    
    useEffect(() => {
        const handleZoom = () => {
            if (onZoomChange) {
                onZoomChange(map.getZoom());
            }
        };
        
        map.on('zoomend', handleZoom);
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map, onZoomChange]);
    
    return null;
}

function MapLayerControl({ currentLayer, onLayerChange }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="map-controls-panel">
            <button 
                className="map-controls-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title="Map Settings"
            >
                🗺️
            </button>
            
            {isOpen && (
                <div className="map-layers-menu">
                    <div className="layers-header">
                        <h4>Select Map Type</h4>
                        <button onClick={() => setIsOpen(false)}>✕</button>
                    </div>
                    <div className="layers-list">
                        {Object.keys(mapLayers).map((key) => (
                            <button
                                key={key}
                                className={`layer-option ${currentLayer === key ? 'active' : ''}`}
                                onClick={() => {
                                    onLayerChange(key);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="layer-name">{mapLayers[key].name}</div>
                                <div className="layer-description">{mapLayers[key].description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Map({ startPoint, endPoint, onMapClick }) {
    const [currentZoom, setCurrentZoom] = useState(7);
    const [currentLayer, setCurrentLayer] = useState('standard');
    const tanzaniaCenter = [-6.3690, 34.8888];
    
    const handleZoomChange = (zoom) => {
        setCurrentZoom(zoom);
    };
    
    const handleLayerChange = (layerKey) => {
        setCurrentLayer(layerKey);
    };
    
    const getActiveLayer = () => {
        const layer = mapLayers[currentLayer];
        
        // Handle Google satellite which needs special subdomains
        if (currentLayer === 'satellite') {
            const subdomains = layer.subdomains;
            const randomSubdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
            return {
                url: layer.url,
                attribution: layer.attribution,
                subdomains: subdomains
            };
        }
        
        return {
            url: layer.url,
            attribution: layer.attribution
        };
    };
    
    const activeLayer = getActiveLayer();
    
    return (
        <div style={{ position: 'relative' }}>
            {/* Map Controls Panel */}
            <MapLayerControl 
                currentLayer={currentLayer} 
                onLayerChange={handleLayerChange} 
            />
            
            {/* Zoom Level Indicator */}
            <div className="zoom-indicator">
                Zoom: {currentZoom}x | {mapLayers[currentLayer].name}
            </div>
            
            <MapContainer 
                center={tanzaniaCenter} 
                zoom={7} 
                style={{ height: '550px', width: '100%', borderRadius: '12px' }}
                zoomControl={true}
                scrollWheelZoom={true}
                minZoom={5}
                maxZoom={19}
            >
                <TileLayer
                    url={activeLayer.url}
                    attribution={activeLayer.attribution}
                    {...(activeLayer.subdomains && { subdomains: activeLayer.subdomains })}
                />
                
                <ZoomHandler onZoomChange={handleZoomChange} />
                <MapClickHandler onMapClick={onMapClick} />
                
                {startPoint && (
                    <Marker position={[startPoint.lat, startPoint.lng]}>
                        <Popup>
                            <strong>Start Point</strong><br />
                            Lat: {startPoint.lat.toFixed(6)}<br />
                            Lng: {startPoint.lng.toFixed(6)}
                        </Popup>
                    </Marker>
                )}
                
                {endPoint && (
                    <Marker position={[endPoint.lat, endPoint.lng]}>
                        <Popup>
                            <strong>Destination</strong><br />
                            Lat: {endPoint.lat.toFixed(6)}<br />
                            Lng: {endPoint.lng.toFixed(6)}
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}

export default Map;
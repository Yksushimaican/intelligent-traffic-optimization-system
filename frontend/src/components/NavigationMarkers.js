import React, { useState, useEffect } from 'react';
import { Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const carIcon = L.divIcon({
    className: 'car-marker',
    html: '🚗',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
    className: 'destination-marker',
    html: '🏁',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

const startIcon = L.divIcon({
    className: 'start-marker',
    html: '📍',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

function LocationTracker({ onLocationUpdate, onLocationError, isTracking }) {
    const [watchId, setWatchId] = useState(null);
    const map = useMap();

    useEffect(() => {
        if (!isTracking) {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                setWatchId(null);
            }
            return;
        }

        if (!navigator.geolocation) {
            if (onLocationError) {
                onLocationError('Geolocation is not supported');
            }
            return;
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy, speed, heading } = position.coords;
                const location = { lat: latitude, lng: longitude, accuracy, speed, heading };
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
                map.panTo([latitude, longitude]);
            },
            (error) => {
                if (onLocationError) {
                    onLocationError(error.message);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 60000
            }
        );

        setWatchId(id);

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTracking, map]);

    return null;
}

function NavigationMarkers({ 
    startPoint, 
    endPoint, 
    route, 
    currentLocation, 
    isTracking, 
    isNavigating,
    onLocationUpdate,
    onLocationError
}) {
    const routePath = route?.path || [];

    return (
        <>
            <LocationTracker 
                onLocationUpdate={onLocationUpdate}
                onLocationError={onLocationError}
                isTracking={isTracking}
            />

            {currentLocation && isTracking && (
                <>
                    <CircleMarker 
                        center={[currentLocation.lat, currentLocation.lng]}
                        radius={8}
                        fillColor="#2196F3"
                        fillOpacity={0.8}
                        stroke={true}
                        color="#1565C0"
                        weight={2}
                    >
                        <Popup>
                            <strong>Your Location</strong><br />
                            Lat: {currentLocation.lat.toFixed(6)}<br />
                            Lng: {currentLocation.lng.toFixed(6)}<br />
                            {currentLocation.speed && `Speed: ${(currentLocation.speed * 3.6).toFixed(0)} km/h`}
                        </Popup>
                    </CircleMarker>
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

            {startPoint && !isNavigating && (
                <Marker 
                    position={[startPoint.lat, startPoint.lng]}
                    icon={startIcon}
                >
                    <Popup>Start Point</Popup>
                </Marker>
            )}

            {endPoint && (
                <Marker 
                    position={[endPoint.lat, endPoint.lng]}
                    icon={destinationIcon}
                >
                    <Popup>Destination</Popup>
                </Marker>
            )}

            {routePath.length > 0 && (
                <Polyline 
                    positions={routePath}
                    color={isNavigating ? "#4CAF50" : "#2196F3"}
                    weight={4}
                    opacity={0.8}
                    dashArray={isNavigating ? null : "10, 10"}
                />
            )}
        </>
    );
}

export default NavigationMarkers;
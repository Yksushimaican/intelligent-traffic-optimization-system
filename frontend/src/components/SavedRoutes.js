import React, { useState, useEffect } from 'react';
import { routesAPI } from '../services/api';
import { formatTime, formatDistance, formatDate } from '../utils/timeUtils';

function SavedRoutes({ user, onLoadRoute, onRouteDeleted }) {
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const safeParse = (value, defaultValue = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    };

    const loadSavedRoutes = async () => {
        if (!user) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await routesAPI.getSaved(user.id);
            setSavedRoutes(response.data || []);
        } catch (error) {
            console.error('Failed to load saved routes:', error);
            setError('Failed to load saved routes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSavedRoutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleDeleteRoute = async (routeId) => {
        if (!window.confirm('Delete this saved route?')) return;
        
        try {
            await routesAPI.delete(routeId);
            setSavedRoutes(savedRoutes.filter(r => r.id !== routeId));
            if (onRouteDeleted) onRouteDeleted();
        } catch (error) {
            console.error('Failed to delete route:', error);
            alert('Failed to delete route');
        }
    };

    if (!user) {
        return (
            <div className="saved-routes-empty">
                <p>Login to view saved routes</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="saved-routes-loading">
                <p>Loading saved routes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="saved-routes-error">
                <p>{error}</p>
                <button onClick={loadSavedRoutes}>Retry</button>
            </div>
        );
    }

    if (savedRoutes.length === 0) {
        return (
            <div className="saved-routes-empty">
                <p>No saved routes yet</p>
                <p style={{ fontSize: '12px', color: '#999' }}>
                    Calculate a route and click "Save Route" to save it here
                </p>
            </div>
        );
    }

    return (
        <div className="saved-routes-container">
            <div className="saved-routes-header">
                <h3>Saved Routes ({savedRoutes.length})</h3>
                <button className="refresh-btn" onClick={loadSavedRoutes}>
                    Refresh
                </button>
            </div>
            <div className="saved-routes-list">
                {savedRoutes.map((route) => {
                    const startLat = safeParse(route.start_lat);
                    const startLng = safeParse(route.start_lng);
                    const endLat = safeParse(route.end_lat);
                    const endLng = safeParse(route.end_lng);
                    const distance = safeParse(route.distance_km);
                    const eta = safeParse(route.eta_minutes);

                    return (
                        <div key={route.id} className="saved-route-item">
                            <div className="route-info">
                                <div className="route-name">{route.route_name || 'Untitled Route'}</div>
                                <div className="route-meta">
                                    <span>{formatDistance(distance)}</span>
                                    <span>•</span>
                                    <span>{formatTime(eta)}</span>
                                    <span>•</span>
                                    <span>{formatDate(route.created_at)}</span>
                                </div>
                                <div className="route-coords">
                                    <small>
                                        From: {startLat.toFixed(4)}, {startLng.toFixed(4)}
                                    </small>
                                    <small>
                                        To: {endLat.toFixed(4)}, {endLng.toFixed(4)}
                                    </small>
                                </div>
                            </div>
                            <div className="route-actions">
                                <button 
                                    className="load-btn"
                                    onClick={() => onLoadRoute(route)}
                                >
                                    Load
                                </button>
                                <button 
                                    className="delete-btn"
                                    onClick={() => handleDeleteRoute(route.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default SavedRoutes;
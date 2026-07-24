import React from 'react';
import { 
    FaHistory, 
    FaRoute, 
    FaClock, 
    FaRulerCombined,
    FaMapMarkerAlt,
    FaFlag,
    FaCar
} from 'react-icons/fa';
import { formatTime, formatDistance } from '../utils/timeUtils';

function History({ savedRoutes, onLoadRoute }) {
    const safeParse = (value, defaultValue = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    };

    // Get location name with fallback to coordinates
    const getLocationName = (route, isStart) => {
        const lat = safeParse(isStart ? route.start_lat : route.end_lat);
        const lng = safeParse(isStart ? route.start_lng : route.end_lng);
        
        // Try to use stored name if available
        const storedName = isStart ? route.start_name : route.end_name;
        if (storedName && storedName !== 'undefined' && storedName !== 'null' && storedName !== '') {
            return storedName;
        }
        
        // Fallback to coordinates
        if (lat !== 0 && lng !== 0) {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        
        return 'Unknown Location';
    };

    if (!savedRoutes || savedRoutes.length === 0) {
        return (
            <div className="history-empty">
                <div className="empty-state">
                    <FaHistory className="empty-icon" />
                    <h3>No Trips Yet</h3>
                    <p>Save your first route to see it here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="history-container">
            <div className="history-header">
                <h3><FaHistory /> Recent Trips</h3>
                <span className="history-count">{savedRoutes.length} trips</span>
            </div>
            <div className="history-list">
                {savedRoutes.map((route) => {
                    const startName = getLocationName(route, true);
                    const endName = getLocationName(route, false);
                    const distance = safeParse(route.distance_km);
                    const eta = safeParse(route.eta_minutes);

                    return (
                        <div key={route.id} className="history-item">
                            <div className="history-item-left">
                                <div className="history-route-points">
                                    <div className="history-point start">
                                        <span className="point-dot start-dot"></span>
                                        <span className="point-label">
                                            <FaMapMarkerAlt className="point-icon" /> 
                                            From: <strong>{startName}</strong>
                                        </span>
                                    </div>
                                    <div className="history-point end">
                                        <span className="point-dot end-dot"></span>
                                        <span className="point-label">
                                            <FaFlag className="point-icon" /> 
                                            To: <strong>{endName}</strong>
                                        </span>
                                    </div>
                                </div>
                                <div className="history-meta">
                                    <span className="meta-item">
                                        <FaRulerCombined className="meta-icon" /> {formatDistance(distance)}
                                    </span>
                                    <span className="meta-item">
                                        <FaClock className="meta-icon" /> {formatTime(eta)}
                                    </span>
                                    <span className="meta-item">
                                        <FaCar className="meta-icon" /> 
                                        {new Date(route.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                        })}
                                    </span>
                                </div>
                            </div>
                            <div className="history-item-right">
                                <button 
                                    className="history-load-btn"
                                    onClick={() => onLoadRoute(route)}
                                >
                                    <FaRoute /> Load Route
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default History;
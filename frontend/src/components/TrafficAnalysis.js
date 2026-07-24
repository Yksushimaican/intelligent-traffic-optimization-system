import React, { useState, useEffect } from 'react';
import { FaCar, FaTrafficLight, FaChartLine } from 'react-icons/fa';
import locationIntelligence from '../services/locationIntelligence';

function TrafficAnalysis({ currentLocation, speeds = [] }) {
    const [traffic, setTraffic] = useState(null);
    const [speedsHistory, setSpeedsHistory] = useState([]);

    useEffect(() => {
        if (speeds.length > 0) {
            const analysis = locationIntelligence.calculateTrafficFromSpeeds(speeds);
            setTraffic(analysis);
            
            // Add to history
            setSpeedsHistory(prev => {
                const newHistory = [...prev, ...speeds];
                if (newHistory.length > 100) {
                    return newHistory.slice(-100);
                }
                return newHistory;
            });
        }
    }, [speeds]);

    const getTrafficColor = (level) => {
        switch(level) {
            case 'light': return '#4CAF50';
            case 'moderate': return '#FFC107';
            case 'heavy': return '#FF9800';
            case 'gridlock': return '#F44336';
            default: return '#757575';
        }
    };

    if (!traffic) {
        return (
            <div className="traffic-analysis">
                <p>Waiting for traffic data...</p>
            </div>
        );
    }

    return (
        <div className="traffic-analysis">
            <div className="traffic-header">
                <h4><FaTrafficLight /> Traffic Analysis</h4>
                <span className="traffic-status" style={{ color: getTrafficColor(traffic.level) }}>
                    <span className="traffic-indicator" style={{ backgroundColor: getTrafficColor(traffic.level) }}></span>
                    {traffic.label}
                </span>
            </div>
            
            <div className="traffic-stats">
                <div className="traffic-stat">
                    <span className="stat-label">Avg Speed</span>
                    <span className="stat-value">
                        {speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : '--'} km/h
                    </span>
                </div>
                <div className="traffic-stat">
                    <span className="stat-label">Samples</span>
                    <span className="stat-value">{speeds.length}</span>
                </div>
                <div className="traffic-stat">
                    <span className="stat-label">Condition</span>
                    <span className="stat-value" style={{ color: getTrafficColor(traffic.level) }}>
                        {traffic.level.toUpperCase()}
                    </span>
                </div>
            </div>

            {currentLocation && (
                <div className="traffic-location">
                    <FaCar />
                    <span>
                        {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                </div>
            )}
        </div>
    );
}

export default TrafficAnalysis;
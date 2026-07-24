import React from 'react';
import { FaCar, FaRulerCombined, FaClock, FaSave } from 'react-icons/fa';
import { formatTime, formatDistance } from '../utils/timeUtils';

function DashboardStats({ stats }) {
    const statItems = [
        { 
            label: 'Total Trips', 
            value: stats.totalTrips || 0, 
            icon: <FaCar />,
            color: '#4CAF50'
        },
        { 
            label: 'Total Distance', 
            value: stats.totalDistance ? formatDistance(stats.totalDistance) : '0 km', 
            icon: <FaRulerCombined />,
            color: '#2196F3'
        },
        { 
            label: 'Total Time', 
            value: stats.totalTime ? formatTime(stats.totalTime) : '0 min', 
            icon: <FaClock />,
            color: '#FF9800'
        },
        { 
            label: 'Saved Routes', 
            value: stats.savedRoutes || 0, 
            icon: <FaSave />,
            color: '#9C27B0'
        },
    ];

    return (
        <div className="stats-grid">
            {statItems.map((item, index) => (
                <div key={index} className="stat-card" style={{ borderLeftColor: item.color }}>
                    <div className="stat-icon">{item.icon}</div>
                    <div className="stat-content">
                        <div className="stat-value">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default DashboardStats;
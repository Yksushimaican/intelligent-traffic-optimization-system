import React, { useState, useEffect } from 'react';
import { 
    FaTrafficLight, 
    FaExclamationTriangle, 
    FaRoad, 
    FaWater, 
    FaCar, 
    FaMapMarkerAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaPlus,
    FaList,
    FaFilter,
    FaMinus,
    FaEye,
    FaUser
} from 'react-icons/fa';
import { trafficAPI } from '../services/api';

function TrafficReports({ user }) {
    const [reportType, setReportType] = useState('congestion');
    const [severity, setSeverity] = useState(3);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedReport, setSelectedReport] = useState(null);

    const reportTypes = [
        { value: 'congestion', label: 'Congestion', icon: <FaCar />, color: '#FF9800' },
        { value: 'accident', label: 'Accident', icon: <FaExclamationTriangle />, color: '#F44336' },
        { value: 'flood', label: 'Flood', icon: <FaWater />, color: '#2196F3' },
        { value: 'road_work', label: 'Road Work', icon: <FaRoad />, color: '#FFC107' },
        { value: 'other', label: 'Other', icon: <FaTrafficLight />, color: '#9E9E9E' },
    ];

    const severityLabels = ['Minor', 'Mild', 'Moderate', 'Severe', 'Critical'];

    const loadReports = async () => {
        setLoading(true);
        try {
            const response = await trafficAPI.getReports({});
            setReports(response.data || []);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
        const interval = setInterval(loadReports, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location) {
            alert('Please click on the map to select a location');
            return;
        }

        setSubmitting(true);
        try {
            await trafficAPI.report({
                user_id: user?.id || null,
                location_lat: location.lat,
                location_lng: location.lng,
                report_type: reportType,
                severity: severity,
                description: description || `${reportType} reported`
            });
            alert('Report submitted successfully! Help other drivers stay safe.');
            setDescription('');
            setLocation(null);
            loadReports();
            setShowForm(false);
            setTimeout(() => setShowForm(true), 1000);
        } catch (error) {
            alert('Failed to submit report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getReportTypeInfo = (type) => {
        return reportTypes.find(r => r.value === type) || reportTypes[0];
    };

    const getSeverityLabel = (sev) => {
        return severityLabels[sev - 1] || 'Unknown';
    };

    const getSeverityColor = (sev) => {
        const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];
        return colors[sev - 1] || '#757575';
    };

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diff = Math.floor((now - then) / 60000);
        
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
        return `${Math.floor(diff / 1440)} days ago`;
    };

    const filteredReports = reports.filter(report => {
        if (filter === 'all') return true;
        return report.report_type === filter;
    });

    const recentReports = filteredReports.slice(0, 10);

    return (
        <div className="traffic-reports-container">
            <div className="traffic-reports-header">
                <h2><FaTrafficLight /> Traffic Reports</h2>
                <p>Help other drivers by reporting road conditions</p>
            </div>

            {/* Stats Summary */}
            <div className="traffic-stats-summary">
                <div className="stat-item">
                    <span className="stat-number">{reports.length}</span>
                    <span className="stat-label">Total Reports</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">
                        {reports.filter(r => r.severity >= 4).length}
                    </span>
                    <span className="stat-label">High Severity</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">
                        {reports.filter(r => r.report_type === 'accident').length}
                    </span>
                    <span className="stat-label">Accidents</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">
                        {reports.filter(r => r.report_type === 'congestion').length}
                    </span>
                    <span className="stat-label">Congestion</span>
                </div>
            </div>

            {/* Report Form */}
            <div className="report-form-container">
                <div className="report-form-header" onClick={() => setShowForm(!showForm)}>
                    <h3><FaPlus /> {showForm ? 'Hide Report Form' : 'Report Incident'}</h3>
                    <span className="toggle-icon">{showForm ? <FaMinus /> : <FaPlus />}</span>
                </div>
                
                {showForm && (
                    <form onSubmit={handleSubmit} className="report-form">
                        <div className="report-form-group">
                            <label>Incident Type</label>
                            <div className="report-type-selector">
                                {reportTypes.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className={`type-btn ${reportType === type.value ? 'active' : ''}`}
                                        onClick={() => setReportType(type.value)}
                                        style={{ borderColor: reportType === type.value ? type.color : 'transparent' }}
                                    >
                                        <span className="type-icon" style={{ color: type.color }}>{type.icon}</span>
                                        <span className="type-label">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="report-form-group">
                            <label>Severity: <span style={{ color: getSeverityColor(severity) }}>{getSeverityLabel(severity)}</span></label>
                            <div className="severity-slider-container">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={severity}
                                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                                    className="severity-slider"
                                    style={{ background: getSeverityColor(severity) }}
                                />
                                <div className="severity-labels">
                                    <span>Minor</span>
                                    <span>Critical</span>
                                </div>
                            </div>
                        </div>

                        <div className="report-form-group">
                            <label>Description <span className="optional">(optional)</span></label>
                            <textarea
                                placeholder="Describe the incident (e.g., Heavy traffic on Njiro Road, flooding near clock tower...)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="report-textarea"
                                rows="3"
                            />
                        </div>

                        <div className="report-form-group">
                            <label>Location <span className="required">*</span></label>
                            <div className="location-selector">
                                {location ? (
                                    <div className="location-selected">
                                        <FaMapMarkerAlt className="location-icon" />
                                        <span>
                                            Selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => setLocation(null)}
                                            className="location-clear"
                                        >
                                            <FaTimesCircle />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="location-prompt">
                                        <FaMapMarkerAlt />
                                        <span>Click on the map to select location</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={submitting || !location} className="report-submit-btn">
                            {submitting ? 'Submitting...' : <><FaPlus /> Submit Report</>}
                        </button>
                    </form>
                )}
            </div>

            {/* Filter */}
            <div className="reports-filter">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                {reportTypes.map(type => (
                    <button 
                        key={type.value}
                        className={`filter-btn ${filter === type.value ? 'active' : ''}`}
                        onClick={() => setFilter(type.value)}
                    >
                        {type.icon} {type.label}
                    </button>
                ))}
            </div>

            {/* Reports List */}
            <div className="reports-list-container">
                <div className="reports-list-header">
                    <h3><FaList /> Recent Reports</h3>
                    <span className="report-count">{reports.length} reports</span>
                </div>

                {loading ? (
                    <div className="reports-loading">Loading reports...</div>
                ) : recentReports.length === 0 ? (
                    <div className="reports-empty">
                        <FaInfoCircle />
                        <p>No reports yet. Be the first to report!</p>
                    </div>
                ) : (
                    <div className="reports-list">
                        {recentReports.map((report, index) => {
                            const typeInfo = getReportTypeInfo(report.report_type);
                            return (
                                <div 
                                    key={index} 
                                    className={`report-item severity-${report.severity}`}
                                    onClick={() => setSelectedReport(selectedReport === index ? null : index)}
                                >
                                    <div className="report-item-header">
                                        <div className="report-type-badge" style={{ background: typeInfo.color }}>
                                            {typeInfo.icon} {typeInfo.label}
                                        </div>
                                        <div className="report-severity-badge" style={{ background: getSeverityColor(report.severity) }}>
                                            {getSeverityLabel(report.severity)}
                                        </div>
                                        <span className="report-time">
                                            <FaClock /> {getTimeAgo(report.created_at)}
                                        </span>
                                    </div>
                                    <div className="report-item-body">
                                        <p>{report.description || `${report.report_type} reported`}</p>
                                        <div className="report-location">
                                            <FaMapMarkerAlt />
                                            <span>{report.location_lat.toFixed(4)}, {report.location_lng.toFixed(4)}</span>
                                        </div>
                                    </div>
                                    {selectedReport === index && (
                                        <div className="report-item-details">
                                            <div className="detail-row">
                                                <span className="detail-label"><FaUser /> Reported by:</span>
                                                <span className="detail-value">User #{report.user_id || 'Anonymous'}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label"><FaExclamationTriangle /> Severity:</span>
                                                <span className="detail-value" style={{ color: getSeverityColor(report.severity) }}>
                                                    {getSeverityLabel(report.severity)} ({report.severity}/5)
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label"><FaTrafficLight /> Type:</span>
                                                <span className="detail-value">{typeInfo.label}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label"><FaClock /> Reported:</span>
                                                <span className="detail-value">{new Date(report.created_at).toLocaleString()}</span>
                                            </div>
                                            {report.verified && (
                                                <div className="detail-row verified">
                                                    <FaCheckCircle /> Verified by community
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="traffic-tips">
                <h4><FaInfoCircle /> Reporting Tips</h4>
                <ul>
                    <li>Be specific about the location and nature of the incident</li>
                    <li>High severity reports (4-5) get priority visibility</li>
                    <li>Reports expire after 1 hour to keep information current</li>
                    <li>Use the map to pin the exact location of the incident</li>
                </ul>
            </div>
        </div>
    );
}

export default TrafficReports;
import React from 'react';
import { 
    FaCar, 
    FaTachometerAlt, 
    FaMap, 
    FaSave, 
    FaHistory, 
    FaTrafficLight, 
    FaCog, 
    FaSignOutAlt,
    FaChevronLeft,
    FaChevronRight,
    FaCloudSun
} from 'react-icons/fa';

function Sidebar({ activeTab, setActiveTab, onLogout, isOpen, toggleSidebar }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
        { id: 'routes', label: 'Route Planner', icon: <FaMap /> },
        { id: 'saved', label: 'Saved Routes', icon: <FaSave /> },
        { id: 'history', label: 'History', icon: <FaHistory /> },
        { id: 'traffic', label: 'Traffic Reports', icon: <FaTrafficLight /> },
        { id: 'weather', label: 'Weather', icon: <FaCloudSun /> },  // Added Weather
        { id: 'settings', label: 'Settings', icon: <FaCog /> },
    ];

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-brand">
                <span className="brand-icon"><FaCar /></span>
                <span className={`brand-name ${!isOpen ? 'hidden' : ''}`}>TrafficRoute</span>
                <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                    {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
                </button>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className={`sidebar-label ${!isOpen ? 'hidden' : ''}`}>{item.label}</span>
                    </button>
                ))}
            </nav>
            <button className="sidebar-logout" onClick={onLogout}>
                <span className="sidebar-icon"><FaSignOutAlt /></span>
                <span className={`sidebar-label ${!isOpen ? 'hidden' : ''}`}>Logout</span>
            </button>
        </div>
    );
}

export default Sidebar;
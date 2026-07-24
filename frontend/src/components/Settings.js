import React, { useState } from 'react';
import { FaSun, FaMoon, FaBell, FaSave, FaInfoCircle, FaCog } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

function Settings() {
    const { darkMode, toggleDarkMode } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [autoSave, setAutoSave] = useState(false);

    return (
        <div className="settings-container">
            <h3><FaCog /> Settings</h3>
            
            <div className="settings-section">
                <h4>Appearance</h4>
                <div className="setting-item">
                    <div className="setting-info">
                        <span className="setting-label"><FaSun /> Dark Mode</span>
                        <span className="setting-desc">Toggle dark/light theme</span>
                    </div>
                    <button 
                        className={`toggle-btn ${darkMode ? 'active' : ''}`}
                        onClick={toggleDarkMode}
                    >
                        {darkMode ? <FaMoon /> : <FaSun />}
                    </button>
                </div>
            </div>

            <div className="settings-section">
                <h4>Preferences</h4>
                <div className="setting-item">
                    <div className="setting-info">
                        <span className="setting-label"><FaBell /> Notifications</span>
                        <span className="setting-desc">Receive route updates</span>
                    </div>
                    <button 
                        className={`toggle-btn ${notifications ? 'active' : ''}`}
                        onClick={() => setNotifications(!notifications)}
                    >
                        {notifications ? 'ON' : 'OFF'}
                    </button>
                </div>
                
                <div className="setting-item">
                    <div className="setting-info">
                        <span className="setting-label"><FaSave /> Auto Save Routes</span>
                        <span className="setting-desc">Automatically save calculated routes</span>
                    </div>
                    <button 
                        className={`toggle-btn ${autoSave ? 'active' : ''}`}
                        onClick={() => setAutoSave(!autoSave)}
                    >
                        {autoSave ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            <div className="settings-section">
                <h4>About</h4>
                <div className="about-info">
                    <p><FaInfoCircle /> <strong>TrafficRoute</strong> v1.0.0</p>
                    <p>Smart Navigation for Tanzania</p>
                    <p className="about-copy">© 2024 TrafficRoute. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

export default Settings;
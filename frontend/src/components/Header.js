import React from 'react';
import { FaBars, FaSun, FaMoon, FaUserCircle } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

function Header({ user, toggleSidebar, sidebarOpen }) {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <header className="dashboard-header">
            <div className="header-left">
                <button className="menu-toggle-btn" onClick={toggleSidebar}>
                    <FaBars />
                </button>
                <div>
                    <h2>Welcome back, {user?.username || 'User'}!</h2>
                    <span className="header-date">{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
            </div>
            <div className="header-right">
                <button className="theme-toggle" onClick={toggleDarkMode}>
                    {darkMode ? <FaSun /> : <FaMoon />}
                </button>
                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.username?.charAt(0).toUpperCase() || <FaUserCircle />}
                    </div>
                    <span className="user-name">{user?.username}</span>
                </div>
            </div>
        </header>
    );
}

export default Header;
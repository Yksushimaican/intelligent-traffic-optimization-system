import React, { useState } from 'react';
import { FaCar, FaSun, FaMoon, FaEnvelope, FaLock, FaUser, FaArrowRight, FaMapMarkedAlt, FaCloudSun, FaSave } from 'react-icons/fa';
import { authAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function LoginPage({ onLogin }) {
    const { darkMode, toggleDarkMode } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        
        try {
            if (isLogin) {
                const response = await authAPI.login({ email, password });
                if (response.data.success) {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    onLogin(response.data.user);
                } else {
                    setError(response.data.error || 'Login failed');
                }
            } else {
                await authAPI.register({ username, email, password });
                setSuccess('Registration successful! Please login.');
                setIsLogin(true);
                setPassword('');
                setUsername('');
                setEmail('');
            }
        } catch (err) {
            console.error('Auth error:', err);
            const errorMessage = err.response?.data?.error || 'Authentication failed. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className={`login-page ${darkMode ? 'dark' : ''}`}>
            <button className="theme-toggle-login" onClick={toggleDarkMode}>
                {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            
            <div className="login-container">
                <div className="login-brand">
                    <div className="brand-icon">
                        <FaCar />
                    </div>
                    <h1>TrafficRoute</h1>
                    <p>Smart Navigation for Tanzania</p>
                </div>
                
                <div className="login-box">
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="login-subtitle">
                        {isLogin ? 'Login to access your routes' : 'Start saving your routes today'}
                    </p>
                    
                    {success && (
                        <div className="login-success">{success}</div>
                    )}
                    
                    {error && (
                        <div className="login-error">{error}</div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="form-group">
                                <label><FaUser className="input-icon" /> Username</label>
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label><FaEnvelope className="input-icon" /> Email Address</label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label><FaLock className="input-icon" /> Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength="6"
                            />
                        </div>
                        
                        <button type="submit" disabled={loading} className="login-btn-primary">
                            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
                            <FaArrowRight className="btn-icon" />
                        </button>
                    </form>
                    
                    <div className="login-footer">
                        <button 
                            className="switch-mode-btn"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccess('');
                            }}
                        >
                            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                        </button>
                    </div>
                </div>
                
                <div className="login-features">
                    <div className="feature-item">
                        <FaMapMarkedAlt />
                        <span>Real-time route optimization</span>
                    </div>
                    <div className="feature-item">
                        <FaCloudSun />
                        <span>Weather-aware navigation</span>
                    </div>
                    <div className="feature-item">
                        <FaSave />
                        <span>Save and manage routes</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
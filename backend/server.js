const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// CORS CONFIGURATION
// ============================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// DATABASE CONNECTION
// ============================================================
const pool = new Pool({
    user: process.env.DB_USER || 'traffic_admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'traffic_system',
    password: process.env.DB_PASSWORD || 'traffic123',
    port: process.env.DB_PORT || 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateETA(distanceKm, trafficLevel) {
    const speeds = {
        'low': 40,
        'moderate': 25,
        'heavy': 15,
        'gridlock': 5
    };
    const speed = speeds[trafficLevel] || 25;
    return Math.round((distanceKm / speed) * 60);
}

function getTrafficLevel(lat, lng) {
    const now = new Date();
    const hour = now.getHours();
    const isPeakMorning = hour >= 7 && hour <= 9;
    const isPeakEvening = hour >= 16 && hour <= 19;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isDarArea = lat >= -7.0 && lat <= -6.5 && lng >= 39.0 && lng <= 39.5;
    
    if (isWeekend) return 'low';
    if (isPeakMorning || isPeakEvening) {
        if (isDarArea) return 'heavy';
        return 'moderate';
    }
    return 'low';
}

function getWeatherImpact(weatherCondition) {
    const impacts = {
        'clear': { factor: 1.0, description: 'none' },
        'rain': { factor: 1.3, description: 'rain' },
        'storm': { factor: 1.5, description: 'storm' },
        'flood': { factor: 2.0, description: 'flood' }
    };
    return impacts[weatherCondition] || impacts['clear'];
}

async function getWeatherData(lat, lng) {
    try {
        const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
        
        if (WEATHER_API_KEY && WEATHER_API_KEY !== 'your_openweathermap_api_key_here') {
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`
            );
            return {
                condition: response.data.weather[0].main.toLowerCase(),
                temperature: Math.round(response.data.main.temp),
                humidity: response.data.main.humidity,
                wind_speed: response.data.wind.speed,
                rain_mm: response.data.rain?.['1h'] || 0
            };
        }
        
        const hour = new Date().getHours();
        let condition = 'clear';
        let temperature = 28;
        if (hour >= 6 && hour <= 18) {
            temperature = 30 + Math.floor(Math.random() * 5);
        } else {
            temperature = 22 + Math.floor(Math.random() * 3);
        }
        if (Math.random() < 0.2) {
            condition = 'rain';
            temperature = temperature - 3;
        }
        return { condition, temperature, humidity: 65, wind_speed: 12, rain_mm: 0 };
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        return { condition: 'clear', temperature: 28, humidity: 65, wind_speed: 12, rain_mm: 0 };
    }
}

function isValidLatLng(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    return !isNaN(latNum) && !isNaN(lngNum);
}

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Intelligent Traffic System Backend Running',
        timestamp: new Date().toISOString()
    });
});

// Register user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('Registration attempt:', { username, email });
        
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }
        
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username or email already exists'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );
        
        console.log('User registered:', result.rows[0]);
        
        res.status(201).json({
            success: true,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed: ' + error.message
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt:', { email });
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secretkey123',
            { expiresIn: '24h' }
        );
        
        console.log('User logged in:', user.username);
        
        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// Route optimization
app.post('/api/routes/optimize', async (req, res) => {
    try {
        const { start_lat, start_lng, end_lat, end_lng } = req.body;
        
        if (!isValidLatLng(start_lat, start_lng) || !isValidLatLng(end_lat, end_lng)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const sLat = parseFloat(start_lat);
        const sLng = parseFloat(start_lng);
        const eLat = parseFloat(end_lat);
        const eLng = parseFloat(end_lng);

        let path = [[sLat, sLng], [eLat, eLng]];
        let distanceKm = calculateDistance(sLat, sLng, eLat, eLng);
        let trafficLevel = getTrafficLevel(sLat, sLng);
        let weather = await getWeatherData(sLat, sLng);
        let weatherImpact = getWeatherImpact(weather.condition);
        let etaMinutes = calculateETA(distanceKm, trafficLevel);
        let adjustedEtaMinutes = Math.round(etaMinutes * weatherImpact.factor);

        // Try OSRM for real road routing
        try {
            const osrmResponse = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&steps=true`,
                { timeout: 10000 }
            );
            
            if (osrmResponse.data && osrmResponse.data.routes && osrmResponse.data.routes.length > 0) {
                const route = osrmResponse.data.routes[0];
                const coords = route.geometry.coordinates
                    .filter(coord => Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1]))
                    .map(coord => [parseFloat(coord[1]), parseFloat(coord[0])]);
                
                if (coords.length >= 2) {
                    path = coords;
                    distanceKm = route.distance / 1000;
                    etaMinutes = route.duration / 60;
                    adjustedEtaMinutes = Math.round(etaMinutes * weatherImpact.factor);
                }
            }
        } catch (osrmError) {
            console.error('OSRM routing error:', osrmError.message);
        }
        
        res.json({
            path: path,
            distance_km: parseFloat(distanceKm.toFixed(1)),
            eta_minutes: adjustedEtaMinutes,
            traffic_level: trafficLevel,
            weather_impact: weatherImpact.description,
            weather_condition: weather.condition,
            temperature: weather.temperature,
            humidity: weather.humidity,
            wind_speed: weather.wind_speed,
            start_point: { lat: sLat, lng: sLng },
            end_point: { lat: eLat, lng: eLng }
        });
        
    } catch (error) {
        console.error('Route optimization error:', error);
        res.status(500).json({ error: 'Failed to calculate route' });
    }
});

// Save route
app.post('/api/routes/save', async (req, res) => {
    try {
        const { user_id, route_name, start_lat, start_lng, end_lat, end_lng, distance, eta, start_name, end_name } = req.body;
        
        if (!user_id || !start_lat || !start_lng || !end_lat || !end_lng) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await pool.query(
            `INSERT INTO saved_routes 
             (user_id, route_name, start_lat, start_lng, end_lat, end_lng, distance_km, eta_minutes, start_name, end_name) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [user_id, route_name || 'Untitled Route', parseFloat(start_lat), parseFloat(start_lng), parseFloat(end_lat), parseFloat(end_lng), parseFloat(distance) || 0, parseInt(eta) || 0, start_name || null, end_name || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Route saved successfully',
            saved_route: result.rows[0]
        });
        
    } catch (error) {
        console.error('Save route error:', error);
        res.status(500).json({
            error: 'Failed to save route',
            details: error.message
        });
    }
});

// Get saved routes
app.get('/api/routes/saved/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM saved_routes WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get saved routes error:', error);
        res.status(500).json({
            error: 'Failed to fetch saved routes',
            details: error.message
        });
    }
});

// Delete saved route
app.delete('/api/routes/saved/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
        
        const result = await pool.query(
            'DELETE FROM saved_routes WHERE id = $1 RETURNING *',
            [routeId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        res.json({ success: true, message: 'Route deleted successfully' });
        
    } catch (error) {
        console.error('Delete route error:', error);
        res.status(500).json({ error: 'Failed to delete route' });
    }
});

// Traffic report
app.post('/api/traffic/report', async (req, res) => {
    try {
        const { user_id, location_lat, location_lng, report_type, severity, description } = req.body;
        
        if (!location_lat || !location_lng || !report_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await pool.query(
            `INSERT INTO traffic_reports 
             (user_id, location_lat, location_lng, report_type, severity, description) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [user_id || null, parseFloat(location_lat), parseFloat(location_lng), report_type, severity || 3, description || '']
        );
        
        res.status(201).json({ success: true, report: result.rows[0] });
        
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// Get traffic reports
app.get('/api/traffic/reports', async (req, res) => {
    try {
        const { lat, lng, radius_km = 2 } = req.query;
        
        const result = await pool.query(
            'SELECT * FROM traffic_reports WHERE created_at > NOW() - INTERVAL \'1 hour\' ORDER BY created_at DESC LIMIT 50'
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Weather
app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing coordinates' });
        }
        
        const weatherData = await getWeatherData(parseFloat(lat), parseFloat(lng));
        res.json(weatherData);
        
    } catch (error) {
        console.error('Weather error:', error);
        res.status(500).json({ error: 'Weather fetch failed' });
    }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API Endpoints:');
    console.log('  GET  /api/health');
    console.log('  POST /api/auth/register');
    console.log('  POST /api/auth/login');
    console.log('  POST /api/routes/optimize');
    console.log('  POST /api/routes/save');
    console.log('  GET  /api/routes/saved/:userId');
    console.log('  DELETE /api/routes/saved/:routeId');
    console.log('  POST /api/traffic/report');
    console.log('  GET  /api/traffic/reports');
    console.log('  GET  /api/weather');
});
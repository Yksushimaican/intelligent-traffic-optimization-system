const { Pool } = require('pg');
require('dotenv').config();

// Connect as postgres superuser
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'admin123', // Change this to your postgres password
    port: 5432,
});

async function resetDatabase() {
    try {
        console.log('Connecting as postgres superuser...');
        
        // Terminate all connections to traffic_system
        console.log('Terminating existing connections...');
        await pool.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'traffic_system'
            AND pid <> pg_backend_pid();
        `);
        
        // Drop database
        console.log('Dropping database...');
        await pool.query('DROP DATABASE IF EXISTS traffic_system');
        
        // Create database
        console.log('Creating database...');
        await pool.query('CREATE DATABASE traffic_system');
        
        console.log('✅ Database reset complete!');
        
        // Connect to new database and create tables
        console.log('Creating tables...');
        await createTables();
        
        console.log('✅ All done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function createTables() {
    const dbPool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'traffic_system',
        password: 'admin123', // Change this to your postgres password
        port: 5432,
    });

    try {
        // Create users table
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✅ users table created');

        // Create saved_routes table
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS saved_routes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                route_name VARCHAR(100),
                start_lat DECIMAL(10,8),
                start_lng DECIMAL(11,8),
                end_lat DECIMAL(10,8),
                end_lng DECIMAL(11,8),
                distance_km DECIMAL(10,2),
                eta_minutes INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✅ saved_routes table created');

        // Create traffic_reports table
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS traffic_reports (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                location_lat DECIMAL(10,8),
                location_lng DECIMAL(11,8),
                report_type VARCHAR(50),
                severity INTEGER CHECK (severity BETWEEN 1 AND 5),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified BOOLEAN DEFAULT FALSE
            );
        `);
        console.log('  ✅ traffic_reports table created');

        // Grant permissions to traffic_admin
        await dbPool.query(`
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO traffic_admin;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO traffic_admin;
            GRANT USAGE ON SCHEMA public TO traffic_admin;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO traffic_admin;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO traffic_admin;
        `);
        console.log('  ✅ permissions granted to traffic_admin');

        await dbPool.end();
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        await dbPool.end();
        throw error;
    }
}

// Run the reset
resetDatabase();
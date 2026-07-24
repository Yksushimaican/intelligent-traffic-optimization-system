# TrafficRoute - Intelligent Traffic Route Optimization System

## Overview
TrafficRoute is an intelligent web-based traffic and route optimization system designed specifically for Tanzania's urban mobility challenges. The system combines real-time traffic analysis, weather monitoring, and community-driven traffic reporting to provide optimal route recommendations.

## Problem Statement
Dar es Salaam faces severe traffic congestion costing TZS 4 billion daily, with commuters losing 2.5 hours each day in gridlock. Existing navigation systems fail to address localized challenges such as informal diversions, flood-prone roads, and weather impacts.

## Key Features

| Feature | Description |
|---------|-------------|
| **Real Road Routing** | Routes follow actual roads using OSRM (Open Source Routing Machine) |
| **Weather Integration** | Real-time weather conditions and 7-day forecasts via Open-Meteo API |
| **GPS Tracking** | Live location tracking with turn-by-turn voice navigation |
| **Traffic Reports** | Community-driven incident reporting (accidents, floods, road works) |
| **Saved Routes** | Save and manage frequently used routes |
| **Route History** | View past trips with location names |
| **Location Intelligence** | Full address with area, city, region using GeoNames |
| **Dark/Light Mode** | User preference theme toggle |
| **Modern UI** | Uber-inspired design for intuitive user experience |

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18.2.0 | UI Framework |
| React-Leaflet 4.2.1 | Interactive map rendering |
| Font Awesome 5.0.1 | Icon library |
| Axios 1.6.0 | HTTP client |
| Fuse.js 7.0.0 | Fuzzy search for autocomplete |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 18.x | JavaScript runtime |
| Express 4.18.0 | Web framework |
| PostgreSQL 16.x | Relational database |
| bcryptjs 2.4.0 | Password hashing |
| jsonwebtoken 9.0.0 | JWT authentication |

### External APIs
| API | Purpose |
|-----|---------|
| OSRM | Road routing |
| Nominatim | Geocoding |
| GeoNames | Place names |
| Open-Meteo | Weather data |
| OpenStreetMap | Map tiles |

## System Architecture

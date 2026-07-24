import axios from 'axios';

class LocationIntelligence {
    constructor() {
        this.cache = new Map();
        this.geoNamesUsername = 'trafficroute'; // Register at geonames.org
    }

    // ============================================================
    // 1. BROWER GPS API - Get Current Location
    // ============================================================
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        altitude: position.coords.altitude,
                        timestamp: position.timestamp
                    };
                    resolve(location);
                },
                (error) => {
                    reject(new Error(error.message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    watchPosition(onUpdate, onError) {
        if (!navigator.geolocation) {
            onError(new Error('Geolocation is not supported'));
            return null;
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    altitude: position.coords.altitude,
                    timestamp: position.timestamp
                };
                onUpdate(location);
            },
            (error) => {
                onError(new Error(error.message));
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 60000
            }
        );
    }

    // ============================================================
    // 2. GEONAMES - Convert coordinates to place names
    // ============================================================
    async reverseGeocodeGeoNames(lat, lng) {
        try {
            const response = await axios.get(
                `http://api.geonames.org/reverseGeocodeJSON?lat=${lat}&lng=${lng}&username=${this.geoNamesUsername}`
            );
            
            if (response.data && response.data.address) {
                const address = response.data.address;
                return {
                    name: address.placeName || address.city || address.town || address.village,
                    city: address.city || address.town || address.village,
                    region: address.adminName1,
                    country: address.countryName || 'Tanzania',
                    postalCode: address.postalCode,
                    fullAddress: `${address.placeName || ''}, ${address.city || ''}, ${address.adminName1 || ''}, Tanzania`
                };
            }
            return null;
        } catch (error) {
            console.error('GeoNames reverse geocode error:', error);
            return null;
        }
    }

    // ============================================================
    // 3. GEONAMES - Search for places
    // ============================================================
    async searchGeoNames(query) {
        try {
            const response = await axios.get(
                `http://api.geonames.org/searchJSON?q=${encodeURIComponent(query)}&country=TZ&maxRows=10&username=${this.geoNamesUsername}`
            );
            
            if (response.data && response.data.geonames) {
                return response.data.geonames.map(place => ({
                    name: place.name,
                    fullName: place.fullName || place.name,
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lng),
                    type: place.fcodeName || place.fclName,
                    population: place.population || 0,
                    country: place.countryName,
                    region: place.adminName1,
                    featureCode: place.fcode
                }));
            }
            return [];
        } catch (error) {
            console.error('GeoNames search error:', error);
            return [];
        }
    }

    // ============================================================
    // 4. GEONAMES - Get hierarchical location data
    // ============================================================
    async getLocationHierarchy(lat, lng) {
        try {
            const response = await axios.get(
                `http://api.geonames.org/findNearbyJSON?lat=${lat}&lng=${lng}&username=${this.geoNamesUsername}`
            );
            
            if (response.data && response.data.geonames) {
                const places = response.data.geonames;
                return {
                    local: places.find(p => p.fcode === 'PPL') || places[0],
                    admin: places.find(p => p.fcode === 'ADM1'),
                    country: places.find(p => p.fcode === 'PCLI')
                };
            }
            return null;
        } catch (error) {
            console.error('GeoNames hierarchy error:', error);
            return null;
        }
    }

    // ============================================================
    // 5. WHOS ON FIRST - Administrative boundaries
    // ============================================================
    async getAdministrativeBoundaries(lat, lng) {
        try {
            // WOF API endpoint (using their service)
            const response = await axios.get(
                `https://api.whosonfirst.org/places/${lat},${lng}`
            );
            
            if (response.data && response.data.places) {
                return response.data.places.map(place => ({
                    id: place.id,
                    name: place.name,
                    placetype: place.placetype,
                    country: place.country,
                    region: place.region,
                    locality: place.locality,
                    neighbourhood: place.neighbourhood
                }));
            }
            return null;
        } catch (error) {
            console.error('WOF API error:', error);
            // Fallback: Use GeoNames
            return this.getLocationHierarchy(lat, lng);
        }
    }

    // ============================================================
    // 6. OPENADDRESSES - Get address details
    // ============================================================
    async getAddressDetails(lat, lng) {
        try {
            // OpenAddresses API (using their service)
            const response = await axios.get(
                `https://api.openaddresses.io/v1/addresses?lat=${lat}&lng=${lng}&radius=50`
            );
            
            if (response.data && response.data.addresses) {
                return response.data.addresses.map(addr => ({
                    number: addr.number,
                    street: addr.street,
                    city: addr.city,
                    region: addr.region,
                    postalCode: addr.postcode,
                    country: addr.country,
                    fullAddress: `${addr.number || ''} ${addr.street || ''}, ${addr.city || ''}`
                }));
            }
            return [];
        } catch (error) {
            console.error('OpenAddresses error:', error);
            return [];
        }
    }

    // ============================================================
    // 7. COMPLETE LOCATION INTELLIGENCE - Combine all services
    // ============================================================
    async getCompleteLocationInfo(lat, lng) {
        const result = {
            coordinates: { lat, lng },
            gps: null,
            geonames: null,
            hierarchy: null,
            addresses: [],
            openStreetMap: null
        };

        // Get GPS info
        result.gps = {
            lat: lat,
            lng: lng,
            timestamp: new Date().toISOString()
        };

        // Get GeoNames data
        try {
            const geonames = await this.reverseGeocodeGeoNames(lat, lng);
            if (geonames) {
                result.geonames = geonames;
            }
        } catch (e) {
            console.error('GeoNames error:', e);
        }

        // Get hierarchy data
        try {
            const hierarchy = await this.getLocationHierarchy(lat, lng);
            if (hierarchy) {
                result.hierarchy = hierarchy;
            }
        } catch (e) {
            console.error('Hierarchy error:', e);
        }

        // Get address details
        try {
            const addresses = await this.getAddressDetails(lat, lng);
            if (addresses.length > 0) {
                result.addresses = addresses;
            }
        } catch (e) {
            console.error('OpenAddresses error:', e);
        }

        return result;
    }

    // ============================================================
    // 8. TRAFFIC DETECTION - Analyze speed data
    // ============================================================
    analyzeTraffic(speed, roadType = 'urban') {
        // Speed thresholds based on road type
        const thresholds = {
            highway: { light: 80, moderate: 50, heavy: 30 },
            urban: { light: 40, moderate: 25, heavy: 15 },
            rural: { light: 60, moderate: 35, heavy: 20 }
        };

        const t = thresholds[roadType] || thresholds.urban;

        if (speed >= t.light) return { level: 'light', color: '#4CAF50', label: 'Light Traffic' };
        if (speed >= t.moderate) return { level: 'moderate', color: '#FFC107', label: 'Moderate Traffic' };
        if (speed >= t.heavy) return { level: 'heavy', color: '#FF9800', label: 'Heavy Traffic' };
        return { level: 'gridlock', color: '#F44336', label: 'Gridlock' };
    }

    // ============================================================
    // 9. SPEED-BASED TRAFFIC ANALYSIS
    // ============================================================
    calculateTrafficFromSpeeds(speeds) {
        if (!speeds || speeds.length === 0) {
            return { level: 'unknown', color: '#757575', label: 'Unknown' };
        }

        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        return this.analyzeTraffic(avgSpeed);
    }

    // ============================================================
    // 10. FORMAT FOR DISPLAY
    // ============================================================
    formatLocationForDisplay(locationInfo) {
        if (!locationInfo) return 'Unknown Location';

        const parts = [];
        if (locationInfo.geonames?.name) parts.push(locationInfo.geonames.name);
        if (locationInfo.geonames?.city) parts.push(locationInfo.geonames.city);
        if (locationInfo.geonames?.region) parts.push(locationInfo.geonames.region);
        if (locationInfo.geonames?.country) parts.push(locationInfo.geonames.country);

        if (parts.length === 0) {
            return `${locationInfo.coordinates.lat.toFixed(4)}, ${locationInfo.coordinates.lng.toFixed(4)}`;
        }

        return parts.join(', ');
    }
}

export default new LocationIntelligence();
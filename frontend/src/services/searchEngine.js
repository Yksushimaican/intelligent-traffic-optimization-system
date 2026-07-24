import axios from 'axios';
import Fuse from 'fuse.js';

class SearchEngine {
    constructor() {
        this.cache = new Map();
        this.searchHistory = this.loadHistory();
        this.popularPlaces = this.loadPopularPlaces();
        this.trie = {};
        this.fuseInstance = null;
        this.searchRadius = 0.5; // Start with 500m radius
        this.maxRadius = 50; // Max 50km
        this.radiusIncrement = 0.5;
    }

    // ============================================================
    // 1. LOAD DATA
    // ============================================================
    loadHistory() {
        try {
            const saved = localStorage.getItem('searchHistory');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    loadPopularPlaces() {
        try {
            const saved = localStorage.getItem('popularPlaces');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }

    savePopularPlaces() {
        try {
            localStorage.setItem('popularPlaces', JSON.stringify(this.popularPlaces));
        } catch (e) {
            console.error('Failed to save popular places:', e);
        }
    }

    // ============================================================
    // 2. GEOCODING - Convert text to coordinates
    // ============================================================
    async geocode(query) {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=15&countrycodes=TZ&dedupe=1`
            );
            
            return response.data.map(place => {
                const addr = place.address || {};
                const areaParts = [];
                
                if (addr.suburb) areaParts.push(addr.suburb);
                else if (addr.neighbourhood) areaParts.push(addr.neighbourhood);
                
                if (addr.city) areaParts.push(addr.city);
                else if (addr.town) areaParts.push(addr.town);
                else if (addr.village) areaParts.push(addr.village);
                else if (addr.municipality) areaParts.push(addr.municipality);
                
                if (addr.state) areaParts.push(addr.state);
                else if (addr.region) areaParts.push(addr.region);
                else if (addr.county) areaParts.push(addr.county);
                
                if (addr.country) areaParts.push(addr.country);
                
                const fullAddress = areaParts.length > 0 ? areaParts.join(', ') : place.display_name;
                
                return {
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    displayName: place.display_name,
                    fullAddress: fullAddress,
                    type: place.type || place.class,
                    importance: place.importance || 0,
                    address: addr,
                    raw: place,
                    displayText: fullAddress,
                    areaParts: areaParts
                };
            });
        } catch (error) {
            console.error('Geocoding error:', error);
            return [];
        }
    }

    // ============================================================
    // 3. REVERSE GEOCODING - Convert coordinates to text
    // ============================================================
    async reverseGeocode(lat, lng) {
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
            );
            return response.data;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    }

    // ============================================================
    // 4. AUTOCOMPLETE - Trie-based prefix search
    // ============================================================
    buildTrie(places) {
        const trie = {};
        for (const place of places) {
            const name = place.displayName.toLowerCase();
            let node = trie;
            for (const char of name) {
                if (!node[char]) node[char] = {};
                node = node[char];
            }
            node.isEnd = true;
            node.place = place;
        }
        return trie;
    }

    searchTrie(prefix) {
        const lower = prefix.toLowerCase();
        let node = this.trie;
        for (const char of lower) {
            if (!node[char]) return [];
            node = node[char];
        }
        return this.collectAll(node);
    }

    collectAll(node) {
        const results = [];
        if (node.isEnd && node.place) {
            results.push(node.place);
        }
        for (const key of Object.keys(node)) {
            if (key !== 'isEnd' && key !== 'place') {
                results.push(...this.collectAll(node[key]));
            }
        }
        return results;
    }

    // ============================================================
    // 5. FUZZY MATCHING - Using Fuse.js
    // ============================================================
    initFuse(places) {
        const options = {
            includeScore: true,
            keys: ['displayName', 'fullAddress'],
            threshold: 0.4,
            distance: 100
        };
        this.fuseInstance = new Fuse(places, options);
    }

    fuzzySearch(query, candidates) {
        if (!query || query.length < 2) return candidates;
        
        if (this.fuseInstance) {
            const results = this.fuseInstance.search(query);
            return results.map(r => ({
                ...r.item,
                fuzzyScore: r.score || 0,
                fuzzyMatch: r.score < 0.4
            }));
        }
        
        return candidates.map(candidate => {
            const distance = this.levenshteinDistance(
                query.toLowerCase(),
                candidate.displayName.toLowerCase()
            );
            return {
                ...candidate,
                fuzzyScore: distance,
                fuzzyMatch: distance <= 3
            };
        });
    }

    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i-1] === a[j-1]) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // ============================================================
    // 6. RANKING ALGORITHM - Uber/Bolt style scoring
    // ============================================================
    rankResults(results, query, userLocation) {
        const queryLower = query.toLowerCase();
        
        return results.map(place => {
            let score = 0;
            const nameLower = place.displayName.toLowerCase();
            const type = place.type || place.class;

            // A. Relevance Score (text matching)
            if (nameLower.includes(queryLower)) {
                score += 20;
            }
            if (nameLower.startsWith(queryLower)) {
                score += 10;
            }

            // B. Type Priority (Uber/Bolt style)
            const typePriority = {
                'road': 25,
                'street': 25,
                'highway': 20,
                'city': 18,
                'town': 16,
                'suburb': 14,
                'neighbourhood': 12,
                'amenity': 10,
                'shop': 8,
                'restaurant': 8,
                'school': 10,
                'hospital': 12,
                'university': 10
            };
            score += typePriority[type] || 5;

            // C. Importance from Nominatim
            if (place.importance) {
                score += place.importance * 15;
            }

            // D. Distance from user (closer = higher score)
            if (userLocation) {
                const distance = this.calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    place.lat,
                    place.lng
                );
                place.distance = distance;
                
                // Dynamic radius expansion scoring
                if (distance < 0.5) score += 20;
                else if (distance < 1) score += 15;
                else if (distance < 2) score += 12;
                else if (distance < 3) score += 10;
                else if (distance < 5) score += 7;
                else if (distance < 10) score += 5;
                else if (distance < 20) score += 3;
                else if (distance < 50) score += 1;
            }

            // E. Popularity Score
            const popScore = this.getPopularity(place.displayName);
            score += popScore * 3;

            // F. History Score
            const historyScore = this.getHistoryScore(place.displayName);
            score += historyScore * 2;

            // G. Fuzzy Match Bonus
            if (place.fuzzyMatch) {
                score += Math.max(0, 10 - (place.fuzzyScore || 0) * 2);
            }

            // H. Address completeness bonus
            if (place.areaParts && place.areaParts.length >= 2) {
                score += 5;
            }

            return {
                ...place,
                score: Math.round(score),
                rank: 0
            };
        }).sort((a, b) => b.score - a.score)
        .map((place, index) => ({
            ...place,
            rank: index + 1
        }));
    }

    // ============================================================
    // 7. POPULARITY TRACKING
    // ============================================================
    getPopularity(name) {
        const found = this.popularPlaces.find(p => p.name === name);
        return found ? found.count : 0;
    }

    getHistoryScore(name) {
        const found = this.searchHistory.find(h => h.name === name);
        return found ? found.count : 0;
    }

    incrementPopularity(name) {
        const found = this.popularPlaces.find(p => p.name === name);
        if (found) {
            found.count += 1;
            found.lastSelected = new Date().toISOString();
        } else {
            this.popularPlaces.push({
                name: name,
                count: 1,
                lastSelected: new Date().toISOString()
            });
        }
        this.savePopularPlaces();
    }

    addToHistory(place) {
        const entry = {
            ...place,
            count: 1,
            timestamp: new Date().toISOString()
        };
        
        const existing = this.searchHistory.find(h => h.name === place.name);
        if (existing) {
            existing.count += 1;
            existing.timestamp = new Date().toISOString();
        } else {
            this.searchHistory.unshift(entry);
            if (this.searchHistory.length > 50) {
                this.searchHistory.pop();
            }
        }
        this.saveHistory();
        this.incrementPopularity(place.name);
    }

    // ============================================================
    // 8. DYNAMIC RADIUS EXPANSION - Uber/Bolt style
    // ============================================================
    expandSearchRadius(originalResults, query, userLocation) {
        if (originalResults.length >= 5) return originalResults;
        
        // Expand radius incrementally
        let expandedResults = [...originalResults];
        let currentRadius = this.searchRadius;
        
        while (expandedResults.length < 5 && currentRadius <= this.maxRadius) {
            currentRadius += this.radiusIncrement;
            // Search with larger radius
            // This would typically query the database with radius filter
            // For now, we keep the results we have
        }
        
        return expandedResults;
    }

    // ============================================================
    // 9. EVENT DETECTION - Detect popular/temporary areas
    // ============================================================
    detectEvents(results) {
        const events = [];
        const nameCount = {};
        
        for (const place of results) {
            const name = place.displayName.split(',')[0].trim();
            nameCount[name] = (nameCount[name] || 0) + 1;
        }

        for (const [name, count] of Object.entries(nameCount)) {
            if (count >= 3) {
                const place = results.find(p => p.displayName.includes(name));
                if (place) {
                    events.push({
                        ...place,
                        isEvent: true,
                        eventType: 'popular_area',
                        displayText: `${name} 🔥 Popular Area`,
                        score: 100 + count * 5,
                        rank: 0
                    });
                }
            }
        }

        return events;
    }

    // ============================================================
    // 10. MAIN SEARCH FUNCTION - Full Uber/Bolt pipeline
    // ============================================================
    async search(query, userLocation = null, options = {}) {
        const { limit = 10, fuzzyThreshold = 3 } = options;
        
        if (!query || query.length < 2) {
            return [];
        }

        // Step 1: Geocoding - Convert text to coordinates
        let results = await this.geocode(query);
        
        if (results.length === 0) {
            return [];
        }

        // Step 2: Build Fuse instance for fuzzy matching
        this.initFuse(results);

        // Step 3: Fuzzy Matching - Handle spelling mistakes
        results = this.fuzzySearch(query, results);

        // Step 4: Ranking - Score and sort results
        results = this.rankResults(results, query, userLocation);

        // Step 5: Apply fuzzy threshold filter
        results = results.filter(r => {
            if (r.fuzzyMatch !== undefined) {
                return r.fuzzyMatch || (r.fuzzyScore || 0) <= fuzzyThreshold;
            }
            return true;
        });

        // Step 6: Dynamic radius expansion
        results = this.expandSearchRadius(results, query, userLocation);

        // Step 7: Detect temporary events/popular areas
        const events = this.detectEvents(results);
        if (events.length > 0) {
            results.push(...events);
        }

        // Step 8: Return top results
        return results.slice(0, limit);
    }

    // ============================================================
    // 11. GET SUGGESTIONS - For autocomplete with ranking
    // ============================================================
    async getSuggestions(query, userLocation = null) {
        if (!query || query.length < 2) {
            return [];
        }

        const results = await this.search(query, userLocation, { limit: 8 });
        
        return results.map(r => ({
            ...r,
            displayText: r.displayText || r.fullAddress || r.displayName,
            type: r.type || 'Location',
            distance: r.distance,
            score: r.score,
            rank: r.rank,
            isPopular: r.score > 30,
            isEvent: r.isEvent || false,
            fullAddress: r.fullAddress || r.displayName
        }));
    }

    // ============================================================
    // 12. HELPER: Distance calculation (Haversine)
    // ============================================================
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // ============================================================
    // 13. GET PLACE NAME FROM COORDINATES (with caching)
    // ============================================================
    async getPlaceNameFromCoords(lat, lng) {
        const cacheKey = `${lat},${lng}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const response = await this.reverseGeocode(lat, lng);
            if (response && response.address) {
                const addr = response.address;
                const areaParts = [];
                
                if (addr.suburb) areaParts.push(addr.suburb);
                else if (addr.neighbourhood) areaParts.push(addr.neighbourhood);
                
                if (addr.city) areaParts.push(addr.city);
                else if (addr.town) areaParts.push(addr.town);
                else if (addr.village) areaParts.push(addr.village);
                else if (addr.municipality) areaParts.push(addr.municipality);
                
                if (addr.state) areaParts.push(addr.state);
                else if (addr.region) areaParts.push(addr.region);
                else if (addr.county) areaParts.push(addr.county);
                
                if (addr.country) areaParts.push(addr.country);
                
                const placeName = areaParts.length > 0 ? areaParts.join(', ') : response.display_name;
                this.cache.set(cacheKey, placeName);
                return placeName;
            }
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            console.error('Reverse geocode error:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }
}

export default new SearchEngine();
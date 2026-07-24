import axios from 'axios';

class NavigationService {
    constructor() {
        this.currentRoute = null;
        this.currentStepIndex = 0;
        this.steps = [];
        this.listeners = [];
        this.isNavigating = false;
        this.watchId = null;
        this.currentLocation = null;
        this.routeProgress = 0;
        this.routeData = null;
        this.navigationActive = false;
    }

    // ============================================================
    // GPS TRACKING METHODS
    // ============================================================

    startTracking(onLocationUpdate, onError) {
        if (!navigator.geolocation) {
            if (onError) onError('Geolocation is not supported');
            return null;
        }

        this.isNavigating = true;

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed || 0,
                    heading: position.coords.heading || 0,
                    altitude: position.coords.altitude,
                    timestamp: position.timestamp
                };
                this.currentLocation = location;
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
                this.updateProgress(location);
            },
            (error) => {
                if (onError) onError(error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000
            }
        );

        return this.watchId;
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isNavigating = false;
        this.currentLocation = null;
        this.routeProgress = 0;
        this.navigationActive = false;
    }

    // ============================================================
    // GET REAL ROAD ROUTE USING OSRM
    // ============================================================
    async getRealRoute(startLat, startLng, endLat, endLng) {
        try {
            const response = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&annotations=true`
            );
            
            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const leg = route.legs[0];
                
                const path = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                const steps = leg.steps.map((step, index) => {
                    const distance = step.distance / 1000;
                    const duration = step.duration / 60;
                    const maneuver = step.maneuver;
                    const type = maneuver.type;
                    const modifier = maneuver.modifier || '';
                    const name = step.name || 'road';
                    
                    return {
                        id: index,
                        instruction: this.getTurnInstruction(type, modifier, name, distance),
                        distance: distance,
                        duration: duration,
                        maneuver: maneuver,
                        geometry: step.geometry,
                        position: maneuver.location ? [maneuver.location[1], maneuver.location[0]] : null,
                        name: name,
                        mode: step.mode || 'driving',
                        isLast: index === leg.steps.length - 1,
                        cumulativeDistance: step.distance / 1000,
                        cumulativeDuration: step.duration / 60
                    };
                });
                
                let cumDist = 0;
                let cumDur = 0;
                steps.forEach(step => {
                    cumDist += step.distance;
                    cumDur += step.duration;
                    step.cumulativeDistance = cumDist;
                    step.cumulativeDuration = cumDur;
                });
                
                this.routeData = {
                    path: path,
                    distance: route.distance / 1000,
                    duration: route.duration / 60,
                    steps: steps,
                    raw: route
                };
                
                this.steps = steps;
                this.currentRoute = this.routeData;
                this.currentStepIndex = 0;
                this.navigationActive = true;
                
                return this.routeData;
            }
            return null;
        } catch (error) {
            console.error('OSRM routing error:', error);
            return null;
        }
    }

    getTurnInstruction(type, modifier, name, distance) {
        const distStr = distance < 0.1 
            ? `${Math.round(distance * 1000)}m` 
            : `${distance.toFixed(1)}km`;
        
        const direction = this.getDirection(modifier);
        
        switch(type) {
            case 'depart':
                return `Head ${direction} on ${name} for ${distStr}`;
            case 'turn':
                return `Turn ${direction} onto ${name} in ${distStr}`;
            case 'new name':
                return `Continue onto ${name}`;
            case 'fork':
                return `Keep ${direction} at the fork onto ${name}`;
            case 'merge':
                return `Merge onto ${name}`;
            case 'roundabout':
                return `Enter roundabout and take exit onto ${name}`;
            case 'exit roundabout':
                return `Exit roundabout onto ${name}`;
            case 'arrive':
                return `You have arrived at your destination`;
            default:
                return `Continue on ${name}`;
        }
    }

    getDirection(modifier) {
        const map = {
            'left': 'left',
            'right': 'right',
            'slight left': 'slightly left',
            'slight right': 'slightly right',
            'sharp left': 'sharply left',
            'sharp right': 'sharply right',
            'straight': 'straight',
            'u-turn': 'a U-turn'
        };
        return map[modifier] || 'straight';
    }

    // ============================================================
    // NAVIGATION CONTROL METHODS
    // ============================================================

    startNavigation(routeData, onStepUpdate) {
        if (!routeData || !routeData.steps || routeData.steps.length === 0) {
            return false;
        }
        
        this.steps = routeData.steps;
        this.currentStepIndex = 0;
        this.navigationActive = true;
        this.routeData = routeData;
        
        if (onStepUpdate && this.steps[0]) {
            onStepUpdate(this.steps[0]);
        }
        
        return true;
    }

    getCurrentStep() {
        if (this.currentStepIndex < this.steps.length) {
            return this.steps[this.currentStepIndex];
        }
        return null;
    }

    getNextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            return this.steps[this.currentStepIndex + 1];
        }
        return null;
    }

    advanceStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            return this.getCurrentStep();
        }
        return null;
    }

    getRemainingSteps() {
        return this.steps.slice(this.currentStepIndex + 1);
    }

    getTotalSteps() {
        return this.steps.length;
    }

    getProgress() {
        if (this.steps.length === 0) return 0;
        return ((this.currentStepIndex + 1) / this.steps.length) * 100;
    }

    getRoutePath() {
        return this.routeData ? this.routeData.path : null;
    }

    getRouteDistance() {
        return this.routeData ? this.routeData.distance : 0;
    }

    getRouteDuration() {
        return this.routeData ? this.routeData.duration : 0;
    }

    // ============================================================
    // VOICE NAVIGATION
    // ============================================================

    speakInstruction(instruction, callback) {
        if (!('speechSynthesis' in window)) {
            if (callback) callback(false);
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(instruction);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            if (callback) callback(true);
        };
        
        utterance.onerror = () => {
            if (callback) callback(false);
        };
        
        window.speechSynthesis.speak(utterance);
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    addListener(callback) {
        if (!this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners(step) {
        this.listeners.forEach(callback => callback(step));
    }

    // ============================================================
    // UTILITY FUNCTIONS
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

    updateProgress(location) {
        if (!this.routeData || !location) return;
        // Simple progress tracking based on steps
        this.routeProgress = this.getProgress();
    }

    formatDistance(km) {
        if (km < 0.1) return `${Math.round(km * 1000)}m`;
        if (km < 1) return `${(km * 1000).toFixed(0)}m`;
        return `${km.toFixed(1)}km`;
    }

    formatTime(minutes) {
        if (minutes < 1) return '< 1 min';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}min`;
    }
}

export default new NavigationService();
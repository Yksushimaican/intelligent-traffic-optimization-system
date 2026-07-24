import axios from 'axios';
import searchEngine from './searchEngine';

class RouteService {
    async findRoute(startLat, startLng, endLat, endLng) {
        try {
            const response = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
            );
            
            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const distance = route.distance / 1000;
                const duration = route.duration / 60;
                const speed = distance / (duration / 60);
                
                return {
                    distance: distance,
                    duration: duration,
                    speed: speed,
                    path: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
                    steps: route.legs[0]?.steps || [],
                    eta: searchEngine.calculateETA(distance, speed),
                    raw: route
                };
            }
            return null;
        } catch (error) {
            console.error('Route finding error:', error);
            return null;
        }
    }

    async getAlternativeRoutes(startLat, startLng, endLat, endLng) {
        try {
            const response = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`
            );
            
            if (response.data && response.data.routes) {
                return response.data.routes.map((route, index) => {
                    const distance = route.distance / 1000;
                    const duration = route.duration / 60;
                    return {
                        id: index,
                        distance: distance,
                        duration: duration,
                        speed: distance / (duration / 60),
                        path: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
                        eta: searchEngine.calculateETA(distance, distance / (duration / 60)),
                        isAlternative: index > 0
                    };
                });
            }
            return [];
        } catch (error) {
            console.error('Alternative routes error:', error);
            return [];
        }
    }
}

export default new RouteService();
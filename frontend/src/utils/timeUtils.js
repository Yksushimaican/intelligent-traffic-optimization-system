export function formatTime(minutes) {
    if (minutes < 1) {
        return 'Less than a minute';
    }
    
    if (minutes < 60) {
        return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = minutes / 60;
    if (hours < 24) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (m === 0) {
            return `${h} hour${h !== 1 ? 's' : ''}`;
        }
        return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
    }
    
    const days = hours / 24;
    if (days < 7) {
        const d = Math.floor(days);
        const h = Math.round((days - d) * 24);
        if (h === 0) {
            return `${d} day${d !== 1 ? 's' : ''}`;
        }
        return `${d} day${d !== 1 ? 's' : ''} ${h} hour${h !== 1 ? 's' : ''}`;
    }
    
    const weeks = days / 7;
    if (weeks < 4) {
        const w = Math.floor(weeks);
        const d = Math.round((weeks - w) * 7);
        if (d === 0) {
            return `${w} week${w !== 1 ? 's' : ''}`;
        }
        return `${w} week${w !== 1 ? 's' : ''} ${d} day${d !== 1 ? 's' : ''}`;
    }
    
    const months = days / 30;
    if (months < 12) {
        return `${Math.round(months)} month${Math.round(months) !== 1 ? 's' : ''}`;
    }
    
    const years = months / 12;
    return `${Math.round(years)} year${Math.round(years) !== 1 ? 's' : ''}`;
}

export function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
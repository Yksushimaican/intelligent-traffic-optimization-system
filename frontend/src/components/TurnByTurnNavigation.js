import React, { useState, useEffect, useRef } from 'react';
import { 
    FaArrowRight, 
    FaArrowLeft, 
    FaArrowUp, 
    FaVolumeUp, 
    FaRoute, 
    FaClock, 
    FaRulerCombined,
    FaCrosshairs,
    FaStop,
    FaPlay,
    FaExclamationTriangle,
    FaCheckCircle,
    FaRoad,
    FaLocationArrow
} from 'react-icons/fa';
import navigationService from '../services/navigationService';
import { formatTime, formatDistance } from '../utils/timeUtils';

function TurnByTurnNavigation({ 
    startPoint, 
    endPoint, 
    route, 
    onClose, 
    onStepChange,
    onLocationUpdate,
    onNavigationComplete
}) {
    const [currentStep, setCurrentStep] = useState(null);
    const [remainingSteps, setRemainingSteps] = useState([]);
    const [progress, setProgress] = useState(0);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('inactive');
    const [currentLocation, setCurrentLocation] = useState(null);
    const [totalDistance, setTotalDistance] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [distanceRemaining, setDistanceRemaining] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [arrived, setArrived] = useState(false);
    const [routeSteps, setRouteSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const intervalRef = useRef(null);
    const stepIntervalRef = useRef(null);

    // Initialize navigation
    useEffect(() => {
        if (route && startPoint && endPoint) {
            startNavigation();
        }
        return () => {
            stopNavigation();
        };
    }, [route]);

    const startNavigation = async () => {
        setIsNavigating(true);
        setArrived(false);
        
        // Start GPS tracking
        navigationService.startTracking(
            (location) => {
                setCurrentLocation(location);
                setGpsStatus('active');
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
                checkArrival(location);
            },
            (error) => {
                console.error('GPS error:', error);
                setGpsStatus('error');
            }
        );

        // Get real road route using OSRM
        try {
            const routeData = await navigationService.getRealRoute(
                startPoint.lat, startPoint.lng,
                endPoint.lat, endPoint.lng
            );

            if (routeData && routeData.steps && routeData.steps.length > 0) {
                const steps = routeData.steps;
                setRouteSteps(steps);
                setCurrentStepIndex(0);
                setCurrentStep(steps[0]);
                setRemainingSteps(steps.slice(1));
                setTotalDistance(routeData.distance);
                setTotalDuration(routeData.duration);
                setDistanceRemaining(routeData.distance);
                setTimeRemaining(routeData.duration);
                setProgress(0);
                
                // Speak first instruction
                setTimeout(() => {
                    if (steps[0]) {
                        speakInstruction(steps[0].instruction);
                    }
                }, 1500);

                // Listen for step changes via navigationService
                navigationService.addListener((step) => {
                    if (step) {
                        setCurrentStep(step);
                        if (onStepChange) onStepChange(step);
                        const remaining = navigationService.getRemainingSteps();
                        setRemainingSteps(remaining);
                        setProgress(navigationService.getProgress());
                        
                        if (!arrived) {
                            speakInstruction(step.instruction);
                        }
                    }
                });
            } else {
                alert('Could not find a valid route. Please try different locations.');
                stopNavigation();
            }
        } catch (error) {
            console.error('Navigation error:', error);
            alert('Failed to start navigation. Please try again.');
            stopNavigation();
        }

        // Update progress periodically
        stepIntervalRef.current = setInterval(() => {
            if (!arrived && routeSteps.length > 0) {
                updateProgress();
            }
        }, 3000);
    };

    const stopNavigation = () => {
        setIsNavigating(false);
        navigationService.stopTracking();
        if (stepIntervalRef.current) {
            clearInterval(stepIntervalRef.current);
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        if (onClose) onClose();
    };

    const checkArrival = (location) => {
        if (!endPoint || !location) return;
        
        const distance = navigationService.calculateDistance(
            location.lat, location.lng,
            endPoint.lat, endPoint.lng
        );
        
        if (distance < 0.05) { // Within 50 meters
            setArrived(true);
            setIsNavigating(false);
            navigationService.stopTracking();
            if (stepIntervalRef.current) {
                clearInterval(stepIntervalRef.current);
            }
            
            speakInstruction('You have arrived at your destination!');
            
            setTimeout(() => {
                if (onNavigationComplete) onNavigationComplete();
                if (onClose) onClose();
            }, 3000);
        }
    };

    const updateProgress = () => {
        if (routeSteps.length > 0) {
            const total = routeSteps.length;
            const current = currentStepIndex + 1;
            const newProgress = (current / total) * 100;
            setProgress(Math.min(newProgress, 100));
            
            // Update remaining distance/time
            if (currentStepIndex < routeSteps.length - 1) {
                const remaining = routeSteps.slice(currentStepIndex + 1);
                const remainingDist = remaining.reduce((sum, s) => sum + s.distance, 0);
                const remainingTime = remaining.reduce((sum, s) => sum + s.duration, 0);
                setDistanceRemaining(remainingDist);
                setTimeRemaining(remainingTime);
            } else {
                setDistanceRemaining(0);
                setTimeRemaining(0);
            }
        }
    };

    const handleNextStep = () => {
        if (arrived) return;
        
        if (currentStepIndex < routeSteps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            const step = routeSteps[nextIndex];
            setCurrentStep(step);
            setRemainingSteps(routeSteps.slice(nextIndex + 1));
            setProgress(((nextIndex + 1) / routeSteps.length) * 100);
            speakInstruction(step.instruction);
            
            // Update remaining distance/time
            if (nextIndex < routeSteps.length - 1) {
                const remaining = routeSteps.slice(nextIndex + 1);
                const remainingDist = remaining.reduce((sum, s) => sum + s.distance, 0);
                const remainingTime = remaining.reduce((sum, s) => sum + s.duration, 0);
                setDistanceRemaining(remainingDist);
                setTimeRemaining(remainingTime);
            } else {
                setDistanceRemaining(0);
                setTimeRemaining(0);
            }
        } else {
            // No more steps - arrived
            setArrived(true);
            setIsNavigating(false);
            navigationService.stopTracking();
            if (stepIntervalRef.current) {
                clearInterval(stepIntervalRef.current);
            }
            speakInstruction('You have arrived at your destination!');
            setTimeout(() => {
                if (onNavigationComplete) onNavigationComplete();
                if (onClose) onClose();
            }, 3000);
        }
    };

    const speakInstruction = (instruction) => {
        setIsSpeaking(true);
        navigationService.speakInstruction(instruction, () => {
            setIsSpeaking(false);
        });
    };

    const getTurnIcon = (instruction) => {
        const lower = instruction.toLowerCase();
        if (lower.includes('left')) return <FaArrowLeft />;
        if (lower.includes('right')) return <FaArrowRight />;
        if (lower.includes('straight') || lower.includes('head')) return <FaArrowUp />;
        if (lower.includes('arrive') || lower.includes('destination')) return <FaCheckCircle />;
        if (lower.includes('roundabout')) return <FaLocationArrow />;
        if (lower.includes('merge') || lower.includes('onto')) return <FaRoad />;
        return <FaRoute />;
    };

    const getTurnColor = (instruction) => {
        const lower = instruction.toLowerCase();
        if (lower.includes('left')) return '#FF9800';
        if (lower.includes('right')) return '#2196F3';
        if (lower.includes('straight')) return '#4CAF50';
        if (lower.includes('arrive') || lower.includes('destination')) return '#4CAF50';
        if (lower.includes('roundabout')) return '#9C27B0';
        return '#1a237e';
    };

    if (arrived) {
        return (
            <div className="turn-by-turn-container arrived">
                <div className="turn-arrived">
                    <FaCheckCircle className="arrived-icon" />
                    <h3>Arrived at Destination!</h3>
                    <p>You have successfully reached your destination.</p>
                    <button className="turn-close-btn" onClick={onClose}>
                        Close Navigation
                    </button>
                </div>
            </div>
        );
    }

    if (!isNavigating) {
        return (
            <div className="turn-by-turn-placeholder">
                <FaRoute className="placeholder-icon" />
                <p>Starting navigation...</p>
            </div>
        );
    }

    return (
        <div className="turn-by-turn-container">
            {/* Header */}
            <div className="turn-header">
                <h3><FaRoute /> Turn-by-Turn Navigation</h3>
                <button className="turn-close-btn" onClick={stopNavigation}>
                    <FaStop />
                </button>
            </div>

            {/* GPS Status */}
            <div className="turn-gps-status">
                <span className={`gps-dot ${gpsStatus === 'active' ? 'active' : gpsStatus === 'error' ? 'error' : ''}`}></span>
                {gpsStatus === 'active' ? 'GPS Connected' : gpsStatus === 'error' ? 'GPS Error' : 'Acquiring GPS...'}
                {currentLocation && (
                    <span className="gps-coords">
                        {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="turn-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="progress-text">{Math.round(progress)}% complete</span>
            </div>

            {/* Current Instruction */}
            {currentStep && (
                <div className="turn-instruction">
                    <div className="turn-icon" style={{ background: getTurnColor(currentStep.instruction) }}>
                        {getTurnIcon(currentStep.instruction)}
                    </div>
                    <div className="turn-text">
                        <div className="turn-instruction-text">{currentStep.instruction}</div>
                        <div className="turn-meta">
                            <span className="turn-distance">
                                <FaRulerCombined /> {formatDistance(currentStep.distance)}
                            </span>
                            <span className="turn-duration">
                                <FaClock /> {formatTime(currentStep.duration)}
                            </span>
                            {currentStep.name && currentStep.name !== 'road' && (
                                <span className="turn-road">
                                    <FaRoad /> {currentStep.name}
                                </span>
                            )}
                        </div>
                    </div>
                    <button 
                        className={`turn-speak-btn ${isSpeaking ? 'speaking' : ''}`}
                        onClick={() => speakInstruction(currentStep.instruction)}
                        disabled={isSpeaking}
                    >
                        <FaVolumeUp />
                    </button>
                </div>
            )}

            {/* Summary Stats */}
            <div className="turn-summary">
                <div className="summary-item">
                    <span className="summary-label">Remaining</span>
                    <span className="summary-value">{formatDistance(distanceRemaining)}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">ETA</span>
                    <span className="summary-value">{formatTime(timeRemaining)}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Steps</span>
                    <span className="summary-value">{remainingSteps.length} left</span>
                </div>
            </div>

            {/* Next Steps */}
            {remainingSteps.length > 0 && (
                <div className="turn-next-steps">
                    <h4>Upcoming Steps</h4>
                    <div className="next-steps-list">
                        {remainingSteps.slice(0, 3).map((step, index) => (
                            <div key={index} className="next-step-item">
                                <span className="step-number">{index + 1}</span>
                                <span className="step-text">{step.instruction}</span>
                                <span className="step-dist">{formatDistance(step.distance)}</span>
                            </div>
                        ))}
                        {remainingSteps.length > 3 && (
                            <div className="more-steps">
                                +{remainingSteps.length - 3} more steps
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="turn-controls">
                <button 
                    className="turn-next-btn" 
                    onClick={handleNextStep}
                    disabled={!currentStep || isSpeaking}
                >
                    <FaPlay /> Next Step
                </button>
                <button className="turn-stop-btn" onClick={stopNavigation}>
                    <FaStop /> Stop
                </button>
            </div>
        </div>
    );
}

export default TurnByTurnNavigation;
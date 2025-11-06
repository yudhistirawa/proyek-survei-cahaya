import { useState, useEffect, useRef, useCallback } from 'react';

const useRealtimeLocation = (options = {}) => {
    const {
        enableHighAccuracy = true,
        timeout = 5000, // Reduced timeout for faster initial fix
        maximumAge = 1000, // Reduced maximumAge for more frequent updates
        distanceFilter = 0.5, // Reduced minimum distance to 0.5 meters for more frequent updates
        autoStart = true
    } = options;

    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [accuracy, setAccuracy] = useState(null);
    const [timestamp, setTimestamp] = useState(null);
    
    const watchIdRef = useRef(null);
    const lastLocationRef = useRef(null);
    const isActiveRef = useRef(false);
    const lastUpdateTimeRef = useRef(Date.now());

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }, []);

    const handleLocationSuccess = useCallback((position) => {
        const { latitude, longitude, accuracy: posAccuracy } = position.coords;
        const newTimestamp = new Date(position.timestamp);

        // Apply distance filter with more frequent updates
        if (lastLocationRef.current && distanceFilter > 0) {
            const distance = calculateDistance(
                lastLocationRef.current.lat,
                lastLocationRef.current.lon,
                latitude,
                longitude
            );
            
            if (distance < distanceFilter) {
                // Update every 5 seconds even if not moved
                if (Date.now() - lastUpdateTimeRef.current < 5000) {
                    return;
                }
            }
        }

        const newLocation = {
            lat: latitude,
            lon: longitude
        };

        setLocation(newLocation);
        setAccuracy(posAccuracy);
        setTimestamp(newTimestamp);
        setError(null);
        setIsLoading(false);
        
        lastLocationRef.current = newLocation;
        lastUpdateTimeRef.current = Date.now();
    }, [distanceFilter, calculateDistance]);

    const handleLocationError = useCallback((err) => {
        setError({
            code: err.code,
            message: err.message
        });
        setIsLoading(false);
        
        // Don't clear location on error, keep last known position
        console.warn('Geolocation error:', err);
    }, []);

    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setError({
                code: 0,
                message: 'Geolocation tidak didukung di browser ini'
            });
            return;
        }

        if (isActiveRef.current) {
            return; // Already watching
        }

        setIsLoading(true);
        setError(null);
        isActiveRef.current = true;

        const watchOptions = {
            enableHighAccuracy,
            timeout,
            maximumAge,
            frequency: 1000 // Add frequency option for more frequent updates
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            handleLocationError,
            watchOptions
        );
    }, [enableHighAccuracy, timeout, maximumAge, handleLocationSuccess, handleLocationError]);

    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        isActiveRef.current = false;
        setIsLoading(false);
    }, []);

    const getCurrentLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation tidak didukung'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const currentLocation = { lat: latitude, lon: longitude };
                    resolve(currentLocation);
                },
                (err) => {
                    reject(err);
                },
                { enableHighAccuracy, timeout, maximumAge }
            );
        });
    }, [enableHighAccuracy, timeout, maximumAge]);

    // Auto-start watching if enabled
    useEffect(() => {
        if (autoStart) {
            startWatching();
        }

        return () => {
            stopWatching();
        };
    }, [autoStart, startWatching, stopWatching]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopWatching();
        };
    }, [stopWatching]);

    return {
        location,
        error,
        isLoading,
        accuracy,
        timestamp,
        isWatching: isActiveRef.current,
        startWatching,
        stopWatching,
        getCurrentLocation
    };
};

export default useRealtimeLocation;

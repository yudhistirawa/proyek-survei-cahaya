import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Maximize2, Minimize2, Navigation, Target, Crosshair, Map, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { getFirestore, collection, query, where, onSnapshot, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { firebaseApp, storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import dynamic from 'next/dynamic';
import { loadTaskProgress } from '../lib/taskProgress';

// Loading component for lazy loaded components
const LoadingComponent = ({ message = "Memuat..." }) => (
  <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-slate-600 text-center">{message}</p>
  </div>
);

// Dynamic import untuk Leaflet
const MiniMapsLeaflet = dynamic(() => import('./MiniMapsLeaflet'), {
    ssr: false,
    loading: () => <LoadingComponent message="Memuat peta..." />
});

const MiniMapsComponent = ({ taskId, userId, previewPoint, surveyorPoints: propSurveyorPoints, taskProgress }) => {
    // Ensure only one MiniMaps instance is active at a time (singleton guard)
    const [isPrimaryInstance] = useState(() => {
        if (typeof window === 'undefined') return true;
        window.__miniMapsInstanceCount = (window.__miniMapsInstanceCount || 0) + 1;
        return window.__miniMapsInstanceCount === 1;
    });
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                window.__miniMapsInstanceCount = Math.max(0, (window.__miniMapsInstanceCount || 1) - 1);
            }
        };
    }, []);

    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [surveyPoints, setSurveyPoints] = useState([]);
    const [surveyorProgressPoints, setSurveyorProgressPoints] = useState([]);
    const [taskPolygons, setTaskPolygons] = useState([]);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hasActiveTask, setHasActiveTask] = useState(false);
    const [activeTaskIdFromSession, setActiveTaskIdFromSession] = useState(null);
    const [routeTracking, setRouteTracking] = useState(false);
    const [routeStartTime, setRouteStartTime] = useState(null);
    const [routePoints, setRoutePoints] = useState([]);
    const [trackingInterval, setTrackingInterval] = useState(null);
    const [routeData, setRouteData] = useState({
        taskId: null,
        surveyorId: null,
        startTime: null,
        endTime: null,
        routePoints: [],
        totalDistance: 0,
        surveyPoints: []
    });
    const [kmzData, setKmzData] = useState(null);
    const [kmzLoading, setKmzLoading] = useState(false);
    const [kmzError, setKmzError] = useState(null);
    const [isReloadingPoints, setIsReloadingPoints] = useState(false);
    const watchIdRef = useRef(null);
    const prevTaskIdRef = useRef(null);

    // Function to reload surveyor points from Firestore
    const reloadSurveyorPoints = useCallback(async () => {
        const currentTaskId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
        const currentUserId = userId || (auth.currentUser ? auth.currentUser.uid : null);
        
        if (!currentTaskId || !currentUserId) {
            console.log('⚠️ MiniMapsComponent: Cannot reload surveyor points - no task or user');
            console.log('   - currentTaskId:', currentTaskId);
            console.log('   - currentUserId:', currentUserId);
            return;
        }

        setIsReloadingPoints(true);
        console.log('🔄 MiniMapsComponent: Reloading surveyor points from Firestore');
        console.log('   📋 TaskID:', currentTaskId);
        console.log('   👤 UserID (Surveyor):', currentUserId);

        try {
            // Load progress HANYA untuk userId dan taskId yang spesifik
            // Firestore path: taskProgress/${userId}_${taskId}
            const progress = await loadTaskProgress(currentUserId, currentTaskId);
            console.log('📦 MiniMapsComponent: Loaded progress from Firestore:', progress);
            
            if (progress) {
                // VALIDASI KEAMANAN: Pastikan data yang dimuat benar milik surveyor ini
                if (progress.userId && progress.userId !== currentUserId) {
                    console.error('🚫 SECURITY: Progress data userId mismatch!');
                    console.error('   Expected userId:', currentUserId);
                    console.error('   Got userId:', progress.userId);
                    console.error('   Blocking unauthorized data!');
                    setSurveyorProgressPoints([]);
                    setIsReloadingPoints(false);
                    return;
                }

                if (progress.taskId && progress.taskId !== currentTaskId) {
                    console.error('🚫 SECURITY: Progress data taskId mismatch!');
                    console.error('   Expected taskId:', currentTaskId);
                    console.error('   Got taskId:', progress.taskId);
                    console.error('   Blocking unauthorized data!');
                    setSurveyorProgressPoints([]);
                    setIsReloadingPoints(false);
                    return;
                }

                const points = progress.surveyorPoints || [];
                console.log('✅ MiniMapsComponent: Validation passed - Found', points.length, 'surveyor points');
                console.log('   👤 Confirmed UserID:', progress.userId || currentUserId);
                console.log('   📋 Confirmed TaskID:', progress.taskId || currentTaskId);
                console.log('📍 MiniMapsComponent: Points data:', JSON.stringify(points, null, 2));
                setSurveyorProgressPoints(points);
                
                // Manual reload: trigger map fit untuk zoom ke points
                if (points.length > 0) {
                    console.log('🎯 MiniMapsComponent: Triggering map fit for', points.length, 'points (manual reload)');
                    // Trigger map to fit bounds to show all points
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('fitSurveyorPoints', {
                            detail: { points }
                        }));
                    }, 300);
                }
            } else {
                console.log('ℹ️ MiniMapsComponent: No surveyor points found in progress for this user & task');
                setSurveyorProgressPoints([]);
            }
        } catch (error) {
            console.error('❌ MiniMapsComponent: Error reloading surveyor points:', error);
        } finally {
            setIsReloadingPoints(false);
        }
    }, [userId]);

    // Sync with surveyor progress points from props
    useEffect(() => {
        console.log('🔄 MiniMapsComponent: Received propSurveyorPoints:', propSurveyorPoints);
        if (propSurveyorPoints && Array.isArray(propSurveyorPoints)) {
            console.log('🔄 MiniMapsComponent: Syncing surveyor progress points from props:', propSurveyorPoints.length, 'points');
            console.log('📍 MiniMapsComponent: Points data:', JSON.stringify(propSurveyorPoints, null, 2));
            setSurveyorProgressPoints(propSurveyorPoints);
            console.log('✅ MiniMapsComponent: Surveyor progress points updated in state');
            
            // If we have points and mini maps is not visible, auto-show it
            if (propSurveyorPoints.length > 0 && !isVisible) {
                console.log('🎯 MiniMapsComponent: Auto-showing mini maps because we have', propSurveyorPoints.length, 'surveyor points');
                setIsVisible(true);
                setHasActiveTask(true);
            }
        } else {
            console.log('⚠️ MiniMapsComponent: No surveyor progress points from props');
            // TIDAK auto-reload, user harus klik button manual
        }
    }, [propSurveyorPoints]);

    // Auto-restore surveyor points after browser refresh (only if sessionStorage has active task)
    useEffect(() => {
        const restoreAfterRefresh = async () => {
            // Hanya restore jika ada active task di sessionStorage (browser refresh scenario)
            const currentTaskId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
            const currentTaskStatus = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskStatus') : null;
            const currentUserId = userId || (auth.currentUser ? auth.currentUser.uid : null);
            
            // Cek apakah ini adalah browser refresh (sessionStorage ada tapi state kosong)
            if (currentTaskId && currentTaskStatus === 'in_progress' && currentUserId && surveyorProgressPoints.length === 0) {
                console.log('🔄 MiniMapsComponent: Browser refresh detected - restoring surveyor points from Firestore');
                console.log('   📋 TaskID:', currentTaskId);
                console.log('   👤 UserID:', currentUserId);
                
                try {
                    const progress = await loadTaskProgress(currentUserId, currentTaskId);
                    
                    if (progress && progress.surveyorPoints && progress.surveyorPoints.length > 0) {
                        const points = progress.surveyorPoints;
                        console.log('✅ MiniMapsComponent: Restored', points.length, 'surveyor points after refresh');
                        setSurveyorProgressPoints(points);
                        
                        // Trigger map fit untuk zoom ke points (tanpa auto-show)
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('fitSurveyorPoints', {
                                detail: { points }
                            }));
                        }, 1000);
                    } else {
                        console.log('ℹ️ MiniMapsComponent: No surveyor points to restore after refresh');
                    }
                } catch (error) {
                    console.error('❌ MiniMapsComponent: Error restoring surveyor points after refresh:', error);
                }
            }
        };
        
        // Delay untuk memastikan auth dan sessionStorage sudah ready
        const timer = setTimeout(() => {
            restoreAfterRefresh();
        }, 500);
        
        return () => clearTimeout(timer);
    }, []); // Only run once on mount

    // Load KMZ data from URL
    const loadKmzData = async (kmzUrl) => {
        if (!kmzUrl) {
            console.log('❌ MiniMapsComponent: No KMZ URL provided');
            return;
        }

        setKmzLoading(true);
        setKmzError(null);
        
        try {
            console.log('🔄 MiniMapsComponent: Loading KMZ data from:', kmzUrl);
            
            const response = await fetch(`/api/parse-kmz?url=${encodeURIComponent(kmzUrl)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            console.log('✅ MiniMapsComponent: KMZ data loaded successfully:', data);
            // Annotate with sourceUrl to avoid redundant reloads
            setKmzData({ ...data, sourceUrl: kmzUrl });
            
            // Check if auto-focus is needed after KMZ data is loaded
            const autoFocusFlag = sessionStorage.getItem('miniMapsAutoFocus');
            if (autoFocusFlag === 'true') {
                console.log('🎯 MiniMapsComponent: KMZ data loaded, triggering auto-focus');
                // Dispatch event to trigger map focus with multiple attempts for reliability
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('kmzDataLoaded', { 
                        detail: { data, autoFocus: true } 
                    }));
                }, 300);
                
                // Additional trigger after a longer delay to ensure map is fully loaded
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('kmzDataLoaded', { 
                        detail: { data, autoFocus: true, retry: true } 
                    }));
                }, 1000);
            }
            
            // Focus on user location (no hooks inside non-hook function)
            const focusOnUserLocationAfterKmz = () => {
                console.log('🎯 MiniMapsComponent: Focus on user location requested');
                if (currentLocation) {
                    // Dispatch event to focus on user location
                    window.dispatchEvent(new CustomEvent('focusUserLocation', { 
                        detail: { 
                            location: currentLocation,
                            userRequested: true
                        } 
                    }));
                    console.log('✅ MiniMapsComponent: User location focus event dispatched');
                } else {
                    console.warn('⚠️ MiniMapsComponent: No user location available to focus on');
                    // Try to get current location
                    getCurrentLocation();
                }
            };

            focusOnUserLocationAfterKmz();
            
        } catch (error) {
            console.error('❌ MiniMapsComponent: Error loading KMZ data:', error);
            setKmzError(error.message);
        } finally {
            setKmzLoading(false);
        }
    };

    // Helper: resolve KMZ URL from various sessionStorage formats
    const resolveKmzUrlFromValue = async (value) => {
        try {
            // If it's already a URL-like string
            if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
            // Try to parse JSON object string
            const obj = JSON.parse(value);
            if (obj) {
                const directUrl = obj.downloadURL || obj.url || obj.downloadUrl;
                if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;
                const storagePath = obj.storagePath || obj.fullPath || obj.path;
                if (storagePath) {
                    try {
                        const refObj = storageRef(storage, storagePath);
                        const dl = await getDownloadURL(refObj);
                        return dl;
                    } catch (e) {
                        console.warn('⚠️ Failed to resolve Firebase Storage URL from path:', storagePath, e.message);
                    }
                }
            }
        } catch {}
        return null;
    };

    // Check if user has active task from sessionStorage (only for primary instance)
    useEffect(() => {
        if (!isPrimaryInstance) return; // do not auto-show or attach listeners for secondary instances
        const checkActiveTask = async () => {
            try {
                const currentTaskId = sessionStorage.getItem('currentTaskId');
                const currentTaskKmz = sessionStorage.getItem('currentTaskKmz');
                const currentTaskKmzData = sessionStorage.getItem('currentTaskKmzData');
                const currentTaskDest = sessionStorage.getItem('currentTaskDest');
                const currentTaskStatus = sessionStorage.getItem('currentTaskStatus');
                const autoFocusFlag = sessionStorage.getItem('miniMapsAutoFocus');
                
                console.log('🔍 MiniMapsComponent: Checking sessionStorage:', {
                    currentTaskId,
                    currentTaskKmz,
                    currentTaskDest,
                    currentTaskStatus,
                    autoFocusFlag
                });
                
                // Consider task active when status is 'in_progress' or legacy 'started'
                const isActive = currentTaskStatus === 'in_progress' || currentTaskStatus === 'started' || (!currentTaskStatus && currentTaskId && (currentTaskKmz || currentTaskKmzData));
                if (currentTaskId && isActive) {
                    console.log('✅ MiniMapsComponent: Active task in progress detected:', currentTaskId);
                    setHasActiveTask(true);
                    setActiveTaskIdFromSession(currentTaskId);
                    
                    // Prefer direct parsed data if available
                    let loadedFromParsed = false;
                    if (currentTaskKmzData) {
                        try {
                            const parsed = JSON.parse(currentTaskKmzData);
                            if (parsed && (parsed.coordinates || parsed.polygons || parsed.lines)) {
                                setKmzData({ ...parsed, sourceUrl: 'session:parsed' });
                                loadedFromParsed = true;
                                console.log('✅ MiniMapsComponent: Loaded KMZ data from session parsed mapData');
                            }
                        } catch (e) {
                            console.warn('⚠️ Failed to parse currentTaskKmzData:', e.message);
                        }
                    }

                    // Resolve and load KMZ data by URL if we don't have parsed data
                    if (!loadedFromParsed && currentTaskKmz) {
                        const resolvedUrl = await resolveKmzUrlFromValue(currentTaskKmz);
                        if (resolvedUrl && resolvedUrl !== kmzData?.sourceUrl) {
                            await loadKmzData(resolvedUrl);
                        } else if (!resolvedUrl) {
                            console.warn('⚠️ MiniMapsComponent: Unable to resolve KMZ URL from session value');
                        }
                    }
                    
                    // Auto-show mini maps for active tasks - prioritize auto-focus flag
                    if (!isVisible && (autoFocusFlag === 'true' || !sessionStorage.getItem('miniMapsManuallyClosed'))) {
                        console.log('🎯 MiniMapsComponent: Auto-showing mini maps due to active task with KMZ');
                        setIsVisible(true);
                        
                        // Trigger immediate auto-focus if KMZ data is already loaded
                        if ((loadedFromParsed || kmzData) && autoFocusFlag === 'true') {
                            console.log('🎯 MiniMapsComponent: Triggering immediate auto-focus for loaded KMZ data');
                            setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('kmzDataLoaded', { 
                                    detail: { 
                                        data: loadedFromParsed ? JSON.parse(currentTaskKmzData) : kmzData, 
                                        autoFocus: true,
                                        immediate: true
                                    } 
                                }));
                            }, 500);
                        }
                    }
                } else {
                    console.log('❌ MiniMapsComponent: No active task in progress found');
                    setHasActiveTask(false);
                    setActiveTaskIdFromSession(null);
                    setIsVisible(false);
                    // Clear KMZ data when no active task
                    setKmzData(null);
                    setKmzError(null);
                    // Clear survey points when no active task
                    setSurveyPoints([]);
                    // Clear manual close flag when no active task
                    sessionStorage.removeItem('miniMapsManuallyClosed');
                    sessionStorage.removeItem('miniMapsAutoFocus');
                    // Clear saved survey points from all tasks
                    Object.keys(sessionStorage).forEach(key => {
                        if (key.startsWith('miniMaps_surveyPoints_')) {
                            sessionStorage.removeItem(key);
                            console.log('🗑️ MiniMapsComponent: Cleared saved survey points:', key);
                        }
                    });
                }
            } catch (error) {
                console.error('Error checking active task:', error);
            }
        };

        // Check on mount
        checkActiveTask();

        // Listen for task changes
        const handleTaskChange = () => {
            checkActiveTask();
        };

        // Listen for specific KMZ auto-focus event
        const handleTaskStartedWithKmz = (event) => {
            console.log('🎯 MiniMapsComponent: Received taskStartedWithKmz event:', event.detail);
            // Force show mini maps when task starts with KMZ
            if (!isVisible) {
                console.log('🎯 MiniMapsComponent: Auto-showing mini maps for task with KMZ');
                setIsVisible(true);
                sessionStorage.removeItem('miniMapsManuallyClosed');
            }
            
            // Set auto-focus flag to ensure KMZ data is focused
            sessionStorage.setItem('miniMapsAutoFocus', 'true');
            
            // Trigger re-check of active task to load KMZ data with delay
            setTimeout(() => {
                checkActiveTask();
            }, 300);
        };

        window.addEventListener('currentTaskChanged', handleTaskChange);
        window.addEventListener('storage', handleTaskChange);
        window.addEventListener('taskStartedWithKmz', handleTaskStartedWithKmz);

        return () => {
            window.removeEventListener('currentTaskChanged', handleTaskChange);
            window.removeEventListener('storage', handleTaskChange);
            window.removeEventListener('taskStartedWithKmz', handleTaskStartedWithKmz);
        };
    }, [isPrimaryInstance]); // only run on primary instance

    // Debug useEffect untuk memantau perubahan isVisible
    useEffect(() => {
        console.log('📊 MiniMapsComponent: isVisible changed to:', isVisible);
        console.log('📊 MiniMapsComponent: Manual close flag:', sessionStorage.getItem('miniMapsManuallyClosed'));
        
        // Start watching location when mini maps becomes visible
        if (isVisible && !watchIdRef.current && navigator.geolocation) {
            console.log('🎯 MiniMapsComponent: Starting continuous location tracking');
            
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude, accuracy });
                    console.log('📍 MiniMapsComponent: Location updated:', latitude, longitude);
                },
                (error) => {
                    console.error('❌ MiniMapsComponent: Error watching location:', {
                        code: error.code,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Handle specific geolocation errors with user-friendly messages
                    let errorMessage = 'Gagal melacak lokasi';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Akses lokasi ditolak. Mohon aktifkan izin lokasi di browser.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Informasi lokasi tidak tersedia.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Permintaan lokasi timeout. Mencoba lagi...';
                            break;
                        default:
                            errorMessage = 'Gagal melacak lokasi: ' + error.message;
                            break;
                    }
                    setError(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000 // Update every 5 seconds
                }
            );
        } else if (!isVisible && watchIdRef.current) {
            // Stop watching when mini maps is hidden
            console.log('🛑 MiniMapsComponent: Stopping location tracking');
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        
        // Cleanup on unmount
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isVisible]);

    // Persist surveyPoints to sessionStorage whenever they change
    useEffect(() => {
        if (surveyPoints && surveyPoints.length > 0 && activeTaskIdFromSession) {
            const storageKey = `miniMaps_surveyPoints_${activeTaskIdFromSession}`;
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(surveyPoints));
                console.log('💾 MiniMapsComponent: Saved', surveyPoints.length, 'survey points to sessionStorage');
            } catch (error) {
                console.error('❌ MiniMapsComponent: Error saving survey points:', error);
            }
        }
    }, [surveyPoints, activeTaskIdFromSession]);

    // Load surveyPoints from sessionStorage on mount
    useEffect(() => {
        if (activeTaskIdFromSession && surveyPoints.length === 0) {
            const storageKey = `miniMaps_surveyPoints_${activeTaskIdFromSession}`;
            try {
                const savedPoints = sessionStorage.getItem(storageKey);
                if (savedPoints) {
                    const parsedPoints = JSON.parse(savedPoints);
                    if (parsedPoints && parsedPoints.length > 0) {
                        setSurveyPoints(parsedPoints);
                        console.log('📂 MiniMapsComponent: Restored', parsedPoints.length, 'survey points from sessionStorage');
                    }
                }
            } catch (error) {
                console.error('❌ MiniMapsComponent: Error loading survey points:', error);
            }
        }
    }, [activeTaskIdFromSession]);

    // Clear survey points when task changes
    useEffect(() => {
        if (activeTaskIdFromSession && prevTaskIdRef.current && prevTaskIdRef.current !== activeTaskIdFromSession) {
            // Task has changed, clear old survey points
            console.log('🔄 MiniMapsComponent: Task changed from', prevTaskIdRef.current, 'to', activeTaskIdFromSession);
            setSurveyPoints([]);
            
            // Clear old task's saved points
            const oldStorageKey = `miniMaps_surveyPoints_${prevTaskIdRef.current}`;
            sessionStorage.removeItem(oldStorageKey);
            console.log('🗑️ MiniMapsComponent: Cleared survey points for old task:', prevTaskIdRef.current);
        }
        
        prevTaskIdRef.current = activeTaskIdFromSession;
    }, [activeTaskIdFromSession]);

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolokasi tidak didukung di browser ini');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
                setError(null);
                setLoading(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                setError('Gagal mendapatkan lokasi: ' + error.message);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    };

    // Start route tracking
    const startRouteTracking = useCallback(() => {
        if (!userId || !activeTaskIdFromSession) {
            console.log('❌ MiniMapsComponent: Cannot start tracking - missing userId or taskId');
            return;
        }

        console.log('🚀 MiniMapsComponent: Starting route tracking');
        setRouteTracking(true);
        setRouteStartTime(new Date());
        setRoutePoints([]);
        
        // Initialize route data
        setRouteData({
            taskId: activeTaskIdFromSession,
            surveyorId: userId,
            startTime: new Date(),
            endTime: null,
            routePoints: [],
            totalDistance: 0,
            surveyPoints: []
        });

        // Start tracking interval
        const interval = setInterval(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        try {
                            const { latitude, longitude } = position.coords;
                            const newPoint = {
                                lat: latitude,
                                lng: longitude,
                                timestamp: new Date(),
                                accuracy: position.coords.accuracy
                            };

                            setRoutePoints(prev => {
                                const updatedPoints = [...prev, newPoint];
                                // Calculate total distance
                                let totalDistance = 0;
                                for (let i = 1; i < updatedPoints.length; i++) {
                                    const prevPoint = updatedPoints[i - 1];
                                    const currPoint = updatedPoints[i];
                                    totalDistance += calculateDistance(prevPoint.lat, prevPoint.lng, currPoint.lat, currPoint.lng);
                                }

                                // Update route data
                                setRouteData(prev => ({
                                    ...prev,
                                    routePoints: updatedPoints,
                                    totalDistance: totalDistance
                                }));

                                return updatedPoints;
                            });

                            setCurrentLocation({ lat: latitude, lng: longitude });
                        } catch (processingError) {
                            console.error('Error processing location data during tracking:', processingError);
                        }
                    },
                    (error) => {
                        console.error('Error getting location during tracking:', {
                            code: error.code,
                            message: error.message,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Handle specific geolocation errors
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                console.warn('Location access denied by user');
                                break;
                            case error.POSITION_UNAVAILABLE:
                                console.warn('Location information unavailable');
                                break;
                            case error.TIMEOUT:
                                console.warn('Location request timeout');
                                break;
                            default:
                                console.warn('Unknown location error');
                                break;
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000, // Increased timeout to 10 seconds
                        maximumAge: 30000 // Allow cached location up to 30 seconds
                    }
                );
            } else {
                console.warn('Geolocation not supported by this browser');
            }
        }, 15000); // Track every 15 seconds (reduced frequency to avoid errors)

        setTrackingInterval(interval);
    }, [userId, activeTaskIdFromSession]);

    // Stop route tracking
    const stopRouteTracking = useCallback(async () => {
        console.log('🛑 MiniMapsComponent: Stopping route tracking');
        
        if (trackingInterval) {
            clearInterval(trackingInterval);
            setTrackingInterval(null);
        }

        setRouteTracking(false);
        
        // Update route data with end time
        const endTime = new Date();
        setRouteData(prev => ({
            ...prev,
            endTime: endTime,
            surveyPoints: surveyPoints
        }));

        // Prepare final route data (client object)
        try {
            const db = getFirestore(firebaseApp);
            
            // Get surveyor name from auth or session
            let surveyorName = 'Unknown Surveyor';
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    surveyorName = currentUser.displayName || currentUser.email || `User ${currentUser.uid.substring(0, 8)}`;
                }
            } catch (e) {
                console.warn('⚠️ Could not get current user info:', e.message);
            }
            
            // Get task information from session storage
            let taskInfo = {};
            try {
                const currentTaskId = sessionStorage.getItem('currentTaskId');
                const currentTaskKmzData = sessionStorage.getItem('currentTaskKmzData');
                
                if (currentTaskId) {
                    taskInfo.taskId = currentTaskId;
                }
                
                if (currentTaskKmzData) {
                    try {
                        const kmzData = JSON.parse(currentTaskKmzData);
                        taskInfo.taskKmzData = kmzData;
                    } catch (e) {
                        console.warn('⚠️ Could not parse task KMZ data:', e.message);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Could not get task info from session:', e.message);
            }
            
            const finalRouteData = {
                ...routeData,
                ...taskInfo, // Add task information
                endTime: endTime,
                surveyPoints: surveyPoints,
                surveyorName: surveyorName, // Add surveyor name
                createdAt: new Date(),
                status: 'completed',
                collectionName: 'Maps_Surveyor' // Add collection name for reference
            };

            // 1) Upload serialized JSON to Firebase Storage
            try {
                const fileTs = new Date().toISOString().replace(/[:.]/g, '-');
                const sId = routeData.surveyorId || userId || 'unknown';
                const tId = routeData.taskId || activeTaskIdFromSession || 'no-task';
                const path = `maps_surveyor/${sId}/${tId}/${fileTs}.json`;
                const jsonBlob = new Blob([JSON.stringify(finalRouteData)], { type: 'application/json' });
                const refObj = storageRef(storage, path);
                const snap = await uploadBytes(refObj, jsonBlob);
                const downloadURL = await getDownloadURL(snap.ref);
                finalRouteData.storagePath = path;
                finalRouteData.storageUrl = downloadURL;
                console.log('✅ MiniMapsComponent: Route JSON uploaded to Storage:', path);
            } catch (e) {
                console.warn('⚠️ MiniMapsComponent: Failed to upload route JSON to Storage:', e.message);
            }

            // 2) Save metadata + storage url to Maps_Surveyor collection
            const docRef = await addDoc(collection(db, 'Maps_Surveyor'), finalRouteData);
            console.log('✅ MiniMapsComponent: Route data saved to Maps_Surveyor collection with ID:', docRef.id);
            
            // 3) Also save to surveyor_routes for backward compatibility
            await addDoc(collection(db, 'surveyor_routes'), finalRouteData);
            console.log('✅ MiniMapsComponent: Route data also saved to surveyor_routes collection');
            
            // 4) Log the final data structure for debugging
            console.log('📊 MiniMapsComponent: Final route data structure:', {
                taskId: finalRouteData.taskId,
                surveyorId: finalRouteData.surveyorId,
                surveyorName: finalRouteData.surveyorName,
                startTime: finalRouteData.startTime,
                endTime: finalRouteData.endTime,
                totalDistance: finalRouteData.totalDistance,
                routePointsCount: finalRouteData.routePoints?.length || 0,
                surveyPointsCount: finalRouteData.surveyPoints?.length || 0,
                status: finalRouteData.status,
                storagePath: finalRouteData.storagePath,
                storageUrl: finalRouteData.storageUrl
            });
            
            // Clear route data
            setRoutePoints([]);
            setRouteData({
                taskId: null,
                surveyorId: null,
                startTime: null,
                endTime: null,
                routePoints: [],
                totalDistance: 0,
                surveyPoints: []
            });
        } catch (error) {
            console.error('❌ MiniMapsComponent: Error saving route data:', error);
        }
    }, [trackingInterval, routeData, surveyPoints]);

    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Show alert when task starts (only called from DetailTugasPage)
    const showTaskStartedAlert = (taskData) => {
        // Create notification in Firestore
        const createNotification = async () => {
            try {
                const db = getFirestore(firebaseApp);
                await addDoc(collection(db, 'notifications'), {
                    userId: userId,
                    type: 'tugas',
                    title: 'Tugas Dimulai',
                    message: `Tugas "${taskData.judulTugas || 'Survey Pencahayaan'}" telah dimulai. Mini maps aktif untuk membantu navigasi.`,
                    isRead: false,
                    createdAt: new Date(),
                    taskId: taskId
                });
            } catch (error) {
                console.error('Error creating task notification:', error);
            }
        };

        createNotification();

        // Show alert
        alert(`Berhasil Memulai Tugas`);
    };

    // Handle map loaded
    const handleMapLoaded = () => {
        setMapLoaded(true);
        setMapError(null);
    };

    // Handle map error
    const handleMapError = (error) => {
        setMapError(error);
        setMapLoaded(false);
    };

    // Reload KMZ from session storage
    const reloadKmzFromSession = useCallback(async () => {
        try {
            const currentTaskKmz = sessionStorage.getItem('currentTaskKmz');
            const currentTaskKmzData = sessionStorage.getItem('currentTaskKmzData');
            
            if (currentTaskKmzData) {
                try {
                    const parsed = JSON.parse(currentTaskKmzData);
                    if (parsed && (parsed.coordinates || parsed.polygons || parsed.lines)) {
                        setKmzData({ ...parsed, sourceUrl: 'session:parsed' });
                        console.log('✅ MiniMapsComponent: Reloaded KMZ data from session parsed mapData');
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ Failed to parse currentTaskKmzData during reload:', e.message);
                }
            }
            
            if (currentTaskKmz) {
                const resolvedUrl = await resolveKmzUrlFromValue(currentTaskKmz);
                if (resolvedUrl) {
                    await loadKmzData(resolvedUrl);
                } else {
                    console.warn('⚠️ MiniMapsComponent: Unable to resolve KMZ URL during reload');
                }
            } else {
                console.log('❌ MiniMapsComponent: No KMZ data found in session storage');
            }
        } catch (error) {
            console.error('❌ MiniMapsComponent: Error reloading KMZ from session:', error);
        }
    }, [loadKmzData, resolveKmzUrlFromValue]);

    // Focus on KMZ content
    const focusOnKmzContent = useCallback(() => {
        console.log('🎯 MiniMapsComponent: Focus on KMZ content requested');
        if (kmzData && (kmzData.coordinates?.length > 0 || kmzData.polygons?.length > 0 || kmzData.lines?.length > 0)) {
            // Trigger KMZ focus event
            window.dispatchEvent(new CustomEvent('kmzDataLoaded', { 
                detail: { 
                    data: kmzData, 
                    autoFocus: true,
                    userRequested: true
                } 
            }));
            console.log('✅ MiniMapsComponent: KMZ focus event dispatched');
        } else {
            console.warn('⚠️ MiniMapsComponent: No KMZ data available to focus on');
        }
    }, [kmzData]);

    // Focus on user location
    const focusOnUserLocation = useCallback(() => {
        console.log('🎯 MiniMapsComponent: Focus on user location requested');
        if (currentLocation) {
            // Dispatch event to focus on user location
            window.dispatchEvent(new CustomEvent('focusUserLocation', { 
                detail: { 
                    location: currentLocation,
                    userRequested: true
                } 
            }));
            console.log('✅ MiniMapsComponent: User location focus event dispatched');
        } else {
            console.warn('⚠️ MiniMapsComponent: No user location available to focus on');
            // Try to get current location
            getCurrentLocation();
        }
    }, [currentLocation, getCurrentLocation]);

    // Handle show/hide with animation
    const handleToggleVisibility = useCallback(() => {
        console.log('🔄 MiniMapsComponent: handleToggleVisibility called, current isVisible:', isVisible);
        
        if (isAnimating) {
            console.log('⚠️ MiniMapsComponent: Animation in progress, ignoring toggle');
            return; // Prevent multiple clicks during animation
        }
        
        if (!isVisible) {
            // Show mini maps
            console.log('📤 MiniMapsComponent: Showing mini maps');
            setIsAnimating(true);
            setIsVisible(true);
            // If no active task, set a temporary active state
            if (!hasActiveTask) {
                setHasActiveTask(true);
            }
            setTimeout(() => {
                setIsAnimating(false);
            }, 300); // Match CSS animation duration
        } else {
            // Hide mini maps
            console.log('📥 MiniMapsComponent: Hiding mini maps');
            setIsAnimating(true);
            setTimeout(() => {
                setIsVisible(false);
                setIsAnimating(false);
            }, 300); // Match CSS animation duration
        }
    }, [isAnimating, isVisible, hasActiveTask]);

    // Handle close with animation
    const handleClose = useCallback(() => {
        console.log('🔴 MiniMapsComponent: handleClose called');
        
        if (isAnimating) {
            console.log('⚠️ MiniMapsComponent: Animation in progress, ignoring close');
            return;
        }
        
        console.log('🔴 MiniMapsComponent: Closing mini maps, current isVisible:', isVisible);
        setIsAnimating(true);
        setIsVisible(false); // Immediately set to false
        console.log('🔄 MiniMapsComponent: Set isVisible to false');
        
        // Force immediate re-render
        setTimeout(() => {
            setIsAnimating(false);
            console.log('✅ MiniMapsComponent: Mini maps closed, animation finished');
        }, 100); // Reduced timeout for faster response
    }, [isAnimating, isVisible]);

    // Effects
    useEffect(() => {
        if (!isPrimaryInstance) return;
        if (isVisible && !currentLocation) {
            getCurrentLocation();
        }
    }, [isPrimaryInstance, isVisible, currentLocation]);

    // Check task completion status
    useEffect(() => {
        if (!isPrimaryInstance) return;
        const checkTaskStatus = () => {
            const currentTaskStatus = sessionStorage.getItem('currentTaskStatus');
            if (currentTaskStatus === 'completed' && routeTracking) {
                console.log('🛑 MiniMapsComponent: Task completed, stopping route tracking');
                stopRouteTracking();
            }
        };

        // Check on mount and listen for changes
        checkTaskStatus();
        window.addEventListener('storage', checkTaskStatus);
        
        return () => {
            window.removeEventListener('storage', checkTaskStatus);
        };
    }, [isPrimaryInstance, routeTracking, stopRouteTracking]);

    // Update route data with survey points when they change
    useEffect(() => {
        if (!isPrimaryInstance) return;
        if (routeTracking && surveyPoints.length > 0) {
            setRouteData(prev => ({
                ...prev,
                surveyPoints: surveyPoints
            }));
        }
    }, [isPrimaryInstance, surveyPoints, routeTracking]);

    useEffect(() => {
        if (!isPrimaryInstance) return;
        if (isVisible && (hasActiveTask || userId)) {
            let unsubscribeExisting = null;
            let unsubscribeExistingNew = null;
            let unsubscribePropose = null;
            let unsubscribeProposeNew = null;
            let unsubscribeTrafo = null;

            // Load survey points
            const setupSurveyPoints = async () => {
                console.log('🔍 MiniMapsComponent: Setting up survey points, userId:', userId);
                if (!userId) {
                    console.log('❌ MiniMapsComponent: No userId provided');
                    return;
                }

                try {
                    const db = getFirestore(firebaseApp);
                    
                    // Load from Survey Existing
                    const existingQuery = query(
                        collection(db, 'Survey_Existing_Report'),
                        where('surveyorId', '==', userId)
                    );
                    
                    // Also query without filter to see all documents for debugging
                    const existingQueryAll = query(
                        collection(db, 'Survey_Existing_Report')
                    );

                    // Load from Survey APJ Propose
                    const proposeQuery = query(
                        collection(db, 'Tiang_APJ_Propose_Report'),
                        where('surveyorId', '==', userId)
                    );

                    // New collections (normalized)
                    const existingQueryNew = query(
                        collection(db, 'survey_existing'),
                        where('surveyorId', '==', userId)
                    );

                    const proposeQueryNew = query(
                        collection(db, 'apj_propose_tiang'),
                        where('surveyorId', '==', userId)
                    );

                    // Debug: Check all documents first
                    const debugSnapshot = await getDocs(existingQueryAll);
                    console.log('🔍 DEBUG: Total documents in Survey_Existing_Report:', debugSnapshot.size);
                    debugSnapshot.forEach((doc) => {
                        const data = doc.data();
                        console.log('🔍 DEBUG: Document ID:', doc.id, 'surveyorId:', data.surveyorId, 'userId we are looking for:', userId);
                        console.log('🔍 DEBUG: Document data sample:', {
                            namaJalan: `"${data.namaJalan}"`,
                            kepemilikanTiang: `"${data.kepemilikanTiang}"`,
                            jenisTiang: `"${data.jenisTiang}"`,
                            trafo: `"${data.trafo}"`,
                            lampu: `"${data.lampu}"`,
                            titikKordinat: `"${data.titikKordinat}"`,
                            isEmpty: {
                                namaJalan: !data.namaJalan || data.namaJalan.trim() === '',
                                kepemilikanTiang: !data.kepemilikanTiang || data.kepemilikanTiang.trim() === '',
                                jenisTiang: !data.jenisTiang || data.jenisTiang.trim() === ''
                            }
                        });
                    });

                                         unsubscribeExisting = onSnapshot(existingQuery, (snapshot) => {
                         const points = [];
                         console.log('📊 MiniMapsComponent: Loading survey existing points for userId:', userId, 'snapshot size:', snapshot.size);
                         snapshot.forEach((doc) => {
                             const data = doc.data();
                             console.log('📊 MiniMapsComponent: Survey existing data:', data);
                             console.log('🔍 MiniMapsComponent: Field values - namaJalan:', data.namaJalan, 'kepemilikanTiang:', data.kepemilikanTiang, 'jenisTiang:', data.jenisTiang);
                             if (data.titikKordinat) {
                                 // Parse coordinates from "lat, lng" format
                                 const coords = data.titikKordinat.split(',').map(coord => parseFloat(coord.trim()));
                                 if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                     const point = {
                                         id: doc.id,
                                         type: 'existing',
                                         lat: coords[0],
                                         lng: coords[1],
                                         title: data.namaJalan || 'Survey Existing',
                                         timestamp: data.createdAt,
                                         data: data,
                                         // Detailed information for popup
                                         details: {
                                             namaJalan: (data.namaJalan && data.namaJalan.trim()) || (data.projectTitle && data.projectTitle.trim()) || 'Tidak tersedia',
                                             kepemilikan: (data.kepemilikanTiang && data.kepemilikanTiang.trim()) || 'Tidak tersedia',
                                             jenisTiang: (data.jenisTiang && data.jenisTiang.trim()) || 'Tidak tersedia',
                                             trafo: (data.trafo && data.trafo.trim()) || 'Tidak tersedia',
                                             lampu: (data.lampu && data.lampu.trim()) || 'Tidak tersedia',
                                             jumlahLampu: (data.jumlahLampu && data.jumlahLampu.trim()) || 'Tidak tersedia',
                                             jenisLampu: (data.jenisLampu && data.jenisLampu.trim()) || 'Tidak tersedia',
                                             tinggiARM: (data.tinggiARM && data.tinggiARM.trim()) || 'Tidak tersedia',
                                             keterangan: (data.keterangan && data.keterangan.trim()) || 'Tidak ada keterangan',
                                             status: data.validationStatus || data.status || 'pending',
                                             isValidated: data.isValidated || false
                                         }
                                     };
                                     points.push(point);
                                     console.log('✅ MiniMapsComponent: Added survey existing point with details:', point.details);
                                 } else {
                                     console.log('❌ MiniMapsComponent: Invalid coordinates:', data.titikKordinat);
                                 }
                             } else {
                                 console.log('❌ MiniMapsComponent: No coordinates found in data');
                             }
                         });
                        
                        // Update existing points
                        setSurveyPoints(prev => {
                            // Preserve temporary existing markers (id starts with 'temp-') and non-existing types
                            const preservedTemps = prev.filter(p => p.type === 'existing' && String(p.id).startsWith('temp-'));
                            const others = prev.filter(p => p.type !== 'existing');
                            // Merge and dedupe by id
                            const merged = [...others, ...preservedTemps, ...points];
                            const dedup = [];
                            const seen = new Set();
                            for (const p of merged) {
                                const key = `${p.id}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    dedup.push(p);
                                }
                            }
                            console.log('📊 MiniMapsComponent: Updated survey points (existing legacy+temps), total:', dedup.length);
                            return dedup;
                        });
                    });

                                         unsubscribePropose = onSnapshot(proposeQuery, (snapshot) => {
                         const points = [];
                         snapshot.forEach((doc) => {
                             const data = doc.data();
                             if (data.titikKordinat) {
                                 // Parse coordinates from "lat, lng" format
                                 const coords = data.titikKordinat.split(',').map(coord => parseFloat(coord.trim()));
                                 if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                     points.push({
                                         id: doc.id,
                                         type: 'propose',
                                         lat: coords[0],
                                         lng: coords[1],
                                         title: data.namaJalan || 'Survey APJ Propose',
                                         timestamp: data.createdAt,
                                         data: data,
                                         // Detailed information for popup
                                         details: {
                                             idTitik: data.idTitik || 'Tidak tersedia',
                                             dataDaya: data.dataDaya || 'Tidak tersedia',
                                             dataTiang: data.dataTiang || 'Tidak tersedia',
                                             namaJalan: data.namaJalan || data.projectTitle || 'Tidak tersedia',
                                             status: data.status || 'pending',
                                             isValidated: data.isValidated || false
                                         }
                                     });
                                 }
                             }
                         });
                        
                        // Update propose points
                        setSurveyPoints(prev => {
                            // Preserve temporary propose markers (id starts with 'temp-') and non-propose types
                            const preservedTemps = prev.filter(p => p.type === 'propose' && String(p.id).startsWith('temp-'));
                            const others = prev.filter(p => p.type !== 'propose');
                            const merged = [...others, ...preservedTemps, ...points];
                            const dedup = [];
                            const seen = new Set();
                            for (const p of merged) {
                                const key = `${p.id}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    dedup.push(p);
                                }
                            }
                            return dedup;
                        });
                    });

                    // Subscribe to new Survey Existing collection (survey_existing)
                    unsubscribeExistingNew = onSnapshot(existingQueryNew, (snapshot) => {
                        const points = [];
                        console.log('📊 MiniMapsComponent: Loading survey_existing points, snapshot size:', snapshot.size);
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            const coordStr = data.titikKordinat || data.titikKoordinat || data.koordinat || data.coordinates;
                            if (coordStr && typeof coordStr === 'string') {
                                const coords = coordStr.split(',').map(c => parseFloat(String(c).trim()));
                                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                    const point = {
                                        id: doc.id,
                                        type: 'existing',
                                        lat: coords[0],
                                        lng: coords[1],
                                        title: data.namaJalan || 'Survey Existing',
                                        timestamp: data.createdAt,
                                        data: data,
                                        details: {
                                            namaJalan: data.namaJalan || data.projectTitle || 'Tidak tersedia',
                                            kepemilikan: data.kepemilikanTiang || 'Tidak tersedia',
                                            jenisTiang: data.jenisTiang || 'Tidak tersedia',
                                            trafo: data.trafo || 'Tidak tersedia',
                                            lampu: data.lampu || 'Tidak tersedia',
                                            status: data.validationStatus || data.status || 'pending',
                                            isValidated: data.isValidated || false
                                        }
                                    };
                                    points.push(point);
                                } else {
                                    console.log('❌ MiniMapsComponent: Invalid coordinates (survey_existing):', coordStr);
                                }
                            }
                        });

                        setSurveyPoints(prev => {
                            // Preserve temporary existing markers (id starts with 'temp-') and non-existing types
                            const preservedTemps = prev.filter(p => p.type === 'existing' && String(p.id).startsWith('temp-'));
                            const others = prev.filter(p => p.type !== 'existing');
                            const merged = [...others, ...preservedTemps, ...points];
                            const dedup = [];
                            const seen = new Set();
                            for (const p of merged) {
                                const key = `${p.id}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    dedup.push(p);
                                }
                            }
                            console.log('📊 MiniMapsComponent: Updated survey points with survey_existing (+temps), total:', dedup.length);
                            return dedup;
                        });
                    });

                    // Subscribe to new APJ Propose collection (apj_propose_tiang)
                    unsubscribeProposeNew = onSnapshot(proposeQueryNew, (snapshot) => {
                        const points = [];
                        console.log('📊 MiniMapsComponent: Loading apj_propose_tiang points, snapshot size:', snapshot.size);
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            const coordStr = data.titikKordinat || data.titikKoordinat || data.koordinat || data.coordinates;
                            if (coordStr && typeof coordStr === 'string') {
                                const coords = coordStr.split(',').map(c => parseFloat(String(c).trim()));
                                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                    points.push({
                                        id: doc.id,
                                        type: 'propose',
                                        lat: coords[0],
                                        lng: coords[1],
                                        title: data.namaJalan || 'Survey APJ Propose',
                                        timestamp: data.createdAt,
                                        data: data,
                                        details: {
                                            idTitik: data.idTitik || '-',
                                            dataDaya: data.dataDaya || '-',
                                            dataTiang: data.dataTiang || '-',
                                            namaJalan: data.namaJalan || '-',
                                            status: data.validationStatus || data.status || 'pending',
                                            isValidated: data.isValidated || false
                                        }
                                    });
                                } else {
                                    console.log('❌ MiniMapsComponent: Invalid coordinates (apj_propose_tiang):', coordStr);
                                }
                            }
                        });

                        setSurveyPoints(prev => {
                            // Preserve temporary propose markers (id starts with 'temp-') and non-propose types
                            const preservedTemps = prev.filter(p => p.type === 'propose' && String(p.id).startsWith('temp-'));
                            const others = prev.filter(p => p.type !== 'propose');
                            const merged = [...others, ...preservedTemps, ...points];
                            const dedup = [];
                            const seen = new Set();
                            for (const p of merged) {
                                const key = `${p.id}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    dedup.push(p);
                                }
                            }
                            console.log('📊 MiniMapsComponent: Updated survey points with apj_propose_tiang (+temps), total:', dedup.length);
                            return dedup;
                        });
                    });

                    // Load from Survey Trafo (survey-reports)
                    const trafoQuery = query(
                        collection(db, 'survey-reports'),
                        where('userId', '==', userId)
                    );

                    unsubscribeTrafo = onSnapshot(trafoQuery, (snapshot) => {
                        const points = [];
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            const coordStr = data.titikKordinat || data.titikKoordinat || data.titikKoordinatString;
                            if (coordStr && typeof coordStr === 'string') {
                                const coords = coordStr.split(',').map(c => parseFloat(String(c).trim()));
                                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                    points.push({
                                        id: doc.id,
                                        type: 'trafo',
                                        lat: coords[0],
                                        lng: coords[1],
                                        title: data.projectTitle || 'Survey Trafo',
                                        timestamp: data.createdAt,
                                        data: data,
                                        details: {
                                            jenisTiang: data.jenisTiang || '-',
                                            kepemilikan: data.kepemilikanTiang || '-',
                                            status: data.status || 'pending',
                                            isValidated: data.isValidated || false
                                        }
                                    });
                                }
                            }
                        });

                        // Update trafo points
                        setSurveyPoints(prev => {
                            const filtered = prev.filter(p => p.type !== 'trafo');
                            return [...filtered, ...points];
                        });
                    });
                } catch (error) {
                    console.error('Error loading survey points:', error);
                    setError('Gagal memuat titik survey');
                }
            };

            // Load task polygons
            const setupTaskPolygons = async () => {
                // Get taskId from props, sessionStorage, or state
                const activeTaskId = taskId || activeTaskIdFromSession || sessionStorage.getItem('currentTaskId');
                if (!activeTaskId) return;

                try {
                    const db = getFirestore(firebaseApp);
                    
                    // Get task data using doc() and getDoc()
                    const taskDocRef = doc(db, 'task_assignments', activeTaskId);
                    const taskDoc = await getDoc(taskDocRef);
                    if (!taskDoc.exists()) return;

                    const taskData = taskDoc.data();
                    
                    // Check if task has KMZ/KML data (same format as KMZMapComponent)
                    if (taskData.mapData) {
                        console.log('Loading task mapData:', taskData.mapData);
                        setTaskPolygons(taskData.mapData);
                    } else if (taskData.kmzFile) {
                        // Parse KMZ file if needed
                        console.log('KMZ file found but parsing not implemented yet');
                    }

                    // Also check sessionStorage for current task destination
                    try {
                        const currentTaskDest = sessionStorage.getItem('currentTaskDest');
                        if (currentTaskDest) {
                            const dest = JSON.parse(currentTaskDest);
                            if (Array.isArray(dest) && dest.length === 2) {
                                const [lat, lng] = dest;
                                setTaskPolygons(prev => [...prev, {
                                    type: 'Point',
                                    coordinates: [lng, lat],
                                    name: 'Tujuan Tugas'
                                }]);
                            }
                        }
                    } catch (error) {
                        console.error('Error parsing sessionStorage destination:', error);
                    }
                } catch (error) {
                    console.error('Error loading task polygons:', error);
                }
            };

            // Setup both
            setupSurveyPoints();
            setupTaskPolygons();

            // Return cleanup function
            return () => {
                if (unsubscribeExisting) {
                    unsubscribeExisting();
                }
                if (unsubscribeExistingNew) {
                    unsubscribeExistingNew();
                }
                if (unsubscribePropose) {
                    unsubscribePropose();
                }
                if (unsubscribeProposeNew) {
                    unsubscribeProposeNew();
                }
            };
        };

    }, [isPrimaryInstance, isVisible, hasActiveTask, userId, taskId]);

    // Maintain a single preview point marker derived from props
    useEffect(() => {
        setSurveyPoints(prev => {
            const filtered = prev.filter(p => p.type !== 'preview');
            if (previewPoint && typeof previewPoint.lat === 'number' && typeof previewPoint.lng === 'number' && isVisible) {
                const preview = {
                    id: 'preview',
                    type: 'preview',
                    lat: previewPoint.lat,
                    lng: previewPoint.lng,
                    title: 'Preview Titik',
                    timestamp: new Date(),
                    details: { status: 'Belum disimpan', isValidated: false }
                };
                return [...filtered, preview];
            }
            return filtered;
        });
    }, [previewPoint, isVisible]);

    // Listen to immediate point add after submit (optimistic update before Firestore snapshot)
    useEffect(() => {
        const handler = (e) => {
            try {
                const detail = e.detail || {};
                const lat = parseFloat(detail.lat);
                const lng = parseFloat(detail.lng);
                const type = detail.type === 'propose' ? 'propose' : 'existing';
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const point = {
                        id: `temp-${Date.now()}`,
                        type,
                        lat,
                        lng,
                        title: detail.title || (type === 'existing' ? 'Survey Existing' : 'Survey APJ Propose'),
                        timestamp: new Date(),
                        data: detail.data || {},
                        details: detail.details || { status: 'pending', isValidated: false }
                    };
                    setSurveyPoints(prev => [...prev, point]);
                }
            } catch (err) {
                console.error('MiniMapsComponent: failed to handle surveyPointAdded event', err);
            }
        };
        window.addEventListener('surveyPointAdded', handler);
        return () => window.removeEventListener('surveyPointAdded', handler);
    }, []);
    
    // Read last submitted point from sessionStorage (fallback if custom event missed)
    useEffect(() => {
        if (!isVisible) return;
        try {
            const raw = sessionStorage.getItem('lastSubmittedSurveyPoint');
            if (!raw) return;
            const payload = JSON.parse(raw);
            const lat = parseFloat(payload?.lat);
            const lng = parseFloat(payload?.lng);
            const type = payload?.type === 'propose' ? 'propose' : 'existing';
            const ts = Number(payload?.ts || 0);
            // Only consider points submitted in the last 10 minutes
            if (Number.isFinite(lat) && Number.isFinite(lng) && Date.now() - ts < 10 * 60 * 1000) {
                setSurveyPoints(prev => {
                    const exists = prev.some(p => Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lng - lng) < 1e-6 && p.type === type);
                    if (exists) return prev;
                    const point = {
                        id: `temp-${ts}`,
                        type,
                        lat,
                        lng,
                        title: payload?.title || (type === 'existing' ? 'Survey Existing' : 'Survey APJ Propose'),
                        timestamp: new Date(ts),
                        data: payload?.data || {},
                        details: payload?.details || { status: 'pending', isValidated: false }
                    };
                    return [...prev, point];
                });
            }
        } catch (e) {
            console.warn('MiniMapsComponent: failed to read lastSubmittedSurveyPoint from sessionStorage', e);
        }
    }, [isVisible]);

    // Always render Mini Maps even if there is no active task in progress.
    // This enables showing points while filling Survey Existing / APJ Propose.
    if (!hasActiveTask || !activeTaskIdFromSession) {
        console.log('ℹ️ MiniMapsComponent: No active task, rendering lightweight Mini Maps');
        // do not return; keep rendering below (route tracking will remain off)
    }

    // Show toggle button when not visible
    if (!isVisible) {
        console.log('🔵 MiniMapsComponent: Showing toggle button, isVisible:', isVisible, 'hasActiveTask:', hasActiveTask);
        return (
            <div style={{ position: 'fixed', bottom: '96px', right: '24px', zIndex: 30, pointerEvents: 'auto' }}>
                <button
                    onClick={() => {
                        console.log('🔄 MiniMapsComponent: Toggle button clicked, current isVisible:', isVisible);
                        setIsVisible(true);
                        // Remove manual close flag when reopening
                        sessionStorage.removeItem('miniMapsManuallyClosed');
                        console.log('✅ MiniMapsComponent: Toggle button action completed');
                    }}
                    disabled={isAnimating}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 group"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    title="Buka Mini Maps"
                >
                    <Navigation size={24} className="text-white group-hover:scale-110 transition-transform duration-200" />
                </button>
            </div>
        );
    }

    console.log('🎯 MiniMapsComponent: Rendering main component, isVisible:', isVisible, 'isExpanded:', isExpanded, 'isAnimating:', isAnimating);
    
    return (
        <div className={`fixed z-40 mini-maps-container ${
            isExpanded 
                ? 'expanded bottom-6 right-6 w-[420px] h-[480px]' 
                : 'bottom-24 right-6 w-80 h-60'
        } ${isVisible ? 'visible' : 'hidden'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
            {/* Header with Glassmorphism */}
            <div className="mini-maps-header rounded-t-2xl p-3.5 flex items-center justify-between" style={{ pointerEvents: 'auto', zIndex: 9998 }}>
                <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                        <Target size={16} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800 leading-none">Mini Maps</span>
                        <span className="text-xs text-gray-500">Real-time Tracking</span>
                    </div>
                    {(loading || !mapLoaded) && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                </div>
                <div className="flex items-center space-x-1.5">
                    <button
                        onClick={reloadSurveyorPoints}
                        className="mini-maps-btn p-2 hover:bg-green-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title="Reload Titik Koordinat"
                        disabled={isReloadingPoints}
                    >
                        <RefreshCw size={16} strokeWidth={2.5} className={`${isReloadingPoints ? 'animate-spin text-green-400' : 'text-green-600'}`} />
                    </button>
                    <button
                        onClick={reloadKmzFromSession}
                        className="mini-maps-btn p-2 hover:bg-blue-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title="Muat ulang KMZ"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.37 4.37A9 9 0 0020.49 15"></path></svg>
                    </button>
                    <button
                        onClick={focusOnKmzContent}
                        className="mini-maps-btn p-2 hover:bg-purple-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title="Fokus ke Area KMZ"
                        disabled={!kmzData || (!kmzData.coordinates?.length && !kmzData.polygons?.length && !kmzData.lines?.length)}
                    >
                        <Map size={16} strokeWidth={2.5} className={`${!kmzData || (!kmzData.coordinates?.length && !kmzData.polygons?.length && !kmzData.lines?.length) ? 'text-gray-300' : 'text-purple-600'}`} />
                    </button>
                    <button
                        onClick={focusOnUserLocation}
                        className="mini-maps-btn p-2 hover:bg-blue-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title="Fokus ke Lokasi Saya"
                        disabled={!currentLocation}
                    >
                        <Crosshair size={16} strokeWidth={2.5} className={`${!currentLocation ? 'text-gray-300' : 'text-blue-600'}`} />
                    </button>
                    <button
                        onClick={() => {
                            // Re-enable auto-follow by dispatching event to map
                            window.dispatchEvent(new CustomEvent('focusUserLocation', { 
                                detail: { 
                                    location: currentLocation,
                                    userRequested: true
                                } 
                            }));
                        }}
                        className="mini-maps-btn p-2 hover:bg-green-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title="Ikuti Lokasi Saya (Auto-Follow)"
                        disabled={!currentLocation}
                    >
                        <Navigation size={16} strokeWidth={2.5} className={`${!currentLocation ? 'text-gray-300' : 'text-green-600'}`} />
                    </button>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <button
                        onClick={() => {
                            console.log('🔄 MiniMapsComponent: Expand/minimize button clicked, current isExpanded:', isExpanded);
                            setIsExpanded(!isExpanded);
                        }}
                        className="mini-maps-btn p-2 hover:bg-gray-50 rounded-lg transition-all"
                        style={{ cursor: 'pointer' }}
                        title={isExpanded ? 'Perkecil' : 'Perbesar'}
                    >
                        {isExpanded ? <Minimize2 size={16} strokeWidth={2.5} className="text-gray-600" /> : <Maximize2 size={16} strokeWidth={2.5} className="text-gray-600" />}
                    </button>
                    <button
                        onClick={() => {
                            console.log('🖱️ MiniMapsComponent: Close button clicked - INLINE');
                            console.log('🔄 MiniMapsComponent: Setting isVisible to false');
                            setIsVisible(false);
                            sessionStorage.setItem('miniMapsManuallyClosed', 'true');
                            console.log('✅ MiniMapsComponent: Close button action completed');
                        }}
                        disabled={isAnimating}
                        className="mini-maps-btn p-2 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-all relative z-10"
                        style={{ zIndex: 9999, cursor: 'pointer', pointerEvents: 'auto' }}
                        title="Tutup"
                    >
                        <X size={16} strokeWidth={2.5} className="text-gray-600 hover:text-red-600" />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="bg-white shadow-lg overflow-hidden" style={{ borderRadius: isExpanded ? '0 0 1rem 1rem' : '0' }}>
                <div 
                    className="w-full h-full relative"
                    style={{ height: isExpanded ? '360px' : '180px' }}
                >
                    <MiniMapsLeaflet
                        currentLocation={currentLocation}
                        surveyPoints={surveyPoints}
                        surveyorProgressPoints={surveyorProgressPoints}
                        taskPolygons={kmzData}
                        routePoints={routePoints}
                        isExpanded={isExpanded}
                        onMapLoaded={handleMapLoaded}
                        onMapError={handleMapError}
                    />
                </div>
            </div>

            {/* Info Panel - Only show when not expanded */}
            {!isExpanded && (
            <div className="mini-maps-info rounded-xl shadow-lg mt-2.5 p-3 backdrop-blur-md">
                <div className="space-y-1.5">
                    {/* Current Location */}
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div>
                            <span className="text-xs font-medium text-gray-700">Lokasi Anda</span>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold">●</span>
                    </div>

                    {/* Survey Points */}
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-sm"></div>
                            <span className="text-xs font-medium text-gray-700">Survey Existing</span>
                        </div>
                        <span className="text-xs text-red-600 font-semibold">{surveyPoints.filter(p => p.type === 'existing').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm"></div>
                            <span className="text-xs font-medium text-gray-700">APJ Propose</span>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold">{surveyPoints.filter(p => p.type === 'propose').length}</span>
                    </div>
                    
                    {/* Surveyor Progress Points */}
                    {surveyorProgressPoints && surveyorProgressPoints.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 bg-green-600 rounded-full shadow-sm"></div>
                                <span className="text-xs font-medium text-gray-700">Progress Tersimpan</span>
                            </div>
                            <span className="text-xs text-green-600 font-semibold">{surveyorProgressPoints.length}</span>
                        </div>
                    )}

                    {/* Surveyor Progress Points */}
                    {surveyorProgressPoints.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border-2 border-green-300">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 bg-green-600 rounded-full shadow-sm animate-pulse"></div>
                                <span className="text-xs font-medium text-gray-700">Progress Anda</span>
                            </div>
                            <span className="text-xs text-green-600 font-bold">{surveyorProgressPoints.length}</span>
                        </div>
                    )}
                    
                    {/* Route Tracking */}
                    {routeTracking && (
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm"></div>
                                <span className="text-xs font-medium text-gray-700">Jejak Surveyor</span>
                            </div>
                            <span className="text-xs text-orange-600 font-semibold">{routePoints.length}</span>
                        </div>
                    )}
                    
                    {/* Task Area from KMZ */}
                    {kmzData && (
                        <>
                            {kmzData.coordinates && kmzData.coordinates.length > 0 && (
                                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div>
                                        <span className="text-xs font-medium text-gray-700">Koordinat KMZ</span>
                                    </div>
                                    <span className="text-xs text-red-600 font-semibold">{kmzData.coordinates.length}</span>
                                </div>
                            )}
                            {kmzData.polygons && kmzData.polygons.length > 0 && (
                                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-sm"></div>
                                        <span className="text-xs font-medium text-gray-700">Area KMZ</span>
                                    </div>
                                    <span className="text-xs text-purple-600 font-semibold">{kmzData.polygons.length}</span>
                                </div>
                            )}
                            {kmzData.lines && kmzData.lines.length > 0 && (
                                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-sm"></div>
                                        <span className="text-xs font-medium text-gray-700">Garis KMZ</span>
                                    </div>
                                    <span className="text-xs text-purple-600 font-semibold">{kmzData.lines.length}</span>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* KMZ Loading State */}
                    {kmzLoading && (
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 border border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-medium text-gray-700">Memuat data KMZ...</span>
                            </div>
                        </div>
                    )}
                    
                    {/* KMZ Error */}
                    {kmzError && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">
                            ⚠️ {kmzError}
                        </div>
                    )}

                    {/* Error Messages */}
                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">
                            ⚠️ {error}
                        </div>
                    )}
                    {mapError && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">
                            ⚠️ {mapError}
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default MiniMapsComponent;

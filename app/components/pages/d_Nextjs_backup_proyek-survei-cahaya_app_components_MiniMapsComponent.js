import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Maximize2, Minimize2, Navigation, Target } from 'lucide-react';
import { auth } from '../lib/firebase';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, addDoc } from 'firebase/firestore';
import { firebaseApp } from '../lib/firebase';
import dynamic from 'next/dynamic';

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

const MiniMapsComponent = ({ taskId, userId, previewPoint }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [surveyPoints, setSurveyPoints] = useState([]);
    const [taskPolygons, setTaskPolygons] = useState([]);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hasActiveTask, setHasActiveTask] = useState(false);
    const [activeTaskIdFromSession, setActiveTaskIdFromSession] = useState(null);
    const [activeTaskKmz, setActiveTaskKmz] = useState(null);
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

    // Check if user has active task from sessionStorage
    useEffect(() => {
        const checkActiveTask = () => {
            try {
                const currentTaskId = sessionStorage.getItem('currentTaskId');
                const currentTaskKmz = sessionStorage.getItem('currentTaskKmz');
                const currentTaskDest = sessionStorage.getItem('currentTaskDest');
                const currentTaskStatus = sessionStorage.getItem('currentTaskStatus');
                
                console.log('🔍 MiniMapsComponent: Checking sessionStorage:', {
                    currentTaskId,
                    currentTaskKmz,
                    activeTaskKmz,
                    currentTaskDest,
                    currentTaskStatus
                });
                
                // Only show mini maps if task is in_progress
                if (currentTaskId && currentTaskStatus === 'in_progress') { // Kunci perbaikan ada di sini
                    console.log('✅ MiniMapsComponent: Active task in progress detected:', currentTaskId);
                    setHasActiveTask(true);
                    setActiveTaskIdFromSession(currentTaskId);
                    // Muat KMZ dari session storage jika ada
                    if (currentTaskKmz && currentTaskKmz !== activeTaskKmz) {
                        console.log('🗺️ MiniMapsComponent: Loading new KMZ from active task:', currentTaskKmz);
                        setActiveTaskKmz(currentTaskKmz);
                    }
                    // Auto-show mini maps for active tasks only if not manually closed
                    if (!isVisible && !sessionStorage.getItem('miniMapsManuallyClosed')) {
                        setIsVisible(true);
                    }
                } else {
                    console.log('❌ MiniMapsComponent: No active task in progress found');
                    setHasActiveTask(false);
                    setActiveTaskIdFromSession(null);
                    setActiveTaskKmz(null); // Pastikan KMZ juga di-clear
                    setIsVisible(false);
                    // Clear manual close flag when no active task
                    sessionStorage.removeItem('miniMapsManuallyClosed');
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

        window.addEventListener('currentTaskChanged', handleTaskChange);
        window.addEventListener('storage', handleTaskChange);

        return () => {
            window.removeEventListener('currentTaskChanged', handleTaskChange);
            window.removeEventListener('storage', handleTaskChange);
        };
    }, [activeTaskKmz]); // Tambahkan activeTaskKmz sebagai dependency

    // Debug useEffect untuk memantau perubahan isVisible
    useEffect(() => {
        console.log('📊 MiniMapsComponent: isVisible changed to:', isVisible);
        console.log('📊 MiniMapsComponent: Manual close flag:', sessionStorage.getItem('miniMapsManuallyClosed'));
    }, [isVisible]);

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
                    },
                    (error) => {
                        console.error('Error getting location during tracking:', error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 10000
                    }
                );
            }
        }, 10000); // Track every 10 seconds

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

        // Save route data to Firestore
        try {
            const db = getFirestore(firebaseApp);
            const finalRouteData = {
                ...routeData,
                endTime: endTime,
                surveyPoints: surveyPoints,
                createdAt: new Date(),
                status: 'completed',
                collectionName: 'Maps_Surveyor' // Add collection name for reference
            };

            // Save to Maps_Surveyor collection
            await addDoc(collection(db, 'Maps_Surveyor'), finalRouteData);
            console.log('✅ MiniMapsComponent: Route data saved to Maps_Surveyor collection');
            
            // Also save to surveyor_routes for backward compatibility
            await addDoc(collection(db, 'surveyor_routes'), finalRouteData);
            console.log('✅ MiniMapsComponent: Route data also saved to surveyor_routes collection');
            
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
        if (isVisible && !currentLocation) {
            getCurrentLocation();
        }
    }, [isVisible, currentLocation]);

    // Start tracking when task is active
    useEffect(() => {
        if (hasActiveTask && activeTaskIdFromSession && userId && !routeTracking) {
            console.log('🚀 MiniMapsComponent: Starting route tracking for active task');
            startRouteTracking();
        }
    }, [hasActiveTask, activeTaskIdFromSession, userId, routeTracking, startRouteTracking]);

    // Stop tracking when task is completed
    useEffect(() => {
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
    }, [routeTracking, stopRouteTracking]);

    // Update route data with survey points when they change
    useEffect(() => {
        if (routeTracking && surveyPoints.length > 0) {
            setRouteData(prev => ({
                ...prev,
                surveyPoints: surveyPoints
            }));
        }
    }, [surveyPoints, routeTracking]);

    useEffect(() => {
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

                                         unsubscribeExisting = onSnapshot(existingQuery, (snapshot) => {
                         const points = [];
                         console.log('📊 MiniMapsComponent: Loading survey existing points, snapshot size:', snapshot.size);
                         snapshot.forEach((doc) => {
                             const data = doc.data();
                             console.log('📊 MiniMapsComponent: Survey existing data:', data);
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
                                             namaJalan: data.namaJalan || '-',
                                             kepemilikan: data.kepemilikanTiang || '-',
                                             jenisTiang: data.jenisTiang || '-',
                                             trafo: data.trafo || '-',
                                             lampu: data.lampu || '-',
                                             status: data.validationStatus || data.status || 'pending',
                                             isValidated: data.isValidated || false
                                         }
                                     };
                                     points.push(point);
                                     console.log('✅ MiniMapsComponent: Added survey existing point:', point);
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
                                             idTitik: data.idTitik || '-',
                                             dataDaya: data.dataDaya || '-',
                                             dataTiang: data.dataTiang || '-',
                                             namaJalan: data.namaJalan || '-',
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
                                            namaJalan: data.namaJalan || '-',
                                            kepemilikan: data.kepemilikanTiang || '-',
                                            jenisTiang: data.jenisTiang || '-',
                                            trafo: data.trafo || '-',
                                            lampu: data.lampu || '-',
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
                if (unsubscribeTrafo) {
                    unsubscribeTrafo();
                }
            };
        }
    }, [isVisible, userId, taskId, hasActiveTask, activeTaskIdFromSession]);

    // Handle preview point from form (temporary marker before save)
    useEffect(() => {
        if (!isVisible) return;
        // Remove previous preview and add new one if valid
        setSurveyPoints(prev => {
            const filtered = prev.filter(p => p.type !== 'preview');
            if (previewPoint && typeof previewPoint.lat === 'number' && typeof previewPoint.lng === 'number') {
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
            <div style={{ position: 'fixed', bottom: '96px', right: '24px', zIndex: 9999, pointerEvents: 'auto' }}>
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
        <div className={`fixed z-50 mini-maps-container ${
            isExpanded 
                ? 'bottom-6 right-6 w-96 h-80' 
                : 'bottom-24 right-6 w-64 h-48'
        } ${isVisible ? 'visible' : 'hidden'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
            {/* Header */}
            <div className="bg-white rounded-t-xl shadow-lg border-b border-gray-200 p-3 flex items-center justify-between" style={{ pointerEvents: 'auto', zIndex: 9998 }}>
                <div className="flex items-center space-x-2">
                    <Target size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Mini Maps</span>
                    {(loading || !mapLoaded) && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => {
                            console.log('🔄 MiniMapsComponent: Expand/minimize button clicked, current isExpanded:', isExpanded);
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        style={{ cursor: 'pointer' }}
                        title={isExpanded ? 'Perkecil' : 'Perbesar'}
                    >
                        {isExpanded ? <Minimize2 size={14} className="text-gray-600" /> : <Maximize2 size={14} className="text-gray-600" />}
                    </button>
                    <button
                        onClick={() => {
                            console.log('🖱️ MiniMapsComponent: Close button clicked - INLINE');
                            console.log('🔄 MiniMapsComponent: Setting isVisible to false');
                            setIsVisible(false);
                            // Mark as manually closed
                            sessionStorage.setItem('miniMapsManuallyClosed', 'true');
                            console.log('✅ MiniMapsComponent: Close button action completed');
                        }}
                        disabled={isAnimating}
                        className="p-1 hover:bg-gray-100 disabled:opacity-50 rounded transition-colors relative z-10"
                        style={{ zIndex: 9999, cursor: 'pointer', pointerEvents: 'auto' }}
                        title="Tutup"
                    >
                        <X size={14} className="text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
                <div 
                    className="w-full h-full"
                    style={{ height: isExpanded ? '280px' : '180px' }}
                > 
                    <MiniMapsLeaflet
                        currentLocation={currentLocation}
                        surveyPoints={surveyPoints}
                        taskPolygons={taskPolygons}
                        routePoints={routePoints}
                        isExpanded={isExpanded}
                        onMapLoaded={handleMapLoaded}
                        kmzUrl={activeTaskKmz} // Pass KMZ URL to Leaflet component
                        onMapError={handleMapError}
                    />
                </div>
            </div>

            {/* Info Panel */}
            <div className="bg-white rounded-xl shadow-lg mt-2 p-3 max-w-64">
                <div className="space-y-2">
                    {/* Current Location */}
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Lokasi Anda</span>
                    </div>

                    {/* Survey Points */}
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">
                            Survey Existing ({surveyPoints.filter(p => p.type === 'existing').length})
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">
                            Survey APJ Propose ({surveyPoints.filter(p => p.type === 'propose').length})
                        </span>
                    </div>
                    
                                {/* Route Tracking */}
            {routeTracking && (
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">
                        Jejak Surveyor ({routePoints.length} titik)
                    </span>
                </div>
            )}
            
            {/* Database Info */}
            <div className="flex items-center space-x-2">
                <span className="text-xs text-blue-600 font-medium">
                    📊 Maps_Surveyor
                </span>
            </div>
                    
                    {/* Task Area */}
                    {taskPolygons && (
                        <>
                            {taskPolygons.coordinates && taskPolygons.coordinates.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">
                                        Koordinat Tugas ({taskPolygons.coordinates.length})
                                    </span>
                                </div>
                            )}
                            {taskPolygons.polygons && taskPolygons.polygons.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">
                                        Area Tugas ({taskPolygons.polygons.length})
                                    </span>
                                </div>
                            )}
                            {taskPolygons.lines && taskPolygons.lines.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">
                                        Garis Tugas ({taskPolygons.lines.length})
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error Messages */}
                    {error && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}
                    {mapError && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                            {mapError}
                        </div>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={getCurrentLocation}
                        disabled={loading}
                        className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs py-2 px-3 rounded-lg transition-colors"
                    >
                        {loading ? 'Memuat...' : 'Refresh Lokasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniMapsComponent;

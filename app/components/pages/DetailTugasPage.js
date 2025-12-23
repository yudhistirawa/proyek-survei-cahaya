import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ExternalLink, Eye, BarChart3, Play } from 'lucide-react';
import dynamic from 'next/dynamic';
const MapDisplay = dynamic(() => import('../MapDisplay'), { ssr: false });
const KMZMapComponent = dynamic(() => import('../admin/task-distribution/KMZMapComponent'), { ssr: false });
const MiniMapsComponent = dynamic(() => import('../MiniMapsComponent'), { ssr: false });
import DailySummaryPage from './DailySummaryPage';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';
import { loadTaskProgress, saveTaskProgress, clearTaskProgress } from '../../lib/taskProgress';
import { safeParseKmzFromUrl } from '../../lib/kmz-utils';

const DetailTugasPage = ({ onBack, taskData }) => {
    // Flexible date formatting helpers to avoid "Invalid Date" across different data types
    const toDateObj = (value) => {
        try {
            if (!value) return null;
            // Firestore Timestamp object
            if (typeof value.toDate === 'function') return value.toDate();
            // Firestore plain object { seconds, nanoseconds }
            if (typeof value === 'object' && typeof value.seconds === 'number') {
                return new Date(value.seconds * 1000);
            }
            // Number (ms) or numeric string
            if (typeof value === 'number') return new Date(value);
            if (typeof value === 'string') {
                // Handle datetime-local without timezone by treating as local
                // e.g. "2025-09-09T12:30"
                const isoLike = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
                if (isoLike.test(value)) return new Date(value);
                const d = new Date(value);
                if (!isNaN(d.getTime())) return d;
            }
            return null;
        } catch {
            return null;
        }
    };

    // Format deadline berdasarkan waktu server: jika sudah lewat, tampilkan "Invalid Date"
    const formatDeadlineOrInvalid = (value) => {
        const d = toDateObj(value);
        if (!d) return '-';
        if (serverNow && d.getTime() < serverNow.getTime()) return 'Invalid Date';
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatDateOnly = (value) => {
        const d = toDateObj(value);
        if (!d) return '-';
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatDateTime = (value) => {
        const d = toDateObj(value);
        if (!d) return '-';
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const [selectedJalan, setSelectedJalan] = useState(null);
    const [showDailySummary, setShowDailySummary] = useState(false);
    const [showMiniMaps, setShowMiniMaps] = useState(false);
    const [user, setUser] = useState(null);
    const [destination, setDestination] = useState(null); // [lat, lng] untuk Google Maps
    const [taskStatus, setTaskStatus] = useState('pending'); // 'pending', 'started', 'completed'
    // Waktu server realtime (tidak mengikuti device)
    const [serverNow, setServerNow] = useState(null);
    const [adminInfo, setAdminInfo] = useState({ name: '', email: '', uid: '' });
    // Track tugas aktif di session (agar satu tugas saja yang berjalan)
    const [activeTaskId, setActiveTaskId] = useState(null);
    const [activeTaskStatus, setActiveTaskStatus] = useState(null);
    const [taskProgress, setTaskProgress] = useState(null);
    const [surveyorPoints, setSurveyorPoints] = useState([]);

    // Sample data jika tidak ada taskData - harus didefinisikan sebelum useEffect
    const defaultTaskData = {
        type: 'existing', // 'existing' atau 'propose'
        judulTugas: 'Survey Pencahayaan Jalan',
        linkMymaps: 'https://mymaps.google.com/example',
        deskripsi: 'Melakukan survey pencahayaan di area yang telah ditentukan. Pastikan semua titik lampu tercatat dengan baik dan koordinat GPS akurat.',
        jalanList: [
            { id: 'Id Jalan 1', detail: 'Jalan Sudirman Km 1-2' },
            { id: 'Id Jalan 2', detail: 'Jalan Thamrin Km 0-1' },
            { id: 'Id jalan 3', detail: 'Jalan MH Thamrin Km 1-2' }
        ]
    };

    const task = taskData || defaultTaskData;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    // Load task progress from Firestore when task is loaded
    useEffect(() => {
        const loadProgress = async () => {
            if (user && task?.id) {
                console.log('🔍 DetailTugasPage: Loading progress for user', user.uid, 'task', task.id);
                const progress = await loadTaskProgress(user.uid, task.id);
                console.log('📦 DetailTugasPage: Progress loaded:', progress);
                
                if (progress) {
                    setTaskProgress(progress);
                    
                    // PENTING: Restore surveyor points dari Firestore
                    const restoredPoints = progress.surveyorPoints || [];
                    console.log('🎯 DetailTugasPage: Restoring surveyor points:', restoredPoints);
                    setSurveyorPoints(restoredPoints);
                    console.log('✅ DetailTugasPage: Loaded task progress with', restoredPoints.length, 'surveyor points');
                    console.log('📍 DetailTugasPage: Surveyor points state updated, MiniMapsComponent should receive:', restoredPoints);
                    
                    // If task was in progress, restore session completely
                    if (progress.status === 'in_progress') {
                        setTaskStatus('in_progress');
                        setShowMiniMaps(true);
                        
                        // Restore sessionStorage for continuity with ALL data
                        try {
                            const taskType = task.taskType || task.type || progress.taskData?.taskType || 'existing';
                            
                            sessionStorage.setItem('currentTaskId', task.id);
                            sessionStorage.setItem('currentTaskStatus', 'in_progress');
                            sessionStorage.setItem('currentTaskType', taskType);
                            
                            // Restore KMZ data
                            if (task.mapData) {
                                sessionStorage.setItem('currentTaskKmzData', JSON.stringify(task.mapData));
                                console.log('✅ Restored mapData for ' + taskType);
                            }
                            
                            // Restore kmzFile
                            if (task.kmzFile) {
                                sessionStorage.setItem('currentTaskKmz', JSON.stringify(task.kmzFile));
                                console.log('✅ Restored kmzFile for ' + taskType);
                            } else if (task.linkMymaps) {
                                sessionStorage.setItem('currentTaskKmz', task.linkMymaps);
                                console.log('✅ Restored linkMymaps for ' + taskType);
                            }
                            
                            // Force mini maps to show
                            sessionStorage.setItem('miniMapsAutoFocus', 'true');
                            sessionStorage.removeItem('miniMapsManuallyClosed');
                            
                            window.dispatchEvent(new Event('currentTaskChanged'));
                            console.log('✅ Task session fully restored from progress for ' + taskType + ' with ' + restoredPoints.length + ' points');
                        } catch (e) {
                            console.warn('Failed to restore session:', e);
                        }
                    }
                }
            }
        };

        loadProgress();
    }, [user, task?.id, task?.mapData, task?.kmzFile, task?.linkMymaps, task?.type, task?.taskType]);

    // Listen for surveyor point updates
    useEffect(() => {
        const handlePointAdded = async (event) => {
            if (user && task?.id && event.detail) {
                const newPoint = event.detail;
                const updatedPoints = [...surveyorPoints, newPoint];
                setSurveyorPoints(updatedPoints);
                
                // Save to Firestore
                await saveTaskProgress(user.uid, task.id, {
                    surveyorPoints: updatedPoints,
                    totalPoints: updatedPoints.length,
                    lastUpdated: new Date().toISOString()
                });
                
                console.log('✅ Surveyor point saved:', newPoint);
            }
        };

        window.addEventListener('surveyorPointAdded', handlePointAdded);
        return () => window.removeEventListener('surveyorPointAdded', handlePointAdded);
    }, [user, task?.id, surveyorPoints]);

    // Sinkronkan status tugas aktif dari sessionStorage
    useEffect(() => {
        const loadActive = () => {
            try {
                const id = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
                const st = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskStatus') : null;
                setActiveTaskId(id);
                setActiveTaskStatus(st);
            } catch {}
        };
        loadActive();
        const onChange = () => loadActive();
        if (typeof window !== 'undefined') {
            window.addEventListener('currentTaskChanged', onChange);
        }
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('currentTaskChanged', onChange);
        };
    }, []);
    
    // Ambil waktu server dan update berkala agar realtime
    useEffect(() => {
        let timer;
        const fetchServerTime = async () => {
            try {
                const res = await fetch('/api/server-time', { cache: 'no-store' });
                const data = await res.json();
                const now = new Date(data.now);
                if (!isNaN(now.getTime())) setServerNow(now);
            } catch (e) {
                // Fallback sementara jika gagal mengambil waktu server
                setServerNow(new Date());
            }
        };
        fetchServerTime();
        timer = setInterval(fetchServerTime, 60000);
        return () => clearInterval(timer);
    }, []);
    
    // Initialize taskStatus based on session storage or task data
    useEffect(() => {
        const storedTaskId = sessionStorage.getItem('currentTaskId');
        
        if (storedTaskId === task.id) {
            setTaskStatus('started');
        } else if (task.status === 'completed') {
            setTaskStatus('completed');
        } else {
            setTaskStatus('pending');
        }
    }, [task.id, task.status]); // Re-evaluate if task.id or task.status from props changes
    
    // Log task data untuk debugging
    console.log('DetailTugasPage - Task Data:', task);

    // Ambil nama admin pemberi tugas dari users/{createdBy}
    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                const createdBy = task?.createdBy;
                if (!createdBy) {
                    setAdminInfo(prev => ({ ...prev, name: task?.createdByName || '' }));
                    return;
                }
                const db = getFirestore(firebaseApp);
                const snap = await getDoc(doc(db, 'users', createdBy));
                if (snap.exists()) {
                    const u = snap.data() || {};
                    const name = u.name || u.fullName || u.username || u.displayName || u.email || createdBy;
                    setAdminInfo({ name, email: u.email || '', uid: createdBy });
                } else {
                    setAdminInfo({ name: task?.createdByName || createdBy, email: '', uid: createdBy });
                }
            } catch (e) {
                console.warn('Gagal mengambil data admin pemberi tugas:', e?.message);
            }
        };
        fetchAdmin();
    }, [task?.createdBy, task?.createdByName]);

    // Sync parsed KMZ mapData to sessionStorage when it becomes available or changes
    // Also attempt to parse KMZ if mapData is missing but kmzFile exists
    useEffect(() => {
        const syncOrParseMapData = async () => {
            try {
                const taskType = task?.taskType || task?.type || 'existing';
                
                // Always set taskType to sessionStorage when task is available
                if (task?.id) {
                    sessionStorage.setItem('currentTaskType', taskType);
                    console.log('🔁 DetailTugasPage: Set currentTaskType:', taskType);
                }
                
                if (task?.mapData) {
                    sessionStorage.setItem('currentTaskKmzData', JSON.stringify(task.mapData));
                    console.log('🔁 DetailTugasPage: Synced currentTaskKmzData from task.mapData for ' + taskType, task.mapData);
                    // notify MiniMaps to reload
                    window.dispatchEvent(new Event('currentTaskChanged'));
                } else if (task?.kmzFile && !task?.mapData) {
                    // If we have kmzFile but no mapData, try to parse it
                    console.log('🔍 DetailTugasPage: Attempting to parse KMZ for ' + taskType + ' (no mapData found)');
                    try {
                        const parsedData = await safeParseKmzFromUrl(task.kmzFile);
                        if (parsedData && (parsedData.coordinates || parsedData.polygons || parsedData.lines)) {
                            console.log('✅ DetailTugasPage: Successfully parsed KMZ data for ' + taskType, parsedData);
                            // Store the parsed data temporarily
                            sessionStorage.setItem('currentTaskKmzData', JSON.stringify(parsedData));
                            // Update task object in memory (this won't persist to database)
                            task.mapData = parsedData;
                            // notify MiniMaps to reload
                            window.dispatchEvent(new Event('currentTaskChanged'));
                        } else {
                            console.warn('⚠️ DetailTugasPage: Parsed KMZ data is empty or invalid for ' + taskType);
                        }
                    } catch (parseError) {
                        console.error('❌ DetailTugasPage: Failed to parse KMZ for ' + taskType + ':', parseError.message);
                    }
                } else {
                    console.log('⚠️ DetailTugasPage: No task.mapData or kmzFile to sync for ' + taskType);
                    // Also log what we do have
                    if (task) {
                        console.log('📋 DetailTugasPage: Available task data:', {
                            id: task.id,
                            type: taskType,
                            hasMapData: !!task.mapData,
                            hasKmzFile: !!task.kmzFile,
                            hasLinkMymaps: !!task.linkMymaps,
                            kmzFileName: task.kmzFile?.fileName,
                            linkMymaps: task.linkMymaps
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ DetailTugasPage: Failed to sync currentTaskKmzData:', e.message);
            }
        };
        
        syncOrParseMapData();
    }, [task?.mapData, task?.id, task?.type, task?.taskType, task?.kmzFile, task?.linkMymaps]);

    const handleDetailJalan = (jalan) => {
        setSelectedJalan(jalan);
        alert(`Detail Jalan:\n\nID: ${jalan.id}\nDetail: ${jalan.detail}`);
    };

    const handleOpenMymaps = () => {
        // 1) Prioritaskan koordinat hasil render peta (KMZ center)
        if (Array.isArray(destination) && destination.length === 2) {
            const [lat, lng] = destination;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
            window.open(url, '_blank');
            return;
        }

        // 2) Jika link berupa "lat,lng" yang sudah ada di data
        if (task.linkMymaps && /-?\d+\.?\d*,\s*-?\d+\.?\d*/.test(task.linkMymaps)) {
            const [latStr, lngStr] = task.linkMymaps.split(',');
            const lat = parseFloat(latStr.trim());
            const lng = parseFloat(lngStr.trim());
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
                window.open(url, '_blank');
                return;
            }
        }

        // 3) Jika link adalah URL Google Maps yang valid, buka langsung
        if (task.linkMymaps && /^https?:\/\//i.test(task.linkMymaps)) {
            window.open(task.linkMymaps, '_blank');
            return;
        }

        alert('Lokasi peta tidak tersedia');
    };

    const handleShowDailySummary = () => {
        setShowDailySummary(true);
    };

    const handleBackFromSummary = () => {
        setShowDailySummary(false);
    };

    const handleStartTask = async () => {
        // Cegah mulai tugas jika sudah in_progress
        if (taskStatus === 'in_progress' || taskStatus === 'started') {
            alert('Tugas ini sudah dimulai dan sedang berlangsung. Silakan selesaikan tugas terlebih dahulu.');
            return;
        }
        
        if (taskStatus === 'completed') {
            alert('Tugas ini sudah selesai dan tidak dapat dimulai kembali.');
            return;
        }
        
        // Cegah mulai tugas baru jika ada tugas lain yang sedang berjalan
        try {
            const existingId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
            const existingStatus = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskStatus') : null;
            if (existingId && existingId !== task.id && existingStatus !== 'completed') {
                alert('Anda masih memiliki tugas lain yang sedang berlangsung. Selesaikan tugas tersebut terlebih dahulu sebelum memulai tugas baru.');
                return;
            }
        } catch {}

        // Update task status in database first
        try {
            const response = await fetch('/api/task-assignments/' + task.id, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'in_progress',
                    startedAt: new Date().toISOString(),
                    startedBy: user?.uid || 'unknown'
                })
            });

            if (!response.ok) {
                console.warn('Failed to update task status to in_progress');
            } else {
                console.log('✅ Task status updated to in_progress in database');
            }
        } catch (error) {
            console.warn('Error updating task status:', error);
        }

        // Update local task status
        setTaskStatus('in_progress');
        console.log('🔄 Task status changed to in_progress');
        
        // Save progress to Firestore with complete data
        if (user && task.id) {
            const taskType = task.taskType || task.type || 'existing';
            await saveTaskProgress(user.uid, task.id, {
                status: 'in_progress',
                startedAt: new Date().toISOString(),
                surveyorPoints: surveyorPoints || [], // Save existing points if any
                totalPoints: (surveyorPoints || []).length,
                taskData: {
                    title: task.judulTugas || task.title || 'Tugas Survey',
                    taskType: taskType,
                    kmzFile: task.kmzFile || null,
                    mapData: task.mapData || null,
                    linkMymaps: task.linkMymaps || null
                }
            });
            console.log('✅ Saved task progress to Firestore for ' + taskType + ' with complete data and ' + (surveyorPoints || []).length + ' existing points');
        }
        
        // Simpan KMZ & destinasi di sessionStorage agar dapat diakses FloatingMapsButton
        try {
            // Always set currentTaskId first
            if (task.id) {
                sessionStorage.setItem('currentTaskId', task.id);
                console.log('✅ DetailTugasPage: Set currentTaskId:', task.id);
            }
            
            // Set task type for MiniMaps to handle correctly
            const taskType = task.taskType || task.type || 'existing';
            sessionStorage.setItem('currentTaskType', taskType);
            console.log('✅ DetailTugasPage: Set currentTaskType:', taskType);
            
            // Set task status in sessionStorage
            sessionStorage.setItem('currentTaskStatus', 'in_progress');
            console.log('✅ DetailTugasPage: Set currentTaskStatus: in_progress');
            
            // Set KMZ data if available
            // 0) If parsed mapData already exists (as used by KMZMapComponent), store it for MiniMaps to use directly
            if (task.mapData) {
                try {
                    sessionStorage.setItem('currentTaskKmzData', JSON.stringify(task.mapData));
                    console.log('✅ DetailTugasPage: Set currentTaskKmzData (parsed) for ' + taskType + ':', task.mapData);
                } catch (e) {
                    console.warn('⚠️ Failed to store currentTaskKmzData:', e.message);
                }
            } else {
                console.warn('⚠️ DetailTugasPage: No task.mapData available for ' + taskType);
            }

            // 1) Prefer storing the full kmzFile object so MiniMaps can resolve storage path or URL safely
            if (task.kmzFile) {
                try {
                    sessionStorage.setItem('currentTaskKmz', JSON.stringify(task.kmzFile));
                    console.log('✅ DetailTugasPage: Set currentTaskKmz object for ' + taskType + ':', task.kmzFile);
                } catch {
                    const kmzUrlFallback = task.kmzFile.downloadURL || task.kmzFile.url || task.kmzFile.downloadUrl || '';
                    if (kmzUrlFallback) {
                        sessionStorage.setItem('currentTaskKmz', kmzUrlFallback);
                        console.log('✅ DetailTugasPage: Set currentTaskKmz URL fallback for ' + taskType + ':', kmzUrlFallback);
                    }
                }
            } else if (task.linkMymaps) {
                sessionStorage.setItem('currentTaskKmz', task.linkMymaps);
                console.log('✅ DetailTugasPage: Set currentTaskKmz from linkMymaps for ' + taskType + ':', task.linkMymaps);
            } else {
                console.warn('⚠️ DetailTugasPage: No kmzFile or linkMymaps available for ' + taskType);
            }
            
            // Set destination if available
            if (Array.isArray(destination)) {
                sessionStorage.setItem('currentTaskDest', JSON.stringify(destination));
                console.log('✅ DetailTugasPage: Set currentTaskDest:', destination);
            }
            
            // Force mini maps to show and auto-focus on KMZ data
            sessionStorage.setItem('miniMapsAutoFocus', 'true');
            sessionStorage.removeItem('miniMapsManuallyClosed');
            console.log('✅ DetailTugasPage: Set miniMapsAutoFocus flag for ' + taskType);
            
            // Beritahu listener bahwa task telah dimulai
            window.dispatchEvent(new Event('currentTaskChanged'));
            
            // Dispatch specific event for KMZ auto-focus
            window.dispatchEvent(new CustomEvent('taskStartedWithKmz', {
                detail: {
                    taskId: task.id,
                    taskType: taskType,
                    kmzData: task.mapData,
                    kmzFile: task.kmzFile,
                    linkMymaps: task.linkMymaps
                }
            }));
            
            console.log('🎯 DetailTugasPage: Task started event dispatched with data:', {
                taskId: task.id,
                taskType: taskType,
                hasMapData: !!task.mapData,
                hasKmzFile: !!task.kmzFile,
                hasLinkMymaps: !!task.linkMymaps
            });
        } catch (error) {
            console.error('Error setting sessionStorage:', error);
        }

        // Aktifkan mini maps
        setShowMiniMaps(true);
        
        // Show alert
        alert('Berhasil Memulai Tugas');
    };

    const handleCompleteTask = async () => {
        console.log('🎯 handleCompleteTask called');
        
        // Update task status
        setTaskStatus('completed');
        console.log('🔄 Task status changed to completed');
        
        // Clear progress from Firestore when task is completed
        if (user && task?.id) {
            await clearTaskProgress(user.uid, task.id);
            console.log('✅ Task progress cleared from Firestore');
        }
        
        // Clear surveyor points
        setSurveyorPoints([]);
        setTaskProgress(null);
        
        // Set completion time (gunakan waktu server)
        let completionTime = serverNow;
        try {
            const res = await fetch('/api/server-time', { cache: 'no-store' });
            const data = await res.json();
            const now = new Date(data.now);
            if (!isNaN(now.getTime())) completionTime = now;
        } catch {}
        if (!completionTime) completionTime = new Date();
        
        // Update session to notify MiniMaps and then clear after a short delay
        try {
            sessionStorage.setItem('currentTaskStatus', 'completed');
            // Notify that task has ended (MiniMaps listens to this to stop tracking)
            window.dispatchEvent(new Event('currentTaskChanged'));
            // Clear task data shortly after to let listeners react
            setTimeout(() => {
                try {
                    sessionStorage.removeItem('currentTaskId');
                    sessionStorage.removeItem('currentTaskKmz');
                    sessionStorage.removeItem('currentTaskDest');
                    sessionStorage.removeItem('currentTaskStatus');
                    window.dispatchEvent(new Event('currentTaskChanged'));
                } catch {}
            }, 800);
        } catch (error) {
            console.error('Error clearing sessionStorage:', error);
        }
        
        // Update task data with completion time
        if (task && task.id) {
            // Update task in database with completion time
            updateTaskCompletion(task.id, completionTime);
        }
        
        // Show completion alert
        alert('🎉 Tugas berhasil diselesaikan!\n\nTerima kasih telah menyelesaikan survey ini.');
    };

    // Function to update task completion in database
    const updateTaskCompletion = async (taskId, completionTime) => {
        try {
            // Validate inputs
            if (!taskId) {
                console.warn('⚠️ No taskId provided for completion update');
                return;
            }

            if (!completionTime) {
                console.warn('⚠️ No completionTime provided for completion update');
                return;
            }

            console.log('🔄 Updating task completion:', { taskId, completionTime: completionTime.toISOString() });

            const response = await fetch('/api/task-assignments/' + taskId, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'completed',
                    completedAt: completionTime.toISOString(),
                    completedBy: user?.uid || 'unknown'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`⚠️ Failed to update task completion: ${response.status} ${response.statusText}`, errorText);
                // Don't throw error, just log it
                return;
            }

            const result = await response.json();
            console.log('✅ Task completion updated successfully:', result);
        } catch (error) {
            console.warn('⚠️ Error updating task completion (non-critical):', error.message);
            // Don't throw error to prevent UI crash
        }
    };


    // If showing daily summary, render that component
    if (showDailySummary) {
        return (
            <DailySummaryPage 
                onBack={handleBackFromSummary}
                taskId={task.id}
                userId={user?.uid}
            />
        );
    }

    const renderExistingTask = () => (
        <div className="px-6 py-8 pb-24">
            <div className="max-w-md mx-auto space-y-4">
                {/* Judul Tugas */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-center text-lg font-bold text-gray-800 mb-4">
                        Judul Tugas
                    </h3>
                    
                    {/* Map kecil bila ada link KMZ/KML atau file KMZ */}
                    {(task.linkMymaps || task.kmzFile || task.mapData) && (
                        <div className="mb-4 h-48 rounded-xl overflow-hidden border">
                            {task.mapData ? (
                                <KMZMapComponent mapData={task.mapData} taskType={task.type} />
                            ) : task.kmzFile ? (
                                <div className="h-full bg-gray-100 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-gray-900 text-sm">Memuat peta KMZ...</p>
                                    </div>
                                </div>
                            ) : (
                                <MapDisplay kmzUrl={task.linkMymaps} onComputedCenter={(center) => setDestination(center)} />
                            )}
                        </div>
                    )}

                    {/* File KMZ/KML atau Link Mymaps */}
                    <div className="mb-4 space-y-2">
                        {task.kmzFile && (
                            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-left">
                                <span className="text-blue-700 font-medium">File KMZ/KML</span>
                                <p className="text-blue-600 text-sm mt-1">{task.kmzFile.fileName}</p>
                            </div>
                        )}
                        {task.excelFile && (
                            <div className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-left">
                                <span className="text-green-700 font-medium">File Excel/CSV</span>
                                <p className="text-green-600 text-sm mt-1">{task.excelFile.fileName}</p>
                            </div>
                        )}
                        {task.linkMymaps && !task.kmzFile && (
                            <a
                                href={`/task-map?kmz=${encodeURIComponent(task.linkMymaps || '')}${destination ? `&dest=${destination[0]},${destination[1]}` : ''}`}
                                className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-blue-100 transition-colors duration-200"
                            >
                                <span className="text-blue-700 font-medium">Link Mymaps</span>
                                <ExternalLink size={16} className="text-blue-500" />
                            </a>
                        )}
                    </div>

                    {/* Mulai Tugas / Status Tugas */}
                    <div className="mb-4 space-y-3">
                        {/* Button Mulai Tugas - disabled jika sudah in_progress atau completed */}
                        <button
                            onClick={handleStartTask}
                            disabled={taskStatus === 'in_progress' || taskStatus === 'started' || taskStatus === 'completed'}
                            className={`w-full border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors duration-200 ${
                                taskStatus === 'pending' 
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer' 
                                    : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <span className={`font-medium ${
                                taskStatus === 'pending' ? 'text-green-700' : 'text-gray-500'
                            }`}>
                                {taskStatus === 'pending' ? 'Mulai Tugas' : 'Tugas Sudah Dimulai'}
                            </span>
                            <Play size={16} className={taskStatus === 'pending' ? 'text-green-500' : 'text-gray-400'} />
                        </button>

                        {/* Button Selesaikan Tugas - enabled hanya jika in_progress */}
                        <button
                            onClick={handleCompleteTask}
                            disabled={taskStatus !== 'in_progress' && taskStatus !== 'started'}
                            className={`w-full border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors duration-200 ${
                                (taskStatus === 'in_progress' || taskStatus === 'started')
                                    ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer' 
                                    : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <span className={`font-medium ${
                                (taskStatus === 'in_progress' || taskStatus === 'started') ? 'text-orange-700' : 'text-gray-500'
                            }`}>
                                {(taskStatus === 'in_progress' || taskStatus === 'started') 
                                    ? 'Selesaikan Tugas' 
                                    : taskStatus === 'completed' 
                                        ? 'Tugas Sudah Selesai'
                                        : 'Belum Memulai Tugas'
                                }
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                (taskStatus === 'in_progress' || taskStatus === 'started') ? 'bg-orange-500' : 'bg-gray-400'
                            }`}>
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </button>

                        {/* Status indicator */}
                        {(taskStatus === 'in_progress' || taskStatus === 'started') && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-700 font-medium text-sm">Tugas Sedang Berlangsung</span>
                                </div>
                                <p className="text-blue-600 text-xs mt-1">Progress akan tersimpan otomatis</p>
                            </div>
                        )}
                        
                        {taskStatus === 'completed' && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                    <span className="text-green-700 font-medium">Tugas Telah Selesai</span>
                                </div>
                                {task.completedAt && (
                                    <div className="text-green-600 text-sm text-center">
                                        Selesai pada: {formatDateTime(task.completedAt)}
                                    </div>
                                )}
                                {!task.completedAt && taskStatus === 'completed' && (
                                    <div className="text-green-600 text-sm text-center">
                                        Selesai pada: {formatDateTime(new Date())}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info Tugas */}
                    <div className="mb-4 space-y-3">
                        {/* Admin Pemberi Tugas */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                            <div className="text-indigo-800 font-medium text-sm">Admin Pemberi Tugas</div>
                            <div className="text-indigo-700 text-sm">{adminInfo.name || '-'}</div>
                        </div>
                        {/* Deadline */}
                        {task.deadline && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <div className="text-amber-800 font-medium text-sm">Deadline</div>
                                <div className="text-amber-700 text-sm">{formatDeadlineOrInvalid(task.deadline)}</div>
                            </div>
                        )}
                        
                        {/* Priority */}
                        {task.priority && task.priority !== 'medium' && (
                            <div className={`border rounded-xl p-3 ${
                                task.priority === 'high' ? 'bg-red-50 border-red-200' :
                                task.priority === 'low' ? 'bg-gray-50 border-gray-200' :
                                'bg-blue-50 border-blue-200'
                            }`}>
                                <div className={`font-medium text-sm ${
                                    task.priority === 'high' ? 'text-red-800' :
                                    task.priority === 'low' ? 'text-gray-800' :
                                    'text-blue-800'
                                }`}>Prioritas</div>
                                <div className={`text-sm ${
                                    task.priority === 'high' ? 'text-red-700' :
                                    task.priority === 'low' ? 'text-gray-700' :
                                    'text-blue-700'
                                }`}>
                                    {task.priority === 'high' ? 'Tinggi' :
                                     task.priority === 'low' ? 'Rendah' : 'Sedang'}
                                </div>
                            </div>
                        )}
                        
                        {/* Deskripsi */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[120px]">
                            <div className="text-center text-gray-600 font-medium mb-2">Deskripsi</div>
                            <div className="text-gray-700 text-sm leading-relaxed">
                                {task.deskripsi}
                            </div>
                        </div>
                    </div>

                    {/* Tombol Ringkasan Harian */}
                    <div>
                        <button
                            onClick={handleShowDailySummary}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <BarChart3 size={20} />
                            Lihat Ringkasan Harian
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProposeTask = () => (
        <div className="px-6 py-8 pb-24">
            <div className="max-w-md mx-auto">
                {/* Main Container - sama persis dengan gambar */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-lg">
                    {/* Judul Tugas */}
                    <div className="text-center text-lg font-bold text-gray-800 mb-4">
                        Judul Tugas
                    </div>
                    
                    {/* Map kecil bila ada link KMZ/KML atau file KMZ */}
                    {(task.linkMymaps || task.kmzFile || task.mapData) && (
                        <div className="mb-3 h-48 rounded-xl overflow-hidden border">
                            {task.mapData ? (
                                <KMZMapComponent mapData={task.mapData} taskType={task.type} />
                            ) : task.kmzFile ? (
                                <div className="h-full bg-gray-100 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-gray-900 text-sm">Memuat peta KMZ...</p>
                                    </div>
                                </div>
                            ) : (
                                <MapDisplay kmzUrl={task.linkMymaps} onComputedCenter={(center) => setDestination(center)} />
                            )}
                        </div>
                    )}

                    {/* File KMZ/KML atau Link Mymaps */}
                    <div className="mb-3 space-y-2">
                        {task.kmzFile && (
                            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-left">
                                <span className="text-blue-700 font-medium">File KMZ/KML</span>
                                <p className="text-blue-600 text-sm mt-1">{task.kmzFile.fileName}</p>
                            </div>
                        )}
                        {task.excelFile && (
                            <div className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-left">
                                <span className="text-green-700 font-medium">File Excel/CSV</span>
                                <p className="text-green-600 text-sm mt-1">{task.excelFile.fileName}</p>
                            </div>
                        )}
                        {task.linkMymaps && !task.kmzFile && (
                            <a
                                href={`/task-map?kmz=${encodeURIComponent(task.linkMymaps || '')}${destination ? `&dest=${destination[0]},${destination[1]}` : ''}`}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-left hover:bg-gray-100 transition-colors duration-200"
                            >
                                <span className="text-gray-700 font-medium">Link Mymaps</span>
                            </a>
                        )}
                    </div>

                    {/* Mulai Tugas / Status Tugas */}
                    <div className="mb-4 space-y-3">
                        {/* Button Mulai Tugas - disabled jika sudah in_progress atau completed */}
                        <button
                            onClick={handleStartTask}
                            disabled={taskStatus === 'in_progress' || taskStatus === 'started' || taskStatus === 'completed'}
                            className={`w-full border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors duration-200 ${
                                taskStatus === 'pending' 
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer' 
                                    : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <span className={`font-medium ${
                                taskStatus === 'pending' ? 'text-green-700' : 'text-gray-500'
                            }`}>
                                {taskStatus === 'pending' ? 'Mulai Tugas' : 'Tugas Sudah Dimulai'}
                            </span>
                            <Play size={16} className={taskStatus === 'pending' ? 'text-green-500' : 'text-gray-400'} />
                        </button>

                        {/* Button Selesaikan Tugas - enabled hanya jika in_progress */}
                        <button
                            onClick={handleCompleteTask}
                            disabled={taskStatus !== 'in_progress' && taskStatus !== 'started'}
                            className={`w-full border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors duration-200 ${
                                (taskStatus === 'in_progress' || taskStatus === 'started')
                                    ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer' 
                                    : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                            }`}
                        >
                            <span className={`font-medium ${
                                (taskStatus === 'in_progress' || taskStatus === 'started') ? 'text-orange-700' : 'text-gray-500'
                            }`}>
                                {(taskStatus === 'in_progress' || taskStatus === 'started') 
                                    ? 'Selesaikan Tugas' 
                                    : taskStatus === 'completed' 
                                        ? 'Tugas Sudah Selesai'
                                        : 'Belum Memulai Tugas'
                                }
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                (taskStatus === 'in_progress' || taskStatus === 'started') ? 'bg-orange-500' : 'bg-gray-400'
                            }`}>
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </button>

                        {/* Status indicator */}
                        {(taskStatus === 'in_progress' || taskStatus === 'started') && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-700 font-medium text-sm">Tugas Sedang Berlangsung</span>
                                </div>
                                <p className="text-blue-600 text-xs mt-1">Progress akan tersimpan otomatis</p>
                            </div>
                        )}
                        
                        {taskStatus === 'completed' && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                    <span className="text-green-700 font-medium">Tugas Telah Selesai</span>
                                </div>
                                {task.completedAt && (
                                    <div className="text-green-600 text-sm text-center">
                                        Selesai pada: {formatDateTime(task.completedAt)}
                                    </div>
                                )}
                                {!task.completedAt && taskStatus === 'completed' && (
                                    <div className="text-green-600 text-sm text-center">
                                        Selesai pada: {formatDateTime(new Date())}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Daftar ID Jalan - styling sama dengan gambar */}
                    <div className="mb-3 space-y-2">
                        {task.jalanList?.map((jalan, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                                <span className="text-gray-700 font-medium">{jalan.id}</span>
                                <button
                                    onClick={() => handleDetailJalan(jalan)}
                                    className="bg-gray-400 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-500 transition-colors duration-200"
                                >
                                    Detail
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Info Tugas */}
                    <div className="mb-4 space-y-3">
                        {/* Admin Pemberi Tugas */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                            <div className="text-indigo-800 font-medium text-sm">Admin Pemberi Tugas</div>
                            <div className="text-indigo-700 text-sm">{adminInfo.name || '-'}</div>
                        </div>
                        {/* Deadline */}
                        {task.deadline && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <div className="text-amber-800 font-medium text-sm">Deadline</div>
                                <div className="text-amber-700 text-sm">{formatDeadlineOrInvalid(task.deadline)}</div>
                            </div>
                        )}
                        
                        {/* Priority */}
                        {task.priority && task.priority !== 'medium' && (
                            <div className={`border rounded-xl p-3 ${
                                task.priority === 'high' ? 'bg-red-50 border-red-200' :
                                task.priority === 'low' ? 'bg-gray-50 border-gray-200' :
                                'bg-blue-50 border-blue-200'
                            }`}>
                                <div className={`font-medium text-sm ${
                                    task.priority === 'high' ? 'text-red-800' :
                                    task.priority === 'low' ? 'text-gray-800' :
                                    'text-blue-800'
                                }`}>Prioritas</div>
                                <div className={`text-sm ${
                                    task.priority === 'high' ? 'text-red-700' :
                                    task.priority === 'low' ? 'text-gray-700' :
                                    'text-blue-700'
                                }`}>
                                    {task.priority === 'high' ? 'Tinggi' :
                                     task.priority === 'low' ? 'Rendah' : 'Sedang'}
                                </div>
                            </div>
                        )}
                        
                        {/* Deskripsi tugas */}
                        <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 min-h-[100px]">
                            <div className="text-gray-700 text-sm leading-relaxed">
                                {task.deskripsi || 'Deskripsi tugas'}
                            </div>
                        </div>
                    </div>

                    {/* Tombol Ringkasan Harian */}
                    <div>
                        <button
                            onClick={handleShowDailySummary}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <BarChart3 size={20} />
                            Lihat Ringkasan Harian
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {/* Ultra Modern Header */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50 sticky top-0 z-40">
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                {task.type === 'propose' ? 'Detail Tugas Propose' : 'Detail Tugas Existing'}
                            </h1>
                        </div>
                        
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Calendar size={22} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {task.type === 'propose' ? renderProposeTask() : renderExistingTask()}

            {/* Mini Maps Component - Always show if task is active */}
            {console.log('🗺️ DetailTugasPage: Rendering MiniMapsComponent with surveyorPoints:', surveyorPoints?.length || 0, 'points')}
            <MiniMapsComponent 
                taskId={task.id} 
                userId={user?.uid}
                surveyorPoints={surveyorPoints}
                taskProgress={taskProgress}
                key={`minimaps-${task.id}-${surveyorPoints?.length || 0}`}
            />
        </div>
    );
};

export default DetailTugasPage;

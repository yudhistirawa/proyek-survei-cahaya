import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X, Zap, ZapOff } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { smartPhotoUpload, uploadPhotoWithWebPConversion } from '../../lib/photoUpload';
import { db, storage, auth, retryFirestoreOperation } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';
import useRealtimeLocation from '../../hooks/useRealtimeLocation';
import MiniMapsComponent from '../MiniMapsComponentLazy';
import MobileCameraCapture from '../MobileCameraCaptureLazy';
import SuccessAlertModal from '../modals/SuccessAlertModal';
import { openDirectCameraAndTakePhoto } from '../../lib/directCameraUtils';
import { saveTaskProgress, loadTaskProgress } from '../../lib/taskProgress';

const SurveyExistingPage = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
    const [formData, setFormData] = useState({
        murni: '',
        namaJalan: '',
        namaGang: '',
        kepemilikanTiang: '',
        jenisTiang: '',
        jenisTiangPLN: '',
        trafo: '',
        jenisTrafo: '',
        tinggiBawahTrafo: '',
        lampu: '',
        jumlahLampu: '',
        jenisLampu: '',
        titikKordinat: '',
        lebarJalan1: '',
        lebarJalan2: '',
        lebarBahuBertiang: '',
        lebarTrotoarBertiang: '',
        lainnyaBertiang: '',
        tinggiARM: '',
        median: '',
        tinggiMedian: '',
        lebarMedian: '',
        fotoTinggiARM: null,
        fotoTitikAktual: null,
        keterangan: ''
    });

    const [openDropdowns, setOpenDropdowns] = useState({});
    const [showNamaJalanInput, setShowNamaJalanInput] = useState(false);
    const [namaJalanInput, setNamaJalanInput] = useState('');
    const [namaGangInput, setNamaGangInput] = useState('');
    const [showPLNSubOptions, setShowPLNSubOptions] = useState(false);
    const [showTrafoSubOptions, setShowTrafoSubOptions] = useState(false);
    const [showTrafoHeightInput, setShowTrafoHeightInput] = useState(false);
    const [tinggiBawahInput, setTinggiBawahInput] = useState('');

    const [showLampuCountOptions, setShowLampuCountOptions] = useState(false);
    const [showLampuTypeOptions, setShowLampuTypeOptions] = useState(false);
    const [showLebarJalanInput, setShowLebarJalanInput] = useState(false);
    const [lebarJalan1Input, setLebarJalan1Input] = useState('');
    const [lebarJalan2Input, setLebarJalan2Input] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [currentPhotoField, setCurrentPhotoField] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [showMedianInput, setShowMedianInput] = useState(false);
    const [tinggiMedianInput, setTinggiMedianInput] = useState('');
    const [lebarMedianInput, setLebarMedianInput] = useState('');
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [previewField, setPreviewField] = useState(null);

    // Set page title
    usePageTitle('Survey Existing - Sistem Manajemen');

    // Real-time location hook
    const {
        location: realtimeLocation,
        error: locationError,
        isLoading: locationLoading,
        accuracy: locationAccuracy,
        timestamp: locationTimestamp,
        isWatching,
        startWatching,
        stopWatching,
        getCurrentLocation
    } = useRealtimeLocation({
        enableHighAccuracy: true,
        timeout: 30000, // Increase timeout to 30 seconds
        maximumAge: 5000, // Allow cached location up to 5 seconds
        distanceFilter: 5, // Update every 5 meters to reduce battery usage
        autoStart: isRealtimeEnabled
    });

    // Update coordinates when real-time location changes
    useEffect(() => {
        if (realtimeLocation && isRealtimeEnabled) {
            const coords = `${realtimeLocation.lat}, ${realtimeLocation.lon}`;
            setFormData(prev => ({
                ...prev,
                titikKordinat: coords
            }));
        }
    }, [realtimeLocation, isRealtimeEnabled]);

    // Handle real-time toggle
    const toggleRealtimeLocation = () => {
        setIsRealtimeEnabled(prev => {
            const newState = !prev;
            if (newState) {
                startWatching();
            } else {
                stopWatching();
            }
            return newState;
        });
    };

    // Fallback manual location refresh
    const refreshLocation = async () => {
        try {
            const location = await getCurrentLocation();
            const coords = `${location.lat}, ${location.lon}`;
            setFormData(prev => ({
                ...prev,
                titikKordinat: coords
            }));
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setOpenDropdowns({});
                setShowPLNSubOptions(false);
                setShowTrafoSubOptions(false);
                setShowNamaJalanInput(false);
                setShowMedianInput(false);
                setShowTrafoHeightInput(false);

                        setShowLampuCountOptions(false);
        setShowLampuTypeOptions(false);
        setShowLebarJalanInput(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    // Get location status for UI
    const getLocationStatus = () => {
        if (locationLoading) return 'loading';
        if (locationError) return 'error';
        if (realtimeLocation) return 'success';
        return 'loading';
    };

    const locationStatus = getLocationStatus();

    const dropdownOptions = {
        murni: ['Murni', 'Tidak Murni'],
        namaJalan: ['📍 Masukkan Lokasi Jalan & Gang'],
        lebarJalan: ['📏 Masukkan Lebar Jalan'],
        kepemilikanTiang: ['PLN', 'Pemko', 'Swadaya'],
        jenisTiang: ['Besi', 'Beton', 'Kayu'],
        jenisTiangPLN: ['Tiang TR', 'Tiang TM'],
        trafo: ['Ada', 'Tidak Ada'],
        jenisTrafo: ['Double', 'Single'],
        lampu: ['Ada', 'Tidak Ada'],
        median: ['Ada', 'Tidak Ada'],
        jumlahLampu: ['1', '2', '3', '4', 'Lainnya'],
        jenisLampu: ['Konvensional', 'LED', 'Swadaya']
    };

    const toggleDropdown = (field) => {
        setOpenDropdowns(prev => {
            const isOpening = !prev[field];
            return isOpening ? { [field]: true } : {};
        });
        
        // Tutup dropdown lain yang terbuka
        setShowPLNSubOptions(false);
        setShowTrafoSubOptions(false);
        setShowNamaJalanInput(false);
        setShowLebarJalanInput(false);
        setShowMedianInput(false);
    };

    const selectOption = (field, value) => {
        // Tutup semua dropdown dan sub-options terlebih dahulu
        setOpenDropdowns({});
        setShowPLNSubOptions(false);
        setShowTrafoSubOptions(false);
        setShowNamaJalanInput(false);
        setShowLebarJalanInput(false);
        setShowMedianInput(false);
        
        if (field === 'namaJalan' && value === '📍 Masukkan Lokasi Jalan & Gang') {
            setShowNamaJalanInput(true);
            setNamaJalanInput('');
            setNamaGangInput('');
            return;
        }
        
        if (field === 'lebarJalan' && value === '📏 Masukkan Lebar Jalan') {
            setShowLebarJalanInput(true);
            setLebarJalan1Input('');
            setLebarJalan2Input('');
            return;
        }
        
        if (field === 'kepemilikanTiang' && value === 'PLN') {
            setShowPLNSubOptions(true);
            return;
        }
        
        if (field === 'trafo' && value === 'Ada') {
            setShowTrafoSubOptions(true);
            return;
        }
        
        if (field === 'lampu' && value === 'Ada') {
            setShowLampuCountOptions(true);
            return;
        }

        if (field === 'median' && value === 'Ada') {
            setShowMedianInput(true);
            setTinggiMedianInput('');
            setLebarMedianInput('');
            return;
        }

        if (field === 'median' && value === 'Tidak Ada') {
            setShowMedianInput(false);
            setTinggiMedianInput('');
            setLebarMedianInput('');
        }
        
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Reset jenisTrafo jika trafo dipilih "Tidak Ada"
            if (field === 'trafo' && value === 'Tidak Ada') {
                newData.jenisTrafo = '';
            }
            
            // Reset jenisTiangPLN jika kepemilikanTiang bukan PLN
            if (field === 'kepemilikanTiang' && value !== 'PLN') {
                newData.jenisTiangPLN = '';
            }

            // Reset median jika dipilih "Tidak Ada"
            if (field === 'median' && value === 'Tidak Ada') {
                newData.tinggiMedian = '';
                newData.lebarMedian = '';
            }
            
            return newData;
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleNamaJalanGangSave = () => {
        setFormData(prev => ({
            ...prev,
            namaJalan: namaJalanInput.trim(),
            namaGang: namaGangInput.trim()
        }));
        setShowNamaJalanInput(false);
        setNamaJalanInput('');
        setNamaGangInput('');
        setOpenDropdowns({});
    };

    const handleNamaJalanGangCancel = () => {
        setShowNamaJalanInput(false);
        setNamaJalanInput('');
        setNamaGangInput('');
        setOpenDropdowns({});
    };

    const handleLebarJalanSave = () => {
        setFormData(prev => ({
            ...prev,
            lebarJalan1: lebarJalan1Input.trim(),
            lebarJalan2: lebarJalan2Input.trim()
        }));
        setShowLebarJalanInput(false);
        setLebarJalan1Input('');
        setLebarJalan2Input('');
        setOpenDropdowns({});
    };

    const handleLebarJalanCancel = () => {
        setShowLebarJalanInput(false);
        setLebarJalan1Input('');
        setLebarJalan2Input('');
        setOpenDropdowns({});
    };

    const handlePLNSubOption = (value) => {
        setFormData(prev => ({
            ...prev,
            kepemilikanTiang: 'PLN',
            jenisTiangPLN: value
        }));
        setShowPLNSubOptions(false);
        setOpenDropdowns({});
    };

    const handlePLNSubOptionCancel = () => {
        setShowPLNSubOptions(false);
        setOpenDropdowns({});
    };

    const handleTrafoSubOption = (value) => {
        setFormData(prev => ({
            ...prev,
            trafo: 'Ada',
            jenisTrafo: value
        }));
        setShowTrafoSubOptions(false);
        setShowTrafoHeightInput(true);
        setTinggiBawahInput('');
        setOpenDropdowns({});
    };

    const handleTrafoSubOptionCancel = () => {
        setShowTrafoSubOptions(false);
        setOpenDropdowns({});
    };

    const handleTrafoHeightSave = () => {
        setFormData(prev => ({
            ...prev,
            tinggiBawahTrafo: tinggiBawahInput.trim()
        }));
        setShowTrafoHeightInput(false);
        setTinggiBawahInput('');
        setOpenDropdowns({});
    };

    const handleTrafoHeightCancel = () => {
        setShowTrafoHeightInput(false);
        setTinggiBawahInput('');
        setOpenDropdowns({});
    };

    const handleLampuCountOption = (value) => {
        setFormData(prev => ({
            ...prev,
            lampu: 'Ada',
            jumlahLampu: value,
            jenisLampu: '' // Reset jenisLampu for next step
        }));
        setShowLampuCountOptions(false);
        setShowLampuTypeOptions(true);
        setOpenDropdowns({});
    };

    const handleLampuCountOptionCancel = () => {
        setShowLampuCountOptions(false);
        setOpenDropdowns({});
    };

    const handleLampuTypeOption = (value) => {
        setFormData(prev => ({
            ...prev,
            lampu: 'Ada',
            jumlahLampu: prev.jumlahLampu,
            jenisLampu: value
        }));
        setShowLampuTypeOptions(false);
        setOpenDropdowns({});
    };

    const handleLampuTypeOptionCancel = () => {
        setShowLampuTypeOptions(false);
        setOpenDropdowns({});
    };

    const handleMedianSave = () => {
        setFormData(prev => ({
            ...prev,
            median: 'Ada',
            tinggiMedian: tinggiMedianInput.trim(),
            lebarMedian: lebarMedianInput.trim()
        }));
        setShowMedianInput(false);
        setTinggiMedianInput('');
        setLebarMedianInput('');
        setOpenDropdowns({});
    };

    const handleMedianCancel = () => {
        setShowMedianInput(false);
        setTinggiMedianInput('');
        setLebarMedianInput('');
        setOpenDropdowns({});
    };

    // Fungsi handleImageUpload lama dihapus untuk menghindari deklarasi ganda
    // Digantikan dengan fungsi baru yang langsung membuka kamera fullscreen

    const handlePhotoCaptured = (photoUrl) => {
        console.log('📸 SurveyExistingPage: Photo captured from MobileCameraCapture:', !!photoUrl);
        // Langsung simpan foto ke formData tanpa preview untuk mobile
        if (currentPhotoField && photoUrl) {
            setFormData(prev => ({
                ...prev,
                [currentPhotoField]: photoUrl
            }));
            console.log('✅ SurveyExistingPage: Photo saved to formData for field:', currentPhotoField);
            setToast({ show: true, message: 'Foto berhasil diambil dan disimpan!' });
            setTimeout(() => setToast({ show: false, message: '' }), 2000);
        }
        setCurrentPhotoField(null);
        setShowCameraModal(false);
    };

    const handleCameraPhotoTaken = (photoData) => {
        if (currentPhotoField) {
            setFormData(prev => ({
                ...prev,
                [currentPhotoField]: photoData.imageData
            }));
            
            // Update koordinat jika belum ada
            if (!formData.titikKordinat && photoData.coordinates) {
                setFormData(prev => ({
                    ...prev,
                    titikKordinat: photoData.coordinates
                }));
            }
        }
        setCurrentPhotoField(null);
    };

    const handleSubmit = async () => {
        if (!user) {
            setToast({ show: true, message: 'Anda harus login terlebih dahulu!' });
            setTimeout(() => setToast({ show: false, message: '' }), 2200);
            return;
        }

        // Validasi form
        if (!formData.namaJalan) {
            setToast({ show: true, message: 'Mohon isi Nama Jalan!' });
            setTimeout(() => setToast({ show: false, message: '' }), 2200);
            return;
        }

        // Wajib mulai tugas dulu
        const currentTaskIdGuard = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
        if (!currentTaskIdGuard) {
            setToast({ show: true, message: 'Mulai Tugas terlebih dahulu dari Detail Tugas sebelum mengisi survey.' });
            setTimeout(() => setToast({ show: false, message: '' }), 2600);
            return;
        }

        // Mulai proses penyimpanan
        setIsSubmitting(true);
        setToast({ show: true, message: 'Menyimpan data dan mengupload foto...' });
        console.log('🚀 Mulai proses penyimpanan Survey Existing...');

        try {
            // Siapkan data dasar dan buat dokumen terlebih dahulu untuk mendapatkan docId
            // Ambil adminId dari sumber berikut (urutan prioritas):
            // 1) Tugas yang sedang berjalan (sessionStorage.currentTaskId) -> task_assignments/{id}.createdBy
            // 2) Tugas terbaru untuk surveyor ini (tanpa mengandalkan index selain where+orderBy, tetap ada fallback)
            // 3) Profil petugas/users
            let adminId = null;
            try {
                // 1) currentTaskId dari sessionStorage
                try {
                    const currentTaskId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
                    if (currentTaskId) {
                        const tSnap = await getDoc(doc(db, 'task_assignments', currentTaskId));
                        if (tSnap.exists()) {
                            const t = tSnap.data() || {};
                            adminId = t.createdBy || t.adminId || adminId;
                        }
                    }
                } catch (taskIdErr) {
                    console.warn('Gagal mengambil adminId via currentTaskId:', taskIdErr?.message);
                }

                // 2) Fallback ke tugas terbaru untuk surveyor ini jika belum ada
                if (!adminId) {
                    try {
                        const latestTaskQ = query(
                            collection(db, 'task_assignments'),
                            where('surveyorId', '==', user.uid),
                            orderBy('createdAt', 'desc'),
                            limit(1)
                        );
                        const latestTaskSnap = await getDocs(latestTaskQ);
                        if (!latestTaskSnap.empty) {
                            const t = latestTaskSnap.docs[0].data() || {};
                            adminId = t.createdBy || t.adminId || adminId;
                        }
                    } catch (taskErr) {
                        console.warn('Gagal membaca task_assignments untuk adminId:', taskErr?.message);
                    }
                }

                // 3) Fallback ke profil petugas/users
                if (!adminId) {
                    const petugasSnap = await getDoc(doc(db, 'petugas', user.uid));
                    if (petugasSnap.exists()) {
                        const p = petugasSnap.data() || {};
                        adminId = adminId || p.adminId || null;
                    } else {
                        console.warn('Profil petugas tidak ditemukan untuk UID:', user.uid, '- mencoba fallback ke users/{uid}');
                        try {
                            const userSnap = await getDoc(doc(db, 'users', user.uid));
                            if (userSnap.exists()) {
                                const u = userSnap.data() || {};
                                adminId = adminId || u.adminId || u.createdBy || null;
                            }
                        } catch (userSnapErr) {
                            console.warn('Fallback users/{uid} gagal:', userSnapErr?.message);
                        }
                    }
                }
            } catch (e) {
                console.warn('Gagal mengambil profil petugas untuk adminId:', e?.message, '- mencoba fallback ke users/{uid}');
                try {
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    if (userSnap.exists()) {
                        const u = userSnap.data() || {};
                        adminId = adminId || u.adminId || u.createdBy || null;
                    }
                } catch (userSnapErr) {
                    console.warn('Fallback users/{uid} juga gagal:', userSnapErr?.message);
                }
            }

            const surveyData = {
                // Data form Survey Existing
                namaJalan: formData.namaJalan || '',
                namaGang: formData.namaGang || '',
                kepemilikanTiang: formData.kepemilikanTiang || '',
                jenisTiang: formData.jenisTiang || '',
                jenisTiangPLN: formData.jenisTiangPLN || '',
                trafo: formData.trafo || '',
                jenisTrafo: formData.jenisTrafo || '',
                tinggiBawahTrafo: formData.tinggiBawahTrafo || '',
                lampu: formData.lampu || '',
                jumlahLampu: formData.jumlahLampu || '',
                jenisLampu: formData.jenisLampu || '',
                titikKordinat: formData.titikKordinat || '',
                lebarJalan1: formData.lebarJalan1 || '',
                lebarJalan2: formData.lebarJalan2 || '',
                lebarBahuBertiang: formData.lebarBahuBertiang || '',
                lebarTrotoarBertiang: formData.lebarTrotoarBertiang || '',
                lainnyaBertiang: formData.lainnyaBertiang || '',
                tinggiARM: formData.tinggiARM || '',
                median: formData.median || '',
                tinggiMedian: formData.tinggiMedian || '',
                lebarMedian: formData.lebarMedian || '',
                keterangan: formData.keterangan || '',
                
                // URL foto (diupdate setelah upload Storage)
                fotoTinggiARM: '',
                fotoTitikAktual: '',
                
                // Metadata
                surveyType: 'Survey Existing',
                surveyCategory: 'survey_existing',
                collectionName: 'Survey_Existing_Report', // Use legacy collection for compatibility
                originalCollectionName: 'Survey_Existing_Report',
                surveyZone: 'existing',
                adminId: adminId, // penting untuk filtering di halaman Validasi Survey
                surveyorName: user.displayName || user.email || 'Unknown Surveyor',
                surveyorId: user.uid,
                projectTitle: `Survey Existing - ${getCombinedLocationText()}`,
                projectLocation: formData.titikKordinat || 'Koordinat tidak tersedia',
                projectDate: new Date().toISOString().split('T')[0],
                
                // Status validasi
                status: 'pending',
                validationStatus: 'pending',
                validatedBy: null,
                validatedAt: null,
                validationNotes: '',
                
                // Timestamps
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Buat dokumen terlebih dahulu - gunakan collection yang sudah ada
            console.log('📄 Membuat dokumen di Firestore collection: Survey_Existing_Report...');
            const docRef = await addDoc(collection(db, 'Survey_Existing_Report'), surveyData);
            console.log('✅ Dokumen berhasil dibuat dengan ID:', docRef.id);

            // Simpan tracking data ke maps_surveyor_collection
            console.log('📍 Calling saveTrackingData function...');
            await saveTrackingData(docRef.id, surveyData);
            console.log('📍 saveTrackingData function completed');

            // Optimistic update to Mini Maps: broadcast the new point immediately
            try {
                const [latStr, lngStr] = String(formData.titikKordinat || '').split(',').map(s => s.trim());
                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);
                if (Number.isFinite(lat) && Number.isFinite(lng) && typeof window !== 'undefined') {
                    const newPoint = {
                        lat,
                        lng,
                        type: 'existing',
                        name: `Survey Existing - ${getCombinedLocationText()}`,
                        description: formData.keterangan || '',
                        timestamp: new Date().toISOString(),
                        docId: docRef.id
                    };

                    // Fire custom event so MiniMaps can add the marker immediately
                    window.dispatchEvent(new CustomEvent('surveyPointAdded', {
                        detail: newPoint
                    }));

                    // PENTING: Trigger event surveyorPointAdded untuk DetailTugasPage
                    window.dispatchEvent(new CustomEvent('surveyorPointAdded', {
                        detail: newPoint
                    }));
                    console.log('✅ SurveyExistingPage: Triggered surveyorPointAdded event with point:', newPoint);

                    // Save to taskProgress Firestore
                    const currentTaskId = sessionStorage.getItem('currentTaskId');
                    if (currentTaskId && user) {
                        try {
                            // Load existing progress
                            const existingProgress = await loadTaskProgress(user.uid, currentTaskId);
                            const existingPoints = existingProgress?.surveyorPoints || [];
                            
                            // Add new point
                            const updatedPoints = [...existingPoints, newPoint];
                            
                            // Save to Firestore
                            await saveTaskProgress(user.uid, currentTaskId, {
                                surveyorPoints: updatedPoints,
                                totalPoints: updatedPoints.length,
                                lastUpdated: new Date().toISOString()
                            });
                            console.log('✅ SurveyExistingPage: Saved surveyor point to taskProgress Firestore:', updatedPoints.length, 'total points');
                        } catch (taskProgressErr) {
                            console.error('❌ SurveyExistingPage: Failed to save to taskProgress:', taskProgressErr);
                        }
                    }

                    // Persist latest submitted point as a fallback (read by MiniMaps on mount)
                    try {
                        sessionStorage.setItem('lastSubmittedSurveyPoint', JSON.stringify({
                            ...newPoint,
                            ts: Date.now()
                        }));
                    } catch (ssErr) {
                        console.warn('Failed to write lastSubmittedSurveyPoint to sessionStorage:', ssErr);
                    }
                }
            } catch (e) {
                console.warn('MiniMaps optimistic event failed (existing):', e);
            }

            // Upload foto yang ada di formData dengan progress indicator untuk mobile
            console.log('📸 Mulai upload foto Survey Existing...');
            console.log('📋 Detail foto yang akan diupload:', {
                fotoTinggiARM: !!formData.fotoTinggiARM,
                fotoTitikAktual: !!formData.fotoTitikAktual,
                fotoTinggiARMType: typeof formData.fotoTinggiARM,
                fotoTitikAktualType: typeof formData.fotoTitikAktual,
                fotoTinggiARMLength: formData.fotoTinggiARM ? formData.fotoTinggiARM.length : 0,
                fotoTitikAktualLength: formData.fotoTitikAktual ? formData.fotoTitikAktual.length : 0,
                fotoTinggiARMPreview: formData.fotoTinggiARM ? formData.fotoTinggiARM.substring(0, 50) + '...' : null,
                fotoTitikAktualPreview: formData.fotoTitikAktual ? formData.fotoTitikAktual.substring(0, 50) + '...' : null
            });
            
            let [fotoTinggiARMUrl, fotoTitikAktualUrl] = [null, null];
            const totalPhotos = (formData.fotoTinggiARM ? 1 : 0) + (formData.fotoTitikAktual ? 1 : 0);
            let uploadedPhotos = 0;
            
            // Upload foto tinggi ARM jika ada
            if (formData.fotoTinggiARM) {
                console.log('📸 Processing foto tinggi ARM upload...');
                setToast({ show: true, message: `Mengupload foto tinggi ARM... (${uploadedPhotos + 1}/${totalPhotos})` });

                const result = await smartPhotoUpload(
                    formData.fotoTinggiARM,
                    'Survey_Existing', // Folder di Firebase Storage
                    user.uid,
                    docRef.id,
                        'foto_tinggi_arm',
                        { forceApiRoute: true } // Paksa menggunakan API route untuk menghindari CORS
                );

                if (result.success) {
                    fotoTinggiARMUrl = result.downloadURL;
                    uploadedPhotos++;
                    setToast({ show: true, message: `✅ Foto tinggi ARM berhasil diupload (${uploadedPhotos}/${totalPhotos})` });
                    console.log('✅ Foto tinggi ARM upload berhasil:', result.downloadURL);
                    if (result.isFallback) {
                        console.log('⚠️ Foto tinggi ARM disimpan sementara:', result.message);
                    }
                } else {
                    console.error('❌ Error upload foto tinggi ARM:', result.error || 'Unknown error');
                    setToast({ show: true, message: `⚠️ Upload foto tinggi ARM gagal, melanjutkan tanpa foto` });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                console.log('ℹ️ Tidak ada foto tinggi ARM untuk diupload');
            }

            // Upload foto titik aktual jika ada
            if (formData.fotoTitikAktual) {
                console.log('📸 Processing foto titik aktual upload...');
                setToast({ show: true, message: `Mengupload foto titik aktual... (${uploadedPhotos + 1}/${totalPhotos})` });

                const result = await smartPhotoUpload(
                    formData.fotoTitikAktual,
                    'Survey_Existing', // Folder di Firebase Storage
                    user.uid,
                    docRef.id,
                    'foto_titik_aktual',
                    { forceApiRoute: true } // Paksa menggunakan API route untuk menghindari CORS
                );

                if (result.success) {
                    fotoTitikAktualUrl = result.downloadURL;
                    uploadedPhotos++;
                    setToast({ show: true, message: `✅ Foto titik aktual berhasil diupload (${uploadedPhotos}/${totalPhotos})` });
                    console.log('✅ Foto titik aktual upload berhasil:', result.downloadURL);
                    if (result.isFallback) {
                        console.log('⚠️ Foto titik aktual disimpan sementara:', result.message);
                    }
                } else {
                    console.error('❌ Error upload foto titik aktual:', result.error || 'Unknown error');
                    setToast({ show: true, message: `⚠️ Upload foto titik aktual gagal, melanjutkan tanpa foto` });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                console.log('ℹ️ Tidak ada foto titik aktual untuk diupload');
            }

            // Log hasil akhir upload
            console.log('📋 Hasil akhir upload foto:', {
                fotoTinggiARMUrl,
                fotoTitikAktualUrl,
                totalFotoUploaded: uploadedPhotos,
                totalFotoExpected: totalPhotos
            });
            
            // Update progress message
            if (totalPhotos > 0) {
                setToast({ show: true, message: `Upload foto selesai: ${uploadedPhotos}/${totalPhotos} berhasil` });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Update dokumen dengan URL foto jika berhasil diupload
            if (fotoTinggiARMUrl || fotoTitikAktualUrl) {
                const updateData = {};
                if (fotoTinggiARMUrl) updateData.fotoTinggiARM = fotoTinggiARMUrl;
                if (fotoTitikAktualUrl) updateData.fotoTitikAktual = fotoTitikAktualUrl;
                updateData.updatedAt = serverTimestamp();
                
                // Update the same collection where the doc was created
                await updateDoc(doc(db, 'Survey_Existing_Report', docRef.id), updateData);
                console.log('✅ Dokumen berhasil diupdate dengan URL foto');
            }
            
            console.log('✅ Data survey berhasil disimpan dengan foto');
            
            console.log('Survey Existing berhasil disimpan dengan ID:', docRef.id);
            
            // Reset form dan get location lagi
            setFormData({
                namaJalan: '',
                namaGang: '',
                kepemilikanTiang: '',
                jenisTiang: '',
                jenisTiangPLN: '',
                trafo: '',
                jenisTrafo: '',
                tinggiBawahTrafo: '',
                lampu: '',
                jumlahLampu: '',
                jenisLampu: '',
                fotoTinggiARM: null,
                fotoTitikAktual: null,
                keterangan: '',
                titikKordinat: '',
                lebarJalan1: '',
                lebarJalan2: '',
                lebarBahuBertiang: '',
                lebarTrotoarBertiang: '',
                lainnyaBertiang: '',
                tinggiARM: '',
                median: '',
                tinggiMedian: '',
                lebarMedian: ''
            });
            
            // Get location lagi setelah reset
            getCurrentLocation();
            
            // Tampilkan modal sukses
            setShowSuccessModal(true);
            
        } catch (error) {
            console.error('❌ Error menyimpan survey:', error);
            console.error('Error stack:', error.stack);
            
            // Log detail error untuk debugging
            if (error.code) {
                console.error('Error code:', error.code);
            }
            if (error.message) {
                console.error('Error message:', error.message);
            }
            if (error.name) {
                console.error('Error name:', error.name);
            }
            
            // Berikan pesan error yang lebih spesifik
            let errorMessage = 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
            
            // Handle upload-specific errors first
            if (error.message.includes('Upload') || error.message.includes('upload')) {
                if (error.message.includes('timeout')) {
                    errorMessage = 'Upload foto timeout. Silakan coba lagi dengan koneksi yang lebih stabil.';
                } else if (error.message.includes('Gagal terhubung ke server')) {
                    errorMessage = 'Gagal terhubung ke server upload. Periksa koneksi internet Anda.';
                } else if (error.message.includes('Data foto tidak tersedia')) {
                    errorMessage = 'Data foto tidak valid. Silakan ambil foto ulang.';
                } else if (error.message.includes('Ukuran foto terlalu besar')) {
                    errorMessage = 'Ukuran foto terlalu besar (maksimal 10MB). Silakan pilih foto yang lebih kecil.';
                } else {
                    errorMessage = `Upload foto gagal: ${error.message}`;
                }
            }
            // Handle Firebase-specific errors
            else if (error.code === 'storage/cors-error' || error.message.includes('CORS')) {
                errorMessage = 'Error CORS saat upload foto. Silakan coba lagi atau hubungi admin.';
            } else if (error.code === 'storage/unauthorized') {
                errorMessage = 'Tidak memiliki izin untuk upload foto. Silakan login ulang.';
            } else if (error.code === 'storage/quota-exceeded') {
                errorMessage = 'Kapasitas storage penuh. Silakan hubungi admin.';
            } else if (error.code === 'storage/network-request-failed') {
                errorMessage = 'Gagal terhubung ke server. Silakan cek koneksi internet.';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Tidak memiliki izin untuk menyimpan data. Silakan login ulang.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Server sedang tidak tersedia. Silakan coba lagi dalam beberapa saat.';
            }
            // Handle file-specific errors
            else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = 'File foto harus berupa gambar (JPG, PNG, dll).';
            } else if (error.message.includes('Ukuran file terlalu besar')) {
                errorMessage = 'Ukuran foto terlalu besar. Silakan pilih foto yang lebih kecil.';
            } else if (error.message.includes('Failed to convert image to WebP')) {
                errorMessage = 'Gagal mengkonversi foto ke format WebP. Silakan pilih foto yang berbeda.';
            }
            // Handle network errors
            else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Error jaringan. Periksa koneksi internet Anda.';
            }
            // Handle validation errors
            else if (error.message.includes('tidak tersedia') || error.message.includes('tidak valid')) {
                errorMessage = error.message;
            }
            
            console.error('Final error message to user:', errorMessage);
            setToast({ show: true, message: errorMessage });
            setTimeout(() => setToast({ show: false, message: '' }), 3000);
            
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDropdownField = (field, label, placeholder = `Pilih ${label}`) => {
        const isDisabled = field === 'jenisTrafo' && formData.trafo === 'Tidak Ada';
        
        const getDisplayValue = () => {
            if (field === 'kepemilikanTiang' && formData.kepemilikanTiang === 'PLN' && formData.jenisTiangPLN) {
                return `PLN - ${formData.jenisTiangPLN}`;
            }
            if (field === 'trafo' && formData.trafo === 'Ada' && formData.jenisTrafo) {
                const heightInfo = formData.tinggiBawahTrafo 
                    ? ` (${formData.tinggiBawahTrafo}m)`
                    : '';
                return `Ada - ${formData.jenisTrafo}${heightInfo}`;
            }
            if (field === 'lampu' && formData.lampu === 'Ada' && formData.jenisLampu && formData.jumlahLampu) {
                return `Ada - ${formData.jumlahLampu} - ${formData.jenisLampu}`;
            }
            if (field === 'lampu' && formData.lampu === 'Ada' && formData.jenisLampu) {
                return `Ada - ${formData.jumlahLampu || '?'} - ${formData.jenisLampu}`;
            }
            if (field === 'lampu' && formData.lampu === 'Ada' && formData.jumlahLampu) {
                return `Ada - ${formData.jumlahLampu}`;
            }
            if (field === 'lampu' && formData.lampu === 'Ada') {
                return 'Ada';
            }
            if (field === 'median' && formData.median === 'Ada' && formData.tinggiMedian && formData.lebarMedian) {
                return `Ada - T: ${formData.tinggiMedian}m, L: ${formData.lebarMedian}m`;
            }

            return formData[field] || placeholder;
        };

        const getDisplayIcon = () => {
            switch (field) {
                case 'kepemilikanTiang':
                    return '⚡';
                case 'jenisTiang':
                    return '⚡';
                case 'jenisTiangPLN':
                    return '⚡';
                case 'trafo':
                    return '🔌';
                case 'jenisTrafo':
                    return '⚡';
                case 'lampu':
                    return '💡';
                case 'jumlahLampu':
                    return '🔢';
                case 'jenisLampu':
                    return '🌟';
                case 'median':
                    return '🚧';
                default:
                    return '📋';
            }
        };
        
        return (
            <div className="relative mb-3 sm:mb-4 dropdown-container">
                <button
                    onClick={() => !isDisabled && toggleDropdown(field)}
                    disabled={isDisabled}
                    className={`w-full backdrop-blur-sm border rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-left flex items-center justify-between transition-all duration-300 group ${
                        isDisabled 
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                            : 'bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-base sm:text-lg">{getDisplayIcon()}</span>
                        <div className="flex flex-col items-start">
                            <span className="text-xs text-gray-500 font-medium">{label}</span>
                            <span className={`text-sm sm:text-base ${
                                isDisabled 
                                    ? 'text-gray-400' 
                                    : formData[field] 
                                        ? 'text-black font-semibold' 
                                        : 'text-gray-600'
                            }`}>
                                {isDisabled ? 'Tidak tersedia' : getDisplayValue()}
                            </span>
                        </div>
                    </div>
                    <ChevronDown 
                        size={18} 
                        className={`sm:w-5 sm:h-5 transition-transform duration-300 ${
                            isDisabled 
                                ? 'text-gray-300' 
                                : `text-gray-400 group-hover:text-gray-600 ${openDropdowns[field] ? 'rotate-180' : ''}`
                        }`} 
                    />
                </button>
                
                {openDropdowns[field] && !isDisabled && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-2">
                            <div className="text-xs text-gray-500 font-medium px-3 py-2">
                                Pilih {label}
                            </div>
                            {dropdownOptions[field]?.map((option, index) => (
                                <button
                                    key={option}
                                    onClick={() => selectOption(field, option)}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <span className="text-lg">{getDisplayIcon()}</span>
                                    <span>{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* PLN Sub Options */}
                {showPLNSubOptions && field === 'kepemilikanTiang' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">⚡ PLN - Pilih Jenis Tiang</h4>
                                <p className="text-xs text-gray-500 mt-1">Pilih jenis tiang PLN yang sesuai</p>
                            </div>
                            
                            <div className="space-y-2 pt-3">
                                <button
                                    onClick={() => handlePLNSubOption('Tiang TR')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">⚡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Tiang TR</span>
                                        <span className="text-xs text-gray-500">Tiang Tegangan Rendah</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handlePLNSubOption('Tiang TM')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">⚡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Tiang TM</span>
                                        <span className="text-xs text-gray-500">Tiang Tegangan Menengah</span>
                                    </div>
                                </button>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handlePLNSubOptionCancel}
                                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Trafo Sub Options */}
                {showTrafoSubOptions && field === 'trafo' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">🔌 Trafo - Pilih Jenis</h4>
                                <p className="text-xs text-gray-500 mt-1">Pilih jenis trafo yang tersedia</p>
                            </div>
                            
                            <div className="space-y-2 pt-3">
                                <button
                                    onClick={() => handleTrafoSubOption('Double')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">⚡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Double</span>
                                        <span className="text-xs text-gray-500">Trafo Double Phase</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleTrafoSubOption('Single')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">⚡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Single</span>
                                        <span className="text-xs text-gray-500">Trafo Single Phase</span>
                                    </div>
                                </button>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleTrafoSubOptionCancel}
                                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Trafo Height Input */}
                {showTrafoHeightInput && field === 'trafo' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">📏 Masukkan Tinggi Trafo</h4>
                                <p className="text-xs text-gray-500 mt-1">Isi tinggi batas bawah trafo</p>
                            </div>
                            
                            <div className="space-y-4 pt-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        Tinggi Batas Bawah (m)
                                    </label>
                                    <input
                                        type="number"
                                        value={tinggiBawahInput}
                                        onChange={(e) => setTinggiBawahInput(e.target.value)}
                                        placeholder="Contoh: 2.5"
                                        step="0.1"
                                        min="0"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
                                        autoFocus
                                    />
                                </div>
                                
                                
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={handleTrafoHeightCancel}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium border border-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleTrafoHeightSave}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                    Simpan Tinggi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                

                
                {/* Lampu Count Options */}
                {showLampuCountOptions && field === 'lampu' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">💡 Lampu - Pilih Jumlah</h4>
                                <p className="text-xs text-gray-500 mt-1">Pilih jumlah lampu yang ada</p>
                            </div>
                            
                            <div className="space-y-2 pt-3">
                                <button
                                    onClick={() => handleLampuCountOption('1')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">1 Lampu</span>
                                        <span className="text-xs text-gray-500">Satu lampu</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuCountOption('2')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">2 Lampu</span>
                                        <span className="text-xs text-gray-500">Dua lampu</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuCountOption('3')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">3 Lampu</span>
                                        <span className="text-xs text-gray-500">Tiga lampu</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuCountOption('4')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">4 Lampu</span>
                                        <span className="text-xs text-gray-500">Empat lampu</span>
                                    </div>
                                </button>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleLampuCountOptionCancel}
                                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Lampu Type Options */}
                {showLampuTypeOptions && field === 'lampu' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">💡 Lampu - Pilih Jenis</h4>
                                <p className="text-xs text-gray-500 mt-1">Pilih jenis lampu yang digunakan</p>
                            </div>
                            
                            <div className="space-y-2 pt-3">
                                <button
                                    onClick={() => handleLampuTypeOption('Konvensional')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Konvensional</span>
                                        <span className="text-xs text-gray-500">Lampu tradisional</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuTypeOption('LED')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">LED</span>
                                        <span className="text-xs text-gray-500">Lampu LED modern</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuTypeOption('Swadaya')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">💡</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Swadaya</span>
                                        <span className="text-xs text-gray-500">Lampu swadaya masyarakat</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleLampuTypeOption('Panel Surya')}
                                    className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3 border border-gray-100 hover:border-blue-200"
                                >
                                    <span className="text-lg">☀️</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Panel Surya</span>
                                        <span className="text-xs text-gray-500">Lampu dengan tenaga surya</span>
                                    </div>
                                </button>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleLampuTypeOptionCancel}
                                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Median Input */}
                {showMedianInput && field === 'median' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4">
                            <div className="text-center pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">🚧 Masukkan Detail Median</h4>
                                <p className="text-xs text-gray-500 mt-1">Isi tinggi dan lebar median jalan</p>
                            </div>
                            
                            <div className="space-y-4 pt-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        Tinggi Median (m)
                                    </label>
                                    <input
                                        type="number"
                                        value={tinggiMedianInput}
                                        onChange={(e) => setTinggiMedianInput(e.target.value)}
                                        placeholder="Contoh: 0.5"
                                        step="0.1"
                                        min="0"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Lebar Median (m)
                                    </label>
                                    <input
                                        type="number"
                                        value={lebarMedianInput}
                                        onChange={(e) => setLebarMedianInput(e.target.value)}
                                        placeholder="Contoh: 1.2"
                                        step="0.1"
                                        min="0"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 font-medium"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={handleMedianCancel}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium border border-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleMedianSave}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                    Simpan Median
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInputField = (field, label, placeholder, type = 'text') => (
        <div className="mb-3 sm:mb-4">
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium text-sm sm:text-base"
            />
        </div>
    );

    const getCombinedLocationText = () => {
        const parts = [];
        if (formData.namaJalan) parts.push(formData.namaJalan);
        if (formData.namaGang) parts.push(`Gang ${formData.namaGang}`);
        return parts.join(', ') || 'Lokasi tidak diketahui';
    };

    // Fungsi untuk menyimpan tracking data ke maps_surveyor_collection
    const saveTrackingData = async (surveyDocId, surveyData) => {
        try {
            console.log('📍 Menyimpan tracking data ke maps_surveyor_collection...');
            
            // Parse koordinat
            const [latStr, lngStr] = String(formData.titikKordinat || '').split(',').map(s => s.trim());
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            
            const trackingData = {
                // Informasi surveyor
                surveyorId: user.uid,
                surveyorName: user.displayName || user.email || 'Unknown Surveyor',
                surveyorEmail: user.email,
                
                // Informasi tugas
                taskType: 'Survey Existing',
                taskCategory: 'existing',
                surveyDocId: surveyDocId,
                
                // Lokasi
                location: {
                    coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
                    address: getCombinedLocationText(),
                    namaJalan: formData.namaJalan || '',
                    namaGang: formData.namaGang || '',
                    titikKordinat: formData.titikKordinat || ''
                },
                
                // Detail survey
                surveyDetails: {
                    kepemilikanTiang: formData.kepemilikanTiang || '',
                    jenisTiang: formData.jenisTiang || '',
                    trafo: formData.trafo || '',
                    lampu: formData.lampu || '',
                    median: formData.median || '',
                    tinggiMedian: formData.tinggiMedian || '',
                    lebarMedian: formData.lebarMedian || '',
                    tinggiARM: formData.tinggiARM || '',
                    lebarJalan1: formData.lebarJalan1 || '',
                    lebarJalan2: formData.lebarJalan2 || '',
                    keterangan: formData.keterangan || ''
                },
                
                // Status dan waktu
                status: 'completed',
                completedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                
                // Metadata untuk tracking
                trackingInfo: {
                    deviceInfo: navigator.userAgent || 'Unknown Device',
                    timestamp: new Date().toISOString(),
                    sessionId: Date.now().toString(),
                    source: 'survey_existing_page'
                },
                
                // Referensi ke data asli
                originalCollection: 'Survey_Existing_Report',
                originalDocId: surveyDocId,
                
                // Untuk kompatibilitas dengan Maps Surveyor
                surveyType: 'Survey Existing',
                projectTitle: `Survey Existing - ${getCombinedLocationText()}`,
                projectLocation: formData.titikKordinat || 'Koordinat tidak tersedia'
            };
            
            // Simpan ke maps_surveyor_collection
            const trackingDocRef = await addDoc(collection(db, 'maps_surveyor_collection'), trackingData);
            console.log('✅ Tracking data berhasil disimpan dengan ID:', trackingDocRef.id);
            
            return trackingDocRef.id;
        } catch (error) {
            console.error('❌ Error menyimpan tracking data:', error);
            // Jangan throw error agar tidak mengganggu proses utama
            console.warn('⚠️ Tracking data gagal disimpan, tapi survey tetap berhasil');
        }
    };

    const getCombinedLebarJalanText = () => {
        const hasJalan1 = formData.lebarJalan1 && formData.lebarJalan1.trim();
        const hasJalan2 = formData.lebarJalan2 && formData.lebarJalan2.trim();
        
        if (hasJalan1 && hasJalan2) {
            return `${formData.lebarJalan1}m • ${formData.lebarJalan2}m`;
        } else if (hasJalan1) {
            return `${formData.lebarJalan1}m`;
        } else if (hasJalan2) {
            return `${formData.lebarJalan2}m`;
        } else {
            return 'Pilih lebar jalan';
        }
    };

    const getLocationDisplay = () => {
        const hasJalan = formData.namaJalan && formData.namaJalan.trim();
        const hasGang = formData.namaGang && formData.namaGang.trim();
        
        if (hasJalan && hasGang) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📍 Lokasi</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Jalan</span>
                        <span className="font-semibold text-gray-800">{formData.namaJalan}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Gang</span>
                        <span className="font-semibold text-gray-800">{formData.namaGang}</span>
                    </div>
                </div>
            );
        } else if (hasJalan) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📍 Lokasi</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Jalan</span>
                        <span className="font-semibold text-gray-800">{formData.namaJalan}</span>
                    </div>
                </div>
            );
        } else if (hasGang) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📍 Lokasi</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Gang</span>
                        <span className="font-semibold text-gray-800">{formData.namaGang}</span>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="flex items-center space-x-2">
                    <span className="text-gray-400">📍</span>
                    <span className="text-gray-600">Pilih lokasi jalan/gang</span>
                </div>
            );
        }
    };

    const getLebarJalanDisplay = () => {
        const hasJalan1 = formData.lebarJalan1 && formData.lebarJalan1.trim();
        const hasJalan2 = formData.lebarJalan2 && formData.lebarJalan2.trim();
        
        if (hasJalan1 && hasJalan2) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📏 Lebar Jalan</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Jalan 1</span>
                        <span className="font-semibold text-gray-800">{formData.lebarJalan1}m</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Jalan 2</span>
                        <span className="font-semibold text-gray-800">{formData.lebarJalan2}m</span>
                    </div>
                </div>
            );
        } else if (hasJalan1) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📏 Lebar Jalan</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Jalan 1</span>
                        <span className="font-semibold text-gray-800">{formData.lebarJalan1}m</span>
                    </div>
                </div>
            );
        } else if (hasJalan2) {
            return (
                <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500 font-medium">📏 Lebar Jalan</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Jalan 2</span>
                        <span className="font-semibold text-gray-800">{formData.lebarJalan2}m</span>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="flex items-center space-x-2">
                    <span className="text-gray-400">📏</span>
                    <span className="text-gray-600">Pilih lebar jalan</span>
                </div>
            );
        }
    };

    const renderMurniField = () => (
        <div className="mb-4 dropdown-container">
            <div className="relative">
                <button
                    onClick={() => toggleDropdown('murni')}
                    className="w-full backdrop-blur-sm border rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
                >
                    <div className="flex items-center space-x-2">
                        {formData.murni ? (
                            <>
                                <span className="text-gray-400">✅</span>
                                <span className="font-semibold text-gray-800">{formData.murni}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-400">✅</span>
                                <span className="text-gray-600">Pilih status murni</span>
                            </>
                        )}
                    </div>
                    <ChevronDown 
                        size={20} 
                        className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-300 ${openDropdowns.murni ? 'rotate-180' : ''}`} 
                    />
                </button>

                {openDropdowns.murni && (
                    <div className="absolute z-[9999] w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-slideDown">
                        {dropdownOptions.murni.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => selectOption('murni', option)}
                                className="w-full px-5 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100 last:border-0 font-medium text-gray-700 hover:text-gray-900"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderNamaJalanGangField = () => (
        <div className="mb-4 dropdown-container">
            <div className="relative">
                <button
                    onClick={() => toggleDropdown('namaJalan')}
                    className="w-full backdrop-blur-sm border rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
                >
                    <div className="flex-1">
                        {getLocationDisplay()}
                    </div>
                    <ChevronDown 
                        size={20} 
                        className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-300 ${openDropdowns.namaJalan ? 'rotate-180' : ''}`} 
                    />
                </button>
                
                {openDropdowns.namaJalan && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        {dropdownOptions.namaJalan?.map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption('namaJalan', option)}
                                className="w-full px-5 py-4 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 font-medium"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Input Fields yang muncul ketika dropdown dipilih */}
                {showNamaJalanInput && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300 p-4">
                        <div className="space-y-4">
                            <div className="text-center pb-2 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">📍 Masukkan Lokasi</h4>
                                <p className="text-xs text-gray-500 mt-1">Isi nama jalan dan/atau gang</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Nama Jalan
                                </label>
                                <input
                                    type="text"
                                    value={namaJalanInput}
                                    onChange={(e) => setNamaJalanInput(e.target.value)}
                                    placeholder="Contoh: Jalan Sudirman"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Nama Gang
                                </label>
                                <input
                                    type="text"
                                    value={namaGangInput}
                                    onChange={(e) => setNamaGangInput(e.target.value)}
                                    placeholder="Contoh: Gang 1 (opsional)"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 font-medium"
                                />
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleNamaJalanGangCancel}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium border border-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleNamaJalanGangSave}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                    Simpan Lokasi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderLebarJalanField = () => (
        <div className="mb-4 dropdown-container">
            <div className="relative">
                <button
                    onClick={() => toggleDropdown('lebarJalan')}
                    className="w-full backdrop-blur-sm border rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
                >
                    <div className="flex-1">
                        {getLebarJalanDisplay()}
                    </div>
                    <ChevronDown 
                        size={20} 
                        className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-300 ${openDropdowns.lebarJalan ? 'rotate-180' : ''}`} 
                    />
                </button>
                
                {openDropdowns.lebarJalan && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        {dropdownOptions.lebarJalan?.map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption('lebarJalan', option)}
                                className="w-full px-5 py-4 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 font-medium"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Input Fields yang muncul ketika dropdown dipilih */}
                {showLebarJalanInput && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300 p-4">
                        <div className="space-y-4">
                            <div className="text-center pb-2 border-b border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-800">📏 Masukkan Lebar Jalan</h4>
                                <p className="text-xs text-gray-500 mt-1">Isi lebar jalan dalam meter</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Lebar Jalan 1 (m)
                                </label>
                                <input
                                    type="number"
                                    value={lebarJalan1Input}
                                    onChange={(e) => setLebarJalan1Input(e.target.value)}
                                    placeholder="Contoh: 4.0"
                                    step="0.1"
                                    min="0"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Lebar Jalan 2 (m) - Opsional
                                </label>
                                <input
                                    type="number"
                                    value={lebarJalan2Input}
                                    onChange={(e) => setLebarJalan2Input(e.target.value)}
                                    placeholder="Contoh: 3.5 (opsional)"
                                    step="0.1"
                                    min="0"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600 hover:border-gray-300 focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 font-medium"
                                />
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleLebarJalanCancel}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-medium border border-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleLebarJalanSave}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                    Simpan Lebar Jalan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderLocationField = () => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-800 font-medium">Titik Koordinat</span>
                    <div className="flex items-center gap-2">
                        {/* Real-time toggle button */}
                        <button
                            onClick={toggleRealtimeLocation}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                                isRealtimeEnabled 
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={isRealtimeEnabled ? 'Matikan pelacakan real-time' : 'Aktifkan pelacakan real-time'}
                        >
                            {isRealtimeEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
                        </button>
                        
                        {locationStatus === 'loading' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        )}
                        <MapPin 
                            size={20} 
                            className={`${
                                locationStatus === 'success' ? 'text-green-500' : 
                                locationStatus === 'error' ? 'text-red-500' : 
                                'text-gray-400'
                            }`} 
                        />
                    </div>
                </div>
                
                <div className="relative">
                    <input
                        type="text"
                        value={formData.titikKordinat}
                        readOnly
                        placeholder={
                            locationStatus === 'loading' ? 'Mendapatkan lokasi...' :
                            locationStatus === 'error' ? 'Gagal mendapatkan lokasi' :
                            'Koordinat akan terisi otomatis'
                        }
                        className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono cursor-not-allowed ${
                            locationStatus === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
                            locationStatus === 'error' ? 'text-red-700 bg-red-50 border-red-200' :
                            'text-gray-500'
                        }`}
                    />
                    
                    {locationStatus === 'success' && (
                        <button
                            onClick={() => setShowMapModal(true)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                            title="Lihat di peta"
                        >
                            <MapPin size={14} />
                        </button>
                    )}
                </div>
                
                {/* Status indicators */}
                <div className="mt-3 space-y-2">
                    {/* Real-time status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                                isRealtimeEnabled && isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                            }`}></span>
                            <span className="text-xs text-gray-600">
                                {isRealtimeEnabled && isWatching ? 'Pelacakan real-time aktif' : 'Pelacakan real-time nonaktif'}
                            </span>
                        </div>
                        
                        {!isRealtimeEnabled && (
                            <button
                                onClick={refreshLocation}
                                className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                            >
                                Refresh Manual
                            </button>
                        )}
                    </div>
                    
                    {/* Accuracy indicator */}
                    {locationAccuracy && (
                        <div className="text-xs text-gray-500">
                            Akurasi: ±{Math.round(locationAccuracy)}m
                        </div>
                    )}
                    
                    {/* Error display */}
                    {locationStatus === 'error' && locationError && (
                        <div className="text-xs text-red-600">
                            {locationError.message || 'Gagal mendapatkan lokasi'}
                        </div>
                    )}
                    
                    {/* Last update time */}
                    {locationTimestamp && isRealtimeEnabled && (
                        <div className="text-xs text-gray-500">
                            Terakhir diperbarui: {new Date(locationTimestamp).toLocaleTimeString('id-ID')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Ubah renderImageUploadField agar tombol langsung buka kamera fullscreen
    const renderImageUploadField = (field, label) => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-800 font-medium">{label}</span>
                    <Camera size={20} className="text-gray-400" />
                </div>
                {!formData[field] && (
                    <p className="text-xs text-gray-500 mb-3">Ambil langsung dari kamera perangkat. Tidak ada pilihan galeri/file.</p>
                )}
                {formData[field] ? (
                    <div className="relative">
                        <img
                            src={formData[field] instanceof File ? URL.createObjectURL(formData[field]) : formData[field]}
                            alt={label}
                            className="w-full h-32 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    [field]: null
                                }));
                            }}
                            className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-full cursor-pointer hover:bg-red-600 transition-colors duration-200 shadow-lg"
                            title="Hapus foto"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleImageUpload(field)}
                            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow"
                        >
                            Ambil Foto
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // Ubah handleImageUpload agar buka kamera fullscreen
    const handleImageUpload = async (field) => {
        try {
            // Buka kamera belakang bawaan (native/capacitor atau mobile web input capture)
            const photoData = await openDirectCameraAndTakePhoto();
            if (!photoData || !photoData.imageData) throw new Error('Tidak ada hasil foto');
            // Simpan langsung ke form tanpa modal preview
            setFormData((prev) => ({ ...prev, [field]: photoData.imageData }));
            if (photoData.coordinates) {
                setFormData((prev) => ({ ...prev, titikKordinat: photoData.coordinates }));
            }
            setToast({ show: true, message: 'Foto berhasil diambil' });
            setTimeout(() => setToast({ show: false, message: '' }), 1500);
        } catch (error) {
            console.error('Error taking photo:', error);
            if (error.message !== 'Pengambilan foto dibatalkan') {
                setToast({ show: true, message: `Gagal mengambil foto: ${error.message}` });
                setTimeout(() => setToast({ show: false, message: '' }), 2600);
            }
        }
    };

    const confirmUsePhoto = () => {
        if (previewPhoto && previewField) {
            setFormData((prev) => ({ ...prev, [previewField]: previewPhoto }));
            setToast({ show: true, message: 'Foto berhasil dipilih.' });
            setTimeout(() => setToast({ show: false, message: '' }), 1800);
        }
        setPreviewPhoto(null);
        setPreviewField(null);
    };

    const retakePhoto = async () => {
        const field = previewField;
        setPreviewPhoto(null);
        setPreviewField(null);
        await handleImageUpload(field);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {/* Toast */}
            {toast.show && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2147483647]">
                    <div className="px-4 py-2 rounded-xl shadow-lg bg-gray-900/90 text-white text-sm border border-gray-700">
                        {toast.message}
                    </div>
                </div>
            )}
            {/* Mobile-Optimized Header - Fixed Position */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
                <div className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center flex-1 mx-2">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
                                Survey Existing
                            </h1>
                        </div>
                        
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-base sm:text-lg">📋</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile-Optimized Form Content */}
            <div className="px-3 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-24 pt-28 sm:pt-32 relative z-10">
                <div className="max-w-md mx-auto space-y-2 sm:space-y-3">
                    {/* Input Fields dengan spacing yang dioptimalkan untuk mobile */}
                    {renderMurniField()}
                    {renderNamaJalanGangField()}
                    {renderLebarJalanField()}
                    
                    {/* Dropdown Fields */}
                    {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
                    {renderDropdownField('jenisTiang', 'Jenis Tiang')}
                    {renderDropdownField('trafo', 'Trafo')}
                    {renderDropdownField('lampu', 'Lampu')}
                    {renderDropdownField('median', 'Median Jalan')}
                    {renderLocationField()}
                    
                    {/* Input fields dengan spacing yang lebih compact untuk mobile */}
                    <div className="space-y-2 sm:space-y-3">
                        {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'Lebar Bahu Bertiang (m)', 'number')}
                        {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'Lebar Trotoar Bertiang (m)', 'number')}
                        {renderInputField('lainnyaBertiang', 'Lainnya Bertiang', 'Lainnya Bertiang')}
                        {renderInputField('tinggiARM', 'Tinggi ARM (m)', 'Tinggi ARM (m)', 'number')}
                    </div>
                    
                    {/* Image Upload Fields */}
                    {renderImageUploadField('fotoTinggiARM', 'Foto Tinggi ARM')}
                    {renderImageUploadField('fotoTitikAktual', 'Foto Titik Aktual')}
                    
                    {/* Keterangan Field */}
                    <div className="mb-4 sm:mb-6">
                        <textarea
                            value={formData.keterangan}
                            onChange={(e) => handleInputChange('keterangan', e.target.value)}
                            placeholder="Keterangan"
                            rows={3}
                            className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium resize-none text-sm sm:text-base"
                        />
                    </div>

                    {/* Submit Button - Right after Keterangan Field */}
                    <div className="mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`w-full font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 ${
                                isSubmitting 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl sm:hover:shadow-3xl hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 active:scale-95'
                            } text-white text-sm sm:text-base`}
                        >
                            <Save size={18} className="sm:w-5 sm:h-5" />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Modal dengan Peta Interaktif */}
            {showMapModal && formData.titikKordinat && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Lokasi Koordinat</h3>
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} className="text-green-500" />
                                    <span className="text-sm font-medium text-gray-700">Koordinat Saat Ini</span>
                                </div>
                                <p className="text-sm font-mono text-gray-600 bg-white p-2 rounded border">
                                    {formData.titikKordinat}
                                </p>
                            </div>
                            
                            {/* Interactive Map */}
                            <div className="bg-gray-100 rounded-xl overflow-hidden mb-4" style={{ height: '300px' }}>
                                <iframe
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.titikKordinat.split(',')[1]) - 0.01},${parseFloat(formData.titikKordinat.split(',')[0]) - 0.01},${parseFloat(formData.titikKordinat.split(',')[1]) + 0.01},${parseFloat(formData.titikKordinat.split(',')[0]) + 0.01}&layer=mapnik&marker=${formData.titikKordinat.split(',')[0]},${formData.titikKordinat.split(',')[1]}`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Peta Lokasi"
                                ></iframe>
                            </div>
                            
                            <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-blue-700">
                                    📍 Koordinat ini diambil secara otomatis menggunakan GPS perangkat Anda dengan presisi tinggi.
                                </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const [lat, lng] = formData.titikKordinat.split(',').map(coord => coord.trim());
                                        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                    }}
                                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 transition-colors duration-200 text-sm font-medium"
                                >
                                    Buka di Google Maps
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(formData.titikKordinat);
                                        setToast({ show: true, message: 'Koordinat berhasil disalin!' });
                                        setTimeout(() => setToast({ show: false, message: '' }), 1600);
                                    }}
                                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-xl hover:bg-gray-600 transition-colors duration-200 text-sm font-medium"
                                >
                                    Salin Koordinat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* Submit Button - Moved to right after Keterangan Field */}

            {/* Mini Maps Component - Always show if task is active */}
            <MiniMapsComponent 
                userId={user?.uid} 
                taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
                previewPoint={(() => {
                    try {
                        const [latStr, lngStr] = String(formData.titikKordinat || '').split(',').map(s => s.trim());
                        const lat = parseFloat(latStr);
                        const lng = parseFloat(lngStr);
                        return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null;
                    } catch {
                        return null;
                    }
                })()}
            />

            {/* Success Alert Modal */}
            <SuccessAlertModal
                isVisible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Berhasil Di Simpan"
                message="Data survey existing telah berhasil disimpan ke database dengan foto. Data dapat dilihat di dashboard admin untuk validasi."
                autoClose={true}
                autoCloseDelay={4000}
            />
            
        </div>
    );
};

export default SurveyExistingPage;

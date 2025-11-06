'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X, Zap, ZapOff, Hash, Power, TowerControl, Route, Construction } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';
import useRealtimeLocation from '../../hooks/useRealtimeLocation';
import MiniMapsComponent from '../MiniMapsComponentLazy'; // Menambahkan import yang hilang
import ModernAlertModal from '../modals/ModernAlertModal';

const SurveyAPJProposePage = ({ onBack }) => {
    // Deteksi perangkat untuk perilaku input kamera
    const ua = (typeof navigator !== 'undefined' && (navigator.userAgent || navigator.vendor)) || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile = isIOS || isAndroid;
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
    const [alertModal, setAlertModal] = useState({
        isVisible: false,
        type: 'success',
        title: '',
        message: ''
    });
    const [formData, setFormData] = useState({
        adaIdTitik: '', // 'Ada' atau 'Tidak Ada'
        idTitik: '', // ID Titik jika ada
        dataDaya: '',
        dataTiang: '',
        dataRuas: '',
        dataRuasSub: '',
        jarakAntarTiang: '',
        titikKordinat: '',
        lebarJalan1: '',
        lebarJalan2: '',
        lebarBahuBertiang: '',
        lebarTrotoarBertiang: '',
        lainnyaBertiang: '',
        median: '',
        tinggiMedian: '',
        lebarMedian: '',
        fotoTitikAktual: null,
        fotoKemerataan: null,
        keterangan: ''
    });

    const [openDropdowns, setOpenDropdowns] = useState({});
    const [showMedianInput, setShowMedianInput] = useState(false);
    const [tinggiMedianInput, setTinggiMedianInput] = useState('');
    const [lebarMedianInput, setLebarMedianInput] = useState('');
    const [showIdTitikInput, setShowIdTitikInput] = useState(false);
    const [idTitikInput, setIdTitikInput] = useState('');
    const [showLebarJalanInput, setShowLebarJalanInput] = useState(false);
    const [lebarJalan1Input, setLebarJalan1Input] = useState('');
    const [lebarJalan2Input, setLebarJalan2Input] = useState('');

    // Set page title
    usePageTitle('Survey APJ Propose - Sistem Manajemen');

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
        timeout: 10000,
        maximumAge: 1000,
        distanceFilter: 1, // Update every 1 meter movement
        autoStart: isRealtimeEnabled
    });

    // Helper function to show modern alerts
    const showAlert = (type, title, message) => {
        setAlertModal({
            isVisible: true,
            type,
            title,
            message
        });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, isVisible: false }));
    };

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
            showAlert('error', 'Gagal Mendapatkan Lokasi', 'Tidak dapat memperbarui koordinat. Silakan coba lagi.');
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setOpenDropdowns({});
                setShowIdTitikInput(false);
                setShowLebarJalanInput(false);
                setShowMedianInput(false);
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

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const toggleDropdown = (field) => {
        setOpenDropdowns(prev => ({
            // Hanya satu dropdown yang bisa terbuka dalam satu waktu
            [field]: !prev[field]
        }));
    };

    const selectOption = (field, value) => {
        setOpenDropdowns({});
        setShowIdTitikInput(false);
        setShowLebarJalanInput(false);
        setShowMedianInput(false);

        if (field === 'adaIdTitik' && value === 'Ada') {
            setShowIdTitikInput(true);
            setIdTitikInput(formData.idTitik || '');
            return;
        }

        if (field === 'lebarJalan' && value === '📏 Masukkan Lebar Jalan') {
            setShowLebarJalanInput(true);
            setLebarJalan1Input(formData.lebarJalan1 || '');
            setLebarJalan2Input(formData.lebarJalan2 || '');
            return;
        }

        if (field === 'median' && value === 'Ada') {
            setShowMedianInput(true);
            setTinggiMedianInput(formData.tinggiMedian || '');
            setLebarMedianInput(formData.lebarMedian || '');
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'dataRuas' && value !== 'Kolektor' ? { dataRuasSub: '' } : {}),
            ...(field === 'adaIdTitik' && value === 'Tidak Ada' ? { idTitik: '' } : {}),
            ...(field === 'median' && value === 'Tidak Ada' ? { 
                tinggiMedian: '',
                lebarMedian: ''
            } : {})
        }));
    };

    const handleIdTitikSave = () => {
        setFormData(prev => ({ ...prev, adaIdTitik: 'Ada', idTitik: idTitikInput.trim() }));
        setShowIdTitikInput(false);
        setOpenDropdowns({});
        setIdTitikInput(''); // Reset input
    };

    const handleIdTitikCancel = () => {
        setShowIdTitikInput(false);
        setOpenDropdowns({});
        setIdTitikInput(''); // Reset input
    };

    const handleLebarJalanSave = () => {
        setFormData(prev => ({ ...prev, lebarJalan1: lebarJalan1Input.trim(), lebarJalan2: lebarJalan2Input.trim() }));
        setShowLebarJalanInput(false);
        setOpenDropdowns({});
    };

    const handleLebarJalanCancel = () => {
        setShowLebarJalanInput(false);
        setOpenDropdowns({});
    };

    const handleImageUpload = (field, event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    [field]: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
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

    const handleSubmit = async () => {
        if (!user) {
            showAlert('error', 'Login Diperlukan', 'Anda harus login terlebih dahulu untuk menyimpan data survey!');
            return;
        }

        // Validasi form
        if (!formData.adaIdTitik) {
            showAlert('warning', 'Data Tidak Lengkap', 'Pilih status ID Titik.');
            return;
        }
        if (formData.adaIdTitik === 'Ada' && !formData.idTitik) {
            showAlert('warning', 'Data Tidak Lengkap', 'Masukkan ID Titik.');
            return;
        }
        if (!formData.dataDaya || !formData.dataTiang || !formData.dataRuas) {
            showAlert('warning', 'Data Tidak Lengkap', 'Daya Lampu, Data Tiang, dan Data Ruas harus diisi.');
            return;
        }
        if (formData.dataRuas === 'Kolektor' && !formData.dataRuasSub) {
            showAlert('warning', 'Data Tidak Lengkap', 'Pilih sub-kategori untuk Data Ruas Kolektor.');
            return;
        }

        setIsSubmitting(true);
        console.log('🚀 Mulai proses penyimpanan Survey APJ Propose...');

        try {
            const finalDataRuas = formData.dataRuas === 'Kolektor' && formData.dataRuasSub
                ? `Kolektor - ${formData.dataRuasSub}`
                : formData.dataRuas;

            const surveyData = {
                adaIdTitik: formData.adaIdTitik,
                idTitik: formData.idTitik,
                dataDaya: formData.dataDaya,
                dataTiang: formData.dataTiang,
                dataRuas: finalDataRuas,
                jarakAntarTiang: formData.jarakAntarTiang,
                titikKordinat: formData.titikKordinat,
                lebarJalan1: formData.lebarJalan1,
                lebarJalan2: formData.lebarJalan2,
                lebarBahuBertiang: formData.lebarBahuBertiang,
                lebarTrotoarBertiang: formData.lebarTrotoarBertiang,
                lainnyaBertiang: formData.lainnyaBertiang,
                median: formData.median,
                tinggiMedian: formData.tinggiMedian,
                lebarMedian: formData.lebarMedian,
                keterangan: formData.keterangan,
                
                fotoTitikAktual: null,
                fotoKemerataan: null,
                
                surveyType: 'Survey APJ Propose',
                surveyCategory: 'survey_apj_propose',
                surveyorName: user.displayName || user.email,
                surveyorId: user.uid,
                projectTitle: `Survey APJ Propose - ${formData.idTitik || 'Tanpa ID'}`,
                projectLocation: formData.titikKordinat || 'Koordinat tidak tersedia',
                projectDate: new Date().toISOString().split('T')[0],
                
                validationStatus: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'survey_apj_propose'), surveyData);
            console.log('✅ Dokumen berhasil dibuat dengan ID:', docRef.id);

            let fotoTitikAktualUrl = null;
            let fotoKemerataanUrl = null;

            if (formData.fotoTitikAktual) {
                const result = await smartPhotoUpload(formData.fotoTitikAktual, 'survey_apj', user.uid, docRef.id, 'foto_titik_aktual');
                if (result.success) fotoTitikAktualUrl = result.downloadURL;
            }
            if (formData.fotoKemerataan) {
                const result = await smartPhotoUpload(formData.fotoKemerataan, 'survey_apj', user.uid, docRef.id, 'foto_kemerataan');
                if (result.success) fotoKemerataanUrl = result.downloadURL;
            }

            if (fotoTitikAktualUrl || fotoKemerataanUrl) {
                await updateDoc(doc(db, 'survey_apj_propose', docRef.id), {
                    ...(fotoTitikAktualUrl && { fotoTitikAktual: fotoTitikAktualUrl }),
                    ...(fotoKemerataanUrl && { fotoKemerataan: fotoKemerataanUrl }),
                    updatedAt: serverTimestamp()
                });
            }

            showAlert('success', 'Berhasil Disimpan', 'Data Survey APJ Propose telah berhasil disimpan.');
            
            setFormData({
                adaIdTitik: '', idTitik: '', dataDaya: '', dataTiang: '', dataRuas: '', dataRuasSub: '',
                jarakAntarTiang: '', titikKordinat: '', lebarJalan1: '', lebarJalan2: '',
                lebarBahuBertiang: '', lebarTrotoarBertiang: '', lainnyaBertiang: '',
                median: '', tinggiMedian: '', lebarMedian: '',
                fotoTitikAktual: null, fotoKemerataan: null, keterangan: ''
            });
            getCurrentLocation();

        } catch (error) {
            console.error('❌ Error menyimpan survey:', error);
            showAlert('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDropdownField = (field, label, placeholder, options, icon) => {
        const getDisplayValue = () => {
            if (field === 'adaIdTitik' && formData.adaIdTitik === 'Ada' && formData.idTitik) {
                return `Ada - ${formData.idTitik}`;
            }
            if (field === 'dataRuas' && formData.dataRuas === 'Kolektor' && formData.dataRuasSub) {
                return `Kolektor - ${formData.dataRuasSub}`;
            }
            if (field === 'median' && formData.median === 'Ada' && formData.tinggiMedian && formData.lebarMedian) {
                return `Ada - T: ${formData.tinggiMedian}m, L: ${formData.lebarMedian}m`;
            }
            return formData[field] || placeholder;
        };

        return (
            <div className="relative mb-3 dropdown-container">
                <button
                    onClick={() => toggleDropdown(field)}
                    className="w-full backdrop-blur-sm border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg">{icon}</span>
                        <div className="flex flex-col items-start">
                            <span className="text-xs text-gray-500 font-medium">{label}</span>
                            <span className={`text-sm ${formData[field] ? 'text-black font-semibold' : 'text-gray-600'}`}>
                                {getDisplayValue()}
                            </span>
                        </div>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-300 text-gray-400 group-hover:text-gray-600 ${openDropdowns[field] ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns[field] && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300 p-2">
                        <div className="text-xs text-gray-500 font-medium px-3 py-2">Pilih {label}</div>
                        {options.map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption(field, option)}
                                className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3"
                            >
                                <span className="text-lg">{icon}</span>
                                <span>{option}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Pop-up inputs */}
                {showIdTitikInput && field === 'adaIdTitik' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] p-4">
                        <h4 className="text-sm font-semibold text-gray-800 text-center pb-3 border-b">Masukkan ID Titik</h4>
                        <input
                            type="text"
                            value={idTitikInput}
                            onChange={(e) => setIdTitikInput(e.target.value)}
                            placeholder="Contoh: T-123"
                            className="w-full mt-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
                            autoFocus
                        />
                        <div className="flex gap-2 pt-3">
                            <button onClick={handleIdTitikCancel} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl">Batal</button>
                            <button onClick={handleIdTitikSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Simpan</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInputField = (field, placeholder, type = 'text', icon = '📝') => (
        <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">{icon}</span>
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
        </div>
    );

    const renderLebarJalanField = () => (
        <div className="relative mb-3 dropdown-container">
            <button
                onClick={() => toggleDropdown('lebarJalan')}
                className="w-full backdrop-blur-sm border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">📏</span>
                    <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-500 font-medium">Lebar Jalan</span>
                        <span className={`text-sm ${(formData.lebarJalan1 || formData.lebarJalan2) ? 'text-black font-semibold' : 'text-gray-600'}`}>
                            {formData.lebarJalan1 || formData.lebarJalan2 ? `J1: ${formData.lebarJalan1 || '-'}m, J2: ${formData.lebarJalan2 || '-'}m` : 'Masukkan Lebar Jalan'}
                        </span>
                    </div>
                </div>
                <ChevronDown size={18} className={`transition-transform duration-300 text-gray-400 group-hover:text-gray-600 ${openDropdowns['lebarJalan'] ? 'rotate-180' : ''}`} />
            </button>

            {openDropdowns['lebarJalan'] && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl z-[9999] p-2">
                    <button onClick={() => selectOption('lebarJalan', '📏 Masukkan Lebar Jalan')} className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 rounded-xl font-medium flex items-center gap-3">
                        <span className="text-lg">📏</span>
                        <span>Masukkan Lebar Jalan</span>
                    </button>
                </div>
            )}

            {showLebarJalanInput && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] p-4">
                    <h4 className="text-sm font-semibold text-gray-800 text-center pb-3 border-b">Masukkan Lebar Jalan (m)</h4>
                    <div className="space-y-3 pt-3">
                        <input type="number" value={lebarJalan1Input} onChange={(e) => setLebarJalan1Input(e.target.value)} placeholder="Lebar Jalan 1" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3" autoFocus />
                        <input type="number" value={lebarJalan2Input} onChange={(e) => setLebarJalan2Input(e.target.value)} placeholder="Lebar Jalan 2 (Opsional)" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3" />
                    </div>
                    <div className="flex gap-2 pt-3">
                        <button onClick={handleLebarJalanCancel} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl">Batal</button>
                        <button onClick={handleLebarJalanSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Simpan</button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderLocationField = () => (
        <div className="mb-3">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-800 font-medium">Titik Koordinat</span>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleRealtimeLocation} className={`p-2 rounded-lg transition-all duration-200 ${isRealtimeEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`} title={isRealtimeEnabled ? 'Matikan real-time' : 'Aktifkan real-time'}>
                            {isRealtimeEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
                        </button>
                        {locationStatus === 'loading' && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>}
                        <MapPin size={18} className={`${locationStatus === 'success' ? 'text-green-500' : locationStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                </div>
                <div className="relative">
                    <input type="text" value={formData.titikKordinat} readOnly placeholder={locationStatus === 'loading' ? 'Mendapatkan lokasi...' : 'Koordinat akan terisi'} className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono cursor-not-allowed ${locationStatus === 'success' ? 'text-green-700 bg-green-50 border-green-200' : locationStatus === 'error' ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-500'}`} />
                    {locationStatus === 'success' && <button onClick={() => setShowMapModal(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600" title="Lihat di peta"><MapPin size={14} /></button>}
                </div>
                <div className="mt-3 space-y-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isRealtimeEnabled && isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span>{isRealtimeEnabled && isWatching ? 'Real-time aktif' : 'Real-time nonaktif'}</span>
                        </div>
                        {!isRealtimeEnabled && <button onClick={refreshLocation} className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">Refresh</button>}
                    </div>
                    {locationAccuracy && <span>Akurasi: ±{Math.round(locationAccuracy)}m</span>}
                    {locationError && <span className="text-red-600">{locationError.message || 'Gagal mendapatkan lokasi'}</span>}
                </div>
            </div>
        </div>
    );

    const renderImageUploadField = (field, label, description) => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <p className="text-xs text-gray-500 mb-3">{description}</p>
                <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" capture={isMobile ? "environment" : undefined} onChange={(e) => handleImageUpload(field, e)} className="hidden" id={`${field}-input`} />
                    <label htmlFor={`${field}-input`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"><Camera size={16} /><span>{isMobile ? 'Ambil Foto' : 'Pilih Foto'}</span></label>
                    {formData[field] && <button onClick={() => handleInputChange(field, null)} className="p-2 bg-red-100 text-red-600 rounded-lg"><X size={16} /></button>}
                </div>
                {formData[field] && <img src={formData[field]} alt="Preview" className="mt-3 rounded-lg w-full h-auto max-h-48 object-cover border" />}
            </div>
        </div>
    );

    const renderGalleryUploadField = (field, label, description) => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <p className="text-xs text-gray-500 mb-3">{description}</p>
                <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(field, e)} className="hidden" id={`${field}-gallery-input`} />
                    <label htmlFor={`${field}-gallery-input`} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700"><Camera size={16} /><span>Buka Galeri</span></label>
                    {formData[field] && <button onClick={() => handleInputChange(field, null)} className="p-2 bg-red-100 text-red-600 rounded-lg"><X size={16} /></button>}
                </div>
                {formData[field] && <img src={formData[field]} alt="Preview" className="mt-3 rounded-lg w-full h-auto max-h-48 object-cover border" />}
            </div>
        </div>
    );

    const dropdownOptions = {
        adaIdTitik: ['Ada', 'Tidak Ada'],
        dataDaya: ['120W', '90W', '60W', '40W'],
        dataTiang: ['7S', '7D', '7SG', '9S', '9D', '9SG'],
        dataRuas: ['Arteri', 'Kolektor'],
        dataRuasSub: ['Titik Nol', 'Kolektor A', 'Kolektor B', 'Wisata'],
        median: ['Ada', 'Tidak Ada'],
        lebarJalan: ['📏 Masukkan Lebar Jalan'],
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <button onClick={onBack} className="p-2 bg-gray-100 rounded-xl"><ArrowLeft size={18} /></button>
                        <h1 className="text-lg font-bold text-gray-800">Survey APJ Propose</h1>
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><span className="text-white">💡</span></div>
                    </div>
                </div>
            </div>

            <div className="px-3 py-4 pb-24 pt-20">
                <div className="max-w-md mx-auto space-y-2">
                    {renderDropdownField('adaIdTitik', 'ID Titik', 'Pilih Status ID Titik', dropdownOptions.adaIdTitik, <Hash />)}
                    {renderDropdownField('dataDaya', 'Daya Lampu', 'Pilih Daya Lampu', dropdownOptions.dataDaya, <Power />)}
                    {renderDropdownField('dataTiang', 'Data Tiang', 'Pilih Data Tiang', dropdownOptions.dataTiang, <TowerControl />)}
                    {renderDropdownField('dataRuas', 'Data Ruas', 'Pilih Data Ruas', dropdownOptions.dataRuas, <Route />)}
                    {formData.dataRuas === 'Kolektor' && (
                        <div className="pl-4 border-l-2 border-blue-200">
                            {renderDropdownField('dataRuasSub', 'Sub Ruas', 'Pilih Sub Ruas', dropdownOptions.dataRuasSub, <Route />)}
                        </div>
                    )}
                    {renderInputField('jarakAntarTiang', 'Jarak Antar Tiang (m)', 'number', '↔️')}
                    {renderDropdownField('median', 'Median', 'Pilih Status Median', dropdownOptions.median, <Construction />)}
                    
                    {renderLocationField()}
                    {renderLebarJalanField()}
                    
                    {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'number', '↔️')}
                    {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'number', '↔️')}
                    {renderInputField('lainnyaBertiang', 'Lainnya Bertiang', 'text', '↔️')}

                    {renderImageUploadField('fotoTitikAktual', 'Foto Titik Aktual', 'Ambil foto kondisi aktual titik yang akan dipasang APJ.')}
                    {renderGalleryUploadField('fotoKemerataan', 'Foto Kemerataan', 'Ambil dari galeri untuk dokumentasi kemerataan pencahayaan.')}

                    <textarea value={formData.keterangan} onChange={(e) => handleInputChange('keterangan', e.target.value)} placeholder="Keterangan Tambahan" rows={3} className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600" />

                    <div className="pt-4">
                        <button onClick={handleSubmit} disabled={isSubmitting} className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600'}`}>
                            <Save size={18} />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Survey'}
                        </button>
                    </div>
                </div>
            </div>

            {showMapModal && formData.titikKordinat && <MiniMapsComponent isOpen={showMapModal} onClose={() => setShowMapModal(false)} currentLocation={formData.titikKordinat} />}
            <ModernAlertModal isVisible={alertModal.isVisible} onClose={closeAlert} type={alertModal.type} title={alertModal.title} message={alertModal.message} autoClose={alertModal.type === 'success'} />
        </div>
    );
};

export default SurveyAPJProposePage;

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Save, MapPin, X, Zap, ZapOff } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { createSurveyNotificationFromFirestore } from '../../lib/notification-helper';
import usePageTitle from '../../hooks/usePageTitle';
import useRealtimeLocation from '../../hooks/useRealtimeLocation';
import MiniMapsComponent from '../MiniMapsComponentLazy';

const SurveyTiangAPJNewPage = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
    const [formData, setFormData] = useState({
        namaJalan: '',
        jarakAntarTiang: '',
        titikKordinat: '',
        lebarJalan1: '',
        lebarJalan2: '',
        lebarBahuBertiang: '',
        lebarTrotoarBertiang: '',
        lainnyaBertiang: '',
        fotoTitikAktual: null,
        keterangan: ''
    });

    // Set page title
    usePageTitle('Survey Tiang APJ New - Sistem Manajemen');

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

    // Update coordinates when real-time location changes
    useEffect(() => {
        if (realtimeLocation && isRealtimeEnabled) {
            const coords = `${realtimeLocation.lat.toFixed(6)}, ${realtimeLocation.lon.toFixed(6)}`;
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
            const coords = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
            setFormData(prev => ({
                ...prev,
                titikKordinat: coords
            }));
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

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

    const handleImageUpload = (field, event) => {
        const file = event.target.files[0];
        if (file) {
            // Konversi gambar ke WebP format dengan resize
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Set ukuran canvas sesuai dengan gambar, dengan resize jika terlalu besar
                const maxWidth = 1920;
                const maxHeight = 1080;
                let { width, height } = img;
                
                // Resize jika gambar terlalu besar
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Gambar ke canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Konversi ke WebP dengan kualitas 0.8 (80%)
                const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
                
                setFormData(prev => ({
                    ...prev,
                    [field]: webpDataUrl
                }));
            };
            
            // Load gambar dari file
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    // Diganti helper uploadWebpDataUrlToStorage

    const handleSubmit = async () => {
        if (!user) {
            alert('Anda harus login terlebih dahulu!');
            return;
        }

        // Validasi form
        if (!formData.namaJalan) {
            alert('Mohon isi Nama Jalan!');
            return;
        }

        setIsSubmitting(true);

        try {
            // Siapkan data dasar, buat dokumen dulu
            const surveyData = {
                // Data form
                namaJalan: formData.namaJalan,
                jarakAntarTiang: formData.jarakAntarTiang,
                titikKordinat: formData.titikKordinat,
                lebarJalan1: formData.lebarJalan1,
                lebarJalan2: formData.lebarJalan2,
                lebarBahuBertiang: formData.lebarBahuBertiang,
                lebarTrotoarBertiang: formData.lebarTrotoarBertiang,
                lainnyaBertiang: formData.lainnyaBertiang,
                keterangan: formData.keterangan,
                
                // URL foto (diupdate setelah upload)
                fotoTitikAktual: null,
                
                // Metadata
                surveyType: 'Survey Tiang APJ New',
                surveyCategory: 'tiang_apj_new',
                projectTitle: `Survey Tiang APJ New - ${formData.namaJalan}`,
                projectLocation: formData.namaJalan,
                projectDate: new Date().toISOString().split('T')[0],
                surveyorName: user.displayName || user.email,
                surveyorEmail: user.email,
                userId: user.uid,
                
                // Status
                status: 'pending',
                isValidated: false,
                
                // Timestamps
                createdAt: serverTimestamp(),
                modifiedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'survey-reports'), surveyData);

            // Upload foto via API route helper: survey-tiang-apj-new/{userId}/{docId}/
            let fotoTitikAktualUrl = null;
            if (formData.fotoTitikAktual) {
                try {
                    const result = await smartPhotoUpload(
                        formData.fotoTitikAktual,
                        'survey-tiang-apj-new',
                        user.uid,
                        docRef.id,
                        'foto_titik_aktual'
                    );
                    if (result.success) {
                        fotoTitikAktualUrl = result.downloadURL;
                        await updateDoc(doc(db, 'survey-reports', docRef.id), {
                            fotoTitikAktual: fotoTitikAktualUrl,
                            updatedAt: serverTimestamp(),
                        });
                    } else {
                        console.error('Upload foto_titik_aktual gagal:', result.error);
                    }
                } catch (e) {
                    console.error('Error saat upload foto_titik_aktual:', e);
                }
            }
            
            console.log('Survey Tiang APJ New berhasil disimpan dengan ID:', docRef.id);
            
            // Buat notifikasi untuk admin
            try {
                await createSurveyNotificationFromFirestore(docRef.id, surveyData);
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Don't fail the survey creation if notification fails
            }
            
            // Reset form dan get location lagi
            setFormData({
                namaJalan: '',
                jarakAntarTiang: '',
                titikKordinat: '',
                lebarJalan1: '',
                lebarJalan2: '',
                lebarBahuBertiang: '',
                lebarTrotoarBertiang: '',
                lainnyaBertiang: '',
                fotoTitikAktual: null,
                keterangan: ''
            });
            
            // Get location lagi setelah reset
            getCurrentLocation();
            
            alert('Data Survey Tiang APJ New berhasil disimpan!');
            
        } catch (error) {
            console.error('Error menyimpan survey:', error);
            alert('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInputField = (field, label, placeholder, type = 'text') => (
        <div className="mb-4">
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl px-5 py-4 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium"
            />
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

    const renderImageUploadField = (field, label) => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-800 font-medium">{label}</span>
                    <Camera size={20} className="text-gray-400" />
                </div>
                
                {formData[field] ? (
                    <div className="relative">
                        <img 
                            src={formData[field]} 
                            alt={label}
                            className="w-full h-32 object-cover rounded-xl border border-gray-200"
                        />
                        <label className="absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors duration-200 shadow-lg">
                            <Camera size={16} />
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handleImageUpload(field, e)}
                                className="hidden"
                            />
                        </label>
                    </div>
                ) : (
                    <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group">
                        <Camera size={32} className="mx-auto text-gray-400 mb-2 group-hover:text-blue-500 transition-colors duration-300" />
                        <span className="text-gray-500 group-hover:text-blue-600 font-medium">Tap untuk ambil foto</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleImageUpload(field, e)}
                            className="hidden"
                        />
                    </label>
                )}
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
                                Survey Tiang APJ New
                            </h1>
                        </div>
                        
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg">🆕</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="px-6 py-8 pb-24">
                <div className="max-w-md mx-auto space-y-1">
                    {/* Input Fields sesuai gambar */}
                    {renderInputField('namaJalan', 'Nama Jalan', 'Nama Jalan')}
                    {renderInputField('jarakAntarTiang', 'Jarak Antar Tiang', 'Jarak Antar Tiang', 'number')}
                    {renderLocationField()}
                    {renderInputField('lebarJalan1', 'Lebar Jalan 1 (m)', 'Lebar Jalan 1 (m)', 'number')}
                    {renderInputField('lebarJalan2', 'Lebar Jalan 2 (m)', 'Lebar Jalan 2 (m)', 'number')}
                    {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'Lebar Bahu Bertiang (m)', 'number')}
                    {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'Lebar Trotoar Bertiang (m)', 'number')}
                    {renderInputField('lainnyaBertiang', 'Lainnya Bertiang', 'Lainnya Bertiang')}
                    
                    {/* Image Upload Field */}
                    {renderImageUploadField('fotoTitikAktual', 'Foto Titik Aktual')}
                    
                    {/* Keterangan Field */}
                    <div className="mb-6">
                        <textarea
                            value={formData.keterangan}
                            onChange={(e) => handleInputChange('keterangan', e.target.value)}
                            placeholder="Keterangan"
                            rows={4}
                            className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl px-5 py-4 text-black placeholder-gray-600 hover:border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 font-medium resize-none"
                        />
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
                                        alert('Koordinat berhasil disalin!');
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

            {/* Floating Submit Button */}
            <div className="fixed bottom-6 left-6 right-6 z-50">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full font-bold py-4 px-6 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 ${
                        isSubmitting 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:shadow-3xl hover:from-green-600 hover:to-green-700 transform hover:-translate-y-1 active:scale-95'
                    } text-white`}
                >
                    <Save size={20} />
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
            </div>

            {/* Mini Maps Component - Always show if task is active */}
            <MiniMapsComponent 
                userId={user?.uid} 
                taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
            />
        </div>
    );
};

export default SurveyTiangAPJNewPage;

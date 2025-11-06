import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import MiniMapsComponent from '../MiniMapsComponent';

const SurveyTrafoPage = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationStatus, setLocationStatus] = useState('loading'); // loading, success, error
    const [locationError, setLocationError] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dropdownOptions, setDropdownOptions] = useState({
        kepemilikanTiang: [],
        jenisTiang: []
    });
    const [formData, setFormData] = useState({
        kepemilikanTiang: 'PLN', // Default PLN sesuai permintaan
        jenisTiang: '',
        titikKordinat: '',
        fotoTitikAktual: null,
        keterangan: ''
    });

    const [openDropdowns, setOpenDropdowns] = useState({});

    // Get current location on component mount
    useEffect(() => {
        getCurrentLocation();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    const getCurrentLocation = () => {
        setLocationStatus('loading');
        setLocationError('');

        if (!navigator.geolocation) {
            setLocationError('Geolocation tidak didukung oleh browser ini');
            setLocationStatus('error');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const koordinat = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                
                setFormData(prev => ({
                    ...prev,
                    titikKordinat: koordinat
                }));
                setLocationStatus('success');
            },
            (error) => {
                let errorMessage = '';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Akses lokasi ditolak oleh pengguna';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Informasi lokasi tidak tersedia';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Permintaan lokasi timeout';
                        break;
                    default:
                        errorMessage = 'Terjadi kesalahan yang tidak diketahui';
                        break;
                }
                setLocationError(errorMessage);
                setLocationStatus('error');
            },
            options
        );
    };

    const refreshLocation = () => {
        getCurrentLocation();
    };

    // Load dropdown data on component mount
    useEffect(() => {
        const loadDropdownData = async () => {
            try {
                // Set default dropdown options
                const defaultOptions = {
                    kepemilikanTiang: ['PLN'], // Hanya PLN sesuai permintaan
                    jenisTiang: ['Single', 'Double']
                };
                
                setDropdownOptions(defaultOptions);
                setIsLoadingData(false);
            } catch (error) {
                console.error('Error loading dropdown data:', error);
                // Set fallback options if loading fails
                setDropdownOptions({
                    kepemilikanTiang: ['PLN'],
                    jenisTiang: ['Single', 'Double']
                });
                setIsLoadingData(false);
            }
        };

        loadDropdownData();
    }, []);

    const toggleDropdown = (field) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const selectOption = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setOpenDropdowns(prev => ({
            ...prev,
            [field]: false
        }));
    };

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
        if (!formData.jenisTiang) {
            alert('Mohon isi Jenis Tiang!');
            return;
        }

        setIsSubmitting(true);

        try {
            // Siapkan data dasar, buat dokumen dulu
            const surveyData = {
                // Data form
                kepemilikanTiang: formData.kepemilikanTiang,
                jenisTiang: formData.jenisTiang,
                titikKordinat: formData.titikKordinat,
                keterangan: formData.keterangan,
                
                // URL foto (diupdate setelah upload)
                fotoTitikAktual: null,
                
                // Metadata
                surveyType: 'Survey Trafo',
                surveyCategory: 'survey_trafo',
                projectTitle: `Survey Trafo - ${formData.kepemilikanTiang} - ${formData.jenisTiang}`,
                projectLocation: formData.titikKordinat,
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

            // Upload foto via API route (logika yang sama dengan Survey Existing)
            if (formData.fotoTitikAktual) {
                const uploadRes = await smartPhotoUpload(
                    formData.fotoTitikAktual,
                    'petugas-photos',
                    user.uid,
                    docRef.id,
                    'foto_titik_aktual'
                );

                if (!uploadRes.success) {
                    throw new Error(uploadRes.error || 'Upload foto gagal');
                }

                await updateDoc(doc(db, 'survey-reports', docRef.id), {
                    fotoTitikAktual: uploadRes.downloadURL,
                    updatedAt: serverTimestamp(),
                });
            }
            
            console.log('Survey Trafo berhasil disimpan dengan ID:', docRef.id);
            
            // Reset form dan get location lagi
            setFormData({
                kepemilikanTiang: 'PLN',
                jenisTiang: '',
                titikKordinat: '',
                fotoTitikAktual: null,
                keterangan: ''
            });
            
            // Get location lagi setelah reset
            getCurrentLocation();
            
            alert('Data Survey Trafo berhasil disimpan!');
            
        } catch (error) {
            console.error('Error menyimpan survey:', error);
            alert('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDropdownField = (field, label, placeholder = `Pilih ${label}`) => {
        const isFieldLoading = isLoadingData || !dropdownOptions[field] || dropdownOptions[field].length === 0;
        
        return (
            <div className="relative mb-4">
                <button
                    onClick={() => !isFieldLoading && toggleDropdown(field)}
                    disabled={isFieldLoading}
                    className={`w-full backdrop-blur-sm border rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all duration-300 group ${
                        isFieldLoading 
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                            : 'bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                    <span className={`${
                        isFieldLoading 
                            ? 'text-gray-400' 
                            : formData[field] 
                                ? 'text-black font-medium' 
                                : 'text-gray-600'
                    }`}>
                        {isFieldLoading 
                            ? 'Memuat data...' 
                            : formData[field] || placeholder
                        }
                    </span>
                    {isFieldLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-500"></div>
                    ) : (
                        <ChevronDown 
                            size={20} 
                            className={`transition-transform duration-300 text-gray-400 group-hover:text-gray-600 ${openDropdowns[field] ? 'rotate-180' : ''}`} 
                        />
                    )}
                </button>
                
                {openDropdowns[field] && !isFieldLoading && dropdownOptions[field] && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        {dropdownOptions[field].map((option, index) => (
                            <button
                                key={option}
                                onClick={() => selectOption(field, option)}
                                className="w-full px-5 py-4 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 border-b border-gray-100 last:border-b-0 font-medium"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderLocationField = () => (
        <div className="mb-4">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-800 font-medium">Titik Koordinat</span>
                    <div className="flex items-center gap-2">
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
                
                {locationStatus === 'error' && (
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-red-600">{locationError}</span>
                        <button
                            onClick={refreshLocation}
                            className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors duration-200"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}
                
                {locationStatus === 'success' && (
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Lokasi berhasil didapatkan
                    </div>
                )}
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
                            onChange={(e) => handleImageUpload(field, e)}
                            className="hidden"
                        />
                    </label>
                )}
            </div>
        </div>
    );

    // Show loading screen while data is being loaded
    if (isLoadingData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Memuat data...</p>
                </div>
            </div>
        );
    }

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
                                Survey Trafo
                            </h1>
                        </div>
                        
                        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg">⚡</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content - Urutan sesuai gambar */}
            <div className="px-6 py-8 pb-24">
                <div className="max-w-md mx-auto space-y-1">
                    {/* Fields sesuai urutan gambar */}
                    {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang (PLN)')}
                    {renderDropdownField('jenisTiang', 'Jenis Tiang (Single, Double)')}
                    {renderLocationField()}
                    
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
                previewPoint={(function(){
                    try {
                        if (!formData?.titikKordinat) return null;
                        const parts = String(formData.titikKordinat).split(',');
                        if (parts.length !== 2) return null;
                        const lat = parseFloat(parts[0]);
                        const lng = parseFloat(parts[1]);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        return { lat, lng };
                    } catch (_) { return null; }
                })()}
            />
        </div>
    );
};

export default SurveyTrafoPage;

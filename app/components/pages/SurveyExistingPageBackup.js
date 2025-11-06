import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';

// Lazy load MiniMapsComponent
const MiniMapsComponent = lazy(() => import('../MiniMapsComponent'));

const SurveyExistingPageBackup = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [locationError, setLocationError] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    
    const [formData, setFormData] = useState({
        namaJalan: '',
        namaGang: '',
        kepemilikanTiang: '',
        jenisTiang: '',
        trafo: '',
        lampu: '',
        titikKordinat: '',
        fotoTinggiARM: null,
        fotoTitikAktual: null,
        keterangan: ''
    });

    const [openDropdowns, setOpenDropdowns] = useState({});

    // Set page title
    usePageTitle('Survey Existing - Sistem Manajemen');

    // Memoize dropdown options
    const dropdownOptions = useMemo(() => ({
        kepemilikanTiang: ['PLN', 'Pemda', 'Swasta', 'Lainnya'],
        jenisTiang: ['Beton', 'Besi', 'Kayu', 'Lainnya'],
        trafo: ['Ada', 'Tidak Ada'],
        lampu: ['Ada', 'Tidak Ada']
    }), []);

    // Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setOpenDropdowns({});
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Location function
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Geolokasi tidak didukung');
            return;
        }

        setLocationStatus('loading');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    titikKordinat: `${latitude}, ${longitude}`
                }));
                setLocationStatus('success');
                setLocationError('');
            },
            (error) => {
                setLocationStatus('error');
                setLocationError('Gagal mendapatkan lokasi');
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }, []);

    // Get current location on component mount
    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);

    // Form handlers
    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const toggleDropdown = useCallback((field) => {
        setOpenDropdowns(prev => ({ ...prev, [field]: !prev[field] }));
    }, []);

    const selectOption = useCallback((field, value) => {
        handleFormChange(field, value);
        setOpenDropdowns(prev => ({ ...prev, [field]: false }));
    }, [handleFormChange]);

    // Image processing
    const processImage = useCallback((file) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const maxSize = 1200;
                let { width, height } = img;
                
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(webpDataUrl);
            };
            
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleImageUpload = useCallback(async (field, event) => {
        const file = event.target.files[0];
        if (file && file.size <= 5 * 1024 * 1024) {
            try {
                const webpDataUrl = await processImage(file);
                setFormData(prev => ({ ...prev, [field]: webpDataUrl }));
            } catch (error) {
                alert('Gagal memproses gambar');
            }
        } else {
            alert('File terlalu besar. Maksimal 5MB.');
        }
    }, [processImage]);

    // Form submission
    const handleSubmit = useCallback(async () => {
        if (!user || !formData.namaJalan || !formData.titikKordinat) {
            alert('Mohon lengkapi data yang diperlukan');
            return;
        }

        setIsSubmitting(true);

        try {
            const surveyData = {
                ...formData,
                surveyorId: user.uid,
                surveyorName: user.displayName || user.email,
                surveyType: 'Survey_Existing',
                createdAt: serverTimestamp(),
                status: 'pending'
            };

            const docRef = await addDoc(collection(db, 'surveys'), surveyData);

            // Upload photos
            if (formData.fotoTinggiARM) {
                await smartPhotoUpload(
                    formData.fotoTinggiARM,
                    'Survey_Existing',
                    user.uid,
                    docRef.id,
                    'foto_tinggi_arm'
                );
            }

            if (formData.fotoTitikAktual) {
                await smartPhotoUpload(
                    formData.fotoTitikAktual,
                    'Survey_Existing',
                    user.uid,
                    docRef.id,
                    'foto_titik_aktual'
                );
            }

            alert('Survey berhasil disimpan!');
            
            // Reset form
            setFormData({
                namaJalan: '',
                namaGang: '',
                kepemilikanTiang: '',
                jenisTiang: '',
                trafo: '',
                lampu: '',
                titikKordinat: '',
                fotoTinggiARM: null,
                fotoTitikAktual: null,
                keterangan: ''
            });
            
            getCurrentLocation();

        } catch (error) {
            alert('Gagal menyimpan survey');
        } finally {
            setIsSubmitting(false);
        }
    }, [user, formData, getCurrentLocation]);

    // Render functions
    const renderDropdownField = useCallback((field, label) => (
        <div className="relative mb-4 dropdown-container">
            <button
                onClick={() => toggleDropdown(field)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-left flex items-center justify-between"
            >
                <span className="text-sm">{formData[field] || `Pilih ${label}`}</span>
                <ChevronDown size={16} className="text-gray-400" />
            </button>
            
            {openDropdowns[field] && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {dropdownOptions[field]?.map((option) => (
                        <button
                            key={option}
                            onClick={() => selectOption(field, option)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    ), [formData, openDropdowns, dropdownOptions, toggleDropdown, selectOption]);

    const renderInputField = useCallback((field, label, placeholder, type = 'text') => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleFormChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    ), [formData, handleFormChange]);

    const renderPhotoUpload = useCallback((field, label) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            
            {formData[field] ? (
                <div className="relative">
                    <img 
                        src={formData[field]} 
                        alt={label}
                        className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                        onClick={() => handleFormChange(field, null)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center cursor-pointer">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(field, e)}
                        className="hidden"
                    />
                    <Camera size={20} className="mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Upload foto</span>
                </label>
            )}
        </div>
    ), [formData, handleFormChange, handleImageUpload]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    
                    <h1 className="text-lg font-bold text-gray-800">Survey Existing</h1>
                    
                    <button
                        onClick={() => setShowMapModal(true)}
                        className="p-2 bg-green-500 text-white rounded-lg"
                    >
                        <MapPin size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-6 space-y-6">
                {/* Location Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-green-800">📍 Titik Koordinat</span>
                        <button
                            onClick={getCurrentLocation}
                            className="bg-green-500 text-white p-2 rounded-full"
                        >
                            <MapPin size={16} />
                        </button>
                    </div>
                    
                    <input
                        type="text"
                        value={formData.titikKordinat}
                        readOnly
                        className="w-full px-3 py-2 bg-green-100 border border-green-200 rounded text-green-800 text-sm"
                        placeholder="Koordinat akan muncul di sini..."
                    />
                    
                    {locationStatus === 'loading' && <p className="text-xs text-green-600 mt-2">🔄 Mendapatkan lokasi...</p>}
                    {locationStatus === 'success' && <p className="text-xs text-green-600 mt-2">✅ Lokasi berhasil didapatkan</p>}
                    {locationStatus === 'error' && <p className="text-xs text-red-600 mt-2">❌ {locationError}</p>}
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📋 Informasi Dasar</h2>
                    {renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan')}
                    {renderInputField('namaGang', 'Nama Gang (opsional)', 'Masukkan nama gang')}
                </div>

                {/* Infrastructure */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">🏗️ Infrastruktur</h2>
                    {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
                    {renderDropdownField('jenisTiang', 'Jenis Tiang')}
                    {renderDropdownField('trafo', 'Trafo')}
                    {renderDropdownField('lampu', 'Lampu')}
                </div>

                {/* Photos */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📸 Dokumentasi Foto</h2>
                    {renderPhotoUpload('fotoTinggiARM', 'Foto Tinggi ARM')}
                    {renderPhotoUpload('fotoTitikAktual', 'Foto Titik Aktual')}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📝 Catatan</h2>
                    {renderInputField('keterangan', 'Keterangan', 'Tambahkan catatan tambahan (opsional)')}
                </div>
            </div>

            {/* Submit Button */}
            <div className="pb-6 px-4">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-green-500 text-white py-4 px-6 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Survey Existing'}
                </button>
            </div>

            {/* Map Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full h-96 relative">
                        <button
                            onClick={() => setShowMapModal(false)}
                            className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-lg"
                        >
                            <X size={20} />
                        </button>
                        
                        <Suspense fallback={
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Memuat peta...</p>
                                </div>
                            </div>
                        }>
                            <MiniMapsComponent
                                onLocationSelect={(lat, lng) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        titikKordinat: `${lat}, ${lng}`
                                    }));
                                    setLocationStatus('success');
                                    setLocationError('');
                                    setShowMapModal(false);
                                }}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurveyExistingPageBackup;




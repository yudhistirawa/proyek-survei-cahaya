import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';

// Lazy load MiniMapsComponent untuk mengurangi bundle size
const MiniMapsComponent = lazy(() => import('../MiniMapsComponent'));

const SurveyExistingPageOriginal = ({ onBack }) => {
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
        jenisTiangPLN: '',
        trafo: '',
        jenisTrafo: '',
        tinggiBawahTrafo: '',
        tinggiBatasR: '',
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
    const [tinggiAtasInput, setTinggiAtasInput] = useState('');

    const [showLampuCountOptions, setShowLampuCountOptions] = useState(false);
    const [showLampuTypeOptions, setShowLampuTypeOptions] = useState(false);
    const [showLebarJalanInput, setShowLebarJalanInput] = useState(false);
    const [lebarJalan1Input, setLebarJalan1Input] = useState('');
    const [lebarJalan2Input, setLebarJalan2Input] = useState('');

    // Set page title
    usePageTitle('Survey Existing - Sistem Manajemen');

    // Memoize dropdown options
    const dropdownOptions = useMemo(() => ({
        kepemilikanTiang: ['PLN', 'Pemda', 'Swasta', 'Lainnya'],
        jenisTiang: ['Beton', 'Besi', 'Kayu', 'Lainnya'],
        trafo: ['Ada', 'Tidak Ada'],
        lampu: ['Ada', 'Tidak Ada'],
        jumlahLampu: ['1', '2', '3', '4', '5', '6+'],
        jenisLampu: ['LED', 'Pijar', 'Neon', 'Lainnya']
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
                setShowPLNSubOptions(false);
                setShowTrafoSubOptions(false);
                setShowNamaJalanInput(false);
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

    // Optimized location function
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Geolokasi tidak didukung di browser ini');
            return;
        }

        setLocationStatus('loading');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coordinates = `${latitude}, ${longitude}`;
                
                setFormData(prev => ({
                    ...prev,
                    titikKordinat: coordinates
                }));
                
                setLocationStatus('success');
                setLocationError('');
            },
            (error) => {
                console.error('Error getting location:', error);
                setLocationStatus('error');
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Izin lokasi ditolak. Silakan izinkan akses lokasi.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Informasi lokasi tidak tersedia.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Waktu permintaan lokasi habis.');
                        break;
                    default:
                        setLocationError('Terjadi kesalahan saat mendapatkan lokasi.');
                }
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
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            
            if (field === 'trafo' && value === 'Tidak Ada') {
                newData.jenisTrafo = '';
                newData.tinggiBawahTrafo = '';
                newData.tinggiBatasR = '';
            }
            
            if (field === 'kepemilikanTiang' && value !== 'PLN') {
                newData.jenisTiangPLN = '';
            }
            
            return newData;
        });
    }, []);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const toggleDropdown = useCallback((field) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, []);

    const selectOption = useCallback((field, value) => {
        handleFormChange(field, value);
        setOpenDropdowns(prev => ({ ...prev, [field]: false }));
    }, [handleFormChange]);

    // Image processing
    const processImage = useCallback((file, maxWidth = 1200, maxHeight = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const webpDataUrl = canvas.toDataURL('image/webp', quality);
                resolve(webpDataUrl);
            };
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleImageUpload = useCallback(async (field, event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Ukuran file terlalu besar. Maksimal 5MB.');
                    return;
                }
                
                const webpDataUrl = await processImage(file, 1200, 800, 0.7);
                setFormData(prev => ({
                    ...prev,
                    [field]: webpDataUrl
                }));
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Gagal memproses gambar. Silakan coba lagi.');
            }
        }
    }, [processImage]);

    // Form submission
    const handleSubmit = useCallback(async () => {
        if (!user) {
            alert('Anda harus login terlebih dahulu!');
            return;
        }

        if (!formData.namaJalan) {
            alert('Mohon isi Nama Jalan!');
            return;
        }

        if (!formData.titikKordinat) {
            alert('Mohon dapatkan lokasi terlebih dahulu!');
            return;
        }

        setIsSubmitting(true);

        try {
            const surveyData = {
                namaJalan: formData.namaJalan,
                namaGang: formData.namaGang,
                kepemilikanTiang: formData.kepemilikanTiang,
                jenisTiang: formData.jenisTiang,
                jenisTiangPLN: formData.jenisTiangPLN,
                trafo: formData.trafo,
                jenisTrafo: formData.jenisTrafo,
                tinggiBawahTrafo: formData.tinggiBawahTrafo,
                tinggiBatasR: formData.tinggiBatasR,
                lampu: formData.lampu,
                jumlahLampu: formData.jumlahLampu,
                jenisLampu: formData.jenisLampu,
                titikKordinat: formData.titikKordinat,
                lebarJalan1: formData.lebarJalan1,
                lebarJalan2: formData.lebarJalan2,
                lebarBahuBertiang: formData.lebarBahuBertiang,
                lebarTrotoarBertiang: formData.lebarTrotoarBertiang,
                lainnyaBertiang: formData.lainnyaBertiang,
                tinggiARM: formData.tinggiARM,
                keterangan: formData.keterangan,
                surveyorId: user.uid,
                surveyorName: user.displayName || user.email,
                surveyType: 'Survey_Existing',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'pending',
                validationStatus: 'pending'
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

            alert('Data Survey Existing berhasil disimpan dengan foto!');
            
            // Reset form
            setFormData({
                namaJalan: '',
                namaGang: '',
                kepemilikanTiang: '',
                jenisTiang: '',
                jenisTiangPLN: '',
                trafo: '',
                jenisTrafo: '',
                tinggiBawahTrafo: '',
                tinggiBatasR: '',
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
                tinggiARM: ''
            });
            
            getCurrentLocation();

        } catch (error) {
            console.error('Error:', error);
            alert('Gagal menyimpan survey existing');
        } finally {
            setIsSubmitting(false);
        }
    }, [user, formData, getCurrentLocation]);

    // Render functions
    const renderDropdownField = useCallback((field, label, placeholder = `Pilih ${label}`) => {
        const isDisabled = field === 'jenisTrafo' && formData.trafo === 'Tidak Ada';
        
        const getDisplayValue = () => {
            if (field === 'kepemilikanTiang' && formData.kepemilikanTiang === 'PLN' && formData.jenisTiangPLN) {
                return `PLN - ${formData.jenisTiangPLN}`;
            }
            if (field === 'trafo' && formData.trafo === 'Ada' && formData.jenisTrafo) {
                const heightInfo = formData.tinggiBawahTrafo && formData.tinggiBatasR 
                    ? ` (${formData.tinggiBawahTrafo}m - ${formData.tinggiBatasR}m)`
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
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <span className="text-lg">{getDisplayIcon()}</span>
                                    <span>{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [formData, openDropdowns, dropdownOptions, toggleDropdown, selectOption]);

    const renderInputField = useCallback((field, label, placeholder, type = 'text', icon = '📝') => (
        <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
        </div>
    ), [formData, handleInputChange]);

    const renderPhotoUpload = useCallback((field, label, icon) => (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            
            {formData[field] ? (
                <div className="relative">
                    <img 
                        src={formData[field]} 
                        alt={label}
                        className="w-full h-32 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                        onClick={() => handleInputChange(field, null)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors duration-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <label className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer text-center">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(field, e)}
                        className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                        <Camera size={24} className="text-gray-400" />
                        <span className="text-sm text-gray-600">Klik untuk upload foto</span>
                        <span className="text-xs text-gray-500">Max 5MB, akan dikonversi ke WebP</span>
                    </div>
                </label>
            )}
        </div>
    ), [formData, handleInputChange, handleImageUpload]);

    const renderLocationSection = useCallback(() => (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MapPin size={20} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Titik Koordinat</span>
                </div>
                <button
                    onClick={getCurrentLocation}
                    className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors duration-200"
                >
                    <MapPin size={16} />
                </button>
            </div>
            
            <input
                type="text"
                value={formData.titikKordinat}
                readOnly
                className="w-full px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-green-800 text-sm font-mono"
                placeholder="Koordinat akan muncul di sini..."
            />
            
            {locationStatus === 'loading' && (
                <p className="text-xs text-green-600 mt-2">🔄 Mendapatkan lokasi...</p>
            )}
            {locationStatus === 'success' && (
                <p className="text-xs text-green-600 mt-2">✅ Lokasi berhasil didapatkan</p>
            )}
            {locationStatus === 'error' && (
                <p className="text-xs text-red-600 mt-2">❌ {locationError}</p>
            )}
        </div>
    ), [formData.titikKordinat, locationStatus, locationError, getCurrentLocation]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    
                    <h1 className="text-lg font-bold text-gray-800">Survey Existing</h1>
                    
                    <button
                        onClick={() => setShowMapModal(true)}
                        className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors duration-200"
                    >
                        <MapPin size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-6 space-y-6">
                {/* Location Section */}
                {renderLocationSection()}

                {/* Basic Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📋 Informasi Dasar</h2>
                    {renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan', 'text', '🛣️')}
                    {renderInputField('namaGang', 'Nama Gang', 'Masukkan nama gang (opsional)', 'text', '🏘️')}
                </div>

                {/* Infrastructure */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">🏗️ Infrastruktur</h2>
                    {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
                    {renderDropdownField('jenisTiang', 'Jenis Tiang')}
                    {renderDropdownField('trafo', 'Trafo')}
                    {renderDropdownField('lampu', 'Lampu')}
                </div>

                {/* Measurements */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📏 Pengukuran</h2>
                    {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', '0.00', 'number', '📏')}
                    {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', '0.00', 'number', '🚶')}
                    {renderInputField('tinggiARM', 'Tinggi ARM (m)', '0.00', 'number', '📐')}
                </div>

                {/* Photos */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📸 Dokumentasi Foto</h2>
                    {renderPhotoUpload('fotoTinggiARM', 'Foto Tinggi ARM', '📸')}
                    {renderPhotoUpload('fotoTitikAktual', 'Foto Titik Aktual', '📷')}
                </div>

                {/* Notes */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">📝 Catatan</h2>
                    {renderInputField('keterangan', 'Keterangan', 'Tambahkan catatan tambahan (opsional)', 'textarea', '📝')}
                    
                    {/* Submit Button - Right after Keterangan Field */}
                    <div className="mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-green-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
                        >
                            <Save size={20} />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Survey Existing'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Submit Button - Removed to prevent always-following behavior */}

            {/* Bottom Submit Button - Moved to right after Keterangan Field */}

            {/* Map Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-96 relative">
                        <button
                            onClick={() => setShowMapModal(false)}
                            className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                            <X size={20} />
                        </button>
                        
                        <Suspense fallback={
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Memuat peta...</p>
                                </div>
                            </div>
                        }>
                            <MiniMapsComponent
                                onLocationSelect={(lat, lng) => {
                                    const coordinates = `${lat}, ${lng}`;
                                    setFormData(prev => ({
                                        ...prev,
                                        titikKordinat: coordinates
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

export default SurveyExistingPageOriginal;



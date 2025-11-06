import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';
import SuccessAlertModal from '../modals/SuccessAlertModal';

// Lazy load MiniMapsComponent untuk mengurangi bundle size
const MiniMapsComponent = lazy(() => import('../MiniMapsComponent'));

const SurveyExistingPageMobile = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [locationError, setLocationError] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [activeSection, setActiveSection] = useState('location'); // location, basic, infra, photos, submit
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
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
    usePageTitle('Survey Existing - Mobile');

    // Memoize dropdown options
    const dropdownOptions = useMemo(() => ({
        kepemilikanTiang: ['PLN', 'Pemda', 'Swasta'],
        jenisTiang: ['Beton', 'Besi', 'Kayu'],
        trafo: ['Ada', 'Tidak Ada'],
        lampu: ['Ada', 'Tidak Ada']
    }), []);

    // Get current location
    useEffect(() => {
        getCurrentLocation();
    }, []);

    // Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Optimized location function
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

    // Optimized form handlers
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

    // Enhanced mobile image processing with Android/iOS compatibility
    const processImage = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // Enhanced error handling for mobile devices
            img.onerror = () => {
                console.error('❌ Mobile: Failed to load image');
                reject(new Error('Gagal memuat gambar'));
            };
            
            img.onload = () => {
                try {
                    // Mobile-optimized sizing with device detection
                    const isAndroid = /Android/i.test(navigator.userAgent);
                    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                    
                    // Different max sizes for different devices
                    let maxSize = 1024; // Default
                    if (isAndroid) {
                        maxSize = 900; // Smaller for Android memory management
                    } else if (isIOS) {
                        maxSize = 1200; // iOS can handle larger images
                    }
                    
                    let { width, height } = img;
                    console.log('📱 Original image size:', width, 'x', height);
                    
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                        console.log('📱 Resized to:', width, 'x', height);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Clear canvas for Android compatibility
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Device-specific WebP quality
                    let quality = 0.7; // Default
                    if (isAndroid) {
                        quality = 0.6; // Lower quality for Android to reduce size
                    } else if (isIOS) {
                        quality = 0.75; // iOS can handle better quality
                    }
                    
                    console.log('📱 Converting to WebP with quality:', quality);
                    const webpDataUrl = canvas.toDataURL('image/webp', quality);
                    
                    // Validate result
                    if (!webpDataUrl || webpDataUrl === 'data:,') {
                        throw new Error('WebP conversion failed');
                    }
                    
                    console.log('✅ Mobile: WebP conversion successful, size:', Math.round(webpDataUrl.length * 0.75 / 1024) + 'KB');
                    resolve(webpDataUrl);
                    
                } catch (error) {
                    console.error('❌ Mobile: Image processing error:', error);
                    reject(error);
                }
            };
            
            // Enhanced FileReader with timeout
            const reader = new FileReader();
            const timeout = setTimeout(() => {
                console.error('❌ Mobile: FileReader timeout');
                reject(new Error('Timeout saat membaca file'));
            }, 10000); // 10 second timeout
            
            reader.onload = (e) => {
                clearTimeout(timeout);
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                clearTimeout(timeout);
                console.error('❌ Mobile: FileReader error');
                reject(new Error('Gagal membaca file'));
            };
            
            reader.readAsDataURL(file);
        });
    }, []);

    const handleImageUpload = useCallback(async (field, event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Enhanced mobile file validation
        const maxSize = 5 * 1024 * 1024; // Increase to 5MB for better quality
        if (file.size > maxSize) {
            alert(`Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB`);
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, PNG, dll)');
            return;
        }
        
        // Show loading indicator
        const loadingToast = document.createElement('div');
        loadingToast.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,.8); color:#fff; padding:20px; border-radius:10px; z-index:10000;
            display:flex; gap:10px; align-items:center;`;
        loadingToast.innerHTML = `<div style="width:20px;height:20px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div> <span>Memproses foto...</span>`;
        document.body.appendChild(loadingToast);
        
        try {
            console.log('📱 Mobile: Processing image for field:', field, 'Size:', Math.round(file.size / 1024) + 'KB');
            const webpDataUrl = await processImage(file);
            setFormData(prev => ({ ...prev, [field]: webpDataUrl }));
            console.log('✅ Mobile: Image processed and saved to formData');
            
            // Show success message
            document.body.removeChild(loadingToast);
            const successToast = document.createElement('div');
            successToast.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(34,197,94,.9); color:#fff; padding:15px 20px; border-radius:10px; z-index:10000;
                font-size:14px; font-weight:500;`;
            successToast.textContent = '✅ Foto berhasil diproses!';
            document.body.appendChild(successToast);
            setTimeout(() => {
                if (document.body.contains(successToast)) {
                    document.body.removeChild(successToast);
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Mobile: Image processing failed:', error);
            document.body.removeChild(loadingToast);
            
            // Show error message
            const errorToast = document.createElement('div');
            errorToast.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(239,68,68,.9); color:#fff; padding:15px 20px; border-radius:10px; z-index:10000;
                font-size:14px; font-weight:500;`;
            errorToast.textContent = '❌ Gagal memproses gambar. Silakan coba foto lain.';
            document.body.appendChild(errorToast);
            setTimeout(() => {
                if (document.body.contains(errorToast)) {
                    document.body.removeChild(errorToast);
                }
            }, 3000);
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
                status: 'pending',
                collectionName: 'survey_existing',
                originalCollectionName: 'survey_existing'
            };

            // Use Survey_Existing_Report collection directly (matches admin panel)
            const usedCollection = 'Survey_Existing_Report';
            surveyData.collectionName = usedCollection;
            surveyData.originalCollectionName = usedCollection;
            
            console.log('📱 Mobile: Writing to collection:', usedCollection);
            const docRef = await addDoc(collection(db, usedCollection), surveyData);

            // Upload photos with enhanced error handling and logging
            let fotoTinggiARMUrl = null;
            let fotoTitikAktualUrl = null;
            
            console.log('📱 Mobile: Starting photo uploads...', {
                hasFotoTinggiARM: !!formData.fotoTinggiARM,
                hasFotoTitikAktual: !!formData.fotoTitikAktual,
                collection: usedCollection,
                docId: docRef.id
            });

            if (formData.fotoTinggiARM) {
                console.log('📸 Mobile: Uploading fotoTinggiARM...');
                try {
                    const res = await smartPhotoUpload(
                        formData.fotoTinggiARM,
                        usedCollection,
                        user.uid,
                        docRef.id,
                        'fotoTinggiARM'
                    );
                    console.log('📸 Mobile: fotoTinggiARM upload result:', res);
                    if (res?.success && res.downloadURL) {
                        fotoTinggiARMUrl = res.downloadURL;
                        console.log('✅ Mobile: fotoTinggiARM uploaded successfully:', fotoTinggiARMUrl);
                    } else {
                        console.error('❌ Mobile: fotoTinggiARM upload failed:', res?.error || 'Unknown error');
                    }
                } catch (uploadError) {
                    console.error('❌ Mobile: fotoTinggiARM upload exception:', uploadError);
                }
            }

            if (formData.fotoTitikAktual) {
                console.log('📸 Mobile: Uploading fotoTitikAktual...');
                try {
                    const res = await smartPhotoUpload(
                        formData.fotoTitikAktual,
                        usedCollection,
                        user.uid,
                        docRef.id,
                        'fotoTitikAktual'
                    );
                    console.log('📸 Mobile: fotoTitikAktual upload result:', res);
                    if (res?.success && res.downloadURL) {
                        fotoTitikAktualUrl = res.downloadURL;
                        console.log('✅ Mobile: fotoTitikAktual uploaded successfully:', fotoTitikAktualUrl);
                    } else {
                        console.error('❌ Mobile: fotoTitikAktual upload failed:', res?.error || 'Unknown error');
                    }
                } catch (uploadError) {
                    console.error('❌ Mobile: fotoTitikAktual upload exception:', uploadError);
                }
            }

            // Update Firestore document with photo URLs
            const updateData = {};
            if (fotoTinggiARMUrl) updateData.fotoTinggiARM = fotoTinggiARMUrl;
            if (fotoTitikAktualUrl) updateData.fotoTitikAktual = fotoTitikAktualUrl;
            
            if (Object.keys(updateData).length > 0) {
                console.log('💾 Mobile: Updating Firestore with photo URLs:', updateData);
                try {
                    await updateDoc(doc(db, usedCollection, docRef.id), updateData);
                    console.log('✅ Mobile: Firestore updated successfully with photo URLs');
                } catch (updateError) {
                    console.error('❌ Mobile: Failed to update Firestore with photo URLs:', updateError);
                }
            } else {
                console.warn('⚠️ Mobile: No photo URLs to update in Firestore');
            }

            // Tampilkan modal sukses
            setShowSuccessModal(true);
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
            console.error('❌ Mobile: Survey submission failed:', error);
            alert(`Gagal menyimpan survey: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [user, formData, getCurrentLocation]);

    // Render functions
    const renderDropdownField = useCallback((field, label) => (
        <div className="relative mb-4">
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

    const renderInputField = useCallback((field, label, placeholder) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type="text"
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
                        capture="environment"
                        onChange={(e) => handleImageUpload(field, e)}
                        className="hidden"
                    />
                    <Camera size={20} className="mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Ambil Foto</span>
                </label>
            )}
        </div>
    ), [formData, handleFormChange, handleImageUpload]);

    // Section navigation
    const renderSectionNav = useCallback(() => (
        <div className="flex overflow-x-auto space-x-2 pb-4">
            {[
                { id: 'location', label: '📍 Lokasi', icon: '📍' },
                { id: 'basic', label: '📋 Data', icon: '📋' },
                { id: 'infra', label: '🏗️ Infra', icon: '🏗️' },
                { id: 'photos', label: '📸 Foto', icon: '📸' },
                { id: 'submit', label: '✅ Submit', icon: '✅' }
            ].map((section) => (
                <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <span className="mr-1">{section.icon}</span>
                    {section.label}
                </button>
            ))}
        </div>
    ), [activeSection]);

    // Render current section
    const renderCurrentSection = useCallback(() => {
        switch (activeSection) {
            case 'location':
                return (
                    <div className="space-y-4">
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
                        
                        {renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan')}
                        {renderInputField('namaGang', 'Nama Gang (opsional)', 'Masukkan nama gang')}
                    </div>
                );

            case 'basic':
                return (
                    <div className="space-y-4">
                        {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
                        {renderDropdownField('jenisTiang', 'Jenis Tiang')}
                        {renderDropdownField('trafo', 'Trafo')}
                        {renderDropdownField('lampu', 'Lampu')}
                        {renderInputField('keterangan', 'Keterangan (opsional)', 'Tambahkan catatan')}
                    </div>
                );

            case 'infra':
                return (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-blue-800 mb-3">📏 Pengukuran (opsional)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Lebar (m)"
                                    className="px-3 py-2 border border-blue-200 rounded text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Tinggi (m)"
                                    className="px-3 py-2 border border-blue-200 rounded text-sm"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'photos':
                return (
                    <div className="space-y-4">
                        {renderPhotoUpload('fotoTinggiARM', 'Foto Tinggi ARM')}
                        {renderPhotoUpload('fotoTitikAktual', 'Foto Titik Aktual')}
                        <p className="text-xs text-gray-500 text-center">
                            Foto akan dikonversi ke WebP dan dikompres untuk menghemat ruang
                        </p>
                    </div>
                );

            case 'submit':
                return (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">📋 Review Data</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Nama Jalan:</span>
                                    <span className="font-medium">{formData.namaJalan || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Koordinat:</span>
                                    <span className="font-medium">{formData.titikKordinat || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Foto:</span>
                                    <span className="font-medium">
                                        {formData.fotoTinggiARM ? '✅' : '❌'} ARM, 
                                        {formData.fotoTitikAktual ? '✅' : '❌'} Titik
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.namaJalan || !formData.titikKordinat}
                            className="w-full bg-green-500 text-white py-4 px-6 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Survey Existing'}
                        </button>
                    </div>
                );

            default:
                return null;
        }
    }, [activeSection, formData, locationStatus, locationError, renderInputField, renderDropdownField, renderPhotoUpload, handleSubmit, getCurrentLocation]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header - Fixed Position */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
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

            {/* Section Navigation */}
            <div className="px-4 pt-28 relative z-10">
                {renderSectionNav()}
            </div>

            {/* Main Content */}
            <div className="px-4 pb-6 relative z-10">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    {renderCurrentSection()}
                </div>
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

             {/* Success Alert Modal */}
             <SuccessAlertModal
                 isVisible={showSuccessModal}
                 onClose={() => setShowSuccessModal(false)}
                 title="Berhasil Di Simpan"
                 message="Data survey existing telah berhasil disimpan ke database. Data dapat dilihat di dashboard admin untuk validasi."
                 autoClose={true}
                 autoCloseDelay={4000}
             />
         </div>
     );
 };

 export default SurveyExistingPageMobile;


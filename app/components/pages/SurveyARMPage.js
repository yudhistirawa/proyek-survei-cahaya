import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';
import MiniMapsComponent from '../MiniMapsComponentLazy';
import MobileCameraCapture from '../MobileCameraCaptureLazy';
import { openDirectCameraAndTakePhoto } from '../../lib/directCameraUtils';

const SurveyARMPage = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationStatus, setLocationStatus] = useState('loading'); // loading, success, error
    const [locationError, setLocationError] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [currentPhotoField, setCurrentPhotoField] = useState(null);
    const [formData, setFormData] = useState({
        namaJalan: '',
        namaPetugas: '',
        kepemilikanTiang: '',
        jenisTiang: '',
        trafo: '',
        jenisTrafo: '',
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
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Set page title
    usePageTitle('Survey ARM - Sistem Manajemen');

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

    const dropdownOptions = {
        kepemilikanTiang: ['PLN', 'Pemko', 'Swadaya'],
        jenisTiang: ['Beton', 'Besi', 'Kayu', 'Lainnya'],
        trafo: ['Ada', 'Tidak Ada'],
        jenisTrafo: ['Single', 'Double'],
        lampu: ['Ada', 'Tidak Ada'],
        jenisLampu: ['Jalan', 'Taman', 'Dekoratif', 'Lainnya']
    };

    const toggleDropdown = (field) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const selectOption = (field, value) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Reset jenisTrafo jika trafo dipilih "Tidak Ada"
            if (field === 'trafo' && value === 'Tidak Ada') {
                newData.jenisTrafo = '';
            }
            
            return newData;
        });
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

    // Helper function untuk mengkonversi data URL ke File object
    const dataURLtoFile = (dataURL, filename) => {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    // Fungsi handleImageUpload lama dihapus untuk menghindari deklarasi ganda
    // Digantikan dengan fungsi baru yang langsung membuka kamera fullscreen

    const renderDropdownField = (field, label, placeholder = `Pilih ${label}`) => {
        const isDisabled = field === 'jenisTrafo' && formData.trafo === 'Tidak Ada';
        
        return (
            <div className="relative mb-4">
                <button
                    onClick={() => !isDisabled && toggleDropdown(field)}
                    disabled={isDisabled}
                    className={`w-full backdrop-blur-sm border rounded-2xl px-5 py-4 text-left flex items-center justify-between transition-all duration-300 group ${
                        isDisabled 
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                            : 'bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                    <span className={`${
                        isDisabled 
                            ? 'text-gray-400' 
                            : formData[field] 
                                ? 'text-black font-medium' 
                                : 'text-gray-600'
                    }`}>
                        {isDisabled ? 'Tidak tersedia' : (formData[field] || placeholder)}
                    </span>
                    <ChevronDown 
                        size={20} 
                        className={`transition-transform duration-300 ${
                            isDisabled 
                                ? 'text-gray-300' 
                                : `text-gray-400 group-hover:text-gray-600 ${openDropdowns[field] ? 'rotate-180' : ''}`
                        }`} 
                    />
                </button>
                
                {openDropdowns[field] && !isDisabled && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        {dropdownOptions[field]?.map((option, index) => (
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
                            src={formData[field] instanceof File ? URL.createObjectURL(formData[field]) : formData[field]} 
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
                        <button
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    [field]: null
                                }));
                            }}
                            className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-full cursor-pointer hover:bg-red-600 transition-colors duration-200 shadow-lg"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group">
                        <Camera size={32} className="mx-auto text-gray-400 mb-2 group-hover:text-blue-500 transition-colors duration-300" />
                        <span className="text-gray-500 group-hover:text-blue-600 font-medium">Pilih foto</span>
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

    const getCombinedLocationText = () => {
        const namaJalan = formData.namaJalan || 'Jalan Tidak Diketahui';
        const kepemilikanTiang = formData.kepemilikanTiang || 'Tidak Diketahui';
        const jenisTiang = formData.jenisTiang || 'Tidak Diketahui';
        return `${namaJalan} - ${kepemilikanTiang} - ${jenisTiang}`;
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('Anda harus login terlebih dahulu!');
            return;
        }

        // Validasi form
        if (!formData.kepemilikanTiang) {
            alert('Mohon isi Kepemilikan Tiang!');
            return;
        }

        setIsSubmitting(true);
        console.log('🚀 Mulai proses penyimpanan Survey ARM...');

        try {
            // Siapkan data dasar dan buat dokumen terlebih dahulu untuk mendapatkan docId
            const surveyData = {
                // Data form Survey ARM
                kepemilikanTiang: formData.kepemilikanTiang,
                jenisTiang: formData.jenisTiang,
                trafo: formData.trafo,
                jenisTrafo: formData.jenisTrafo,
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
                
                // URL foto (diupdate setelah upload Storage)
                fotoTinggiARM: null,
                fotoTitikAktual: null,
                
                // Metadata
                surveyType: 'Survey ARM',
                surveyCategory: 'survey_arm',
                surveyZone: 'arm',
                surveyorName: user.displayName || user.email,
                surveyorId: user.uid,
                projectTitle: `Survey ARM - ${getCombinedLocationText()}`,
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

            // Buat dokumen terlebih dahulu
            console.log('📄 Membuat dokumen di Firestore...');
            const docRef = await addDoc(collection(db, 'Survey_ARM_Report'), surveyData);
            console.log('✅ Dokumen berhasil dibuat dengan ID:', docRef.id);

            // Upload foto menggunakan API route helper (smartPhotoUpload)
            console.log('📸 Mulai upload foto via smartPhotoUpload...');
            let [fotoTinggiARMUrl, fotoTitikAktualUrl] = [null, null];
            
            if (formData.fotoTinggiARM) {
                console.log('📸 Uploading foto tinggi ARM...');
                try {
                    const result = await smartPhotoUpload(
                        formData.fotoTinggiARM,
                        'Survey_ARM',
                        user.uid,
                        docRef.id,
                        'foto_tinggi_arm'
                    );
                    if (result.success) {
                        fotoTinggiARMUrl = result.downloadURL;
                        console.log('✅ Foto tinggi ARM berhasil diupload:', fotoTinggiARMUrl);
                    } else {
                        console.error('❌ Error upload foto tinggi ARM:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error upload foto tinggi ARM:', error);
                    // Continue without foto
                }
            }
            
            if (formData.fotoTitikAktual) {
                console.log('📸 Uploading foto titik aktual...');
                try {
                    const result = await smartPhotoUpload(
                        formData.fotoTitikAktual,
                        'Survey_ARM',
                        user.uid,
                        docRef.id,
                        'foto_titik_aktual'
                    );
                    if (result.success) {
                        fotoTitikAktualUrl = result.downloadURL;
                        console.log('✅ Foto titik aktual berhasil diupload:', fotoTitikAktualUrl);
                    } else {
                        console.error('❌ Error upload foto titik aktual:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error upload foto titik aktual:', error);
                    // Continue without foto
                }
            }
            
            // Update dokumen dengan URL foto jika berhasil diupload
            if (fotoTinggiARMUrl || fotoTitikAktualUrl) {
                const updateData = {};
                if (fotoTinggiARMUrl) updateData.fotoTinggiARM = fotoTinggiARMUrl;
                if (fotoTitikAktualUrl) updateData.fotoTitikAktual = fotoTitikAktualUrl;
                updateData.updatedAt = serverTimestamp();
                
                await updateDoc(doc(db, 'Survey_ARM_Report', docRef.id), updateData);
                console.log('✅ Dokumen berhasil diupdate dengan URL foto');
            }
            
            console.log('✅ Data survey berhasil disimpan dengan foto');
            
            console.log('Survey ARM berhasil disimpan dengan ID:', docRef.id);
            
            // Reset form dan get location lagi
            setFormData({
                kepemilikanTiang: '',
                jenisTiang: '',
                trafo: '',
                jenisTrafo: '',
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
            
            // Get location lagi setelah reset
            getCurrentLocation();
            
            // Tampilkan modal sukses
            setShowSuccessModal(true);
            
        } catch (error) {
            console.error('❌ Error menyimpan survey:', error);
            
            // Berikan pesan error yang lebih spesifik
            let errorMessage = 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
            
            if (error.code === 'storage/cors-error' || error.message.includes('CORS')) {
                errorMessage = 'Error CORS saat upload foto. Silakan coba lagi atau hubungi admin.';
            } else if (error.code === 'storage/unauthorized') {
                errorMessage = 'Tidak memiliki izin untuk upload foto. Silakan login ulang.';
            } else if (error.code === 'storage/quota-exceeded') {
                errorMessage = 'Kapasitas storage penuh. Silakan hubungi admin.';
            } else if (error.code === 'storage/network-request-failed') {
                errorMessage = 'Gagal terhubung ke server. Silakan cek koneksi internet.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = 'File foto harus berupa gambar (JPG, PNG, dll).';
            } else if (error.message.includes('Ukuran file terlalu besar')) {
                errorMessage = 'Ukuran foto terlalu besar. Silakan pilih foto yang lebih kecil.';
            } else if (error.message.includes('Failed to convert image to WebP')) {
                errorMessage = 'Gagal mengkonversi foto ke format WebP. Silakan pilih foto yang berbeda.';
            }
            
            alert(errorMessage);
            
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {/* Ultra Modern Header - Sticky di atas */}
            <div className="bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Survey ARM
                            </h1>
                        </div>
                        
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-base">🔧</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content - Dengan padding top yang cukup */}
            <div className="px-6 py-6 pb-24">
                <div className="max-w-md mx-auto space-y-1">
                    {/* Basic Information Fields */}
                    {renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan')}
                    {renderInputField('namaPetugas', 'Nama Petugas', 'Masukkan nama petugas')}
                    
                    {/* Dropdown Fields sesuai urutan gambar */}
                    {renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
                    {renderDropdownField('jenisTiang', 'Jenis Tiang')}
                    {renderDropdownField('trafo', 'Trafo')}
                    {renderDropdownField('jenisTrafo', 'Jenis Trafo')}
                    {renderDropdownField('lampu', 'Lampu')}
                    
                    {/* Input Fields sesuai urutan gambar */}
                    {renderInputField('jumlahLampu', 'Jumlah Lampu', 'Jumlah Lampu', 'number')}
                    {renderDropdownField('jenisLampu', 'Jenis Lampu')}
                    {renderLocationField()}
                    {renderInputField('lebarJalan1', 'Lebar Jalan 1 (m)', 'Lebar Jalan 1 (m)', 'number')}
                    {renderInputField('lebarJalan2', 'Lebar Jalan 2 (m)', 'Lebar Jalan 2 (m)', 'number')}
                    {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'Lebar Bahu Bertiang (m)', 'number')}
                    {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'Lebar Trotoar Bertiang (m)', 'number')}
                    {renderInputField('lainnyaBertiang', 'Lainnya Bertiang', 'Lainnya Bertiang')}
                    {renderInputField('tinggiARM', 'Tinggi ARM (m)', 'Tinggi ARM (m)', 'number')}
                    
                    {/* Image Upload Fields sesuai urutan gambar */}
                    {renderImageUploadField('fotoTinggiARM', 'Foto Tinggi ARM')}
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
            <div className="fixed bottom-6 left-6 right-6 z-40">
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

            {/* Mobile Camera Capture Modal */}
            {showCameraModal && (
                <MobileCameraCapture
                    onPhotoCaptured={handlePhotoCaptured}
                    onClose={() => setShowCameraModal(false)}
                    title={`Ambil Foto - ${currentPhotoField === 'fotoTinggiARM' ? 'Foto Tinggi ARM' : 'Foto Titik Aktual'}`}
                    description="Ambil foto dengan watermark koordinat, tanggal, dan jam otomatis"
                    surveyorName={formData.namaPetugas || 'Petugas'}
                />
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center">
                        <h3 className="text-xl font-bold text-green-600 mb-3">Survey ARM Berhasil Disimpan!</h3>
                        <p className="text-gray-700 mb-4">Data Survey ARM Anda telah berhasil disimpan.</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-green-500 text-white py-3 px-6 rounded-xl hover:bg-green-600 transition-colors duration-200 text-lg font-medium"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurveyARMPage;

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Save, MapPin, X, Sun, Lightbulb, Zap, TrendingUp } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { smartPhotoUpload } from '../../lib/photoUpload';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import usePageTitle from '../../hooks/usePageTitle';
import MiniMapsComponent from '../MiniMapsComponent';

const KemerataanSinarPage = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [locationError, setLocationError] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [formData, setFormData] = useState({
        namaJalan: '',
        namaPetugas: '',
        idTitik: '',
        jenisLampu: '',
        dayaLampu: '',
        tinggiTiang: '',
        jarakAntarTiang: '',
        titikKordinat: '',
        intensitasCahaya: '',
        distribusiCahaya: '',
        fotoTitikAktual: null,
        fotoDistribusi: null,
        keterangan: ''
    });

    // Set page title
    usePageTitle('Kemerataan Sinar - Sistem Manajemen');

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
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Geolokasi tidak didukung di browser ini');
            return;
        }

        setLocationStatus('loading');
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coords = `${latitude}, ${longitude}`;
                setFormData(prev => ({ ...prev, titikKordinat: coords }));
                setLocationStatus('success');
                setLocationError('');
                console.log('📍 Location obtained:', coords);
            },
            (error) => {
                console.error('❌ Location error:', error);
                let msg = '';
                switch (error.code) {
                    case 1:
                        msg = 'Izin lokasi ditolak. Silakan izinkan akses lokasi.';
                        break;
                    case 2:
                        msg = 'Informasi lokasi tidak tersedia';
                        break;
                    case 3:
                        msg = 'Permintaan lokasi timeout';
                        break;
                    default:
                        msg = 'Terjadi kesalahan yang tidak diketahui';
                }
                setLocationError(msg);
                setLocationStatus('error');
            },
            options
        );
    };

    const refreshLocation = () => {
        getCurrentLocation();
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
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const maxWidth = 1920;
                const maxHeight = 1080;
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
                
                setFormData(prev => ({
                    ...prev,
                    [field]: webpDataUrl
                }));
            };
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('Anda harus login terlebih dahulu!');
            return;
        }

        if (!formData.namaJalan || !formData.namaPetugas) {
            alert('Nama Jalan dan Nama Petugas harus diisi!');
            return;
        }

        if (!formData.fotoTitikAktual) {
            alert('Foto Titik Aktual harus diupload!');
            return;
        }

        setIsSubmitting(true);
        console.log('🚀 Mulai proses penyimpanan Kemerataan Sinar...');

        try {
            const surveyData = {
                namaJalan: formData.namaJalan,
                namaPetugas: formData.namaPetugas,
                idTitik: formData.idTitik,
                jenisLampu: formData.jenisLampu,
                dayaLampu: formData.dayaLampu,
                tinggiTiang: formData.tinggiTiang,
                jarakAntarTiang: formData.jarakAntarTiang,
                titikKordinat: formData.titikKordinat,
                intensitasCahaya: formData.intensitasCahaya,
                distribusiCahaya: formData.distribusiCahaya,
                keterangan: formData.keterangan,
                
                fotoTitikAktual: null,
                fotoDistribusi: null,
                
                surveyType: 'Kemerataan Sinar',
                surveyCategory: 'kemerataan_sinar',
                surveyZone: 'kemerataan_sinar',
                surveyorName: user.displayName || user.email,
                surveyorId: user.uid,
                projectTitle: `Kemerataan Sinar - ${formData.namaJalan} - ${formData.namaPetugas}`,
                projectLocation: formData.titikKordinat || 'Koordinat tidak tersedia',
                projectDate: new Date().toISOString().split('T')[0],
                
                validationStatus: 'pending',
                validatedBy: null,
                validatedAt: null,
                validationNotes: '',
                
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            console.log('📄 Membuat dokumen di Firestore...');
            const docRef = await addDoc(collection(db, 'Kemerataan_Sinar'), surveyData);
            console.log('✅ Dokumen berhasil dibuat dengan ID:', docRef.id);

            console.log('📸 Mulai upload foto...');
            let fotoTitikAktualUrl = null;
            let fotoDistribusiUrl = null;
            
            if (formData.fotoTitikAktual) {
                console.log('📸 Uploading foto titik aktual...');
                try {
                    const result = await smartPhotoUpload(
                        formData.fotoTitikAktual,
                        'Kemerataan_Sinar',
                        user.uid,
                        docRef.id,
                        'foto_titik_aktual'
                    );
                    if (result.success) {
                        fotoTitikAktualUrl = result.downloadURL;
                        console.log('✅ Foto titik aktual berhasil diupload:', fotoTitikAktualUrl);
                        
                        if (result.isFallback) {
                            console.log('⚠️ Foto titik aktual disimpan sementara:', result.message);
                        }
                    } else {
                        console.error('❌ Error upload foto titik aktual:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error upload foto titik aktual:', error);
                }
            }

            if (formData.fotoDistribusi) {
                console.log('📸 Uploading foto distribusi...');
                try {
                    const result = await smartPhotoUpload(
                        formData.fotoDistribusi,
                        'Kemerataan_Sinar',
                        user.uid,
                        docRef.id,
                        'foto_distribusi'
                    );
                    if (result.success) {
                        fotoDistribusiUrl = result.downloadURL;
                        console.log('✅ Foto distribusi berhasil diupload:', fotoDistribusiUrl);
                        
                        if (result.isFallback) {
                            console.log('⚠️ Foto distribusi disimpan sementara:', result.message);
                        }
                    } else {
                        console.error('❌ Error upload foto distribusi:', result.error);
                    }
                } catch (error) {
                    console.error('❌ Error upload foto distribusi:', error);
                }
            }
            
            if (fotoTitikAktualUrl || fotoDistribusiUrl) {
                const updateData = {
                    fotoTitikAktual: fotoTitikAktualUrl,
                    fotoDistribusi: fotoDistribusiUrl,
                    updatedAt: serverTimestamp()
                };
                
                await updateDoc(doc(db, 'Kemerataan_Sinar', docRef.id), updateData);
                console.log('✅ Dokumen berhasil diupdate dengan URL foto');
            }
            
            console.log('✅ Data kemerataan sinar berhasil disimpan dengan foto');
            console.log('Kemerataan Sinar berhasil disimpan dengan ID:', docRef.id);
            
            setFormData({
                namaJalan: '',
                namaPetugas: '',
                idTitik: '',
                jenisLampu: '',
                dayaLampu: '',
                tinggiTiang: '',
                jarakAntarTiang: '',
                fotoTitikAktual: null,
                fotoDistribusi: null,
                keterangan: '',
                titikKordinat: '',
                intensitasCahaya: '',
                distribusiCahaya: ''
            });
            
            getCurrentLocation();
            alert('Data Kemerataan Sinar berhasil disimpan dengan foto!');
            
        } catch (error) {
            console.error('❌ Error menyimpan kemerataan sinar:', error);
            
            let errorMessage = 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
            
            if (error.code === 'storage/cors-error' || error.message.includes('CORS')) {
                errorMessage = 'Error CORS saat upload foto. Silakan coba lagi atau hubungi admin.';
            } else if (error.code === 'storage/unauthorized') {
                errorMessage = 'Tidak memiliki izin untuk upload foto. Silakan login ulang.';
            } else if (error.code === 'storage/quota-exceeded') {
                errorMessage = 'Kapasitas storage penuh. Silakan hubungi admin.';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Tidak memiliki izin untuk menyimpan data. Silakan login ulang.';
            }
            
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInputField = (field, label, placeholder, type = 'text') => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty value, numbers, and decimal point
                    if (type === 'number' && value !== '' && !/^\d*\.?\d*$/.test(value)) {
                        return;
                    }
                    handleInputChange(field, value);
                }}
                onKeyDown={(e) => {
                    // Allow backspace, delete, tab, escape, enter, and arrow keys
                    if (type === 'number' && !(
                        e.key === 'Backspace' ||
                        e.key === 'Delete' ||
                        e.key === 'Tab' ||
                        e.key === 'Escape' ||
                        e.key === 'Enter' ||
                        e.key === 'ArrowLeft' ||
                        e.key === 'ArrowRight' ||
                        e.key === 'ArrowUp' ||
                        e.key === 'ArrowDown' ||
                        /^\d$/.test(e.key) ||
                        (e.key === '.' && !formData[field].includes('.'))
                    )) {
                        e.preventDefault();
                    }
                }}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                inputMode={type === 'number' ? 'decimal' : 'text'}
                min="0"
                step="0.01"
                autoComplete="off"
            />
        </div>
    );

    const renderImageUploadField = (field, label, description) => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <p className="text-sm text-gray-600 mb-3">{description}</p>
            
            <div className="space-y-3">
                <div className="flex items-center space-x-3">
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleImageUpload(field, e)}
                        className="hidden"
                        id={`${field}-input`}
                    />
                    <label
                        htmlFor={`${field}-input`}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                        <Camera className="w-4 h-4" />
                        <span>Pilih Foto</span>
                    </label>
                </div>

                {formData[field] && (
                    <div className="relative">
                        <img
                            src={formData[field]}
                            alt={label}
                            className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                        />
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, [field]: null }))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

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
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                    <Sun className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Kemerataan Sinar
                                </h1>
                            </div>
                        </div>
                        
                        {/* Location Status */}
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <MapPin className={`w-4 h-4 ${
                                    locationStatus === 'success' ? 'text-green-500' : 
                                    locationStatus === 'error' ? 'text-red-500' : 'text-yellow-500'
                                }`} />
                                <span className={`text-sm ${
                                    locationStatus === 'success' ? 'text-green-600' : 
                                    locationStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                    {locationStatus === 'success' ? 'Lokasi OK' : 
                                     locationStatus === 'error' ? 'Lokasi Error' : 'Mendapatkan Lokasi...'}
                                </span>
                            </div>
                            
                            {locationStatus === 'error' && (
                                <button
                                    onClick={refreshLocation}
                                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                                >
                                    Coba Lagi
                                </button>
                            )}
                            
                            <button
                                onClick={() => setShowMapModal(true)}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                            >
                                Lihat Peta
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="px-6 py-6 pb-24">
                <div className="max-w-md mx-auto space-y-1">
                    {/* Basic Information */}
                    {renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan')}
                    {renderInputField('namaPetugas', 'Nama Petugas', 'Masukkan nama petugas')}
                    {renderInputField('idTitik', 'ID Titik', 'Masukkan ID titik')}

                    {/* Lamp Information */}
                    {renderInputField('jenisLampu', 'Jenis Lampu', 'Contoh: LED, Konvensional, Solar')}
                    {renderInputField('dayaLampu', 'Daya Lampu (Watt)', 'Contoh: 50, 100, 150', 'number')}
                    {renderInputField('tinggiTiang', 'Tinggi Tiang (meter)', 'Contoh: 8, 10, 12', 'number')}
                    {renderInputField('jarakAntarTiang', 'Jarak Antar Tiang (meter)', 'Contoh: 25, 30, 35', 'number')}

                    {/* Location Field */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Titik Koordinat
                        </label>
                        <input
                            type="text"
                            value={formData.titikKordinat || 'Mendapatkan lokasi...'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                    </div>

                    {/* Light Measurement */}
                    {renderInputField('intensitasCahaya', 'Intensitas Cahaya (Lux)', 'Contoh: 15, 20, 25', 'number')}
                    {renderInputField('distribusiCahaya', 'Distribusi Cahaya', 'Contoh: Merata, Tidak Merata, Sebagian')}

                    {/* Photo Uploads */}
                    {renderImageUploadField(
                        'fotoTitikAktual',
                        'Foto Titik Aktual',
                        'Upload foto kondisi aktual titik lampu'
                    )}
                    
                    {renderImageUploadField(
                        'fotoDistribusi',
                        'Foto Distribusi Cahaya',
                        'Upload foto yang menunjukkan distribusi cahaya (opsional)'
                    )}

                    {/* Notes Field */}
                    {renderInputField('keterangan', 'Keterangan', 'Tambahkan keterangan tambahan (opsional)')}

                    {/* Submit Button */}
                    <div className="pt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <Sun className="w-4 h-4" />
                                    <span>Simpan Kemerataan Sinar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Modal */}
            {showMapModal && (
                <MiniMapsComponent
                    isOpen={showMapModal}
                    onClose={() => setShowMapModal(false)}
                    currentLocation={formData.titikKordinat}
                />
            )}
        </div>
    );
};

export default KemerataanSinarPage;

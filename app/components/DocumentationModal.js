"use client";

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Camera, Upload, Check, RotateCw, Eye, MapPin, Trash2 } from 'lucide-react';
import { uploadPhotoToStorage, uploadMultiplePhotos, validatePhotoFile } from '../lib/photoUpload';

function DocumentationModal({ isOpen, onClose, onComplete, surveyorName, existingPhotos = {} }) {
    const [isVisible, setIsVisible] = useState(false);
    const [photos, setPhotos] = useState({
        fotoLapangan: null,
        fotoLampuSebelumNaik: null,
        fotoTinggiTiang: null,
        fotoPetugas: null,
        fotoPengujian: null
    });
    const [processedPhotos, setProcessedPhotos] = useState({});
    const [uploading, setUploading] = useState({});
    const [uploadedUrls, setUploadedUrls] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);

    const fileInputRefs = {
        fotoLapangan: useRef(null),
        fotoLampuSebelumNaik: useRef(null),
        fotoTinggiTiang: useRef(null),
        fotoPetugas: useRef(null),
        fotoPengujian: useRef(null)
    };

    // Urutan dan label disesuaikan permintaan user:
    const photoTypes = [
        { key: 'fotoPetugas', label: 'Foto Petugas', description: 'Foto petugas yang melakukan survei' },
        { key: 'fotoPengujian', label: 'Foto Full Lapangan Pada Saat Pengujian', description: 'Foto keseluruhan lapangan saat proses pengujian' },
        { key: 'fotoLapangan', label: 'Foto Full Lapangan', description: 'Foto kondisi umum lapangan sebelum pengujian' },
        { key: 'fotoLampuSebelumNaik', label: 'Foto Lampu Sebelum Naik', description: 'Foto lampu dari bawah sebelum pengukuran' },
        { key: 'fotoTinggiTiang', label: 'Foto Lampu Dengan Tinggi Yang Ditentukan', description: 'Foto lampu pada ketinggian yang sudah ditentukan' }
    ];

    React.useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            // Get user location when modal opens
            getCurrentLocation();
            
            // Load existing photos if available
            if (existingPhotos && Object.keys(existingPhotos).length > 0) {
                setUploadedUrls(existingPhotos);
                // Don't set placeholder photos - we'll use uploadedUrls for display
            }
            
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen, existingPhotos]);

    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setLocationError(null);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLocationError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            setLocationError('Geolocation tidak didukung browser ini.');
        }
    }

    const addWatermarkToImage = async (file, surveyorName) => {
        return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize image to max 800x800 while maintaining aspect ratio
                    const MAX_SIZE = 800;
                    let { width, height } = img;
                    
                    if (width > height && width > MAX_SIZE) {
                        height = (height * MAX_SIZE) / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width = (width * MAX_SIZE) / height;
                        height = MAX_SIZE;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Add watermark
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                    });
                    const timeStr = now.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    let locationStr = 'GPS: Tidak tersedia';
                    let streetName = '';
                    if (location) {
                        // Fetch street name with timeout to avoid hanging
                        const fetchWithTimeout = (url, ms = 3000) => {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), ms);
                            return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
                        };
                        locationStr = `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
                        try {
                            const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.latitude}&lon=${location.longitude}`);
                            if (response.ok) {
                                const data = await response.json();
                                const road = data.address?.road || '';
                                const city = data.address?.city || data.address?.town || data.address?.county || '';
                                streetName = [road, city].filter(Boolean).join(', ');
                                if (!streetName) {
                                    streetName = data.display_name?.split(',').slice(0, 2).join(', ') || '';
                                }
                            }
                        } catch (error) {
                            console.warn('Gagal mendapatkan nama jalan untuk watermark:', error);
                        }
                    }
                    
                    // Build watermark text with surveyor name, date/time, location, and street name
                    let watermarkText = `Petugas: ${surveyorName || 'Tidak diketahui'}\n${dateStr} ${timeStr}\n${locationStr}`;
                    if (streetName) {
                        watermarkText += `\n${streetName}`;
                    }
                    
                    // Watermark styling
                    const fontSize = Math.max(12, Math.min(width, height) * 0.025);
                    ctx.font = `${fontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 2;
                    
                    // Calculate watermark position (bottom right)
                    const lines = watermarkText.split('\n');
                    const lineHeight = fontSize * 1.2;
                    const padding = 10;
                    
                    // Draw background rectangle
                    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
                    const rectWidth = maxLineWidth + padding * 2;
                    const rectHeight = lines.length * lineHeight + padding * 2;
                    const rectX = width - rectWidth - 10;
                    const rectY = height - rectHeight - 10;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                    
                    // Draw text
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    
                    lines.forEach((line, index) => {
                        const textX = rectX + padding;
                        const textY = rectY + padding + (index * lineHeight);
                        ctx.fillText(line, textX, textY);
                    });
                    
                    canvas.toBlob((blob)=>{ if(blob) resolve(blob); else reject(new Error('Konversi canvas ke Blob gagal')); }, 'image/webp', 0.65);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (photoType, file) => {
        if (!file) return;

        console.log(`Processing photo for ${photoType}:`, file);
        setUploading(prev => ({ ...prev, [photoType]: true }));

        try {
            // Add watermark and convert to WebP - store locally only
            const watermarkedBlob = await addWatermarkToImage(file, surveyorName);
            console.log(`Watermarked blob for ${photoType}:`, watermarkedBlob);
            
            // Store the blob directly instead of converting to File
            // This ensures Firebase can upload it properly
            setPhotos(prev => ({ ...prev, [photoType]: watermarkedBlob }));
            console.log(`Stored blob for ${photoType} in local state`);
            
        } catch (error) {
            console.error('Error processing photo:', error);
            alert('Gagal memproses foto. Silakan coba lagi.');
        } finally {
            setUploading(prev => ({ ...prev, [photoType]: false }));
        }
    };

    const handleFileChange = (photoType) => (event) => {
        const file = event.target.files[0];
        if (file) {
            handlePhotoUpload(photoType, file);
        }
    };

    const handleDelete = async (photoType) => {
        // Simply remove from local state - no Firebase deletion needed since it's not uploaded yet
        setPhotos(prev => ({ ...prev, [photoType]: null }));
        
        // If it was already uploaded, remove from uploaded URLs as well
        if (uploadedUrls[photoType]) {
            setUploadedUrls(prev => {
                const copy = { ...prev };
                delete copy[photoType];
                return copy;
            });
        }
    };

    const handleComplete = async () => {
        console.log('Starting upload process...');
        console.log('Photos to upload:', photos);
        console.log('Existing uploaded URLs:', uploadedUrls);
        
        setIsUploading(true);
        
        try {
            // Siapkan data untuk upload
            const photosToUpload = [];
            
            // Only upload new photos that haven't been uploaded yet
            for (const photoType of Object.keys(photos)) {
                if (photos[photoType] && !uploadedUrls[photoType]) {
                    console.log(`Preparing to upload ${photoType}:`, photos[photoType]);
                    
                    // Validasi file sebelum upload
                    const validation = validatePhotoFile(photos[photoType]);
                    if (!validation.isValid) {
                        throw new Error(`Foto ${photoType}: ${validation.error}`);
                    }
                    
                    photosToUpload.push({
                        file: photos[photoType],
                        photoType: photoType,
                        originalFileName: `${photoType}_${Date.now()}.webp`
                    });
                }
            }
            
            console.log(`Starting upload for ${photosToUpload.length} photo(s)...`);
            
            if (photosToUpload.length > 0) {
                // Upload photos menggunakan helper function
                const uploadResult = await uploadMultiplePhotos(
                    photosToUpload,
                    'temp-user-id', // userId - akan diupdate nanti
                    'temp-doc-id' // docId - akan diupdate nanti
                );
                
                if (uploadResult.success) {
                    console.log('All uploads completed successfully:', uploadResult.results);
                    
                    // Buat mapping dari hasil upload
                    const newUrls = {};
                    uploadResult.results.forEach(result => {
                        newUrls[result.photoType] = result.downloadURL;
                    });
                    
                    // Combine existing URLs with new URLs
                    const finalUrls = { ...uploadedUrls, ...newUrls };
                    console.log('Final combined URLs:', finalUrls);
                    
                    // Update uploaded URLs state
                    setUploadedUrls(finalUrls);
                    
                    // Pass the combined URLs to parent component
                    console.log('DocumentationModal: Passing final URLs to parent:', finalUrls);
                    onComplete(finalUrls);
                    
                    alert(`${uploadResult.results.length} foto berhasil diupload ke Firebase Storage!`);
                } else {
                    console.error('Upload failed:', uploadResult.errors);
                    const errorMessages = uploadResult.errors.map(e => `${e.photoType}: ${e.error}`).join('\n');
                    throw new Error(`Gagal upload beberapa foto:\n${errorMessages}`);
                }
            } else {
                console.log('No new photos to upload');
                
                // Jika tidak ada foto baru, langsung pass existing URLs
                onComplete(uploadedUrls);
                alert('Tidak ada foto baru untuk diupload.');
            }
            
            // Close modal after a short delay to show success state
            setTimeout(() => {
                handleClose();
            }, 2000);
            
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert(`Gagal mengunggah foto: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
            // Reset state but keep uploaded URLs if they exist
            setPhotos({
                fotoLapangan: null,
                fotoLampuSebelumNaik: null,
                fotoTinggiTiang: null,
                fotoPetugas: null,
                fotoPengujian: null
            });
            setProcessedPhotos({});
            // Don't reset uploadedUrls - they should persist
            // setUploadedUrls({});
            setUploading({});
            setIsUploading(false);
        }, 300);
    };

    const allPhotosUploaded = photoTypes.every(type => uploadedUrls[type.key]);
    const anyPhotoSelected = Object.keys(photos).some(key => photos[key] !== null) || Object.keys(uploadedUrls).length > 0;
    const hasNewPhotosToUpload = Object.keys(photos).some(key => photos[key] !== null && !uploadedUrls[key]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[110] p-2 md:p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}>
            <div 
                onClick={(e) => e.stopPropagation()} 
                className={`bg-white p-3 md:p-6 lg:p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
                {/* Sticky Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 -mx-3 md:-mx-6 lg:-mx-8 px-3 md:px-6 lg:px-8 py-4 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-1">Dokumentasi Survei</h2>
                            <p className="text-xs md:text-sm text-gray-600 leading-relaxed">Unggah foto dokumentasi sebelum memulai survei. Foto akan otomatis diberi watermark dengan lokasi dan waktu, lalu dikonversi ke format WebP.</p>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10" 
                            aria-label="Tutup"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Location Status */}
                    <div className="mt-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className={`md:w-4 md:h-4 ${location ? 'text-green-500' : 'text-red-500'}`} />
                            <span className="text-xs md:text-sm font-medium">
                                {location ? 'GPS Aktif' : 'GPS Tidak Aktif'}
                            </span>
                        </div>
                        {location && (
                            <p className="text-xs text-gray-600 mt-1">
                                Lat: {location.latitude.toFixed(6)}, Lon: {location.longitude.toFixed(6)}
                            </p>
                        )}
                        {locationError && (
                            <p className="text-xs text-red-600 mt-1">{locationError}</p>
                        )}
                    </div>
                </div>

                <div className="mt-4 md:mt-6">

                    {/* Responsive Grid Layout for Photo Upload Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 mt-4">
                        {photoTypes.map((type) => (
                            <div
                                key={type.key}
                                className="border border-gray-200 rounded-xl p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
                            >
                                {/* Card Header with Status Icons */}
                                <div className="flex items-start justify-between mb-3 md:mb-4">
                                    <div className="text-left flex-1">
                                        <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-tight mb-1">
                                            {type.label}
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                                            {type.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                        {uploading[type.key] && (
                                            <RotateCw size={18} className="text-blue-500 animate-spin" />
                                        )}
                                        {photos[type.key] && !uploading[type.key] && !uploadedUrls[type.key] && (
                                            <div className="w-4 h-4 bg-yellow-500 rounded-full" title="Foto siap untuk diupload" />
                                        )}
                                        {uploadedUrls[type.key] && !uploading[type.key] && (
                                            <Check size={18} className="text-green-500" title="Foto sudah diupload" />
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2">
                                    {/* Camera and Gallery Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (fileInputRefs[type.key].current) {
                                                    fileInputRefs[type.key].current.setAttribute('capture', 'environment');
                                                    fileInputRefs[type.key].current.click();
                                                }
                                            }}
                                            disabled={uploading[type.key]}
                                            className="flex items-center justify-center gap-1 px-2 py-2.5 md:px-3 md:py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 font-medium text-xs md:text-sm shadow-sm hover:shadow-md active:bg-blue-800 touch-manipulation min-h-[44px]"
                                        >
                                            <Camera size={14} className="md:w-4 md:h-4" />
                                            <span>Kamera</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (fileInputRefs[type.key].current) {
                                                    fileInputRefs[type.key].current.removeAttribute('capture');
                                                    fileInputRefs[type.key].current.click();
                                                }
                                            }}
                                            disabled={uploading[type.key]}
                                            className="flex items-center justify-center gap-1 px-2 py-2.5 md:px-3 md:py-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors duration-200 font-medium text-xs md:text-sm shadow-sm hover:shadow-md active:bg-green-800 touch-manipulation min-h-[44px]"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                <circle cx="9" cy="9" r="2"/>
                                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                            </svg>
                                            <span>Galeri</span>
                                        </button>
                                    </div>

                                    {(photos[type.key] || uploadedUrls[type.key]) && (
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    let imageSrc;
                                                    if (uploadedUrls[type.key]) {
                                                        imageSrc = uploadedUrls[type.key];
                                                    } else if (photos[type.key]) {
                                                        imageSrc = URL.createObjectURL(photos[type.key]);
                                                    }
                                                    setViewingPhoto({
                                                        src: imageSrc,
                                                        title: type.label
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-sm md:text-base shadow-sm hover:shadow-md touch-manipulation min-h-[40px]"
                                            >
                                                <Eye size={14} className="md:w-4 md:h-4" />
                                                Lihat Foto
                                            </button>
                                        </div>
                                    )}

                                    {(photos[type.key] || uploadedUrls[type.key]) && (
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleDelete(type.key)}
                                                disabled={uploading[type.key]}
                                                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-sm md:text-base shadow-sm hover:shadow-md disabled:cursor-not-allowed touch-manipulation min-h-[40px]"
                                            >
                                                <Trash2 size={14} className="md:w-4 md:h-4" />
                                                {uploading[type.key] ? 'Menghapus...' : 'Hapus Foto'}
                                            </button>
                                        </div>
                                    )}

                                    <input
                                        ref={fileInputRefs[type.key]}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange(type.key)}
                                        className="hidden"
                                        style={{ display: 'none' }}
                                        tabIndex={-1}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-3 md:px-6 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold touch-manipulation min-h-[48px]"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handleComplete}
                            disabled={!anyPhotoSelected || isUploading}
                            className="flex-1 px-4 py-3 md:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-semibold touch-manipulation min-h-[48px]"
                        >
                            {isUploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <RotateCw size={16} className="animate-spin" />
                                    <span>{hasNewPhotosToUpload ? 'Mengunggah...' : 'Menyimpan...'}</span>
                                </div>
                            ) : (
                                hasNewPhotosToUpload ? 'Simpan & Upload' : 'Simpan'
                            )}
                        </button>
                    </div>
                </div>

                {/* Photo Viewer Modal */}
                {viewingPhoto && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
                        <div className="relative max-w-4xl max-h-full">
                            <button
                                onClick={() => setViewingPhoto(null)}
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors z-10"
                            >
                                <X size={24} />
                            </button>
                            <div className="text-center">
                                <h3 className="text-white text-xl font-semibold mb-4">{viewingPhoto.title}</h3>
                                <Image
                                    src={viewingPhoto.src}
                                    alt={viewingPhoto.title}
                                    width={800}
                                    height={600}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentationModal;

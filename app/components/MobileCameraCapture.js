"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Camera, RotateCw, X, MapPin } from 'lucide-react';

// Loading component for lazy loaded components
const LoadingComponent = ({ message = "Memuat..." }) => (
  <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-slate-600 text-center">{message}</p>
  </div>
);

const MobileCameraCapture = ({ 
    onPhotoCaptured, 
    onClose, 
    title = "Ambil Foto",
    description = "Ambil foto dengan watermark otomatis",
    surveyorName = "Petugas"
}) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Lock background scroll while modal is open (prevents bleed-through issues on mobile)
    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    // Get current location on component mount
    useEffect(() => {
        try {
            getCurrentLocation();
        } catch (e) {
            console.error('MobileCameraCapture: getCurrentLocation init error:', e);
            setLocationError('Gagal mengakses geolokasi pada perangkat ini.');
        }
        // Empty dependency array to avoid TDZ issues on some Android WebView engines
    }, []);

    const getCurrentLocation = useCallback(() => {
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
    }, []);

    const addWatermarkToImage = async (imageDataUrl) => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🔄 MobileCameraCapture: Starting watermark process for Android compatibility');
                
                const img = new Image();
                img.crossOrigin = 'anonymous'; // Add for Android compatibility
                
                img.onload = async () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Android-specific: Ensure canvas context is available
                        if (!ctx) {
                            console.error('❌ Canvas context not available on Android');
                            reject(new Error('Canvas tidak didukung di perangkat ini'));
                            return;
                        }
                        
                        // Resize image to max 1920x1080 while maintaining aspect ratio
                        // Android-specific: Use smaller max size for better performance
                        const MAX_WIDTH = /Android/i.test(navigator.userAgent) ? 1280 : 1920;
                        const MAX_HEIGHT = /Android/i.test(navigator.userAgent) ? 720 : 1080;
                        let { width, height } = img;
                        
                        console.log(`📏 Original image size: ${width}x${height}`);
                        
                        if (width > height && width > MAX_WIDTH) {
                            height = (height * MAX_WIDTH) / width;
                            width = MAX_WIDTH;
                        } else if (height > MAX_HEIGHT) {
                            width = (width * MAX_HEIGHT) / height;
                            height = MAX_HEIGHT;
                        }
                        
                        console.log(`📏 Resized image size: ${width}x${height}`);
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Android-specific: Clear canvas first
                        ctx.clearRect(0, 0, width, height);
                        
                        // Draw the image with error handling
                        try {
                            ctx.drawImage(img, 0, 0, width, height);
                            console.log('✅ Image drawn to canvas successfully');
                        } catch (drawError) {
                            console.error('❌ Error drawing image to canvas:', drawError);
                            reject(new Error('Gagal menggambar gambar ke canvas'));
                            return;
                        }
                        
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
                            locationStr = `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
                            // Skip street name fetch on Android to avoid network issues
                            if (!/Android/i.test(navigator.userAgent)) {
                                try {
                                    const fetchWithTimeout = (url, ms = 2000) => {
                                        const controller = new AbortController();
                                        const id = setTimeout(() => controller.abort(), ms);
                                        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
                                    };
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
                        }
                        
                        // Build watermark text with surveyor name, date/time, location, and street name
                        let watermarkText = `Petugas: ${surveyorName}\n${dateStr} ${timeStr}\n${locationStr}`;
                        if (streetName) {
                            watermarkText += `\n${streetName}`;
                        }
                        
                        // Watermark styling - Android-specific adjustments
                        const fontSize = Math.max(12, Math.min(width, height) * 0.025); // Smaller font for Android
                        ctx.font = `bold ${fontSize}px Arial, sans-serif`; // Add fallback font
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.lineWidth = 2; // Thinner line for Android
                        
                        // Calculate watermark position (bottom right)
                        const lines = watermarkText.split('\n');
                        const lineHeight = fontSize * 1.2; // Tighter line height for Android
                        const padding = 12; // Smaller padding for Android
                        
                        // Draw background rectangle
                        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
                        const rectWidth = maxLineWidth + padding * 2;
                        const rectHeight = lines.length * lineHeight + padding * 2;
                        const rectX = width - rectWidth - 15; // Closer to edge on Android
                        const rectY = height - rectHeight - 15;
                        
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; // Slightly more transparent for Android
                        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                        
                        // Draw text with stroke
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        
                        lines.forEach((line, index) => {
                            const textX = rectX + padding;
                            const textY = rectY + padding + (index * lineHeight);
                            // Draw stroke first
                            ctx.strokeText(line, textX, textY);
                            // Then fill
                            ctx.fillStyle = 'white';
                            ctx.fillText(line, textX, textY);
                        });
                        
                        // Convert to data URL with Android-specific handling
                        try {
                            // Android-specific: Try WebP first, fallback to JPEG if not supported
                            let watermarkedDataUrl;
                            try {
                                watermarkedDataUrl = canvas.toDataURL('image/webp', 0.85); // Lower quality for Android
                                // Check if WebP is actually supported by checking the result
                                if (!watermarkedDataUrl.startsWith('data:image/webp')) {
                                    throw new Error('WebP not supported');
                                }
                                console.log('✅ WebP format used for Android');
                            } catch (webpError) {
                                console.warn('⚠️ WebP not supported on Android, using JPEG');
                                watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            }
                            
                            console.log('✅ MobileCameraCapture: Watermark added successfully for Android');
                            console.log('📏 Final data URL size:', Math.round(watermarkedDataUrl.length / 1024), 'KB');
                            resolve(watermarkedDataUrl);
                            
                        } catch (toDataURLError) {
                            console.error('❌ Error converting canvas to data URL on Android:', toDataURLError);
                            reject(new Error('Gagal mengkonversi gambar pada perangkat Android'));
                        }
                        
                    } catch (canvasError) {
                        console.error('❌ MobileCameraCapture: Canvas processing error on Android:', canvasError);
                        reject(new Error('Gagal memproses gambar dengan watermark pada Android'));
                    }
                };
                
                img.onerror = (error) => {
                    console.error('❌ MobileCameraCapture: Image load error on Android:', error);
                    reject(new Error('Gagal memuat gambar pada perangkat Android'));
                };
                
                // Android-specific: Add timeout for image loading
                const imageLoadTimeout = setTimeout(() => {
                    console.error('❌ Image loading timeout on Android');
                    reject(new Error('Timeout memuat gambar pada Android'));
                }, 10000); // 10 second timeout
                
                img.onload = (originalOnLoad => {
                    return function(...args) {
                        clearTimeout(imageLoadTimeout);
                        return originalOnLoad.apply(this, args);
                    };
                })(img.onload);
                
                img.src = imageDataUrl;
                
            } catch (error) {
                console.error('❌ MobileCameraCapture: Watermark process error on Android:', error);
                reject(error);
            }
        });
    };

    const capturePhoto = async () => {
        setIsCapturing(true);
        
        try {
            // Check if Capacitor Camera is available
            if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
                console.log('📸 MobileCameraCapture: Using Capacitor Camera');
                // Use Capacitor Camera API
                const { Camera } = window.Capacitor.Plugins;
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: false,
                    resultType: 'DATA_URL',
                    source: 'CAMERA'
                });
                
                if (image.dataUrl) {
                    setIsProcessing(true);
                    const watermarkedUrl = await addWatermarkToImage(image.dataUrl);
                    setCapturedImage(watermarkedUrl);
                    console.log('✅ MobileCameraCapture: Capacitor photo captured and processed');
                    setIsProcessing(false);
                }
            } else {
                console.log('📸 MobileCameraCapture: Using file input fallback');
                // Fallback to file input for web browsers
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        setIsProcessing(true);
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            try {
                                const watermarkedUrl = await addWatermarkToImage(e.target.result);
                                setCapturedImage(watermarkedUrl);
                                console.log('✅ MobileCameraCapture: File input photo captured and processed');
                            } catch (error) {
                                console.error('❌ MobileCameraCapture: Error processing photo:', error);
                                alert('Gagal memproses foto. Silakan coba lagi.');
                            } finally {
                                setIsProcessing(false);
                            }
                        };
                        reader.onerror = () => {
                            console.error('❌ MobileCameraCapture: FileReader error');
                            setIsProcessing(false);
                            alert('Gagal membaca file foto. Silakan coba lagi.');
                        };
                        reader.readAsDataURL(file);
                    }
                };
                
                input.click();
            }
        } catch (error) {
            console.error('❌ MobileCameraCapture: Error capturing photo:', error);
            alert('Gagal mengambil foto. Silakan coba lagi.');
        } finally {
            setIsCapturing(false);
        }
    };


    const handleSave = () => {
        if (capturedImage) {
            console.log('✅ MobileCameraCapture: Saving captured image to parent component');
            onPhotoCaptured(capturedImage);
            onClose();
        } else {
            console.warn('⚠️ MobileCameraCapture: No captured image to save');
        }
    };

    const handleRetake = () => {
        console.log('🔄 MobileCameraCapture: Retaking photo');
        setCapturedImage(null);
    };

    return (
        <div className="camera-modal fixed inset-0 bg-black/70 backdrop-blur-md z-[2147483647] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-600">{description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {!capturedImage ? (
                        // Camera/Gallery Selection
                        <div className="space-y-4">
                            {/* Location Status */}
                            <div className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} className={location ? 'text-green-500' : 'text-red-500'} />
                                    <span className="text-sm font-medium text-gray-700">
                                        Status Lokasi
                                    </span>
                                </div>
                                {location ? (
                                    <p className="text-xs text-green-600">
                                        GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                    </p>
                                ) : locationError ? (
                                    <p className="text-xs text-red-600">{locationError}</p>
                                ) : (
                                    <p className="text-xs text-yellow-600">Mendapatkan lokasi...</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={capturePhoto}
                                    disabled={isCapturing || isProcessing}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 font-medium shadow-lg hover:shadow-xl active:scale-95"
                                >
                                    {isCapturing ? (
                                        <RotateCw size={20} className="animate-spin" />
                                    ) : (
                                        <Camera size={20} />
                                    )}
                                    {isCapturing ? 'Mengambil Foto...' : 'Ambil Foto dengan Kamera'}
                                </button>
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 rounded-xl p-3">
                                <p className="text-xs text-blue-700">
                                    📸 Foto akan otomatis ditambahkan watermark dengan koordinat, tanggal, dan jam pengambilan.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Preview Captured Image
                        <div className="space-y-4">
                            <div className="relative">
                                <img 
                                    src={capturedImage} 
                                    alt="Foto yang diambil"
                                    className="w-full h-64 object-cover rounded-xl border border-gray-200"
                                />
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                        <div className="text-center text-white">
                                            <RotateCw size={32} className="animate-spin mx-auto mb-2" />
                                            <p className="text-sm">Memproses foto...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRetake}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors duration-200 font-medium"
                                >
                                    Ambil Ulang
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 font-medium"
                                >
                                    Simpan Foto
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileCameraCapture;

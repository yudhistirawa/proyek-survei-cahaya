'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCw, MapPin, AlertCircle } from 'lucide-react';

// Dynamic import untuk menghindari SSR issues
const cameraUtils = typeof window !== 'undefined' ? 
  import('../../lib/cameraUtils').then(module => module) : 
  Promise.resolve(null);

const CameraModal = ({ isOpen, onClose, onPhotoTaken, title = 'Ambil Foto' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [location, setLocation] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef(null);

  // Inisialisasi kamera saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      // Cleanup saat modal ditutup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setError(null);
      setIsCameraReady(false);
    }
  }, [isOpen]);

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load camera utils dynamically
      const utils = await cameraUtils;
      if (!utils) {
        throw new Error('Kamera tidak tersedia di server-side');
      }

      // Dapatkan lokasi terlebih dahulu
      try {
        const locationData = await utils.getCurrentLocation();
        setLocation(locationData);
      } catch (locationError) {
        console.warn('Tidak dapat mendapatkan lokasi:', locationError);
        // Lanjutkan tanpa lokasi
      }

      // Dapatkan stream kamera
      const cameraStream = await utils.getBackCamera();
      setStream(cameraStream);

      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraReady(true);
          setIsLoading(false);
        };
      }
    } catch (error) {
      console.error('Error initializing camera:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!isCameraReady || !videoRef.current) {
      setError('Kamera belum siap');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load camera utils dynamically
      const utils = await cameraUtils;
      if (!utils) {
        throw new Error('Kamera tidak tersedia di server-side');
      }

      // Ambil foto dengan watermark
      const photoData = await utils.takePhotoFromBackCamera();
      
      // Panggil callback dengan data foto
      onPhotoTaken(photoData);
      
      // Tutup modal
      onClose();
      
    } catch (error) {
      console.error('Error taking photo:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    initializeCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera size={24} />
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Mengakses Kamera</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                >
                  <RotateCw size={16} />
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Menyiapkan Kamera</h3>
                <p className="text-gray-600">Mohon tunggu sebentar...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera Preview */}
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Camera Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white/50 rounded-lg p-2">
                    <div className="w-48 h-32 border border-white/30 rounded"></div>
                  </div>
                </div>
                
                {/* Location Info */}
                {location && (
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <p className="text-gray-600 text-sm">
                  Pastikan objek berada dalam kotak putih
                </p>
                <p className="text-gray-500 text-xs">
                  Foto akan otomatis ditambahkan watermark dengan koordinat dan waktu
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleTakePhoto}
                  disabled={!isCameraReady || isLoading}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Ambil Foto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;

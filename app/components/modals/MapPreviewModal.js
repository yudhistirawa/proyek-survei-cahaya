import React, { useEffect, useState } from 'react';
import { X, MapPin, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { KMZParser } from '../../lib/kmzParser';

// Dynamically import KMZMapComponent to avoid SSR issues
const KMZMapComponent = dynamic(() => import('../admin/task-distribution/KMZMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading map...</p>
      </div>
    </div>
  )
});

export const MapPreviewModal = ({ isOpen, onClose, kmzUrl }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMapError(null);
      setMapData(null);
      const timer = setTimeout(() => setIsVisible(true), 10);
      
      // Parse KMZ data when modal opens
      if (kmzUrl) {
        parseKMZData();
      }
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, kmzUrl]);

  const parseKMZData = async () => {
    if (!kmzUrl) return;

    try {
      setLoading(true);
      setMapError(null);
      
      console.log('MapPreviewModal: Starting to parse KMZ:', kmzUrl);
      
      // Use the KMZ parser to extract map data
      const parsedData = await KMZParser.parseFromUrl(kmzUrl);
      
      console.log('MapPreviewModal: KMZ parsed successfully:', parsedData);
      setMapData(parsedData);
    } catch (error) {
      console.error('MapPreviewModal: Error parsing KMZ:', error);
      setMapError(error.message || 'Gagal memuat file KMZ');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleMapError = (error) => {
    setMapError(error);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Preview Map KMZ</h3>
              <p className="text-blue-100 text-sm">Visualisasi data dari file KMZ</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Map Content */}
        <div className="relative">
          {mapError ? (
            <div className="flex items-center justify-center h-96 bg-gray-50">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Peta</h4>
                <p className="text-gray-600 mb-4">{mapError}</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>• Pastikan file KMZ valid dan tidak rusak</p>
                  <p>• Periksa koneksi internet Anda</p>
                  <p>• Coba refresh halaman dan upload ulang file</p>
                </div>
                <button
                  onClick={parseKMZData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Memuat...' : 'Coba Lagi'}
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-96 bg-gray-50">
              <div className="text-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Memuat Peta KMZ</h4>
                <p className="text-gray-600">Sedang menganalisis file KMZ...</p>
              </div>
            </div>
          ) : mapData ? (
            <div className="h-96 md:h-[600px] w-full">
              <KMZMapComponent mapData={mapData} taskType="existing" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-gray-50">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={24} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Siap Memuat Peta</h4>
                <p className="text-gray-600">Klik untuk memuat preview peta KMZ</p>
                <button
                  onClick={parseKMZData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Muat Peta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {kmzUrl && (
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>File KMZ: {kmzUrl.split('/').pop() || 'Unknown'}</span>
                  </span>
                  {mapData && (
                    <span className="flex items-center space-x-2 text-blue-600">
                      <span>📍 {mapData.coordinates?.length || 0}</span>
                      <span>🔷 {mapData.polygons?.length || 0}</span>
                      <span>📏 {mapData.lines?.length || 0}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


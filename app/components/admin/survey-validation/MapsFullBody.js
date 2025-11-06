'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Info, Layers, Filter, ExternalLink } from 'lucide-react';

const MapsFullBody = ({ surveyData }) => {
  const [showLegend, setShowLegend] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // Debug logging
  console.log('🗺️ MapsFullBody rendered with data:', surveyData);
  console.log('📍 Data length:', surveyData?.length || 0);

  const getCollectionStats = () => {
    if (!surveyData) return { total: 0, existing: 0, apj: 0 };
    
    const total = surveyData.length;
    const existing = surveyData.filter(s => s.collectionName === 'Survey_Existing_Report').length;
    const apj = surveyData.filter(s => s.collectionName === 'Tiang_APJ_Propose_Report').length;
    
    return { total, existing, apj };
  };

  const stats = getCollectionStats();

  const handleViewMap = (coordinates) => {
    if (coordinates) {
      const coords = coordinates.split(',').map(coord => coord.trim());
      if (coords.length === 2) {
        const [lat, lng] = coords;
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
        window.open(googleMapsUrl, '_blank');
      }
    }
  };

  // If no data, show empty state
  if (!surveyData || surveyData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Maps Survey Valid</h3>
              <p className="text-sm text-gray-600">Visualisasi titik koordinat survey yang sudah divalidasi</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 text-center">
          <div className="text-6xl mb-4 opacity-50">🗺️</div>
          <h4 className="text-lg font-semibold text-gray-600 mb-2">Belum Ada Data Survey Valid</h4>
          <p className="text-gray-500">
            Maps akan muncul di sini setelah ada survey yang divalidasi dan dipindahkan ke collection Valid_Survey_Data
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Info:</strong> Data survey yang sudah divalidasi akan otomatis muncul di maps ini
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Maps Survey Valid</h3>
            <p className="text-sm text-gray-600">Visualisasi titik koordinat survey yang sudah divalidasi</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Layers size={16} />
            <span>{showLegend ? 'Sembunyikan' : 'Tampilkan'} Legenda</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Survey</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.existing}</div>
              <div className="text-xs text-gray-600">Survey Existing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.apj}</div>
              <div className="text-xs text-gray-600">Survey APJ</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Data dari collection: <span className="font-semibold text-green-600">Valid_Survey_Data</span>
          </div>
        </div>
      </div>

      {/* Map Container - Simplified for now */}
      <div className="relative p-6">
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h4 className="text-lg font-semibold text-gray-700 mb-2">Maps Survey Valid</h4>
          <p className="text-gray-600 mb-4">
            Menampilkan {stats.total} titik koordinat survey yang sudah divalidasi
          </p>
          
          {/* Survey Points List */}
          <div className="mt-6 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveyData.map((survey, index) => (
                <div 
                  key={survey.id || index}
                  className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    survey.collectionName === 'Survey_Existing_Report' 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-blue-200 bg-blue-50'
                  }`}
                  onClick={() => setSelectedSurvey(selectedSurvey === survey ? null : survey)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      survey.collectionName === 'Survey_Existing_Report' 
                        ? 'bg-red-500' 
                        : 'bg-blue-500'
                    }`}></div>
                    <span className="text-xs font-medium text-gray-500">
                      {survey.collectionName === 'Survey_Existing_Report' ? '🔴 Existing' : '🔵 APJ'}
                    </span>
                  </div>
                  
                  <h5 className="font-semibold text-gray-900 text-sm mb-1">
                    {survey.namaJalan || survey.idTitik || 'Nama Jalan Tidak Diketahui'}
                  </h5>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>ID:</strong> {survey.idTitik || 'N/A'}</p>
                    <p><strong>Surveyor:</strong> {survey.surveyorName || 'N/A'}</p>
                    <p><strong>Koordinat:</strong> {survey.titikKordinat || 'N/A'}</p>
                  </div>
                  
                  {survey.titikKordinat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMap(survey.titikKordinat);
                      }}
                      className="mt-2 w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={12} />
                      Lihat di Google Maps
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        {showLegend && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px]">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info size={16} className="text-blue-600" />
              Legenda
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                <span className="text-gray-700">Survey Existing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                <span className="text-gray-700">Survey APJ Propose</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600">
                  Klik titik untuk melihat detail
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Total Titik:</span> {stats.total} • 
            <span className="font-medium ml-2">Klik:</span> Titik survey untuk detail • 
            <span className="font-medium ml-2">Maps:</span> Gunakan tombol &quot;Lihat di Google Maps&quot;
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapsFullBody;

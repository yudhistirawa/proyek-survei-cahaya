'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

const MapsFullBodyTest = ({ surveyData }) => {
  console.log('🧪 MapsFullBodyTest rendered with data:', surveyData);
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Maps Survey Valid (Test)</h3>
            <p className="text-sm text-gray-600">Test component untuk MapsFullBody</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Debug Info:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Data Type:</strong> {typeof surveyData}</p>
            <p><strong>Is Array:</strong> {Array.isArray(surveyData) ? 'Yes' : 'No'}</p>
            <p><strong>Data Length:</strong> {surveyData?.length || 0}</p>
            <p><strong>Data Content:</strong></p>
            <pre className="bg-white p-2 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(surveyData, null, 2)}
            </pre>
          </div>
        </div>
        
        {surveyData && surveyData.length > 0 ? (
          <div className="mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">Sample Data:</h4>
            <div className="space-y-2">
              {surveyData.slice(0, 3).map((survey, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <p><strong>Nama Jalan:</strong> {survey.namaJalan || 'N/A'}</p>
                  <p><strong>Koordinat:</strong> {survey.titikKordinat || 'N/A'}</p>
                  <p><strong>Collection:</strong> {survey.collectionName || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center text-gray-500">
            Tidak ada data survey yang divalidasi
          </div>
        )}
      </div>
    </div>
  );
};

export default MapsFullBodyTest;

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KMZParser } from '../../../lib/kmzParser';

// Dynamic import untuk KMZ Map Component
const KMZMapComponent = dynamic(() => import('./KMZMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-900 text-sm">Memuat peta...</p>
      </div>
    </div>
  )
});

const TaskDetailModal = ({ isOpen, onClose, task, onDelete }) => {
  const [mapData, setMapData] = useState(null);
  const [loadingMapData, setLoadingMapData] = useState(false);

  // Load KMZ data when modal opens and task has file data
  useEffect(() => {
    if (isOpen && task?.fileData?.downloadURL && task.taskType === 'existing') {
      loadKMZData();
    } else {
      setMapData(null);
    }
  }, [isOpen, task]);

  const loadKMZData = async () => {
    try {
      setLoadingMapData(true);
      
      console.log('TaskDetailModal: Loading KMZ data from:', task.fileData.downloadURL);
      
      // Use the KMZ parser to extract map data
      const parsedData = await KMZParser.parseFromUrl(task.fileData.downloadURL);
      
      console.log('TaskDetailModal: KMZ parsed successfully:', parsedData);
      setMapData(parsedData);
    } catch (error) {
      console.error('TaskDetailModal: Error loading KMZ data:', error);
      setMapData(null);
    } finally {
      setLoadingMapData(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {task.title || 'Detail Tugas'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {task.taskType === 'existing' ? 'Tugas Zona Existing' : 'Tugas Propose'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Task Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Tugas</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surveyor</label>
                    <p className="text-gray-900">{task.surveyorName}</p>
                    {task.surveyorEmail && (
                      <p className="text-sm text-gray-500">{task.surveyorEmail}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <p className="text-gray-900">{task.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status?.replace('_', ' ') || 'assigned'}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'medium'}
                      </span>
                    </div>
                  </div>

                  {task.deadline && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <p className="text-gray-900">
                        {new Date(task.deadline).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dibuat</label>
                    <p className="text-gray-900">
                      {new Date(task.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">oleh {task.createdByName}</p>
                  </div>

                  {task.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                      <p className="text-gray-900">{task.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* File Information */}
              {task.fileData && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">File Terlampir</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.fileData.fileName}</p>
                        <p className="text-sm text-gray-500">
                          Diupload pada {new Date(task.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <a
                        href={task.fileData.downloadURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Map Display */}
            <div className="space-y-6">
              {task.taskType === 'existing' && task.fileData && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Peta</h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {loadingMapData ? (
                      <div className="h-64 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-gray-900 text-sm">Memuat data peta...</p>
                        </div>
                      </div>
                    ) : mapData ? (
                      <div className="h-64">
                        <KMZMapComponent mapData={mapData} taskType={task.taskType} />
                      </div>
                    ) : (
                      <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                          </svg>
                          <p className="text-gray-900 font-medium mb-2">Peta Tidak Tersedia</p>
                          <p className="text-gray-500 text-sm">
                            Tidak dapat memuat data peta dari file KMZ
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {mapData && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-blue-900 text-sm font-medium">
                          Data peta: {mapData.coordinates?.length || 0} koordinat, {mapData.polygons?.length || 0} polygon, {mapData.lines?.length || 0} garis
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Propose Data */}
              {task.taskType === 'propose' && task.proposeData && task.proposeData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Propose</h3>
                  <div className="space-y-3">
                    {task.proposeData.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.area}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              {typeof onDelete === 'function' && (
                <button
                  onClick={() => onDelete(task)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
                >
                  Hapus Tugas
                </button>
              )}
            </div>
            <div>
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
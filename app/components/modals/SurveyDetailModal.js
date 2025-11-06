// app/components/modals/SurveyDetailModal.js
'use client';

import PhotoReviewModal from './PhotoReviewModal';

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, User, Calendar, Camera, FileText, Clock, CheckCircle, XCircle, Edit, Eye, ExternalLink, ChevronRight, ChevronDown, Database } from 'lucide-react';

const SurveyDetailModal = ({ isOpen, onClose, surveyData, onEdit }) => {
  const modalRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    photos: true,
    validation: false
  });

  // State for photo review modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Auto-focus modal when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
      // Add focus trap
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Helpers to read values with flexible fallback keys
  const getVal = (...keys) => {
    for (const k of keys) {
      const v = surveyData?.[k];
      if (v !== undefined && v !== null && String(v).toString().trim() !== '') return v;
    }
    return '';
  };
  
  const isAPJPropose = (
    String(surveyData?.collectionName || '').toLowerCase() === 'apj_propose_tiang' ||
    String(surveyData?.collectionName || '').toLowerCase() === 'tiang_apj_propose_report' ||
    String(surveyData?.collectionName || '').toLowerCase() === 'survey_apj_propose' ||
    String(surveyData?.surveyCategory || '').toLowerCase() === 'survey_apj_propose'
  );

  if (!isOpen || !surveyData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Menunggu Validasi' },
      'validated': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Tervalidasi' },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, text: 'Ditolak' }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <IconComponent size={12} className="mr-1" />
        {config.text}
      </span>
    );
  };

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

  const renderField = (label, value, icon = null, isCoordinate = false) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        {icon && <div className="text-gray-400">{icon}</div>}
        <span className="text-sm font-medium text-gray-800 min-w-[120px]">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        {isCoordinate && value ? (
          <>
            <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1 rounded-lg border">
              {value}
            </span>
            <button
              onClick={() => handleViewMap(value)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Lihat di Google Maps"
            >
              <ExternalLink size={14} />
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-900 font-medium">{value || 'Tidak diisi'}</span>
        )}
      </div>
    </div>
  );

  const renderPhotoSection = (title, photoUrl, description = '') => {
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
        {photoUrl ? (
          <div className="relative group">
            <img
              src={photoUrl}
              alt={title}
              className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer"
              loading="lazy"
              onClick={() => {
                setSelectedImage({ src: photoUrl, alt: title, title, subtitle: description });
                setPhotoModalOpen(true);
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={() => window.open(photoUrl, '_blank')}
                className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 p-2 rounded-full transition-all duration-200"
                title="Lihat foto dalam ukuran penuh"
              >
                <Eye size={16} className="text-gray-700" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center">
              <Camera size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Tidak ada foto</p>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
          </div>
        )}
        {description && photoUrl && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </div>
    );
  };

  const getCollectionInfo = () => {
    const collectionConfig = {
      // New collections
      'survey_existing': {
        name: 'Survey Existing',
        color: 'bg-blue-100 text-blue-800',
        icon: '🗂️'
      },
      'apj_propose_tiang': {
        name: 'Survey APJ Propose',
        color: 'bg-green-100 text-green-800',
        icon: '💡'
      },
      // Legacy collections (backward compatibility)
      'Survey_Existing_Report': {
        name: 'Survey Existing',
        color: 'bg-blue-100 text-blue-800',
        icon: '🗂️'
      },
      'APJ_Propose_Tiang': {
        name: 'Survey APJ Propose',
        color: 'bg-green-100 text-green-800',
        icon: '💡'
      },
      'Tiang_APJ_Propose_Report': {
        name: 'Survey APJ Propose',
        color: 'bg-green-100 text-green-800',
        icon: '💡'
      }
    };
    const config = collectionConfig[surveyData.collectionName] || {
      name: surveyData.collectionName,
      color: 'bg-gray-100 text-gray-800',
      icon: '📄'
    };
    return config;
  };

  const collectionInfo = getCollectionInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-100 animate-in fade-in-0 zoom-in-95 duration-300 focus:outline-none relative flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modern Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-teal-600/20"></div>
          <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
          <div className="relative z-10 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText size={28} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">📋</span>
                  </div>
                </div>
                <div>
                  <h2 id="modal-title" className="text-3xl font-bold text-white mb-2">Detail Survey</h2>
                  <div className="flex items-center space-x-3">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                      {collectionInfo.name}
                    </span>
                    {getStatusBadge(surveyData.status)}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="group w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
              >
                <X size={24} className="text-white group-hover:scale-110 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 bg-gradient-to-br from-gray-50/50 to-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Dasar</h3>
                  <div className="space-y-3">
                    {/* APJ Propose layout */}
                    {isAPJPropose ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">ID Titik</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {(() => {
                              const ada = String(getVal('adaIdTitik','AdaIdTitik')).toLowerCase();
                              const id = getVal('idTitik','IdTitik','IDTitik');
                              if (ada && ada !== 'ada') return 'Tidak Ada';
                              return id || 'Tidak diisi';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Data Daya</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('dataDaya','DataDaya','daya') || 'Tidak diisi'}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Data Tiang</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('dataTiang','DataTiang','tiang') || 'Tidak diisi'}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Data Ruas</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('dataRuas','DataRuas','ruas') || 'Tidak diisi'}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Nama Jalan</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('namaJalan','NamaJalan','lokasi') || 'Tidak diisi'}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Jarak Antar Tiang (m)</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('jarakAntarTiang','JarakAntarTiang') || 'Tidak diisi'}</span>
                        </div>
                        <div className="py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Titik Koordinat</span>
                            <span className="text-sm text-gray-900 font-mono">{getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation') || 'Tidak diisi'}</span>
                          </div>
                        </div>
                        {/* Lebar Jalan Group */}
                        <div className="mb-2">
                          <h4 className="text-xs font-semibold text-gray-700 mb-1">Lebar Jalan</h4>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-blue-600 font-medium">Jalan 1</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('lebarJalan1','LebarJalan1') ? `${getVal('lebarJalan1','LebarJalan1')}m` : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600 font-medium">Jalan 2</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('lebarJalan2','LebarJalan2') ? `${getVal('lebarJalan2','LebarJalan2')}m` : '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-800">Lebar Bahu Bertiang (m)</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('lebarBahuBertiang','LebarBahuBertiang') || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-800">Lebar Trotoar Bertiang (m)</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('lebarTrotoarBertiang','LebarTrotoarBertiang') || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-800">Lainnya Bertiang</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('lainnyaBertiang','LainnyaBertiang') || '-'}</span>
                        </div>
                        {getVal('median') === 'Ada' && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-gray-800">Median Jalan</span>
                            <span className="text-sm text-gray-900 font-medium">
                              {`T: ${getVal('tinggiMedian') || '-'}m, L: ${getVal('lebarMedian') || '-'}m`}
                            </span>
                          </div>
                        )}
                        <div className="py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Keterangan</span>
                            <span className="text-sm text-gray-900 font-medium">{getVal('keterangan','Keterangan') || 'kosong'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Survey Existing layout - Complete details like in Survey Existing page */
                      <div className="space-y-3">
                        {/* Lokasi Section */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <MapPin size={14} className="mr-2 text-blue-500" />
                            Lokasi
                          </h4>
                          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-blue-600 font-medium">Jalan</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('namaJalan','NamaJalan') || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600 font-medium">Gang</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('namaGang','NamaGang') || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Lebar Jalan Section */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Lebar Jalan</h4>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-blue-600 font-medium">Jalan 1</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('lebarJalan1','LebarJalan1') ? `${getVal('lebarJalan1','LebarJalan1')}m` : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600 font-medium">Jalan 2</span>
                              <span className="text-sm text-gray-900 font-semibold">{getVal('lebarJalan2','LebarJalan2') ? `${getVal('lebarJalan2','LebarJalan2')}m` : '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Kepemilikan Tiang */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Kepemilikan Tiang</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {(() => {
                              const kepemilikan = getVal('kepemilikanTiang','KepemilikanTiang');
                              const jenisPLN = getVal('jenisTiangPLN','JenisTiangPLN');
                              if (kepemilikan === 'PLN' && jenisPLN) {
                                return `PLN - ${jenisPLN}`;
                              }
                              return kepemilikan || '-';
                            })()}
                          </span>
                        </div>

                        {/* Jenis Tiang */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Jenis Tiang</span>
                          <span className="text-sm text-gray-900 font-medium">{getVal('jenisTiang','JenisTiang') || '-'}</span>
                        </div>

                        {/* Trafo */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Trafo</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {(() => {
                              const trafo = getVal('trafo','Trafo');
                              const jenisTrafo = getVal('jenisTrafo','JenisTrafo');
                              const tinggiTrafo = getVal('tinggiBawahTrafo','TinggiBawahTrafo');
                              if (trafo === 'Ada' && jenisTrafo) {
                                const heightInfo = tinggiTrafo ? ` (${tinggiTrafo}m)` : '';
                                return `Ada - ${jenisTrafo}${heightInfo}`;
                              }
                              return trafo || '-';
                            })()}
                          </span>
                        </div>

                        {/* Lampu */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-800">Lampu</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {(() => {
                              const lampu = getVal('lampu','Lampu');
                              const jumlahLampu = getVal('jumlahLampu','JumlahLampu');
                              const jenisLampu = getVal('jenisLampu','JenisLampu');
                              if (lampu === 'Ada' && jumlahLampu && jenisLampu) {
                                return `Ada - ${jumlahLampu} - ${jenisLampu}`;
                              } else if (lampu === 'Ada' && jumlahLampu) {
                                return `Ada - ${jumlahLampu}`;
                              }
                              return lampu || '-';
                            })()}
                          </span>
                        </div>

                        {/* Titik Koordinat */}
                        <div className="py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800 flex items-center">
                              <MapPin size={14} className="mr-2 text-green-500" />
                              Titik Koordinat
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900 font-mono bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                                {getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation') || 'Tidak diisi'}
                              </span>
                              {getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation') && (
                                <button
                                  onClick={() => handleViewMap(getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation'))}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Lihat di Google Maps"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-green-600 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Lokasi berhasil didapatkan
                          </div>
                        </div>

                        {/* Additional Fields */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-gray-800">Lebar Bahu Bertiang (m)</span>
                            <span className="text-sm text-gray-900 font-medium">{getVal('lebarBahuBertiang','LebarBahuBertiang') || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-gray-800">Lebar Trotoar Bertiang (m)</span>
                            <span className="text-sm text-gray-900 font-medium">{getVal('lebarTrotoarBertiang','LebarTrotoarBertiang') || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-gray-800">Lainnya Bertiang</span>
                            <span className="text-sm text-gray-900 font-medium">{getVal('lainnyaBertiang','LainnyaBertiang') || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-gray-800">Tinggi ARM (m)</span>
                            <span className="text-sm text-gray-900 font-medium">{getVal('tinggiARM','TinggiARM') || '-'}</span>
                          </div>
                        </div>

                        {/* Keterangan */}
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-gray-800">Keterangan</span>
                            <span className="text-sm text-gray-900 font-medium text-right max-w-xs">
                              {getVal('keterangan','Keterangan') || 'Tidak ada keterangan'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Photos */}
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Dokumentasi Foto</h3>
                  <div className="space-y-4">
                    {renderPhotoSection('Foto Titik Aktual', surveyData.fotoTitikAktual, 'Foto kondisi titik survey saat ini')}
                    {isAPJPropose
                      ? renderPhotoSection('Foto Kemerataan', surveyData.fotoKemerataan, 'Foto kemerataan area')
                      : renderPhotoSection('Foto Tinggi ARM', surveyData.fotoTinggiARM, 'Foto pengukuran tinggi ARM')}

                    {/* Fields edited by admin */}
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      {renderField('Titik Koordinat Baru', getVal('titikKordinatBaru','TitikKordinatBaru','titikKoordinatBaru','TitikKoordinatBaru') || 'kosong', <MapPin size={14} />, Boolean(getVal('titikKordinatBaru','TitikKordinatBaru','titikKoordinatBaru','TitikKoordinatBaru')))}
                      {renderField('Nama Jalan Baru', getVal('namaJalanBaru','NamaJalanBaru','nama_jalan_baru') || 'kosong', <FileText size={14} />)}
                    </div>

                    {!surveyData.fotoTitikAktual && !surveyData.fotoTinggiARM && !surveyData.fotoKemerataan && (
                      <div className="text-center py-8 text-gray-500">
                        <Camera size={48} className="mx-auto mb-2 text-gray-300" />
                        <p>Tidak ada foto dokumentasi</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Footer */}
        <div className="relative bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-t border-gray-200/60 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/20 to-teal-50/30"></div>
          <div className="relative z-10 p-6 flex justify-between items-center min-h-[80px]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database size={16} className="text-blue-600" />
              </div>
              <div className="text-sm text-gray-600">
                <div className="font-medium">ID: {surveyData.id}</div>
                <div className="text-xs text-gray-500">Collection: {surveyData.collectionName}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onEdit}
                className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <Edit size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                <span className="font-medium">Edit Survey</span>
              </button>
              <button
                onClick={onClose}
                className="group bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-medium">Tutup</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Photo Review Modal */}
      <PhotoReviewModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        image={selectedImage}
      />
    </div>
  );
};

export default SurveyDetailModal;

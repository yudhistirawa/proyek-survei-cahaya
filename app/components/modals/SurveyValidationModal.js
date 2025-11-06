// app/components/modals/SurveyValidationModal.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, FileText, Database } from 'lucide-react';

const SurveyValidationModal = ({ isOpen, onClose, surveyData, onValidate }) => {
  const modalRef = useRef(null);
  const notesRef = useRef(null);
  const [action, setAction] = useState('approve');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-focus modal and notes field when it opens
  useEffect(() => {
    if (isOpen) {
      if (modalRef.current) {
        modalRef.current.focus();
      }
      // Focus on notes field after a short delay
      setTimeout(() => {
        if (notesRef.current) {
          notesRef.current.focus();
        }
      }, 100);
      
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

  if (!isOpen || !surveyData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      alert('Mohon isi catatan validasi');
      return;
    }

    setIsSubmitting(true);
    try {
      await onValidate(surveyData.id, action, notes);
      onClose();
      setNotes('');
      setAction('approve');
    } catch (error) {
      alert(`Gagal memvalidasi survey: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCollectionInfo = () => {
    const collectionConfig = {
      'Survey_Existing_Report': {
        name: 'Survey Existing',
        color: 'bg-blue-100 text-blue-800',
        icon: '🗂️'
      },
      'APJ_Propose_Tiang': {
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

  // Helpers to read values with flexible fallback keys
  const getVal = (...keys) => {
    for (const k of keys) {
      const v = surveyData[k];
      if (v !== undefined && v !== null && String(v).toString().trim() !== '') return v;
    }
    return '';
  };
  const isAPJPropose = (
    String(surveyData?.collectionName || '').toLowerCase() === 'apj_propose_tiang' ||
    String(surveyData?.collectionName || '').toLowerCase() === 'survey_apj_propose' ||
    String(surveyData?.collectionName || '').toLowerCase() === 'tiang_apj_propose_report' ||
    String(surveyData?.surveyCategory || '').toLowerCase() === 'survey_apj_propose'
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20 animate-in fade-in-0 zoom-in-95 duration-300 focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50/80 to-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
              <CheckCircle size={24} className="text-white" />
            </div>
            <div>
                             <h2 id="modal-title" className="text-2xl font-bold text-indigo-900">Validasi Survey</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${collectionInfo.color}`}>
                  <span className="mr-1.5">{collectionInfo.icon}</span>
                  {collectionInfo.name}
                </span>
                                 <span className="text-xs text-gray-800 bg-gray-100 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
                   <Database size={10} />
                   {surveyData.collectionName}
                 </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-gradient-to-br from-gray-50/50 to-white/50">
          {/* Survey Info */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 shadow-lg mb-6">
                         <h3 className="text-lg font-semibold text-gray-800 mb-3">Informasi Survey</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Nama Jalan:</span>
                <p className="font-semibold text-gray-900">{getVal('namaJalan','NamaJalan')}</p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">ID Titik:</span>
                <p className="font-semibold text-gray-900">{getVal('idTitik','IdTitik','IDTitik')}</p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Surveyor:</span>
                <p className="font-semibold text-gray-900">{getVal('surveyorName','SurveyorName','namaPetugas','NamaPetugas')}</p>
              </div>
              <div>
                                <span className="text-gray-700 font-medium">Tanggal Survey:</span>
                <p className="font-semibold text-gray-900">
                  {surveyData.createdAt ? new Date(surveyData.createdAt).toLocaleDateString('id-ID') : 'Tidak diisi'}
                </p>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-700 font-medium">Koordinat:</span>
                <p className="font-semibold text-gray-900 font-mono">{getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation')}</p>
              </div>
            </div>
          </div>

          {/* Detail Survey APJ Propose (mirroring form) */}
          {isAPJPropose && (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 shadow-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Dasar - APJ Propose</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: data fields in requested order */}
                <div className="space-y-3 text-sm">
                  {/* Id Titik */}
                  <div>
                    <span className="text-gray-700 font-medium">ID Titik</span>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const ada = String(getVal('adaIdTitik','AdaIdTitik')).toLowerCase();
                        const id = getVal('idTitik','IdTitik','IDTitik');
                        if (ada && ada !== 'ada') return 'Tidak Ada';
                        return id || '';
                      })()}
                    </p>
                  </div>
                  {/* Data Daya */}
                  <div>
                    <span className="text-gray-700 font-medium">Data Daya</span>
                    <p className="font-semibold text-gray-900">{getVal('dataDaya','DataDaya','daya')}</p>
                  </div>
                  {/* Data Tiang */}
                  <div>
                    <span className="text-gray-700 font-medium">Data Tiang</span>
                    <p className="font-semibold text-gray-900">{getVal('dataTiang','DataTiang','tiang')}</p>
                  </div>
                  {/* Data Ruas */}
                  <div>
                    <span className="text-gray-700 font-medium">Data Ruas</span>
                    <p className="font-semibold text-gray-900">{getVal('dataRuas','DataRuas','ruas')}</p>
                    {getVal('dataRuasSub','DataRuasSub') && (
                      <p className="text-xs text-gray-600 mt-1">Sub: {getVal('dataRuasSub','DataRuasSub')}</p>
                    )}
                  </div>
                  {/* Nama Jalan */}
                  <div>
                    <span className="text-gray-700 font-medium">Nama Jalan</span>
                    <p className="font-semibold text-gray-900">{getVal('namaJalan','NamaJalan')}</p>
                  </div>
                  {/* Jarak Antar Tiang */}
                  <div>
                    <span className="text-gray-700 font-medium">Jarak Antar Tiang (m)</span>
                    <p className="font-semibold text-gray-900">{getVal('jarakAntarTiang','JarakAntarTiang','jarak')}</p>
                  </div>
                  {/* Titik Koordinat */}
                  <div>
                    <span className="text-gray-700 font-medium">Titik Koordinat</span>
                    <p className="font-semibold text-gray-900 font-mono">{getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation')}</p>
                  </div>
                  {/* Lebar Jalan (gabungan) */}
                  <div>
                    <span className="text-gray-700 font-medium">Lebar Jalan</span>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const l1 = getVal('lebarJalan1','LebarJalan1');
                        const l2 = getVal('lebarJalan2','LebarJalan2');
                        if (l1 && l2) return `Jalan 1 ${l1} • Jalan 2 ${l2}`;
                        if (l1) return `Jalan 1 ${l1}`;
                        if (l2) return `Jalan 2 ${l2}`;
                        return '';
                      })()}
                    </p>
                  </div>
                  {/* Lebar Bahu Bertiang */}
                  <div>
                    <span className="text-gray-700 font-medium">Lebar Bahu Bertiang</span>
                    <p className="font-semibold text-gray-900">{getVal('lebarBahuBertiang','LebarBahuBertiang')}</p>
                  </div>
                  {/* Lebar Trotoar */}
                  <div>
                    <span className="text-gray-700 font-medium">Lebar Trotoar</span>
                    <p className="font-semibold text-gray-900">{getVal('lebarTrotoarBertiang','LebarTrotoarBertiang')}</p>
                  </div>
                  {/* Lainnya Bertiang */}
                  <div>
                    <span className="text-gray-700 font-medium">Lainnya Bertiang</span>
                    <p className="font-semibold text-gray-900">{getVal('lainnyaBertiang','LainnyaBertiang')}</p>
                  </div>
                  {/* Keterangan */}
                  <div>
                    <span className="text-gray-700 font-medium">Keterangan</span>
                    <p className="font-semibold text-gray-900">{getVal('keterangan','Keterangan')}</p>
                  </div>
                </div>

                {/* RIGHT: photos */}
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Foto Titik Aktual</span>
                    {getVal('fotoTitikAktual') ? (
                      <img src={getVal('fotoTitikAktual')} alt="Foto Titik Aktual" className="w-full h-56 object-cover rounded-lg border" />
                    ) : (
                      <div className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">Tidak ada foto</div>
                    )}
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">Foto Kemerataan</span>
                    {getVal('fotoKemerataan') ? (
                      <img src={getVal('fotoKemerataan')} alt="Foto Kemerataan" className="w-full h-56 object-cover rounded-lg border" />
                    ) : (
                      <div className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">Tidak ada foto</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pilih Aksi Validasi
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  action === 'approve' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => setAction(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      action === 'approve' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {action === 'approve' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={20} className="text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Setujui</div>
                        <div className="text-sm text-gray-500">Survey akan dipindahkan ke Data Survey Valid</div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  action === 'reject' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      action === 'reject' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}>
                      {action === 'reject' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle size={20} className="text-red-600" />
                      <div>
                        <div className="font-medium text-gray-900">Tolak</div>
                        <div className="text-sm text-gray-500">Survey akan ditolak dan dihapus</div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Validasi <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={notesRef}
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder={`Masukkan catatan untuk ${action === 'approve' ? 'persetujuan' : 'penolakan'} survey ini...`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Catatan ini akan disimpan bersama dengan data validasi
              </p>
            </div>

            {/* Warning */}
            <div className={`p-4 rounded-lg border ${
              action === 'approve' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className={`mt-0.5 ${
                  action === 'approve' ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <h4 className={`font-medium ${
                    action === 'approve' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {action === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    action === 'approve' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {action === 'approve' 
                      ? 'Survey akan dipindahkan ke collection "Valid_Survey_Data" dan dihapus dari collection asli. Tindakan ini tidak dapat dibatalkan.'
                      : 'Survey akan dihapus dari database. Tindakan ini tidak dapat dibatalkan.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
          <div className="text-sm text-gray-600">
            ID: {surveyData.id} • Collection: {surveyData.collectionName}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !notes.trim()}
              className={`px-6 py-2 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                isSubmitting || !notes.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  {action === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>{action === 'approve' ? 'Setujui Survey' : 'Tolak Survey'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyValidationModal;

'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Calendar, Camera, FileText, Clock, CheckCircle, XCircle, Edit2 } from 'lucide-react';

const UniversalSurveyDetailModal = ({ isOpen, onClose, surveyId, surveyType, onEdit }) => {
  const [surveyData, setSurveyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && surveyId) {
      fetchSurveyDetail();
    }
  }, [isOpen, surveyId]);

  const fetchSurveyDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/survey-validation?id=${surveyId}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil detail survey');
      }
      const data = await response.json();
      setSurveyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Menunggu Validasi' },
      'validated': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Tervalidasi' },
      'rejected': { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Ditolak' }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent size={12} className="mr-1" />
        {config.text}
      </span>
    );
  };

  const getSurveyTitle = () => {
    const titles = {
      'arm': 'Detail Data ARM',
      'apj-propose': 'Detail Tiang APJ Propose',
      'apj-new': 'Detail Tiang APJ New',
      'trafo': 'Detail Data Trafo',
      'fasos-fasum': 'Detail Data Fasos Fasum'
    };
    return titles[surveyType] || 'Detail Survey';
  };

  const renderField = (label, value, icon = null) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-900 font-medium">{value || 'N/A'}</span>
        <Edit2 size={14} className="text-gray-400" />
      </div>
    </div>
  );

  const renderImageField = (label, imageData) => (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-2 mb-2">
        <Camera size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      {imageData ? (
        <div className="relative group">
          <img
            src={imageData}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(imageData, '_blank')}
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Klik untuk memperbesar
          </div>
        </div>
      ) : (
        <div className="w-full h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <Camera size={20} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Tidak ada foto</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderARMFields = () => (
    <>
      {renderField('Data Kepemilikan Tiang', surveyData.kepemilikanTiang)}
      {renderField('Jenis Tiang', surveyData.jenisTiang)}
      {renderField('Trafo', surveyData.trafo)}
      {renderField('Jenis Trafo', surveyData.jenisTrafo)}
      {renderField('Lampu', surveyData.lampu)}
      {renderField('Jumlah Lampu', surveyData.jumlahLampu)}
      {renderField('Jenis Lampu', surveyData.jenisLampu)}
      {renderField('Titik Koordinat', surveyData.titikKordinat)}
      {renderField('Lebar Jalan 1', surveyData.lebarJalan1)}
      {renderField('Lebar Jalan 2', surveyData.lebarJalan2)}
      {renderField('Lebar Bahu Tiang', surveyData.lebarBahuBertiang)}
      {renderField('Lebar Trotoar', surveyData.lebarTrotoarBertiang)}
      {renderField('Lainnya Bertiang', surveyData.lainnyaBertiang)}
      {renderField('Tinggi ARM', surveyData.tinggiARM)}
      {renderImageField('Foto Tinggi ARM', surveyData.fotoTinggiARM)}
      {renderImageField('Foto Titik Aktual', surveyData.fotoTitikAktual)}
      {surveyData.titikKordinatBaruDariAdmin && renderField('Titik Koordinat Baru Dari Admin', surveyData.titikKordinatBaruDariAdmin)}
    </>
  );

  const renderAPJProposeFields = () => (
    <>
      {renderField('ID Tiang', surveyData.idTiang)}
      {renderField('Trafo', surveyData.trafo)}
      {renderField('Jenis', surveyData.jenis)}
      {renderField('Daya', surveyData.daya)}
      {renderField('Nama Jalan', surveyData.namaJalan)}
      {renderField('Jumlah Lampu Tiang', surveyData.jumlahLampuTiang)}
      {renderField('Titik Koordinat', surveyData.titikKordinat)}
      {renderField('Lebar Jalan 1', surveyData.lebarJalan1)}
      {renderField('Lebar Jalan 2', surveyData.lebarJalan2)}
      {renderField('Lebar Bahu Tiang', surveyData.lebarBahuTiang)}
      {renderField('Lebar Trotoar', surveyData.lebarTrotoar)}
      {renderField('Keterangan', surveyData.keterangan)}
      {surveyData.titikKordinatBaruDariAdmin && renderField('Titik Koordinat Baru Dari Admin', surveyData.titikKordinatBaruDariAdmin)}
    </>
  );

  const renderAPJNewFields = () => (
    <>
      {renderField('Nama Jalan', surveyData.namaJalan)}
      {renderField('Jenis Jalan Tiang', surveyData.jenisJalanTiang)}
      {renderField('Titik Koordinat', surveyData.titikKordinat)}
      {renderField('Lebar Jalan 1', surveyData.lebarJalan1)}
      {renderField('Lebar Jalan 2', surveyData.lebarJalan2)}
      {renderField('Lebar Bahu Tiang', surveyData.lebarBahuTiang)}
      {renderField('Lebar Trotoar', surveyData.lebarTrotoar)}
      {renderField('Lainnya Bertiang', surveyData.lainnyaBertiang)}
      {renderImageField('Foto Titik Aktual', surveyData.fotoTitikAktual)}
      {renderField('Keterangan', surveyData.keterangan)}
      {surveyData.titikKordinatBaruDariAdmin && renderField('Titik Koordinat Baru Dari Admin', surveyData.titikKordinatBaruDariAdmin)}
    </>
  );

  const renderTrafoFields = () => (
    <>
      {renderField('Data Kepemilikan Tiang', surveyData.kepemilikanTiang)}
      {renderField('Jenis Tiang', surveyData.jenisTiang)}
      {renderField('Titik Koordinat', surveyData.titikKordinat)}
      {renderImageField('Foto Titik Aktual', surveyData.fotoTitikAktual)}
      {renderField('Keterangan', surveyData.keterangan)}
      {surveyData.titikKordinatBaruDariAdmin && renderField('Titik Koordinat Baru Dari Admin', surveyData.titikKordinatBaruDariAdmin)}
    </>
  );

  const renderFasosFasumFields = () => (
    <>
      {renderField('Data Kepemilikan Tiang', surveyData.kepemilikanTiang)}
      {renderField('Keterangan', surveyData.keterangan)}
      {renderField('Nama Tempat', surveyData.namaTempat)}
      {renderField('Alamat', surveyData.alamat)}
      {renderField('Jumlah Lampu', surveyData.jumlahLampu)}
      {renderField('Jenis Lampu', surveyData.jenisLampu)}
      {renderField('Titik Koordinat', surveyData.titikKordinat)}
      {renderImageField('Foto Titik Aktual', surveyData.fotoTitikAktual)}
      {surveyData.titikKordinatBaruDariAdmin && renderField('Titik Koordinat Baru Dari Admin', surveyData.titikKordinatBaruDariAdmin)}
    </>
  );

  const renderSurveyFields = () => {
    switch (surveyType) {
      case 'arm':
        return renderARMFields();
      case 'apj-propose':
        return renderAPJProposeFields();
      case 'apj-new':
        return renderAPJNewFields();
      case 'trafo':
        return renderTrafoFields();
      case 'fasos-fasum':
        return renderFasosFasumFields();
      default:
        return renderARMFields();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{getSurveyTitle()}</h3>
              <p className="text-sm text-gray-500">Informasi lengkap data survey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Memuat detail survey...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">
                <XCircle size={48} className="mx-auto" />
              </div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchSurveyDetail}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : surveyData ? (
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200">
                {renderSurveyFields()}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(surveyData)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniversalSurveyDetailModal;

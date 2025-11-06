import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Camera, Edit } from 'lucide-react';

const SurveyARMEditModal = ({ isOpen, onClose, survey, onSave }) => {
  const [formData, setFormData] = useState({
    kepemilikanTiang: '',
    jenisTiang: '',
    trafo: '',
    jenisTrafo: '',
    lampu: '',
    jumlahLampu: '',
    jenisLampu: '',
    titikKordinat: '',
    lebarJalan1: '',
    lebarJalan2: '',
    lebarBahuBertiang: '',
    lebarTrotoarBertiang: '',
    lainnyaBertiang: '',
    tinggiARM: '',
    keterangan: '',
    titikKordinatBaruDariAdmin: '', // Field baru
    fotoTinggi: null,
    fotoTitikAktual: null
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (survey) {
      setFormData({
        kepemilikanTiang: survey.kepemilikanTiang || '',
        jenisTiang: survey.jenisTiang || '',
        trafo: survey.trafo || '',
        jenisTrafo: survey.jenisTrafo || '',
        lampu: survey.lampu || '',
        jumlahLampu: survey.jumlahLampu || '',
        jenisLampu: survey.jenisLampu || '',
        titikKordinat: survey.titikKordinat || '',
        lebarJalan1: survey.lebarJalan1 || '',
        lebarJalan2: survey.lebarJalan2 || '',
        lebarBahuBertiang: survey.lebarBahuBertiang || '',
        lebarTrotoarBertiang: survey.lebarTrotoarBertiang || '',
        lainnyaBertiang: survey.lainnyaBertiang || '',
        tinggiARM: survey.tinggiARM || '',
        keterangan: survey.keterangan || '',
        titikKordinatBaruDariAdmin: survey.titikKordinatBaruDariAdmin || '',
        fotoTinggi: survey.fotoTinggiARM || null,
        fotoTitikAktual: survey.fotoTitikAktual || null
      });
    }
  }, [survey]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (field, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          [field]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(survey.id, {
        ...formData,
        fotoTinggiARM: formData.fotoTinggi,
        fotoTitikAktual: formData.fotoTitikAktual,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Gagal menyimpan perubahan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !survey) return null;

  const renderEditableField = (field, label, type = 'text', options = null) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
        <Edit size={14} className="text-gray-400" />
        <span>{label}</span>
      </label>
      {options ? (
        <select
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">Pilih {label}</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          placeholder={`Masukkan ${label.toLowerCase()}`}
        />
      ) : (
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder={`Masukkan ${label.toLowerCase()}`}
        />
      )}
    </div>
  );

  const renderImageField = (field, label) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
        <Camera size={14} className="text-gray-400" />
        <span>{label}</span>
      </label>
      {formData[field] ? (
        <div className="relative">
          <img 
            src={formData[field]} 
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-gray-200"
          />
          <label className="absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors duration-200 shadow-lg">
            <Edit size={14} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(field, e)}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <label className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group">
          <Camera size={24} className="mx-auto text-gray-400 mb-2 group-hover:text-blue-500 transition-colors duration-300" />
          <span className="text-sm text-gray-500 group-hover:text-blue-600">Klik untuk upload foto</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(field, e)}
            className="hidden"
          />
        </label>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Edit size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Data Survey ARM</h2>
              <p className="text-sm text-gray-500">{survey.projectTitle || 'Survey ARM'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Data Kepemilikan Tiang */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Kepemilikan Tiang</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderEditableField('kepemilikanTiang', 'Data Kepemilikan Tiang', 'text', ['PLN', 'Pemko', 'Swadaya'])}
                {renderEditableField('jenisTiang', 'Jenis Tiang', 'text', ['Beton', 'Besi', 'Kayu', 'Lainnya'])}
              </div>
            </div>

            {/* Data Trafo dan Lampu */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Trafo dan Lampu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderEditableField('trafo', 'Trafo', 'text', ['Ada', 'Tidak Ada'])}
                {renderEditableField('jenisTrafo', 'Jenis Trafo', 'text', ['Single', 'Double'])}
                {renderEditableField('lampu', 'Lampu', 'text', ['Ada', 'Tidak Ada'])}
                {renderEditableField('jumlahLampu', 'Jumlah Lampu', 'number')}
                {renderEditableField('jenisLampu', 'Jenis Lampu', 'text', ['Jalan', 'Taman', 'Dekoratif', 'Lainnya'])}
                {renderEditableField('tinggiARM', 'Tinggi ARM', 'number')}
              </div>
            </div>

            {/* Data Koordinat */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <MapPin size={18} className="text-blue-600" />
                <span>Data Koordinat</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
                {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
              </div>
            </div>

            {/* Pengukuran Jalan */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengukuran Jalan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderEditableField('lebarJalan1', 'Lebar Jalan 1', 'number')}
                {renderEditableField('lebarJalan2', 'Lebar Jalan 2', 'number')}
                {renderEditableField('lebarBahuBertiang', 'Lebar Bahu Tiang', 'number')}
                {renderEditableField('lebarTrotoarBertiang', 'Lebar Trotoar', 'number')}
                {renderEditableField('lainnyaBertiang', 'Lainnya Bertiang', 'text')}
              </div>
            </div>

            {/* Dokumentasi Foto */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dokumentasi Foto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderImageField('fotoTinggi', 'Foto Tinggi')}
                {renderImageField('fotoTitikAktual', 'Foto Titik Aktual')}
              </div>
            </div>

            {/* Keterangan */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Keterangan</h3>
              {renderEditableField('keterangan', 'Keterangan', 'textarea')}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{isLoading ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyARMEditModal;

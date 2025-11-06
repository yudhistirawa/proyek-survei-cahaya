'use client';

import React, { useState, useEffect } from 'react';
import MapDisplay from '../MapDisplay';
import { X, Save, MapPin, Camera, Edit2, FileText } from 'lucide-react';
import { useModalFocus } from '@/app/hooks/useModalFocus';

const UniversalSurveyEditModal = ({ isOpen, onClose, survey, surveyType, onSave }) => {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { 
    modalRef,
    handleModalWheel,
    handleInputFocus,
    handleInputChange: handleModalInputChange,
    handleSelectChange,
    handleModalClick
  } = useModalFocus();

  // New state for lamp count and lamp types array
  const [lampCount, setLampCount] = useState(0);
  const [lampTypes, setLampTypes] = useState([]);

  useEffect(() => {
    if (survey && survey.id) {
      setFormData(prevFormData => {
        if (prevFormData.id !== survey.id) {
          // Initialize lampCount and lampTypes from survey data if available
          const initialLampCount = survey.jumlahLampu || 0;
          const initialLampTypes = survey.lampTypes || [];
          setLampCount(initialLampCount);
          setLampTypes(initialLampTypes.length === initialLampCount ? initialLampTypes : Array(initialLampCount).fill('Konvensional'));
          return {
            ...survey,
            titikKordinatBaruDariAdmin: survey.titikKordinatBaruDariAdmin || ''
          };
        }
        return prevFormData;
      });
    }
  }, [survey]);

  // Handle lamp count change
  const handleLampCountChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setLampCount(count);
    // Reset lampTypes array length to count, fill with default 'Konvensional'
    setLampTypes(Array(count).fill('Konvensional'));
  };

  // Handle individual lamp type change
  const handleLampTypeChange = (index, value) => {
    setLampTypes(prev => {
      const newTypes = [...prev];
      newTypes[index] = value;
      return newTypes;
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler untuk input change yang menggunakan event
  const handleInputChangeEvent = (e) => {
    handleModalInputChange(e, setFormData);
  };

  // Handler untuk select change yang menggunakan event
  const handleSelectChangeEvent = (e) => {
    handleSelectChange(e, setFormData);
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

    // Compose lamp summary string
    let lampSummary = '';
    if (lampCount > 0 && lampTypes.length === lampCount) {
      // Check if all lamp types are the same
      const allSame = lampTypes.every(type => type === lampTypes[0]);
      if (allSame) {
        lampSummary = `Pilihan Lampu Ada ${lampCount} ${lampTypes[0]}`;
      } else {
        lampSummary = `Pilihan Lampu Ada ${lampCount} dengan jenis: ${lampTypes.join(', ')}`;
      }
    }

    try {
      await onSave(survey.id, {
        ...formData,
        lampCount,
        lampTypes,
        lampSummary,
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

  const getSurveyTitle = () => {
    const titles = {
      'arm': 'Edit Data ARM',
      'apj-propose': 'Edit Tiang APJ Propose',
      'apj-new': 'Edit Tiang APJ New',
      'trafo': 'Edit Data Trafo',
      'fasos-fasum': 'Edit Data Fasos Fasum'
    };
    return titles[surveyType] || 'Edit Survey';
  };

  const renderEditableField = (field, label, type = 'text', options = null) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-2 w-1/3">
        <Edit2 size={14} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="w-2/3">
        {options ? (
          <select
            name={field}
            id={field}
            value={formData[field] || ''}
            onChange={handleSelectChangeEvent}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
          >
            <option value="">Pilih {label}</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={field}
            id={field}
            value={formData[field] || ''}
            onChange={handleInputChangeEvent}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            placeholder={`Masukkan ${label.toLowerCase()}`}
          />
        ) : (
          <input
            type={type}
            name={field}
            id={field}
            value={formData[field] || ''}
            onChange={handleInputChangeEvent}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={`Masukkan ${label.toLowerCase()}`}
          />
        )}
      </div>
    </div>
  );

  const renderImageField = (field, label) => (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-2 w-1/3">
        <Camera size={14} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="w-2/3">
        {formData[field] ? (
          <a href={formData[field]} target="_blank" rel="noopener noreferrer" className="block">
            <img 
              src={formData[field]} 
              alt={label}
              className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm hover:opacity-95 transition"
            />
            <span className="mt-2 inline-block text-xs text-blue-600 underline">Buka gambar di tab baru</span>
          </a>
        ) : (
          <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center">
              <Camera size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-sm text-gray-500">Tidak ada foto</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderARMFields = () => (
    <>
      {renderEditableField('kepemilikanTiang', 'Data Kepemilikan Tiang', 'text', ['PLN', 'Pemko', 'Swadaya'])}
      {renderEditableField('jenisTiang', 'Jenis Tiang', 'text', ['Beton', 'Besi', 'Kayu', 'Lainnya'])}
      {renderEditableField('trafo', 'Trafo', 'text', ['Ada', 'Tidak Ada'])}
      {renderEditableField('jenisTrafo', 'Jenis Trafo', 'text', ['Single', 'Double'])}
      {renderEditableField('lampu', 'Lampu', 'text', ['Ada', 'Tidak Ada'])}
      {renderEditableField('jumlahLampu', 'Jumlah Lampu', 'number')}
      {renderEditableField('jenisLampu', 'Jenis Lampu', 'text', ['Jalan', 'Taman', 'Dekoratif', 'Lainnya'])}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('lebarJalan1', 'Lebar Jalan 1', 'number')}
      {renderEditableField('lebarJalan2', 'Lebar Jalan 2', 'number')}
      {renderEditableField('lebarBahuBertiang', 'Lebar Bahu Tiang', 'number')}
      {renderEditableField('lebarTrotoarBertiang', 'Lebar Trotoar', 'number')}
      {renderEditableField('lainnyaBertiang', 'Lainnya Bertiang', 'text')}
      {renderEditableField('tinggiARM', 'Tinggi ARM', 'number')}
      {renderEditableField('median', 'Median', 'text', ['Ada', 'Tidak Ada'])}
      {renderEditableField('tinggiMedian', 'Tinggi Median (m)', 'number')}
      {renderEditableField('lebarMedian', 'Lebar Median (m)', 'number')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderImageField('fotoTinggiARM', 'Foto Tinggi ARM')}
      {renderImageField('fotoTitikAktual', 'Foto Titik Aktual')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderAPJProposeFields = () => (
    <>
      {renderEditableField('idTitik', 'ID Titik', 'text')}
      {renderEditableField('dataDaya', 'Daya Lampu', 'text')}
      {renderEditableField('dataTiang', 'Data Tiang', 'text')}
      {renderEditableField('dataRuas', 'Data Ruas', 'text')}
      {renderEditableField('median', 'Median', 'text', ['Ada', 'Tidak Ada'])}
      {renderEditableField('tinggiMedian', 'Tinggi Median (m)', 'number')}
      {renderEditableField('lebarMedian', 'Lebar Median (m)', 'number')}
      {renderEditableField('namaJalan', 'Nama Jalan', 'text')}
      {renderEditableField('jarakAntarTiang', 'Jarak Antar Tiang (m)', 'number')}
      {renderEditableField('lebarJalan1', 'Lebar Jalan 1 (m)', 'number')}
      {renderEditableField('lebarJalan2', 'Lebar Jalan 2 (m)', 'number')}
      {renderEditableField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'number')}
      {renderEditableField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'number')}
      {renderEditableField('lainnyaBertiang', 'Lainnya Bertiang', 'text')}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderAPJProposeTiangFields = () => (
    <>
      {renderEditableField('idTitik', 'ID Titik', 'text')}
      {renderEditableField('dataDaya', 'Daya Lampu', 'text')}
      {renderEditableField('dataTiang', 'Data Tiang', 'text')}
      {renderEditableField('dataRuas', 'Data Ruas', 'text')}
      {renderEditableField('median', 'Median', 'text', ['Ada', 'Tidak Ada'])}
      {renderEditableField('tinggiMedian', 'Tinggi Median (m)', 'number')}
      {renderEditableField('lebarMedian', 'Lebar Median (m)', 'number')}
      {renderEditableField('namaJalan', 'Nama Jalan', 'text')}
      {renderEditableField('jarakAntarTiang', 'Jarak Antar Tiang (m)', 'number')}
      {renderEditableField('lebarJalan1', 'Lebar Jalan 1 (m)', 'number')}
      {renderEditableField('lebarJalan2', 'Lebar Jalan 2 (m)', 'number')}
      {renderEditableField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'number')}
      {renderEditableField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'number')}
      {renderEditableField('lainnyaBertiang', 'Lainnya Bertiang', 'text')}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderAPJNewFields = () => (
    <>
      {renderEditableField('namaJalan', 'Nama Jalan', 'text')}
      {renderEditableField('jenisJalanTiang', 'Jenis Jalan Tiang', 'text')}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('lebarJalan1', 'Lebar Jalan 1', 'number')}
      {renderEditableField('lebarJalan2', 'Lebar Jalan 2', 'number')}
      {renderEditableField('lebarBahuTiang', 'Lebar Bahu Tiang', 'number')}
      {renderEditableField('lebarTrotoar', 'Lebar Trotoar', 'number')}
      {renderEditableField('lainnyaBertiang', 'Lainnya Bertiang', 'text')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderImageField('fotoTitikAktual', 'Foto Titik Aktual')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderTrafoFields = () => (
    <>
      {renderEditableField('kepemilikanTiang', 'Data Kepemilikan Tiang', 'text', ['PLN', 'Pemko', 'Swadaya'])}
      {renderEditableField('jenisTiang', 'Jenis Tiang', 'text', ['Beton', 'Besi', 'Kayu', 'Lainnya'])}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderImageField('fotoTitikAktual', 'Foto Titik Aktual')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderFasosFasumFields = () => (
    <>
      {renderEditableField('kepemilikanTiang', 'Data Kepemilikan Tiang', 'text', ['PLN', 'Pemko', 'Swadaya'])}
      {renderEditableField('namaTempat', 'Nama Tempat', 'text')}
      {renderEditableField('alamat', 'Alamat', 'text')}
      {renderEditableField('jumlahLampu', 'Jumlah Lampu', 'number')}
      {renderEditableField('jenisLampu', 'Jenis Lampu', 'text', ['Jalan', 'Taman', 'Dekoratif', 'Lainnya'])}
      {renderEditableField('titikKordinat', 'Titik Koordinat', 'text')}
      {renderEditableField('titikKordinatBaruDariAdmin', 'Titik Koordinat Baru Dari Admin', 'text')}
      {renderImageField('fotoTitikAktual', 'Foto Titik Aktual')}
      {renderEditableField('keterangan', 'Keterangan', 'textarea')}
    </>
  );

  const renderSurveyFields = () => {
    switch (surveyType) {
      case 'arm':
        return (
          <>
            {renderARMFields()}
            <div className="mt-6">
              <label className="block mb-2 font-medium text-gray-700">Upload File KMZ</label>
              <input
                type="file"
                accept=".kmz,.kml"
                onChange={handleKmzUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {geoJsonData && (
              <div className="mt-6">
                <label className="block mb-2 font-medium text-gray-700">Preview Peta KMZ</label>
                <MapDisplay geojsonData={geoJsonData} />
              </div>
            )}
            {/* New Lamp Count and Lamp Types selection */}
            <div className="py-3 border-b border-gray-100 last:border-b-0">
              <label className="block mb-1 font-medium text-gray-700">Pilih Jumlah Lampu</label>
              <select
                value={lampCount}
                onChange={handleLampCountChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
              >
                <option value={0}>Pilih Jumlah Lampu</option>
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            {lampCount > 0 && (
              <div className="space-y-3">
                {[...Array(lampCount)].map((_, index) => (
                  <div key={index} className="py-3 border-b border-gray-100 last:border-b-0">
                    <label className="block mb-1 font-medium text-gray-700">Jenis Lampu {index + 1}</label>
                    <select
                      value={lampTypes[index]}
                      onChange={(e) => handleLampTypeChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    >
                      {['Konvensional', 'LED', 'Swadaya'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      case 'apj-propose':
        return renderAPJProposeFields();
      case 'apj_propose_tiang':
        return renderAPJProposeTiangFields();
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

  if (!isOpen || !survey) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleModalClick}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleModalWheel}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Edit2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getSurveyTitle()}</h2>
              <p className="text-sm text-gray-500">Edit informasi data survey</p>
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
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200">
              {renderSurveyFields()}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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

export default UniversalSurveyEditModal;

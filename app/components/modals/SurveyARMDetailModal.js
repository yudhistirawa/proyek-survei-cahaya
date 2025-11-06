import React, { useState } from 'react';
import { X, MapPin, User, Calendar, Settings, Camera, Info, Edit } from 'lucide-react';

const SurveyARMDetailModal = ({ isOpen, onClose, survey, onEdit }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!isOpen || !survey) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEditableField = (label, value, hasEditIcon = true) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <dt className="text-sm font-medium text-gray-600">{label}</dt>
        <dd className="text-sm text-gray-900 mt-1 font-medium">{value || 'Tidak diisi'}</dd>
      </div>
      {hasEditIcon && (
        <Edit size={16} className="text-gray-400 hover:text-blue-500 cursor-pointer" />
      )}
    </div>
  );

  const renderImageField = (label, imageData, hasEditIcon = true) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <Camera size={16} className="text-gray-400" />
          <span>{label}</span>
        </h4>
        {hasEditIcon && (
          <Edit size={16} className="text-gray-400 hover:text-blue-500 cursor-pointer" />
        )}
      </div>
      {imageData ? (
        <div className="relative">
          <img 
            src={imageData} 
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedImage({ src: imageData, alt: label })}
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

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🔧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detail Data ARM</h2>
                <p className="text-sm text-gray-600">{survey.projectTitle || 'Survey ARM'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors duration-200 shadow-sm"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  {renderEditableField('Data Kepemilikan Tiang', survey.kepemilikanTiang)}
                  {renderEditableField('Jenis Tiang', survey.jenisTiang)}
                  {renderEditableField('Trafo', survey.trafo)}
                  {renderEditableField('Lampu', survey.lampu)}
                  {renderEditableField('Jumlah Lampu', survey.jumlahLampu)}
                  {renderEditableField('Jenis Lampu', survey.jenisLampu)}
                  {renderEditableField('Titik Koordinat', survey.titikKordinat)}
                  {renderEditableField('Lebar Jalan 1', survey.lebarJalan1 ? `${survey.lebarJalan1}m` : '')}
                  {renderEditableField('Lebar Jalan 2', survey.lebarJalan2 ? `${survey.lebarJalan2}m` : '')}
                  {renderEditableField('Lebar Bahu Tiang', survey.lebarBahuBertiang ? `${survey.lebarBahuBertiang}m` : '')}
                  {renderEditableField('Lebar Trotoar', survey.lebarTrotoarBertiang ? `${survey.lebarTrotoarBertiang}m` : '')}
                  {renderEditableField('Lainnya Bertiang', survey.lainnyaBertiang)}
                  {renderEditableField('Tinggi ARM', survey.tinggiARM ? `${survey.tinggiARM}m` : '')}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {renderImageField('Foto Tinggi', survey.fotoTinggiARM)}
                  {renderImageField('Foto Titik Aktual', survey.fotoTitikAktual)}
                  {renderEditableField('Keterangan', survey.keterangan)}
                  {renderEditableField('Titik Koordinat Baru Dari Admin', survey.titikKordinatBaruDariAdmin)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
            >
              Tutup
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(survey)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
            )}
            <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200">
              Simpan
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 z-10"
            >
              <X size={24} className="text-white" />
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
              {selectedImage.alt}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurveyARMDetailModal;

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Upload, ChevronDown, Map, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Modal untuk preview peta KMZ
import { MapPreviewModal } from '../../modals/MapPreviewModal';
// Dynamically import MapDisplay to avoid SSR issues
const MapDisplay = dynamic(() => import('../../MapDisplay'), { ssr: false });

const DatabasePropose = () => {
  const [proposeData, setProposeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    namaJalan: '',
    idTitik: '',
    daya: '',
    tiang: '',
    ruas: '',
    titikKordinat: ''
  });
  const [showRuasDropdown, setShowRuasDropdown] = useState(false);
  const [kmzFile, setKmzFile] = useState(null);
  const [kmzFileUrl, setKmzFileUrl] = useState(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Opsi Ruas Jalan
  const ruasJalanOptions = [
    { value: 'titik_nol', label: 'Titik Nol' },
    { value: 'arteri', label: 'Arteri' },
    { value: 'wisata', label: 'Wisata' },
    { value: 'kolektor_a', label: 'Kolektor A' },
    { value: 'kolektor_b', label: 'Kolektor B' },
    { value: 'panel', label: 'Panel' }
  ];

  // Load data propose
  const loadProposeData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database-propose');
      if (response.ok) {
        const data = await response.json();
        setProposeData(data);
      }
    } catch (error) {
      console.error('Error loading propose data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposeData();
  }, []);

  // Handle add new data
  const handleAdd = () => {
    setFormData({ 
      namaJalan: '',
      idTitik: '',
      daya: '',
      tiang: '',
      ruas: '',
      titikKordinat: '',
      kmzFileUrl: null
    });
    setKmzFile(null);
    setKmzFileUrl(null);
    setShowMapPreview(false);
    setUploadSuccess(false);
    setShowAddForm(true);
    setShowEditForm(false);
    // Fokus langsung ke input file KMZ
    setTimeout(() => {
      const kmzInput = document.querySelector('input[type="file"][accept=".kmz"]');
      if (kmzInput) {
        kmzInput.click();
      }
    }, 100);
  };

  // Handle edit data
  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      namaJalan: item.namaJalan || '',
      idTitik: item.idTitik || '',
      daya: item.daya || '',
      tiang: item.tiang || '',
      ruas: item.ruas || '',
      titikKordinat: item.titikKordinat || '',
      kmzFileUrl: item.kmzFileUrl || null
    });
         setKmzFileUrl(item.kmzFileUrl || null);
     setShowEditForm(true);
    setShowAddForm(false);
  };

  // Handle delete data
  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        const response = await fetch(`/api/database-propose?id=${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          alert('Data berhasil dihapus');
          loadProposeData();
        }
      } catch (error) {
        console.error('Error deleting data:', error);
        alert('Gagal menghapus data');
      }
    }
  };

  // Handle KMZ file upload
  const handleKmzFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.kmz')) {
      alert('Hanya file KMZ yang diperbolehkan');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('Ukuran file terlalu besar. Maksimal 50MB');
      return;
    }

    setKmzFile(file);
    setIsProcessingFile(true);

    try {
      // Test storage connection terlebih dahulu
      console.log('Testing storage connection...');
      const testResponse = await fetch('/api/test-storage');
      const testData = await testResponse.json();
      
      if (!testData.success) {
        throw new Error('Firebase Storage tidak dapat diakses. Silakan coba lagi nanti.');
      }

      const formData = new FormData();
      formData.append('kmzFile', file);

      console.log('Uploading file:', file.name, 'Size:', file.size);

      const response = await fetch('/api/database-propose/upload', {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server mengembalikan response yang tidak valid');
      }

      const data = await response.json();
      console.log('Response data:', data);

             if (response.ok && data.success) {
         setKmzFileUrl(data.url);
         setUploadSuccess(true);
         // Tampilkan notifikasi sukses tanpa alert yang mengganggu
         console.log('File KMZ berhasil diupload:', data.url);
         
         
       } else {
        // Handle specific error messages
        let errorMessage = data.error || 'Gagal mengupload file KMZ';
        
        if (errorMessage.includes('Firebase Storage Rules')) {
          errorMessage = 'Error permission: Firebase Storage tidak dikonfigurasi dengan benar. Silakan hubungi administrator.';
        } else if (errorMessage.includes('kapasitas')) {
          errorMessage = 'Kapasitas penyimpanan penuh. Silakan coba lagi nanti.';
        } else if (errorMessage.includes('koneksi')) {
          errorMessage = 'Gagal terhubung ke server penyimpanan. Silakan cek koneksi internet Anda.';
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error uploading KMZ file:', error);
      
      let errorMessage = 'Gagal mengupload file KMZ';
      
      if (error.message.includes('JSON')) {
        errorMessage = 'Error server: Response tidak valid. Silakan coba lagi.';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Error koneksi: Tidak dapat terhubung ke server. Silakan coba lagi.';
      } else if (error.message.includes('Firebase Storage')) {
        errorMessage = 'Firebase Storage tidak dapat diakses. Silakan coba lagi nanti.';
      } else {
        errorMessage = `Gagal mengupload file KMZ: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Handle save data
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validasi KMZ file untuk add form
    if (showAddForm && !kmzFileUrl) {
      alert('File KMZ harus diupload terlebih dahulu');
      return;
    }
    
    try {
      const method = showEditForm ? 'PUT' : 'POST';
      const body = showEditForm 
        ? { ...formData, id: selectedItem.id, kmzFileUrl: kmzFileUrl }
        : { ...formData, kmzFileUrl: kmzFileUrl };

      const response = await fetch('/api/database-propose', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        alert(`Data berhasil ${showEditForm ? 'diperbarui' : 'ditambahkan'}`);
        setShowAddForm(false);
        setShowEditForm(false);
        loadProposeData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Gagal menyimpan data');
    }
  };

  // Handle ruas jalan selection
  const handleRuasSelect = (value) => {
    setFormData(prev => ({ ...prev, ruas: value }));
    setShowRuasDropdown(false);
  };

  // Handle cancel form
  const handleCancel = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setSelectedItem(null);
    setKmzFile(null);
    setKmzFileUrl(null);
    setShowMapPreview(false);
    setUploadSuccess(false);
  };

  // Filter data based on search
  const filteredData = proposeData.filter(item =>
    item.idTitik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.namaJalan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.namaPetugas?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Database Propose</h2>
            <p className="text-gray-600 mt-1">Kelola data propose untuk survey</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus size={20} />
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      {/* Form Tambah/Edit Data - Inline */}
      {(showAddForm || showEditForm) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {showEditForm ? 'Edit Data Propose' : 'Tambah Data Propose'}
          </h3>
          
                     <form onSubmit={handleSave} className="space-y-6">
                           {/* Quick Review Button */}
              {(kmzFileUrl || selectedItem?.kmzFileUrl) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMapPreview(true)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Map size={16} />
                    <span>Review Map KMZ</span>
                  </button>
                </div>
              )}
             
             {/* Pilihan Ruas Jalan */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ruas Jalan *</label>
              <button
                type="button"
                onClick={() => setShowRuasDropdown(!showRuasDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between bg-white text-gray-900"
              >
                <span className={formData.ruas ? 'text-gray-900' : 'text-gray-500'}>
                  {ruasJalanOptions.find(opt => opt.value === formData.ruas)?.label || 'Pilih Ruas Jalan'}
                </span>
                <ChevronDown size={20} />
              </button>
              
              {showRuasDropdown && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  {ruasJalanOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRuasSelect(option.value)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg text-gray-900"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload KMZ File - Required for Add Form */}
            {showAddForm && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File KMZ *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                    <div className="flex flex-col items-center">
                      <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2">
                        <Upload size={16} />
                        <span>Pilih File KMZ</span>
                        <input
                          type="file"
                          accept=".kmz"
                          onChange={handleKmzFileUpload}
                          className="hidden"
                          required
                        />
                      </label>
                                             <p className="text-sm text-gray-500 mt-2">Format: .kmz (Wajib)</p>
                     </div>
                   </div>
                   
                                      {kmzFile && (
                     <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                           <Upload size={16} className="text-green-600" />
                           <span className="text-sm text-green-800">{kmzFile.name}</span>
                         </div>
                         {uploadSuccess && (
                           <button
                             onClick={() => setShowMapPreview(true)}
                             className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                           >
                             <Map size={12} />
                             <span>Review Map</span>
                           </button>
                         )}
                       </div>
                       {uploadSuccess && showAddForm && (
                         <div className="mt-2 p-2 bg-green-100 rounded-md">
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                             <span className="text-xs text-green-700 font-medium">File berhasil diupload! Klik &quot;Review Map&quot; untuk melihat di modal.</span>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {isProcessingFile && (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Mengunggah file KMZ...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

                         {/* Upload KMZ File - Optional for Edit Form */}
             {showEditForm && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Upload File KMZ (Opsional)
                 </label>
                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                   <div className="text-center">
                     <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                     <div className="flex flex-col items-center">
                       <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
                         <Upload size={16} />
                         <span>Pilih File KMZ</span>
                         <input
                           type="file"
                           accept=".kmz"
                           onChange={handleKmzFileUpload}
                           className="hidden"
                         />
                       </label>
                                              <p className="text-sm text-gray-500 mt-2">Format: .kmz</p>
                     </div>
                   </div>
                   
                    {/* Show existing KMZ file if available */}
                    {selectedItem?.kmzFileUrl && !kmzFile && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Map size={16} className="text-blue-600" />
                            <span className="text-sm text-blue-800">File KMZ tersedia</span>
                          </div>
                          <button
                            onClick={() => setShowMapPreview(true)}
                            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                          >
                            <Map size={12} />
                            <span>Review Map</span>
                          </button>
                        </div>
                      </div>
                    )}
                   
                                      {kmzFile && (
                     <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                           <Upload size={16} className="text-green-600" />
                           <span className="text-sm text-green-800">{kmzFile.name}</span>
                         </div>
                         {uploadSuccess && (
                           <button
                             onClick={() => setShowMapPreview(true)}
                             className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                           >
                             <Map size={12} />
                             <span>Review Map</span>
                           </button>
                         )}
                       </div>
                       {uploadSuccess && showEditForm && (
                         <div className="mt-2 p-2 bg-green-100 rounded-md">
                           <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                             <span className="text-xs text-green-700 font-medium">File berhasil diupload! Klik &quot;Review Map&quot; untuk melihat di modal.</span>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {isProcessingFile && (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Mengunggah file KMZ...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            

            {/* Form Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Lengkapi Data Dibawah</h4>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.namaJalan}
                    onChange={(e) => setFormData({...formData, namaJalan: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Nama Jalan"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="text"
                    value={formData.idTitik}
                    onChange={(e) => setFormData({...formData, idTitik: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Id Titik"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="text"
                    value={formData.daya}
                    onChange={(e) => setFormData({...formData, daya: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Daya"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="text"
                    value={formData.tiang}
                    onChange={(e) => setFormData({...formData, tiang: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Tiang"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="text"
                    value={formData.titikKordinat}
                    onChange={(e) => setFormData({...formData, titikKordinat: e.target.value})}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Titik Kordinat"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {showEditForm ? 'Update Data' : 'Simpan Data'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan ID Titik, Nama Jalan, atau Nama Petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada data propose</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Titik
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Jalan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daya
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiang
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ruas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KMZ File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.idTitik}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.namaJalan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.daya}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.tiang}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ruasJalanOptions.find(opt => opt.value === item.ruas)?.label || item.ruas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                 {item.kmzFileUrl ? (
                           <button
                             onClick={() => {
                               console.log('Opening KMZ URL:', item.kmzFileUrl);
                               setKmzFileUrl(item.kmzFileUrl);
                               setShowMapPreview(true);
                             }}
                             className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                           >
                             <Map size={16} />
                             <span>Review Map</span>
                           </button>
                         ) : (
                          <span className="text-gray-400">Tidak ada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Map Modal for viewing KMZ */}
      {showMapPreview && kmzFileUrl && (
        <MapPreviewModal
          isOpen={showMapPreview}
          onClose={() => setShowMapPreview(false)}
          kmzUrl={kmzFileUrl}
        />
      )}

    </div>
  );
};

export default DatabasePropose;

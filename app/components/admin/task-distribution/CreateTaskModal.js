import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import dynamic from 'next/dynamic';

// Dynamic import untuk KMZ Map Component
const KMZMapComponent = dynamic(() => import('./KMZMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-700 text-sm font-medium">Memuat peta...</p>
        <p className="text-gray-500 text-xs mt-1">Harap tunggu sebentar</p>
      </div>
    </div>
  )
});

const CreateTaskModal = ({ isOpen, onClose, taskType, onTaskCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    surveyorId: '',
    deadline: ''
  });
  const [excelFile, setExcelFile] = useState(null);
  const [kmzFile, setKmzFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [surveyors, setSurveyors] = useState([]);
  const [loadingSurveyors, setLoadingSurveyors] = useState(true);
  const [mapData, setMapData] = useState(null);
  const [parsingFile, setParsingFile] = useState(false);
  const excelFileInputRef = useRef(null);
  const kmzFileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch surveyors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSurveyors();
    }
  }, [isOpen]); // fetchSurveyors tidak perlu di dependency array karena didefinisikan di dalam komponen

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form data
      setFormData({
        title: '',
        description: '',
        surveyorId: '',
        deadline: ''
      });
      setExcelFile(null);
      setKmzFile(null);
      setMapData(null);
      setError('');
      setParsingFile(false);
      
      // Reset file inputs
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
      if (kmzFileInputRef.current) {
        kmzFileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Test koneksi API
  const testAPIConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      const response = await fetch('/api/test-task-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      const result = await response.json();
      console.log('✅ API test result:', result);
      return result.success;
    } catch (error) {
      console.error('❌ API test failed:', error);
      return false;
    }
  };

  const fetchSurveyors = async () => {
    try {
      console.log('🔄 Fetching surveyors...');
      setLoadingSurveyors(true);
      const response = await fetch('/api/surveyors');
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 API result:', result);
        
        if (result.success) {
          const surveyorData = result.data || [];
          console.log('👥 Surveyor data:', surveyorData);
          setSurveyors(surveyorData);
          console.log('✅ Surveyors loaded:', surveyorData.length, 'surveyors');
        } else {
          console.error('❌ Failed to fetch surveyors:', result.error);
          setSurveyors([]);
        }
      } else {
        console.error('❌ Failed to fetch surveyors:', response.status);
        setSurveyors([]);
      }
    } catch (error) {
      console.error('❌ Error fetching surveyors:', error);
      setSurveyors([]);
    } finally {
      setLoadingSurveyors(false);
      console.log('🏁 Fetch surveyors completed');
    }
  };


  const handleExcelFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('File Excel harus berformat .xlsx, .xls, atau .csv');
        setExcelFile(null);
        return;
      }
      
      setExcelFile(selectedFile);
      setError('');
    }
  };

  const handleKMZFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['.kmz', '.kml'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('File KMZ/KML harus berformat .kmz atau .kml');
        setKmzFile(null);
        setMapData(null);
        return;
      }
      
      setKmzFile(selectedFile);
      setError('');
      
      // Parse KMZ/KML file untuk preview map
      await parseKMZFile(selectedFile);
    }
  };

  const parseKMZFile = async (file) => {
    try {
      setParsingFile(true);
      
      // Untuk KMZ file (zip format)
      if (file.name.toLowerCase().endsWith('.kmz')) {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        // Cari file KML di dalam KMZ
        const kmlFile = Object.keys(zipContent.files).find(name => 
          name.toLowerCase().endsWith('.kml')
        );
        
        if (kmlFile) {
          const kmlContent = await zipContent.files[kmlFile].async('text');
          const parsedData = await parseKMLContent(kmlContent);
          console.log('Setting mapData for KMZ:', parsedData);
          setMapData(parsedData);
        }
      } else {
        // Untuk KML file langsung
        const text = await file.text();
        const parsedData = await parseKMLContent(text);
        console.log('Setting mapData for KML:', parsedData);
        setMapData(parsedData);
      }
    } catch (error) {
      console.error('Error parsing KMZ/KML file:', error);
      setError('Gagal membaca file KMZ/KML. Pastikan file valid.');
      setMapData(null);
    } finally {
      setParsingFile(false);
    }
  };

  const parseKMLContent = async (kmlText) => {
    try {
      console.log('Parsing KML content for task type:', taskType);
      
      // Use the improved KMZParser for consistent parsing
      const { KMZParser } = await import('../../../lib/kmzParser');
      const result = KMZParser.parseKMLContent(kmlText, taskType);
      
      console.log('Final parsed data:', {
        coordinatesCount: result.coordinates.length,
        polygonsCount: result.polygons.length,
        linesCount: result.lines.length,
        center: result.center
      });
      
      return result;
    } catch (error) {
      console.error('Error parsing KML content:', error);
      return null;
    }
  };

  const uploadFileViaAPI = async (file, fileType) => {
    try {
      console.log(`📤 Mulai upload ${fileType} file via API:`, file.name);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${taskType}_${timestamp}_${file.name}`;
      const today = new Date().toISOString().split('T')[0];
      const folderBase = fileType === 'kmz' ? 'task-files/kmz' : 'task-files/excel';
      const folderPath = `${folderBase}/${today}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', folderPath);
      formData.append('fileName', fileName);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload API error ${res.status}: ${text}`);
      }

      const result = await res.json();
      const downloadURL = result.url || result.downloadUrl || result.downloadURL;
      if (!downloadURL) {
        throw new Error('Upload berhasil tapi URL tidak tersedia dari server');
      }

      console.log('🔗 Download URL:', downloadURL);
      return { fileName, downloadURL, folderPath, fileType };
    } catch (error) {
      console.error(`❌ Error uploading ${fileType} file via API:`, error);
      throw new Error(`Gagal upload file ${file.name}: ${error.message}`);
    }
  };

  const createTask = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🚀 Memulai proses pembuatan tugas...');

      // Validasi input
      if (!formData.title || !formData.description || !formData.surveyorId) {
        setError('Judul, deskripsi, dan surveyor wajib diisi');
        setLoading(false);
        return;
      }

      console.log('✅ Validasi input berhasil');

      // Validasi file berdasarkan taskType
      if (taskType === 'existing') {
        if (!kmzFile) {
          setError('File KMZ/KML wajib diupload');
          setLoading(false);
          return;
        }
      } else if (taskType === 'propose') {
        if (!excelFile && !kmzFile) {
          setError('Minimal satu file harus diupload (Excel/CSV atau KMZ/KML)');
          setLoading(false);
          return;
        }
      }

      console.log('✅ Validasi file berhasil');

      // Test koneksi API terlebih dahulu
      console.log('🧪 Testing API connection...');
      const apiTestResult = await testAPIConnection();
      if (!apiTestResult) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
        setLoading(false);
        return;
      }
      console.log('✅ API connection test passed');

      // Upload files via API (server-side) untuk menghindari CORS
      console.log('📤 Mulai upload file via API...');
      const fileData = { excelFile: null, kmzFile: null };
      if (excelFile) {
        fileData.excelFile = await uploadFileViaAPI(excelFile, 'excel');
      }
      if (kmzFile) {
        fileData.kmzFile = await uploadFileViaAPI(kmzFile, 'kmz');
      }
      
      // Ambil data surveyor
      const selectedSurveyor = surveyors.find(s => s.id === formData.surveyorId);
      const surveyorName = selectedSurveyor ? (selectedSurveyor.name || selectedSurveyor.username || selectedSurveyor.email) : 'Surveyor';

      console.log('👤 Surveyor selected:', surveyorName);

      // Ambil adminId dari Firebase Auth
      const auth = getAuth();
      const adminId = auth.currentUser?.uid || null;
      if (!adminId) {
        setError('Tidak dapat menemukan Admin ID. Silakan login kembali.');
        setLoading(false);
        return;
      }

      // Siapkan data tugas
      const taskData = {
        title: formData.title,
        description: formData.description,
        surveyorId: formData.surveyorId,
        taskType: taskType,
        deadline: formData.deadline || null,
        priority: 'medium',
        kmzFile: fileData.kmzFile,
        excelFile: fileData.excelFile,
        mapData: kmzFile && mapData ? {
          coordinates: mapData.coordinates || [],
          polygons: mapData.polygons || [],
          lines: mapData.lines || [],
          center: mapData.center || null,
          bounds: mapData.bounds || null
        } : null,
        createdBy: adminId
      };

      console.log('📤 Mengirim data tugas ke API (tanpa file):', {
        title: taskData.title,
        surveyorId: taskData.surveyorId,
        surveyorName: surveyorName,
        taskType: taskData.taskType,
        hasMapData: !!taskData.mapData
      });

            // Kirim ke API dengan timeout
      console.log('🚀 Mulai kirim request ke API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout
      
      try {
        console.log('📡 Sending POST request to /api/task-assignments...');
        const response = await fetch('/api/task-assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': adminId
          },
          body: JSON.stringify(taskData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', response.status, errorText);
          throw new Error(`Gagal membuat tugas: ${response.status} ${errorText}`);
        }
        
        console.log('📡 Parsing response JSON...');
        const result = await response.json();
        console.log('📡 API Response data:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Gagal membuat tugas');
        }
        
        console.log('✅ Tugas berhasil dibuat:', result.data);
        
        // Tampilkan pesan sukses
        alert(`✅ Tugas berhasil dibuat dan dikirim ke ${surveyorName}!\n\nTugas: ${formData.title}\nTipe: ${taskType === 'existing' ? 'Zona Existing' : 'Propose'}\n\nSurveyor akan menerima notifikasi dan tugas akan muncul di daftar tugas mereka.`);
        
        // Callback ke parent component
        if (onTaskCreated) {
          onTaskCreated({
            id: result.data.id,
            ...result.data
          });
        }
        
        // Close modal
        onClose();
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - server tidak merespons dalam 30 detik');
        }
        throw fetchError;
      }

    } catch (err) {
      console.error('❌ Error creating task:', err);
      setError(`Gagal membuat tugas: ${err.message}`);
    } finally {
      setLoading(false);
      console.log('🏁 Proses pembuatan tugas selesai');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 text-white relative overflow-hidden shrink-0">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-white/5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Buat Tugas {taskType === 'existing' ? 'Zona Existing' : 'Propose'}
                </h2>
                <p className="text-blue-100 text-sm mt-1 font-medium">
                  {taskType === 'existing' ? 'Survey area yang sudah terpasang listrik' : 'Survey area baru untuk pengembangan'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Tutup Modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

                {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                                 <span className="text-red-900 font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Judul Tugas */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                Judul Tugas <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white shadow-sm"
                  placeholder="Masukkan judul tugas yang jelas dan deskriptif"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Surveyor */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <div className="w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Surveyor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="surveyorId"
                  value={formData.surveyorId}
                  onChange={handleInputChange}
                  disabled={loadingSurveyors}
                  className="w-full px-4 py-4 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 text-gray-900 bg-gray-50 focus:bg-white shadow-sm appearance-none"
                >
                  <option value="" className="text-gray-500">
                    {loadingSurveyors ? 'Memuat surveyor...' : 
                     surveyors.length === 0 ? 'Tidak ada surveyor tersedia' : 'Pilih Surveyor'}
                  </option>
                  {surveyors.map((surveyor) => (
                    <option key={surveyor.id} value={surveyor.id} className="text-gray-900">
                      {surveyor.name || surveyor.username || surveyor.email} {surveyor.username ? `(@${surveyor.username})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {!loadingSurveyors && surveyors.length === 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Tidak ada surveyor yang tersedia. Silakan buat akun surveyor terlebih dahulu.
                  </p>
                </div>
              )}
            </div>

            {/* Deadline */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <div className="w-5 h-5 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Deadline
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-gray-50 focus:bg-white shadow-sm"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <div className="w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Deskripsi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-4 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white shadow-sm"
                  placeholder="Jelaskan detail tugas, lokasi, dan instruksi khusus untuk surveyor"
                />
                <div className="absolute left-4 top-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>



                          {/* Excel/CSV File Upload - Hanya untuk Propose */}
              {taskType === 'propose' && (
                <div>
                 <label className="block text-sm font-semibold text-gray-900 mb-2">
                   Upload File Excel/CSV
                 </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    onChange={handleExcelFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    id="excel-file-upload"
                  />
                  <label htmlFor="excel-file-upload" className="cursor-pointer">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                       <p className="text-gray-900 font-medium">
                         {excelFile ? excelFile.name : 'Klik untuk memilih file Excel/CSV'}
                       </p>
                       <p className="text-gray-500 text-sm mt-1">
                         Format yang didukung: .xlsx, .xls, .csv
                       </p>
                    </div>
                  </label>
                </div>
                {excelFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                       <span className="text-green-900 text-sm font-medium">File Excel terpilih: {excelFile.name}</span>
                    </div>
                  </div>
                )}
              </div>
              )}

                          {/* KMZ/KML File Upload */}
              <div>
               <label className="block text-sm font-semibold text-gray-900 mb-2">
                 Upload File KMZ/KML {taskType === 'existing' && <span className="text-red-500">*</span>}
               </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                <input
                  ref={kmzFileInputRef}
                  type="file"
                  onChange={handleKMZFileChange}
                  accept=".kmz,.kml"
                  className="hidden"
                  id="kmz-file-upload"
                />
                <label htmlFor="kmz-file-upload" className="cursor-pointer">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                    </svg>
                                         <p className="text-gray-900 font-medium">
                       {kmzFile ? kmzFile.name : 'Klik untuk memilih file KMZ/KML'}
                     </p>
                     <p className="text-gray-500 text-sm mt-1">
                       Format yang didukung: .kmz, .kml
                     </p>
                  </div>
                </label>
              </div>
              {kmzFile && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                                         <span className="text-blue-900 text-sm font-medium">File KMZ/KML terpilih: {kmzFile.name}</span>
                  </div>
                </div>
              )}
            </div>

                         {/* Preview Map untuk KMZ/KML */}
             {kmzFile && (
               <div>
                                   <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Preview Peta KMZ/KML
                  </label>
                 <div className="border border-gray-200 rounded-xl overflow-hidden">
                   {parsingFile ? (
                     <div className="h-64 bg-gray-100 flex items-center justify-center">
                       <div className="text-center">
                         <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                   <p className="text-gray-900 text-sm">Membaca file KMZ/KML...</p>
                       </div>
                     </div>
                                       ) : mapData ? (
                      <div className="h-64">
                        {console.log('Rendering KMZMapComponent with mapData:', mapData, 'for task type:', taskType)}
                        <KMZMapComponent mapData={mapData} taskType={taskType} />
                      </div>
                   ) : (
                     <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                       <div className="text-center">
                         <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                         </svg>
                                                   <p className="text-gray-900 font-medium mb-2">File KMZ/KML Siap Ditampilkan</p>
                          <p className="text-gray-500 text-sm">
                            File KMZ/KML akan ditampilkan di peta setelah tugas dibuat
                          </p>
                       </div>
                     </div>
                   )}
                 </div>
                 {mapData && (
                   <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                     <div className="flex items-center gap-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                                               <span className="text-blue-900 text-sm font-medium">
                          {taskType === 'propose' ? (
                            `Data peta berhasil dibaca: ${mapData.coordinates.length} titik koordinat survei, ${mapData.polygons.length} polygon, ${mapData.lines.length} garis`
                          ) : (
                            `Data peta berhasil dibaca: ${mapData.coordinates.length} koordinat, ${mapData.polygons.length} polygon, ${mapData.lines.length} garis`
                          )}
                        </span>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* Info Upload Requirement */}
             {taskType === 'existing' && !kmzFile && (
               <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                 <div className="flex items-center gap-2">
                   <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                   </svg>
                   <span className="text-amber-900 text-sm font-medium">
                     File KMZ/KML wajib diupload
                   </span>
                 </div>
               </div>
             )}
             
             {taskType === 'propose' && !excelFile && !kmzFile && (
               <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                 <div className="flex items-center gap-2">
                   <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                   </svg>
                   <span className="text-amber-900 text-sm font-medium">
                     Minimal satu file harus diupload (Excel/CSV atau KMZ/KML)
                   </span>
                 </div>
               </div>
             )}

             {/* Info untuk file Excel yang sudah diupload - Hanya untuk Propose */}
             {taskType === 'propose' && excelFile && (
               <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                 <div className="flex items-center gap-2">
                   <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                   <span className="text-green-900 text-sm font-medium">
                     File Excel/CSV siap untuk diproses. Data akan diolah setelah tugas dibuat.
                   </span>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200 shrink-0">
          <div className="flex justify-between items-center">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.title ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className={formData.title ? 'text-green-600' : 'text-gray-400'}>Judul</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.surveyorId ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className={formData.surveyorId ? 'text-green-600' : 'text-gray-400'}>Surveyor</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${formData.description ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className={formData.description ? 'text-green-600' : 'text-gray-400'}>Deskripsi</span>
              </div>
              {taskType === 'existing' && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${kmzFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={kmzFile ? 'text-green-600' : 'text-gray-400'}>File KMZ</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Batal
              </button>
              
              <button
                onClick={createTask}
                disabled={loading || !formData.title || !formData.surveyorId || !formData.description || (taskType === 'existing' && !kmzFile)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Membuat Tugas...</span>
                    <div className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                      Harap tunggu
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Buat Tugas</span>
                    <div className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                      {taskType === 'existing' ? 'Zona Existing' : 'Propose'}
                    </div>
                  </>
                )}
              </button>

              {loading && (
                <button
                  onClick={() => {
                    setLoading(false);
                    setError('Proses dibatalkan oleh pengguna');
                  }}
                  className="px-4 py-3 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Batalkan
                </button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-gray-600">Tips:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Pastikan judul tugas jelas dan deskriptif</li>
                  <li>• Pilih surveyor yang sesuai dengan lokasi tugas</li>
                  {taskType === 'existing' && <li>• File KMZ/KML harus berisi data koordinat yang valid</li>}
                  {taskType === 'propose' && <li>• Upload file Excel/CSV atau KMZ/KML sesuai kebutuhan</li>}
                </ul>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;

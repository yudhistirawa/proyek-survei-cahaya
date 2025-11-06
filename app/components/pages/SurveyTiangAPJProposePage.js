"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronDown, Camera, Save, MapPin, X, Zap, ZapOff, Hash, Power, TowerControl, Route, Construction } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, storage, auth } from '../../lib/firebase';
import { smartPhotoUpload } from '../../lib/photoUpload';
import usePageTitle from '../../hooks/usePageTitle';
import useRealtimeLocation from '../../hooks/useRealtimeLocation';
import MiniMapsComponent from '../MiniMapsComponentLazy';
import ModernAlertModal from '../modals/ModernAlertModal';

const SurveyTiangAPJProposePage = ({ onBack }) => {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);

  const [formData, setFormData] = useState({
    adaIdTitik: '', // 'Ada' atau 'Tidak Ada'
    idTitik: '', // ID Titik jika ada
    namaJalan: '',
    dataDaya: '',
    dataTiang: '',
    dataRuas: '',
    dataRuasSub: '',
    jarakAntarTiang: '',
    titikKordinat: '',
    lebarJalan1: '',
    lebarJalan2: '',
    lebarBahuBertiang: '',
    lebarTrotoarBertiang: '',
    lainnyaBertiang: '',
    median: '',
    tinggiMedian: '',
    lebarMedian: '',
    fotoTitikAktual: null,
    fotoKemerataan: null,
    keterangan: ''
  });

  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showMedianInput, setShowMedianInput] = useState(false);
  const [tinggiMedianInput, setTinggiMedianInput] = useState('');
  const [lebarMedianInput, setLebarMedianInput] = useState('');
  const [showIdTitikInput, setShowIdTitikInput] = useState(false);
  const [idTitikInput, setIdTitikInput] = useState('');
  const [showLebarJalanInput, setShowLebarJalanInput] = useState(false);
  const [lebarJalan1Input, setLebarJalan1Input] = useState('');
  const [lebarJalan2Input, setLebarJalan2Input] = useState('');

  const [toast, setToast] = useState({ show: false, message: '' });
  const toastTimerRef = useRef(null);
  const isProd = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentPhotoField, setCurrentPhotoField] = useState(null);
  const [alertModal, setAlertModal] = useState({
    isVisible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const isOverlayActive = showCameraModal || showMapModal || alertModal.isVisible;

  // Alert helper functions
  const showAlert = useCallback((type, title, message) => {
    setAlertModal({
      isVisible: true,
      type,
      title,
      message
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
        ...prev,
        [field]: value
    }));
  };

  // Set page title only on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOverlayActive) return;
    if (typeof document === 'undefined') return;

    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousHtmlOverflow = htmlStyle.overflow;

    bodyStyle.overflow = 'hidden';
    htmlStyle.overflow = 'hidden';

    return () => {
      bodyStyle.overflow = previousBodyOverflow;
      htmlStyle.overflow = previousHtmlOverflow;
    };
  }, [isOverlayActive]);

  // Set page title
  usePageTitle('Survey APJ Propose - Sistem Manajemen');

  // Real-time location hook
  const {
    location: realtimeLocation,
    error: locationError,
    isLoading: locationLoading,
    accuracy: locationAccuracy,
    timestamp: locationTimestamp,
    isWatching,
    startWatching,
    stopWatching,
    getCurrentLocation
  } = useRealtimeLocation({
    enableHighAccuracy: true,
    timeout: 30000, // beri waktu lebih lama agar tidak sering retry
    maximumAge: 5000, // izinkan cache 5 detik untuk kurangi update
    distanceFilter: 5, // update tiap ~5 meter untuk hemat baterai
    autoStart: isClient && isRealtimeEnabled
  });

  // Update coordinates when real-time location changes
  useEffect(() => {
    if (realtimeLocation && isRealtimeEnabled && isClient) {
      const coords = `${realtimeLocation.lat.toFixed(6)}, ${realtimeLocation.lon.toFixed(6)}`;
      setFormData(prev => {
        // Hindari set state jika tidak berubah (mengurangi re-render)
        if (prev.titikKordinat === coords) return prev;
        return { ...prev, titikKordinat: coords };
      });
    }
  }, [realtimeLocation, isRealtimeEnabled, isClient]);

  // Handle real-time toggle
  const toggleRealtimeLocation = useCallback(() => {
    setIsRealtimeEnabled(prev => {
      const newState = !prev;
      if (newState && isClient) {
        startWatching();
      } else {
        stopWatching();
      }
      return newState;
    });
  }, [isClient, startWatching, stopWatching]);

  // Fallback manual location refresh
  const refreshLocation = useCallback(async () => {
    if (!isClient) return;
    try {
      const location = await getCurrentLocation();
      const coords = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
      setFormData(prev => ({
        ...prev,
        titikKordinat: coords
      }));
    } catch (error) {
      if (!isProd) console.error('Error getting location:', error);
      showAlert('error', 'Gagal Mendapatkan Lokasi', 'Tidak dapat memperbarui koordinat. Silakan coba lagi.');
    }
  }, [getCurrentLocation, isClient, isProd, showAlert]);

  useEffect(() => {
    if (isClient && isRealtimeEnabled) {
      // Start real-time tracking when client is ready
      startWatching();
    }
  }, [isClient, isRealtimeEnabled, startWatching]);

  // Restore scroll when camera modal closes (safety in case we locked it early)
  useEffect(() => {
    if (!isClient) return;
    if (!showCameraModal) {
      try {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      } catch {}
    }
  }, [showCameraModal, isClient]);

  useEffect(() => {
    if (isClient) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
      return () => unsubscribe();
    }
  }, [isClient]);

  // Event listener untuk menutup dropdown ketika mengklik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setOpenDropdowns({});
        setShowIdTitikInput(false);
        setShowLebarJalanInput(false);
        setShowMedianInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get location status for UI
  const getLocationStatus = () => {
    if (!isClient) return 'loading';
    if (locationLoading) return 'loading';
    if (locationError) return 'error';
    if (realtimeLocation) return 'success';
    return 'loading';
  };

  const locationStatus = getLocationStatus();

  // Gallery-only upload section for images (e.g., Foto Kemerataan)
  const renderGalleryUploadField = (field, label, description) => (
    <div className="mb-3">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-800 font-medium">{label}</span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mb-3">{description}</p>
        )}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept="image/*"
              multiple={false}
              onChange={(e) => handleImageUpload(field, e)}
              className="hidden"
              id={`${field}-gallery-input`}
            />
            <label
              htmlFor={`${field}-gallery-input`}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Galeri</span>
            </label>
          </div>

          {formData[field] && (
            <div className="relative">
              <img
                src={formData[field]}
                alt={label}
                className="w-full h-32 object-cover rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, [field]: null }))}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Hapus foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!isClient) {
      showAlert('warning', 'Halaman Belum Siap', 'Halaman masih dalam proses loading. Silakan coba lagi.');
      return;
    }
    
    if (!user) {
      showAlert('warning', 'Login Diperlukan', 'Anda harus login terlebih dahulu untuk menyimpan data survey.');
      return;
    }

    // Validasi minimal
    if (!formData.adaIdTitik) {
      showAlert('warning', 'Data Tidak Lengkap', 'Mohon pilih opsi untuk Ada Id Titik sebelum menyimpan.');
      return;
    }
    
    if (formData.adaIdTitik === 'ada' && !formData.idTitik) {
      showAlert('warning', 'Id Titik Diperlukan', 'Mohon isi Id Titik jika memilih "Ada".');
      return;
    }
    
    if (!formData.dataDaya || !formData.dataTiang) {
      showAlert('warning', 'Data Tidak Lengkap', 'Mohon isi Data Daya dan Data Tiang sebelum menyimpan.');
      return;
    }

    // Validasi data ruas
    if (!formData.dataRuas && formData.dataRuas !== 'arteri' && formData.dataRuas !== 'kolektor') {
      showAlert('warning', 'Data Ruas Diperlukan', 'Mohon pilih Data Ruas sebelum menyimpan survey.');
      return;
    }
    // Validasi sub-pilihan kolektor
    if (formData.dataRuas === 'kolektor' && !formData.dataRuasSub) {
      showAlert('warning', 'Sub Ruas Diperlukan', 'Mohon pilih Sub-Data Ruas untuk Kolektor sebelum menyimpan.');
      return;
    }

    // Wajib mulai tugas dulu
    const currentTaskIdForSubmit = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
    if (!currentTaskIdForSubmit) {
      showAlert('warning', 'Mulai Tugas Dulu', 'Silakan tekan tombol "Mulai Tugas" pada halaman Detail Tugas sebelum mengisi dan menyimpan survey.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Tentukan adminId berdasarkan prioritas:
      // 1) currentTaskId dari sessionStorage
      // 2) Tugas terbaru untuk surveyor ini
      // 3) Profil petugas / users
      let adminId = null;
      // 1) currentTaskId
      try {
        const currentTaskId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
        if (currentTaskId) {
          const taskSnap = await getDoc(doc(db, 'task_assignments', currentTaskId));
          if (taskSnap.exists()) {
            const t = taskSnap.data() || {};
            adminId = t.createdBy || t.adminId || adminId;
          }
        }
      } catch (e) {
        console.warn('Gagal mengambil task via currentTaskId:', e?.message);
      }
      // Hindari kebutuhan composite index: ambil beberapa dokumen lalu sort di memori
      const latestTaskQ = query(
        collection(db, 'task_assignments'),
        where('surveyorId', '==', user.uid),
        limit(10)
      );
      const latestTaskSnap = await getDocs(latestTaskQ);
      if (!latestTaskSnap.empty) {
        const list = latestTaskSnap.docs
          .map(d => ({ id: d.id, ...(d.data() || {}) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return tb - ta;
          });
        const t = list[0] || {};
        adminId = adminId || t.createdBy || t.adminId || adminId;
      }
      
      // Bangun data dokumen minimal agar muncul di Validasi
      const docData = {
        adaIdTitik: formData.adaIdTitik,
        idTitik: formData.idTitik,
        namaJalan: formData.namaJalan || '',
        dataDaya: formData.dataDaya || '',
        dataTiang: formData.dataTiang || '',
        dataRuas: formData.dataRuas === 'kolektor' ? `Kolektor - ${formData.dataRuasSub}` : formData.dataRuas,
        jarakAntarTiang: formData.jarakAntarTiang || '',
        lebarJalan1: formData.lebarJalan1 || '',
        lebarJalan2: formData.lebarJalan2 || '',
        lebarBahuBertiang: formData.lebarBahuBertiang || '',
        lebarTrotoarBertiang: formData.lebarTrotoarBertiang || '',
        lainnyaBertiang: formData.lainnyaBertiang || '',
        hasFotoTitikAktual: !!formData.fotoTitikAktual,
        fotoTitikAktual: null,
        fotoKemerataan: null,
        keterangan: formData.keterangan || '',
        median: formData.median || '',
        tinggiMedian: formData.tinggiMedian || '',
        lebarMedian: formData.lebarMedian || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminId: adminId || null,
        surveyorId: user.uid,
        surveyorName: user.displayName || user.email || 'Surveyor',
        titikKordinat: formData.titikKordinat || '',
        validationStatus: 'pending',
        surveyType: 'apj_propose_tiang'
      };
      
      const docRef = await addDoc(collection(db, 'survey_apj_propose'), docData);
      console.log('APJ Propose doc created with ID:', docRef.id);

      // Upload photos (if any) to Firebase Storage under 'survey_apj'
      let fotoTitikAktualUrl = null;
      let fotoKemerataanUrl = null;
      const totalPhotos = (formData.fotoTitikAktual ? 1 : 0) + (formData.fotoKemerataan ? 1 : 0);
      let uploadedPhotos = 0;

      if (formData.fotoTitikAktual) {
        setToast({ show: true, message: `Mengupload foto titik aktual... (${uploadedPhotos + 1}/${totalPhotos})` });
        const up1 = await smartPhotoUpload(
          formData.fotoTitikAktual,
          'survey_apj',
          user.uid,
          docRef.id,
          'foto_titik_aktual',
          { forceApiRoute: true }
        );
        if (up1?.success) {
          fotoTitikAktualUrl = up1.downloadURL;
          uploadedPhotos++;
        } else {
          console.warn('Upload foto_titik_aktual gagal:', up1?.error || 'unknown');
        }
      }

      if (formData.fotoKemerataan) {
        setToast({ show: true, message: `Mengupload foto kemerataan... (${uploadedPhotos + 1}/${totalPhotos})` });
        const up2 = await smartPhotoUpload(
          formData.fotoKemerataan,
          'survey_apj',
          user.uid,
          docRef.id,
          'foto_kemerataan',
          { forceApiRoute: true }
        );
        if (up2?.success) {
          fotoKemerataanUrl = up2.downloadURL;
          uploadedPhotos++;
        } else {
          console.warn('Upload foto_kemerataan gagal:', up2?.error || 'unknown');
        }
      }

      if (fotoTitikAktualUrl || fotoKemerataanUrl) {
        const updateData = { updatedAt: serverTimestamp() };
        if (fotoTitikAktualUrl) updateData.fotoTitikAktual = fotoTitikAktualUrl;
        if (fotoKemerataanUrl) updateData.fotoKemerataan = fotoKemerataanUrl;
        await updateDoc(doc(db, 'survey_apj_propose', docRef.id), updateData);
      }

      // Reset form ringan
      setFormData(prev => ({
        adaIdTitik: '',
        idTitik: '',
        namaJalan: '',
        dataDaya: '',
        dataTiang: '',
        dataRuas: '',
        dataRuasSub: '',
        jarakAntarTiang: '',
        titikKordinat: prev.titikKordinat,
        lebarJalan1: '',
        lebarJalan2: '',
        lebarBahuBertiang: '',
        lebarTrotoarBertiang: '',
        lainnyaBertiang: '',
        ...{ fotoTitikAktual: null, fotoKemerataan: null, keterangan: '', median: '', tinggiMedian: '', lebarMedian: '' }
      }));
      
      // Notifikasi sukses sederhana
      showAlert('success', 'Data Berhasil Disimpan!', 'Data Survey APJ Propose (Tiang) berhasil disimpan dan akan muncul di Validasi.');
    } catch (error) {
      console.error('Gagal menyimpan survey APJ Propose (Tiang):', error);
      let errorMessage = 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.';
      if (error?.code === 'permission-denied') errorMessage = 'Tidak memiliki izin. Silakan login ulang.';
      showAlert('error', 'Gagal Menyimpan Data', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (field, event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                [field]: reader.result
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const renderInputField = (field, placeholder, type = 'text', icon = '📝') => (
    <div className="mb-3 dropdown-container">
      <div className="w-full backdrop-blur-sm border rounded-xl px-4 py-3 bg-white/90 border-gray-200">
          <div className="flex items-center">
              <div className="flex flex-col items-start w-full">
                  <label htmlFor={field} className="text-xs text-gray-500 font-medium">{placeholder}</label>
                  <input
                      id={field}
                      type={type}
                      value={formData[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      placeholder={placeholder.includes('Jalan') ? 'Masukkan nama jalan...' : '0'}
                      className="w-full bg-transparent text-sm text-black font-semibold focus:outline-none p-0 border-0"
                  />
              </div>
          </div>
      </div>
    </div>
  );

  const toggleDropdown = (field) => {
    const isOpening = !openDropdowns[field];
    // Tutup semua pop-up dan dropdown lain
    setShowIdTitikInput(false);
    setShowLebarJalanInput(false);
    setShowMedianInput(false);
    // Buka dropdown yang diklik, atau tutup semua jika diklik lagi
    setOpenDropdowns(isOpening ? { [field]: true } : {});
  };

  const selectOption = (field, value) => {
    setOpenDropdowns({});
    setShowIdTitikInput(false);
    setShowLebarJalanInput(false);
    setShowMedianInput(false);

    if (field === 'adaIdTitik' && value === 'Ada') {
        setShowIdTitikInput(true);
        setIdTitikInput(formData.idTitik || '');
        return;
    }

    if (field === 'lebarJalan' && value === '📏 Masukkan Lebar Jalan') {
        setShowLebarJalanInput(true);
        setLebarJalan1Input(formData.lebarJalan1 || '');
        setLebarJalan2Input(formData.lebarJalan2 || '');
        return;
    }

    if (field === 'median' && value === 'Ada') {
        setShowMedianInput(true);
        setTinggiMedianInput(formData.tinggiMedian || '');
        setLebarMedianInput(formData.lebarMedian || '');
        return;
    }
    
    if (field === 'median' && value === 'Tidak Ada') {
        setShowMedianInput(false);
        setTinggiMedianInput('');
        setLebarMedianInput('');
    }
    
    setFormData(prev => ({
        ...prev,
        [field]: value,
        ...(field === 'dataRuas' && value !== 'Kolektor' ? { dataRuasSub: '' } : {}),
        ...(field === 'adaIdTitik' && value === 'Tidak Ada' ? { idTitik: '' } : {}),
        ...(field === 'median' && value === 'Tidak Ada' ? { tinggiMedian: '', lebarMedian: '' } : {})
    }));
  };

  const handleIdTitikSave = () => {
    setFormData(prev => ({ ...prev, adaIdTitik: 'Ada', idTitik: idTitikInput.trim() }));
    setShowIdTitikInput(false);
    setOpenDropdowns({});
    setIdTitikInput('');
  };

  const handleLebarJalanSave = () => {
    setFormData(prev => ({ ...prev, lebarJalan1: lebarJalan1Input.trim(), lebarJalan2: lebarJalan2Input.trim() }));
    setShowLebarJalanInput(false);
    setOpenDropdowns({});
  };

  const handleMedianSave = () => {
    setFormData(prev => ({
        ...prev,
        median: 'Ada',
        tinggiMedian: tinggiMedianInput.trim(),
        lebarMedian: lebarMedianInput.trim()
    }));
    setShowMedianInput(false);
    setOpenDropdowns({});
  };

  const renderDropdownField = (field, label, placeholder, options, icon) => {
    const getDisplayValue = () => {
        if (field === 'adaIdTitik' && formData.adaIdTitik === 'Ada' && formData.idTitik) {
            return `Ada - ${formData.idTitik}`;
        }
        if (field === 'dataRuas' && formData.dataRuas === 'Kolektor' && formData.dataRuasSub) {
            return `Kolektor - ${formData.dataRuasSub}`;
        }
        if (field === 'median' && formData.median === 'Ada' && formData.tinggiMedian && formData.lebarMedian) {
            return `Ada - T: ${formData.tinggiMedian}m, L: ${formData.lebarMedian}m`;
        }
        return formData[field] || placeholder;
    };

    return (
        <div className="relative mb-3 dropdown-container">
            <button
                onClick={() => toggleDropdown(field)}
                className="w-full backdrop-blur-sm border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
            >
                <div className="flex items-center">
                    <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-500 font-medium">{label}</span>
                        <span className={`text-sm ${formData[field] ? 'text-black font-semibold' : 'text-gray-600'}`}>
                            {getDisplayValue()}
                        </span>
                    </div>
                </div>
                <ChevronDown size={18} className={`transition-transform duration-300 text-gray-400 group-hover:text-gray-600 ${openDropdowns[field] ? 'rotate-180' : ''}`} />
            </button>

            {openDropdowns[field] && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-300 p-2">
                    <div className="text-xs text-gray-500 font-medium px-3 py-2">Pilih {label}</div>
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => selectOption(field, option)}
                            className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl font-medium flex items-center gap-3"
                        >
                            <span>{option}</span>
                        </button>
                    ))}
                </div>
            )}

            {showIdTitikInput && field === 'adaIdTitik' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] p-4">
                    <h4 className="text-sm font-semibold text-gray-800 text-center pb-3 border-b">Masukkan ID Titik</h4>
                    <input
                        type="text"
                        value={idTitikInput}
                        onChange={(e) => setIdTitikInput(e.target.value)}
                        placeholder="Contoh: T-123"
                        className="w-full mt-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500"
                        autoFocus
                    />
                    <div className="flex gap-2 pt-3">
                        <button onClick={() => setShowIdTitikInput(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl">Batal</button>
                        <button onClick={handleIdTitikSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Simpan</button>
                    </div>
                </div>
            )}

            {showMedianInput && field === 'median' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] p-4">
                    <h4 className="text-sm font-semibold text-gray-800 text-center pb-3 border-b">Detail Median</h4>
                    <div className="space-y-3 pt-3">
                        <input type="number" value={tinggiMedianInput} onChange={(e) => setTinggiMedianInput(e.target.value)} placeholder="Tinggi Median (m)" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500" autoFocus />
                        <input type="number" value={lebarMedianInput} onChange={(e) => setLebarMedianInput(e.target.value)} placeholder="Lebar Median (m)" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500" />
                    </div>
                    <div className="flex gap-2 pt-3">
                        <button onClick={() => setShowMedianInput(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl">Batal</button>
                        <button onClick={handleMedianSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Simpan</button>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderImageUploadField = (field, label, description) => (
    <div className="mb-4">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <p className="text-xs text-gray-500 mb-3">{description}</p>
            <div className="flex items-center gap-3">
                <input type="file" accept="image/*" capture={isClient && /Android|iPhone|iPad/i.test(navigator.userAgent) ? "environment" : undefined} onChange={(e) => handleImageUpload(field, e)} className="hidden" id={`${field}-input`} />
                <label htmlFor={`${field}-input`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"><Camera size={16} /><span>{isClient && /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Ambil Foto' : 'Pilih Foto'}</span></label>
                {formData[field] && <button onClick={() => handleInputChange(field, null)} className="p-2 bg-red-100 text-red-600 rounded-lg"><X size={16} /></button>}
            </div>
            {formData[field] && <img src={formData[field]} alt="Preview" className="mt-3 rounded-lg w-full h-auto max-h-48 object-cover border" />}
        </div>
    </div>
  );

  const renderLebarJalanField = () => (
    <div className="relative mb-3 dropdown-container">
      <button
        onClick={() => toggleDropdown('lebarJalan')}
        className="w-full backdrop-blur-sm border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-all duration-300 group bg-white/90 border-gray-200 hover:border-gray-300 hover:shadow-md"
      >
        <div className="flex items-center">
            <div className="flex flex-col items-start">
                <span className="text-xs text-gray-500 font-medium">Lebar Jalan</span>
                <span className={`text-sm ${(formData.lebarJalan1 || formData.lebarJalan2) ? 'text-black font-semibold' : 'text-gray-600'}`}>
                    {formData.lebarJalan1 || formData.lebarJalan2 ? `J1: ${formData.lebarJalan1 || '-'}m, J2: ${formData.lebarJalan2 || '-'}m` : 'Masukkan Lebar Jalan'}
                </span>
            </div>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${openDropdowns['lebarJalan'] ? 'rotate-180' : ''}`} />
      </button>

      {openDropdowns['lebarJalan'] && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl z-[9999] p-2">
               <button onClick={() => selectOption('lebarJalan', '📏 Masukkan Lebar Jalan')} className="w-full px-4 py-3 text-left text-black hover:bg-blue-50 rounded-xl font-medium flex items-center gap-3">
                   <span>Masukkan Lebar Jalan</span>
               </button>
           </div>
       )}

      {showLebarJalanInput && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-[9999] p-4">
            <h4 className="text-sm font-semibold text-gray-800 text-center pb-3 border-b">Masukkan Lebar Jalan (m)</h4>
            <div className="space-y-3 pt-3">
                <input type="number" value={lebarJalan1Input} onChange={(e) => setLebarJalan1Input(e.target.value)} placeholder="Lebar Jalan 1" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500" autoFocus />
                <input type="number" value={lebarJalan2Input} onChange={(e) => setLebarJalan2Input(e.target.value)} placeholder="Lebar Jalan 2 (Opsional)" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500" />
            </div>
            <div className="flex gap-2 pt-3">
                <button onClick={() => { setShowLebarJalanInput(false); setOpenDropdowns({}); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl">Batal</button>
                <button onClick={handleLebarJalanSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Simpan</button>
            </div>
        </div>
      )}
    </div>
  );

  const renderLocationField = () => (
    <div className="mb-3">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-800 font-medium">Titik Koordinat</span>
          <div className="flex items-center gap-2">
            {/* Real-time toggle button */}
            <button
              onClick={toggleRealtimeLocation}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isRealtimeEnabled 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={isRealtimeEnabled ? 'Matikan pelacakan real-time' : 'Aktifkan pelacakan real-time'}
            >
              {isRealtimeEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
            </button>
            
            {locationStatus === 'loading' && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            )}
            <MapPin
              size={18}
              className={`${
                locationStatus === 'success'
                  ? 'text-green-500'
                  : locationStatus === 'error'
                  ? 'text-red-500'
                  : 'text-gray-400'
              }`}
            />
          </div>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={formData.titikKordinat}
            readOnly
            placeholder={
              locationStatus === 'loading'
                ? 'Mendapatkan lokasi...'
                : locationStatus === 'error'
                ? 'Gagal mendapatkan lokasi'
                : 'Koordinat akan terisi otomatis'
            }
            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono cursor-not-allowed ${
              locationStatus === 'success'
                ? 'text-green-700 bg-green-50 border-green-200'
                : locationStatus === 'error'
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-gray-500'
            }`}
          />
          {locationStatus === 'success' && (
            <button
              onClick={() => setShowMapModal(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              title="Lihat di peta"
            >
              <MapPin size={14} />
            </button>
          )}
        </div>
        
        {/* Status indicators */}
        <div className="mt-3 space-y-2">
          {/* Real-time status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                isRealtimeEnabled && isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}></span>
              <span className="text-xs text-gray-600">
                {isRealtimeEnabled && isWatching ? 'Pelacakan real-time aktif' : 'Pelacakan real-time nonaktif'}
              </span>
            </div>
            
            {!isRealtimeEnabled && (
              <button
                onClick={refreshLocation}
                className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                Refresh Manual
              </button>
            )}
          </div>
          
          {/* Accuracy indicator */}
          {locationAccuracy && (
            <div className="text-xs text-gray-500">
              Akurasi: ±{Math.round(locationAccuracy)}m
            </div>
          )}
          
          {/* Error display */}
          {locationStatus === 'error' && locationError && (
            <div className="text-xs text-red-600">
              {locationError.message || 'Gagal mendapatkan lokasi'}
            </div>
          )}
          
          {/* Last update time */}
          {locationTimestamp && isRealtimeEnabled && (
            <div className="text-xs text-gray-500">
              Terakhir diperbarui: {new Date(locationTimestamp).toLocaleTimeString('id-ID')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Show loading state while client is not ready
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  const dropdownOptions = {
    adaIdTitik: ['Ada', 'Tidak Ada'],
    dataDaya: ['120W', '90W', '60W', '40W'],
    dataTiang: ['7S', '7D', '7SG', '9S', '9D', '9SG'],
    dataRuas: ['Arteri', 'Kolektor'],
    dataRuasSub: ['Titik Nol', 'Kolektor A', 'Kolektor B', 'Wisata'],
    median: ['Ada', 'Tidak Ada'],
    lebarJalan: ['📏 Masukkan Lebar Jalan'],
  };

  return (
    <div className="min-h-screen bg-gray-50 relative z-0">
      {/* Modal Overlay and Camera (outside the faded wrapper) */}
      {showCameraModal && (
        <>
          <div className="fixed inset-0 bg-black z-[2147483646] pointer-events-auto" />
          {/* Placeholder for camera component if needed */}
        </>
      )}
      
      {/* Page Content Wrapper (hidden when camera modal open) */}
      <div className={`transition-opacity duration-200 ${showCameraModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} aria-hidden={showCameraModal ? 'true' : undefined}>
        {/* Toast */}
        {toast.show && (
          <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50`}>
            <div className="px-4 py-2 rounded-xl shadow-lg bg-gray-900/90 text-white text-sm border border-gray-700">
              {toast.message}
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="p-2 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200"><ArrowLeft size={18} /></button>
                    <h1 className="text-lg font-bold text-gray-800">Survey APJ Propose</h1>
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><span className="text-white">💡</span></div>
                </div>
            </div>
        </div>

        {/* Form */}
        <div className="px-3 py-4 pb-24 pt-20">
          <div className="max-w-md mx-auto space-y-1">
            {renderDropdownField('adaIdTitik', 'ID Titik', 'Pilih Status ID Titik', dropdownOptions.adaIdTitik, <Hash />)}
            {renderDropdownField('dataDaya', 'Daya Lampu', 'Pilih Daya Lampu', dropdownOptions.dataDaya, <Power />)}
            {renderDropdownField('dataTiang', 'Data Tiang', 'Pilih Data Tiang', dropdownOptions.dataTiang, <TowerControl />)}
            {renderDropdownField('dataRuas', 'Data Ruas', 'Pilih Data Ruas', dropdownOptions.dataRuas, <Route />)}
            {formData.dataRuas === 'Kolektor' && (
                <div className="pl-4 border-l-2 border-blue-200">
                    {renderDropdownField('dataRuasSub', 'Sub Ruas', 'Pilih Sub Ruas', dropdownOptions.dataRuasSub, <Route />)}
                </div>
            )}
            {renderDropdownField('median', 'Median', 'Pilih Status Median', dropdownOptions.median, <Construction />)}
            
          {renderLocationField()}
          {renderInputField('namaJalan', 'Nama Jalan', 'text')}
          {renderLebarJalanField()}
          {renderInputField('jarakAntarTiang', 'Jarak Antar Tiang (m)', 'number', '📏')}

          {renderInputField('lebarBahuBertiang', 'Lebar Bahu Bertiang (m)', 'number', '↔️')}
          {renderInputField('lebarTrotoarBertiang', 'Lebar Trotoar Bertiang (m)', 'number', '🚶')}
          {renderInputField('lainnyaBertiang', 'Lainnya Bertiang', 'text', '➕')}

          {renderImageUploadField('fotoTitikAktual', 'Foto Titik Aktual', 'Ambil foto kondisi aktual titik yang akan dipasang APJ.')}
          {renderGalleryUploadField('fotoKemerataan', 'Foto Kemerataan', 'Ambil dari galeri untuk dokumentasi kemerataan pencahayaan.')}
          
          <div className="mb-3">
            <textarea
              value={formData.keterangan}
              onChange={(e) => handleInputChange('keterangan', e.target.value)} // No change here, just for context
              placeholder="Keterangan"
              rows={3}
              className="w-full bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-600"
            />
          </div>

          {/* Submit Button - Right after Keterangan */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600'
              }`}
            >
              <Save size={18} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>



      {/* Close fading wrapper before independent modals */}
      </div>

      {/* Map Modal */}
      {showMapModal && formData.titikKordinat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Lokasi Koordinat</h3>
              <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Koordinat Saat Ini</span>
                </div>
                <p className="text-sm font-mono text-gray-600 bg-white p-2 rounded border">{formData.titikKordinat}</p>
              </div>
              <div className="bg-gray-100 rounded-xl overflow-hidden mb-4" style={{ height: '300px' }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.titikKordinat.split(',')[1]) - 0.01},${parseFloat(formData.titikKordinat.split(',')[0]) - 0.01},${parseFloat(formData.titikKordinat.split(',')[1]) + 0.01},${parseFloat(formData.titikKordinat.split(',')[0]) + 0.01}&layer=mapnik&marker=${formData.titikKordinat.split(',')[0]},${formData.titikKordinat.split(',')[1]}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Peta Lokasi"
                ></iframe>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const [lat, lng] = formData.titikKordinat.split(',').map((c) => c.trim());
                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 text-sm font-medium"
                >
                  Buka di Google Maps
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(formData.titikKordinat);
                    showAlert('success', 'Berhasil!', 'Koordinat berhasil disalin ke clipboard.');
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-xl hover:bg-gray-600 text-sm font-medium"
                >
                  Salin Koordinat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Maps Component - Always show if task is active */}
      <MiniMapsComponent 
        userId={user?.uid} 
        taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
        previewPoint={(() => {
          try {
            const [latStr, lngStr] = String(formData.titikKordinat || '').split(',').map(s => s.trim());
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null;
          } catch {
            return null;
          }
        })()}
      />

      {/* Modern Alert Modal */}
      <ModernAlertModal
        isVisible={alertModal.isVisible}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        autoClose={alertModal.type === 'success'}
        autoCloseDelay={4000}
      />

    </div>
  );
};

export default SurveyTiangAPJProposePage;

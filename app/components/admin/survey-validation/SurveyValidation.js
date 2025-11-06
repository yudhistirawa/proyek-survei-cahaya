import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, X, Eye, Edit, MapPin, User, Calendar, Settings, Database, FileText, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { firebaseApp } from '../../../lib/firebase';
import SurveyDetailModal from '../../modals/SurveyDetailModal';
import SurveyEditModal from '../../modals/SurveyEditModal';
import SurveyValidationModal from '../../modals/SurveyValidationModal';


const SurveyValidation = ({
  searchTerm,
  currentUser
}) => {
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [showSurveyDetail, setShowSurveyDetail] = useState(false);
  const [showSurveyValidation, setShowSurveyValidation] = useState(false);
  const [showSurveyEdit, setShowSurveyEdit] = useState(false);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, survey: null, action: null, loading: false });
  const [editingValidSurvey, setEditingValidSurvey] = useState(false);
  const [lastValidatedSurveyId, setLastValidatedSurveyId] = useState(null);
  
  // Pagination dan filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, validated, rejected
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name
  
  // States untuk Valid Survey Data
  const [validSurveys, setValidSurveys] = useState([]);
  const [loadingValidSurveys, setLoadingValidSurveys] = useState(true);
  const [validSurveyCurrentPage, setValidSurveyCurrentPage] = useState(1);
  const [validSurveyItemsPerPage, setValidSurveyItemsPerPage] = useState(10);
  
  // Refs untuk auto focus dan scroll
  const confirmButtonRef = useRef(null);
  const surveyRefs = useRef({});
  

  // Removed: maps survey valid section and data loading for Validasi Survey page

  // Load assigned surveyors from task_assignments and then load their surveys
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoadingSurveys(true);
        const db = getFirestore(firebaseApp);
        const adminUid = currentUser?.uid;
        const role = currentUser?.role;
        
        if (!adminUid) {
          setSurveys([]);
          setLoadingSurveys(false);
          return () => {};
        }

        let existingQueryNew, existingQueryLegacy, proposeQueryNew, proposeQueryLegacy;

        if (role === 'super_admin') {
          // Super Admin: ambil SEMUA data tanpa filter adminId
          existingQueryNew = collection(db, 'survey_existing');
          existingQueryLegacy = collection(db, 'Survey_Existing_Report');
          proposeQueryNew = collection(db, 'survey_apj_propose');
          proposeQueryLegacy = collection(db, 'APJ_Propose_Tiang');
        } else {
          // Admin biasa: batasi berdasarkan adminId / penugasan
          // 1. Dapatkan daftar surveyor yang ditugaskan ke admin ini via API (menghindari kendala rules client)
          const taskRes = await fetch('/api/task-assignments', {
            headers: { 'x-admin-id': adminUid }
          });
          if (!taskRes.ok) {
            const text = await taskRes.text();
            throw new Error(`Gagal mengambil daftar tugas (HTTP ${taskRes.status}) ${text}`);
          }
          const taskJson = await taskRes.json();
          const assignedSurveyorIds = Array.from(new Set(
            (taskJson?.data || [])
              .map(t => t.surveyorId)
              .filter(Boolean)
          ));

          // Jika tidak ada surveyor yang ditugaskan, set empty array
          if (assignedSurveyorIds.length === 0) {
            setSurveys([]);
            setLoadingSurveys(false);
            return;
          }
          
          // 2. Query survey berdasarkan adminId saja agar konsisten dengan stamping saat submit
          existingQueryNew = query(collection(db, 'survey_existing'), where('adminId', '==', adminUid));
          existingQueryLegacy = query(collection(db, 'Survey_Existing_Report'), where('adminId', '==', adminUid));
          proposeQueryNew = query(collection(db, 'survey_apj_propose'), where('adminId', '==', adminUid));
          proposeQueryLegacy = query(collection(db, 'APJ_Propose_Tiang'), where('adminId', '==', adminUid));
        }

        // Listen to both collections
        const handleExistingSnapshot = (snapshot, sourceLabel) => {
          try {
            const existingSurveys = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              const normalizedStatus = data.status || data.validationStatus || 'pending';
              existingSurveys.push({
                id: doc.id,
                ...data,
                status: normalizedStatus,
                collectionName: 'survey_existing',
                originalCollectionName: sourceLabel,
                surveyType: 'Survey Existing',
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
                timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp || Date.now())
              });
            });
            console.log(`[SurveyValidation] Existing snapshot (${sourceLabel}): count=`, existingSurveys.length, 'ids=', existingSurveys.slice(0,3).map(s=>s.id));
            
            // Update surveys state dengan sorting di client-side
            setSurveys(prevSurveys => {
              // Ambil existing dari sumber lain agar tidak ter-overwrite
              const otherExisting = prevSurveys.filter(
                s => s.collectionName === 'survey_existing' && s.originalCollectionName !== sourceLabel
              );
              // JANGAN hilangkan data APJ Propose ketika existing snapshot update
              const proposeSurveys = prevSurveys.filter(
                s => s.collectionName === 'survey_apj_propose' || s.collectionName === 'apj_propose_tiang'
              );
              const mergedExisting = [...otherExisting, ...existingSurveys];
              const allSurveys = [...mergedExisting, ...proposeSurveys];
              console.log('[SurveyValidation] Merged existing+propose counts:', { existing_current: existingSurveys.length, existing_other: otherExisting.length, propose: proposeSurveys.length, total: allSurveys.length });
              
              // Sample data injection previously used for testing.
              // It is now disabled so that the list accurately reflects real data.
              const ENABLE_SAMPLE_DATA = false;
              if (ENABLE_SAMPLE_DATA && allSurveys.length === 0) {
                // keep block for future local testing, but do not populate in production
              }
              
              // Sort by createdAt descending
              return allSurveys.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                return dateB - dateA;
              });
            });
          } catch (error) {
            console.error('Error processing existing surveys:', error);
            setError('Gagal memproses data survey existing');
          }
        };

        const unsubscribeExistingNew = onSnapshot(existingQueryNew, (snap) => handleExistingSnapshot(snap, 'survey_existing'), (error) => {
          console.error('Error listening to existing surveys (new):', error);
          setError('Gagal memuat data survey existing');
        });
        const unsubscribeExistingLegacy = onSnapshot(existingQueryLegacy, (snap) => handleExistingSnapshot(snap, 'Survey_Existing_Report'), (error) => {
          console.error('Error listening to existing surveys (legacy):', error);
          setError('Gagal memuat data survey existing');
        });

        const handleProposeSnapshot = (snapshot, sourceLabel) => {
          try {
            const proposeSurveys = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              // Normalisasi status: gunakan status || validationStatus || 'pending'
              const normalizedStatus = data.status || data.validationStatus || 'pending';
              const normalizedSurveyorName =
                data.surveyorName ||
                data.surveyor_name ||
                data.surveyor ||
                data.userDisplayName ||
                data.displayName ||
                data.userEmail ||
                data.email ||
                data.surveyorId ||
                data.userId ||
                'Tidak Diketahui';
              proposeSurveys.push({
                id: doc.id,
                ...data,
                status: normalizedStatus,
                collectionName: 'survey_apj_propose',
                originalCollectionName: sourceLabel,
                surveyType: 'Survey APJ Propose',
                surveyorName: normalizedSurveyorName,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
                timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp || Date.now())
              });
            });
            console.log(`[SurveyValidation] Propose snapshot (${sourceLabel}): count=`, proposeSurveys.length, 'ids=', proposeSurveys.slice(0,3).map(s=>s.id));
            
            // Update surveys state dengan sorting di client-side
            setSurveys(prevSurveys => {
              // Ambil propose dari sumber lain agar tidak ter-overwrite
              const otherPropose = prevSurveys.filter(s => s.collectionName === 'survey_apj_propose' && s.originalCollectionName !== sourceLabel);
              const existingSurveys = prevSurveys.filter(s => s.collectionName === 'survey_existing');
              const mergedPropose = [...otherPropose, ...proposeSurveys];
              const allSurveys = [...existingSurveys, ...mergedPropose];
              console.log('[SurveyValidation] Merged propose+existing counts:', { propose_current: proposeSurveys.length, propose_other: otherPropose.length, existing: existingSurveys.length, total: allSurveys.length });
              // Sort by createdAt descending
              return allSurveys.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                return dateB - dateA;
              });
            });
          } catch (error) {
            console.error('Error processing propose surveys:', error);
            setError('Gagal memproses data survey APJ propose');
          }
        };

        const unsubscribeProposeNew = onSnapshot(proposeQueryNew, (snap) => handleProposeSnapshot(snap, 'survey_apj_propose'), (error) => {
          console.error('Error listening to propose surveys (new):', error);
          setError('Gagal memuat data survey APJ propose');
        });
        const unsubscribeProposeLegacy = onSnapshot(proposeQueryLegacy, (snap) => handleProposeSnapshot(snap, 'APJ_Propose_Tiang'), (error) => {
          console.error('Error listening to propose surveys (legacy):', error);
          setError('Gagal memuat data survey APJ propose');
        });

        setLoadingSurveys(false);

        // Cleanup listeners
        return () => {
          unsubscribeExistingNew();
          unsubscribeExistingLegacy();
          unsubscribeProposeNew();
          unsubscribeProposeLegacy();
        };
      } catch (error) {
        console.error('Error loading surveys:', error);
        setError('Gagal memuat data survey');
        setLoadingSurveys(false);
      }
    };

    loadSurveys();
  }, [currentUser?.uid]);

  // Load valid surveys from Valid_Survey_Data collection
  useEffect(() => {
    const loadValidSurveys = async () => {
      try {
        setLoadingValidSurveys(true);
        const db = getFirestore(firebaseApp);
        
        // Query for Valid_Survey_Data collection
        const validSurveyQuery = query(
          collection(db, 'Valid_Survey_Data')
        );

        // Listen to Valid_Survey_Data collection
        const unsubscribeValid = onSnapshot(validSurveyQuery, (snapshot) => {
          try {
            const validSurveyData = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              validSurveyData.push({
                id: doc.id,
                ...data,
                collectionName: 'Valid_Survey_Data',
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
                validatedAt: data.validatedAt?.toDate?.() || new Date(data.validatedAt || Date.now())
              });
            });
            
            // Sort by validatedAt descending
            const sortedValidSurveys = validSurveyData.sort((a, b) => {
              const dateA = a.validatedAt instanceof Date ? a.validatedAt : new Date(a.validatedAt);
              const dateB = b.validatedAt instanceof Date ? b.validatedAt : new Date(b.validatedAt);
              return dateB - dateA;
            });
            
            setValidSurveys(sortedValidSurveys);
            setLoadingValidSurveys(false);
          } catch (error) {
            console.error('Error processing valid surveys:', error);
            setLoadingValidSurveys(false);
          }
        }, (error) => {
          console.error('Error listening to valid surveys:', error);
          setLoadingValidSurveys(false);
        });

        // Cleanup listener
        return () => {
          unsubscribeValid();
        };
      } catch (error) {
        console.error('Error loading valid surveys:', error);
        setLoadingValidSurveys(false);
      }
    };

    loadValidSurveys();
  }, []);

  const handleSurveyDetail = (survey) => {
    setSelectedSurvey(survey);
    setShowSurveyDetail(true);
  };

  const handleSurveyValidation = (survey) => {
    setSelectedSurvey(survey);
    setShowSurveyValidation(true);
  };

  const handleSurveyEdit = (survey) => {
    setSelectedSurvey(survey);
    setShowSurveyEdit(true);
  };

  const handleEditValidSurvey = (survey) => {
    setSelectedSurvey(survey);
    setEditingValidSurvey(true); // Tandai bahwa kita mengedit data valid
    setShowSurveyDetail(false); // Tutup modal detail jika terbuka
    setShowSurveyEdit(true);
  };

  // Function to handle survey validation
  const handleValidateSurvey = async (surveyId, action, notes) => {
    try {
      const survey = surveys.find(s => s.id === surveyId);
      if (!survey) {
        throw new Error('Survey tidak ditemukan');
      }

      const db = getFirestore(firebaseApp);
      const collectionPath = survey.originalCollectionName || survey.collectionName;
      const surveyRef = doc(db, collectionPath, surveyId);

      // Update status to validated on source document
      await updateDoc(surveyRef, {
        status: 'validated',
        validationStatus: 'validated',
        validatedAt: new Date(),
        validatedBy: currentUser?.displayName || currentUser?.email || 'Admin',
        validationNotes: notes,
        validationAction: action
      });

      // Fetch the latest document AFTER update to ensure we copy most recent fields
      // including titikKordinatBaru / namaJalanBaru edited by admin.
      let latestData = survey;
      try {
        const latestSnap = await getDoc(surveyRef);
        if (latestSnap.exists()) {
          latestData = latestSnap.data();
        }
      } catch (fetchErr) {
        console.warn('SurveyValidation: gagal mengambil snapshot terbaru, gunakan data cache:', fetchErr);
      }

      // Move to Valid Survey Data collection using latest data
      // Derive category/zone so Data Survey Valid can filter correctly
      const isAPJPropose = /apj|propose/i.test(String(collectionPath || '')) ||
        String(survey?.collectionName || '').toLowerCase() === 'survey_apj_propose' ||
        String(survey?.surveyType || '').toLowerCase().includes('apj');

      const validSurveyData = {
        ...latestData,
        originalCollection: collectionPath,
        originalId: surveyId,
        adminId: survey.adminId || currentUser?.uid || null,
        // Ensure validated status fields exist on the valid doc
        status: 'validated',
        validationStatus: 'validated',
        validatedAt: new Date(),
        validatedBy: currentUser?.displayName || currentUser?.email || 'Admin',
        validationNotes: notes,
        validationAction: action,
        movedAt: new Date(),
        // Normalized fields for Valid_Survey_Data listing & filtering
        surveyCategory: isAPJPropose ? 'survey_apj_propose' : 'survey_existing',
        surveyZone: isAPJPropose ? 'propose' : 'existing',
        // Keep a friendly surveyType for UI
        surveyType: latestData?.surveyType || (isAPJPropose ? 'Survey APJ Propose' : 'Survey Existing'),
        // Optional collection name hint for consumers
        collectionName: latestData?.collectionName || (isAPJPropose ? 'Tiang_APJ_Propose_Report' : 'Survey_Existing_Report')
      };

      // Remove fields that shouldn't be in valid data
      delete validSurveyData.id;

      // Add to Valid Survey Data collection
      await addDoc(collection(db, 'Valid_Survey_Data'), validSurveyData);

      // Delete from original collection
      await deleteDoc(surveyRef);

      alert(`Survey berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'} dan dipindahkan ke Data Survey Valid!`);
    } catch (error) {
      console.error('Error validating survey:', error);
      throw error;
    }
  };

  // Auto focus pada modal konfirmasi
  useEffect(() => {
    if (confirmState.open && confirmButtonRef.current) {
      // Delay sedikit untuk memastikan modal sudah ter-render
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
  }, [confirmState.open]);

  // Auto scroll ke survey yang baru divalidasi
  useEffect(() => {
    if (lastValidatedSurveyId && surveyRefs.current[lastValidatedSurveyId]) {
      setTimeout(() => {
        surveyRefs.current[lastValidatedSurveyId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        // Reset setelah scroll
        setLastValidatedSurveyId(null);
      }, 500);
    }
  }, [surveys, lastValidatedSurveyId]);

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy]);

  // Open custom confirmation modal
  const openConfirm = (survey, action) => {
    setConfirmState({ open: true, survey, action, loading: false });
  };

  // Confirm action handler
  const confirmAction = async () => {
    const { survey, action } = confirmState;
    if (!survey || !action) return;
    setConfirmState((s) => ({ ...s, loading: true }));
    const actionText = action === 'approve' ? 'menyetujui' : 'menolak';
    try {
      await handleValidateSurvey(
        survey.id,
        action,
        action === 'approve' ? 'Disetujui melalui validasi cepat' : 'Ditolak melalui validasi cepat'
      );
      // Set survey ID untuk auto scroll setelah validasi
      setLastValidatedSurveyId(survey.id);
      setConfirmState({ open: false, survey: null, action: null, loading: false });
    } catch (error) {
      alert(`Gagal ${actionText} survey: ${error.message}`);
      setConfirmState({ open: false, survey: null, action: null, loading: false });
    }
  };

  // Cancel confirmation
  const cancelConfirm = () => setConfirmState({ open: false, survey: null, action: null, loading: false });

  // Function to handle survey deletion
  const handleDeleteSurvey = async (surveyId) => {
    try {
      const survey = surveys.find(s => s.id === surveyId);
      if (!survey) {
        throw new Error('Survey tidak ditemukan');
      }

      const db = getFirestore(firebaseApp);
      const collectionPath = survey.originalCollectionName || survey.collectionName;
      const surveyRef = doc(db, collectionPath, surveyId);

      // Delete from Firebase
      await deleteDoc(surveyRef);

      alert('Survey berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert(`Gagal menghapus survey: ${error.message}`);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (survey) => {
    if (confirm(`Apakah Anda yakin ingin menghapus survey "${survey.namaJalan || survey.idTitik || 'Survey ini'}"?\n\nData akan dihapus permanen dari Firebase.`)) {
      handleDeleteSurvey(survey.id);
    }
  };

  // Function to handle survey edit
  const handleSaveSurvey = async (surveyId, updatedData) => {
    const isEditingValid = editingValidSurvey;
    try {
      // Cari survey di list yang belum divalidasi atau yang sudah divalidasi
      const survey = surveys.find(s => s.id === surveyId) || validSurveys.find(s => s.id === surveyId);
      if (!survey) {
        throw new Error('Survey tidak ditemukan');
      }

      const db = getFirestore(firebaseApp);
      // Tentukan collection path berdasarkan apakah data yang diedit sudah valid atau belum
      const collectionPath = isEditingValid ? 'Valid_Survey_Data' : (survey.originalCollectionName || survey.collectionName);
      const surveyRef = doc(db, collectionPath, surveyId);

      // Jika mengedit data yang sudah valid, jangan ubah status validasi
      if (isEditingValid) {
        await updateDoc(surveyRef, {
          ...updatedData,
          updatedAt: new Date(),
          modifiedBy: currentUser?.displayName || currentUser?.email || 'Super Admin',
          lastEditedAs: 'valid' // Penanda tambahan
        });
        alert('Data survey yang sudah valid berhasil diperbarui!');
        setEditingValidSurvey(false); // Reset status edit
        return; // Selesai
      }

      await updateDoc(surveyRef, {
        ...updatedData,
        updatedAt: new Date(),
        modifiedBy: currentUser?.displayName || currentUser?.email || 'Admin' // Menggunakan modifiedBy
      });

      // Update local state so subsequent actions (like validate) see the latest fields
      try {
        setSurveys(prev =>
          prev.map(s => (s.id === surveyId ? { ...s, ...updatedData, updatedAt: new Date() } : s))
        );
      } catch (stateErr) {
        console.warn('SurveyValidation: gagal mengupdate state lokal setelah edit:', stateErr);
      }

      alert('Survey berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating survey:', error);
      throw error;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        text: 'Menunggu',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock
      },
      validated: {
        text: 'Tervalidasi',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      },
      rejected: {
        text: 'Ditolak',
        color: 'bg-red-100 text-red-800',
        icon: X
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent size={12} className="mr-1" />
        {config.text}
      </span>
    );
  };

  // Get primary photo URL from survey data
  const getPrimaryPhotoUrl = (survey) => {
    if (!survey) return null;
    
    const col = String(survey.collectionName || '').toLowerCase();

    // For Survey Existing
    if (col === 'survey_existing' || col === 'survey_existing_report') {
      if (survey.fotoTitikAktual) return survey.fotoTitikAktual;
      if (survey.fotoTinggiARM) return survey.fotoTinggiARM;
      if (survey.fotoLampu) return survey.fotoLampu;
      if (survey.fotoTrafo) return survey.fotoTrafo;
    }
    
    // For Survey APJ Propose - prefer Foto Kemerataan over ARM
    if (col === 'survey_apj_propose' || col === 'tiang_apj_propose_report' || col === 'apj_propose_tiang') {
      if (survey.fotoTitikAktual) return survey.fotoTitikAktual;
      if (survey.fotoKemerataan) return survey.fotoKemerataan;
      if (survey.fotoLampu) return survey.fotoLampu;
      if (survey.fotoTinggiARM) return survey.fotoTinggiARM;
    }
    
    // Check for documentation photos array
    if (Array.isArray(survey.documentationPhotos) && survey.documentationPhotos.length > 0) {
      return survey.documentationPhotos[0];
    }
    
    return null;
  };

  // Survey categories configuration
  const surveyCategories = {
    'Survey Existing': {
      icon: '🗂️',
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'bg-blue-100',
      description: 'Survey Existing dan infrastruktur pendukung',
      collection: 'survey_existing'
    },
    'Survey APJ Propose': {
      icon: '💡',
      color: 'bg-green-50 border-green-200',
      headerColor: 'bg-green-100',
      description: 'Survey usulan tiang APJ baru',
      collection: 'survey_apj_propose'
    }
  };

  // Filter surveys based on search term and apply filters
  const getFilteredSurveys = () => {
    let filtered = surveys.filter(survey => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        survey.namaJalan?.toLowerCase().includes(searchLower) ||
        survey.idTitik?.toLowerCase().includes(searchLower) ||
        survey.surveyorName?.toLowerCase().includes(searchLower) ||
        survey.surveyType?.toLowerCase().includes(searchLower) ||
        survey.kepemilikanTiang?.toLowerCase().includes(searchLower) ||
        survey.jenisTiang?.toLowerCase().includes(searchLower)
      );
    });

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(survey => {
        if (statusFilter === 'pending') return survey.status === 'pending';
        if (statusFilter === 'validated') return survey.status === 'validated';
        if (statusFilter === 'rejected') return survey.status === 'rejected';
        return true;
      });
    }

    return filtered;
  };

  const filteredSurveys = getFilteredSurveys();

  // Apply sorting
  const sortedSurveys = [...filteredSurveys].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB - dateA;
    } else if (sortBy === 'oldest') {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateA - dateB;
    } else if (sortBy === 'name') {
      return (a.surveyorName || '').localeCompare(b.surveyorName || '');
    }
    return 0;
  });

  // Apply pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSurveys = sortedSurveys.slice(startIndex, endIndex);

  // Group paginated surveys by category
  const groupedSurveys = {};
  Object.keys(surveyCategories).forEach(category => {
    groupedSurveys[category] = [];
  });

  paginatedSurveys.forEach(survey => {
    const category = survey.surveyType || 'Survey Existing';
    if (groupedSurveys[category]) {
      groupedSurveys[category].push(survey);
    }
  });

  // Calculate statistics (from all filtered surveys, not just paginated)
  const totalSurveys = sortedSurveys.length;
  const pendingSurveys = sortedSurveys.filter(s => s.status === 'pending').length;
  const validatedSurveys = sortedSurveys.filter(s => s.status === 'validated').length;
  const totalPages = Math.ceil(totalSurveys / itemsPerPage);

  return (
    <>
      {/* Background biru muda */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Card putih yang menutupi seluruh area dengan padding yang lebih rapi */}
        <div className="min-h-screen bg-white rounded-xl shadow-lg mx-6 my-4">
          <div className="px-8 py-6">
            {/* Header Section dengan styling yang lebih baik */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Validasi Survey</h1>
                <p className="text-gray-600 text-lg">Kelola dan pantau aktivitas survey</p>
              </div>
            
              {/* Summary Stats dengan styling yang lebih modern */}
              <div className="flex items-center space-x-6">
                <div className="text-center bg-blue-50 px-6 py-4 rounded-xl border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600">{totalSurveys}</div>
                  <div className="text-sm text-blue-700 font-medium">Total Survey</div>
                </div>
                <div className="text-center bg-yellow-50 px-6 py-4 rounded-xl border border-yellow-100">
                  <div className="text-3xl font-bold text-yellow-600">{pendingSurveys}</div>
                  <div className="text-sm text-yellow-700 font-medium">Menunggu</div>
                </div>
                <div className="text-center bg-green-50 px-6 py-4 rounded-xl border border-green-100">
                  <div className="text-3xl font-bold text-green-600">{validatedSurveys}</div>
                  <div className="text-sm text-green-700 font-medium">Tervalidasi</div>
                </div>
              </div>
            </div>

            {/* Filter dan Pagination Controls dengan styling yang lebih baik */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Filter Controls dengan styling yang lebih modern */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-bold text-gray-900">Filter:</span>
                  </div>
                  
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 text-sm font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-xl shadow-sm hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu</option>
                    <option value="validated">Tervalidasi</option>
                    <option value="rejected">Ditolak</option>
                  </select>

                  {/* Sort Filter */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 text-sm font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-xl shadow-sm hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="name">Nama Surveyor</option>
                  </select>
                </div>

                {/* Items per page dan info dengan styling yang lebih baik */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Tampilkan:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-4 py-3 text-sm font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-xl shadow-sm hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm font-medium text-gray-900">per halaman</span>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalSurveys)} dari {totalSurveys} data
                  </div>
                </div>
              </div>
            </div>

            {/* Content dengan spacing yang lebih baik */}
            <div className="space-y-8">
              {loadingSurveys ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Memuat data survey...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-xl font-semibold text-red-600 mb-2">Error</p>
                  <p className="text-gray-500">{error}</p>
                </div>
              ) : totalSurveys === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl font-semibold text-gray-600 mb-2">
                    {searchTerm ? 'Tidak ada survey yang sesuai dengan pencarian' : 'Belum ada data survey'}
                  </p>
                  <p className="text-gray-500">
                    {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Data survey akan muncul di sini setelah surveyor mengirim data'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(surveyCategories).map(([categoryName, categoryConfig]) => {
                    const surveysInCategory = groupedSurveys[categoryName] || [];
                    
                    return (
                      <div key={categoryName} className={`border rounded-xl ${categoryConfig.color}`}>
                        <div className={`${categoryConfig.headerColor} px-6 py-4 border-b border-gray-200 rounded-t-xl`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{categoryConfig.icon}</span>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">{categoryName}</h3>
                                <p className="text-sm text-gray-600">{categoryConfig.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full border">
                                {surveysInCategory.length} Survey
                              </span>
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                <Database size={12} />
                                {categoryConfig.collection}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                          {surveysInCategory.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="text-4xl mb-3 opacity-50">{categoryConfig.icon}</div>
                              <p className="text-gray-500">Belum ada data {categoryName.toLowerCase()}</p>
                            </div>
                          ) : (
                            surveysInCategory.map((survey) => (
                              <div 
                                key={survey.id} 
                                ref={el => surveyRefs.current[survey.id] = el}
                                className="p-4 hover:bg-white/50 transition-colors duration-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className="flex items-start gap-3">
                                        {getPrimaryPhotoUrl(survey) ? (
                                          <img
                                            src={getPrimaryPhotoUrl(survey)}
                                            alt={survey.namaJalan || survey.idTitik || 'Foto survey'}
                                            className="w-16 h-12 rounded-md object-cover border"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-16 h-12 rounded-md bg-gray-100 border flex items-center justify-center text-xs text-gray-400">
                                            No Foto
                                          </div>
                                        )}
                                        <div>
                                          <h4 className="font-semibold text-gray-900">
                                            {survey.namaJalan || survey.idTitik || 'Judul Tidak Tersedia'}
                                          </h4>
                                          <div className="flex items-center gap-2 mt-1">
                                            {getStatusBadge(survey.status)}
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                              {survey.collectionName}
                                            </span>
                                        {/* Tanda sudah diedit */}
                                        {survey.modifiedBy && (
                                          <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded-full flex items-center gap-1">
                                            <Edit size={12} /> Diedit oleh {survey.modifiedBy}
                                          </span>
                                        )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                      <div className="flex items-center space-x-2">
                                        <User size={14} className="text-gray-400" />
                                        <span>{survey.surveyorName || 'Tidak Diketahui'}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span>
                                          {survey.createdAt ? (
                                            <>
                                              {new Date(survey.createdAt).toLocaleDateString('id-ID')}
                                              <span className="text-xs text-gray-500 ml-1">
                                                {new Date(survey.createdAt).toLocaleTimeString('id-ID', { 
                                                  hour: '2-digit', 
                                                  minute: '2-digit',
                                                  hour12: false 
                                                })}
                                              </span>
                                            </>
                                          ) : 'Tidak Diketahui'}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{survey.titikKordinat || 'Lokasi tidak diketahui'}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Survey specific details */}
                                    {categoryName === 'Survey Existing' && (
                                      <div className="mt-2 text-xs text-gray-500 bg-white/70 rounded px-2 py-1 inline-block">
                                        Kepemilikan: {survey.kepemilikanTiang || 'N/A'} • Jenis: {survey.jenisTiang || 'N/A'} • Tinggi ARM: {survey.tinggiARM ? `${survey.tinggiARM}m` : 'N/A'}
                                      </div>
                                    )}
                                    {categoryName === 'Survey APJ Propose' && (
                                      <div className="mt-2 text-xs text-gray-500 bg-white/70 rounded px-2 py-1 inline-block">
                                        Daya: {survey.daya || survey.dataDaya || 'N/A'} • Data Tiang: {survey.dataTiang || survey.tiang || 'N/A'} • Jarak: {survey.jarakAntarTiang || survey.jarak ? `${survey.jarakAntarTiang || survey.jarak}m` : 'N/A'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 ml-4">
                                    <button
                                      onClick={() => handleSurveyDetail(survey)}
                                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                      title="Lihat Detail"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleSurveyEdit(survey)}
                                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                                      title="Edit Survey"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => openDeleteConfirm(survey)}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                      title="Hapus Survey"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    {survey.status === 'pending' && (
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => openConfirm(survey, 'approve')}
                                          className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-1"
                                          title="Validasi Survey"
                                        >
                                          <CheckCircle size={14} />
                                          <span>Validasi</span>
                                        </button>
                                        <button
                                          onClick={() => openConfirm(survey, 'reject')}
                                          className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1"
                                          title="Tolak Survey"
                                        >
                                          <X size={14} />
                                          <span>Tolak</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls dengan styling yang lebih baik */}
              {totalPages > 1 && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-sm"
                      >
                        <ChevronLeft size={16} />
                        Sebelumnya
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 text-gray-500">
                              <MoreHorizontal size={16} />
                            </span>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition-all duration-200"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-sm"
                      >
                        Selanjutnya
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Components */}
      {showSurveyDetail && selectedSurvey && (
        <SurveyDetailModal
          isOpen={showSurveyDetail}
          onClose={() => {
            setShowSurveyDetail(false);
            setSelectedSurvey(null);
          }}
          surveyData={selectedSurvey}
          onEdit={() => {
            setShowSurveyDetail(false);
            setShowSurveyEdit(true);
          }}
          currentUser={currentUser} // Kirim info user saat ini
        />
      )}

      {showSurveyEdit && selectedSurvey && (
        <SurveyEditModal
          isOpen={showSurveyEdit}
          onClose={() => {
            setShowSurveyEdit(false);
            setSelectedSurvey(null);
          }}
          surveyData={selectedSurvey}
          onSave={handleSaveSurvey}
        />
      )}

      {showSurveyValidation && selectedSurvey && (
        <SurveyValidationModal
          isOpen={showSurveyValidation}
          onClose={() => {
            setShowSurveyValidation(false);
            setSelectedSurvey(null);
          }}
          surveyData={selectedSurvey}
          onValidate={handleValidateSurvey}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelConfirm} />
          {/* Dialog */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 animate-[fadeIn_120ms_ease-out]">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${confirmState.action === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {confirmState.action === 'approve' ? <CheckCircle size={18} /> : <X size={18} />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Konfirmasi {confirmState.action === 'approve' ? 'Persetujuan' : 'Penolakan'}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Apakah Anda yakin ingin {confirmState.action === 'approve' ? 'menyetujui' : 'menolak'} survey
                    {` "${confirmState.survey?.namaJalan || confirmState.survey?.idTitik || 'Survey ini'}"`}?
                  </p>
                </div>
              </div>
              {/* Details row */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="font-medium text-gray-700">Kategori</div>
                  <div>{confirmState.survey?.surveyType || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="font-medium text-gray-700">Lokasi</div>
                  <div className="truncate">{confirmState.survey?.titikKordinat || '-'}</div>
                </div>
              </div>
              {/* Actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={cancelConfirm}
                  disabled={confirmState.loading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={confirmAction}
                  disabled={confirmState.loading}
                  className={`px-4 py-2 rounded-lg text-white font-medium shadow-sm transition disabled:opacity-50 ${confirmState.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {confirmState.loading ? 'Memproses...' : (confirmState.action === 'approve' ? 'Setujui' : 'Tolak')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurveyValidation;

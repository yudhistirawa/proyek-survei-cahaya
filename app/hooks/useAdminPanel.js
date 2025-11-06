import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChange, getUserData, getAllUsers, deleteUser, registerUser } from '../lib/auth';

export const useAdminPanel = () => {
  // User states
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [activeMenu, setActiveMenu] = useState('Home');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // User management states
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Form states for user registration
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'petugas_surveyor',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Task assignment states
  const [showTaskAssignment, setShowTaskAssignment] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);
  const [surveyorUsers, setSurveyorUsers] = useState([]);
  const [loadingSurveyors, setLoadingSurveyors] = useState(false);

  // Propose data states
  const [proposeData, setProposeData] = useState([]);
  const [loadingProposeData, setLoadingProposeData] = useState(false);
  const [proposeDataText, setProposeDataText] = useState('');
  const [showDataSelectionModal, setShowDataSelectionModal] = useState(false);
  const [availableData, setAvailableData] = useState([]);
  const [selectedDataItems, setSelectedDataItems] = useState([]);

  // Survey validation states
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [showSurveyDetail, setShowSurveyDetail] = useState(false);
  const [showSurveyValidation, setShowSurveyValidation] = useState(false);
  const [showSurveyEdit, setShowSurveyEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Valid surveys states
  const [validSurveys, setValidSurveys] = useState([]);
  const [loadingValidSurveys, setLoadingValidSurveys] = useState(false);
  const [selectedSurveyType, setSelectedSurveyType] = useState(null);
  const [exportingData, setExportingData] = useState(false);
  const [showValidSurveyDetail, setShowValidSurveyDetail] = useState(false);
  const [selectedValidSurvey, setSelectedValidSurvey] = useState(null);

  // Task history states
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');

  // Load users function dengan useCallback untuk mencegah infinite loop
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    console.log('🔄 Starting to load users...');
    
    try {
      // Try to get users from Firestore first
      let allUsers = [];
      try {
        console.log('📡 Trying Firestore getAllUsers...');
        allUsers = await getAllUsers();
        console.log('✅ Firestore getAllUsers success:', allUsers.length, 'users');
      } catch (firestoreError) {
        console.warn('❌ Firestore getAllUsers failed, trying API endpoint:', firestoreError);
        // Fallback to API endpoint with better error handling
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Non-JSON response from /api/users:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response');
        }
        
        try {
          allUsers = await response.json();
          console.log('✅ API endpoint success:', allUsers.length, 'users');
        } catch (jsonError) {
          console.error('❌ JSON parsing error from /api/users:', jsonError);
          throw new Error('Failed to parse JSON response from users API');
        }
      }
      
      console.log('📊 All users before filtering:', allUsers);
      
      const filteredUsers = Array.isArray(allUsers) ? allUsers.filter(user => 
        user.role === 'admin_survey' || user.role === 'petugas_surveyor'
      ) : [];
      
      console.log('🔍 Filtered users (admin_survey + petugas_surveyor only):', filteredUsers);
      console.log('📈 Setting', filteredUsers.length, 'users to state');
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setUsers([]); // Set empty array on error
    } finally {
      setLoadingUsers(false);
      console.log('✅ Load users completed');
    }
  }, []); // Empty dependency array karena tidak bergantung pada state lain

  // Load surveyor users function
  const loadSurveyorUsers = async () => {
    setLoadingSurveyors(true);
    try {
      // Try to get users from Firestore first
      let allUsers = [];
      try {
        allUsers = await getAllUsers();
      } catch (firestoreError) {
        console.warn('Firestore getAllUsers failed, trying API endpoint:', firestoreError);
        // Fallback to API endpoint with better error handling
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Non-JSON response from /api/users (surveyors):', text.substring(0, 200));
          throw new Error('Server returned non-JSON response');
        }
        
        try {
          allUsers = await response.json();
        } catch (jsonError) {
          console.error('❌ JSON parsing error from /api/users (surveyors):', jsonError);
          throw new Error('Failed to parse JSON response from users API');
        }
      }
      
      const surveyors = Array.isArray(allUsers) ? allUsers.filter(user => user.role === 'petugas_surveyor') : [];
      setSurveyorUsers(surveyors);
    } catch (error) {
      console.error('Error loading surveyors:', error);
      setSurveyorUsers([]); // Set empty array on error
    } finally {
      setLoadingSurveyors(false);
    }
  };

  // Load surveys function dengan useCallback untuk mencegah infinite loop
  const loadSurveys = useCallback(async () => {
    setLoadingSurveys(true);
    try {
      const response = await fetch('/api/survey-validation');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response from /api/survey-validation:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ JSON parsing error from /api/survey-validation:', jsonError);
        throw new Error('Failed to parse JSON response from survey validation API');
      }
      
      setSurveys(data);
    } catch (error) {
      console.error('Error loading surveys:', error);
      alert('Gagal memuat data survey: ' + error.message);
    } finally {
      setLoadingSurveys(false);
    }
  }, []); // Empty dependency array karena tidak bergantung pada state lain

  // Load valid surveys function
  const loadValidSurveys = async (surveyType = 'survey_existing') => {
    setLoadingValidSurveys(true);
    try {
      const url = surveyType ? `/api/valid-survey-data?type=${surveyType}` : '/api/valid-survey-data';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response from /api/valid-survey-data:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ JSON parsing error from /api/valid-survey-data:', jsonError);
        throw new Error('Failed to parse JSON response from valid survey data API');
      }
      
      setValidSurveys(data);
    } catch (error) {
      console.error('Error loading valid surveys:', error);
      alert('Gagal memuat data survey valid: ' + error.message);
    } finally {
      setLoadingValidSurveys(false);
    }
  };

  // Submit user function
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      if (!formData.username || !formData.email || !formData.password) {
        throw new Error('Semua field harus diisi');
      }

      await registerUser(formData.email, formData.password, {
        username: formData.username,
        displayName: formData.username,
        role: formData.role,
        createdBy: currentUser.uid
      });

      setSubmitMessage('Pengguna berhasil didaftarkan!');
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        role: 'petugas_surveyor',
        password: ''
      });

      // Reload users list
      loadUsers();

      // Show success message for longer time and don't auto-close form
      setTimeout(() => {
        setSubmitMessage('');
      }, 5000);

    } catch (error) {
      console.error('Error registering user:', error);
      setSubmitMessage(error.message || 'Gagal mendaftarkan pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete user function
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.uid);
      setUsers(users.filter(u => u.uid !== userToDelete.uid));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Gagal menghapus pengguna: ' + error.message);
    }
  };

  // Get current user data
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            username: userData?.username || 'admin',
            displayName: userData?.displayName || 'Admin Survey',
            role: userData?.role || 'admin_survey',
            phone: userData?.phone || '+62 812-3456-7890'
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            username: 'admin',
            displayName: 'Admin Survey',
            role: 'admin_survey',
            phone: '+62 812-3456-7890'
          });
        }
      } else {
        window.location.href = '/';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    // States
    currentUser,
    loading,
    activeMenu,
    setActiveMenu,
    showUserDropdown,
    setShowUserDropdown,
    users,
    loadingUsers,
    selectedUser,
    setSelectedUser,
    showUserDetail,
    setShowUserDetail,
    showDeleteConfirm,
    setShowDeleteConfirm,
    userToDelete,
    setUserToDelete,
    showAddUserForm,
    setShowAddUserForm,
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    showRoleDropdown,
    setShowRoleDropdown,
    isSubmitting,
    submitMessage,
    showTaskAssignment,
    setShowTaskAssignment,
    showTaskForm,
    setShowTaskForm,
    taskType,
    setTaskType,
    selectedSurveyor,
    setSelectedSurveyor,
    surveyorUsers,
    loadingSurveyors,
    proposeData,
    setProposeData,
    loadingProposeData,
    setLoadingProposeData,
    proposeDataText,
    setProposeDataText,
    showDataSelectionModal,
    setShowDataSelectionModal,
    availableData,
    setAvailableData,
    selectedDataItems,
    setSelectedDataItems,
    surveys,
    loadingSurveys,
    selectedSurvey,
    setSelectedSurvey,
    showSurveyDetail,
    setShowSurveyDetail,
    showSurveyValidation,
    setShowSurveyValidation,
    showSurveyEdit,
    setShowSurveyEdit,
    searchTerm,
    setSearchTerm,
    validSurveys,
    loadingValidSurveys,
    selectedSurveyType,
    setSelectedSurveyType,
    exportingData,
    setExportingData,
    showValidSurveyDetail,
    setShowValidSurveyDetail,
    selectedValidSurvey,
    setSelectedValidSurvey,
    tasks,
    setTasks,
    loadingTasks,
    setLoadingTasks,
    selectedTask,
    setSelectedTask,
    showTaskDetail,
    setShowTaskDetail,
    taskSearchTerm,
    setTaskSearchTerm,
    
    // Functions
    loadUsers,
    loadSurveyorUsers,
    loadSurveys,
    loadValidSurveys,
    handleSubmitUser,
    confirmDeleteUser
  };
};

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ClipboardList, 
  CheckCircle, 
  Database, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Filter,
  Calendar,
  MapPin,
  TrendingUp,
  Activity,
  Shield,
  FileText,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

// Import logout function
import { logout } from '../../lib/auth';

// Import komponen admin dengan lazy loading untuk performa mobile
import dynamic from 'next/dynamic';

// Lazy load heavy components
const UserManagement = dynamic(() => import('../admin/user-management/UserManagement'), {
  loading: () => <LoadingComponent message="Memuat User Management..." />
});

const TaskDistribution = dynamic(() => import('../admin/task-distribution'), {
  loading: () => <LoadingComponent message="Memuat Task Distribution..." />
});

const SurveyValidation = dynamic(() => import('../admin/survey-validation/SurveyValidation'), {
  loading: () => <LoadingComponent message="Memuat Survey Validation..." />
});

const ValidSurveyData = dynamic(() => import('../admin/valid-survey-data/ValidSurveyData'), {
  loading: () => <LoadingComponent message="Memuat Valid Survey Data..." />
});

const MapsValidasiPage = dynamic(() => import('../admin/maps-validasi/MapsValidasiPage'), {
  loading: () => <LoadingComponent message="Memuat Maps Validasi..." />,
  ssr: false // Disable SSR for map components
});

const AdminDashboard = dynamic(() => import('../admin/dashboard/AdminDashboard'), {
  loading: () => <LoadingComponent message="Memuat Dashboard..." />
});

const ProgressSurveyorPage = dynamic(() => import('../admin/progress-surveyor/ProgressSurveyorPage'), {
  loading: () => <LoadingComponent message="Memuat Progress Surveyor..." />,
  ssr: false
});

// Regular imports for lightweight components
import ValidSurveyDetailModal from '../modals/ValidSurveyDetailModal';
import SurveyEditModal from '../modals/SurveyEditModal';

// Import hooks
import { useAdminPanel } from '../../hooks/useAdminPanel';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';
import useDashboardStats from '../../hooks/useDashboardStats';
import useNotifications from '../../hooks/useNotifications';
import usePageTitle from '../../hooks/usePageTitle';

// Loading component for lazy loaded components
const LoadingComponent = ({ message = "Memuat..." }) => (
  <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-slate-600 text-center">{message}</p>
  </div>
);

const PanelAdminSurveyLapanganRefactored = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [mapsFocusTarget, setMapsFocusTarget] = useState(null);

  // Menggunakan useAdminPanel hook untuk mendapatkan semua state dan function yang dibutuhkan
  const adminPanelData = useAdminPanel();

  const { 
    notifications, 
    unreadCount, 
    markAsRead,
    formatNotificationDate
  } = useNotifications(adminPanelData.currentUser?.uid);

  // Inisialisasi tab aktif. Untuk super_admin fokus ke validasi survey.
  const initialTab = adminPanelData.currentUser?.role === 'super_admin' ? 'survey-validation' : 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { 
    stats, 
    loading: isLoadingStats, 
    refreshStats 
  } = useDashboardStats(null, true); // true untuk admin dashboard

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global event: jump to Maps Validasi and focus a marker by id/coords
  useEffect(() => { // TODO: Review this logic, might be complex
    const handler = (e) => {
      try {
        const detail = e.detail || {};
        // Persist target so MapsValidasiPage can consume on mount
        if (detail && typeof window !== 'undefined') {
          sessionStorage.setItem('maps_validasi_focus', JSON.stringify(detail));
        }
        setMapsFocusTarget(detail || null);
        setActiveTab('maps-validasi');
      } catch (err) {
        console.warn('Failed to handle nav-to-maps-validasi event:', err);
        setActiveTab('maps-validasi');
      }
    };
    window.addEventListener('nav-to-maps-validasi', handler);
    return () => window.removeEventListener('nav-to-maps-validasi', handler);
  }, []);

  // Pastikan super_admin hanya pada tab yang diizinkan
  useEffect(() => {
    const currentUserRole = adminPanelData.currentUser?.role;
    if (currentUserRole === 'super_admin') {
      const allowedTabs = ['survey-validation', 'valid-survey-data'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('survey-validation');
      }
    }
  }, [adminPanelData.currentUser, activeTab]);

  // Base menu items
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'user-management',
      label: 'Manajemen User',
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'task-distribution',
      label: 'Distribusi Tugas',
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'survey-validation',
      label: 'Validasi Survey',
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'valid-survey-data',
      label: 'Data Survey Valid',
      icon: FileText,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      id: 'maps-validasi',
      label: 'Maps Validasi',
      icon: MapPin,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'surveyor-maps',
      label: 'Progress Surveyor',
      icon: MapPin,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (adminPanelData.currentUser?.role === 'super_admin') {
      // Super admin hanya dapat mengakses Validasi Survey dan Data Survey Valid
      return allMenuItems.filter(item => ['survey-validation', 'valid-survey-data'].includes(item.id));
    }
    return allMenuItems;
  }, [adminPanelData.currentUser?.role]);

  // State untuk edit Data Survey Valid (khusus super_admin)
  const [showValidEditModal, setShowValidEditModal] = useState(false);
  const [editingValidSurvey, setEditingValidSurvey] = useState(null);

  const handleLogout = async () => {
    try {
      // Panggil fungsi logout dari auth.js
      await logout();
      // Clear localStorage
      localStorage.clear();
      // Redirect ke halaman login
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Tetap redirect meskipun ada error
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const renderActiveComponent = () => {
    const componentProps = {
      searchQuery,
      onRefresh: adminPanelData.loadUsers,
      isLoading: adminPanelData.loading,
      error: null
    };

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard searchQuery={searchQuery} onNavigate={setActiveTab} />;
      case 'user-management':
        return <UserManagement 
          {...componentProps}
          // Props khusus untuk UserManagement dari useAdminPanel
          users={adminPanelData.users}
          loadingUsers={adminPanelData.loadingUsers}
          loadUsers={adminPanelData.loadUsers}
          showAddUserForm={adminPanelData.showAddUserForm}
          setShowAddUserForm={adminPanelData.setShowAddUserForm}
          formData={adminPanelData.formData}
          setFormData={adminPanelData.setFormData}
          showPassword={adminPanelData.showPassword}
          setShowPassword={adminPanelData.setShowPassword}
          showRoleDropdown={adminPanelData.showRoleDropdown}
          setShowRoleDropdown={adminPanelData.setShowRoleDropdown}
          isSubmitting={adminPanelData.isSubmitting}
          submitMessage={adminPanelData.submitMessage}
          handleSubmitUser={adminPanelData.handleSubmitUser}
          selectedUser={adminPanelData.selectedUser}
          setSelectedUser={adminPanelData.setSelectedUser}
          showUserDetail={adminPanelData.showUserDetail}
          setShowUserDetail={adminPanelData.setShowUserDetail}
          showDeleteConfirm={adminPanelData.showDeleteConfirm}
          setShowDeleteConfirm={adminPanelData.setShowDeleteConfirm}
          userToDelete={adminPanelData.userToDelete}
          setUserToDelete={adminPanelData.setUserToDelete}
          confirmDeleteUser={adminPanelData.confirmDeleteUser}
        />;
      case 'task-distribution':
        return <TaskDistribution {...componentProps} />;
      case 'survey-validation':
        return <SurveyValidation 
          {...componentProps}
          // Props khusus untuk SurveyValidation dari useAdminPanel
          surveys={adminPanelData.surveys}
          loadingSurveys={adminPanelData.loadingSurveys}
          loadSurveys={adminPanelData.loadSurveys}
          searchTerm={adminPanelData.searchTerm}
          selectedSurvey={adminPanelData.selectedSurvey}
          setSelectedSurvey={adminPanelData.setSelectedSurvey}
          showSurveyDetail={adminPanelData.showSurveyDetail}
          setShowSurveyDetail={adminPanelData.setShowSurveyDetail}
          showSurveyValidation={adminPanelData.showSurveyValidation}
          setShowSurveyValidation={adminPanelData.setShowSurveyValidation}
          showSurveyEdit={adminPanelData.showSurveyEdit}
          setShowSurveyEdit={adminPanelData.setShowSurveyEdit}
          currentUser={adminPanelData.currentUser}
        />;
      case 'valid-survey-data':
        return <ValidSurveyData 
          {...componentProps}
          // Props khusus untuk ValidSurveyData dari useAdminPanel
          validSurveys={adminPanelData.validSurveys}
          loadingValidSurveys={adminPanelData.loadingValidSurveys}
          selectedSurveyType={adminPanelData.selectedSurveyType}
          setSelectedSurveyType={adminPanelData.setSelectedSurveyType}
          exportingData={adminPanelData.exportingData}
          loadValidSurveys={adminPanelData.loadValidSurveys}
          onViewDetail={(survey) => {
            adminPanelData.setSelectedValidSurvey(survey);
            adminPanelData.setShowValidSurveyDetail(true);
          }}
          onEdit={(survey) => {
            setEditingValidSurvey(survey);
            setShowValidEditModal(true);
          }}
          currentUser={adminPanelData.currentUser}
        />;
      case 'maps-validasi':
        return <MapsValidasiPage {...componentProps} focusTarget={mapsFocusTarget} />;
      case 'surveyor-maps':
        return <ProgressSurveyorPage />;
      default:
        return <AdminDashboard searchQuery={searchQuery} />;
    }
  };

  const currentMenuItem = menuItems.find(item => item.id === activeTab);

  // Set page title berdasarkan tab yang aktif
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Admin Dashboard - Sistem Manajemen';
      case 'user-management':
        return 'Manajemen User - Sistem Manajemen';
      case 'task-distribution':
        return 'Distribusi Tugas - Sistem Manajemen';
      case 'survey-validation':
        return 'Validasi Survey - Sistem Manajemen';
      case 'valid-survey-data':
        return 'Data Survey Valid - Sistem Manajemen';
      case 'maps-validasi':
        return 'Maps Validasi - Sistem Manajemen';
      case 'surveyor-maps':
        return 'Progress Surveyor - Sistem Manajemen';
      default:
        return 'Admin Panel - Sistem Manajemen';
    }
  };

  usePageTitle(getPageTitle());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white/95 backdrop-blur-xl border-r border-slate-200/60 
        shadow-xl shadow-slate-900/5 z-50 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-72' : 'w-0 lg:w-20'}
        ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              {isSidebarOpen && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
                    <p className="text-sm text-slate-500">Survey Management</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
              >
                {isSidebarOpen ? (
                  <X className="w-5 h-5 text-slate-600" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? `${item.bgColor} ${item.color} border ${item.borderColor} shadow-sm` 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }
                    ${!isSidebarOpen && 'justify-center px-2'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform duration-200`} />
                  {isSidebarOpen && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200/60">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200
                ${!isSidebarOpen && 'justify-center px-2'}
              `}
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}
      `}>
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center space-x-4">
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                  >
                    <Menu className="w-5 h-5 text-slate-600" />
                  </button>
                )}
                
                <div className="flex items-center space-x-3">
                  {currentMenuItem && (
                    <>
                      <div className={`p-2 rounded-lg ${currentMenuItem.bgColor}`}>
                        <currentMenuItem.icon className={`w-5 h-5 ${currentMenuItem.color}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{currentMenuItem.label}</h2>
                        <p className="text-sm text-slate-500">Kelola dan pantau aktivitas survey</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                  >
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-[9999]">
                      <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800">Notifikasi</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-slate-800">{notification.title}</h4>
                                  <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-2">{formatNotificationDate(notification.createdAt)}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Tidak ada notifikasi</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => {
                    if (activeTab === 'user-management') {
                      adminPanelData.loadUsers();
                    } else if (activeTab === 'survey-validation') {
                      adminPanelData.loadSurveys();
                    } else {
                      refreshStats();
                    }
                  }}
                  disabled={adminPanelData.loadingUsers || adminPanelData.loadingSurveys || isLoadingStats}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-slate-600 ${(adminPanelData.loadingUsers || adminPanelData.loadingSurveys || isLoadingStats) ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">

          {/* Main Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm min-h-[600px]">
            {adminPanelData.loading && activeTab === 'user-management' ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Memuat data pengguna...</p>
              </div>
            ) : (
              renderActiveComponent()
            )}
          </div>
        </div>
      </main>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Valid Survey Detail Modal */}
      {adminPanelData.showValidSurveyDetail && adminPanelData.selectedValidSurvey && (
        <ValidSurveyDetailModal
          isOpen={adminPanelData.showValidSurveyDetail}
          onClose={() => {
            adminPanelData.setShowValidSurveyDetail(false);
            adminPanelData.setSelectedValidSurvey(null);
          }}
          surveyData={adminPanelData.selectedValidSurvey}
          currentUser={adminPanelData.currentUser}
          onEdit={(survey) => {
            // Buka modal edit untuk Data Survey Valid
            setEditingValidSurvey(survey);
            setShowValidEditModal(true);
            // Tutup detail modal
            adminPanelData.setShowValidSurveyDetail(false);
          }}
        />
      )}

      {/* Modal Edit untuk Data Survey Valid - khusus super_admin */}
      {showValidEditModal && editingValidSurvey && (
        <SurveyEditModal
          isOpen={showValidEditModal}
          surveyData={editingValidSurvey}
          onClose={() => {
            setShowValidEditModal(false);
            setEditingValidSurvey(null);
          }}
          onSave={async (id, updatedData) => {
            const db = getFirestore(firebaseApp);
            const ref = doc(db, 'Valid_Survey_Data', id);
            await updateDoc(ref, {
              ...updatedData,
              updatedAt: new Date(),
              modifiedBy: adminPanelData.currentUser?.displayName || adminPanelData.currentUser?.email || 'Super Admin'
            });
            // Refresh list
            try { await adminPanelData.loadValidSurveys(adminPanelData.selectedSurveyType || 'all'); } catch {}
          }}
        />
      )}
    </div>
  );
};

export default PanelAdminSurveyLapanganRefactored;

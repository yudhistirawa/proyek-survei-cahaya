import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, FileText, CheckSquare, AlertTriangle, Database, Bell, ArrowLeft, ChevronRight, Home, Calendar, Settings, CheckCircle, RefreshCw } from 'lucide-react';
import SurveyorMenuCard from '../mobile/SurveyorMenuCard';
import SurveyorBottomNav from '../mobile/SurveyorBottomNav';
import SurveyARMPage from './SurveyARMPage';
import SurveyExistingPage from './SurveyExistingPage';
import SurveyTiangAPJProposePage from './SurveyTiangAPJProposePage';
import SurveyTiangAPJNewPage from './SurveyTiangAPJNewPage';
import SurveyTrafoPage from './SurveyTrafoPage';
import SurveyFasosFasumPage from './SurveyFasosFasumPage';
import KemerataanSinarPage from './KemerataanSinarPage';
import UniformityPage from './UniformityPage';
import DaftarTugasPage from './DaftarTugasPage';
import DetailTugasPage from './DetailTugasPage';
import ValidSurveyDataPage from './ValidSurveyDataPage';
import MiniMapsComponent from '../MiniMapsComponentLazy';
import useNotifications from '../../hooks/useNotifications';
import useDashboardStats from '../../hooks/useDashboardStats';
import usePageTitle from '../../hooks/usePageTitle';
import { UploadTrackingModal } from '../modals';
import SuccessAlertModal from '../modals/SuccessAlertModal';
import { getAllTaskProgress } from '../../lib/taskProgress';


const SurveyorDashboardPage = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const router = useRouter();
    const [activeNotifTab, setActiveNotifTab] = useState('tugas');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [pageAnimation, setPageAnimation] = useState('');
    const [hasActiveTask, setHasActiveTask] = useState(false);
    // Upload Progress Tracking modal state
    const [showUploadTracking, setShowUploadTracking] = useState(false);
    const [successAlert, setSuccessAlert] = useState({ open: false, message: '' });

    // Initialize notifications hook
    const {
        tugasNotifications,
        surveyNotifications,
        loading: notificationsLoading,
        error: notificationsError,
        unreadCount,
        markAsRead,
        formatNotificationDate,
        refreshNotifications,
        createNotification
    } = useNotifications(user?.uid);

    // Initialize dashboard stats hook
    const {
        stats,
        loading: statsLoading,
        error: statsError,
        refreshStats,
        formatLastUpdated
    } = useDashboardStats(user?.uid);

    // Set page title based on current page and active tab
    const getPageTitle = () => {
        if (currentPage === 'survey-list') {
            return 'Daftar Survey - Sistem Manajemen';
        } else if (currentPage === 'daftar-tugas') {
            return 'Daftar Tugas - Sistem Manajemen';
        } else if (currentPage === 'detail-tugas') {
            return 'Detail Tugas - Sistem Manajemen';
        } else if (currentPage === 'survey-arm') {
            return 'Survey ARM - Sistem Manajemen';
        } else if (currentPage === 'survey-tiang-apj-propose') {
            return 'Survey Tiang APJ Propose - Sistem Manajemen';
        } else if (currentPage === 'survey-tiang-apj-new') {
            return 'Survey Tiang APJ New - Sistem Manajemen';
        } else if (currentPage === 'survey-trafo') {
            return 'Survey Trafo - Sistem Manajemen';
        } else if (currentPage === 'survey-fasos-fasum') {
            return 'Survey Fasos Fasum - Sistem Manajemen';
        } else if (currentPage === 'kemerataan-sinar') {
            return 'Kemerataan Sinar - Sistem Manajemen';
        } else if (currentPage === 'data-survey-valid') {
            return 'Data Survey Valid - Sistem Manajemen';
        } else if (currentPage === 'dashboard') {
            switch(activeTab) {
                case 'home':
                    return 'Dashboard Surveyor - Sistem Manajemen';
                case 'notifikasi':
                    return 'Notifikasi - Sistem Manajemen';
                case 'profil':
                    return 'Profil - Sistem Manajemen';
                default:
                    return 'Dashboard Surveyor - Sistem Manajemen';
            }
        }
        return 'Sistem Manajemen';
    };

    usePageTitle(getPageTitle());

    // Page transition animation handler
    const handlePageTransition = (newPage, callback = null) => {
        setIsTransitioning(true);
        setPageAnimation('animate-fadeOut');
        
        setTimeout(() => {
            if (callback) callback();
            setPageAnimation('animate-fadeIn');
            setIsTransitioning(false);
        }, 200);
    };

    const handleMenuClick = (menuType) => {
        console.log(`Navigating to: ${menuType}`);
        
        // Check if trying to access survey menu without active task
        if (menuType === 'daftar-survey' && !hasActiveTask) {
            alert('Silakan mulai tugas terlebih dahulu dari menu "Daftar Tugas" sebelum mengakses survey.');
            return;
        }
        
        handlePageTransition(menuType, () => {
            switch(menuType) {
                case 'daftar-survey':
                    setCurrentPage('survey-list');
                    break;
                case 'daftar-tugas':
                    setCurrentPage('daftar-tugas');
                    break;
                case 'sistem-kemerataan':
                    setCurrentPage('kemerataan-sinar');
                    break;
                case 'data-survey-valid':
                    // Upload Progress Tracking: open modal flow
                    setShowUploadTracking(true);
                    break;
                default:
                    break;
            }
        });
    };

    const handleBackToDashboard = () => {
        handlePageTransition('dashboard', () => {
            setCurrentPage('dashboard');
            setSelectedTask(null);
        });
    };

    const handleBackToDaftarTugas = () => {
        handlePageTransition('daftar-tugas', () => {
            setCurrentPage('daftar-tugas');
            setSelectedTask(null);
        });
    };

    const handleDetailTugas = (task) => {
        handlePageTransition('detail-tugas', () => {
            setSelectedTask(task);
            setCurrentPage('detail-tugas');
        });
    };

    const handleSurveyClick = (surveyName) => {
        console.log(`Opening survey: ${surveyName}`);
        handlePageTransition(surveyName, () => {
            if (surveyName === 'Survey ARM') {
                setCurrentPage('survey-arm');
            } else if (surveyName === 'Survey Tiang APJ Propose') {
                setCurrentPage('survey-tiang-apj-propose');
            } else if (surveyName === 'Survey Tiang APJ New') {
                setCurrentPage('survey-tiang-apj-new');
            } else if (surveyName === 'Survey Existing') {
                setCurrentPage('survey-existing');
            } else if (surveyName === 'Survey Trafo') {
                setCurrentPage('survey-trafo');
            } else if (surveyName === 'Survey Fasos Fasum') {
                setCurrentPage('survey-fasos-fasum');
            }
        });
    };

    const handleBackToSurveyList = () => {
        handlePageTransition('survey-list', () => {
            setCurrentPage('survey-list');
        });
    };

    // Callback setelah sukses upload dari modal
    const handleTrackingSuccess = (result) => {
        console.log('Upload Progress Tracking success:', result);
        setSuccessAlert({ open: true, message: 'Upload berhasil. Foto tersimpan di folder "surveyor_tracking".' });
    };

    // Check for active task in sessionStorage AND Firestore
    useEffect(() => {
        const checkActiveTask = async () => {
            try {
                // First check sessionStorage for quick access
                const currentTaskId = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null;
                const currentTaskStatus = typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskStatus') : null;
                
                // If found in sessionStorage and not completed
                if (currentTaskId && currentTaskStatus !== 'completed') {
                    setHasActiveTask(true);
                    console.log('✅ Active task found in sessionStorage:', currentTaskId);
                    return;
                }
                
                // If not in sessionStorage, check Firestore for persistent progress
                if (user?.uid) {
                    const allProgress = await getAllTaskProgress(user.uid);
                    const activeProgress = allProgress.find(p => p.status === 'in_progress');
                    
                    if (activeProgress) {
                        setHasActiveTask(true);
                        // Restore to sessionStorage
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('currentTaskId', activeProgress.taskId);
                            sessionStorage.setItem('currentTaskStatus', 'in_progress');
                            console.log('✅ Active task restored from Firestore:', activeProgress.taskId);
                        }
                        return;
                    }
                }
                
                // No active task found
                setHasActiveTask(false);
            } catch (error) {
                console.error('Error checking active task:', error);
                setHasActiveTask(false);
            }
        };

        checkActiveTask();
        
        // Listen for task changes
        const handleTaskChange = () => checkActiveTask();
        if (typeof window !== 'undefined') {
            window.addEventListener('currentTaskChanged', handleTaskChange);
        }
        
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('currentTaskChanged', handleTaskChange);
            }
        };
    }, [user?.uid]);

    // Add animation classes to useEffect
    useEffect(() => {
        if (pageAnimation) {
            const timer = setTimeout(() => {
                setPageAnimation('');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pageAnimation]);

    const renderHomeContent = () => (
        <div className={`flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 sm:pb-24 min-h-screen transition-all duration-300 ${pageAnimation}`}>
            {/* Modern Header with Glassmorphism - Optimized for Mobile & Desktop */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                            {/* Profile Avatar - Responsive Size */}
                            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                                <Home size={18} className="text-white sm:hidden" />
                                <Home size={20} className="text-white hidden sm:block md:hidden" />
                                <Home size={24} className="text-white hidden md:block" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    Dashboard
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate max-w-[160px] sm:max-w-none">
                                    Selamat datang, <span className="hidden sm:inline">{user?.displayName || user?.email?.split('@')[0] || 'Petugas'}</span><span className="sm:hidden">{(user?.displayName || user?.email?.split('@')[0] || 'Petugas').substring(0, 10)}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                // Only clear task session data on logout, do NOT mark tasks as completed
                                try {
                                    sessionStorage.removeItem('currentTaskId');
                                    sessionStorage.removeItem('currentTaskKmz');
                                    sessionStorage.removeItem('currentTaskDest');
                                    // Remove task status but don't mark as completed
                                    sessionStorage.removeItem('currentTaskStatus');
                                } catch (error) {
                                    console.error('Error clearing sessionStorage:', error);
                                }
                                onLogout();
                            }}
                            className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg group"
                            title="Keluar"
                        >
                            <LogOut size={16} className="group-hover:rotate-12 transition-transform duration-300 sm:hidden" />
                            <LogOut size={18} className="group-hover:rotate-12 transition-transform duration-300 hidden sm:block md:hidden" />
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300 hidden md:block" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Menu Grid - Responsive Layout */}
            <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 pt-20 sm:pt-24 md:pt-32 relative z-10">
                <div className="mb-4 sm:mb-6">
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 max-w-4xl mx-auto">
                    {[
                        { icon: "📋", title: "Daftar Survey", key: "daftar-survey", bgColor: "bg-blue-50", gradient: "from-blue-500 to-blue-600", requiresTask: true },
                        { icon: "📅", title: "Daftar Tugas", key: "daftar-tugas", bgColor: "bg-green-50", gradient: "from-green-500 to-green-600", requiresTask: false },
                        { icon: "⚙️", title: "Sistem Kemerataan", key: "sistem-kemerataan", bgColor: "bg-orange-50", gradient: "from-orange-500 to-orange-600", requiresTask: false },
                        { icon: "📝", title: "Draft Offline", key: "data-survey-valid", bgColor: "bg-purple-50", gradient: "from-purple-500 to-purple-600", requiresTask: false }
                    ].map((menu, index) => {
                        const isDisabled = menu.requiresTask && !hasActiveTask;
                        return (
                            <div key={index} className="text-center group">
                                <button
                                    onClick={() => handleMenuClick(menu.key)}
                                    disabled={isDisabled}
                                    className={`w-full backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-lg border transition-all duration-300 group relative overflow-hidden ${
                                        isDisabled 
                                            ? 'bg-gray-100/90 border-gray-200/50 cursor-not-allowed opacity-60' 
                                            : 'bg-white/90 border-white/50 hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]'
                                    }`}
                                >
                                    {/* Background Gradient Overlay */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${menu.gradient} opacity-0 ${!isDisabled ? 'group-hover:opacity-5' : ''} transition-opacity duration-300 rounded-2xl sm:rounded-3xl`}></div>

                                    <div className="relative flex flex-col items-center text-center space-y-2 sm:space-y-3">
                                        {/* Icon Container - Responsive Size */}
                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 ${isDisabled ? 'bg-gray-100' : menu.bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm ${!isDisabled ? 'group-hover:shadow-md group-hover:scale-105' : ''} transition-all duration-200`}>
                                            <span className={`text-xl sm:text-2xl ${isDisabled ? 'grayscale' : ''}`}>{menu.icon}</span>
                                        </div>

                                        {/* Title - Responsive Text */}
                                        <h3 className={`text-xs sm:text-sm font-bold transition-colors duration-200 leading-tight px-1 ${
                                            isDisabled ? 'text-gray-500' : 'text-gray-800 group-hover:text-gray-900'
                                        }`}>
                                            {menu.key === 'data-survey-valid' ? (
                                                <>
                                                    <span className="hidden sm:inline">Upload Progress Tracking</span>
                                                    <span className="sm:hidden">Draft Offline</span>
                                                </>
                                            ) : menu.title}
                                        </h3>

                                        {/* Warning or Arrow Indicator - Responsive Size */}
                                        {isDisabled ? (
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-300 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                                                <AlertTriangle size={14} className="text-gray-500 sm:hidden" />
                                                <AlertTriangle size={16} className="text-gray-500 hidden sm:block" />
                                            </div>
                                        ) : (
                                            <div className={`w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r ${menu.gradient} rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105`}>
                                                <ChevronRight size={14} className="text-white group-hover:translate-x-0.5 transition-transform duration-200 sm:hidden" />
                                                <ChevronRight size={16} className="text-white group-hover:translate-x-0.5 transition-transform duration-200 hidden sm:block" />
                                            </div>
                                        )}

                                        {/* Warning Text for Disabled Survey Menu */}
                                        {isDisabled && menu.key === 'daftar-survey' && (
                                            <div className="absolute -bottom-1 sm:-bottom-2 left-0 right-0">
                                                <div className="bg-amber-100 border border-amber-200 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
                                                    <p className="text-[10px] sm:text-xs text-amber-700 font-medium">Mulai tugas dulu</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Enhanced Quick Stats with Real Data - Responsive */}
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 relative z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 border border-white/50 animate-fadeInUp max-w-4xl mx-auto" style={{ animationDelay: '400ms' }}>
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Ringkasan Hari Ini</h2>
                            <div className="flex items-center space-x-2 mt-0.5 sm:mt-1">
                                <p className="text-xs sm:text-sm text-gray-600">Status pekerjaan terkini</p>
                                {statsLoading && (
                                    <>
                                        <RefreshCw size={12} className="text-blue-500 animate-spin sm:hidden" />
                                        <RefreshCw size={14} className="text-blue-500 animate-spin hidden sm:block" />
                                    </>
                                )}
                            </div>
                            {stats.lastUpdated && (
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                                    Diperbarui: {formatLastUpdated()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <button
                                onClick={refreshStats}
                                disabled={statsLoading}
                                className="p-1.5 sm:p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg sm:rounded-xl transition-all duration-200 disabled:opacity-50"
                                title="Refresh Data"
                            >
                                <>
                                    <RefreshCw size={14} className={`${statsLoading ? 'animate-spin' : ''} sm:hidden`} />
                                    <RefreshCw size={16} className={`${statsLoading ? 'animate-spin' : ''} hidden sm:block`} />
                                </>
                            </button>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                                <>
                                    <Database size={16} className="text-white sm:hidden" />
                                    <Database size={18} className="text-white hidden sm:block md:hidden" />
                                    <Database size={20} className="text-white hidden md:block" />
                                </>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                         {[
                             { 
                                 value: statsLoading ? "..." : stats.surveysBaru?.toString() || "0", 
                                 label: "Survey Hari Ini", 
                                 color: "text-blue-600", 
                                 bgColor: "bg-blue-50", 
                                 icon: FileText,
                                 subtitle: "Dibuat hari ini"
                             },
                             { 
                                 value: statsLoading ? "..." : stats.tugasSelesai?.toString() || "0", 
                                 label: "Tugas Selesai", 
                                 color: "text-green-600", 
                                 bgColor: "bg-green-50", 
                                 icon: CheckCircle,
                                 subtitle: "Total selesai"
                             },
                             { 
                                 value: statsLoading ? "..." : stats.pending?.toString() || "0", 
                                 label: "Menunggu Validasi", 
                                 color: "text-orange-600", 
                                 bgColor: "bg-orange-50", 
                                 icon: AlertTriangle,
                                 subtitle: "Survey pending"
                             }
                         ].map((stat, index) => (
                            <div key={index} className="text-center group">
                                <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 ${stat.bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                                    <>
                                        <stat.icon size={16} className={`${stat.color} sm:hidden`} />
                                        <stat.icon size={18} className={`${stat.color} hidden sm:block md:hidden`} />
                                        <stat.icon size={20} className={`${stat.color} hidden md:block`} />
                                    </>
                                </div>
                                <div className={`text-xl sm:text-2xl font-bold ${stat.color} mb-0.5 sm:mb-1 transition-all duration-200`}>
                                     {stat.value}
                                 </div>
                                 <div className="text-[10px] sm:text-xs text-gray-600 font-medium leading-tight px-0.5">{stat.label}</div>
                                 {stat.subtitle && (
                                     <div className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{stat.subtitle}</div>
                                 )}
                            </div>
                        ))}
                    </div>

                    {/* Additional Info - Responsive */}
                     <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                         <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 text-center">
                             <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
                                 <div className="text-base sm:text-lg font-bold text-gray-700">
                                     {statsLoading ? "..." : stats.totalSurveys?.toString() || "0"}
                                 </div>
                                 <div className="text-[10px] sm:text-xs text-gray-500">Total Survey</div>
                             </div>
                             <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
                                 <div className="text-base sm:text-lg font-bold text-gray-700">
                                     {statsLoading ? "..." : stats.totalTasks?.toString() || "0"}
                                 </div>
                                 <div className="text-[10px] sm:text-xs text-gray-500">Total Tugas</div>
                             </div>
                         </div>
                     </div>

                     {/* Error State */}
                     {statsError && (
                         <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                             <p className="text-sm text-red-600 text-center">
                                 Gagal memuat statistik. <button onClick={refreshStats} className="underline">Coba lagi</button>
                             </p>
                         </div>
                     )}
                </div>
            </div>

        </div>
    );

    const renderNotifikasiContent = () => (
        <div className={`flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 min-h-screen transition-all duration-300 ${pageAnimation}`}>
            {/* Modern Header - Fixed Position */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Bell size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    Notifikasi
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Pemberitahuan terbaru untuk Anda
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refreshNotifications()}
                                disabled={notificationsLoading}
                                className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg group disabled:opacity-50"
                                title="Refresh Notifikasi"
                            >
                                <RefreshCw size={20} className={`group-hover:rotate-180 transition-transform duration-300 ${notificationsLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-3 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg group"
                                title="Keluar"
                            >
                                <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Tabs */}
            <div className="px-6 py-4 pt-32 relative z-10">
                <div className="flex bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/50">
                    <button
                        onClick={() => setActiveNotifTab('tugas')}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                            activeNotifTab === 'tugas'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        Tugas
                    </button>
                    <button
                        onClick={() => setActiveNotifTab('survey')}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                            activeNotifTab === 'survey'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        Survey
                    </button>
                </div>
            </div>

            {/* Notification Content */}
            <div className="px-6 pb-8 relative z-10">
                {notificationsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="ml-3 text-gray-600">Memuat notifikasi...</span>
                    </div>
                ) : notificationsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Gagal Memuat Notifikasi</h3>
                        <p className="text-red-600 mb-4">{notificationsError}</p>
                        <button
                            onClick={() => refreshNotifications()}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                        >
                            Coba Lagi
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeNotifTab === 'tugas' ? (
                            tugasNotifications && tugasNotifications.length > 0 ? (
                                tugasNotifications.map((notification, index) => (
                                    <div
                                        key={index}
                                        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <CheckSquare size={20} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-800 mb-1">
                                                    {notification.title || 'Notifikasi Tugas'}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                                                    {notification.message || 'Tidak ada pesan'}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        {formatNotificationDate(notification.createdAt)}
                                                    </span>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <CheckSquare size={48} className="mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Tidak Ada Notifikasi Tugas</h3>
                                    <p className="text-gray-500">Notifikasi tugas akan muncul di sini</p>
                                </div>
                            )
                        ) : (
                            surveyNotifications && surveyNotifications.length > 0 ? (
                                surveyNotifications.map((notification, index) => (
                                    <div
                                        key={index}
                                        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <FileText size={20} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-800 mb-1">
                                                    {notification.title || 'Notifikasi Survey'}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                                                    {notification.message || 'Tidak ada pesan'}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        {formatNotificationDate(notification.createdAt)}
                                                    </span>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Tidak Ada Notifikasi Survey</h3>
                                    <p className="text-gray-500">Notifikasi survey akan muncul di sini</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSurveyListContent = () => (
        <div className={`flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 min-h-screen transition-all duration-300 ${pageAnimation}`}>
            {/* Modern Header */}
            <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-10">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBackToDashboard}
                            className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Survey
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                <Bell size={18} className="text-white" />
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-gray-800 rounded-xl flex items-center justify-center shadow-md">
                                <User size={18} className="text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Survey List */}
            <div className="px-6 py-8">
                <div className="space-y-3">
                    {[
                        { name: 'Survey Existing', icon: '📋' },
                        { name: 'Survey Tiang APJ Propose', icon: '💡' }
                    ].map((survey, index) => (
                        <button
                            key={index}
                            onClick={() => handleSurveyClick(survey.name)}
                            className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:bg-gray-50 active:scale-[0.99] text-left"
                            style={{ animationDelay: `${index * 80}ms` }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">
                                        {survey.icon}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-base font-semibold text-gray-900">{survey.name}</h3>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
                                    <ChevronRight size={18} className="text-white" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderProfilContent = () => (
        <div className={`flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 min-h-screen transition-all duration-300 ${pageAnimation}`}>
            {/* Modern Header - Fixed Position */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <User size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    Profil
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Informasi akun Anda
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-3 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg group"
                            title="Keluar"
                        >
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Content */}
            <div className="px-6 py-8 pt-32 relative z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/50">
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <User size={40} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-1">
                            {user?.displayName || 'Nama Pengguna'}
                        </h2>
                        <p className="text-gray-600">{user?.email || 'email@example.com'}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <h3 className="font-semibold text-gray-800 mb-2">Informasi Akun</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="text-gray-800">{user?.email || 'Tidak tersedia'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className="text-green-600 font-medium">Aktif</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Role:</span>
                                    <span className="text-blue-600 font-medium">Surveyor</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                // Only clear task session data on logout, do NOT mark tasks as completed
                                try {
                                    sessionStorage.removeItem('currentTaskId');
                                    sessionStorage.removeItem('currentTaskKmz');
                                    sessionStorage.removeItem('currentTaskDest');
                                    // Remove task status but don't mark as completed
                                    sessionStorage.removeItem('currentTaskStatus');
                                } catch (error) {
                                    console.error('Error clearing sessionStorage:', error);
                                }
                                onLogout();
                            }}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-2xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Keluar dari Akun
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        // Handle different pages
        if (currentPage === 'survey-list') {
            return renderSurveyListContent();
        }
        
        if (currentPage === 'daftar-tugas') {
            return <DaftarTugasPage onBack={handleBackToDashboard} onDetailTugas={handleDetailTugas} />;
        }
        
        if (currentPage === 'detail-tugas') {
            return <DetailTugasPage onBack={handleBackToDaftarTugas} taskData={selectedTask} />;
        }
        
        if (currentPage === 'survey-arm') {
            return <SurveyARMPage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'survey-existing') {
            return <SurveyExistingPage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'survey-tiang-apj-propose') {
            return <SurveyTiangAPJProposePage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'survey-tiang-apj-new') {
            return <SurveyTiangAPJNewPage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'survey-trafo') {
            return <SurveyTrafoPage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'survey-fasos-fasum') {
            return <SurveyFasosFasumPage onBack={handleBackToSurveyList} />;
        }
        
        if (currentPage === 'kemerataan-sinar') {
            return <UniformityPage onBack={handleBackToDashboard} user={user} onLogout={onLogout} />;
        }
        
        if (currentPage === 'data-survey-valid') {
            return <ValidSurveyDataPage onBack={handleBackToDashboard} />;
        }

        // Default dashboard content based on active tab
        switch(activeTab) {
            case 'home':
                return renderHomeContent();
            case 'notifikasi':
                return renderNotifikasiContent();
            case 'profil':
                return renderProfilContent();
            default:
                return renderHomeContent();
        }
    };

        return (
            <div className="min-h-screen bg-gray-100 flex flex-col">
                {renderContent()}
                {/* Only show bottom nav when on dashboard pages, not on survey list */}
                {currentPage === 'dashboard' && (
                    <SurveyorBottomNav 
                        activeTab={activeTab} 
                        onTabChange={setActiveTab}
                        unreadCount={unreadCount}
                    />
                )}
                
            {/* Mini Maps Component - Always show if task is active */}
            <MiniMapsComponent 
                userId={user?.uid} 
                taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
            />

            {/* Upload Progress Tracking Modal */}
            <UploadTrackingModal
                isOpen={showUploadTracking}
                onClose={() => setShowUploadTracking(false)}
                userName={user?.displayName || user?.email || 'Surveyor'}
                onSuccess={handleTrackingSuccess}
            />

            {/* Success Alert after saved */}
            <SuccessAlertModal
                isVisible={successAlert.open}
                onClose={() => setSuccessAlert({ open: false, message: '' })}
                title="Berhasil Tersimpan"
                message={successAlert.message || 'Upload berhasil.'}
                autoClose={true}
                autoCloseDelay={2500}
            />

            </div>
        );
};

export default SurveyorDashboardPage;

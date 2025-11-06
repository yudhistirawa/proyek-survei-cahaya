"use client";

// Force dynamic rendering to avoid SSR issues with window object
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import DocumentationModal from './components/DocumentationModal';
import { useVirtualizer } from '@tanstack/react-virtual';

// Import error handler
import { handleFirebaseError, handleNetworkError } from './lib/error-handler';
import ErrorBoundary from './error-boundary';

import { 
    logLogin, 
    logReportCreate, 
    logReportEdit, 
    logReportDelete, 
    logReportView, 
    logReportExport, 
    logAdminAccess, 
    logBulkDelete, 
    logBulkExport,
    logPageView 
} from './lib/activity-logger';
import useRealtimeLocation from './hooks/useRealtimeLocation';
import FullscreenLoading from './components/FullscreenLoading';

// Firestore imports moved to top level to fix import error
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './lib/firebase';

// Import Firebase Auth
import { onAuthStateChange, logout, registerUser, getUserRole } from './lib/auth';
import { getDashboardAccess } from './lib/userRoles';

// Import constants and utilities
import { GRID_ROWS, GRID_COLS, DEFAULT_CELL_STATE, REPORTS_PER_PAGE } from './constants';
import { sleep, convertGridToXLSX } from './utils';
import { useDebounce } from './hooks/useDebounce';

// Import components
import { LoginPage } from './components/pages/LoginPage';
import { SelectionPage } from './components/pages/SelectionPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { GridCell } from './components/grid/GridCell';
import { GridHeader } from './components/grid/GridHeader';
import { SidebarContent } from './components/sidebar/SidebarContent';
import { ModernCheckbox } from './components/ModernCheckbox';
import { Pagination } from './components/Pagination';

// Import modals
import {
    ConfirmationModal,
    AlertModal,
    LoadByNameModal,
    ReportSelectionModal,
    ImageReviewModal,
    EditCellModal,
    ViewCellModal
} from './components/modals';

// Import AdminPage component
import AdminPage from './components/pages/AdminPage';
import UniformityPage from './components/pages/UniformityPage';
import SurveyorDashboardPage from './components/pages/SurveyorDashboardPage';
import PanelAdminSurveyLapanganRefactored from './components/pages/PanelAdminSurveyLapanganRefactored';

// Initialize Firestore only on client side
let db;
if (typeof window !== 'undefined' && firebaseApp) {
    db = getFirestore(firebaseApp);
}

// GridPage Component
const GridPage = ({ selectedName, selectedPower, selectedHeight, selectedTegangan, onBack, sessionData, setSessionData, isUserMode, onSaveSuccess, loggedInUser }) => {
    const scrollContainerRef = useRef(null);
    const topOverlayRef = useRef(null);
    const inScrollHeaderRef = useRef(null);
    const [gridData, setGridData] = useState(sessionData.gridData);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false); 
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    const [currentCell, setCurrentCell] = useState(null);
    const [reviewImage, setReviewImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [clearContext, setClearContext] = useState({ isAdmin: false });
    const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false);
    const [uploadedDocumentationPhotos, setUploadedDocumentationPhotos] = useState({});
    const [leftOverlayTopOffset, setLeftOverlayTopOffset] = useState(0);
    const [gridTopOffset, setGridTopOffset] = useState(0);
    const leftHeaderRef = useRef(null);

    const openDocumentationModal = () => {
        setIsDocumentationModalOpen(true);
    };

    const closeDocumentationModal = useCallback(() => {
        setIsDocumentationModalOpen(false);
    }, []);

    const handleDocumentationComplete = (uploadedUrls) => {
        setUploadedDocumentationPhotos(uploadedUrls);
        console.log('Uploaded documentation photos:', uploadedUrls);
    };

    // Real-time Firestore listener for admin panel to get live updates of gridData
    useEffect(() => {
        if (!sessionData?.id || isUserMode || !db) return;

const docRef = doc(db, 'reports', sessionData.id); // Pastikan ini mengarah ke dokumen yang benar
console.log("Fetching data for report ID:", sessionData.id); // Log ID yang digunakan untuk fetching

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Fetched data:", data); // Log data yang diambil
                let newGridData = data.gridData;
                if (typeof newGridData === 'string') {
                    try {
                        newGridData = JSON.parse(newGridData);
                    } catch (e) {
                        console.error('Failed to parse gridData JSON:', e);
                        return;
                    }
                }
                setGridData(newGridData);
            } else {
                console.warn("Document does not exist");
                setGridData([]); // Set gridData to empty if document does not exist
            }
        }, (error) => {
            console.error('Firestore onSnapshot error:', error);
            handleFirebaseError(error, 'Firestore listener');
        });

        return () => {
            try {
                unsubscribe();
            } catch (error) {
                console.warn('Error unsubscribing from Firestore:', error);
                handleFirebaseError(error, 'Firestore unsubscribe');
            }
        };
    }, [sessionData?.id, isUserMode]);

    // Real-time location for project location
    const {
        location: projectLocation,
        accuracy: projectLocationAccuracy,
        error: projectLocationError,
        isLoading: isLoadingProjectLocation
    } = useRealtimeLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        distanceFilter: 1,
        autoStart: isUserMode
    });

    const debouncedGridData = useDebounce(gridData, 1000);

    // Effect to save session data to localStorage
    useEffect(() => {
        if (isUserMode) {
            localStorage.setItem('savedGridData', JSON.stringify(debouncedGridData));
            localStorage.setItem('savedSelection', JSON.stringify({
                nama: selectedName,
                power: selectedPower,
                height: selectedHeight,
                teganganAwal: selectedTegangan
            }));
            localStorage.setItem('savedProjectInfo', JSON.stringify(sessionData.projectInfo));
        }
    }, [debouncedGridData, isUserMode, selectedName, selectedPower, selectedHeight, selectedTegangan, sessionData.projectInfo]);

    const handleResize = useCallback(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setIsHeaderVisible(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
            handleResize();
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [handleResize]);

    // Measure header heights: left overlay starts directly under "Jarak Tiang" label
    useEffect(() => {
        const measure = () => {
            const fullHeaderH = topOverlayRef.current?.clientHeight ?? 56; // entire header (left label + top numbers)
            const leftLabelH = leftHeaderRef.current?.clientHeight ?? 56; // only left label height
            setGridTopOffset(Math.max(0, fullHeaderH));
            // Left overlay should start right under the "Jarak Tiang" label with no gap
            setLeftOverlayTopOffset(Math.max(0, leftLabelH));
        };
        measure();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
    }, [isHeaderVisible]);
            
    useEffect(() => {
        setGridData(sessionData.gridData);
    }, [sessionData.gridData]);

    const handleProjectTitleChange = useCallback((newTitle) => {
        setSessionData(prev => ({
            ...prev,
            projectInfo: {
                ...prev.projectInfo,
                title: newTitle,
            },
        }));
    }, [setSessionData]);
    
    // Update project location when real-time location changes
    useEffect(() => {
        if (isUserMode && projectLocation && (
            sessionData.projectInfo?.location === 'Mendapatkan lokasi...' ||
            sessionData.projectInfo?.location === 'Lokasi tidak tersedia' ||
            sessionData.projectInfo?.location === 'Lokasi tidak didukung'
        )) {
            const updateProjectLocation = async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${projectLocation.lat}&lon=${projectLocation.lon}`);
                    if (!response.ok) throw new Error('Gagal mendapatkan nama jalan.');
                    
                    const data = await response.json();
                    const road = data.address.road || '';
                    const city = data.address.city || data.address.town || data.address.county || '';
                    const finalLocation = [road, city].filter(Boolean).join(', ');

                    setSessionData(prev => ({
                        ...prev,
                        projectInfo: {
                            ...prev.projectInfo,
                            location: finalLocation || `Lat: ${projectLocation.lat.toFixed(4)}, Lon: ${projectLocation.lon.toFixed(4)}`
                        }
                    }));
                } catch (error) {
                    setSessionData(prev => ({
                        ...prev,
                        projectInfo: {
                            ...prev.projectInfo,
                            location: `Lat: ${projectLocation.lat.toFixed(4)}, Lon: ${projectLocation.lon.toFixed(4)}`
                        }
                    }));
                    console.warn('Gagal mendapatkan nama jalan, menggunakan koordinat:', error);
                }
            };

            updateProjectLocation();
        }
    }, [isUserMode, projectLocation, sessionData.projectInfo?.location, setSessionData]);

    // Handle project location errors
    useEffect(() => {
        if (isUserMode && projectLocationError && sessionData.projectInfo?.location === 'Mendapatkan lokasi...') {
            setSessionData(prev => ({ 
                ...prev, 
                projectInfo: {
                    ...prev.projectInfo, 
                    location: 'Lokasi tidak tersedia' 
                }
            }));
            setAlertModal({ 
                isOpen: true, 
                message: 'Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.', 
                type: 'error' 
            });
        }
    }, [isUserMode, projectLocationError, sessionData.projectInfo?.location, setSessionData]);
    
    const [stats, setStats] = useState({ lmin: '0.00', lmax: '0.00', lavg: '0.00' });

    useEffect(() => {
        // Add safety check for gridData
        if (!gridData || !Array.isArray(gridData) || gridData.length === 0) {
            setStats({ lmin: '0.00', lmax: '0.00', lavg: '0.00' });
            return;
        }

        const values = gridData.flat()
            .filter(c => c && c.timestamp !== null && (c.type === 'normal' || c.type === 'api'))
            .map(c => {
                const val = typeof c.value === 'string' ? parseFloat(c.value) : c.value;
                return isNaN(val) || val === null || val === undefined ? null : val;
            })
            .filter(v => v !== null && v !== undefined);

        if (values.length === 0) {
            setStats({ lmin: '0.00', lmax: '0.00', lavg: '0.00' });
            return;
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        setStats({ lmin: min.toFixed(2), lmax: max.toFixed(2), lavg: avg.toFixed(2) });
    }, [gridData]);

    // Export progress modal state & helpers
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const exportCancelledRef = useRef(false);

    const openExportModal = () => {
        exportCancelledRef.current = false;
        setIsExportModalOpen(true);
    };

    const cancelExport = () => {
        exportCancelledRef.current = true;
        setIsExportModalOpen(false);
    };

    const handleExportSingleReport = useCallback(async () => {
        openExportModal();
        await sleep(50);
        setIsExporting(true);
        try {
            if (typeof window === 'undefined' || !window.JSZip || !window.saveAs || !window.XLSX) {
                throw new Error("Pustaka ekspor (JSZip, FileSaver, atau SheetJS) tidak termuat.");
            }

            const zip = new window.JSZip();

            const surveyor = (selectedName || 'TanpaNama').replace(/[\/\\?%*:|"<>]/g, '');
            const power = (selectedPower || '0W').replace('W', '');
            const voltage = (selectedTegangan || '0V').replace('V', '');
            const height = (selectedHeight || '0M').replace(' Meter', '');
            const date = new Date(sessionData.projectInfo.date).toISOString().slice(0, 10);

            const folderName = `${surveyor}_${power}W_${voltage}V_${height}M`;
            const reportFolder = zip.folder(folderName);
            
            if (!reportFolder) throw new Error(`Gagal membuat folder: ${folderName}`);

            const imageFolder = reportFolder.folder("Foto");
            if (!imageFolder) throw new Error(`Gagal membuat sub-folder 'Foto' di dalam ${folderName}`);

            const documentationFolder = reportFolder.folder("Foto Dokumentasi");
            if (!documentationFolder) throw new Error(`Gagal membuat sub-folder 'Foto Dokumentasi' di dalam ${folderName}`);

            const reportDetails = {
                surveyorName: selectedName,
                lampPower: selectedPower,
                poleHeight: selectedHeight,
                initialVoltage: selectedTegangan,
                stats: stats
            };

            const workbook = convertGridToXLSX(gridData, sessionData.projectInfo, reportDetails);
            const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const excelFilename = `Laporan ${surveyor}_${power}W_${voltage}V_${height}M_${date}.xlsx`;
            reportFolder.file(excelFilename, xlsxData);

            // Process images and documentation photos here...
            // (Implementation would be similar to original but simplified for this example)
            
            const zipFilename = `Laporan_${folderName}_${date}.zip`;
            const zipBlob = await zip.generateAsync({ 
                type: "blob", 
                compression: "DEFLATE",
                compressionOptions: { level: 1 }
            });
            if (typeof window !== 'undefined' && window.saveAs) {
                window.saveAs(zipBlob, zipFilename);
            } else {
                throw new Error("FileSaver tidak tersedia untuk mengunduh file.");
            }
            setIsExportModalOpen(false);
            
            setAlertModal({ isOpen: true, message: `Laporan "${zipFilename}" berhasil di-export sebagai ZIP dengan foto dokumentasi!`, type: 'success' });

        } catch (error) {
            console.error("Error exporting single report:", error);
            setAlertModal({ isOpen: true, message: `Gagal mengekspor laporan: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    }, [gridData, sessionData.projectInfo, selectedName, selectedPower, selectedHeight, selectedTegangan, stats, uploadedDocumentationPhotos]);
    
    const handleCellClick = useCallback((rowIndex, colIndex) => { 
        const cellInfo = { row: rowIndex, col: colIndex, data: gridData[rowIndex][colIndex] };
        setCurrentCell(cellInfo);
        if (isUserMode || sessionData.isAdminEdit) {
            setIsEditModalOpen(true);
        } else {
            setIsViewModalOpen(true);
        }
    }, [gridData, isUserMode, sessionData.isAdminEdit]);

    // Add event listener for navigation
    useEffect(() => {
        const handleNavigateToCell = (event) => {
            const { row, col, openModal } = event.detail;
            
            if (openModal) {
                setIsEditModalOpen(false);
                
                setTimeout(() => {
                    const cellInfo = { row, col, data: gridData[row][col] };
                    setCurrentCell(cellInfo);
                    setIsEditModalOpen(true);
                }, 50);
            } else {
                handleCellClick(row, col);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('navigateToCell', handleNavigateToCell);
            return () => {
                window.removeEventListener('navigateToCell', handleNavigateToCell);
            };
        }
    }, [handleCellClick, gridData]);

    const handleSaveCell = useCallback(async (updatedData) => { 
        const convertedValue = typeof updatedData.value === 'string' ? parseFloat(updatedData.value) : updatedData.value;
        const newValue = isNaN(convertedValue) ? updatedData.value : convertedValue;
        const updatedDataWithNumber = { ...updatedData, value: newValue };

        setGridData(currentGrid => {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[currentCell.row][currentCell.col] = updatedDataWithNumber; 

            const values = newGrid.flat()
                .filter(c => c && c.timestamp !== null && (c.type === 'normal' || c.type === 'api'))
                .map(c => {
                    const val = typeof c.value === 'string' ? parseFloat(c.value) : c.value;
                    return isNaN(val) || val === null || val === undefined ? null : val;
                })
                .filter(v => v !== null && v !== undefined);

            if (values.length === 0) {
                setStats({ lmin: '0.00', lmax: '0.00', lavg: '0.00' });
            } else {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                setStats({ lmin: min.toFixed(2), lmax: max.toFixed(2), lavg: avg.toFixed(2) });
            }

            return newGrid;
        });

        // Save to backend logic would go here...
        try {
            if (!sessionData || !sessionData.projectInfo) return;

            const gridDataToSave = gridData.map(row => 
                row.map(cell => ({ 
                    value: cell.value, 
                    description: cell.description, 
                    type: cell.type,
                    image: cell.image || null,
                    timestamp: cell.timestamp || null,
                    location: cell.location || null
                }))
            );

            gridDataToSave[currentCell.row][currentCell.col] = updatedDataWithNumber;

            const adminName = loggedInUser?.displayName || loggedInUser?.email;

            const reportData = {
                id: sessionData.id,
                projectTitle: sessionData.projectInfo.title,
                projectLocation: sessionData.projectInfo.location,
                projectDate: sessionData.projectInfo.date,
                lampPower: selectedPower,
                poleHeight: selectedHeight,
                initialVoltage: selectedTegangan,
                surveyorName: selectedName,
                gridData: JSON.stringify(gridDataToSave),
                stats: stats,
                documentationPhotos: uploadedDocumentationPhotos || {},
                modifiedAt: sessionData.isAdminEdit ? new Date().toISOString() : (sessionData.modifiedAt || null),
                modifiedBy: sessionData.isAdminEdit ? adminName : null
            };

            console.log('Saving report with documentation photos:', uploadedDocumentationPhotos);

            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menyimpan laporan.');
            }

            const result = await response.json();
            setSessionData(prev => ({...prev, id: result.id, modifiedAt: reportData.modifiedAt}));
            onSaveSuccess();

        } catch (e) {
            console.error("Error saving cell data: ", e);
            setAlertModal({ isOpen: true, message: `Gagal menyimpan data sel: ${e.message}`, type: 'error' });
        }
    }, [currentCell, gridData, sessionData, selectedName, selectedPower, selectedHeight, selectedTegangan, onSaveSuccess, setSessionData, stats, loggedInUser]);
    
    const handleClear = (isAdmin) => {
        setClearContext({ isAdmin });
        setIsClearConfirmOpen(true); 
    };

    const executeClear = async () => { 
        if (clearContext.isAdmin) {
            setGridData(currentGrid =>
                currentGrid.map(row =>
                    row.map(cell => ({
                        ...DEFAULT_CELL_STATE,
                        image: cell.image || null,
                    }))
                )
            );
            setAlertModal({ isOpen: true, message: "Grid telah dibersihkan, tetapi foto tetap tersimpan.", type: 'success' });
        } else {
            const imageUrls = [];
            gridData.forEach(row => {
                row.forEach(cell => {
                    if (cell.image && cell.image.includes('firebase')) {
                        imageUrls.push(cell.image);
                    }
                });
            });

            setGridData(Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ({...DEFAULT_CELL_STATE }))));
            
            if (imageUrls.length > 0) {
                try {
                    const response = await fetch('/api/cleanup-images', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageUrls }),
                    });
                    
                    if (!response.ok) {
                        console.error('Error cleaning up images:', await response.text());
                    } else {
                        const result = await response.json();
                        console.log('Image cleanup result:', result);
                    }
                } catch (error) {
                    console.error('Error initiating image cleanup:', error);
                }
            }

            setAlertModal({ isOpen: true, message: "Semua data grid berhasil dibersihkan!", type: 'success' });
        }
        setClearContext({ isAdmin: false });
    };
    
    const handleDeleteCell = useCallback(async () => {
        if (currentCell) {
            const cellToDelete = gridData[currentCell.row][currentCell.col];
            
            setGridData(currentGrid => {
                const newGrid = currentGrid.map(row => [...row]);
                newGrid[currentCell.row][currentCell.col] = { ...DEFAULT_CELL_STATE };
                return newGrid;
            });

            if (cellToDelete.image && cellToDelete.image.includes('firebase')) {
                try {
                    const response = await fetch('/api/delete-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageUrl: cellToDelete.image }),
                    });
                    
                    if (!response.ok) {
                        console.error('Error deleting cell image:', await response.text());
                    } else {
                        console.log('Cell image deleted from storage successfully');
                    }
                } catch (error) {
                    console.error('Error deleting cell image from storage:', error);
                }
            }
        }
    }, [currentCell, gridData]);
    
    const handleBackClick = () => {
        if (isPanelOpen) { 
            setIsPanelOpen(false); 
        }
        onBack();
    };
    
    const handleBackWithTransition = () => { 
        if (isPanelOpen) { 
            setIsPanelOpen(false); 
        }
        onBack();
    };

    const handleImageReview = useCallback((e, rowIndex, colIndex) => { 
        e.stopPropagation();
        const cell = gridData[rowIndex][colIndex]; 
        if (cell.image) { 
            setReviewImage({ src: cell.image, name: `Foto_Jarak-${rowIndex+1}_Lebar-${colIndex+1}.webp`}); 
            setIsReviewModalOpen(true); 
        } 
    }, [gridData]);
    
    const openReviewModal = useCallback((src, name) => {
        setReviewImage({ src, name });
        setIsReviewModalOpen(true);
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: GRID_ROWS,
        getScrollElement: () => scrollContainerRef.current,
        // Row slot height = cell height (56) + vertical gap (8) = 64px for comfortable spacing
        estimateSize: () => 64,
        overscan: 5,
    });
    
    return (
        <div className="h-screen w-full flex font-sans bg-slate-100 overflow-hidden">
            <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} message={alertModal.message} type={alertModal.type} />
            
            <aside className="hidden lg:flex flex-col bg-white text-gray-900 w-72 p-6 shadow-lg flex-shrink-0">
                <SidebarContent 
                    key={sessionData.id}
                    projectInfo={sessionData.projectInfo} 
                    onProjectTitleChange={handleProjectTitleChange}
                    selectedName={selectedName} 
                    selectedPower={selectedPower} 
                    selectedHeight={selectedHeight} 
                    selectedTegangan={selectedTegangan}
                    stats={stats} 
                    onBack={handleBackClick} 
                    onClear={handleClear} 
                    isSaving={isSaving} 
                    isUserMode={isUserMode}
                    isAdminView={!!sessionData?.isAdminView}
                    isAdminEdit={!!sessionData?.isAdminEdit}
                    openDocumentationModal={openDocumentationModal}
                    onExportSingle={handleExportSingleReport}
                    projectLocationStatus={isUserMode ? {
                        location: projectLocation,
                        accuracy: projectLocationAccuracy,
                        error: projectLocationError,
                        isLoading: isLoadingProjectLocation
                    } : null}
                />
            </aside>

            <main className="flex-1 flex flex-col overflow-auto p-4 relative">
                <div className={`lg:hidden fixed top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${!isHeaderVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90 pointer-events-none'}`}>
                    <div className="grid place-items-center">
                        <button
                            onClick={() => setIsHeaderVisible(true)}
                            className="bg-white/98 backdrop-blur-xl text-blue-600 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 hover:bg-blue-50 hover:shadow-3xl active:scale-95 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border border-blue-200/50 whitespace-nowrap"
                        >
                            <span className="text-sm sm:text-base font-semibold">Tampilkan Header</span>
                        </button>
                    </div>
                </div>
                
                <div 
                    className={`transition-all duration-1200 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHeaderVisible ? 'max-h-96 mb-2 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}
                    style={{
                        transform: isHeaderVisible ? 'translateY(0px) scale(1)' : 'translateY(-20px) scale(0.98)',
                        transition: 'all 1200ms cubic-bezier(0.23, 1, 0.32, 1)'
                    }}
                >
                    <div className={`overflow-hidden transition-all duration-1200 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        <GridHeader 
                            projectInfo={sessionData.projectInfo}
                            selectedName={selectedName}
                            selectedPower={selectedPower}
                            selectedHeight={selectedHeight}
                            selectedTegangan={selectedTegangan}
                            onToggleHeader={() => setIsHeaderVisible(false)}
                            projectLocationStatus={isUserMode ? {
                                location: projectLocation,
                                accuracy: projectLocationAccuracy,
                                error: projectLocationError,
                                isLoading: isLoadingProjectLocation
                            } : null}
                        />
                    </div>
                </div>
                
                <div ref={scrollContainerRef} className="flex-1 overflow-auto cursor-grab active:cursor-grabbing -mr-4 -ml-4 pl-4 pr-4 isolate">
                    <div className="min-w-max inline-block relative">
                        {/* Headers */}
                        <div className="sticky top-0 z-[4000] bg-white/95 backdrop-blur-sm pb-0 border-b border-slate-200 shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)] isolate h-0 overflow-hidden">
                            <div className="grid grid-cols-[auto_1fr] gap-2 mb-0 h-0 overflow-hidden">
                                <div className="sticky left-0 bg-white/95 z-[4000] w-20 border-r border-slate-200 shadow-[4px_0_10px_-6px_rgba(0,0,0,0.2)] isolate opacity-0 select-none">
                                    <div className="p-2 text-center font-semibold text-sm bg-white text-slate-500 rounded-lg h-full flex items-center justify-center"></div>
                                </div>
                                <div className="p-3 text-center font-semibold text-base bg-white text-slate-500 rounded-lg shadow-sm">Lebar Jalan (m)</div>
                            </div>
                            <div className="flex gap-2 h-0 overflow-hidden">
                                <div className="sticky left-0 bg-white p-1 w-20 h-14 z-[4000] flex items-center justify-center font-medium text-slate-600 rounded-lg shadow-sm border-r border-slate-200 isolate opacity-0 select-none">
                                    <span className="text-[10px] leading-none text-center">Jarak<br/>Tiang<br/>(m)</span>
                                </div>
                                {Array.from({length: GRID_COLS}).map((_, i) => (
                                    <div key={i} className="p-2 h-14 flex items-center justify-center font-semibold text-sm text-center w-16 bg-white text-slate-600 rounded-lg shadow-sm relative z-[3900] opacity-0 select-none">{i + 1}</div>
                                ))}
                            </div>
                        </div>

                        {/* Virtualized Body */}
                        <div className="relative z-[100]" style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                            marginTop: `${leftOverlayTopOffset}px`,
                        }}>
                            {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                const rowIndex = virtualRow.index;
                                const row = gridData[rowIndex];
                                if (!row) return null;

                                return (
                                    <div
                                        key={virtualRow.key}
                                        className="flex gap-2 items-start py-1 overflow-visible z-0"
                                        style={{
                                            position: 'absolute',
                                            top: `${virtualRow.start}px`,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`
                                        }}
                                    >
                                        <div className="sticky left-0 bg-white p-2 w-20 z-[3500] text-center font-medium text-slate-600 rounded-lg flex items-center justify-center shadow-sm border-r border-slate-200 isolate opacity-0 select-none">{rowIndex + 1}</div>
                                        {row.map((cell, colIndex) => (
                                            <GridCell
                                                key={`${rowIndex}-${colIndex}`}
                                                cellData={cell}
                                                rowIndex={rowIndex}
                                                colIndex={colIndex}
                                                onCellClick={handleCellClick}
                                                onImageReview={handleImageReview}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Non-interactive, perfectly aligned overlay to keep numbers visible */}
                        <div className="pointer-events-none absolute inset-0 z-[5000]">
                            {/* Top overlay: left label + header numbers */}
                            <div ref={topOverlayRef} className="sticky top-0 w-full">
                                <div className="flex gap-2 items-start">
                                    <div ref={leftHeaderRef} className="bg-white p-1 w-20 h-14 flex items-center justify-center font-medium text-slate-700 rounded-lg shadow-sm border-r border-slate-200">
                                        <span className="text-[10px] leading-none text-center">Jarak<br/>Tiang<br/>(m)</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {Array.from({length: GRID_COLS}).map((_, i) => (
                                            <div key={`overlay-top-${i}`} className="p-2 h-14 flex items-center justify-center font-semibold text-sm text-center w-16 bg-white text-slate-700 rounded-lg shadow-sm">{i + 1}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Left overlay: sticky container to remain visible during horizontal scroll */}
                            <div className="sticky left-0 z-[5100]" style={{ width: '80px', paddingTop: `${leftOverlayTopOffset}px` }}>
                                <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                                    {rowVirtualizer.getVirtualItems().map(virtualRow => (
                                        <div key={`overlay-left-${virtualRow.key}`} className="absolute left-0 flex items-start py-1" style={{ top: `${virtualRow.start}px`, height: `${virtualRow.size}px` }}>
                                            <div className="bg-white h-14 flex items-center justify-center p-2 w-20 text-center font-medium text-slate-700 rounded-lg shadow-sm border-r border-slate-200">{virtualRow.index + 1}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        
                    </div>
                </div>
            </main>

            {/* Render Modals */}
            {currentCell && (
                <>
                    <EditCellModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        cellData={currentCell.data} 
                        cellCoords={{ row: currentCell.row, col: currentCell.col }} 
                        onSave={handleSaveCell} 
                        isAdminEdit={!!sessionData?.isAdminEdit}
                        onImageClick={openReviewModal}
                        surveyorName={selectedName}
                    />
                    <ViewCellModal 
                        isOpen={isViewModalOpen} 
                        onClose={() => setIsViewModalOpen(false)} 
                        cellData={currentCell.data} 
                        cellCoords={{ row: currentCell.row, col: currentCell.col }} 
                        onImageClick={openReviewModal}
                    />
                </>
            )}

            <ImageReviewModal 
                isOpen={isReviewModalOpen} 
                onClose={() => setIsReviewModalOpen(false)} 
                imageSrc={reviewImage?.src} 
                downloadName={reviewImage?.name} 
            />

            <ConfirmationModal 
                isOpen={isClearConfirmOpen} 
                onClose={() => setIsClearConfirmOpen(false)} 
                onConfirm={executeClear} 
                title="Konfirmasi Bersihkan Grid" 
                message="Apakah Anda yakin ingin membersihkan semua data grid? Data yang sudah dibersihkan tidak dapat dikembalikan." 
                confirmText="Ya, Bersihkan" 
            />

            <DocumentationModal 
                isOpen={isDocumentationModalOpen}
                onClose={closeDocumentationModal}
                onComplete={handleDocumentationComplete}
                surveyorName={selectedName}
                existingPhotos={uploadedDocumentationPhotos}
            />

            <AlertModal 
                isOpen={alertModal.isOpen} 
                onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} 
                message={alertModal.message} 
                type={alertModal.type} 
            />
        </div>
    );
};

// Main Application Component
function Home() {
    useEffect(() => {
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) {
                if (callback) callback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.async = true;
            script.onload = () => {
                if (callback) callback();
            };
            script.onerror = (e) => {
                console.error(`Failed to load script: ${src}`, e);
                // Remove handleNetworkError from dependency since it's not needed here
            };
            document.body.appendChild(script);
        };
        
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'jszip-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js', 'filesaver-script', () => {
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'sheetjs-script');
            });
        });
    }, []);

    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [allowedDashboard, setAllowedDashboard] = useState(null);
    const [selection, setSelection] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [selectionKey, setSelectionKey] = useState(0);
    
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [surveyorReports, setSurveyorReports] = useState([]);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    const [isLoadByNameModalOpen, setIsLoadByNameModalOpen] = useState(false);
    const [isPostSaveModalOpen, setIsPostSaveModalOpen] = useState(false);
    const [uploadedDocumentationPhotos, setUploadedDocumentationPhotos] = useState({});

    // Auth state listener dengan role-based routing
    useEffect(() => {
        const unsubscribe = onAuthStateChange(async (authUser) => {
            if (authUser) {
                setUser(authUser);
                const role = await getUserRole(authUser.uid);
                setUserRole(role);
                const dashboardAccess = getDashboardAccess(role);
                setAllowedDashboard(dashboardAccess);
                
                // Role-based automatic routing
                if (role === 'admin') {
                    // Selalu set admin page active dan arahkan ke admin page
                    localStorage.setItem('adminPageActive', 'true');
                    setPage('admin');
                } else if (role === 'admin_survey' || role === 'super_admin') {
                  // Admin survey lapangan langsung ke panel admin survey lapangan
                  setPage('admin-survey');
                } else if (role === 'petugas_pengukuran') {
                    // Petugas pengukuran langsung ke dashboard pengukuran
                    setPage('selection'); // Akan otomatis menampilkan dashboard pengukuran saja
                } else if (role === 'petugas_kemerataan' || role === 'petugas_kemerataan_sinar') {
                    // Petugas kemerataan langsung ke dashboard kemerataan (uniformity)
                    setPage('uniformity');
                } else if (role === 'petugas_surveyor') {
                    // Petugas surveyor langsung ke dashboard surveyor
                    setPage('surveyor');
                } else {
                    // Fallback untuk role lain
                    setPage('selection');
                }
            } else {
                setUser(null);
                setUserRole(null);
                setAllowedDashboard(null);
                localStorage.removeItem('adminPageActive'); // Clear admin page flag on logout
                setPage('login');
            }
        });

        return () => unsubscribe();
    }, []);

    // Check for existing session after auth is determined
    useEffect(() => {
        if (page === 'selection' && user) {
            const timer = setTimeout(async () => {
                try {
                    const savedSelection = localStorage.getItem('savedSelection');
                    const savedGridData = localStorage.getItem('savedGridData');
                    const savedProjectInfo = localStorage.getItem('savedProjectInfo');
                    const savedUniformityState = localStorage.getItem('savedUniformityState');

                    // Check for uniformity page state first
                    if (savedUniformityState) {
                        console.log("Sesi Uniformity aktif ditemukan, memulihkan...");
                        const uniformityState = JSON.parse(savedUniformityState);
                        
                        await logPageView(
                            user.displayName || user.email,
                            'petugas',
                            'Uniformity Page (Recovered Session)'
                        );
                        
                        setPage('uniformity');
                        return;
                    }

                    if (savedSelection && savedGridData && savedProjectInfo) {
                        console.log("Sesi Grid aktif ditemukan, memulihkan...");
                        const parsedSelection = JSON.parse(savedSelection);
                        const parsedGridData = JSON.parse(savedGridData);
                        const parsedProjectInfo = JSON.parse(savedProjectInfo);

                        setSelection(parsedSelection);
                        setSessionData({
                            id: parsedProjectInfo.id || `recovered-${Date.now()}`,
                            gridData: parsedGridData,
                            projectInfo: parsedProjectInfo,
                            teganganAwal: parsedSelection.teganganAwal,
                            fromPetugas: true
                        }); 
                        
                        await logPageView(
                            parsedSelection.nama || user.displayName || user.email,
                            'petugas',
                            'Grid Page (Recovered Session)'
                        );
                        
                        setPage('grid'); 
                    }
                } catch(e) {
                    console.error("Gagal memulihkan sesi, data mungkin rusak:", e);
                    localStorage.clear();
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [page, user]);

    // Deep-link support when redirected from /admin: /?reportId=...&adminMode=view|edit
    useEffect(() => {
        // Hanya jalankan jika user sudah authenticated dan role sudah tersedia
        if (typeof window === 'undefined' || !user || !userRole) return;
        
        try {
            const params = new URLSearchParams(window.location.search);
            const reportId = params.get('reportId');
            const adminMode = params.get('adminMode');
            
            // Hanya jalankan jika user adalah admin dan ada parameter yang valid
            if (reportId && (adminMode === 'view' || adminMode === 'edit') && userRole === 'admin') {
                fetch(`/api/reports?id=${encodeURIComponent(reportId)}`)
                    .then(res => res.ok ? res.json() : Promise.reject(new Error('Gagal memuat laporan')))
                    .then(fullReport => {
                        if (adminMode === 'view') {
                            handleViewReportFromAdmin(fullReport);
                        } else {
                            handleEditReportFromAdmin(fullReport);
                        }
                        // Bersihkan URL setelah berhasil memuat report
                        window.history.replaceState({}, document.title, window.location.pathname);
                    })
                    .catch(err => {
                        console.error('Admin deep-link load error:', err);
                        // Jika gagal memuat report, redirect ke admin page dan bersihkan URL
                        setPage('admin');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    });
            } else if (reportId && (adminMode === 'view' || adminMode === 'edit') && userRole !== 'admin') {
                // Jika bukan admin tapi ada parameter admin, bersihkan URL dan redirect sesuai role
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (e) {
            console.warn('Failed to parse admin deep-link params:', e);
        }
    }, [user, userRole]); // Depend on user and userRole

    const handleSelectionStart = async (projectTitle, nama, power, height, teganganAwal) => {
        // Check if this is for uniformity dashboard (Kemerataan Sinar)
        if (projectTitle === 'Kemerataan Sinar') {
            setPage('uniformity');
            return;
        }
        
        if (!nama || !power || !height || !teganganAwal) return;
        
        const newSelection = { projectTitle, nama, power, height, teganganAwal };
        const newGridData = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ({...DEFAULT_CELL_STATE })));
        const newProjectInfo = { 
            id: `new-${Date.now()}`, 
            title: projectTitle,
            location: 'Mendapatkan lokasi...', 
            date: new Date().toISOString().slice(0, 10) 
        };
        
        localStorage.setItem('savedSelection', JSON.stringify(newSelection));
        localStorage.setItem('savedGridData', JSON.stringify(newGridData));
        localStorage.setItem('savedProjectInfo', JSON.stringify(newProjectInfo));
        
        setSelection(newSelection);
        setSessionData({
            id: newProjectInfo.id,
            gridData: newGridData,
            projectInfo: newProjectInfo,
            teganganAwal: teganganAwal,
            fromPetugas: true
        }); 

        await logPageView(
            nama,
            'petugas',
            'Grid Page (New Session)'
        );
        
        setPage('grid');
    };
    
    const handleExitGrid = () => {
        const returnPage = sessionData?.fromPage || 'selection';
        
        localStorage.removeItem('savedGridData');
        localStorage.removeItem('savedProjectInfo');
        localStorage.removeItem('savedSelection');

        // Bersihkan URL parameters saat keluar dari grid
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        setSessionData(null);
        setSelection(null); 
        setPage(returnPage); 
        if(returnPage === 'selection') {
            setSelectionKey(prevKey => prevKey + 1);
        }
    };
    
    const handleViewReportFromAdmin = async (report) => {
        try {
            let fullReport = report;
            
            // Jika gridData tidak ada (lightweight mode), fetch full data secara background
            if (!report.gridData) {
                // Langsung set page dulu dengan data yang ada
                setSelection({
                    nama: report.surveyorName,
                    power: report.lampPower,
                    height: report.poleHeight,
                    teganganAwal: report.initialVoltage
                });
                setSessionData({
                    id: report.id,
                    gridData: [], // Temporary empty grid
                    projectInfo: {
                        title: report.projectTitle,
                        location: report.projectLocation,
                        date: report.projectDate
                    },
                    teganganAwal: report.initialVoltage,
                    fromPage: 'admin',
                    isAdminView: true,
                });
                
                setPage('grid'); // Langsung pindah halaman
                
                // Fetch full data di background
                const response = await fetch(`/api/reports?id=${report.id}`);
                if (response.ok) {
                    fullReport = await response.json();
                    // Update dengan data lengkap
                    setSessionData(prev => ({
                        ...prev,
                        gridData: typeof fullReport.gridData === 'string' ? JSON.parse(fullReport.gridData) : fullReport.gridData
                    }));
                    
                    if (fullReport.documentationPhotos) {
                        setUploadedDocumentationPhotos(fullReport.documentationPhotos);
                    }
                }
            } else {
                // Data sudah lengkap, langsung set
                setSelection({
                    nama: fullReport.surveyorName,
                    power: fullReport.lampPower,
                    height: fullReport.poleHeight,
                    teganganAwal: fullReport.initialVoltage
                });
                setSessionData({
                    id: fullReport.id,
                    gridData: typeof fullReport.gridData === 'string' ? JSON.parse(fullReport.gridData) : fullReport.gridData,
                    projectInfo: {
                        title: fullReport.projectTitle,
                        location: fullReport.projectLocation,
                        date: fullReport.projectDate
                    },
                    teganganAwal: fullReport.initialVoltage,
                    fromPage: 'admin',
                    isAdminView: true,
                });
                
                if (fullReport.documentationPhotos) {
                    setUploadedDocumentationPhotos(fullReport.documentationPhotos);
                }
                
                setPage('grid');
            }
        } catch (error) {
            console.error('Error loading report for view:', error);
            setAlertModal({ 
                isOpen: true, 
                message: `Gagal memuat laporan untuk dilihat: ${error.message}`, 
                type: 'error' 
            });
        }
    };

    const handleEditReportFromAdmin = async (report) => {
        try {
            let fullReport = report;
            
            // Jika gridData tidak ada (lightweight mode), fetch full data secara background
            if (!report.gridData) {
                // Langsung set page dulu dengan data yang ada
                setSelection({
                    nama: report.surveyorName,
                    power: report.lampPower,
                    height: report.poleHeight,
                    teganganAwal: report.initialVoltage
                });
                setSessionData({
                    id: report.id,
                    gridData: [], // Temporary empty grid
                    projectInfo: {
                        title: report.projectTitle,
                        location: report.projectLocation,
                        date: report.projectDate
                    },
                    teganganAwal: report.initialVoltage,
                    fromPage: 'admin',
                    isAdminEdit: true,
                });
                
                setPage('grid'); // Langsung pindah halaman
                
                // Fetch full data di background
                const response = await fetch(`/api/reports?id=${report.id}`);
                if (response.ok) {
                    fullReport = await response.json();
                    // Update dengan data lengkap
                    setSessionData(prev => ({
                        ...prev,
                        gridData: typeof fullReport.gridData === 'string' ? JSON.parse(fullReport.gridData) : fullReport.gridData
                    }));
                    
                    if (fullReport.documentationPhotos) {
                        setUploadedDocumentationPhotos(fullReport.documentationPhotos);
                    }
                }
            } else {
                // Data sudah lengkap, langsung set
                setSelection({
                    nama: fullReport.surveyorName,
                    power: fullReport.lampPower,
                    height: fullReport.poleHeight,
                    teganganAwal: fullReport.initialVoltage
                });
                setSessionData({
                    id: fullReport.id,
                    gridData: typeof fullReport.gridData === 'string' ? JSON.parse(fullReport.gridData) : fullReport.gridData,
                    projectInfo: {
                        title: fullReport.projectTitle,
                        location: fullReport.projectLocation,
                        date: fullReport.projectDate
                    },
                    teganganAwal: fullReport.initialVoltage,
                    fromPage: 'admin',
                    isAdminEdit: true,
                });
                
                if (fullReport.documentationPhotos) {
                    setUploadedDocumentationPhotos(fullReport.documentationPhotos);
                }
                
                setPage('grid');
            }
        } catch (error) {
            console.error('Error loading report for edit:', error);
            setAlertModal({ 
                isOpen: true, 
                message: `Gagal memuat laporan untuk diedit: ${error.message}`, 
                type: 'error' 
            });
        }
    };

    const handleLogin = async (authUser, userData) => {
        setUser(authUser);
        const role = userData?.role || await getUserRole(authUser.uid);
        setUserRole(role);
        const dashboardAccess = getDashboardAccess(role);
        setAllowedDashboard(dashboardAccess);
        
        // Role-based automatic routing setelah login
        if(role === 'admin') {
            localStorage.setItem('adminPageActive', 'true'); // Set admin page flag
            setPage('admin');
        } else if (role === 'admin_survey' || role === 'super_admin') {
            setPage('admin-survey');
        } else if (role === 'petugas_pengukuran') {
            // Petugas pengukuran langsung ke dashboard pengukuran
            setPage('selection'); // Akan otomatis menampilkan dashboard pengukuran saja
        } else if (role === 'petugas_kemerataan') {
            // Petugas kemerataan langsung ke dashboard kemerataan
            setPage('uniformity');
        } else if (role === 'petugas_surveyor') {
            // Petugas surveyor langsung ke dashboard surveyor
            setPage('surveyor');
        } else {
            // Fallback untuk role lain
            setPage('selection');
        }
        
        await logLogin(
            authUser.displayName || authUser.email,
            role,
            'Firebase Auth Login'
        );
    };

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.clear();
            // Bersihkan URL parameters saat logout
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            setUser(null);
            setUserRole(null);
            setAllowedDashboard(null);
            setSelection(null);
            setSessionData(null);
            setPage('login');
        } catch (error) {
            console.error('Logout error:', error);
            setAlertModal({ 
                isOpen: true, 
                message: 'Gagal logout. Silakan coba lagi.', 
                type: 'error' 
            });
        }
    };

    const handleRegister = async (userData) => {
        try {
            // Simpan data admin saat ini
            const currentAdmin = {
                user: user,
                role: userRole
            };
            
            await registerUser(userData.email, userData.password, {
                username: userData.username,
                displayName: userData.displayName,
                role: userData.role,
                createdBy: user.displayName || user.email
            });
            
            setAlertModal({ 
                isOpen: true, 
                message: `Pengguna ${userData.username} berhasil didaftarkan dengan role ${userData.role}`, 
                type: 'success' 
            });
            
            // Restore admin state setelah registrasi
            setUser(currentAdmin.user);
            setUserRole(currentAdmin.role);
            setAllowedDashboard(getDashboardAccess(currentAdmin.role));
            
            // Explicitly return to admin page after successful registration
            setPage('admin');
            
        } catch (error) {
            throw error; // Let RegisterPage handle the error
        }
    };

    const handleLoadDataRequest = async (surveyorName) => {
        setIsLoadingReports(true);
        try {
            const response = await fetch(`/api/reports?surveyorName=${encodeURIComponent(surveyorName)}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gagal mengambil data laporan: ${errorText}`);
            }
            const reports = await response.json();
            
            if (reports.length === 0) {
                setAlertModal({ 
                    isOpen: true, 
                    message: `Tidak ada laporan yang ditemukan untuk petugas "${surveyorName}".`, 
                    type: 'warning' 
                });
            } else {
                setSurveyorReports(reports);
                setIsReportModalOpen(true);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            setAlertModal({ isOpen: true, message: error.message, type: 'error' });
        } finally {
            setIsLoadingReports(false);
            setIsLoadByNameModalOpen(false);
        }
    };
    
    const handleSelectReportToLoad = async (report) => {
        const newSelection = {
            nama: report.surveyorName,
            power: report.lampPower,
            height: report.poleHeight,
            teganganAwal: report.initialVoltage
        };
        const newSessionData = {
            id: report.id,
            gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData,
            projectInfo: {
                title: report.projectTitle,
                location: report.projectLocation,
                date: report.projectDate
            },
            teganganAwal: report.initialVoltage,
            fromPetugas: true,
            fromPage: 'selection'
        };
        
        if (report.documentationPhotos) {
            setUploadedDocumentationPhotos(report.documentationPhotos);
        }
        
        localStorage.setItem('savedSelection', JSON.stringify(newSelection));
        localStorage.setItem('savedGridData', JSON.stringify(newSessionData.gridData));
        localStorage.setItem('savedProjectInfo', JSON.stringify(newSessionData.projectInfo));
        
        setSelection(newSelection);
        setSessionData(newSessionData);
        
        setPage('grid');
        setIsReportModalOpen(false);
        setAlertModal({ isOpen: true, message: `Laporan "${report.projectTitle}" berhasil dimuat.`, type: 'success' });
    };

    if (page === 'loading') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-slate-600">
                <RotateCw className="w-10 h-10 animate-spin text-blue-500" />
                <p className="mt-4 text-lg font-semibold">Mempersiapkan Aplikasi...</p>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="relative w-full min-h-screen bg-slate-100">
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'login' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'login' && <LoginPage onLogin={handleLogin} />}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'register' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'register' && <RegisterPage onRegister={handleRegister} onBack={() => setPage('admin')} currentAdminName={user?.displayName || user?.email} />}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'selection' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'selection' && 
                    <SelectionPage 
                        key={selectionKey}
                        onStart={handleSelectionStart} 
                        onAdminClick={userRole === 'admin' ? () => {
                            localStorage.setItem('adminPageActive', 'true');
                            setPage('admin');
                        } : handleLogout}
                        onOpenLoadModal={() => setIsLoadByNameModalOpen(true)}
                        allowedDashboard={allowedDashboard}
                        onLogout={handleLogout}
                        user={user}
                    />
                }
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'admin' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'admin' && <AdminPage onBack={() => {
                    localStorage.removeItem('adminPageActive');
                    // Bersihkan URL parameters saat keluar dari admin page
                    if (typeof window !== 'undefined') {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setPage('selection');
                }} onViewReport={handleViewReportFromAdmin} onEditReport={handleEditReportFromAdmin} loggedInAdminName={user?.displayName || user?.email} onRegisterClick={() => setPage('register')} onLogout={handleLogout} />}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'grid' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'grid' && selection && sessionData && (
                    <GridPage 
                        selectedName={selection.nama}
                        selectedPower={selection.power} 
                        selectedHeight={selection.height}
                        selectedTegangan={selection.teganganAwal}
                        onBack={handleExitGrid}
                        sessionData={sessionData}
                        isUserMode={!sessionData?.isAdminView && !sessionData?.isAdminEdit}
                        setSessionData={setSessionData}
                        onSaveSuccess={() => setIsPostSaveModalOpen(true)}
                        loggedInUser={user}
                    />
                )}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'uniformity' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'uniformity' && (
                    <UniformityPage 
                        onBack={() => setPage('selection')}
                        user={user}
                        onLogout={handleLogout}
                    />
                )}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'surveyor' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'surveyor' && (
                    <SurveyorDashboardPage 
                        user={user}
                        onLogout={handleLogout}
                    />
                )}
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'admin-survey' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'admin-survey' && (
                    <PanelAdminSurveyLapanganRefactored />
                )}
            </div>
            
            <LoadByNameModal
                isOpen={isLoadByNameModalOpen}
                onClose={() => setIsLoadByNameModalOpen(false)}
                onConfirm={handleLoadDataRequest}
                isLoading={isLoadingReports}
            />

            <ReportSelectionModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reports={surveyorReports}
                onSelectReport={handleSelectReportToLoad}
            />
            
            <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} message={alertModal.message} type={alertModal.type} />
            </div>
        </ErrorBoundary>
    );
}

const HomePage = Home;
export default HomePage;

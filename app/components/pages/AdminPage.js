"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { RotateCw, Archive, Trash2, Search, ChevronLeft, PlusCircle, X, Eye, Edit, FileSpreadsheet, CheckCircle, XCircle as XCircleIcon, MapPin, Clock, Lightbulb, Zap, Calendar, User, UserPlus, LogOut } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { REPORTS_PER_PAGE, INITIAL_LOAD_LIMIT, CHUNK_SIZE, DEBOUNCE_DELAY } from '../../constants';
import { ModernCheckbox } from '../ModernCheckbox';
import { Pagination } from '../Pagination';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { AlertModal } from '../modals/AlertModal';
import { UserInfoModal } from '../modals/UserInfoModal';
import FullscreenLoading from '../FullscreenLoading';
import { logAdminAccess, logReportDelete, logBulkDelete, logReportView, logReportEdit } from '../../lib/activity-logger';
import { sleep, convertGridToXLSX } from '../../utils';

const AdminPage = ({ onBack, onViewReport, onEditReport, loggedInAdminName, onRegisterClick, onLogout }) => {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const exportCancelledRef = useRef(false);

    const initialFilters = { title: '', location: '', surveyor: '', date: '', modified: 'all' };
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    const [currentPage, setCurrentPage] = useState(1);
    const [isListVisible, setIsListVisible] = useState(true);
    const [reportToDelete, setReportToDelete] = useState(null);
    
    const [selectedReportIds, setSelectedReportIds] = useState([]);
    const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);

    const listRef = useRef(null);

    // Debounced filter values untuk auto-search
    const debouncedTitle = useDebounce(filters.title, DEBOUNCE_DELAY);
    const debouncedLocation = useDebounce(filters.location, DEBOUNCE_DELAY);
    const debouncedSurveyor = useDebounce(filters.surveyor, DEBOUNCE_DELAY);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    // Auto-apply filters dengan debouncing
    useEffect(() => {
        const newAppliedFilters = {
            title: debouncedTitle,
            location: debouncedLocation,
            surveyor: debouncedSurveyor,
            date: filters.date,
            modified: filters.modified
        };
        
        // Hanya update jika ada perubahan
        if (JSON.stringify(newAppliedFilters) !== JSON.stringify(appliedFilters)) {
            setCurrentPage(1);
            setAppliedFilters(newAppliedFilters);
        }
    }, [debouncedTitle, debouncedLocation, debouncedSurveyor, filters.date, filters.modified, appliedFilters]);

    const handleSearchClick = useCallback(() => {
        setIsListVisible(false);
        setTimeout(() => {
            setCurrentPage(1);
            setAppliedFilters(filters);
            setIsListVisible(true);
        }, 150); // Faster transition
    }, [filters]);

    const handleResetFilters = useCallback(() => {
        setIsListVisible(false);
        setTimeout(() => {
            setFilters(initialFilters);
            setAppliedFilters(initialFilters);
            setCurrentPage(1);
            setIsListVisible(true);
        }, 150); // Faster transition
    }, []);

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;

        try {
            const response = await fetch(`/api/reports?id=${reportToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal menghapus laporan.');
                } else {
                    const errorText = await response.text();
                    throw new Error(`Gagal menghapus laporan: ${errorText || response.statusText}`);
                }
            }
            setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
            setSelectedReportIds(prev => prev.filter(id => id !== reportToDelete.id));
            
            setAlertModal({ isOpen: true, message: 'Laporan berhasil dihapus.', type: 'success' });
        } catch (err) {
            setAlertModal({ isOpen: true, message: err.message, type: 'error' });
        } finally {
            setReportToDelete(null);
        }
    };

    const handleBulkDeleteReports = async () => {
        setIsBulkDeleteConfirmOpen(false);
        if (selectedReportIds.length === 0) {
            setAlertModal({ isOpen: true, message: 'Tidak ada laporan yang dipilih untuk dihapus.', type: 'warning' });
            return;
        }

        setIsLoading(true);

        const successfulDeletes = [];
        const failedDeletes = [];

        for (const id of selectedReportIds) {
            try {
                const response = await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Gagal menghapus laporan ${id}: ${errorText || response.statusText}`);
                }
                successfulDeletes.push(id);
            } catch (err) {
                console.error(err);
                failedDeletes.push({ id, error: err.message });
            }
        }

        setReports(prev => prev.filter(r => !successfulDeletes.includes(r.id)));
        setSelectedReportIds([]);
        setIsBulkSelectionMode(false);
        setIsLoading(false);

        if (failedDeletes.length === 0) {
            setAlertModal({ isOpen: true, message: `${successfulDeletes.length} laporan berhasil dihapus.`, type: 'success' });
        } else if (successfulDeletes.length > 0) {
            setAlertModal({
                isOpen: true,
                message: `${successfulDeletes.length} laporan berhasil dihapus, tetapi ${failedDeletes.length} gagal.`,
                type: 'warning'
            });
        } else {
            setAlertModal({ isOpen: true, message: `Semua ${failedDeletes.length} laporan gagal dihapus.`, type: 'error' });
        }
    };

    const filteredReports = useMemo(() => {
        return reports
            .filter(report => {
                const reportDate = new Date(report.createdAt).toLocaleDateString('en-CA');
                const isModified = !!report.modifiedAt;
                const modifiedFilter = appliedFilters.modified === 'all' || 
                                       (appliedFilters.modified === 'modified' && isModified) || 
                                       (appliedFilters.modified === 'unmodified' && !isModified);
                return (
                    (report.projectTitle || '').toLowerCase().includes(appliedFilters.title.toLowerCase()) &&
                    (report.projectLocation || '').toLowerCase().includes(appliedFilters.location.toLowerCase()) &&
                    (report.surveyorName || '').toLowerCase().includes(appliedFilters.surveyor.toLowerCase()) &&
                    (appliedFilters.date === '' || reportDate === appliedFilters.date) &&
                    modifiedFilter
                );
            })
            .sort((a, b) => {
                const aIsModified = !!a.modifiedAt;
                const bIsModified = !!b.modifiedAt;

                if (aIsModified && !bIsModified) {
                    return 1;
                }
                if (!aIsModified && bIsModified) {
                    return -1;
                }
                
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }, [reports, appliedFilters]);

    const paginatedReports = useMemo(() => {
        const startIndex = (currentPage - 1) * REPORTS_PER_PAGE;
        return filteredReports.slice(startIndex, startIndex + REPORTS_PER_PAGE);
    }, [filteredReports, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredReports.length / REPORTS_PER_PAGE);
    }, [filteredReports]);

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Use lightweight mode for faster initial loading
                const response = await fetch(`/api/reports?lightweight=true&limit=${INITIAL_LOAD_LIMIT}`, {
                    headers: {
                        'Cache-Control': 'max-age=30', // Reduced cache time for fresher data
                        'Accept': 'application/json',
                    }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Gagal memuat data. Status: ${response.status}. Pesan: ${errorText || 'Tidak ada pesan error dari server.'}`);
                }
                const data = await response.json();
                const cleanedData = Array.isArray(data) ? data.filter(r => r && r.id) : [];

                // Process data in smaller chunks for better performance
                const processedReports = [];
                const chunkSize = CHUNK_SIZE; // Use optimized chunk size from constants

                for (let i = 0; i < cleanedData.length; i += chunkSize) {
                    const chunk = cleanedData.slice(i, i + chunkSize);
                    const processedChunk = chunk.map(r => ({
                        ...r,
                        createdAt: new Date(r.createdAt),
                        modifiedAt: r.modifiedAt ? new Date(r.modifiedAt) : null
                    }));
                    processedReports.push(...processedChunk);

                    // No delay for super fast processing
                    // Removed micro-delay for maximum speed
                }

                setReports(processedReports);
                setIsListVisible(true); // Ensure cards are visible after data loads
            } catch (err) {
                console.error("Fetch error:", err);
                // Prevent unhandled promise rejection
                setError(err.message || 'Gagal memuat data');
                setIsListVisible(true); // Show error state even if loading fails
            } finally {
                setIsLoading(false);
            }
        };

        // Wrap in try-catch to prevent unhandled promise rejection
        fetchReports().catch(error => {
            console.warn('Unhandled error in fetchReports:', error);
            setError('Gagal memuat data');
            setIsLoading(false);
            setIsListVisible(true); // Ensure visibility even on error
        });
    }, []);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setIsListVisible(false);
        setTimeout(() => {
            setCurrentPage(newPage);
            setIsListVisible(true);
        }, 300);
    };

    const handleReportSelectionChange = (reportId) => {
        setSelectedReportIds(prevSelected =>
            prevSelected.includes(reportId)
                ? prevSelected.filter(id => id !== reportId)
                : [...prevSelected, reportId]
        );
    };
    
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allFilteredIds = filteredReports.map(r => r.id);
            setSelectedReportIds(allFilteredIds);
        } else {
            setSelectedReportIds([]);
        }
    };

    const handleLoadReport = async (report) => {
        try {
            // Jika gridData tidak ada (lightweight mode), fetch full data dengan optimasi
            if (!report.gridData) {
                // Tampilkan loading state minimal untuk UX yang lebih baik
                const loadingTimeout = setTimeout(() => {
                    // Hanya tampilkan loading jika request memakan waktu > 100ms
                }, 100);
                
                const response = await fetch(`/api/reports?id=${report.id}`, {
                    headers: {
                        'Cache-Control': 'max-age=60', // Cache individual report
                        'Accept': 'application/json',
                    }
                });
                
                clearTimeout(loadingTimeout);
                
                if (!response.ok) {
                    throw new Error('Gagal memuat data lengkap laporan');
                }
                const fullReport = await response.json();
                const fullReportData = { 
                    ...fullReport, 
                    gridData: typeof fullReport.gridData === 'string' ? JSON.parse(fullReport.gridData) : fullReport.gridData 
                };
                // Langsung panggil tanpa delay
                onViewReport(fullReportData);
            } else {
                // Untuk data yang sudah ada, langsung proses tanpa delay
                const fullReportData = { 
                    ...report, 
                    gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData 
                };
                // Langsung panggil tanpa delay
                onViewReport(fullReportData);
            }
        } catch (error) {
            console.error('Error loading report:', error);
            setAlertModal({ 
                isOpen: true, 
                message: `Gagal memuat laporan: ${error.message}`, 
                type: 'error' 
            });
        }
    };

    const openExportModal = () => {
        exportCancelledRef.current = false;
        setIsExportModalOpen(true);
    };
    
    const handleExportSelectedToZip = async () => {
        openExportModal();
        await sleep(50);
        setIsExporting(true);
        try {
            if (typeof window === 'undefined' || !window.JSZip || !window.saveAs || !window.XLSX) {
                throw new Error("Pustaka ekspor tidak termuat.");
            }

            const reportsToExport = reports.filter(report => selectedReportIds.includes(report.id));

            if (reportsToExport.length === 0) {
                setAlertModal({ isOpen: true, message: 'Tidak ada laporan yang dipilih untuk diekspor.', type: 'warning' });
                return;
            }
            
            const zip = new window.JSZip();

            // Collect all image URLs from all reports for bulk download
            const allImageUrls = [];
            const imageUrlMappings = [];

            for (const report of reportsToExport) {
                const surveyor = (report.surveyorName || 'TanpaNama').replace(/[\/\\?%*:|"<>]/g, '');
                const power = (report.lampPower || '0W').replace('W', '');
                const voltage = (report.initialVoltage || '0V').replace('V', '');
                const height = (report.poleHeight || '0M').replace(' Meter', '');
                const date = new Date(report.projectDate).toISOString().slice(0, 10);
                const folderName = `${surveyor}_${power}W_${voltage}V_${height}M`;
                const reportFolder = zip.folder(folderName);
                if (!reportFolder) throw new Error(`Gagal membuat folder: ${folderName}`);
                const imageFolder = reportFolder.folder("Foto");
                if (!imageFolder) throw new Error(`Gagal membuat sub-folder 'Foto'`);

                // Create documentation photos folder
                const documentationFolder = reportFolder.folder("Foto Dokumentasi");
                if (!documentationFolder) throw new Error(`Gagal membuat sub-folder 'Foto Dokumentasi'`);

                const parsedGridData = typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData;
                const reportDetails = { surveyorName: report.surveyorName, lampPower: report.lampPower, poleHeight: report.poleHeight, initialVoltage: report.initialVoltage, stats: report.stats };
                const projectInfo = { title: report.projectTitle, location: report.projectLocation, date: report.projectDate };

                const workbook = convertGridToXLSX(parsedGridData, projectInfo, reportDetails);
                const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const excelFilename = `Laporan ${surveyor}_${power}W_${voltage}V_${height}M_${date}.xlsx`;
                reportFolder.file(excelFilename, xlsxData);

                // Collect grid images for bulk download
                for (let rowIndex = 0; rowIndex < parsedGridData.length; rowIndex++) {
                    const row = parsedGridData[rowIndex];
                    for (let colIndex = 0; colIndex < row.length; colIndex++) {
                        const cell = row[colIndex];
                        if (cell.image && cell.timestamp) {
                            const timestampDate = new Date(cell.timestamp);
                            const timeString = `${timestampDate.getHours().toString().padStart(2, '0')}${timestampDate.getMinutes().toString().padStart(2, '0')}${timestampDate.getSeconds().toString().padStart(2, '0')}`;
                            const imageName = `${rowIndex + 1}.${colIndex + 1}_${surveyor}_${power}W_${voltage}V_${height}M_${timeString}.webp`;
                            
                            if (cell.image.startsWith('data:')) {
                                // It's a data URL, extract base64 directly
                                const base64Data = cell.image.split(',')[1];
                                imageFolder.file(imageName, base64Data, { base64: true });
                            } else {
                                // It's a Firebase Storage URL, add to bulk download list
                                allImageUrls.push(cell.image);
                                imageUrlMappings.push({
                                    url: cell.image,
                                    folder: imageFolder,
                                    filename: imageName,
                                    type: 'grid'
                                });
                            }
                        }
                    }
                }

                // Collect documentation photos for bulk download
                if (report.documentationPhotos && Object.keys(report.documentationPhotos).length > 0) {
                    const photoTypeLabels = {
                        fotoPetugas: 'Foto_Petugas',
                        fotoPengujian: 'Foto_Full_Lapangan_Pada_Saat_Pengujian',
                        fotoLapangan: 'Foto_Full_Lapangan',
                        fotoLampuSebelumNaik: 'Foto_Lampu_Sebelum_Naik',
                        fotoTinggiTiang: 'Foto_Lampu_Dengan_Tinggi_Yang_Ditentukan'
                    };

                    for (const [photoType, photoUrl] of Object.entries(report.documentationPhotos)) {
                        if (photoUrl) {
                            const photoLabel = photoTypeLabels[photoType] || photoType;
                            const docImageName = `${photoLabel}_${surveyor}_${power}W_${voltage}V_${height}M.webp`;
                            allImageUrls.push(photoUrl);
                            imageUrlMappings.push({
                                url: photoUrl,
                                folder: documentationFolder,
                                filename: docImageName,
                                type: 'documentation'
                            });
                        }
                    }
                }
            }

            // Optimized parallel bulk download with chunking
            if (allImageUrls.length > 0) {
                try {
                    // Process images in chunks for better performance
                    const chunkSize = 50; // Process 50 images at a time
                    const chunks = [];
                    for (let i = 0; i < allImageUrls.length; i += chunkSize) {
                        chunks.push({
                            urls: allImageUrls.slice(i, i + chunkSize),
                            mappings: imageUrlMappings.slice(i, i + chunkSize)
                        });
                    }

                    // Process chunks in parallel with limited concurrency
                    const maxConcurrency = 3; // Process max 3 chunks simultaneously
                    for (let i = 0; i < chunks.length; i += maxConcurrency) {
                        const currentChunks = chunks.slice(i, i + maxConcurrency);
                        
                        await Promise.allSettled(currentChunks.map(async (chunk) => {
                            try {
                                const response = await fetch('/api/bulk-download', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ imageUrls: chunk.urls }),
                                });

                                if (response.ok) {
                                    const bulkData = await response.json();
                                    if (bulkData.success) {
                                        bulkData.results.forEach((result, index) => {
                                            if (result.success && chunk.mappings[index]) {
                                                const mapping = chunk.mappings[index];
                                                mapping.folder.file(mapping.filename, result.base64Data, { base64: true });
                                            }
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error in chunk download:', error);
                                // Skip failed chunks to avoid blocking entire export
                            }
                        }));
                        
                        // Small delay between chunk batches to prevent overwhelming the server
                        if (i + maxConcurrency < chunks.length) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                } catch (error) {
                    console.error('Error in optimized bulk download:', error);
                }
            }

            // Generate ZIP with fast compression
            const zipBlob = await zip.generateAsync({ 
                type: "blob", 
                compression: "DEFLATE",
                compressionOptions: { level: 1 } // Fast compression
            });
            window.saveAs(zipBlob, `Laporan_Terpilih_${new Date().toISOString().slice(0, 10)}.zip`);
            setIsExportModalOpen(false);
            
            setAlertModal({ isOpen: true, message: `${reportsToExport.length} laporan berhasil di-export!`, type: 'success' });
        } catch (error) {
            console.error("Error exporting reports:", error);
            setAlertModal({ isOpen: true, message: `Gagal mengekspor laporan: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
            setIsBulkSelectionMode(false);
            setSelectedReportIds([]);
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col"> 
            <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} message={alertModal.message} type={alertModal.type} />
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
                <header className="pb-6 mb-6 border-b border-gray-200 flex-shrink-0"> 
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Panel Admin</h1>
                            <p className="mt-1 text-gray-600">Pilih, kelola, dan ekspor laporan yang tersimpan.</p>
                        </div>
                        {/* Modern Admin Greeting Card */}
                        <div className="flex flex-col items-end space-y-3 mt-4 sm:mt-0">
                            {loggedInAdminName && (
                                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-3 flex items-center gap-3 hover:shadow-xl transition-all duration-300">
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                                            <User size={16} className="text-white" />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Admin Panel</div>
                                        <div className="text-sm font-bold text-gray-800">{loggedInAdminName}</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center space-x-3 flex-wrap gap-2">
                                {isBulkSelectionMode ? (
                                    <>
                                        <button 
                                            onClick={handleExportSelectedToZip} 
                                            disabled={isLoading || isExporting || selectedReportIds.length === 0}
                                            className="flex items-center text-sm px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none">
                                            <Archive size={16} className="mr-2" />
                                            {isExporting ? 'Mengekspor...' : `Export (${selectedReportIds.length}) Terpilih`}
                                        </button>
                                        <button
                                            onClick={() => setIsBulkDeleteConfirmOpen(true)}
                                            disabled={isLoading || selectedReportIds.length === 0}
                                            className="flex items-center text-sm px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none">
                                            <Trash2 size={16} className="mr-2" />
                                            Hapus ({selectedReportIds.length}) Terpilih
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsBulkSelectionMode(false);
                                                setSelectedReportIds([]);
                                            }}
                                            className="flex items-center text-sm px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                                            <X size={16} className="mr-2" />
                                            Batalkan Pilihan
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={onRegisterClick}
                                            className="flex items-center text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                                            <UserPlus size={16} className="mr-2" />
                                            Daftar Pengguna Baru
                                        </button>
                                        <button
                                            onClick={() => setIsUserInfoModalOpen(true)}
                                            className="flex items-center text-sm px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-violet-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                                            <User size={16} className="mr-2" />
                                            Info User
                                        </button>
                                        <button
                                            onClick={() => setIsBulkSelectionMode(true)}
                                            className="flex items-center text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                                            <PlusCircle size={16} className="mr-2" />
                                            Pilih Data
                                        </button>
                                        <button 
                                            onClick={onLogout} 
                                            className="flex items-center text-sm px-4 py-2 bg-white border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                                            <LogOut size={16} className="mr-2" />
                                            Logout
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
                
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex-shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
                            <label className="text-xs font-semibold text-gray-500 px-1">Judul / Lokasi</label>
                            <input type="text" name="title" placeholder="Cari judul atau lokasi..." value={filters.title} onChange={handleFilterChange} className="w-full p-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Petugas</label>
                            <input type="text" name="surveyor" placeholder="Cari petugas..." value={filters.surveyor} onChange={handleFilterChange} className="w-full p-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Tanggal</label>
                            <input type="date" name="date" value={filters.date} onChange={handleFilterChange} className="w-full p-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Status</label>
                            <select name="modified" value={filters.modified} onChange={handleFilterChange} className="w-full p-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="all">Semua</option>
                                <option value="modified">Modified</option>
                                <option value="unmodified">No Modified</option>
                            </select>
                        </div>
                        <div className="flex flex-col sm:flex-row col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-1 gap-3">
                            <button onClick={handleSearchClick} className="w-full flex items-center justify-center text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all">
                                <Search size={16} className="mr-2"/> Cari
                            </button>
                            <button onClick={handleResetFilters} className="w-full flex items-center justify-center text-sm px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                                <XCircleIcon size={16} className="mr-2"/> Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full"><RotateCw className="w-8 h-8 animate-spin text-blue-600" /><p className="mt-4 text-gray-500">Memuat data laporan...</p></div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full bg-red-50 rounded-lg p-8 text-center">
                            <XCircleIcon className="w-12 h-12 text-red-500"/>
                            <p className="mt-4 font-semibold text-red-700">Gagal Memuat Laporan</p>
                            <p className="text-sm text-red-600 mt-2">Terjadi kesalahan saat menghubungi server. Mohon periksa koneksi Anda dan coba lagi.</p>
                            <p className="text-xs text-gray-500 mt-4 bg-gray-100 p-2 rounded">Detail: {error}</p>
                        </div>
                    ) : (
                        <div ref={listRef} className={`transition-opacity duration-500 ${isListVisible ? 'opacity-100' : 'opacity-0'} h-full flex flex-col`}>
                            {isBulkSelectionMode && filteredReports.length > 0 && (
                                <div className="mb-4 flex items-center flex-shrink-0">
                                    <ModernCheckbox
                                        id="select-all"
                                        checked={selectedReportIds.length === filteredReports.length && filteredReports.length > 0}
                                        onChange={handleSelectAll}
                                        label={`Pilih Semua (${selectedReportIds.length} / ${filteredReports.length} dipilih)`}
                                    />
                                </div>
                            )}
                            {paginatedReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg flex-1">
                                    <Search className="w-12 h-12 text-gray-400"/>
                                    <p className="mt-4 font-semibold text-gray-600">Tidak Ada Laporan</p>
                                    <p className="text-sm text-gray-500">Tidak ada laporan yang cocok dengan filter Anda.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                                        {paginatedReports.map((report, index) => (
                                            <ReportCard
                                                key={report.id}
                                                report={report}
                                                index={index}
                                                isListVisible={isListVisible}
                                                isBulkSelectionMode={isBulkSelectionMode}
                                                isSelected={selectedReportIds.includes(report.id)}
                                                onSelectionChange={handleReportSelectionChange}
                                                onViewReport={handleLoadReport}
                                                onEditReport={onEditReport}
                                                onDeleteReport={setReportToDelete}
                                            />
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmationModal 
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={handleDeleteReport}
                title="Hapus Laporan?"
                message={`Anda yakin ingin menghapus laporan "${reportToDelete?.projectTitle || 'ini'}" secara permanen?`}
                confirmText="Ya, Hapus"
            />
            <ConfirmationModal 
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={handleBulkDeleteReports}
                title={`Hapus ${selectedReportIds.length} Laporan?`}
                message="Anda yakin ingin menghapus laporan-laporan yang dipilih secara permanen? Aksi ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus Semua"
            />
            {/* Loading overlay during export */}
            <FullscreenLoading isOpen={isExportModalOpen} onCancel={() => setIsExportModalOpen(false)} message="Sedang mengekspor…" />
            
            {/* User Info Modal */}
            <UserInfoModal 
                isOpen={isUserInfoModalOpen}
                onClose={() => setIsUserInfoModalOpen(false)}
            />
        </div>
    );
};

// ReportCard Component
const ReportCard = React.memo(({ report, index, isListVisible, isBulkSelectionMode, isSelected, onSelectionChange, onViewReport, onEditReport, onDeleteReport }) => {
    const [isActive, setIsActive] = useState(false);

    const handleCardClick = () => {
        if (isBulkSelectionMode) {
            onSelectionChange(report.id);
        } else {
            if (window.innerWidth < 1024) {
                setIsActive(prev => !prev);
            }
        }
    };
    
    return (
        <div
            className={`group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform lg:hover:z-20 ${isListVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${isBulkSelectionMode ? 'cursor-pointer' : ''}`}
            style={{ transitionDelay: `${index * 50}ms`}}
            onClick={handleCardClick}
        >
            {report.modifiedAt && (
                <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                        <Edit size={12} />
                        <span>Modified</span>
                        {report.modifiedBy && (
                            <span className="text-[10px] font-normal italic ml-1">by {report.modifiedBy}</span>
                        )}
                    </div>
                </div>
            )}
            {isBulkSelectionMode && (
                <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <ModernCheckbox
                        id={`report-${report.id}`}
                        checked={isSelected}
                        onChange={() => onSelectionChange(report.id)}
                    />
                </div>
            )}
            <div className={`p-6 ${isBulkSelectionMode ? 'pt-12' : ''} pb-16`}>
                <h2 className="text-lg font-bold text-gray-800 truncate" title={report.projectTitle}>{report.projectTitle || 'Tanpa Judul'}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <CustomCalendarIcon size={14} />
                        <span>{new Date(report.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{new Date(report.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400 flex-shrink-0" /><span className="truncate" title={report.projectLocation}>{report.projectLocation || 'Tanpa Lokasi'}</span></div>
                    <div className="flex items-center gap-2"><SurveyorIcon size={14} className="text-gray-400 flex-shrink-0"/><span>{report.surveyorName || 'Tanpa Nama'}</span></div>
                    <div className="flex items-center gap-2"><Lightbulb size={14} className="text-yellow-500 flex-shrink-0"/><span>{report.lampPower || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><LampPostIcon size={14} className="text-blue-500 flex-shrink-0"/><span>{report.poleHeight || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><Zap size={14} className="text-orange-500 flex-shrink-0"/><span>{report.initialVoltage || 'N/A'}</span></div>
                </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-sm rounded-b-xl flex space-x-2 transition-all duration-300 ease-in-out
                ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}
                lg:opacity-0 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:pointer-events-auto`}>
                <button onClick={(e) => { e.stopPropagation(); onViewReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-green-100 text-green-800 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors"><Eye size={16} className="mr-2"/> Lihat</button>
                <button onClick={(e) => { e.stopPropagation(); onEditReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"><Edit size={16} className="mr-2"/> Edit</button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-red-100 text-red-800 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"><Trash2 size={16} className="mr-2"/> Hapus</button>
            </div>
        </div>
    );
});

ReportCard.displayName = 'ReportCard';

// Custom Icon Components
const CustomCalendarIcon = ({ size = 16, className = "" }) => (
    <Calendar size={size} className={className} />
);

const SurveyorIcon = ({ size = 16, className = "" }) => (
    <User size={size} className={className} />
);

const LampPostIcon = ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v20"/>
        <path d="M8 6h8"/>
        <path d="M8 10h8"/>
        <circle cx="12" cy="14" r="4"/>
    </svg>
);

export default AdminPage;

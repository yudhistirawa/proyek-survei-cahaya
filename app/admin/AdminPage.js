"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Archive, Trash2, X, PlusCircle, Search, ChevronLeft, RotateCw, XCircle as XCircleIcon, Edit, Eye, Check, MapPin, Clock, Lightbulb, Zap } from 'lucide-react';
import { AlertModal } from '../components/modals/AlertModal';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { ModernCheckbox } from '../components/ModernCheckbox';
import SurveyorMapsPage from '../components/admin/SurveyorMapsPage';

const REPORTS_PER_PAGE = 9;

const ReportCard = ({ report, index, isListVisible, isBulkSelectionMode, isSelected, onSelectionChange, onViewReport, onEditReport, onDeleteReport }) => {
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
            className={`group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-200 transform lg:hover:z-20 ${isBulkSelectionMode ? 'cursor-pointer' : ''}`}
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
                        <Clock size={14} />
                        <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{report.createdAt ? new Date(report.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400 flex-shrink-0" /><span className="truncate" title={report.projectLocation}>{report.projectLocation || 'Tanpa Lokasi'}</span></div>
                    <div className="flex items-center gap-2"><span className="text-gray-400 flex-shrink-0">👤</span><span>{report.surveyorName || 'Tanpa Nama'}</span></div>
                    <div className="flex items-center gap-2"><Lightbulb size={14} className="text-yellow-500 flex-shrink-0"/><span>{report.lampPower || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><span className="text-blue-500 flex-shrink-0">📏</span><span>{report.poleHeight || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><Zap size={14} className="text-orange-500 flex-shrink-0"/><span>{report.initialVoltage || 'N/A'}</span></div>
                </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-sm rounded-b-xl flex space-x-2 transition-all duration-200 ease-in-out
                ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}
                lg:opacity-0 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:pointer-events-auto`}>
                <button onClick={(e) => { e.stopPropagation(); onViewReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-green-100 text-green-800 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors"><Eye size={16} className="mr-2"/> Lihat</button>
                <button onClick={(e) => { e.stopPropagation(); onEditReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"><Edit size={16} className="mr-2"/> Edit</button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteReport(report); }} className="flex-1 flex items-center justify-center py-2 px-3 bg-red-100 text-red-800 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"><Trash2 size={16} className="mr-2"/> Hapus</button>
            </div>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfPages = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(currentPage - halfPages, 1);
    let endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(endPage - maxPagesToShow + 1, 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <nav className="flex items-center justify-between mt-6" aria-label="Pagination">
            <div className="flex-1 flex justify-between sm:justify-end">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Sebelumnya
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Berikutnya
                    <ChevronLeft className="h-5 w-5 ml-2 rotate-180" />
                </button>
            </div>
        </nav>
    );
};

const AdminPage = ({ onBack, onViewReport, onEditReport, loggedInAdminName }) => {
    // Handle missing props for standalone admin page
    const handleViewReport = (report) => {
        if (onViewReport) {
            onViewReport(report);
        } else if (report?.id) {
            // Redirect to homepage grid with query params so Home can load it
            const url = `/?reportId=${encodeURIComponent(report.id)}&adminMode=view`;
            window.location.href = url;
        } else {
            alert('ID laporan tidak ditemukan.');
        }
    };

    const handleEditReport = (report) => {
        if (onEditReport) {
            onEditReport(report);
        } else if (report?.id) {
            const url = `/?reportId=${encodeURIComponent(report.id)}&adminMode=edit`;
            window.location.href = url;
        } else {
            alert('ID laporan tidak ditemukan.');
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            // Default behavior: go back in history or to home
            window.history.back();
        }
    };
    // Toggle untuk halaman Maps Surveyor (harus di dalam komponen React)
    const [showSurveyorMaps, setShowSurveyorMaps] = useState(false);
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    
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

    const initialFilters = { title: '', location: '', surveyor: '', date: '', modified: 'all' };
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    const [currentPage, setCurrentPage] = useState(1);
    const [isListVisible, setIsListVisible] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    
    const [selectedReportIds, setSelectedReportIds] = useState([]);
    const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

    const listRef = useRef(null);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchClick = () => {
        // Perbaikan: Tidak perlu hide/show list lagi, langsung terapkan filter
        setCurrentPage(1);
        setAppliedFilters(filters);
    };

    const handleResetFilters = () => {
        // Perbaikan: Reset filter dan tampilkan semua data
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
        setCurrentPage(1);
    };

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
                const reportDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-CA') : '';
                const isModified = !!report.modifiedAt;
                const modifiedFilter = appliedFilters.modified === 'all' || 
                                       (appliedFilters.modified === 'modified' && isModified) || 
                                       (appliedFilters.modified === 'unmodified' && !isModified);
                
                // Perbaikan: Pastikan filter bekerja dengan benar untuk semua kondisi
                const titleMatch = !appliedFilters.title || 
                    (report.projectTitle && report.projectTitle.toLowerCase().includes(appliedFilters.title.toLowerCase()));
                const locationMatch = !appliedFilters.location || 
                    (report.projectLocation && report.projectLocation.toLowerCase().includes(appliedFilters.location.toLowerCase()));
                const surveyorMatch = !appliedFilters.surveyor || 
                    (report.surveyorName && report.surveyorName.toLowerCase().includes(appliedFilters.surveyor.toLowerCase()));
                const dateMatch = !appliedFilters.date || reportDate === appliedFilters.date;
                
                return titleMatch && locationMatch && surveyorMatch && dateMatch && modifiedFilter;
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
            console.log('=== AdminPage: Starting to fetch reports ===');
            setIsLoading(true);
            setError(null);
            setIsListVisible(true); // ✅ Show cards immediately
            try {
                console.log('Fetching reports from API...');
                const response = await fetch('/api/reports');
                console.log('API Response status:', response.status);
                console.log('API Response headers:', response.headers);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error response:', errorText);
                    throw new Error(`Gagal memuat data. Status: ${response.status}. Pesan: ${errorText || 'Tidak ada pesan error dari server.'}`);
                }
                
                const data = await response.json();
                console.log('API Response data type:', typeof data);
                console.log('API Response data length:', Array.isArray(data) ? data.length : 'Not an array');
                console.log('API Response data:', data);
                
                // Perbaikan: Pastikan data adalah array dan setiap item memiliki ID
                const cleanedData = Array.isArray(data) ? data.filter(r => r && r.id) : [];
                console.log('Cleaned data length:', cleanedData.length, 'reports');
                console.log('Cleaned data sample:', cleanedData.slice(0, 2));
                
                // Perbaikan: Pastikan tanggal diproses dengan benar
                const processedData = cleanedData.map(r => ({
                    ...r, 
                    createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                    modifiedAt: r.modifiedAt ? new Date(r.modifiedAt) : null
                }));
                
                console.log('Processed data length:', processedData.length);
                console.log('Processed data sample:', processedData.slice(0, 2));
                
                setReports(processedData);
                console.log('Reports set successfully:', processedData.length);
                console.log('=== AdminPage: Fetch reports completed successfully ===');
            } catch (err) {
                console.error("=== AdminPage: Fetch error ===");
                console.error("Fetch error:", err);
                console.error("Error message:", err.message);
                console.error("Error stack:", err.stack);
                setError(err.message || 'Terjadi kesalahan saat mengambil data.');
            } finally {
                setIsLoading(false);
                // Perbaikan: Langsung set visible tanpa delay
                setIsListVisible(true);
                console.log('=== AdminPage: Loading completed, list visible set to true ===');
            }
        };
        fetchReports();
    }, []);

    // Perbaikan: Tambahkan useEffect untuk memastikan list selalu visible setelah data dimuat
    useEffect(() => {
        if (reports.length > 0 && !isLoading) {
            setIsListVisible(true);
        }
    }, [reports, isLoading]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        // Perbaikan: Langsung ganti halaman tanpa delay
        setCurrentPage(newPage);
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

    const handleLoadReport = (report) => {
        const fullReportData = { ...report, gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData };
        handleViewReport(fullReportData);
    };

    // Jika admin memilih melihat peta rute surveyor, tampilkan halaman khusus
    if (showSurveyorMaps) {
        return (
            <SurveyorMapsPage
                onBack={() => setShowSurveyorMaps(false)}
                defaultFilterStatus="completed"
            />
        );
    }

    return (
        <div
            className="w-full min-h-[100svh] bg-gray-50 px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 flex flex-col overflow-x-hidden"
            style={{
                paddingTop: 'max(env(safe-area-inset-top), 0px)',
                paddingLeft: 'max(env(safe-area-inset-left), 0px)',
                paddingRight: 'max(env(safe-area-inset-right), 0px)'
            }}
        > 
            <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} message={alertModal.message} type={alertModal.type} />
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
                <header className="pb-6 mb-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Panel Admin</h1>
                            <p className="mt-1 text-gray-600">Pilih, kelola, dan ekspor laporan yang tersimpan.</p>
                        </div>
                        <div className="flex flex-col items-end space-y-2 mt-4 sm:mt-0">
                            {loggedInAdminName && (
                                <span className="text-sm font-semibold text-gray-700">
                                    Hello {loggedInAdminName}
                                </span>
                            )}
                            <button
                                onClick={() => setShowSurveyorMaps(true)}
                                className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
                                title="Lihat pergerakan petugas di peta"
                            >
                                <MapPin size={16}/> Maps Surveyor
                            </button>
                        </div>
                    </div>
                </header>
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex-shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
                            <label className="text-xs font-semibold text-gray-500 px-1">Judul / Lokasi</label>
                            <input type="text" name="title" placeholder="Cari judul atau lokasi..." value={filters.title} onChange={handleFilterChange} className="w-full p-2 min-h-[44px] mt-1 border border-gray-300 rounded-lg text-sm sm:text-base text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Petugas</label>
                            <input type="text" name="surveyor" placeholder="Cari petugas..." value={filters.surveyor} onChange={handleFilterChange} className="w-full p-2 min-h-[44px] mt-1 border border-gray-300 rounded-lg text-sm sm:text-base text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Tanggal</label>
                            <input type="date" name="date" value={filters.date} onChange={handleFilterChange} className="w-full p-2 min-h-[44px] mt-1 border border-gray-300 rounded-lg text-sm sm:text-base text-black focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 px-1">Status</label>
                            <select name="modified" value={filters.modified} onChange={handleFilterChange} className="w-full p-2 min-h-[44px] mt-1 border border-gray-300 rounded-lg text-sm sm:text-base text-black focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="all">Semua</option>
                                <option value="modified">Modified</option>
                                <option value="unmodified">No Modified</option>
                            </select>
                        </div>
                        <div className="flex flex-col sm:flex-row col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-1 gap-3">
                            <button onClick={handleSearchClick} className="w-full flex items-center justify-center text-sm px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all">
                                <Search size={16} className="mr-2"/> Cari
                            </button>
                            <button onClick={handleResetFilters} className="w-full flex items-center justify-center text-sm px-4 py-2 min-h-[44px] bg-white text-gray-800 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                                <XCircleIcon size={16} className="mr-2"/> Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="mt-4 text-gray-500">Memuat data laporan...</p>
                            <p className="text-sm text-gray-400 mt-2">Mohon tunggu sebentar</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full bg-red-50 rounded-lg p-8 text-center">
                            <XCircleIcon className="w-12 h-12 text-red-500"/>
                            <p className="mt-4 font-semibold text-red-700">Gagal Memuat Laporan</p>
                            <p className="text-sm text-red-600 mt-2">Terjadi kesalahan saat menghubungi server. Mohon periksa koneksi Anda dan coba lagi.</p>
                            <p className="text-xs text-gray-500 mt-4 bg-gray-100 p-2 rounded">Detail: {error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div ref={listRef} className={`transition-opacity duration-300 ${isListVisible ? 'opacity-100' : 'opacity-0'} h-full flex flex-col`}>
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
                                    <p className="text-sm text-gray-500">
                                        {reports.length === 0 
                                            ? 'Belum ada laporan yang tersimpan di database.' 
                                            : 'Tidak ada laporan yang cocok dengan filter Anda.'}
                                    </p>
                                    {reports.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Total laporan: {reports.length} | Filtered: {filteredReports.length}
                                        </p>
                                    )}
                                    {reports.length === 0 && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Silakan buat laporan baru melalui aplikasi surveyor.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 text-sm text-gray-600">
                                        Menampilkan {paginatedReports.length} dari {filteredReports.length} laporan 
                                        {reports.length !== filteredReports.length && ` (Total: ${reports.length})`}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                                        {paginatedReports.map((report, index) => (
                                            <ReportCard
                                                key={report.id}
                                                report={report}
                                                index={index}
                                                isListVisible={true} // Perbaikan: Selalu visible
                                                isBulkSelectionMode={isBulkSelectionMode}
                                                isSelected={selectedReportIds.includes(report.id)}
                                                onSelectionChange={handleReportSelectionChange}
                                                onViewReport={handleLoadReport}
                                                onEditReport={handleEditReport}
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
        </div>
    );
};

export default AdminPage;

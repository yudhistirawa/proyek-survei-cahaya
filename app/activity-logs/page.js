"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const LOGS_PER_PAGE = 20;

const ActivityLogsPage = () => {
    const router = useRouter();

    // State for secret form inputs
    const [formData, setFormData] = useState({
        dayaLampu: 666,
        teganganAwal: 666,
        namaPetugas: 'admin',
        tinggiTiang: 10
    });

    // State to track if form is submitted and password verified
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Existing states for logs page
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        userType: '',
        action: '',
        startDate: '',
        endDate: '',
        userName: ''
    });
    const [appliedFilters, setAppliedFilters] = useState(filters);

    // Stats
    const [stats, setStats] = useState({
        totalToday: 0,
        adminActions: 0,
        petugasActions: 0,
        topActions: []
    });

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs();
        }
    }, [currentPage, appliedFilters, isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            calculateStats();
        }
    }, [logs, isAuthorized]);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({
                limit: LOGS_PER_PAGE.toString(),
                offset: ((currentPage - 1) * LOGS_PER_PAGE).toString(),
                ...appliedFilters
            });

            // Remove empty filters
            Object.keys(appliedFilters).forEach(key => {
                if (!appliedFilters[key]) {
                    params.delete(key);
                }
            });

            const response = await fetch(`/api/activity-logs?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch activity logs');
            }

            const data = await response.json();
            setLogs(data.logs);
            setTotalLogs(data.total);
            setHasMore(data.hasMore);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStats = () => {
        const today = new Date().toDateString();
        const todayLogs = logs.filter(log => 
            new Date(log.timestamp).toDateString() === today
        );

        const adminLogs = logs.filter(log => log.userType === 'admin');
        const petugasLogs = logs.filter(log => log.userType === 'petugas');

        // Count actions
        const actionCounts = {};
        logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        });

        const topActions = Object.entries(actionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([action, count]) => ({ action, count }));

        setStats({
            totalToday: todayLogs.length,
            adminActions: adminLogs.length,
            petugasActions: petugasLogs.length,
            topActions
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        setAppliedFilters(filters);
    };

    const resetFilters = () => {
        const emptyFilters = {
            userType: '',
            action: '',
            startDate: '',
            endDate: '',
            userName: ''
        };
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setCurrentPage(1);
    };

    const exportLogs = async () => {
        try {
            // Fetch all logs for export
            const response = await fetch('/api/activity-logs?limit=10000');
            const data = await response.json();
            
            const csvContent = [
                ['Timestamp', 'User Name', 'User Type', 'Action', 'Details', 'IP Address', 'Device Type', 'Browser', 'OS'].join(','),
                ...data.logs.map(log => [
                    new Date(log.timestamp).toLocaleString('id-ID'),
                    log.userName,
                    log.userType,
                    log.action,
                    `"${log.details || ''}"`,
                    log.ipAddress,
                    log.deviceType,
                    log.browser,
                    log.os
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const deleteLog = async (logId, e) => {
        e.stopPropagation();
        
        const confirmed = window.confirm('Apakah Anda yakin ingin menghapus log aktivitas ini?');
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/activity-logs/${logId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete log');
            }

            await fetchLogs();
            alert('Log aktivitas berhasil dihapus');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus log aktivitas');
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'login': return '➡️';
            case 'logout': return '⬅️';
            case 'create_report': return '➕';
            case 'edit_report': return '✏️';
            case 'delete_report': return '🗑️';
            case 'export_report': return '⬇️';
            case 'view_report': return '👁️';
            default: return '📊';
        }
    };

    const getDeviceIcon = (deviceType) => {
        switch (deviceType) {
            case 'Mobile': return '📱';
            case 'Tablet': return '📟';
            case 'Desktop': return '💻';
            default: return '🌐';
        }
    };

    const formatAction = (action) => {
        const actionMap = {
            'login': 'Login',
            'logout': 'Logout',
            'create_report': 'Buat Laporan',
            'edit_report': 'Edit Laporan',
            'delete_report': 'Hapus Laporan',
            'export_report': 'Export Laporan',
            'view_report': 'Lihat Laporan'
        };
        return actionMap[action] || action;
    };

    const totalPages = Math.ceil(totalLogs / LOGS_PER_PAGE);

    // Handle form input changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submit
    const handleFormSubmit = (e) => {
        e.preventDefault();
        alert('handleFormSubmit dipanggil');
        const password = window.prompt('Masukkan password untuk membuka halaman log aktivitas:');
        if (password === 'wahanamultitron33a') {
            setIsAuthorized(true);
        } else {
            alert('Password salah. Akses ditolak.');
        }
    };

    if (!isAuthorized) {
        // Show secret form before showing logs page
        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <form 
                    onSubmit={handleFormSubmit} 
                    className="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
                >
                    <h2 className="text-2xl font-bold mb-4 text-center">Form Survey Rahasia</h2>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium" htmlFor="dayaLampu">Daya Lampu</label>
                        <input
                            type="number"
                            id="dayaLampu"
                            name="dayaLampu"
                            value={formData.dayaLampu}
                            onChange={handleFormChange}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium" htmlFor="teganganAwal">Tegangan Awal</label>
                        <input
                            type="number"
                            id="teganganAwal"
                            name="teganganAwal"
                            value={formData.teganganAwal}
                            onChange={handleFormChange}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium" htmlFor="namaPetugas">Nama Petugas</label>
                        <input
                            type="text"
                            id="namaPetugas"
                            name="namaPetugas"
                            value={formData.namaPetugas}
                            onChange={handleFormChange}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-1 font-medium" htmlFor="tinggiTiang">Tinggi Tiang (meter)</label>
                        <input
                            type="number"
                            id="tinggiTiang"
                            name="tinggiTiang"
                            value={formData.tinggiTiang}
                            onChange={handleFormChange}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        Mulai Survey
                    </button>
                </form>
            </div>
        );
    }

    // Render the existing activity logs page content
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <span className="text-blue-600">📊</span>
                                Log Aktivitas
                            </h1>
                            <p className="mt-2 text-gray-600">Monitor aktivitas admin dan petugas sistem</p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                            <button
                                onClick={exportLogs}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                ⬇️ Export CSV
                            </button>
                            <button
                                onClick={fetchLogs}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Aktivitas Hari Ini</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalToday}</p>
                            </div>
                            <span className="text-blue-500 text-2xl">📅</span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Aktivitas Admin</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.adminActions}</p>
                            </div>
                            <span className="text-purple-500 text-2xl">👑</span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Aktivitas Petugas</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.petugasActions}</p>
                            </div>
                            <span className="text-green-500 text-2xl">👤</span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Log</p>
                                <p className="text-2xl font-bold text-gray-900">{totalLogs}</p>
                            </div>
                            <span className="text-orange-500 text-2xl">📄</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-500">🔍</span>
                        <h3 className="text-lg font-semibold text-gray-900">Filter Log</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama User</label>
                            <input
                                type="text"
                                name="userName"
                                value={filters.userName}
                                onChange={handleFilterChange}
                                placeholder="Cari nama..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe User</label>
                            <select
                                name="userType"
                                value={filters.userType}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Semua</option>
                                <option value="admin">Admin</option>
                                <option value="petugas">Petugas</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aksi</label>
                            <select
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Semua</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="create_report">Buat Laporan</option>
                                <option value="edit_report">Edit Laporan</option>
                                <option value="delete_report">Hapus Laporan</option>
                                <option value="export_report">Export Laporan</option>
                                <option value="view_report">Lihat Laporan</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={applyFilters}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            🔍 Terapkan Filter
                        </button>
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            ❌ Reset
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Daftar Log Aktivitas</h3>
                    </div>
                    
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="text-2xl animate-spin">🔄</span>
                            <span className="ml-2 text-gray-600">Memuat log...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12 text-red-600">
                            <span>Error: {error}</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <span>Tidak ada log yang ditemukan</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                                Waktu
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                                                User
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                                Aksi
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                                                Detail
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                                IP Address
                                            </th>
                                            <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                                                Device
                                            </th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                Hapus
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {logs.map((log) => (
                                            <tr 
                                                key={log.id} 
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/activity-logs/${log.id}`)}
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400">🕐</span>
                                                        <div>
                                                            <div className="text-xs">{new Date(log.timestamp).toLocaleDateString('id-ID')}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-1">
                                                        <span className={log.userType === 'admin' ? 'text-purple-500' : 'text-green-500'}>
                                                            {log.userType === 'admin' ? '👑' : '👤'}
                                                        </span>
                                                        <div>
                                                            <div className="font-medium text-xs">{log.userName}</div>
                                                            <div className="text-xs text-gray-500 capitalize">{log.userType}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-1">
                                                        <span>{getActionIcon(log.action)}</span>
                                                        <span className="text-xs">{formatAction(log.action)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-900">
                                                    <div className="text-xs truncate max-w-48" title={log.details}>
                                                        {log.details || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-mono">
                                                    {log.ipAddress}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-1">
                                                        <span>{getDeviceIcon(log.deviceType)}</span>
                                                        <div>
                                                            <div className="text-xs">{log.deviceType}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-24">
                                                                {log.browser}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={(e) => deleteLog(log.id, e)}
                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                                        title="Hapus Log"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        Menampilkan {((currentPage - 1) * LOGS_PER_PAGE) + 1} - {Math.min(currentPage * LOGS_PER_PAGE, totalLogs)} dari {totalLogs} log
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            ◀️ Sebelumnya
                                        </button>
                                        <span className="px-3 py-2 text-sm font-medium text-gray-700">
                                            Halaman {currentPage} dari {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Berikutnya ▶️
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;

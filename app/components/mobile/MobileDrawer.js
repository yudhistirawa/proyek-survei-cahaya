import React, { useState, useEffect } from 'react';
import { X, Menu, Settings, BarChart3, Zap, Target, RefreshCw, Download, LogOut } from 'lucide-react';

const MobileDrawer = ({ 
    isOpen, 
    onClose, 
    selectedRoadType,
    setSelectedRoadType,
    selectedSpan,
    setSelectedSpan,
    gridRows,
    setGridRows,
    gridCols,
    setGridCols,
    onLoadDataPertama,
    onLoadDataKedua,
    onResetGrid,
    onAnalyzeData,
    gridStats,
    loadedData1,
    loadedData2,
    onLogout
}) => {
    const [activeTab, setActiveTab] = useState('setup');

    const roadTypes = [
        { value: 'arterial', label: 'Arterial', icon: '🛣️', description: 'Jalan utama dengan lalu lintas tinggi' },
        { value: 'collector', label: 'Kolektor', icon: '🚗', description: 'Jalan penghubung dengan lalu lintas sedang' },
        { value: 'local', label: 'Lokal', icon: '🏘️', description: 'Jalan lokal dengan lalu lintas rendah' },
        { value: 'lingkungan', label: 'Lingkungan', icon: '🏠', description: 'Jalan lingkungan dengan lalu lintas sangat rendah' }
    ];

    const spanOptions = Array.from({ length: 40 }, (_, i) => i + 30); // 30-69

    // Close drawer when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.mobile-drawer')) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="mobile-drawer fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 slide-in-left mobile-safe-area">
                {/* Header */}
                <div className="mobile-nav border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="mobile-nav-title">⚡ Kemerataan Sinar</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('setup')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            activeTab === 'setup' 
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <Settings className="w-4 h-4 mx-auto mb-1" />
                        Pengaturan
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            activeTab === 'data' 
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <BarChart3 className="w-4 h-4 mx-auto mb-1" />
                        Data
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            activeTab === 'stats' 
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <Target className="w-4 h-4 mx-auto mb-1" />
                        Statistik
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeTab === 'setup' && (
                        <>
                            {/* Road Type Selection */}
                            <div className="mobile-card">
                                <div className="mobile-card-header">
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        🛣️ Jenis Jalan
                                    </h3>
                                </div>
                                <div className="mobile-card-body space-y-3">
                                    {roadTypes.map((road) => (
                                        <button
                                            key={road.value}
                                            onClick={() => setSelectedRoadType(road.value)}
                                            className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                                                selectedRoadType === road.value
                                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{road.icon}</span>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800">{road.label}</div>
                                                    <div className="text-xs text-gray-600">{road.description}</div>
                                                </div>
                                                {selectedRoadType === road.value && (
                                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grid Configuration */}
                            <div className="mobile-card">
                                <div className="mobile-card-header">
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        📐 Konfigurasi Grid
                                    </h3>
                                </div>
                                <div className="mobile-card-body space-y-4">
                                    {/* Span Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Span (Tinggi Grid)
                                        </label>
                                        <select
                                            value={selectedSpan}
                                            onChange={(e) => setSelectedSpan(e.target.value)}
                                            className="mobile-select"
                                        >
                                            <option value="">Pilih Span</option>
                                            {spanOptions.map(span => (
                                                <option key={span} value={span}>{span}m</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom Grid Size */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tinggi Custom
                                            </label>
                                            <input
                                                type="number"
                                                value={gridRows}
                                                onChange={(e) => setGridRows(e.target.value)}
                                                placeholder="Baris"
                                                className="mobile-input"
                                                min="1"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Lebar Custom
                                            </label>
                                            <input
                                                type="number"
                                                value={gridCols}
                                                onChange={(e) => setGridCols(e.target.value)}
                                                placeholder="Kolom"
                                                className="mobile-input"
                                                min="1"
                                                max="50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'data' && (
                        <>
                            {/* Data Loading */}
                            <div className="mobile-card">
                                <div className="mobile-card-header">
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        📊 Muat Data
                                    </h3>
                                </div>
                                <div className="mobile-card-body space-y-3">
                                    <button
                                        onClick={() => onLoadDataPertama()}
                                        className="mobile-btn mobile-btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Muat Data Pertama
                                    </button>
                                    
                                    <button
                                        onClick={() => onLoadDataKedua()}
                                        className="mobile-btn mobile-btn-secondary w-full flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Muat Data Kedua
                                    </button>

                                    <button
                                        onClick={onResetGrid}
                                        className="mobile-btn mobile-btn-warning w-full flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Reset Grid
                                    </button>
                                </div>
                            </div>

                            {/* Loaded Data Info */}
                            {(loadedData1 || loadedData2) && (
                                <div className="mobile-card">
                                    <div className="mobile-card-header">
                                        <h3 className="font-semibold text-gray-800">📋 Data Dimuat</h3>
                                    </div>
                                    <div className="mobile-card-body space-y-2">
                                        {loadedData1 && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="text-sm font-medium text-green-800">Data Pertama</div>
                                                <div className="text-xs text-green-600">
                                                    {loadedData1.surveyorName} - {loadedData1.lampPower} - {loadedData1.poleHeight}
                                                </div>
                                            </div>
                                        )}
                                        {loadedData2 && (
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="text-sm font-medium text-blue-800">Data Kedua</div>
                                                <div className="text-xs text-blue-600">
                                                    {loadedData2.surveyorName} - {loadedData2.lampPower} - {loadedData2.poleHeight}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'stats' && (
                        <>
                            {/* Statistics */}
                            <div className="mobile-stats-card">
                                <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                    📈 Statistik Grid
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="mobile-stats-item">
                                        <div className="mobile-stats-value">{gridStats.lMin}</div>
                                        <div className="mobile-stats-label">L-Min</div>
                                    </div>
                                    <div className="mobile-stats-item">
                                        <div className="mobile-stats-value">{gridStats.lMax}</div>
                                        <div className="mobile-stats-label">L-Max</div>
                                    </div>
                                    <div className="mobile-stats-item">
                                        <div className="mobile-stats-value">{gridStats.lAvg}</div>
                                        <div className="mobile-stats-label">L-Avg</div>
                                    </div>
                                    <div className="mobile-stats-item">
                                        <div className="mobile-stats-value">{gridStats.uniformityRatio}</div>
                                        <div className="mobile-stats-label">Rasio</div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <div className="text-sm text-blue-600">
                                        Total Data: {gridStats.totalCells} sel
                                    </div>
                                </div>
                            </div>

                            {/* Analysis Button */}
                            {selectedRoadType && gridStats.totalCells > 0 && (
                                <button
                                    onClick={() => {
                                        onAnalyzeData();
                                        onClose();
                                    }}
                                    className="mobile-btn mobile-btn-success w-full flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    Analisis Data
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4">
                    <button
                        onClick={onLogout}
                        className="mobile-btn mobile-btn-danger w-full flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar
                    </button>
                </div>
            </div>
        </>
    );
};

export default MobileDrawer;

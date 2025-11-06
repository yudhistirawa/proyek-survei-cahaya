import React, { useState, useEffect, useCallback } from 'react';
import { Grid3X3, ChevronDown, Database, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { RoadIcon } from '../Icons';

// Global cache untuk data - load sekali di awal
let globalDataCache = null;
let globalDataPromise = null;

// Function untuk preload data sekali saja
const preloadGlobalData = async () => {
    if (globalDataCache) {
        return globalDataCache; // Return cached data
    }
    
    if (globalDataPromise) {
        return globalDataPromise; // Return ongoing promise
    }
    
    console.log('🚀 Preloading global data - ONCE ONLY');
    globalDataPromise = fetch('/api/reports?limit=100&lightweight=false')
        .then(res => {
            if (!res.ok) throw new Error('Gagal memuat data');
            return res.json();
        })
        .then(data => {
            // Filter dan cache data
            const filtered = data.filter(report => {
                const hasGridData = report.gridData && Array.isArray(report.gridData);
                return hasGridData;
            }).map(report => ({
                id: report.id,
                lampPower: report.lampPower || 'N/A',
                poleHeight: report.poleHeight || 'N/A',
                surveyorName: report.surveyorName || 'Unknown',
                gridData: report.gridData,
                modifiedAt: report.modifiedAt || report.createdAt
            }));
            
            globalDataCache = filtered;
            console.log('✅ Global data cached:', filtered.length, 'items');
            return filtered;
        })
        .catch(error => {
            console.error('❌ Error preloading global data:', error);
            globalDataPromise = null; // Reset promise on error
            throw error;
        });
    
    return globalDataPromise;
};

// Component untuk dropdown load data (OPTIMIZED - menggunakan global cache)
const LoadDataDropdown = React.memo(function LoadDataDropdown({ title, gridRows, gridCols, direction, onLoadData, color }) {
    const [isOpen, setIsOpen] = useState(false);
    const [modifiedData, setModifiedData] = useState([]);
    const [loading, setLoading] = useState(false);

    const colorClasses = {
        blue: {
            border: 'border-blue-300',
            bg: 'bg-blue-50',
            hover: 'hover:bg-blue-100',
            text: 'text-blue-800',
            icon: 'text-blue-600'
        },
        purple: {
            border: 'border-purple-300',
            bg: 'bg-purple-50',
            hover: 'hover:bg-purple-100',
            text: 'text-purple-800',
            icon: 'text-purple-600'
        }
    };

    const classes = colorClasses[color];
    const hasGridSize = gridRows && gridCols;

    useEffect(() => {
        if (isOpen && hasGridSize) {
            const loadCachedData = async () => {
                if (!hasGridSize) return;
                
                setLoading(true);
                try {
                    // Gunakan cached data - SUPER CEPAT!
                    const cachedData = await preloadGlobalData();
                    console.log('⚡ Using cached data - INSTANT LOAD!');
                    setModifiedData(cachedData);
                } catch (error) {
                    console.error('Error loading cached data:', error);
                    setModifiedData([]);
                } finally {
                    setLoading(false);
                }
            };
            loadCachedData();
        }
    }, [isOpen, hasGridSize]);



    const handleSelectData = useCallback((data) => {
        console.log('Selected data to load:', data);
        console.log('Data gridData exists:', !!data.gridData);
        
        if (onLoadData) {
            // Langsung kirim data ke parent tanpa delay
            onLoadData(data);
        }
        setIsOpen(false);
    }, [onLoadData]);

    const toggleDropdown = useCallback(() => {
        if (!hasGridSize) return;
        setIsOpen(!isOpen);
    }, [hasGridSize, isOpen]);

    // Loading state
    const isLoading = loading;

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                disabled={!hasGridSize}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${
                    hasGridSize
                        ? `${classes.border} ${classes.bg} ${classes.hover} ${classes.text}`
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
                <div className="flex items-center gap-3">
                    {direction === 'topToBottom' ? 
                        <ArrowDown size={18} className={hasGridSize ? classes.icon : 'text-gray-400'} /> :
                        <ArrowUp size={18} className={hasGridSize ? classes.icon : 'text-gray-400'} />
                    }
                    <span className="font-medium text-sm">{title}</span>
                </div>
                <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                        hasGridSize ? classes.icon : 'text-gray-400'
                    }`} 
                />
            </button>

            {isOpen && hasGridSize && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Memuat data...</p>
                        </div>
                    ) : modifiedData.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-sm text-gray-500">Tidak ada data modifikasi</p>
                            <p className="text-xs text-gray-400">untuk grid {gridRows}x{gridCols}</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                <p className="text-xs font-medium text-gray-700">
                                    {modifiedData.length} data tersedia:
                                </p>
                            </div>
                            {modifiedData.map((data) => (
                                <button
                                    key={data.id}
                                    onClick={() => handleSelectData(data)}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm text-gray-800">
                                                {data.lampPower} - {data.poleHeight?.replace('Meter', '').replace('meter', '').trim()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                oleh {data.surveyorName}
                                            </p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${classes.bg.replace('bg-', 'bg-').replace('-50', '-400')}`}></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

const UniformitySidebar = ({ 
    selectedRoadType, 
    setSelectedRoadType, 
    selectedSpan, 
    setSelectedSpan, 
    onStartGrid,
    onLoadDataPertama,
    onLoadDataKedua,
    onResetGrid,
    onAnalyzeData,
    gridStats,
    gridRows,
    setGridRows,
    gridCols,
    setGridCols,
    loadedData1,
    loadedData2
}) => {
    // Preload data saat komponen pertama kali dimuat
    useEffect(() => {
        console.log('🚀 Starting preload on component mount');
        preloadGlobalData().catch(error => {
            console.error('Failed to preload data:', error);
        });
    }, []); // Empty dependency array = run once on mount

    // Calculate dynamic height based on selected span
    const calculateSidebarHeight = () => {
        if (!selectedSpan) return 'min-h-screen';
        
        const span = parseInt(selectedSpan);
        const gridHeight = span * 60; // Each grid cell is 60px height
        const minHeight = Math.max(gridHeight + 200, 800); // Add padding + minimum height
        
        return `${minHeight}px`;
    };

    // Opsi jenis jalan
    const roadTypes = [
        { value: 'arterial', label: 'Arterial', description: 'Jalan utama dengan lalu lintas tinggi', icon: '🛣️' },
        { value: 'collector', label: 'Kolektor', description: 'Jalan penghubung dengan lalu lintas sedang', icon: '🔗' },
        { value: 'local', label: 'Lokal', description: 'Jalan lokal dengan lalu lintas rendah', icon: '🏘️' },
        { value: 'lingkungan', label: 'Lingkungan', description: 'Jalan lingkungan dengan lalu lintas sangat rendah', icon: '🏠' }
    ];

    // Opsi span (30-69)
    const spanOptions = Array.from({ length: 40 }, (_, i) => 30 + i);

    const getRoadTypeColor = (type) => {
        switch (type) {
            case 'arterial': return 'border-red-400 bg-red-50';
            case 'collector': return 'border-blue-400 bg-blue-50';
            case 'local': return 'border-green-400 bg-green-50';
            case 'lingkungan': return 'border-purple-400 bg-purple-50';
            default: return 'border-gray-200 bg-white';
        }
    };

    return (
        <div 
            className="w-96 bg-white shadow-lg overflow-visible"
            style={{ minHeight: calculateSidebarHeight() }}
        >
            <div className="p-6 space-y-4" style={{ paddingBottom: '200px' }}>
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        Pilih jenis jalan dan span untuk memulai analisis
                    </h2>
                </div>

                {/* Pilih Jenis Jalan */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <RoadIcon size={20} className="text-orange-500" />
                        Pilih Jenis Jalan
                    </h3>
                    <div className="space-y-3">
                        {roadTypes.map((road) => (
                            <button
                                key={road.value}
                                onClick={() => setSelectedRoadType(road.value)}
                                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                    selectedRoadType === road.value
                                        ? `${getRoadTypeColor(road.value)} border-opacity-100`
                                        : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{road.icon}</div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800">{road.label}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{road.description}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Statistics - L-Min, L-Max, L-Avg, Rasio */}
                {gridStats && (
                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <h4 className="text-sm font-semibold text-indigo-800 mb-2">Statistik Grid:</h4>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-indigo-700">L-Min:</span>
                                <span className="text-xs font-medium text-indigo-800">{gridStats.lMin}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-indigo-700">L-Max:</span>
                                <span className="text-xs font-medium text-indigo-800">{gridStats.lMax}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-indigo-700">L-Avg:</span>
                                <span className="text-xs font-medium text-indigo-800">{gridStats.lAvg}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-indigo-700">Uniformity Ratio:</span>
                                <span className="text-xs font-medium text-indigo-800">{gridStats.uniformityRatio || '0.000'}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-indigo-200">
                                <span className="text-xs text-indigo-700">Data:</span>
                                <span className="text-xs font-medium text-indigo-800">{gridStats.totalCells} sel</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Grid Size Form */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Grid3X3 size={20} className="text-green-500" />
                        Ukuran Jarak Tiang Dan Lebar Jalan
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Jarak Tiang */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Jarak Tiang
                            </label>
                                                         <input
                                 type="number"
                                 min="10"
                                 max="100"
                                 value={gridRows}
                                 onChange={(e) => setGridRows(e.target.value)}
                                 placeholder="Masukkan jarak (10-100)"
                                 className="w-full p-3 border-2 border-gray-300 rounded-lg text-base font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black"
                             />
                        </div>
                        
                        {/* Lebar Jalan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Lebar Jalan
                            </label>
                                                         <input
                                 type="number"
                                 min="10"
                                 max="50"
                                 value={gridCols}
                                 onChange={(e) => setGridCols(e.target.value)}
                                 placeholder="Masukkan lebar (10-50)"
                                 className="w-full p-3 border-2 border-gray-300 rounded-lg text-base font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black"
                             />
                        </div>
                    </div>
                    
                                         {gridRows && gridCols && (
                         <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                             <p className="text-green-800 font-medium text-sm">
                                 Jarak Tiang {gridRows} Lebar Jalan {gridCols}
                             </p>
                             <p className="text-green-600 text-xs mt-1">
                                 Total sel: {parseInt(gridRows || 0) * parseInt(gridCols || 0)} sel
                             </p>
                             
                             {/* Button Terapkan Grid */}
                             <button
                                 onClick={() => {
                                     if (gridRows && gridCols && selectedRoadType) {
                                         onStartGrid();
                                     }
                                 }}
                                 disabled={!gridRows || !gridCols || !selectedRoadType}
                                 className={`w-full mt-3 p-2 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                                     gridRows && gridCols && selectedRoadType
                                         ? 'border-green-400 bg-green-100 hover:bg-green-200 text-green-800'
                                         : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                 }`}
                             >
                                 <Grid3X3 size={16} className={gridRows && gridCols && selectedRoadType ? 'text-green-600' : 'text-gray-400'} />
                                 <span className="font-medium text-sm">Terapkan</span>
                             </button>
                         </div>
                     )}
                </div>

                {/* Load Data Dropdowns */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Database size={20} className="text-orange-500" />
                        Load Data
                    </h3>
                    <div className="space-y-3">
                        {/* Load Data Pertama Dropdown */}
                        <LoadDataDropdown
                            title="Load Data Pertama (Atas ke Bawah)"
                            gridRows={gridRows}
                            gridCols={gridCols}
                            direction="topToBottom"
                            onLoadData={onLoadDataPertama}
                            color="blue"
                        />
                        
                        {/* Load Data Kedua Dropdown */}
                        <LoadDataDropdown
                            title="Load Data Kedua (Bawah ke Atas)"
                            gridRows={gridRows}
                            gridCols={gridCols}
                            direction="bottomToTop"
                            onLoadData={onLoadDataKedua}
                            color="purple"
                        />
                        
                        {/* Info Penggabungan Data */}
                        {(loadedData1 && loadedData2) && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="text-sm font-semibold text-green-800 mb-2">
                                    ➕ Metode Penggabungan Data:
                                </h4>
                                <p className="text-xs text-green-700">
                                    Sistem akan <strong>menjumlahkan</strong> nilai dari kedua data.
                                    Jika ada nilai di kedua dataset untuk sel yang sama, nilainya akan dijumlahkan sesuai dengan datanya.
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    💡 Contoh: Jika Data Pertama = 10 dan Data Kedua = 15, maka hasil = 25
                                </p>
                            </div>
                        )}
                        
                        {/* Info Data yang Sudah Di-Load */}
                        {(loadedData1 || loadedData2) && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                                    <Database size={16} className="text-green-600" />
                                    Data yang Sudah Dimuat:
                                </h4>
                                <div className="space-y-2">
                                    {loadedData1 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                            <span className="text-green-700 font-medium">Data Pertama:</span>
                                            <span className="text-green-600">
                                                {loadedData1.lampPower || 'N/A'} - {loadedData1.poleHeight || 'N/A'} 
                                                {loadedData1.surveyorName && ` (${loadedData1.surveyorName})`}
                                            </span>
                                        </div>
                                    )}
                                    {loadedData2 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                                            <span className="text-green-700 font-medium">Data Kedua:</span>
                                            <span className="text-green-600">
                                                {loadedData2.lampPower || 'N/A'} - {loadedData2.poleHeight || 'N/A'}
                                                {loadedData2.surveyorName && ` (${loadedData2.surveyorName})`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Analisis Button */}
                        {(gridRows && gridCols && selectedRoadType && (loadedData1 || loadedData2)) && (
                            <button
                                onClick={onAnalyzeData}
                                className="w-full p-3 rounded-lg border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-800 transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                <Database size={18} className="text-green-600" />
                                <span className="font-medium text-sm">Analisis Data</span>
                            </button>
                        )}
                        
                        {/* Reset Grid Button */}
                        {(gridRows && gridCols) && (
                            <button
                                onClick={onResetGrid}
                                className="w-full p-3 rounded-lg border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-800 transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                <RotateCcw size={18} className="text-red-600" />
                                <span className="font-medium text-sm">Reset Grid (Kosongkan Semua)</span>
                            </button>
                        )}
                    </div>
                    
                    {!(gridRows && gridCols) && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-yellow-800 text-xs">
                                Masukkan ukuran grid terlebih dahulu untuk mengaktifkan load data
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

LoadDataDropdown.displayName = 'LoadDataDropdown';

const UniformitySidebarComponent = UniformitySidebar;
export default UniformitySidebarComponent;

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Sun, LogOut, CheckCircle, XCircle, AlertTriangle, Menu, X, Database, ChevronDown, RotateCcw, BarChart3 } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

const UniformityPageMobile = ({ onBack, user, onLogout }) => {
    const [selectedRoadType, setSelectedRoadType] = useState('');
    const [gridRows, setGridRows] = useState('');
    const [gridCols, setGridCols] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [loadedData, setLoadedData] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [showFirstDropdown, setShowFirstDropdown] = useState(false);
    const [showSecondDropdown, setShowSecondDropdown] = useState(false);
    const [selectedFirstData, setSelectedFirstData] = useState(null);
    const [selectedSecondData, setSelectedSecondData] = useState(null);
    const [availableReports, setAvailableReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    const db = getFirestore(firebaseApp);

    // Fetch reports from Firebase
    useEffect(() => {
        const fetchReports = async () => {
            setIsLoadingReports(true);
            try {
                const reportsRef = collection(db, 'reports');
                const q = query(reportsRef, orderBy('projectDate', 'desc'), limit(25));
                const querySnapshot = await getDocs(q);
                
                const reports = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    reports.push({
                        id: doc.id,
                        label: `${data.lampPower} - ${data.poleHeight}`,
                        author: `oleh ${data.surveyorName}`,
                        projectTitle: data.projectTitle,
                        lampPower: data.lampPower,
                        poleHeight: data.poleHeight,
                        surveyorName: data.surveyorName,
                        gridData: data.gridData,
                        stats: data.stats,
                        selected: false
                    });
                });
                
                setAvailableReports(reports);
            } catch (error) {
                console.error('Error fetching reports:', error);
            } finally {
                setIsLoadingReports(false);
            }
        };

        fetchReports();
    }, [db]);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            localStorage.removeItem('savedUniformityState');
            if (onLogout) {
                await onLogout();
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }, [onLogout]);

    // Handle back
    const handleBack = useCallback(() => {
        onBack();
    }, [onBack]);

    // Standar acuan untuk setiap jenis jalan
    const getRoadStandards = (roadType) => {
        const standards = {
            arterial: {
                lAvgMin: 17.0,
                uniformityRatioMax: 3.99,
                description: 'Jalan Arterial'
            },
            collector: {
                lAvgMin: 12.0,
                uniformityRatioMax: 4.99,
                description: 'Jalan Kolektor'
            },
            local: {
                lAvgMin: 9.0,
                uniformityRatioMax: 6.99,
                description: 'Jalan Lokal'
            },
            lingkungan: {
                lAvgMin: 6.0,
                uniformityRatioMax: 6.99,
                description: 'Jalan Lingkungan'
            }
        };
        
        return standards[roadType] || null;
    };

    // Road type options
    const roadTypes = [
        { value: 'arterial', label: 'Arterial', icon: '🛣️' },
        { value: 'collector', label: 'Kolektor', icon: '🛤️' },
        { value: 'local', label: 'Lokal', icon: '🏘️' },
        { value: 'lingkungan', label: 'Lingkungan', icon: '🏠' }
    ];

    // Handle load data functions
    const handleLoadDataFirst = useCallback(() => {
        // Simulate loading data from top to bottom
        setLoadedData('first');
        setDataLoaded(true);
        console.log('Loading data from top to bottom...');
    }, []);

    const handleLoadDataSecond = useCallback(() => {
        // Simulate loading data from bottom to top
        setLoadedData('second');
        setDataLoaded(true);
        console.log('Loading data from bottom to top...');
    }, []);

    const handleResetGrid = useCallback(() => {
        setLoadedData(null);
        setDataLoaded(false);
        setShowAnalysis(false);
        setSelectedFirstData(null);
        setSelectedSecondData(null);
        setShowFirstDropdown(false);
        setShowSecondDropdown(false);
        console.log('Grid reset, all data cleared');
    }, []);

    // Function to simulate analysis with sample data
    const performAnalysis = useCallback(() => {
        if (!selectedRoadType || !gridRows || !gridCols || !showAnalysis || !dataLoaded) return null;

        // Sample data untuk simulasi
        const sampleStats = {
            lMin: 8.5,
            lMax: 25.3,
            lAvg: 15.2,
            uniformityRatio: 1.8,
            totalCells: parseInt(gridRows) * parseInt(gridCols)
        };

        const standards = getRoadStandards(selectedRoadType);
        if (!standards) return null;

        const lAvgCompliant = sampleStats.lAvg >= standards.lAvgMin;
        const ratioCompliant = sampleStats.uniformityRatio <= standards.uniformityRatioMax;
        const overallCompliant = lAvgCompliant && ratioCompliant;

        return {
            stats: sampleStats,
            standards,
            lAvgCompliant,
            ratioCompliant,
            overallCompliant,
            lAvgStatus: lAvgCompliant ? 'OK' : 'NOT OK',
            ratioStatus: ratioCompliant ? 'OK' : 'NOT OK'
        };
    }, [selectedRoadType, gridRows, gridCols, showAnalysis, dataLoaded]);

    const analysisResult = performAnalysis();

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
            {/* Mobile Header */}
            <div className="bg-white shadow-sm sticky top-0 z-50">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm">Kembali</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <Sun className="w-6 h-6 text-orange-500" />
                        <h1 className="text-lg font-bold text-gray-800">Kemerataan Sinar</h1>
                    </div>

                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                    >
                        {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {showMenu && (
                    <div className="border-t bg-white p-4 space-y-2">
                        {user && (
                            <div className="text-sm text-gray-600 pb-2 border-b">
                                {user.displayName || user.email}
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left text-red-600 hover:text-red-700 py-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-6">
                {/* Road Type Selection */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilih Jenis Jalan</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {roadTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setSelectedRoadType(type.value)}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    selectedRoadType === type.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="text-2xl mb-2">{type.icon}</div>
                                <div className="text-sm font-medium text-gray-900">{type.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Custom Selection */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="text-orange-500">🔧</div>
                        <h2 className="text-lg font-semibold text-gray-800">Ukuran Grid Custom</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tinggi Tiang (Baris)
                            </label>
                            <input
                                type="number"
                                value={gridRows}
                                onChange={(e) => setGridRows(e.target.value)}
                                placeholder="Masukkan tinggi (10-100)"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="10"
                                max="100"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Lebar Jalan (Kolom)
                            </label>
                            <input
                                type="number"
                                value={gridCols}
                                onChange={(e) => setGridCols(e.target.value)}
                                placeholder="Masukkan lebar (10-50)"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="10"
                                max="50"
                            />
                        </div>
                    </div>
                </div>

                {/* Load Data Section */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Database className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-800">Load Data</h2>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Load Data Pertama Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowFirstDropdown(!showFirstDropdown)}
                                className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    selectedFirstData 
                                        ? 'bg-blue-100 border-blue-300' 
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${showFirstDropdown ? 'rotate-180' : ''}`} />
                                    <span className="text-blue-600 font-medium">
                                        {selectedFirstData ? selectedFirstData.label : 'Load Data Pertama (Atas ke Bawah)'}
                                    </span>
                                </div>
                                {selectedFirstData && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                            </button>
                            
                            {showFirstDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b bg-gray-50">
                                        <span className="text-xs text-gray-600">{availableReports.length} data tersedia:</span>
                                    </div>
                                    {isLoadingReports ? (
                                        <div className="p-4 text-center text-gray-500">
                                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                            Memuat data...
                                        </div>
                                    ) : (
                                        availableReports.map((report) => (
                                            <button
                                                key={report.id}
                                                onClick={() => {
                                                    setSelectedFirstData(report);
                                                    setLoadedData('first');
                                                    setDataLoaded(true);
                                                    setShowFirstDropdown(false);
                                                }}
                                                className="w-full p-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm text-gray-900">{report.label}</div>
                                                    <div className="text-xs text-gray-500">{report.author}</div>
                                                </div>
                                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Load Data Kedua Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowSecondDropdown(!showSecondDropdown)}
                                className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    selectedSecondData 
                                        ? 'bg-purple-100 border-purple-300' 
                                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform ${showSecondDropdown ? 'rotate-0' : 'rotate-180'}`} />
                                    <span className="text-purple-600 font-medium">
                                        {selectedSecondData ? selectedSecondData.label : 'Load Data Kedua (Bawah ke Atas)'}
                                    </span>
                                </div>
                                {selectedSecondData && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                            </button>
                            
                            {showSecondDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b bg-gray-50">
                                        <span className="text-xs text-gray-600">{availableReports.length} data tersedia:</span>
                                    </div>
                                    {isLoadingReports ? (
                                        <div className="p-4 text-center text-gray-500">
                                            <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                            Memuat data...
                                        </div>
                                    ) : (
                                        availableReports.map((report) => (
                                            <button
                                                key={report.id}
                                                onClick={() => {
                                                    setSelectedSecondData(report);
                                                    setLoadedData('second');
                                                    setDataLoaded(true);
                                                    setShowSecondDropdown(false);
                                                }}
                                                className="w-full p-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm text-gray-900">{report.label}</div>
                                                    <div className="text-xs text-gray-500">{report.author}</div>
                                                </div>
                                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Analisis Button */}
                        {selectedRoadType && gridRows && gridCols && dataLoaded && (
                            <button
                                onClick={() => setShowAnalysis(true)}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
                            >
                                <BarChart3 className="w-5 h-5" />
                                <span>Analisis</span>
                            </button>
                        )}
                        
                        <button 
                            onClick={handleResetGrid}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-medium">Reset Data</span>
                        </button>
                    </div>
                </div>


                {/* Analysis Result */}
                {analysisResult && (
                    <div className="space-y-4">
                        {/* Overall Status Card */}
                        <div className={`rounded-xl shadow-lg p-6 ${
                            analysisResult.overallCompliant 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                        }`}>
                            <div className="text-center">
                                {analysisResult.overallCompliant ? (
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                                ) : (
                                    <XCircle className="w-16 h-16 mx-auto mb-4" />
                                )}
                                <div className="text-2xl font-bold mb-2">
                                    {analysisResult.overallCompliant ? 'MEMENUHI' : 'TIDAK MEMENUHI'}
                                </div>
                                <div className="text-lg opacity-90">
                                    STANDAR
                                </div>
                                <div className="text-sm opacity-75 mt-2">
                                    {analysisResult.standards.description}
                                </div>
                            </div>
                        </div>

                        {/* Statistics Card */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistik Pengukuran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <div className="text-sm text-gray-600">L-Min</div>
                                    <div className="text-xl font-bold text-blue-600">{analysisResult.stats.lMin}</div>
                                    <div className="text-xs text-gray-500">lux</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <div className="text-sm text-gray-600">L-Max</div>
                                    <div className="text-xl font-bold text-blue-600">{analysisResult.stats.lMax}</div>
                                    <div className="text-xs text-gray-500">lux</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <div className="text-sm text-gray-600">L-Avg</div>
                                    <div className="text-xl font-bold text-blue-600">{analysisResult.stats.lAvg}</div>
                                    <div className="text-xs text-gray-500">lux</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <div className="text-sm text-gray-600">Uniformity</div>
                                    <div className="text-xl font-bold text-blue-600">{analysisResult.stats.uniformityRatio}</div>
                                    <div className="text-xs text-gray-500">ratio</div>
                                </div>
                            </div>
                        </div>

                        {/* Compliance Check Card */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Evaluasi Kepatuhan</h3>
                            <div className="space-y-3">
                                <div className={`flex items-center justify-between p-3 rounded-lg ${
                                    analysisResult.lAvgCompliant ? 'bg-green-50' : 'bg-red-50'
                                }`}>
                                    <div>
                                        <div className="font-medium text-sm">Intensitas Rata-rata</div>
                                        <div className="text-xs text-gray-600">
                                            Min: {analysisResult.standards.lAvgMin} lux
                                        </div>
                                    </div>
                                    <div className={`flex items-center font-bold text-sm ${
                                        analysisResult.lAvgCompliant ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {analysisResult.lAvgCompliant ? (
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                        ) : (
                                            <XCircle className="w-4 h-4 mr-1" />
                                        )}
                                        {analysisResult.lAvgStatus}
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between p-3 rounded-lg ${
                                    analysisResult.ratioCompliant ? 'bg-green-50' : 'bg-red-50'
                                }`}>
                                    <div>
                                        <div className="font-medium text-sm">Rasio Kemerataan</div>
                                        <div className="text-xs text-gray-600">
                                            Max: {analysisResult.standards.uniformityRatioMax}
                                        </div>
                                    </div>
                                    <div className={`flex items-center font-bold text-sm ${
                                        analysisResult.ratioCompliant ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {analysisResult.ratioCompliant ? (
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                        ) : (
                                            <XCircle className="w-4 h-4 mr-1" />
                                        )}
                                        {analysisResult.ratioStatus}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedRoadType('');
                                    setGridRows('');
                                    setGridCols('');
                                    setShowAnalysis(false);
                                    setLoadedData(null);
                                    setDataLoaded(false);
                                }}
                                className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cetak
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {!analysisResult && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="text-base font-semibold text-blue-800 mb-2">Cara Menggunakan</h3>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                                    <li>Pilih jenis jalan yang akan dianalisis</li>
                                    <li>Masukkan tinggi tiang (baris) dan lebar jalan (kolom)</li>
                                    <li>Load data dengan salah satu tombol Load Data</li>
                                    <li>Klik tombol Analisis setelah data ter-load</li>
                                    <li>Lihat status OK/NOT OK berdasarkan standar</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniformityPageMobile;

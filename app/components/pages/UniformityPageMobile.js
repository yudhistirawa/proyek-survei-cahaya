import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeft, Sun, LogOut } from 'lucide-react';
import { UniformitySidebar } from '../index';
import { LocalRoadAlertModal } from '../modals/LocalRoadAlertModal';
import { LingkunganRoadAlertModal } from '../modals/LingkunganRoadAlertModal';
import { ArterialRoadAlertModal } from '../modals/ArterialRoadAlertModal';
import { CollectorRoadAlertModal } from '../modals/CollectorRoadAlertModal';
import { DEFAULT_CELL_STATE } from '../../constants';

const UniformityPageMobile = ({ onBack, user, onLogout }) => {
    const [selectedRoadType, setSelectedRoadType] = useState('');
    const [selectedSpan, setSelectedSpan] = useState('');
    const [gridRows, setGridRows] = useState('');
    const [gridCols, setGridCols] = useState('');
    const [gridData, setGridData] = useState([]);
    const [gridStats, setGridStats] = useState({ lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });

    const [loadedData1, setLoadedData1] = useState(null);
    const [loadedData2, setLoadedData2] = useState(null);

    const [showArterialAlert, setShowArterialAlert] = useState(false);
    const [showCollectorAlert, setShowCollectorAlert] = useState(false);
    const [showLocalAlert, setShowLocalAlert] = useState(false);
    const [showLingkunganAlert, setShowLingkunganAlert] = useState(false);

    // Save state to localStorage
    useEffect(() => {
        const uniformityState = {
            selectedRoadType,
            selectedSpan,
            gridRows,
            gridCols,
            gridData,
            loadedData1,
            loadedData2,
            gridStats,
            timestamp: Date.now()
        };
        if (selectedRoadType || selectedSpan || gridRows || gridCols) {
            localStorage.setItem('savedUniformityState', JSON.stringify(uniformityState));
        }
    }, [selectedRoadType, selectedSpan, gridData, loadedData1, loadedData2, gridStats]);

    // Auto update grid when gridRows or gridCols change (auto apply grid)
    useEffect(() => {
        if (gridRows && gridCols) {
            // Simulate onStartGrid logic here to update grid automatically
            const targetRows = parseInt(gridRows);
            const targetCols = parseInt(gridCols);

            if (isNaN(targetRows) || isNaN(targetCols) || targetRows <= 0 || targetCols <= 0) {
                return;
            }

            // Create new grid with size targetRows x targetCols
            const newGridData = Array.from({ length: targetRows }, (_, rowIndex) =>
                Array.from({ length: targetCols }, (_, colIndex) => ({
                    ...DEFAULT_CELL_STATE,
                    id: `${rowIndex}-${colIndex}`,
                    row: rowIndex,
                    col: colIndex,
                    value: 0,
                    timestamp: null
                }))
            );

            // If loadedData1 or loadedData2 exist, reapply data to new grid
            if (loadedData1) {
                try {
                    let sourceGridData = loadedData1.gridData;
                    if (typeof sourceGridData === 'string') {
                        sourceGridData = JSON.parse(sourceGridData);
                    }
                    if (Array.isArray(sourceGridData) && sourceGridData.length > 0) {
                        const startColumn = 2;
                        for (let rowIndex = 0; rowIndex < Math.min(targetRows, sourceGridData.length); rowIndex++) {
                            for (let colIndex = 0; colIndex < targetCols; colIndex++) {
                                let sourceValue = 0;
                                let sourceColIndex = -1;
                                if (colIndex === 0) {
                                    sourceColIndex = 2;
                                } else if (colIndex === 1) {
                                    sourceColIndex = 1;
                                } else if (colIndex >= startColumn) {
                                    sourceColIndex = colIndex - startColumn;
                                }
                                if (sourceColIndex >= 0 && sourceColIndex < sourceGridData[rowIndex]?.length) {
                                    const sourceCell = sourceGridData[rowIndex][sourceColIndex];
                                    if (sourceCell !== undefined && sourceCell !== null) {
                                        if (typeof sourceCell === 'number') {
                                            sourceValue = sourceCell;
                                        } else if (typeof sourceCell === 'string') {
                                            const parsed = parseFloat(sourceCell);
                                            sourceValue = isNaN(parsed) ? 0 : parsed;
                                        } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                            sourceValue = sourceCell.value || sourceCell.val || sourceCell.data ||
                                                sourceCell.number || sourceCell.num || 0;
                                            if (typeof sourceValue === 'string') {
                                                const parsed = parseFloat(sourceValue);
                                                sourceValue = isNaN(parsed) ? 0 : parsed;
                                            } else if (typeof sourceValue !== 'number') {
                                                sourceValue = 0;
                                            }
                                        }
                                    }
                                    if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                                        sourceValue = 0;
                                    }
                                    if (sourceValue > 0) {
                                        newGridData[rowIndex][colIndex].value = sourceValue;
                                        newGridData[rowIndex][colIndex].timestamp = Date.now();
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error reapplying loadedData1:', error);
                }
            }
            if (loadedData2) {
                try {
                    let sourceGridData = loadedData2.gridData;
                    if (typeof sourceGridData === 'string') {
                        sourceGridData = JSON.parse(sourceGridData);
                    }
                    if (Array.isArray(sourceGridData) && sourceGridData.length > 0) {
                        const startColumn = 2;
                        for (let rowIndex = 0; rowIndex < targetRows; rowIndex++) {
                            for (let colIndex = 0; colIndex < targetCols; colIndex++) {
                                let sourceValue = 0;
                                let sourceColIndex = -1;
                                if (colIndex === 0) {
                                    sourceColIndex = 2;
                                } else if (colIndex === 1) {
                                    sourceColIndex = 1;
                                } else if (colIndex >= startColumn) {
                                    sourceColIndex = colIndex - startColumn;
                                }
                                if (sourceColIndex >= 0) {
                                    const sourceRowIndex = (targetRows - 1) - rowIndex;
                                    if (sourceRowIndex >= 0 && sourceRowIndex < sourceGridData.length &&
                                        sourceColIndex < sourceGridData[sourceRowIndex]?.length) {
                                        const sourceCell = sourceGridData[sourceRowIndex][sourceColIndex];
                                        if (sourceCell !== undefined && sourceCell !== null) {
                                            if (typeof sourceCell === 'number') {
                                                sourceValue = sourceCell;
                                            } else if (typeof sourceCell === 'string') {
                                                const parsed = parseFloat(sourceCell);
                                                sourceValue = isNaN(parsed) ? 0 : parsed;
                                            } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                                sourceValue = sourceCell.value || sourceCell.val || sourceCell.data ||
                                                    sourceCell.number || sourceCell.num || 0;
                                                if (typeof sourceValue === 'string') {
                                                    const parsed = parseFloat(sourceValue);
                                                    sourceValue = isNaN(parsed) ? 0 : parsed;
                                                } else if (typeof sourceValue !== 'number') {
                                                    sourceValue = 0;
                                                }
                                            }
                                        }
                                        if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                                            sourceValue = 0;
                                        }
                                        if (sourceValue > 0) {
                                            const existingValue = parseFloat(newGridData[rowIndex][colIndex].value) || 0;
                                            const combinedValue = existingValue + sourceValue;
                                            newGridData[rowIndex][colIndex].value = combinedValue;
                                            newGridData[rowIndex][colIndex].timestamp = Date.now();
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error reapplying loadedData2:', error);
                }
            }
            setGridData(newGridData);
        }
    }, [gridRows, gridCols, loadedData1, loadedData2]);

    // Load state from localStorage
    useEffect(() => {
        try {
            const savedState = localStorage.getItem('savedUniformityState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                setSelectedRoadType(parsedState.selectedRoadType || '');
                setSelectedSpan(parsedState.selectedSpan || '');
                setGridRows(parsedState.gridRows || '');
                setGridCols(parsedState.gridCols || '');
                setGridData(parsedState.gridData || []);
                setLoadedData1(parsedState.loadedData1 || null);
                setLoadedData2(parsedState.loadedData2 || null);
                setGridStats(parsedState.gridStats || { lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
            }
        } catch {
            localStorage.removeItem('savedUniformityState');
        }
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            localStorage.removeItem('savedUniformityState');
            if (onLogout) await onLogout();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }, [onLogout]);

    const handleBack = useCallback(() => {
        onBack();
    }, [onBack]);

    // Helper to calculate grid stats (same as PC version)
    const calculateGridStats = useCallback((grid) => {
        if (!grid || grid.length === 0) {
            return { lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0, compliance: null };
        }
        const values = [];
        grid.forEach(row => {
            row.forEach(cell => {
                const value = Number(cell.value) || 0;
                if (value > 0) values.push(value);
            });
        });
        if (values.length === 0) {
            return { lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0, compliance: null };
        }
        const lMin = Math.min(...values);
        const lMax = Math.max(...values);
        const lAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const uniformityRatio = lMin > 0 ? lAvg / lMin : 0;
        return {
            lMin: Number(lMin.toFixed(1)),
            lMax: Number(lMax.toFixed(1)),
            lAvg: Number(lAvg.toFixed(1)),
            uniformityRatio: Number(uniformityRatio.toFixed(1)),
            totalCells: values.length,
            compliance: null
        };
    }, []);

    // Standar acuan untuk setiap jenis jalan - SAMA DENGAN PC VERSION
    const getRoadStandards = (roadType) => {
        const standards = {
            arterial: {
                lAvgMin: 17.0,
                uniformityRatioMax: 2.99,
                description: 'Jalan Arterial (Lalu lintas tinggi)'
            },
            collector: {
                lAvgMin: 12.0,
                uniformityRatioMax: 3.99,
                description: 'Jalan Kolektor (Lalu lintas sedang)'
            },
            local: {
                lAvgMin: 9.0,
                uniformityRatioMax: 5.99,
                description: 'Jalan Lokal (Lalu lintas rendah)'
            },
            lingkungan: {
                lAvgMin: 6.0,
                uniformityRatioMax: 5.99,
                description: 'Jalan Lingkungan (Lalu lintas sangat rendah)'
            }
        };
        
        return standards[roadType] || null;
    };

    // Handle Load Data Pertama - SAMA DENGAN PC VERSION
    const handleLoadDataPertama = useCallback(async (selectedData) => {
        console.log('🔄 Load Data Pertama clicked:', selectedData);
        
        if (!selectedData || !selectedData.gridData) {
            console.error('❌ No grid data found in selected data');
            return;
        }

        try {
            // Parse gridData if it's a string
            let sourceGridData = selectedData.gridData;
            if (typeof sourceGridData === 'string') {
                sourceGridData = JSON.parse(sourceGridData);
            }

            if (!Array.isArray(sourceGridData) || sourceGridData.length === 0) {
                console.error('❌ Invalid grid data format');
                return;
            }
            
            const targetRows = parseInt(gridRows);
            const targetCols = parseInt(gridCols);
            const startColumn = 2; // Mulai dari kolom ke-3 (index 2)

            // Create new grid with target dimensions and populate with source data
            const newGridData = Array.from({ length: targetRows }, (_, rowIndex) =>
                Array.from({ length: targetCols }, (_, colIndex) => {
                    let sourceValue = 0;
                    let sourceColIndex = -1;
                    
                    // Mirroring untuk kolom 1 dan 2, normal untuk kolom 3 ke atas
                    if (colIndex === 0) {
                        sourceColIndex = 2;
                    } else if (colIndex === 1) {
                        sourceColIndex = 1;
                    } else if (colIndex >= startColumn) {
                        sourceColIndex = colIndex - startColumn;
                    }
                    
                    // Ambil data jika sourceColIndex valid
                    if (sourceColIndex >= 0) {
                        const sourceCell = sourceGridData[rowIndex]?.[sourceColIndex];
                        
                        if (sourceCell !== undefined && sourceCell !== null) {
                            if (typeof sourceCell === 'number') {
                                sourceValue = sourceCell;
                            } else if (typeof sourceCell === 'string') {
                                const parsed = parseFloat(sourceCell);
                                sourceValue = isNaN(parsed) ? 0 : parsed;
                            } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                sourceValue = sourceCell.value || sourceCell.val || sourceCell.data || 
                                             sourceCell.number || sourceCell.num || 0;
                                
                                if (typeof sourceValue === 'string') {
                                    const parsed = parseFloat(sourceValue);
                                    sourceValue = isNaN(parsed) ? 0 : parsed;
                                } else if (typeof sourceValue !== 'number') {
                                    sourceValue = 0;
                                }
                            }
                        }
                        
                        if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                            sourceValue = 0;
                        }
                    }
                    
                    return {
                        ...DEFAULT_CELL_STATE,
                        id: `${rowIndex}-${colIndex}`,
                        row: rowIndex,
                        col: colIndex,
                        value: sourceValue,
                        timestamp: sourceValue > 0 ? Date.now() : null
                    };
                })
            );

            // Apply data from top to bottom (Data Pertama)
            setGridData(newGridData);
            setLoadedData1(selectedData);
            
            console.log('✅ Data Pertama loaded successfully starting from column 3');
            
        } catch (error) {
            console.error('❌ Error loading Data Pertama:', error);
        }
    }, [gridRows, gridCols]);

    // Handle Load Data Kedua - SAMA DENGAN PC VERSION
    const handleLoadDataKedua = useCallback(async (selectedData) => {
        console.log('🔄 Load Data Kedua clicked:', selectedData);
        
        if (!selectedData || !selectedData.gridData) {
            console.error('❌ No grid data found in selected data');
            return;
        }

        try {
            // Parse gridData if it's a string
            let sourceGridData = selectedData.gridData;
            if (typeof sourceGridData === 'string') {
                sourceGridData = JSON.parse(sourceGridData);
            }

            if (!Array.isArray(sourceGridData) || sourceGridData.length === 0) {
                console.error('❌ Invalid grid data format');
                return;
            }
            
            const targetRows = parseInt(gridRows);
            const targetCols = parseInt(gridCols);
            const startColumn = 2;

            // Get current grid data or create new one
            let currentGrid = gridData;
            if (!currentGrid || currentGrid.length === 0) {
                currentGrid = Array.from({ length: targetRows }, (_, rowIndex) =>
                    Array.from({ length: targetCols }, (_, colIndex) => ({
                        ...DEFAULT_CELL_STATE,
                        id: `${rowIndex}-${colIndex}`,
                        row: rowIndex,
                        col: colIndex,
                        value: 0,
                        timestamp: null
                    }))
                );
            }

            // Apply data from bottom to top (Data Kedua) - reverse the loading direction
            const newGridData = currentGrid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                    let sourceValue = 0;
                    let sourceColIndex = -1;
                    
                    if (colIndex === 0) {
                        sourceColIndex = 2;
                    } else if (colIndex === 1) {
                        sourceColIndex = 1;
                    } else if (colIndex >= startColumn) {
                        sourceColIndex = colIndex - startColumn;
                    }
                    
                    if (sourceColIndex >= 0) {
                        // For bottom-to-top loading, we reverse the row index
                        const sourceRowIndex = (targetRows - 1) - rowIndex;
                        const sourceCell = sourceGridData[sourceRowIndex]?.[sourceColIndex];
                        
                        if (sourceCell !== undefined && sourceCell !== null) {
                            if (typeof sourceCell === 'number') {
                                sourceValue = sourceCell;
                            } else if (typeof sourceCell === 'string') {
                                const parsed = parseFloat(sourceCell);
                                sourceValue = isNaN(parsed) ? 0 : parsed;
                            } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                sourceValue = sourceCell.value || sourceCell.val || sourceCell.data || 
                                             sourceCell.number || sourceCell.num || 0;
                                
                                if (typeof sourceValue === 'string') {
                                    const parsed = parseFloat(sourceValue);
                                    sourceValue = isNaN(parsed) ? 0 : parsed;
                                } else if (typeof sourceValue !== 'number') {
                                    sourceValue = 0;
                                }
                            }
                        }
                        
                        if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                            sourceValue = 0;
                        }
                    }
                    
                    // Gabungkan data dengan penjumlahan
                    const existingValue = parseFloat(cell.value) || 0;
                    let combinedValue;
                    
                    if (existingValue > 0 && sourceValue > 0) {
                        combinedValue = existingValue + sourceValue;
                    } else if (existingValue > 0) {
                        combinedValue = existingValue;
                    } else if (sourceValue > 0) {
                        combinedValue = sourceValue;
                    } else {
                        combinedValue = 0;
                    }
                    
                    return {
                        ...cell,
                        value: combinedValue,
                        timestamp: combinedValue > 0 ? Date.now() : null
                    };
                })
            );

            setGridData(newGridData);
            setLoadedData2(selectedData);
            
            console.log('✅ Data Kedua loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading Data Kedua:', error);
        }
    }, [gridRows, gridCols, gridData]);

    // Handle Analyze Data - show alert modals like PC version
    const handleAnalyzeData = useCallback(() => {
        if (!selectedRoadType) {
            alert('Silakan pilih jenis jalan terlebih dahulu');
            return;
        }
        if (!gridStats || gridStats.totalCells === 0) {
            alert('Tidak ada data untuk dianalisis');
            return;
        }
        if (selectedRoadType === 'arterial') setShowArterialAlert(true);
        else if (selectedRoadType === 'collector') setShowCollectorAlert(true);
        else if (selectedRoadType === 'local') setShowLocalAlert(true);
        else if (selectedRoadType === 'lingkungan') setShowLingkunganAlert(true);
    }, [selectedRoadType, gridStats]);

    // Real-time statistics calculation - SAMA DENGAN PC VERSION
    React.useEffect(() => {
        if (gridData && gridData.length > 0) {
            const stats = calculateGridStats(gridData);
            setGridStats(stats);
        } else {
            setGridStats({ lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
        }
    }, [gridData, calculateGridStats]);

    // No grid rendering, only sidebar and alerts
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-50 flex items-center justify-between p-4">
                <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm">Kembali</span>
                </button>
                <div className="flex items-center gap-2">
                    <Sun className="w-6 h-6 text-orange-500" />
                    <h1 className="text-lg font-bold text-gray-800">Kemerataan Sinar</h1>
                </div>
                <button onClick={handleLogout} className="text-red-600 hover:text-red-700">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Sidebar only */}
            <div className="flex-1 overflow-auto p-4 bg-white rounded-lg shadow-md">
                <UniformitySidebar
                    selectedRoadType={selectedRoadType}
                    setSelectedRoadType={setSelectedRoadType}
                    selectedSpan={selectedSpan}
                    setSelectedSpan={setSelectedSpan}
                    gridRows={gridRows}
                    setGridRows={setGridRows}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    onStartGrid={() => {
                        // Mobile version tidak perlu start grid karena tidak ada grid visual
                        console.log('Mobile: Grid started (no visual grid)');
                    }}
                    onLoadDataPertama={handleLoadDataPertama}
                    onLoadDataKedua={handleLoadDataKedua}
                    onResetGrid={() => {
                        setGridData([]);
                        setLoadedData1(null);
                        setLoadedData2(null);
                        setGridStats({ lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
                        console.log('Mobile: Grid reset completed');
                    }}
                    onAnalyzeData={handleAnalyzeData}
                    loadedData1={loadedData1}
                    loadedData2={loadedData2}
                />
            </div>

            {/* Alert Modals */}
            <ArterialRoadAlertModal
                isOpen={showArterialAlert}
                onClose={() => setShowArterialAlert(false)}
                gridStats={gridStats}
                roadStandards={getRoadStandards('arterial')}
            />
            <CollectorRoadAlertModal
                isOpen={showCollectorAlert}
                onClose={() => setShowCollectorAlert(false)}
                gridStats={gridStats}
                roadStandards={getRoadStandards('collector')}
            />
            <LocalRoadAlertModal
                isOpen={showLocalAlert}
                onClose={() => setShowLocalAlert(false)}
                gridStats={gridStats}
                roadStandards={getRoadStandards('local')}
            />
            <LingkunganRoadAlertModal
                isOpen={showLingkunganAlert}
                onClose={() => setShowLingkunganAlert(false)}
                gridStats={gridStats}
                roadStandards={getRoadStandards('lingkungan')}
            />
        </div>
    );
};

export default UniformityPageMobile;

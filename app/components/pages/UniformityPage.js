import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Sun, LogOut, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { UniformitySidebar, GridCell, GridHeader } from '../index';
import { SimpleLoadModal } from '../modals/SimpleLoadModal';
import { LocalRoadAlertModal } from '../modals/LocalRoadAlertModal';
import { LingkunganRoadAlertModal } from '../modals/LingkunganRoadAlertModal';
import { ArterialRoadAlertModal } from '../modals/ArterialRoadAlertModal';
import { CollectorRoadAlertModal } from '../modals/CollectorRoadAlertModal';
import { DEFAULT_CELL_STATE, ARTERIAL_ROAD_STANDARDS, COLLECTOR_ROAD_STANDARDS, LOCAL_ROAD_STANDARDS, LINGKUNGAN_ROAD_STANDARDS } from '../../constants';
import useIsMobile from '../../hooks/useIsMobile';
import { useDebounce } from '../../hooks/useDebounce';
import UniformityPageMobile from './UniformityPageMobile';

const UniformityPage = ({ onBack, user, onLogout }) => {
    const isMobile = useIsMobile();
    
    const [selectedRoadType, setSelectedRoadType] = useState('');
    const [selectedSpan, setSelectedSpan] = useState('');
    const [gridRows, setGridRows] = useState('');
    const [gridCols, setGridCols] = useState('');
    const [showGrid, setShowGrid] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [loadDirection, setLoadDirection] = useState('topToBottom');
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [gridStats, setGridStats] = useState({ lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
    
    // Store loaded data to reapply when span changes
    const [loadedData1, setLoadedData1] = useState(null);
    const [loadedData2, setLoadedData2] = useState(null);
    
    // Debounced values untuk mengurangi lag saat mengetik
    const debouncedGridRows = useDebounce(gridRows, 300);
    const debouncedGridCols = useDebounce(gridCols, 300);
    
    // Ref untuk mencegah multiple renders
    const gridUpdateTimeoutRef = useRef(null);
    
    // State untuk arterial road alert
    const [showArterialAlert, setShowArterialAlert] = useState(false);
    
    // State untuk collector road alert
    const [showCollectorAlert, setShowCollectorAlert] = useState(false);

    // State untuk local road alert
    const [showLocalAlert, setShowLocalAlert] = useState(false);

    // State untuk lingkungan road alert
    const [showLingkunganAlert, setShowLingkunganAlert] = useState(false);

    // Save state to localStorage whenever important state changes
    useEffect(() => {
        const uniformityState = {
            selectedRoadType,
            selectedSpan,
            gridRows,
            gridCols,
            showGrid,
            gridData,
            loadedData1,
            loadedData2,
            gridStats,
            timestamp: Date.now()
        };
        
        if (selectedRoadType || selectedSpan || gridRows || gridCols) {
            localStorage.setItem('savedUniformityState', JSON.stringify(uniformityState));
            console.log('Uniformity state saved to localStorage');
        }
    }, [selectedRoadType, selectedSpan, gridRows, gridCols, showGrid, gridData, loadedData1, loadedData2, gridStats]);

    // Load state from localStorage on component mount
    useEffect(() => {
        try {
            const savedState = localStorage.getItem('savedUniformityState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                console.log('Loading saved uniformity state:', parsedState);
                
                // Restore state
                setSelectedRoadType(parsedState.selectedRoadType || '');
                setSelectedSpan(parsedState.selectedSpan || '');
                setGridRows(parsedState.gridRows || '');
                setGridCols(parsedState.gridCols || '');
                setShowGrid(parsedState.showGrid || false);
                setGridData(parsedState.gridData || []);
                setLoadedData1(parsedState.loadedData1 || null);
                setLoadedData2(parsedState.loadedData2 || null);
                setGridStats(parsedState.gridStats || { lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
                
                console.log('Uniformity state restored from localStorage');
            }
        } catch (error) {
            console.error('Error loading saved uniformity state:', error);
            localStorage.removeItem('savedUniformityState');
        }
    }, []);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            // Clear uniformity state from localStorage
            localStorage.removeItem('savedUniformityState');
            console.log('Uniformity state cleared from localStorage');
            
            // Call the logout function passed from parent
            if (onLogout) {
                await onLogout();
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }, [onLogout]);

    // Handle back with state cleanup
    const handleBack = useCallback(() => {
        // Don't clear state when going back, keep it for refresh persistence
        console.log('Going back to selection page, keeping uniformity state');
        onBack();
    }, [onBack]);

    // Helper to create empty grid
    const createEmptyGrid = useCallback((rows, cols) => {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from({ length: cols }, (_, colIndex) => ({
                ...DEFAULT_CELL_STATE,
                id: `${rowIndex}-${colIndex}`,
                row: rowIndex,
                col: colIndex,
                value: 0
            }))
        );
    }, []);

    // Handle Load Data Pertama - dimulai dari kolom ke-3 (index 2)
    const handleLoadDataPertama = useCallback(async (selectedData) => {
        console.log('🔄 Load Data Pertama clicked:', selectedData);
        console.log('🔍 FULL selectedData structure:', JSON.stringify(selectedData, null, 2));
        
        if (!selectedData || !selectedData.gridData) {
            console.error('❌ No grid data found in selected data');
            console.log('🔍 Available keys in selectedData:', Object.keys(selectedData || {}));
            return;
        }

        try {
            // Parse gridData if it's a string
            let sourceGridData = selectedData.gridData;
            console.log('🔍 Raw gridData type:', typeof sourceGridData);
            console.log('🔍 Raw gridData sample:', sourceGridData);
            
            if (typeof sourceGridData === 'string') {
                console.log('🔄 Parsing gridData from string...');
                sourceGridData = JSON.parse(sourceGridData);
            }

            console.log('🔍 Parsed gridData type:', typeof sourceGridData);
            console.log('🔍 Is array?', Array.isArray(sourceGridData));
            console.log('🔍 Length:', sourceGridData?.length);

            if (!Array.isArray(sourceGridData) || sourceGridData.length === 0) {
                console.error('❌ Invalid grid data format');
                console.log('🔍 GridData structure:', sourceGridData);
                return;
            }

            console.log('📊 Source grid data first row:', sourceGridData[0]);
            console.log('📊 Source grid data sample cell [0][0]:', sourceGridData[0]?.[0]);
            console.log('📊 Source grid dimensions:', sourceGridData.length, 'x', sourceGridData[0]?.length);
            
            const targetRows = parseInt(gridRows);
            const targetCols = parseInt(gridCols);
            const startColumn = 2; // Mulai dari kolom ke-3 (index 2)
            
            console.log('🎯 Target grid dimensions:', targetRows, 'x', targetCols);
            console.log('🎯 Data akan dimulai dari kolom ke-3 (index 2)');

            // Create new grid with target dimensions and populate with source data
            const newGridData = Array.from({ length: targetRows }, (_, rowIndex) =>
                Array.from({ length: targetCols }, (_, colIndex) => {
                    let sourceValue = 0;
                    let sourceColIndex = -1;
                    
                    // Mirroring untuk kolom 1 dan 2, normal untuk kolom 3 ke atas
                    if (colIndex === 0) {
                        // Kolom 1 -> ambil dari kolom 3 (index 2)
                        sourceColIndex = 2;
                    } else if (colIndex === 1) {
                        // Kolom 2 -> ambil dari kolom 2 (index 1)
                        sourceColIndex = 1;
                    } else if (colIndex >= startColumn) {
                        // Kolom 3 ke atas -> mapping normal (shift left by startColumn)
                        sourceColIndex = colIndex - startColumn;
                    }
                    
                    // Ambil data jika sourceColIndex valid
                    if (sourceColIndex >= 0) {
                        const sourceCell = sourceGridData[rowIndex]?.[sourceColIndex];
                        
                        // Log detailed info for first few cells
                        if (rowIndex < 2 && colIndex < 5) {
                            console.log(`🔍 Processing Cell [${rowIndex}][${colIndex}] -> source [${rowIndex}][${sourceColIndex}]:`);
                            console.log('  - sourceCell:', sourceCell);
                            console.log('  - sourceCell type:', typeof sourceCell);
                        }
                        
                        if (sourceCell !== undefined && sourceCell !== null) {
                            // Try multiple ways to extract the value
                            if (typeof sourceCell === 'number') {
                                sourceValue = sourceCell;
                            } else if (typeof sourceCell === 'string') {
                                const parsed = parseFloat(sourceCell);
                                sourceValue = isNaN(parsed) ? 0 : parsed;
                            } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                // Try different property names that might contain the value
                                sourceValue = sourceCell.value || sourceCell.val || sourceCell.data || 
                                             sourceCell.number || sourceCell.num || 0;
                                
                                // If still an object or string, try to parse
                                if (typeof sourceValue === 'string') {
                                    const parsed = parseFloat(sourceValue);
                                    sourceValue = isNaN(parsed) ? 0 : parsed;
                                } else if (typeof sourceValue !== 'number') {
                                    sourceValue = 0;
                                }
                            }
                        }
                        
                        // Ensure it's a valid number
                        if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                            sourceValue = 0;
                        }
                        
                        // Log result for first few cells
                        if (rowIndex < 2 && colIndex < 5) {
                            console.log(`  - Final value: ${sourceValue}`);
                        }
                    }
                    
                    return {
                        ...DEFAULT_CELL_STATE,
                        id: `${rowIndex}-${colIndex}`,
                        row: rowIndex,
                        col: colIndex,
                        value: sourceValue,
                        timestamp: sourceValue > 0 ? Date.now() : null // Set timestamp jika ada nilai
                    };
                })
            );

            console.log('🔄 New grid data sample:', newGridData[0]?.[0]);
            console.log('🔄 Grid data with values > 0:', newGridData.flat().filter(cell => cell.value > 0).length, 'cells');
            console.log('🔄 All values in first row:', newGridData[0]?.map(cell => cell.value));

            // Apply data from top to bottom (Data Pertama)
            setGridData(newGridData);
            setLoadedData1(selectedData);
            
            console.log('✅ Data Pertama loaded successfully starting from column 3');
            
        } catch (error) {
            console.error('❌ Error loading Data Pertama:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }, [gridRows, gridCols]);

    // Handle Load Data Kedua - dimulai dari kolom ke-3 (index 2) sama seperti Data Pertama
    const handleLoadDataKedua = useCallback(async (selectedData) => {
        console.log('🔄 Load Data Kedua clicked:', selectedData);
        console.log('🔍 FULL selectedData structure:', JSON.stringify(selectedData, null, 2));
        
        if (!selectedData || !selectedData.gridData) {
            console.error('❌ No grid data found in selected data');
            console.log('🔍 Available keys in selectedData:', Object.keys(selectedData || {}));
            return;
        }

        try {
            // Parse gridData if it's a string
            let sourceGridData = selectedData.gridData;
            console.log('🔍 Raw gridData type:', typeof sourceGridData);
            console.log('🔍 Raw gridData sample:', sourceGridData);
            
            if (typeof sourceGridData === 'string') {
                console.log('🔄 Parsing gridData from string...');
                sourceGridData = JSON.parse(sourceGridData);
            }

            console.log('🔍 Parsed gridData type:', typeof sourceGridData);
            console.log('🔍 Is array?', Array.isArray(sourceGridData));
            console.log('🔍 Length:', sourceGridData?.length);

            if (!Array.isArray(sourceGridData) || sourceGridData.length === 0) {
                console.error('❌ Invalid grid data format');
                console.log('🔍 GridData structure:', sourceGridData);
                return;
            }

            console.log('📊 Source grid data first row:', sourceGridData[0]);
            console.log('📊 Source grid data sample cell [0][0]:', sourceGridData[0]?.[0]);
            console.log('📊 Source grid dimensions:', sourceGridData.length, 'x', sourceGridData[0]?.length);
            
            const targetRows = parseInt(gridRows);
            const targetCols = parseInt(gridCols);
            const startColumn = 2; // Mulai dari kolom ke-3 (index 2) sama seperti Data Pertama
            
            console.log('🎯 Target grid dimensions:', targetRows, 'x', targetCols);
            console.log('🎯 Data Kedua akan dimulai dari kolom ke-3 (index 2)');

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
                    
                    // PERBAIKAN: Mapping khusus untuk Load Data Kedua
                    if (colIndex === 0) {
                        // Kolom 1 -> ambil dari kolom 3 (index 2) source
                        sourceColIndex = 2;
                    } else if (colIndex === 1) {
                        // Kolom 2 -> ambil dari kolom 2 (index 1) source
                        sourceColIndex = 1;
                    } else if (colIndex >= startColumn) {
                        // Kolom 3 ke atas -> mapping normal (shift left by startColumn)
                        sourceColIndex = colIndex - startColumn;
                    }
                    
                    // Ambil data jika sourceColIndex valid
                    if (sourceColIndex >= 0) {
                        // For bottom-to-top loading, we reverse the row index
                        const sourceRowIndex = (targetRows - 1) - rowIndex;
                        const sourceCell = sourceGridData[sourceRowIndex]?.[sourceColIndex];
                        
                        // Log detailed info for first few cells
                        if (rowIndex < 2 && colIndex < 5) {
                            console.log(`🔍 Processing Cell [${rowIndex}][${colIndex}] -> source [${sourceRowIndex}][${sourceColIndex}]:`);
                            console.log('  - sourceCell:', sourceCell);
                            console.log('  - sourceCell type:', typeof sourceCell);
                        }
                        
                        if (sourceCell !== undefined && sourceCell !== null) {
                            // Try multiple ways to extract the value
                            if (typeof sourceCell === 'number') {
                                sourceValue = sourceCell;
                            } else if (typeof sourceCell === 'string') {
                                const parsed = parseFloat(sourceCell);
                                sourceValue = isNaN(parsed) ? 0 : parsed;
                            } else if (typeof sourceCell === 'object' && sourceCell !== null) {
                                // Try different property names that might contain the value
                                sourceValue = sourceCell.value || sourceCell.val || sourceCell.data || 
                                             sourceCell.number || sourceCell.num || 0;
                                
                                // If still an object or string, try to parse
                                if (typeof sourceValue === 'string') {
                                    const parsed = parseFloat(sourceValue);
                                    sourceValue = isNaN(parsed) ? 0 : parsed;
                                } else if (typeof sourceValue !== 'number') {
                                    sourceValue = 0;
                                }
                            }
                        }
                        
                        // Ensure it's a valid number
                        if (typeof sourceValue !== 'number' || isNaN(sourceValue)) {
                            sourceValue = 0;
                        }
                        
                        // Log result for first few cells
                        if (rowIndex < 2 && colIndex < 5) {
                            console.log(`  - Final value: ${sourceValue}`);
                        }
                    }
                    
                    // PERBAIKAN: Gabungkan data dengan penjumlahan sesuai permintaan
                    const existingValue = parseFloat(cell.value) || 0;
                    let combinedValue;
                    
                    if (existingValue > 0 && sourceValue > 0) {
                        // Jika kedua data ada, jumlahkan nilainya
                        combinedValue = existingValue + sourceValue;
                        console.log(`🔢 Data bertemu di sel [${rowIndex}][${colIndex}]: ${existingValue} + ${sourceValue} = ${combinedValue}`);
                    } else if (existingValue > 0) {
                        // Jika hanya data pertama yang ada
                        combinedValue = existingValue;
                    } else if (sourceValue > 0) {
                        // Jika hanya data kedua yang ada
                        combinedValue = sourceValue;
                    } else {
                        // Jika tidak ada data
                        combinedValue = 0;
                    }
                    
                    // Log untuk beberapa sel pertama untuk debugging
                    if (rowIndex < 3 && colIndex < 3) {
                        console.log(`Sel [${rowIndex}][${colIndex}]:`, 
                                   `data lama: ${existingValue}, data baru: ${sourceValue}, hasil gabungan: ${combinedValue}`);
                    }
                    
                    return {
                        ...cell,
                        value: combinedValue,
                        timestamp: combinedValue > 0 ? Date.now() : null // Set timestamp jika ada nilai
                    };
                })
            );

            console.log('🔄 New grid data sample after Data Kedua:', newGridData[0]?.[0]);
            console.log('🔄 Grid data with values > 0 after Data Kedua:', newGridData.flat().filter(cell => cell.value > 0).length, 'cells');
            console.log('🔄 All values in first row after Data Kedua:', newGridData[0]?.map(cell => cell.value));

            setGridData(newGridData);
            setLoadedData2(selectedData);
            
            console.log('✅ Data Kedua loaded successfully starting from column 3 and combined with existing data');
            
        } catch (error) {
            console.error('❌ Error loading Data Kedua:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }, [gridRows, gridCols, gridData]);

    // Handle Reset Grid
    const handleResetGrid = useCallback(() => {
        if (!gridRows || !gridCols) {
            alert('Silakan masukkan ukuran grid terlebih dahulu');
            return;
        }
        
        console.log('🔄 Resetting grid - clearing all data');
        
        // Reset loaded data states
        setLoadedData1(null);
        setLoadedData2(null);
        
        // Create empty grid
        const targetRows = parseInt(gridRows);
        const targetCols = parseInt(gridCols);
        const emptyGrid = Array.from({ length: targetRows }, (_, rowIndex) =>
            Array.from({ length: targetCols }, (_, colIndex) => ({
                ...DEFAULT_CELL_STATE,
                id: `${rowIndex}-${colIndex}`,
                row: rowIndex,
                col: colIndex,
                value: 0,
                timestamp: null // Explicitly set timestamp to null for empty cells
            }))
        );
        
        // Set empty grid
        setGridData(emptyGrid);
        
        console.log('✅ Grid reset completed - all cells cleared to 0');
    }, [gridRows, gridCols, createEmptyGrid]);

    // Standar acuan untuk setiap jenis jalan berdasarkan tabel yang diberikan
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

    // Handle Analyze Data
    const handleAnalyzeData = useCallback(() => {
        if (!selectedRoadType) {
            alert('Silakan pilih jenis jalan terlebih dahulu');
            return;
        }
        
        if (!gridStats || gridStats.totalCells === 0) {
            alert('Tidak ada data untuk dianalisis');
            return;
        }
        
        console.log('🔍 Analyzing data for road type:', selectedRoadType);
        
        // Tampilkan modal sesuai jenis jalan
        if (selectedRoadType === 'arterial') {
            setShowArterialAlert(true);
        } else if (selectedRoadType === 'collector') {
            setShowCollectorAlert(true);
        } else if (selectedRoadType === 'local') {
            setShowLocalAlert(true);
        } else if (selectedRoadType === 'lingkungan') {
            setShowLingkunganAlert(true);
        }
    }, [selectedRoadType, gridStats]);

    // Helper untuk menghitung statistik grid
    const calculateGridStats = (grid) => {
        if (!grid || grid.length === 0) {
            return { lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0, compliance: null };
        }

        const values = [];
        
        // Kumpulkan semua nilai yang > 0
        grid.forEach(row => {
            row.forEach(cell => {
                const value = Number(cell.value) || 0;
                if (value > 0) {
                    values.push(value);
                }
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
    };

    // Road type options
    const roadTypes = [
        { value: 'arterial', label: 'Arterial', description: 'Jalan utama dengan lalu lintas tinggi' },
        { value: 'collector', label: 'Kolektor', description: 'Jalan penghubung dengan lalu lintas sedang' },
        { value: 'local', label: 'Lokal', description: 'Jalan lokal dengan lalu lintas rendah' },
        { value: 'lingkungan', label: 'Lingkungan', description: 'Jalan lingkungan dengan lalu lintas sangat rendah' }
    ];

    // Grid configuration - HANYA berdasarkan gridData yang sudah ada, TIDAK auto dari input
    const gridConfig = useMemo(() => {
        if (gridData && gridData.length > 0) {
            return {
                rows: gridData.length,
                cols: gridData[0]?.length || 0
            };
        }
        
        return { rows: 0, cols: 0 };
    }, [gridData]);

    // Real-time statistics calculation
    React.useEffect(() => {
        if (gridData && gridData.length > 0) {
            const stats = calculateGridStats(gridData);
            setGridStats(stats);
        } else {
            setGridStats({ lMin: 0, lMax: 0, lAvg: 0, uniformityRatio: 0, totalCells: 0 });
        }
    }, [gridData]);

    // Project info for grid header
    const projectInfo = useMemo(() => ({
        title: `Kemerataan Sinar - ${roadTypes.find(r => r.value === selectedRoadType)?.label || ''}`,
        location: 'Analisis Kemerataan',
        date: new Date().toISOString()
    }), [selectedRoadType, roadTypes]);

    // Manual grid creation - hanya saat button "Terapkan Grid" ditekan
    const handleStartGrid = useCallback(() => {
        console.log('🔄 Terapkan Grid dipicu - mempertahankan data yang ada');
        
        const hasRoadType = !!selectedRoadType;
        const hasCustomGrid = !!(gridRows && gridCols);
        const hasSpan = !!selectedSpan;
        
        if (!hasRoadType) {
            alert('Silakan pilih jenis jalan terlebih dahulu');
            return;
        }
        
        let targetRows, targetCols;
        
        if (hasCustomGrid) {
            targetRows = parseInt(gridRows);
            targetCols = parseInt(gridCols);
        } else if (hasSpan) {
            targetRows = parseInt(selectedSpan);
            targetCols = 22;
        } else {
            alert('Silakan masukkan ukuran grid atau pilih span');
            return;
        }
        
        // Validasi ukuran grid
        if (isNaN(targetRows) || isNaN(targetCols) || targetRows <= 0 || targetCols <= 0) {
            alert('Ukuran grid tidak valid');
            return;
        }
        
        console.log('🎯 Membuat grid dengan dimensi:', targetRows, 'x', targetCols);
        console.log('🔄 Dimensi grid saat ini:', gridData.length, 'x', (gridData[0]?.length || 0));
        
        const currentRows = gridData.length;
        const currentCols = gridData[0]?.length || 0;
        
        // Buat grid baru dengan ukuran target
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
        
        // PERBAIKAN: Jika ada data yang sudah di-load, terapkan ulang ke grid baru
        if (loadedData1 || loadedData2) {
            console.log('🔄 Menerapkan ulang data yang sudah di-load ke grid baru');
            
            // Terapkan ulang Data Pertama jika ada
            if (loadedData1) {
                console.log('🔄 Menerapkan ulang Data Pertama ke grid baru');
                try {
                    let sourceGridData = loadedData1.gridData;
                    if (typeof sourceGridData === 'string') {
                        sourceGridData = JSON.parse(sourceGridData);
                    }
                    
                    if (Array.isArray(sourceGridData) && sourceGridData.length > 0) {
                        const startColumn = 2; // Mulai dari kolom ke-3 (index 2)
                        
                        for (let rowIndex = 0; rowIndex < Math.min(targetRows, sourceGridData.length); rowIndex++) {
                            for (let colIndex = 0; colIndex < targetCols; colIndex++) {
                                let sourceValue = 0;
                                let sourceColIndex = -1;
                                
                                // Mapping kolom yang sama seperti di handleLoadDataPertama
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
                        console.log('✅ Data Pertama berhasil diterapkan ulang ke grid baru');
                    }
                } catch (error) {
                    console.error('❌ Error menerapkan ulang Data Pertama:', error);
                }
            }
            
            // Terapkan ulang Data Kedua jika ada (dengan penggabungan)
            if (loadedData2) {
                console.log('🔄 Menerapkan ulang Data Kedua ke grid baru');
                try {
                    let sourceGridData = loadedData2.gridData;
                    if (typeof sourceGridData === 'string') {
                        sourceGridData = JSON.parse(sourceGridData);
                    }
                    
                    if (Array.isArray(sourceGridData) && sourceGridData.length > 0) {
                        const startColumn = 2; // Mulai dari kolom ke-3 (index 2)
                        
                        for (let rowIndex = 0; rowIndex < targetRows; rowIndex++) {
                            for (let colIndex = 0; colIndex < targetCols; colIndex++) {
                                let sourceValue = 0;
                                let sourceColIndex = -1;
                                
                                // Mapping kolom yang sama seperti di handleLoadDataKedua
                                if (colIndex === 0) {
                                    sourceColIndex = 2;
                                } else if (colIndex === 1) {
                                    sourceColIndex = 1;
                                } else if (colIndex >= startColumn) {
                                    sourceColIndex = colIndex - startColumn;
                                }
                                
                                if (sourceColIndex >= 0) {
                                    // For bottom-to-top loading, reverse the row index
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
                                            // Gabungkan dengan data yang sudah ada
                                            const existingValue = parseFloat(newGridData[rowIndex][colIndex].value) || 0;
                                            const combinedValue = existingValue + sourceValue;
                                            
                                            newGridData[rowIndex][colIndex].value = combinedValue;
                                            newGridData[rowIndex][colIndex].timestamp = Date.now();
                                            
                                            if (existingValue > 0) {
                                                console.log(`➕ Data bertemu di [${rowIndex}][${colIndex}]: ${existingValue} + ${sourceValue} = ${combinedValue}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        console.log('✅ Data Kedua berhasil diterapkan ulang ke grid baru');
                    }
                } catch (error) {
                    console.error('❌ Error menerapkan ulang Data Kedua:', error);
                }
            }
        }
        // FALLBACK: Jika tidak ada data yang di-load tapi ada data di grid lama, coba pertahankan
        else if (currentRows > 0 && currentCols > 0 && gridData.length > 0) {
            console.log(`🔄 Mempertahankan data dari grid lama ${currentRows}x${currentCols} ke ${targetRows}x${targetCols}`);
            
            // Jika ukuran grid sama, pertahankan posisi data
            if (currentRows === targetRows && currentCols === targetCols) {
                for (let row = 0; row < Math.min(currentRows, targetRows); row++) {
                    for (let col = 0; col < Math.min(currentCols, targetCols); col++) {
                        const existingCell = gridData?.[row]?.[col];
                        if (existingCell && typeof existingCell.value !== 'undefined') {
                            newGridData[row][col].value = existingCell.value;
                            newGridData[row][col].timestamp = existingCell.timestamp;
                            newGridData[row][col].type = existingCell.type || 'normal';
                            newGridData[row][col].description = existingCell.description || '';
                            newGridData[row][col].image = existingCell.image || null;
                            newGridData[row][col].location = existingCell.location || null;
                        }
                    }
                }
                console.log('📋 Ukuran sama - mempertahankan semua posisi data');
            }
            // Jika ukuran berbeda, lakukan mapping yang lebih sederhana dan aman
            else {
                // Strategi baru: pertahankan data dalam area yang overlap
                const minRows = Math.min(currentRows, targetRows);
                const minCols = Math.min(currentCols, targetCols);
                
                for (let row = 0; row < minRows; row++) {
                    for (let col = 0; col < minCols; col++) {
                        const existingCell = gridData?.[row]?.[col];
                        if (existingCell && typeof existingCell.value !== 'undefined') {
                            const existingValue = parseFloat(existingCell.value) || 0;
                            if (existingValue > 0) {
                                newGridData[row][col].value = existingValue;
                                newGridData[row][col].timestamp = existingCell.timestamp;
                                newGridData[row][col].type = existingCell.type || 'normal';
                                newGridData[row][col].description = existingCell.description || '';
                                newGridData[row][col].image = existingCell.image || null;
                                newGridData[row][col].location = existingCell.location || null;
                            }
                        }
                    }
                }
                
                console.log(`📋 Data dipertahankan dalam area overlap ${minRows}x${minCols}`);
            }
        }
        
        console.log(`🔄 Grid berubah menjadi: ${targetRows} x ${targetCols}`);
        console.log(`📊 Data yang dipertahankan: ${newGridData.flat().filter(cell => cell && parseFloat(cell.value) > 0).length} sel`);
        console.log(`📊 Total sel baru: ${newGridData.flat().length} sel`);
        
        // Update grid data
        setGridData(newGridData);
        setShowGrid(true);
        console.log('✅ Grid berhasil diterapkan dengan data yang dipertahankan');
        
    }, [selectedRoadType, selectedSpan, gridRows, gridCols, gridData, loadedData1, loadedData2]);

    const handleCellClick = (rowIndex, colIndex) => {
        console.log(`Uniformity cell clicked: ${rowIndex}, ${colIndex}`);
    };

    // If mobile, render mobile version
    if (isMobile) {
        return <UniformityPageMobile onBack={onBack} user={user} onLogout={onLogout} />;
    }

    if (showGrid) {
        return (
            <div className="w-full min-h-screen bg-gray-50 flex">
                {/* Sidebar */}
                <UniformitySidebar
                    selectedRoadType={selectedRoadType}
                    setSelectedRoadType={setSelectedRoadType}
                    selectedSpan={selectedSpan}
                    setSelectedSpan={setSelectedSpan}
                    gridRows={gridRows}
                    setGridRows={setGridRows}
                    gridCols={gridCols}
                    setGridCols={setGridCols}
                    onStartGrid={handleStartGrid}
                    onLoadDataPertama={handleLoadDataPertama}
                    onLoadDataKedua={handleLoadDataKedua}
                    onResetGrid={handleResetGrid}
                    onAnalyzeData={handleAnalyzeData}
                    gridStats={gridStats}
                    loadedData1={loadedData1}
                    loadedData2={loadedData2}
                />
                
                {/* Main Content */}
                <div className="flex-1 p-4">
                    {/* Grid Header */}
                    <div className="mb-4">
                        <GridHeader
                            projectInfo={projectInfo}
                            selectedName={user?.displayName || user?.email || 'Petugas'}
                            selectedPower="Analisis Kemerataan"
                            selectedHeight={`Span ${selectedSpan}`}
                            selectedTegangan={roadTypes.find(r => r.value === selectedRoadType)?.label || ''}
                            onToggleHeader={() => {}}
                            projectLocationStatus={null}
                            user={user}
                            onLogout={handleLogout}
                        />
                    </div>

                    {/* Grid Container with Labels */}
                    <div className="bg-white rounded-xl shadow-sm p-2 overflow-auto">
                        <div className="flex flex-col items-center">
                            {/* Lebar Jalan Label (Top) */}
                            <div className="mb-1 text-sm font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded">
                                Lebar Jalan (m)
                            </div>

                            {/* Grid with Left Label */}
                            <div className="flex items-start">
                                {/* Jarak Tiang Label (Left) */}
                                <div className="flex items-center justify-center" style={{
                                    minHeight: `${gridConfig.rows * 60}px`,
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    width: '18px'
                                }}>
                                    <div className="text-sm font-medium text-gray-700 bg-gray-100 rounded" style={{
                                        padding: '4px 2px',
                                        lineHeight: '1.2'
                                    }}>
                                        Jarak Tiang (m)
                                    </div>
                                </div>

                                {/* Main Grid */}
                                <div className="grid gap-0.5" style={{
                                    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                                    maxWidth: 'fit-content'
                                }}>
                                    {gridData.map((row, rowIndex) =>
                                        row.map((cell, colIndex) => (
                                            <GridCell
                                                key={cell.id}
                                                cellData={cell}
                                                rowIndex={rowIndex}
                                                colIndex={colIndex}
                                                onCellClick={handleCellClick}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Grid Info */}
                        <div className="mt-2 text-center">
                            <div className="inline-flex items-center gap-2 bg-gray-50 rounded px-2 py-1 text-xs">
                                <span className="text-gray-700">Jarak: {gridConfig.rows}m</span>
                                <div className="w-px h-3 bg-gray-300"></div>
                                <span className="text-gray-700">Lebar: {gridConfig.cols}m</span>
                                <div className="w-px h-3 bg-gray-300"></div>
                                <span className="text-gray-600">Total: {gridConfig.rows * gridConfig.cols}</span>
                            </div>
                        </div>

                        {/* Grid Statistics */}
                        {gridStats.totalCells > 0 && (
                            <div className="mt-3 text-center">
                                <div className="inline-flex items-center gap-4 bg-blue-50 rounded-lg px-4 py-2 text-sm">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-blue-800">L-Min:</span>
                                        <span className="text-blue-700">{gridStats.lMin}</span>
                                    </div>
                                    <div className="w-px h-4 bg-blue-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-blue-800">L-Max:</span>
                                        <span className="text-blue-700">{gridStats.lMax}</span>
                                    </div>
                                    <div className="w-px h-4 bg-blue-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-blue-800">L-Avg:</span>
                                        <span className="text-blue-700">{gridStats.lAvg}</span>
                                    </div>
                                    <div className="w-px h-4 bg-blue-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-blue-800">Uniformity Ratio:</span>
                                        <span className="text-blue-700">{gridStats.uniformityRatio}</span>
                                    </div>
                                    <div className="w-px h-4 bg-blue-300"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-blue-800">Data:</span>
                                        <span className="text-blue-700">{gridStats.totalCells} sel</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex">
            {/* Header Buttons - Fixed Position */}
            <div className="fixed top-4 right-4 z-50 flex gap-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
                    title="Kembali ke Dashboard"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Kembali</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>

            {/* Sidebar */}
            <UniformitySidebar
                selectedRoadType={selectedRoadType}
                setSelectedRoadType={setSelectedRoadType}
                selectedSpan={selectedSpan}
                setSelectedSpan={setSelectedSpan}
                gridRows={gridRows}
                setGridRows={setGridRows}
                gridCols={gridCols}
                setGridCols={setGridCols}
                onStartGrid={handleStartGrid}
                onLoadDataPertama={handleLoadDataPertama}
                onLoadDataKedua={handleLoadDataKedua}
                onResetGrid={handleResetGrid}
                gridStats={gridStats}
            />
            
            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        <Sun className="w-12 h-12 text-orange-500 mr-4" />
                        <h1 className="text-4xl font-bold text-gray-800">Analisis Kemerataan Sinar</h1>
                    </div>
                    <p className="text-gray-600 text-lg">Pilih jenis jalan dan span untuk memulai analisis</p>

                    {/* User Info */}
                    {user && (
                        <div className="text-center mt-6">
                            <p className="text-gray-600">
                                Logged in as: <span className="font-semibold">{user.displayName || user.email}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UniformityPage;

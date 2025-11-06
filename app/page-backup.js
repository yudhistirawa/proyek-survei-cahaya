"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Archive, Menu, Trash2, X, Image as ImageIcon, Download, ChevronLeft, ChevronRight, AlertCircle, Save, Shield, Eye, FileSpreadsheet, PlusCircle, RotateCw, MapPin, Clock, CheckCircle, XCircle as XCircleIcon, ChevronsLeft, ChevronsRight, Edit, Search, ChevronDown, ChevronUp, Lightbulb, Zap, GripVertical, Check, Wifi, WifiOff, Upload } from 'lucide-react';
import Image from 'next/image';
import DocumentationModal from './components/DocumentationModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import { storage } from './lib/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
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

const db = getFirestore(firebaseApp);

// Global async sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ===================================================================================
// == KONFIGURASI & STATE AWAL (FRONTEND) ==
// ===================================================================================
const GRID_ROWS = 45;
const GRID_COLS = 35;
const DEFAULT_CELL_STATE = { value: '', description: '', image: null, type: 'normal', timestamp: null, location: null };

const COLORS = {
    api: 'bg-red-500 text-white', // keep unchanged
    tiang: 'bg-yellow-500 text-black', // keep unchanged or remove if unused
    level0: 'bg-[#FFFFFF] text-black', // putih
    level1: 'bg-[#FFFFFF] text-black', // putih
    level2: 'bg-[#FFFFF0] text-black',
    level3: 'bg-[#FFFFE0] text-black',
    level4: 'bg-[#FFFFC0] text-black',
    level5: 'bg-[#FFFFA0] text-black',
    level6: 'bg-[#FFFF80] text-black',
    level7: 'bg-[#FFFF60] text-black',
    level8: 'bg-[#FFFF40] text-black',
    level9: 'bg-[#FFFF20] text-black',
    level10: 'bg-[#FFFF10] text-black',
    level11: 'bg-[#FFFF00] text-black', // kuning cerah penuh
    zero: 'bg-slate-200 text-slate-500' // keep unchanged or adjust if needed
};

const COLOR_LEGEND_DATA = [
    { label: 'Titik Api', color: COLORS.api },
    { label: '90.00 - 100.90', color: COLORS.level11 },
    { label: '80.00 - 89.90', color: COLORS.level10 },
    { label: '70.00 - 79.90', color: COLORS.level9 },
    { label: '60.00 - 69.90', color: COLORS.level8 },
    { label: '50.00 - 59.90', color: COLORS.level7 },
    { label: '40.00 - 49.90', color: COLORS.level6 },
    { label: '30.00 - 39.90', color: COLORS.level5 },
    { label: '20.00 - 29.90', color: COLORS.level4 },
    { label: '10.00 - 19.90', color: COLORS.level3 },
    { label: '5.00 - 9.90', color: COLORS.level2 },
    { label: '0.10 - 4.90', color: COLORS.level1 },
    { label: '0.00 - 0.04', color: COLORS.level0 },
];

const HEIGHT_OPTIONS = ['5 Meter', '6 Meter', '7 Meter', '8 Meter', '9 Meter', '9.5 Meter','10 Meter'];
const REPORTS_PER_PAGE = 9;


// Ikon Kustom
const LampPostIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21h6" /><path d="M12 21v-8" /><path d="M12 8c-1.93 0-3.5-1.57-3.5-3.5S10.07 1 12 1s3.5 1.57 3.5 3.5" /><path d="M8.5 6.5h7" /></svg>
);
const SurveyorIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
);
const CustomCalendarIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

// Custom Hook untuk Debouncing
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// Komponen untuk menampilkan status lokasi real-time
const LocationStatusIndicator = ({ location, accuracy, error, isLoading }) => {
    const getStatusColor = () => {
        if (error) return 'text-red-500';
        if (isLoading) return 'text-yellow-500';
        if (accuracy && accuracy < 10) return 'text-green-500';
        if (accuracy && accuracy < 50) return 'text-yellow-500';
        return 'text-orange-500';
    };

    const getStatusIcon = () => {
        if (error) return <WifiOff size={14} />;
        if (isLoading) return <RotateCw size={14} className="animate-spin" />;
        return <Wifi size={14} />;
    };

    const getStatusText = () => {
        if (error) return 'GPS Error';
        if (isLoading) return 'Mencari GPS...';
        if (location && accuracy) {
            if (accuracy < 10) return `GPS Akurat (±${Math.round(accuracy)}m)`;
            if (accuracy < 50) return `GPS Baik (±${Math.round(accuracy)}m)`;
            return `GPS Lemah (±${Math.round(accuracy)}m)`;
        }
        return 'GPS Tidak Aktif';
    };

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
        </div>
    );
};

// Komponen untuk menampilkan koordinat real-time
const RealtimeLocationDisplay = ({ location, accuracy, className = "" }) => {
    if (!location) {
        return (
            <div className={`flex items-center gap-2 p-2 bg-gray-200 rounded-lg ${className}`}>
                <MapPin size={14} className="text-gray-500"/>
                <span className="text-xs text-gray-600">Mendapatkan lokasi...</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg ${className}`}>
            <MapPin size={14} className="text-green-600"/>
            <div className="flex flex-col">
                <span className="text-xs text-green-800 font-medium">
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </span>
                {accuracy && (
                    <span className="text-xs text-green-600">
                        Akurasi: ±{Math.round(accuracy)}m
                    </span>
                )}
            </div>
        </div>
    );
};



const getTimezoneInfo = (longitude) => {
    if (longitude >= 95.0 && longitude < 112.5) {
        return { name: 'WIB', iana: 'Asia/Jakarta' };
    } else if (longitude >= 112.5 && longitude < 127.5) {
        return { name: 'WITA', iana: 'Asia/Makassar' };
    } else if (longitude >= 127.5 && longitude <= 141.0) {
        return { name: 'WIT', iana: 'Asia/Jayapura' };
    }
    return { name: 'WIB', iana: 'Asia/Jakarta' }; // Default ke WIB jika di luar jangkauan
};

// Helper function to convert grid data to an XLSX workbook object using SheetJS with styling
const convertGridToXLSX = (gridData, projectInfo, reportDetails) => {
    if (typeof XLSX === 'undefined') {
        console.error("SheetJS library not loaded. Please include it in your project.");
        throw new Error("Pustaka export (SheetJS) tidak termuat.");
    }

    const BORDER_STYLE = { style: 'thin', color: { auto: 1 } };
    const BORDERS = { top: BORDER_STYLE, bottom: BORDER_STYLE, left: BORDER_STYLE, right: BORDER_STYLE };

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4F81BD" } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const infoTitleStyle = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
    };
    const infoLabelStyle = { font: { bold: true } };

    const COLOR_HEX_MAP = {
        api: { fg: "ef4444", text: "FFFFFF" },
        level11: { fg: "581c87", text: "FFFFFF" },
        level10: { fg: "991b1b", text: "FFFFFF" },
        level9: { fg: "dc2626", text: "FFFFFF" },
        level8: { fg: "2563eb", text: "FFFFFF" },
        level7: { fg: "facc15", text: "000000" },
        level6: { fg: "fde047", text: "000000" },
        level5: { fg: "7dd3fc", text: "000000" },
        level4: { fg: "a3e635", text: "000000" },
        level3: { fg: "86efac", text: "000000" },
        level2: { fg: "ffffff", text: "000000" },
        level1: { fg: "6b7280", text: "FFFFFF" },
        zero: { fg: "e2e8f0", text: "64748b" }
    };

    const getCellStyle = (cell) => {
        let key = 'zero';
        if (cell && cell.timestamp !== null) {
            if (cell.type === 'api') key = 'api';
            else {
                const value = cell.value;
                if (value >= 80) key = 'level11';
                else if (value >= 70) key = 'level10';
                else if (value >= 60) key = 'level9';
                else if (value >= 50) key = 'level8';
                else if (value >= 40) key = 'level7';
                else if (value >= 30) key = 'level6';
                else if (value >= 20) key = 'level5';
                else if (value >= 10) key = 'level4';
                else if (value >= 5) key = 'level3';
                else if (value >= 0.5) key = 'level2';
                else if (value > 0) key = 'level1';
            }
        }
        const colors = COLOR_HEX_MAP[key];
        return {
            font: { color: { rgb: colors.text } },
            fill: { fgColor: { rgb: colors.fg } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: BORDERS
        };
    };

    const firePoints = [];
    gridData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell.type === 'api') {
                firePoints.push(`Jarak ${rowIndex + 1}m, Lebar ${colIndex + 1}m`);
            }
        });
    });

    let firePointsInfo = [
        ["TITIK API TERDETEKSI", null],
        ...firePoints.map(point => [point, null])
    ];

    if (firePoints.length === 0) {
        firePointsInfo = [["TITIK API TERDETEKSI", "Tidak ada"]];
    }
    
    firePointsInfo.push([]);

    const reportHeaderData = [
        ["INFO LAPORAN", null],
        ["Nama Lampu:", projectInfo.title],
        ["Lokasi Proyek:", projectInfo.location],
        ["Tanggal Survei:", new Date(projectInfo.date).toLocaleDateString('id-ID')],
        ["Nama Petugas:", reportDetails.surveyorName],
        ["Daya Lampu:", reportDetails.lampPower],
        ["Tinggi Tiang:", reportDetails.poleHeight],
        ["Tegangan Awal:", reportDetails.initialVoltage],
        ["L-Min:", reportDetails.stats.lmin],
        ["L-Max:", reportDetails.stats.lmax],
        ["L-Avg:", reportDetails.stats.lavg],
        [],
        ...firePointsInfo
    ];

    const gridHeaderRow = [`Jarak (m) \\ Lebar (m)`];
    for (let j = 0; j < GRID_COLS; j++) gridHeaderRow.push(j + 1);
    const gridTable = [gridHeaderRow];

    gridData.forEach((row, rowIndex) => {
        const rowData = [`${rowIndex + 1}`];
        row.forEach((cell) => {
            let cellValue = null;
            if (cell.timestamp !== null) {
                if (typeof cell.value === 'string') {
                    // If string is empty or whitespace only, treat as empty cell
                    if (cell.value.trim() === '') {
                        cellValue = null;
                    } else {
                        // Try to parse as float, fallback to string
                        const parsed = parseFloat(cell.value);
                        cellValue = isNaN(parsed) ? cell.value : parsed;
                    }
                } else if (typeof cell.value === 'number') {
                    cellValue = cell.value;
                } else {
                    cellValue = null;
                }
            } else {
                cellValue = null;
            }
            rowData.push(cellValue);
        });
        gridTable.push(rowData);
    });

    const finalData = [...reportHeaderData, ...gridTable];
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    ws['A1'].s = infoTitleStyle;

    for (let i = 1; i < 11; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
        if (ws[cellRef]) ws[cellRef].s = infoLabelStyle;
    }
    
    const firePointStartRow = 12;
    const firePointTitleRef = XLSX.utils.encode_cell({ r: firePointStartRow, c: 0 });
    if(ws[firePointTitleRef]) {
        ws[firePointTitleRef].s = { font: { bold: true, sz: 12, color: { rgb: "FF0000" } }, alignment: {horizontal: 'center'} };
        ws['!merges'].push({ s: { r: firePointStartRow, c: 0 }, e: { r: firePointStartRow, c: 3 } });
    }

    const gridStartRow = reportHeaderData.length;

    for (let c = 0; c < gridHeaderRow.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: gridStartRow, c: c });
        if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    gridData.forEach((row, r_idx) => {
        const rowHeaderRef = XLSX.utils.encode_cell({ r: gridStartRow + 1 + r_idx, c: 0 });
        if(ws[rowHeaderRef]) ws[rowHeaderRef].s = headerStyle;

        row.forEach((cell, c_idx) => {
            const cellRef = XLSX.utils.encode_cell({ r: gridStartRow + 1 + r_idx, c: c_idx + 1 });
            if (ws[cellRef]) {
                ws[cellRef].s = getCellStyle(cell);
                if(typeof ws[cellRef].v === 'number'){
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = '0.00';
                }
            }
        });
    });

    ws['!cols'] = [ { wch: 25 }, { wch: 40 }, ];
    for (let i = 0; i < GRID_COLS; i++) {
        ws['!cols'][i + 1] = { wch: 10 };
    }
    ws['!cols'][0] = { wch: 20 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Survei Lux");

    return wb;
};

// ===================================================================================
// == KOMPONEN KECIL (UI HELPERS) ==
// ===================================================================================

const EditCellModal = ({ isOpen, onClose, cellData, onSave, onDelete, cellCoords, isAdminEdit = false, onImageClick, surveyorName }) => {
    const [data, setData] = useState(DEFAULT_CELL_STATE);
    const [isVisible, setIsVisible] = useState(false);
    const [dateTime, setDateTime] = useState({ date: '', time: ''});
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const luxInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Location history state
    const [locationHistory, setLocationHistory] = useState([]);

    // Use real-time location hook
    const {
        location: currentLocation,
        accuracy: locationAccuracy,
        error: locationError,
        isLoading: isLoadingLocation,
        timestamp: locationTimestamp,
        startWatching,
        stopWatching
    } = useRealtimeLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        distanceFilter: 0.1, // Ultra-sensitive updates (~10 cm)
        autoStart: false
    });

    // Calculate timezone based on current location
    const locationTimezone = useMemo(() => {
        if (currentLocation) {
            return getTimezoneInfo(currentLocation.lon);
        }
        return { name: 'WIB', iana: 'Asia/Jakarta' };
    }, [currentLocation]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                luxInputRef.current?.focus();
            }, 10);
            
            // Start watching location when modal opens
            startWatching();

            return () => { 
                clearTimeout(timer);
                stopWatching();
            };
        }
    }, [isOpen, startWatching, stopWatching]);

    useEffect(() => {
        if (isOpen) {
            const intervalId = setInterval(() => {
                const now = new Date();
                setDateTime({
                    date: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: locationTimezone.iana }),
                    time: `${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: locationTimezone.iana })} ${locationTimezone.name}`
                });
            }, 1000);

            return () => clearInterval(intervalId);
        }
    }, [isOpen, locationTimezone]);

    useEffect(() => {
        if (cellData) {
            setData(cellData);
            if (cellData.location) {
                setLocationHistory([cellData.location]);
            } else {
                setLocationHistory([]);
            }
        } else {
            setData(DEFAULT_CELL_STATE);
            setLocationHistory([]);
        }
    }, [cellData]);

    // Update location in data state and location history when currentLocation changes (for petugas)
    useEffect(() => {
        if (!isAdminEdit && currentLocation) {
            setData(prev => ({ ...prev, location: currentLocation }));
            setLocationHistory(prev => {
                const lastLocation = prev[prev.length - 1];
                if (!lastLocation || lastLocation.lat !== currentLocation.lat || lastLocation.lon !== currentLocation.lon) {
                    return [...prev, currentLocation];
                }
                return prev;
            });
        }
    }, [currentLocation, isAdminEdit]);

    // Location validation according to grid cell position and location
    const locationValidation = useMemo(() => {
        if (!data.location) return { isValid: false, message: 'Lokasi tidak tersedia' };

        // Example validation: check if location is within 50 meters of expected cell location
        // Assuming cellCoords has row and col, and each cell corresponds to a lat/lon range or center
        // For demo, just validate if accuracy is less than 50 meters
        if (locationAccuracy && locationAccuracy <= 50) {
            return { isValid: true, message: 'Lokasi valid' };
        }
        return { isValid: false, message: 'Akurasi lokasi kurang baik' };
    }, [data.location, locationAccuracy]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    }, [onClose]);

const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if(type === 'radio'){
        setData(prev => ({ ...prev, [name]: value }));
    } else {
        if(name === 'value') {
            // For admin input, value is stored as string, so do not parseFloat here
            if(typeof value === 'string') {
                setData(prev => ({ ...prev, [name]: value }));
            } else {
                setData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setData(prev => ({ ...prev, [name]: value }));
        }
    }
};

    const addWatermarkToImage = async (file, surveyorName, location) => {
        return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize image to max 1024x1024 while maintaining aspect ratio
                    const MAX_SIZE = 1024;
                    let { width, height } = img;
                    
                    if (width > height && width > MAX_SIZE) {
                        height = (height * MAX_SIZE) / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width = (width * MAX_SIZE) / height;
                        height = MAX_SIZE;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Add watermark
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                    });
                    const timeStr = now.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    let locationStr = 'GPS: Tidak tersedia';
                    let streetName = '';
                    if (location) {
                        // Fetch street name with timeout to avoid hanging
                        const fetchWithTimeout = (url, ms = 3000) => {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), ms);
                            return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
                        };
                        locationStr = `GPS: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
                        try {
                            const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lon}`);
                            if (response.ok) {
                                const data = await response.json();
                                const road = data.address?.road || '';
                                const city = data.address?.city || data.address?.town || data.address?.county || '';
                                streetName = [road, city].filter(Boolean).join(', ');
                                if (!streetName) {
                                    streetName = data.display_name?.split(',').slice(0, 2).join(', ') || '';
                                }
                            }
                        } catch (error) {
                            console.warn('Gagal mendapatkan nama jalan untuk watermark:', error);
                        }
                    }
                    
                    // Build watermark text with surveyor name, date/time, location, and street name
                    let watermarkText = `Petugas: ${surveyorName || 'Tidak diketahui'}\n${dateStr} ${timeStr}\n${locationStr}`;
                    if (streetName) {
                        watermarkText += `\n${streetName}`;
                    }
                    
                    // Watermark styling
                    const fontSize = Math.max(12, Math.min(width, height) * 0.025);
                    ctx.font = `${fontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 2;
                    
                    // Calculate watermark position (bottom right)
                    const lines = watermarkText.split('\n');
                    const lineHeight = fontSize * 1.2;
                    const padding = 10;
                    
                    // Draw background rectangle
                    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
                    const rectWidth = maxLineWidth + padding * 2;
                    const rectHeight = lines.length * lineHeight + padding * 2;
                    const rectX = width - rectWidth - 10;
                    const rectY = height - rectHeight - 10;
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                    
                    // Draw text
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    
                    lines.forEach((line, index) => {
                        const textX = rectX + padding;
                        const textY = rectY + padding + (index * lineHeight);
                        ctx.fillText(line, textX, textY);
                    });
                    
                    canvas.toBlob((blob)=>{ if(blob) resolve(blob); else reject(new Error('Konversi canvas ke Blob gagal')); }, 'image/webp', 0.8);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const oldImageUrl = data.image;

        // Helper: auto save logic after upload
        const autoSaveAfterUpload = async (downloadURL) => {
            const currentStateData = data;

            const updatedData = {
                ...currentStateData, // mempertahankan seluruh field yg ada
                image: downloadURL,
                timestamp: new Date().toISOString(),
                location: isAdminEdit ? currentStateData.location : currentLocation,
            };

            if (!isAdminEdit) {
                // Petugas tidak boleh memodifikasi nilai lux—hapus selalu agar nilai di database tetap
                const luxVal = currentStateData.value;
                const isEmptyLux = luxVal === '' || luxVal === null || luxVal === undefined ||
                                  (typeof luxVal === 'number' && luxVal === 0) ||
                                  (typeof luxVal === 'string' && luxVal.trim() === '');
                if (isEmptyLux) {
                    delete updatedData.value;
                }
                onSave(updatedData);
            } else {
                // Admin edit hanya update state lokal, simpan manual nanti
                setData(prev => ({
                    ...prev,
                    image: downloadURL,
                    timestamp: new Date().toISOString(),
                }));
            }

            // Hapus gambar lama jika berbeda & di Firebase
            if (oldImageUrl && oldImageUrl !== downloadURL && oldImageUrl.includes('firebase')) {
                try {
                    await fetch('/api/delete-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: oldImageUrl }),
                    });
                } catch (err) {
                    console.error('Failed deleting old image:', err);
                }
            }
        };

        // ------ UI loading overlay ------
        const loadingAlert = document.createElement('div');
        loadingAlert.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,.8); color:#fff; padding:20px; border-radius:10px; z-index:9999;
            display:flex; gap:10px; align-items:center;`;
        loadingAlert.innerHTML = `<div style="width:20px;height:20px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div> <span>Mengupload foto...</span>`;
        document.body.appendChild(loadingAlert);
        const style = document.createElement('style');
        style.textContent = `@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
        document.head.appendChild(style);

        try {
            // Get surveyor name from the component props
            const surveyorNameToUse = surveyorName || 'Tidak diketahui';
            
            // Add watermark and convert to WebP
            const watermarkedBlob = await addWatermarkToImage(file, surveyorNameToUse, currentLocation);

            const timestamp = Date.now();
            const fileName = `${timestamp}_row${cellCoords.row + 1}_col${cellCoords.col + 1}.webp`;
            const storageRef = ref(storage, `petugas-photos/${fileName}`);
            const snapshot = await uploadBytes(storageRef, watermarkedBlob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setData(prev => ({ ...prev, image: downloadURL }));
            await autoSaveAfterUpload(downloadURL);
        } catch (err) {
            console.error('Upload error:', err);
            setData(prev => ({ ...prev, image: oldImageUrl }));
        } finally {
            if (document.body.contains(loadingAlert)) document.body.removeChild(loadingAlert);
            if (document.head.contains(style)) document.head.removeChild(style);
        }
    };

    // Remove handleSubmit since we no longer have save functionality

    const handleDeleteImage = async () => {
        const imageToDelete = data.image;
        
        // Update state first
        setData(prev => ({...prev, image: null}));
        setIsDeleteConfirmOpen(false);

        // Auto-save the updated data (without image)
        const updatedData = {
            ...data,
            image: null,
            timestamp: new Date().toISOString(),
            location: isAdminEdit ? data.location : currentLocation
        };
        onSave(updatedData);

        // Delete image from Firebase Storage
        if (imageToDelete && imageToDelete.includes('firebase')) {
            try {
                await fetch('/api/delete-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageUrl: imageToDelete }),
                });
                console.log('Image deleted from storage successfully');
            } catch (error) {
                console.error('Error deleting image from storage:', error);
                // Don't show error to user as the main action (removing from grid) succeeded
            }
        }
    }
    

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[70] p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}>
            <div onClick={(e) => e.stopPropagation()} className={`bg-slate-50 p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto relative transform transition-all duration-300 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Tutup">
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold mb-1 text-gray-800">Ubah Data Sel</h3>
                <p className="text-sm text-gray-500 mb-6">Posisi: Jarak Tiang {cellCoords.row + 1} meter, Lebar Jalan {cellCoords.col + 1} meter</p>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipe Sel</label>
                        <div className="flex gap-2">
                            {['normal', 'api'].map(type => (
                                <label key={type} className={`flex-1 p-3 rounded-lg text-center transition-all cursor-pointer ${data.type === type ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700'}`}>
                                    <input type="radio" name="type" value={type} checked={data.type === type} onChange={handleInputChange} className="hidden" />
                                    <span className="font-semibold capitalize">{type === 'api' ? 'Titik Api' : 'Normal'}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
{isAdminEdit && (
    <>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-black">Nilai Lux</label>
                <input 
                    ref={luxInputRef} 
                    type="text" 
                    name="value" 
                    value={typeof data.value === 'string' ? data.value : (data.value !== undefined && data.value !== null ? String(data.value) : '')} 
                    onChange={(e) => {
                        const val = e.target.value;
                        // Allow only digits and dots (disable commas)
                        if (/^[0-9.]*$/.test(val)) {
                            setData(prev => ({ ...prev, value: val }));
                        }
                    }} 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                    placeholder="Masukkan nilai lux..."
                />
        </div>
        
        <div className="space-y-2">
            <label className="block text-sm font-medium text-black">Deskripsi</label>
            <textarea 
                name="description" 
                value={data.description || ''} 
                onChange={handleInputChange} 
                rows="3" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black bg-white" 
                placeholder="Tambahkan catatan..."
            />
        </div>
    </>
)}
                    
                    <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Lampiran</label>
                            {data.image ? (
                                <div 
                                    className={`relative group cursor-pointer`}
                                    onClick={data.image ? () => onImageClick(data.image, `Foto_Jarak-${cellCoords.row + 1}_Lebar-${cellCoords.col + 1}.webp`) : undefined}
                                >
                                    <Image src={data.image} alt="Preview" width={400} height={200} className="w-full h-auto max-h-48 object-contain rounded-lg bg-gray-200" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                        <Eye size={32} className="text-white"/>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-gray-500 text-center py-4">Tidak ada lampiran.</p>}
                            
                            {!isAdminEdit && (
                                <>
                                    <div className={`grid gap-3 transition-all duration-300 ${data.image ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="w-full flex items-center justify-center p-3 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors">
                                            <ImageIcon size={18} className="mr-2"/> Ambil Foto
                                        </button>
                                        {data.image && (
                                            <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="w-full flex items-center justify-center p-3 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition-colors">
                                                <Trash2 size={18} className="mr-2"/> Hapus Foto
                                            </button>
                                        )}
                                    </div>
<input type="file" accept="image/*" capture="environment" onChange={handleImageChange} ref={fileInputRef} className="hidden" />
                                </>
                            )}
                    </div>
                    
                    <div className="space-y-2 pt-3 border-t">
                        <label className="block text-sm font-medium text-gray-700">Info Otomatis</label>
                        <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-2 bg-gray-200 rounded-lg">
                                    <CustomCalendarIcon className="w-4 h-4 text-gray-500"/>
                                    <span className="text-xs text-gray-600">{dateTime.date || "Mendapatkan tanggal..."}</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-200 rounded-lg">
                                    <Clock size={14} className="text-gray-500"/>
                                    <span className="text-xs text-gray-600">{dateTime.time || "Mendapatkan waktu..."}</span>
                                </div>
                    </div>
                    {/* Location Display */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Lokasi Input</span>
                            {data.location && !isAdminEdit && (
                                <span className={`text-xs font-semibold ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                    {locationValidation.isValid ? 'Valid' : 'Tidak Valid'}
                                </span>
                            )}
                        </div>
                        {data.location && !isAdminEdit ? (
                            <a 
                                href={`https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-1 text-xs text-blue-600 hover:underline p-2 bg-gray-100 rounded-md flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {data.location.lat.toFixed(5)}, {data.location.lon.toFixed(5)}
                                {locationAccuracy && (
                                    <span className="ml-2 text-xs text-gray-600">Akurasi: ±{Math.round(locationAccuracy)}m</span>
                                )}
                            </a>
                        ) : (
                            !isAdminEdit && (
                                <p className="mt-1 text-xs text-gray-600 p-2 bg-gray-100 rounded-md">Lokasi tidak tersedia</p>
                            )
                        )}
                    </div>
                    </div>

<div className="space-y-4 mt-8">
    {/* Action buttons */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button 
            type="button" 
            onClick={(e) => {
                e.preventDefault();
                const updatedData = {
                    ...data,
                    timestamp: new Date().toISOString(),
                    location: isAdminEdit ? data.location : currentLocation
                };
                onSave(updatedData);
                handleClose();
            }}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all text-sm"
        >
            <Save className="mr-2 w-6 h-6" />
            <span>Simpan</span>
        </button>

        <div className="flex gap-3">
            {cellCoords.row < GRID_ROWS - 1 && (
                <button 
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        const updatedData = {
                            ...data,
                            timestamp: new Date().toISOString(),
                            location: isAdminEdit ? data.location : currentLocation
                        };
                        onSave(updatedData);
                        // Don't close modal, just trigger navigation
                        const nextCellEvent = new CustomEvent('navigateToCell', {
                            detail: { 
                                row: cellCoords.row + 1, 
                                col: cellCoords.col,
                                openModal: true 
                            }
                        });
                        window.dispatchEvent(nextCellEvent);
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all text-sm"
                >
                    <span>Simpan & Lanjut Jarak Tiang</span>
                    <ChevronDown className="ml-2 w-6 h-6" />
                </button>
            )}
            {cellCoords.col < GRID_COLS - 1 && (
                <button 
                    type="button" 
                    onClick={(e) => {
                        e.preventDefault();
                        const updatedData = {
                            ...data,
                            timestamp: new Date().toISOString(),
                            location: isAdminEdit ? data.location : currentLocation
                        };
                        onSave(updatedData);
                        // Don't close modal, just trigger navigation
                        const nextCellEvent = new CustomEvent('navigateToCell', {
                            detail: { 
                                row: cellCoords.row, 
                                col: cellCoords.col + 1,
                                openModal: true 
                            }
                        });
                        window.dispatchEvent(nextCellEvent);
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all text-sm"
                >
                    <span>Simpan & Lanjut Lebar Jalan</span>
                    <ChevronRight className="ml-2 w-6 h-6" />
                </button>
            )}
        </div>
    </div>
    
    {/* Close button at the bottom */}
    <div className="pt-2 border-t border-gray-200">
        <button type="button" onClick={handleClose} className="w-full px-5 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
            Tutup
        </button>
    </div>
</div>
                </div>
                <ConfirmationModal 
                    isOpen={isDeleteConfirmOpen} 
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={handleDeleteImage}
                    title="Hapus Foto?"
                    message="Apakah Anda yakin ingin menghapus foto ini? Aksi ini tidak dapat dibatalkan."
                    confirmText="Ya, Hapus"
                />
            </div>
        </div>
    );
};


// Modal for viewing cell details (read-only)
const ViewCellModal = ({ isOpen, onClose, cellData, cellCoords, onImageClick }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    }, [onClose]);

    if (!isOpen) return null;
    
    const data = cellData || DEFAULT_CELL_STATE;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[70] p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}>
            <div onClick={(e) => e.stopPropagation()} className={`bg-white p-6 rounded-lg shadow-2xl w-full max-w-md max-h-full overflow-y-auto relative transform transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                   <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Tutup">
                    <X size={24} />
                </button>

                <h3 className="text-lg font-bold mb-4 text-gray-900">Detail Data Sel (Jarak {cellCoords.row + 1}m, Lebar {cellCoords.col + 1}m)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipe Sel</label>
                        <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-100 rounded-md capitalize">{data.type === 'api' ? 'Titik Api' : 'Normal'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nilai Lux</label>
                        <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-100 rounded-md">{data.value}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                        <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-100 rounded-md min-h-[6rem] whitespace-pre-wrap">{data.description || "Tidak ada deskripsi."}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lampiran Gambar</label>
                        {data.image ? (
                            <div className="mt-2 relative overflow-hidden rounded-md group">
                                <Image 
                                    src={data.image} 
                                    alt="Lampiran" 
                                    width={400}
                                    height={200}
                                    className="w-full h-auto max-h-48 object-contain bg-gray-200 cursor-pointer transition-transform duration-300 group-hover:scale-110"
                                    onClick={() => onImageClick(data.image, `Foto_Jarak-${cellCoords.row + 1}_Lebar-${cellCoords.col + 1}.webp`)}
                                />
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-gray-500">Tidak ada gambar terlampir.</p>
                        )}
                    </div>
                    {data.timestamp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Waktu Input</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                                    <CustomCalendarIcon className="w-4 h-4 text-gray-500"/>
                                    <span className="text-sm text-gray-900">{new Date(data.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                                    <Clock size={14} className="text-gray-500"/>
                                    <span className="text-sm text-gray-900">
                                        {(() => {
                                            const timezone = data.location ? getTimezoneInfo(data.location.lon) : { name: '', iana: 'Asia/Jakarta' };
                                            return `${new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone.iana })} ${timezone.name}`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    {data.location && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Lokasi Input</label>
                                    <a 
                                        href={`https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-1 text-sm text-blue-600 hover:underline p-2 bg-gray-100 rounded-md flex items-center"
                                    >
                                        <MapPin size={14} className="mr-2"/>
                                        {data.location.lat.toFixed(5)}, {data.location.lon.toFixed(5)}
                                    </a>
                                </div>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal for reviewing and downloading images
const ImageReviewModal = ({ isOpen, onClose, imageSrc, downloadName }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
    const containerRef = useRef(null);

    // Smooth zoom functions
    const zoomIn = () => {
        setScale(prev => Math.min(prev * 1.3, 10));
    };

    const zoomOut = () => {
        setScale(prev => Math.max(prev / 1.3, 0.1));
    };

    const rotateImage = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
    };

    // Enhanced wheel zoom with smooth scaling
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomFactor = delta > 0 ? 1.1 : 0.9;
        setScale(prev => {
            const newScale = prev * zoomFactor;
            return Math.min(Math.max(newScale, 0.1), 10);
        });
    };

    // Enhanced drag functionality with smooth movement
    const startDrag = (e) => {
        e.preventDefault();
        setIsDragging(true);
        dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: offset.x,
            originY: offset.y
        };
    };

    const onDrag = useCallback((e) => {
        if (!dragRef.current.dragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setOffset({ 
            x: dragRef.current.originX + dx, 
            y: dragRef.current.originY + dy 
        });
    }, []);

    const endDrag = useCallback(() => {
        setIsDragging(false);
        dragRef.current.dragging = false;
    }, []);

    // Touch support for mobile devices
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startDrag({
                preventDefault: () => {},
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && dragRef.current.dragging) {
            e.preventDefault();
            const touch = e.touches[0];
            onDrag({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    };

    const handleTouchEnd = () => {
        endDrag();
    };

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => {
            handleReset();
            onClose();
        }, 300);
    }, [onClose]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case '+':
                case '=':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    zoomOut();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    rotateImage();
                    break;
                case 'Escape':
                    e.preventDefault();
                    handleClose();
                    break;
                case '0':
                    e.preventDefault();
                    handleReset();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 flex justify-center items-center z-[80] p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-black/85 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className={`bg-white p-4 rounded-lg shadow-2xl w-full max-w-5xl relative transform transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Enhanced Toolbar */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg z-20 border">
                    <div className="flex gap-1">
                        <button 
                            onClick={zoomIn} 
                            className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Zoom In (+)"
                        >
                            <span className="text-lg font-bold">+</span>
                        </button>
                        <button 
                            onClick={zoomOut} 
                            className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Zoom Out (-)"
                        >
                            <span className="text-lg font-bold">−</span>
                        </button>
                    </div>
                    
                    <div className="flex gap-1">
                        <button 
                            onClick={rotateImage} 
                            className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Rotate (R)"
                        >
                            <RotateCw size={18} />
                        </button>
                        <button 
                            onClick={handleReset} 
                            className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Reset (0)"
                        >
                            <span className="text-xs font-bold">RST</span>
                        </button>
                    </div>
                </div>

                {/* Scale indicator */}
                <div className="absolute top-3 right-16 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg z-20 border">
                    <span className="text-sm font-medium text-gray-700">
                        {Math.round(scale * 100)}%
                    </span>
                </div>

                {/* Close button */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-20 transition-colors"
                    title="Close (Esc)"
                >
                    <X size={20} />
                </button>

                {/* Image container with smooth interactions */}
                <div 
                    ref={containerRef}
                    className={`w-full h-[80vh] flex justify-center items-center overflow-hidden rounded-lg bg-gray-100 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onWheel={handleWheel}
                    onMouseDown={startDrag}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction: 'none' }}
                >
                    <Image 
                        src={imageSrc} 
                        alt="Image Review" 
                        width={800}
                        height={600}
                        style={{ 
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        className="select-none pointer-events-none max-w-none"
                        draggable={false}
                    />
                </div>

                {/* Enhanced bottom controls */}
                <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        <p className="font-medium">Kontrol:</p>
                        <p className="text-xs">Mouse wheel: Zoom • Drag: Geser • +/-: Zoom • R: Putar • 0: Reset • Esc: Tutup</p>
                    </div>
                    <a 
                        href={imageSrc} 
                        download={downloadName} 
                        className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
                    >
                        <Download size={18} className="mr-2"/>
                        Download
                    </a>
                </div>
            </div>
        </div>
    );
};

// Generic confirmation modal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Konfirmasi" }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => { if (isOpen) { const timer = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(timer); } }, [isOpen]);
    const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };
    const handleConfirm = () => { onConfirm(); handleClose(); };
    if (!isOpen) return null;
    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[100] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}>
            <div onClick={e => e.stopPropagation()} className={`bg-white p-6 rounded-2xl shadow-xl text-center transform transition-all duration-300 ease-out relative ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                   <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={20} />
                </button>
                <p className="text-lg font-semibold text-gray-800 mb-2 mt-4">{title}</p>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex justify-center space-x-4">
                    <button className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={handleClose}>Batal</button>
                    <button className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" onClick={handleConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// Generic alert modal
const AlertModal = ({ isOpen, onClose, message, type = 'warning' }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => { if (isOpen) { const timer = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(timer); } }, [isOpen]);
    const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />;
            case 'error':
                return <XCircleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />;
            default:
                return <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />;
        }
    };
    
    const getTitle = () => {
        switch (type) {
            case 'success':
                return 'Berhasil';
            case 'error':
                return 'Gagal';
            default:
                return 'Peringatan';
        }
    };

    if (!isOpen) return null;
    return (
       <div className={`fixed inset-0 flex justify-center items-center z-[100] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}>
            <div onClick={e => e.stopPropagation()} className={`bg-white p-6 rounded-2xl shadow-xl text-center transform transition-all duration-300 ease-out relative ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={20} />
                </button>
                <div className="mt-6">
                    {getIcon()}
                    <p className="text-lg font-semibold text-gray-800 mb-2">{getTitle()}</p>
                    <p className="text-sm text-gray-600 mb-6">{message}</p>
                    <div className="flex justify-center">
                        <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onClick={handleClose}>Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modern Checkbox Component
const ModernCheckbox = ({ checked, onChange, id, label }) => {
    return (
      <label htmlFor={id} className="flex items-center cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            id={id}
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
          />
          <div className="w-5 h-5 rounded-md border-2 transition-all duration-200 ease-in-out bg-white border-gray-300 group-hover:border-blue-400 peer-checked:bg-blue-600 peer-checked:border-blue-600">
          </div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`}>
               <Check size={14} strokeWidth={3}/>
          </div>
        </div>
        {label && <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>}
      </label>
    );
  };

// Modal for selecting a report from a list
const ReportSelectionModal = ({ isOpen, onClose, reports, onSelectReport }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[80] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}>
            <div onClick={e => e.stopPropagation()} className={`bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                   <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Tutup">
                    <X size={24} />
                </button>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Pilih Laporan untuk Dilanjutkan</h3>
                <p className="text-sm text-gray-600 mb-6">Pilih salah satu laporan di bawah untuk melanjutkan pengeditan.</p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {reports.length > 0 ? reports.map(report => (
                        <button 
                            key={report.id} 
                            onClick={() => onSelectReport(report)}
                            className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-blue-100 hover:shadow-md transition-all duration-200 border border-gray-200"
                        >
                            <p className="font-semibold text-blue-600 text-lg">{report.surveyorName || 'Tanpa Nama Petugas'}</p>
                            <p className="font-medium text-gray-800 mt-1">{report.projectTitle || "Tanpa Judul"}</p>
                            <div className="text-xs text-gray-500 grid grid-cols-2 gap-2 mt-2">
                                <span><strong className="font-medium">Daya:</strong> {report.lampPower || 'N/A'}</span>
                                <span><strong className="font-medium">Tinggi:</strong> {report.poleHeight || 'N/A'}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">{report.projectLocation || "Tanpa Lokasi"}</p>
                        </button>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Tidak ada laporan yang ditemukan untuk petugas ini.</p>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <button 
                        onClick={handleClose}
                        className="w-full flex items-center justify-center p-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal for loading a report by surveyor name
const LoadByNameModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [name, setName] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
            setName(''); 
        }, 300);
    };

    const handleConfirm = () => {
        if (!name || isLoading) return;
        onConfirm(name);
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };
    
    const handleAlphabeticInputChange = (e) => {
        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        setName(value);
    };

    if (!isOpen && !isVisible) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[80] p-4 transition-all duration-300 ease-out ${isOpen && isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 pointer-events-none'}`}>
            <div onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown} className={`relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={24} />
                </button>
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 flex justify-center items-center rounded-2xl z-10">
                        <RotateCw className="w-8 h-8 animate-spin text-yellow-500" />
                    </div>
                )}
                <h3 className="text-xl font-bold text-gray-800 mb-2">Muat Laporan</h3>
                <p className="text-sm text-gray-600 mb-6">Masukkan nama petugas untuk melihat daftar laporannya.</p>
                <div>
                    <label htmlFor="load-name-input" className="block text-sm font-medium text-gray-700 mb-1">Nama Petugas</label>
                    <input 
                        ref={inputRef}
                        id="load-name-input" 
                        type="text" 
                        value={name} 
                        onChange={handleAlphabeticInputChange}
                        placeholder="Masukkan Nama Anda" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                </div>
                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button 
                        onClick={handleConfirm}
                        disabled={!name || isLoading}
                        className="w-full sm:w-auto px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-yellow-300 disabled:cursor-not-allowed">
                        Cari Laporan
                    </button>
                    <button 
                        onClick={handleClose}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal displayed after a successful save (disabled)
const PostSaveModal = () => null;


// Modal untuk login admin
const AdminLoginModal = ({ isOpen, onClose, onConfirm }) => {
    const [name, setName] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
            setName('');
        }, 300);
    };

    const handleConfirm = () => {
        if (!name.trim()) {
            return;
        }
        onConfirm(name);
        handleClose();
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };
    
    const handleAlphabeticInputChange = (e) => {
        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        setName(value);
    };


    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[90] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}>
            <div onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown} className={`bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm relative transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                   <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={24} />
                </button>
                <div className="text-center">
                    <Shield className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Akses Admin</h3>
                    <p className="text-sm text-gray-600 mb-6">Silakan masukkan nama Anda untuk melanjutkan ke panel admin.</p>
                </div>
                <div>
                    <label htmlFor="admin-name-input" className="block text-sm font-medium text-gray-700 mb-1">Nama Admin</label>
                    <input 
                        ref={inputRef}
                        id="admin-name-input" 
                        type="text" 
                        value={name} 
                        onChange={handleAlphabeticInputChange}
                        placeholder="Masukkan nama..." 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                </div>
                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button 
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                        Masuk
                    </button>
                    <button 
                        onClick={handleClose}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};


// Pagination component for navigating through report lists
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
                    <ChevronRight className="h-5 w-5 ml-2" />
                </button>
            </div>
        </nav>
    );
};

// ===================================================================================
// == HALAMAN DAN KOMPONEN UTAMA ==
// ===================================================================================

const SidebarContent = React.memo(({ projectInfo, onProjectTitleChange, selectedName, selectedPower, selectedHeight, selectedTegangan, stats, onBack, onClear, onSaveToDb, isSaving, isUserMode, isAdminView, isAdminEdit, onExportSingle, openDocumentationModal, isMobilePanel = false, projectLocationStatus }) => {
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    // Project title is auto-filled and not editable
    const localTitle = projectInfo.title || '';
    const debouncedTitle = useDebounce(localTitle, 500);
    const mounted = useRef(false);





    const infoItems = [
        { icon: <SurveyorIcon className="text-gray-500"/>, label: "Petugas", value: selectedName },
        { icon: <CustomCalendarIcon className="text-gray-500"/>, label: "Tanggal", value: new Date(projectInfo.date).toLocaleDateString('id-ID') },
        { icon: <Lightbulb size={16} className="text-yellow-500"/>, label: "Daya", value: selectedPower },
        { icon: <Zap size={16} className="text-orange-500"/>, label: "Tegangan", value: selectedTegangan },
        { icon: <LampPostIcon className="text-blue-500"/>, label: "Tinggi Tiang", value: selectedHeight },
    ];
    

    
    const isTitleReadOnly = true;

    return (
        <div className="flex flex-col h-full">
            <div className={`flex-shrink-0 ${isMobilePanel ? 'pt-0' : 'pt-12 lg:pt-4'}`}>
                <button 
                    onClick={() => onBack(isAdminEdit)} 
                    className="flex items-center justify-center w-full px-4 py-2.5 mb-4 text-sm font-semibold bg-white text-blue-600 border border-slate-300 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                    <ChevronLeft size={18} className="mr-2" />
                    {isUserMode ? "Kembali ke Pemilihan" : "Kembali ke Daftar Laporan"}
                </button>
            </div>
            
            <div className={`flex-1 overflow-y-auto min-h-0 ${isMobilePanel ? '' : 'pr-2 -mr-2'}`}>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow p-4 space-y-3">
                        <h3 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2">Info Laporan</h3>
                        <div>
                            <label className="text-xs font-medium text-gray-500">Nama Lampu</label>
                            <div className="w-full mt-1 p-2 text-sm rounded-md bg-gray-100 text-black border border-gray-200 cursor-not-allowed">
                                 {localTitle || 'Nama Lampu...'}
                             </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500">Lokasi Proyek</label>
                            <div className="space-y-2 mt-1">
                                <div className="flex items-center gap-2 p-2 text-sm rounded-md bg-gray-100 text-gray-700">
                                   <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                                   <span className="truncate">{projectInfo.location || 'Lokasi tidak diketahui'}</span>
                                </div>
                                {isUserMode && projectLocationStatus && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Status GPS:</span>
                                        <LocationStatusIndicator 
                                            location={projectLocationStatus.location}
                                            accuracy={projectLocationStatus.accuracy}
                                            error={projectLocationStatus.error}
                                            isLoading={projectLocationStatus.isLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-flow-col grid-rows-3 gap-x-4 gap-y-2 pt-2 auto-cols-fr">
                            {infoItems.map(item => (
                                <div key={item.label} className="bg-slate-50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                    <p className="font-semibold text-sm text-gray-800 mt-1 truncate">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 mb-3">Statistik (Lux)</h3>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-500">L-Min</p>
                                <p className="text-xl font-bold text-blue-600">{stats.lmin}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">L-Max</p>
                                <p className="text-xl font-bold text-green-600">{stats.lmax}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">L-Avg</p>
                                <p className="text-xl font-bold text-yellow-600">{stats.lavg}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow p-4">
                        <button onClick={() => setIsLegendOpen(!isLegendOpen)} className="w-full flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Legenda Warna</h3>
                            <ChevronDown className={`transition-transform duration-300 ${isLegendOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isLegendOpen ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="min-h-0 space-y-1">
                                {COLOR_LEGEND_DATA.map(item => (<div key={item.label} className="flex items-center space-x-2"><div className={`w-4 h-4 rounded-md shadow-sm ${item.color}`}></div><span className="text-sm text-gray-700">{item.label}</span></div>))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-lg text-gray-800">Aksi</h3>
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            {/* Removed Simpan Laporan button as per user request */}
                            {/* {(isUserMode || isAdminEdit) && (
                                <button onClick={onSaveToDb} className="w-full flex items-center justify-center p-3 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:shadow-none" disabled={isSaving}>
                                    {isSaving ? 'Menyimpan...' : <><Save size={18} className="mr-2"/>Simpan Laporan</>}
                                </button>
                            )} */}
                            {(isAdminView || isAdminEdit) && (
                                <button 
                                    onClick={onExportSingle} 
                                    className="w-full flex items-center justify-center p-3 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                    <FileSpreadsheet className="mr-2" size={18}/>Export Laporan Ini (ZIP)
                                </button>
                            )}
                    {(isUserMode || isAdminEdit) && (
                        <>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openDocumentationModal();
                                }} 
                                className="w-full flex items-center justify-center p-3 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 mb-3 touch-manipulation active:bg-indigo-800 min-h-[48px]"
                            >
                                <Upload size={18} className="mr-2"/> Dokumentasi
                            </button>
                            <button onClick={() => onClear(!!isAdminEdit)} className="w-full flex items-center justify-center p-3 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                <Trash2 size={18} className="mr-2"/>Bersihkan Grid
                            </button>
                        </>
                    )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
SidebarContent.displayName = 'SidebarContent';


// Initial Selection Page
const SelectionPage = React.memo(({ onStart, onAdminClick, onOpenLoadModal }) => {
    const [projectTitle, setProjectTitle] = useState('');
    const [nama, setNama] = useState('');
    const [power, setPower] = useState('');
    const [teganganAwal, setTeganganAwal] = useState('');
    const [height, setHeight] = useState('');

    const handleAlphabeticInputChange = (setter) => (e) => {
        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        setter(value);
    };

    const handleNumericInputChange = (setter) => (e) => {
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        setter(numericValue);
    };

    const handleStartClick = () => {
        const powerWithUnit = power ? `${power}W` : '';
        const teganganWithUnit = teganganAwal ? `${teganganAwal}V` : '';
        onStart(projectTitle, nama, powerWithUnit, height, teganganWithUnit);
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-200 p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800">Dashboard Pengukuran</h1>
                        <p className="text-gray-500 mt-2">Isi detail untuk memulai atau muat sesi terakhir.</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">Nama Lampu</label>
                            <input id="title-input" type="text" value={projectTitle} onChange={handleAlphabeticInputChange(setProjectTitle)} placeholder="Masukkan Nama Lampu" className={`w-full p-3 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${projectTitle ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}/>
                        </div>
                        <div>
                            <label htmlFor="nama-input" className="block text-sm font-medium text-gray-700 mb-1">Nama Petugas</label>
                            <input id="nama-input" type="text" value={nama} onChange={handleAlphabeticInputChange(setNama)} placeholder="Masukkan Nama Anda" className={`w-full p-3 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${nama ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="power-input" className="block text-sm font-medium text-gray-700 mb-1">Daya Lampu</label>
                                <div className="relative">
                                    <input id="power-input" type="text" value={power} onChange={handleNumericInputChange(setPower)} placeholder="Contoh: 55" className={`w-full p-3 pr-12 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${power ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}/>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">W</span>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="tegangan-input" className="block text-sm font-medium text-gray-700 mb-1">Tegangan Awal</label>
                                <div className="relative">
                                    <input id="tegangan-input" type="text" value={teganganAwal} onChange={handleNumericInputChange(setTeganganAwal)} placeholder="Contoh: 220" className={`w-full p-3 pr-10 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${teganganAwal ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}/>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">V</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="height-select" className="block text-sm font-medium text-gray-700 mb-1">Tinggi Tiang</label>
                            <select id="height-select" value={height} onChange={(e) => setHeight(e.target.value)} className={`w-full p-3 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${height ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}>
                                <option value="" disabled>Pilih Tinggi Tiang...</option>
                                {HEIGHT_OPTIONS.map(opt => <option key={opt} value={opt} className="text-black">{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <button onClick={handleStartClick} disabled={!projectTitle || !nama || !power || !height || !teganganAwal} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl disabled:bg-blue-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none">
                            Mulai Survei Baru
                        </button>
                        <button onClick={onOpenLoadModal} className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl">
                            Muat Laporan Petugas
                        </button>
                    </div>

                    <div className="pt-4 border-t border-gray-200 text-center">
                        <button onClick={onAdminClick} className="text-sm text-gray-500 hover:text-blue-600 font-semibold flex items-center justify-center mx-auto transition-colors">
                            <Shield size={16} className="mr-2" />
                            Masuk Sebagai Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const GridHeader = React.memo(({ projectInfo, selectedName, selectedPower, selectedHeight, selectedTegangan, onToggleHeader, projectLocationStatus }) => {
    const infoItems = [
        { icon: <SurveyorIcon className="w-4 h-4 text-gray-500" />, label: "Petugas", value: selectedName },
        { icon: <CustomCalendarIcon className="w-4 h-4 text-gray-500" />, label: "Tanggal", value: new Date(projectInfo.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { icon: <Lightbulb className="w-4 h-4 text-yellow-500"/>, label: "Daya Lampu", value: selectedPower },
        { icon: <Zap className="w-4 h-4 text-orange-500"/>, label: "Tegangan", value: selectedTegangan },
        { icon: <LampPostIcon className="w-4 h-4 text-blue-500"/>, label: "Tinggi Tiang", value: selectedHeight },
    ];

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm w-full relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                <div className="w-full lg:flex-grow text-center lg:text-left mb-4 lg:mb-0">
                    <h1 className="text-xl font-bold text-gray-800 truncate" title={projectInfo.title || 'Tanpa Nama Lampu'}>
                        {projectInfo.title || 'Tanpa Nama Lampu'}
                    </h1>
                    <div className="flex items-center justify-center lg:justify-start gap-2 mt-1">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500" />
                            <span className="text-sm text-gray-500 truncate">{projectInfo.location || 'Lokasi tidak diketahui'}</span>
                        </div>
                        {projectLocationStatus && (
                            <LocationStatusIndicator 
                                location={projectLocationStatus.location}
                                accuracy={projectLocationStatus.accuracy}
                                error={projectLocationStatus.error}
                                isLoading={projectLocationStatus.isLoading}
                            />
                        )}
                    </div>
                </div>
                <div className="w-full lg:w-auto grid grid-rows-3 grid-flow-col auto-cols-max gap-x-6 gap-y-2 justify-between sm:justify-end lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-y-3 text-sm pt-4 lg:pt-0 border-t border-gray-200 lg:border-t-0 lg:border-l lg:pl-6">
                    {infoItems.map(item => (
                            <div key={item.label} className="flex items-center gap-2" title={item.label}>
                                <div className="flex-shrink-0">{item.icon}</div>
                                <span className="text-gray-700 font-medium truncate">{item.value}</span>
                            </div>
                    ))}
                </div>
            </div>
            <div className="lg:hidden absolute bottom-[-12px] left-1/2 -translate-x-1/2">
                <button
                    onClick={onToggleHeader}
                    className="bg-white p-1 rounded-full shadow-md border border-gray-200 hover:bg-gray-100 transition-colors"
                    aria-label="Sembunyikan header"
                >
                    <ChevronUp size={20} className="text-gray-600"/>
                </button>
            </div>
        </div>
    );
});
SelectionPage.displayName = 'SelectionPage';
GridHeader.displayName = 'GridHeader';


const GridCell = React.memo(({ cellData, rowIndex, colIndex, onCellClick, onImageReview }) => {
    const colorClass = useMemo(() => {
        if(!cellData || cellData.timestamp === null) return COLORS.zero;
        if (cellData.type === 'api') return COLORS.api;
        if (cellData.type === 'tiang') return COLORS.tiang;
        const value = cellData.value; 
        if (value >= 80) return COLORS.level11; 
        if (value >= 70) return COLORS.level10; 
        if (value >= 60) return COLORS.level9; 
        if (value >= 50) return COLORS.level8; 
        if (value >= 40) return COLORS.level7; 
        if (value >= 30) return COLORS.level6; 
        if (value >= 20) return COLORS.level5; 
        if (value >= 10) return COLORS.level4; 
        if (value >= 5) return COLORS.level3; 
        if (value >= 0.5) return COLORS.level2; 
        if (value > 0) return COLORS.level1; 
        return COLORS.zero;
    }, [cellData]);

    return (
        <div className="group relative cursor-pointer w-16 h-14" onClick={() => onCellClick(rowIndex, colIndex)}>
            <div className={`w-full h-full flex items-center justify-center text-sm font-bold transition-all duration-200 rounded-lg shadow-inner hover:shadow-lg hover:z-10 relative ${colorClass}`}>
                {(!cellData || cellData.timestamp === null) ? '0' : (cellData.value || '0')}
            </div>
            {cellData?.image && (
                <div className="absolute bottom-1 right-1 flex space-x-1">
                    <div className="p-1 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition group" onClick={(e) => onImageReview(e, rowIndex, colIndex)}>
                        <ImageIcon size={12} className="text-white transition-transform duration-300 group-hover:scale-125"/>
                    </div>
                </div>
            )}
            {cellData?.type !== 'normal' && cellData.timestamp && (
                <div className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-black/50 text-white capitalize">
                    {cellData?.type === 'api' ? 'Api' : 'Tiang'}
                </div>
            )}
        </div>
    );
});
GridCell.displayName = 'GridCell';


const GridPage = ({ selectedName, selectedPower, selectedHeight, selectedTegangan, onBack, sessionData, setSessionData, isUserMode, onSaveSuccess, loggedInAdminName }) => {
    const scrollContainerRef = useRef(null);
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

    const openDocumentationModal = () => {
        setIsDocumentationModalOpen(true);
    };

    const closeDocumentationModal = React.useCallback(() => {
        setIsDocumentationModalOpen(false);
    }, []);

    const handleDocumentationComplete = (uploadedUrls) => {
        setUploadedDocumentationPhotos(uploadedUrls);
        console.log('Uploaded documentation photos:', uploadedUrls);
    };

    // Real-time Firestore listener for admin panel to get live updates of gridData
    useEffect(() => {
        if (!sessionData?.id || isUserMode) return;

        // Fix: use doc() instead of collection() for document reference
        const docRef = doc(db, 'reports', sessionData.id);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
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
            }
        }, (error) => {
            console.error('Firestore onSnapshot error:', error);
        });

        return () => unsubscribe();
    }, [sessionData?.id, isUserMode]);

    // Placeholder: manual save has been deprecated. Kept for backward compatibility to avoid runtime errors.
    const handleSaveToDb = useCallback(() => {
        /* no-op */
    }, []);



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
        distanceFilter: 1, // Faster updates, every ~0.5 meter movement
        autoStart: isUserMode // Only start for user mode, not admin
    });

    // Update current cell location dynamically for petugas with reverse geocoding
    useEffect(() => {
        let isMounted = true;
        async function fetchAddress(lat, lon) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
                if (!res.ok) throw new Error('Failed to fetch address');
                const data = await res.json();
                return data.display_name || '';
            } catch (error) {
                console.error('Reverse geocoding error:', error);
                return '';
            }
        }

        async function updateLocation() {
            if (isUserMode && currentCell && projectLocation) {
                const address = await fetchAddress(projectLocation.lat, projectLocation.lon);
                if (!isMounted) return;
                setGridData(currentGrid => {
                    const newGrid = currentGrid.map(row => [...row]);
                    const cell = newGrid[currentCell.row][currentCell.col];
                    if (cell) {
                        newGrid[currentCell.row][currentCell.col] = {
                            ...cell,
                            location: {
                                ...projectLocation,
                                accuracy: projectLocationAccuracy,
                                timestamp: Date.now(),
                                address
                            }
                        };
                    }
                    return newGrid;
                });
            }
        }

        updateLocation();

        return () => {
            isMounted = false;
        };
    }, [projectLocation, projectLocationAccuracy, isUserMode, currentCell]);

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


    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsHeaderVisible(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
            
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
    
    const [stats, setStats] = React.useState({ lmin: '0.00', lmax: '0.00', lavg: '0.00' });

    React.useEffect(() => {
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

    // Removed handleSaveToDb function as saving is now immediate on cell update

    // Utility sleep helper
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

            // Create documentation photos folder
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

            // Collect all image URLs for bulk download
            const gridImageUrls = [];
            const gridImageMappings = [];
            
            for (let rowIndex = 0; rowIndex < gridData.length; rowIndex++) {
                const row = gridData[rowIndex];
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
                            gridImageUrls.push(cell.image);
                            gridImageMappings.push({ imageName, rowIndex, colIndex });
                        }
                    }
                }
            }

            // Bulk download grid images if any
            if (gridImageUrls.length > 0) {
                try {
                    const response = await fetch('/api/bulk-download', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageUrls: gridImageUrls }),
                    });

                    if (response.ok) {
                        const bulkData = await response.json();
                        if (bulkData.success) {
                            bulkData.results.forEach((result, index) => {
                                if (result.success && gridImageMappings[index]) {
                                    const mapping = gridImageMappings[index];
                                    imageFolder.file(mapping.imageName, result.base64Data, { base64: true });
                                } else {
                                    console.error(`Failed to download grid image ${index}:`, result.error);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error in bulk download for grid images:', error);
                    // Fallback to individual downloads
                    for (let i = 0; i < gridImageUrls.length; i++) {
                        try {
                            const response = await fetch('/api/download-image', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageUrl: gridImageUrls[i] }),
                            });
                            if (response.ok) {
                                const data = await response.json();
                                if (data.success && gridImageMappings[i]) {
                                    imageFolder.file(gridImageMappings[i].imageName, data.base64Data, { base64: true });
                                }
                            }
                        } catch (err) {
                            console.error(`Fallback download failed for image ${i}:`, err);
                        }
                    }
                }
            }

            // Process documentation photos with parallel downloads
            if (uploadedDocumentationPhotos && Object.keys(uploadedDocumentationPhotos).length > 0) {
                const photoTypeLabels = {
                    fotoPetugas: 'Foto_Petugas',
                    fotoPengujian: 'Foto_Full_Lapangan_Pada_Saat_Pengujian',
                    fotoLapangan: 'Foto_Full_Lapangan',
                    fotoLampuSebelumNaik: 'Foto_Lampu_Sebelum_Naik',
                    fotoTinggiTiang: 'Foto_Lampu_Dengan_Tinggi_Yang_Ditentukan'
                };

                const docUrls = [];
                const docMappings = [];
                
                for (const [photoType, photoUrl] of Object.entries(uploadedDocumentationPhotos)) {
                    if (photoUrl) {
                        const photoLabel = photoTypeLabels[photoType] || photoType;
                        const docImageName = `${photoLabel}_${surveyor}_${power}W_${voltage}V_${height}M.webp`;
                        docUrls.push(photoUrl);
                        docMappings.push({ photoType, docImageName });
                    }
                }

                // Bulk download documentation photos
                if (docUrls.length > 0) {
                    try {
                        const response = await fetch('/api/bulk-download', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageUrls: docUrls }),
                        });

                        if (response.ok) {
                            const bulkData = await response.json();
                            if (bulkData.success) {
                                bulkData.results.forEach((result, index) => {
                                    if (result.success && docMappings[index]) {
                                        const mapping = docMappings[index];
                                        documentationFolder.file(mapping.docImageName, result.base64Data, { base64: true });
                                    }
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error in bulk download for documentation photos:', error);
                    }
                }
            }
            
            const zipFilename = `Laporan_${folderName}_${date}.zip`;
            // Use faster compression settings
            const zipBlob = await zip.generateAsync({ 
                type: "blob", 
                compression: "DEFLATE",
                compressionOptions: { level: 1 } // Fast compression
            });
            window.saveAs(zipBlob, zipFilename);
            setIsExportModalOpen(false);
            
            setAlertModal({ isOpen: true, message: `Laporan "${zipFilename}" berhasil di-export sebagai ZIP dengan foto dokumentasi!`, type: 'success' });

        } catch (error) {
            console.error("Error exporting single report:", error);
            setAlertModal({ isOpen: true, message: `Gagal mengekspor laporan: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    }, [gridData, sessionData.projectInfo, selectedName, selectedPower, selectedHeight, selectedTegangan, stats]);
    
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
                // Close current modal first
                setIsEditModalOpen(false);
                
                // Set new cell and open modal immediately
                setTimeout(() => {
                    const cellInfo = { row, col, data: gridData[row][col] };
                    setCurrentCell(cellInfo);
                    setIsEditModalOpen(true);
                }, 50);
            } else {
                handleCellClick(row, col);
            }
        };

        window.addEventListener('navigateToCell', handleNavigateToCell);
        return () => {
            window.removeEventListener('navigateToCell', handleNavigateToCell);
        };
    }, [handleCellClick, gridData]);

    const handleSaveCell = useCallback(async (updatedData) => { 
        // Convert value to number if possible
        const convertedValue = typeof updatedData.value === 'string' ? parseFloat(updatedData.value) : updatedData.value;
        const newValue = isNaN(convertedValue) ? updatedData.value : convertedValue;
        const updatedDataWithNumber = { ...updatedData, value: newValue };

        setGridData(currentGrid => {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[currentCell.row][currentCell.col] = updatedDataWithNumber; 

            // Update stats immediately with new grid
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

        // Immediately save updated grid to backend
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

            // Replace the updated cell in gridDataToSave as well to keep consistency
            gridDataToSave[currentCell.row][currentCell.col] = updatedDataWithNumber;

            // Fix: get loggedInAdminName from props, not from closure
            const adminName = loggedInAdminName;

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
    }, [currentCell, gridData, sessionData, selectedName, selectedPower, selectedHeight, selectedTegangan, onSaveSuccess, setSessionData, stats, loggedInAdminName]);
    
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
            // Collect all image URLs before clearing
            const imageUrls = [];
            gridData.forEach(row => {
                row.forEach(cell => {
                    if (cell.image && cell.image.includes('firebase')) {
                        imageUrls.push(cell.image);
                    }
                });
            });

            // Clear the grid data
            setGridData(Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ({...DEFAULT_CELL_STATE }))));
            
            // Delete images from storage in background
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
                    // Don't show error to user as the main action (clearing grid) succeeded
                }
            }

            setAlertModal({ isOpen: true, message: "Semua data grid berhasil dibersihkan!", type: 'success' });
        }
        setClearContext({ isAdmin: false });
    };
    
    const handleDeleteCell = useCallback(async () => {
        if (currentCell) {
            const cellToDelete = gridData[currentCell.row][currentCell.col];
            
            // Update grid data
            setGridData(currentGrid => {
                const newGrid = currentGrid.map(row => [...row]);
                newGrid[currentCell.row][currentCell.col] = { ...DEFAULT_CELL_STATE };
                return newGrid;
            });

            // Delete image from storage if it exists
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
                    // Don't show error to user as the main action succeeded
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
        estimateSize: () => 64, // h-14 (56px) + gap-2 (8px)
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

            <button
                onClick={() => setIsPanelOpen(true)}
                className="lg:hidden fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform duration-200 hover:scale-110 active:scale-95"
            >
                <GripVertical size={20} />
            </button>
            
            <div 
                className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${isPanelOpen ? 'bg-black/30 backdrop-blur-sm' : 'pointer-events-none opacity-0'}`} 
                onClick={() => setIsPanelOpen(false)}
            >
  <div 
    onClick={(e) => e.stopPropagation()}
    className={`fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-2xl shadow-2xl p-4 flex flex-col ${isPanelOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    style={{ 
      transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      maxHeight: '85vh',
    }}
  >
                    <div className="w-full flex justify-center mb-2 flex-shrink-0">
                        <button onClick={() => setIsPanelOpen(false)} className="p-2 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors" aria-label="Tutup panel">
                            <ChevronDown size={24} className="text-gray-600" />
                        </button>
                    </div>
                    <div className="overflow-y-auto">
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
                            onSaveToDb={handleSaveToDb}
                            isSaving={isSaving} 
                            isUserMode={isUserMode}
                            isAdminView={!!sessionData?.isAdminView}
                            isAdminEdit={!!sessionData?.isAdminEdit}
                            onExportSingle={handleExportSingleReport}
                            openDocumentationModal={openDocumentationModal}
                            isMobilePanel={true}
                            projectLocationStatus={isUserMode ? {
                                location: projectLocation,
                                accuracy: projectLocationAccuracy,
                                error: projectLocationError,
                                isLoading: isLoadingProjectLocation
                            } : null}
                        />
                    </div>
                </div>
            </div>

            <main className="flex-1 flex flex-col overflow-auto p-4 relative">
                <div className={`lg:hidden fixed top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${!isHeaderVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90 pointer-events-none'}`}>
                    <div className="grid place-items-center">
                        <button
                            onClick={() => setIsHeaderVisible(true)}
                            className="bg-white/98 backdrop-blur-xl text-blue-600 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 hover:bg-blue-50 hover:shadow-3xl active:scale-95 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border border-blue-200/50 whitespace-nowrap"
                        >
                            <ChevronDown size={16} className="sm:w-5 sm:h-5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" />
                            <span className="text-sm sm:text-base font-semibold">Tampilkan Header</span>
                        </button>
                    </div>
                </div>
                
                {/* Ultra-smooth Header animation optimized for mobile */}
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
                
                <div ref={scrollContainerRef} className="flex-1 overflow-auto cursor-grab active:cursor-grabbing -mr-4 -ml-4 pl-4 pr-4">
                    <div className="min-w-max inline-block relative">
                        {/* Headers */}
                        <div className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-sm pb-2">
                            <div className="grid grid-cols-[auto_1fr] gap-2 mb-2">
                                <div className="sticky left-0 bg-slate-100/95 z-30 w-20">
                                    <div className="p-2 text-center font-semibold text-sm bg-white text-slate-500 rounded-lg h-full flex items-center justify-center">
                                    </div>
                                </div>
                                <div className="p-3 text-center font-semibold text-base bg-white text-slate-500 rounded-lg shadow-sm">Lebar Jalan (m)</div>
                            </div>
                            <div className="flex gap-2">
<div className="sticky left-0 bg-white p-1 w-20 h-14 z-30 flex items-center justify-center font-medium text-slate-500 rounded-lg shadow-sm">
    <span className="text-[10px] leading-none text-center">Jarak<br/>Tiang<br/>(m)</span>
</div>
                                {Array.from({length: GRID_COLS}).map((_, i) => (
                                    <div key={i} className="p-2 font-semibold text-sm text-center w-16 bg-white text-slate-500 rounded-lg shadow-sm">{i + 1}</div>
                                ))}
                            </div>
                        </div>

                        {/* Virtualized Body */}
                        <div style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}>
                            {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                const rowIndex = virtualRow.index;
                                const row = gridData[rowIndex];
                                if (!row) return null;

                                return (
                                        <div
                                            key={virtualRow.key}
                                            className="flex gap-2"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                                paddingTop: '8px' 
                                            }}
                                        >
                                            <div className="sticky left-0 bg-white p-2 w-20 z-10 text-center font-medium text-slate-500 rounded-lg flex items-center justify-center shadow-sm">{rowIndex + 1}</div>
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
}

// Admin Panel Page - MODIFIED
const AdminPage = ({ onBack, onViewReport, onEditReport, loggedInAdminName }) => {
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
        setIsListVisible(false);
        setTimeout(() => {
            setCurrentPage(1);
            setAppliedFilters(filters);
            setIsListVisible(true);
        }, 300);
    };

    const handleResetFilters = () => {
        setIsListVisible(false);
        setTimeout(() => {
            setFilters(initialFilters);
            setAppliedFilters(initialFilters);
            setCurrentPage(1);
            setIsListVisible(true);
        }, 300);
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
            
            // Log delete activity
            // await logReportDelete(
            //     loggedInAdminName,
            //     'admin',
            //     reportToDelete.projectTitle || 'Tanpa Judul'
            // );
            
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

            // Log bulk delete activity
            // await logBulkDelete(
            //     loggedInAdminName,
            //     'admin',
            //     successfulDeletes.length
            // );

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
            setIsListVisible(false);
            try {
                const response = await fetch('/api/reports');
                if (!response.ok) {
                    // Coba baca respons sebagai teks untuk mendapatkan detail error yang lebih baik
                    const errorText = await response.text();
                    throw new Error(`Gagal memuat data. Status: ${response.status}. Pesan: ${errorText || 'Tidak ada pesan error dari server.'}`);
                }
                const data = await response.json();
                const cleanedData = Array.isArray(data) ? data.filter(r => r && r.id) : [];
                setReports(cleanedData.map(r => ({...r, createdAt: new Date(r.createdAt), modifiedAt: r.modifiedAt ? new Date(r.modifiedAt) : null})));
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err.message || 'Terjadi kesalahan saat mengambil data.');
            } finally {
                setIsLoading(false);
                setTimeout(() => setIsListVisible(true), 100);
            }
        };
        fetchReports();
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


    const handleLoadReport = (report) => {
        const fullReportData = { ...report, gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData };
        onViewReport(fullReportData);
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

            // Bulk download all images at once
            if (allImageUrls.length > 0) {
                try {
                    const response = await fetch('/api/bulk-download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrls: allImageUrls }),
                    });

                    if (response.ok) {
                        const bulkData = await response.json();
                        if (bulkData.success) {
                            bulkData.results.forEach((result, index) => {
                                if (result.success && imageUrlMappings[index]) {
                                    const mapping = imageUrlMappings[index];
                                    mapping.folder.file(mapping.filename, result.base64Data, { base64: true });
                                } else {
                                    console.error(`Failed to download image ${index}:`, result.error);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error in bulk download:', error);
                    // Fallback to individual downloads for critical images
                    for (let i = 0; i < Math.min(allImageUrls.length, 20); i++) { // Limit fallback to 20 images
                        try {
                            const response = await fetch('/api/download-image', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageUrl: allImageUrls[i] }),
                            });
                            if (response.ok) {
                                const data = await response.json();
                                if (data.success && imageUrlMappings[i]) {
                                    const mapping = imageUrlMappings[i];
                                    mapping.folder.file(mapping.filename, data.base64Data, { base64: true });
                                }
                            }
                        } catch (err) {
                            console.error(`Fallback download failed for image ${i}:`, err);
                        }
                    }
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
                        <div className="flex flex-col items-end space-y-2 mt-4 sm:mt-0">
                            {loggedInAdminName && (
                                <span className="text-sm font-semibold text-gray-700">
                                    Hello {loggedInAdminName}
                                </span>
                            )}
                            <div className="flex items-center space-x-3">
                                {isBulkSelectionMode ? (
                                    <>
                                        <button 
                                            onClick={handleExportSelectedToZip} 
                                            disabled={isLoading || isExporting || selectedReportIds.length === 0}
                                            className="flex items-center text-sm px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all">
                                            <Archive size={16} className="mr-2" />
                                            {isExporting ? 'Mengekspor...' : `Export (${selectedReportIds.length}) Terpilih`}
                                        </button>
                                        <button
                                            onClick={() => setIsBulkDeleteConfirmOpen(true)}
                                            disabled={isLoading || selectedReportIds.length === 0}
                                            className="flex items-center text-sm px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all">
                                            <Trash2 size={16} className="mr-2" />
                                            Hapus ({selectedReportIds.length}) Terpilih
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsBulkSelectionMode(false);
                                                setSelectedReportIds([]);
                                            }}
                                            className="flex items-center text-sm px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                            <X size={16} className="mr-2" />
                                            Batalkan Pilihan
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsBulkSelectionMode(true)}
                                            className="flex items-center text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all">
                                            <PlusCircle size={16} className="mr-2" />
                                            Pilih Data
                                        </button>
                                        <button onClick={onBack} className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 shadow-sm hover:shadow-md transition-all">
                                            <ChevronLeft size={18} className="mr-1" />
                                            Kembali
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
            <FullscreenLoading isOpen={isExportModalOpen} onCancel={cancelExport} message="Sedang mengekspor…" />
        </div>
    );
};

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
            script.onerror = (e) => console.error(`Failed to load script: ${src}`, e);
            document.body.appendChild(script);
        };
        
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'jszip-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js', 'filesaver-script', () => {
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'sheetjs-script');
            });
        });
    }, []);

    const [page, setPage] = useState('loading');
    const [selection, setSelection] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [selectionKey, setSelectionKey] = useState(0);
    
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
    const [surveyorReports, setSurveyorReports] = useState([]);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    const [isLoadByNameModalOpen, setIsLoadByNameModalOpen] = useState(false);
    const [isPostSaveModalOpen, setIsPostSaveModalOpen] = useState(false);
    const [loggedInAdminName, setLoggedInAdminName] = useState(null);
    const [uploadedDocumentationPhotos, setUploadedDocumentationPhotos] = useState({});

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const savedSelection = localStorage.getItem('savedSelection');
                const savedGridData = localStorage.getItem('savedGridData');
                const savedProjectInfo = localStorage.getItem('savedProjectInfo');

                if (savedSelection && savedGridData && savedProjectInfo) {
                    console.log("Sesi aktif ditemukan, memulihkan...");
                    const parsedSelection = JSON.parse(savedSelection);
                    const parsedGridData = JSON.parse(savedGridData);
                    const parsedProjectInfo = JSON.parse(savedProjectInfo);

                    setSelection(parsedSelection);
                    setSessionData({
                        id: parsedProjectInfo.id || `recovered-${Date.now()}`, // Ensure ID exists for recovery
                        gridData: parsedGridData,
                        projectInfo: parsedProjectInfo,
                        teganganAwal: parsedSelection.teganganAwal,
                        fromPetugas: true // Indicate it's a user session
                    }); 
                    
            // Log page view for recovered session
            // await logPageView(
            //     parsedSelection.nama || 'Petugas',
            //     'petugas',
            //     'Grid Page (Recovered Session)'
            // );
                    
                    setPage('grid'); 
                } else {
                    // Log page view for new session
                    await logPageView(
                        'Anonymous',
                        'visitor',
                        'Selection Page'
                    );
                    setPage('selection'); 
                }
            } catch(e) {
                console.error("Gagal memulihkan sesi, data mungkin rusak:", e);
                localStorage.clear(); // Clear corrupted data
                setPage('selection');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleSelectionStart = async (projectTitle, nama, power, height, teganganAwal) => {
        if (!nama || !power || !height || !teganganAwal) return;
        
        const newSelection = { projectTitle, nama, power, height, teganganAwal };
        const newGridData = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => ({...DEFAULT_CELL_STATE })));
        // Assign a unique ID to new projects immediately
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
            id: newProjectInfo.id, // Use the generated ID
            gridData: newGridData,
            projectInfo: newProjectInfo,
            teganganAwal: teganganAwal,
            fromPetugas: true // Indicate it's a user session
        }); 

            // Log page view for new grid session
            // await logPageView(
            //     nama,
            //     'petugas',
            //     'Grid Page (New Session)'
            // );
        
        setPage('grid');
    };
    
    const handleExitGrid = () => {
        const returnPage = sessionData?.fromPage || 'selection';
        
        // Clear local storage on exit, as per user's request for clean slate
        localStorage.removeItem('savedGridData');
        localStorage.removeItem('savedProjectInfo');
        localStorage.removeItem('savedSelection');

        setSessionData(null);
        setSelection(null); 
        setPage(returnPage); 
        if(returnPage === 'selection') {
            setSelectionKey(prevKey => prevKey + 1);
        }
    }
    
    const handleViewReportFromAdmin = async (report) => {
        setSelection({
            nama: report.surveyorName,
            power: report.lampPower,
            height: report.poleHeight,
            teganganAwal: report.initialVoltage
        });
        setSessionData({
            id: report.id,
            gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData,
            projectInfo: {
                title: report.projectTitle,
                location: report.projectLocation,
                date: report.projectDate
            },
            teganganAwal: report.initialVoltage,
            fromPage: 'admin',
            isAdminView: true,
        });
        
        // Load documentation photos if they exist
        if (report.documentationPhotos) {
            setUploadedDocumentationPhotos(report.documentationPhotos);
        }
        
        // await logReportView(
        //     loggedInAdminName,
        //     'admin',
        //     report.projectTitle || 'Tanpa Judul'
        // );
        setPage('grid');
    };

    const handleEditReportFromAdmin = async (report) => {
        setSelection({
            nama: report.surveyorName,
            power: report.lampPower,
            height: report.poleHeight,
            teganganAwal: report.initialVoltage
        });
        setSessionData({
            id: report.id,
            gridData: typeof report.gridData === 'string' ? JSON.parse(report.gridData) : report.gridData,
            projectInfo: {
                title: report.projectTitle,
                location: report.projectLocation,
                date: report.projectDate
            },
            teganganAwal: report.initialVoltage,
            fromPage: 'admin',
            isAdminEdit: true,
        });
        
        // Load documentation photos if they exist
        if (report.documentationPhotos) {
            setUploadedDocumentationPhotos(report.documentationPhotos);
        }
        
        // await logReportEdit(
        //     loggedInAdminName,
        //     'admin',
        //     report.projectTitle || 'Tanpa Judul'
        // );
        setPage('grid');
    };

    const handleAdminLogin = async (adminName) => {
        if (adminName) {
            // await logAdminAccess(adminName);
            setLoggedInAdminName(adminName);
            setIsAdminLoginModalOpen(false);
            setPage('admin');
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
        
        // Load documentation photos if they exist
        if (report.documentationPhotos) {
            setUploadedDocumentationPhotos(report.documentationPhotos);
        }
        
        // Save the loaded report to localStorage for continuation
        localStorage.setItem('savedSelection', JSON.stringify(newSelection));
        localStorage.setItem('savedGridData', JSON.stringify(newSessionData.gridData));
        localStorage.setItem('savedProjectInfo', JSON.stringify(newSessionData.projectInfo));
        
        setSelection(newSelection);
        setSessionData(newSessionData);
        
        // Log report view activity
        // await logReportView(
        //     report.surveyorName,
        //     'petugas',
        //     report.projectTitle || 'Tanpa Judul'
        // );
        
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
        <div className="relative w-full min-h-screen bg-slate-100">
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'selection' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'selection' && 
                    <SelectionPage 
                        key={selectionKey}
                        onStart={handleSelectionStart} 
                        onAdminClick={() => setIsAdminLoginModalOpen(true)} 
                        onOpenLoadModal={() => setIsLoadByNameModalOpen(true)}
                    />
                }
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${page === 'admin' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {page === 'admin' && <AdminPage onBack={() => setPage('selection')} onViewReport={handleViewReportFromAdmin} onEditReport={handleEditReportFromAdmin} loggedInAdminName={loggedInAdminName} />}
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
                        loggedInAdminName={loggedInAdminName}
                    />
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
             <AdminLoginModal 
                isOpen={isAdminLoginModalOpen}
                onClose={() => setIsAdminLoginModalOpen(false)}
                onConfirm={handleAdminLogin}
            />
            <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} message={alertModal.message} type={alertModal.type} />
            <PostSaveModal
                isOpen={isPostSaveModalOpen}
                onContinue={() => setIsPostSaveModalOpen(false)}
                onExit={() => {
                    setIsPostSaveModalOpen(false);
                    handleExitGrid();
                }}
            />
        </div>
    );
}

const HomePageBackup = Home;
export default HomePageBackup;
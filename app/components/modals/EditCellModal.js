import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ImageIcon, Trash2, Save, ChevronDown, ChevronRight, MapPin, Clock } from 'lucide-react';
import useRealtimeLocation from '../../hooks/useRealtimeLocation';
import { LocationStatusIndicator } from '../LocationComponents';
import { CustomCalendarIcon } from '../Icons';
import { ConfirmationModal } from './ConfirmationModal';
import { getTimezoneInfo } from '../../utils';
import { DEFAULT_CELL_STATE, GRID_ROWS, GRID_COLS } from '../../constants';

export const EditCellModal = ({ isOpen, onClose, cellData, onSave, onDelete, cellCoords, isAdminEdit = false, onImageClick, surveyorName }) => {
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

    const handleClose = React.useCallback(() => {
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

        // Note: no longer auto-saving here. We only update local state; save will occur when user presses a save button.

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
            const baseName = `${timestamp}_row${cellCoords.row + 1}_col${cellCoords.col + 1}`;

            // Upload via API route to avoid CORS
            const formData = new FormData();
            formData.append('file', watermarkedBlob, `${baseName}.webp`);
            formData.append('path', 'petugas-photos');
            formData.append('fileName', baseName);

            const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Upload API error: ${res.status}`);
            }
            const { downloadURL } = await res.json();

            setData(prev => ({
                ...prev,
                image: downloadURL,
                timestamp: new Date().toISOString(),
                // keep location in state for saving via buttons
                location: isAdminEdit ? prev.location : currentLocation,
            }));

            // Optionally delete old image immediately if it was previously uploaded to Firebase
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
        } catch (err) {
            console.error('Upload error:', err);
            setData(prev => ({ ...prev, image: oldImageUrl }));
        } finally {
            if (document.body.contains(loadingAlert)) document.body.removeChild(loadingAlert);
            if (document.head.contains(style)) document.head.removeChild(style);
        }
    };

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
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[70] p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'}`}>
            <div onClick={(e) => e.stopPropagation()} className={`bg-slate-50 p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto relative transform transition-all duration-300 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Tutup">
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold mb-1 text-gray-800">Ubah Data Sel</h3>
                <p className="text-sm text-gray-500 mb-6">Posisi: Jarak Tiang {cellCoords.row + 1} meter, Lebar Jalan {cellCoords.col + 1} meter</p>

                {/* Nilai Lux Input - Moved above Tipe Sel */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Lux</label>
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                        placeholder="Masukkan nilai lux..."
                        inputMode="decimal"
                        autoComplete="off"
                    />
                </div>

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
                    
                    {/* (Lux input moved below, near action buttons) */}

                    {isAdminEdit && (
                        <>
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
                                <img src={data.image} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-lg bg-gray-200" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                    <div className="text-white text-center">
                                        <div className="w-8 h-8 mx-auto mb-2">👁️</div>
                                        <span className="text-sm">Lihat</span>
                                    </div>
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
                                    <MapPin size={14} className="mr-2 text-blue-600" />
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
                                onClick={async (e) => {
                                    e.preventDefault();
                                    const updatedData = {
                                        ...data,
                                        timestamp: new Date().toISOString(),
                                        location: isAdminEdit ? data.location : currentLocation
                                    };
                                    // sanitize lux for non-admin: if empty, remove to avoid overwriting
                                    if (!isAdminEdit) {
                                        const luxVal = updatedData.value;
                                        const isEmptyLux = luxVal === '' || luxVal === null || luxVal === undefined ||
                                            (typeof luxVal === 'string' && luxVal.trim() === '');
                                        if (isEmptyLux) delete updatedData.value;
                                    }
                                    await Promise.resolve(onSave(updatedData));
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
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            const updatedData = {
                                                ...data,
                                                timestamp: new Date().toISOString(),
                                                location: isAdminEdit ? data.location : currentLocation
                                            };
                                            if (!isAdminEdit) {
                                                const luxVal = updatedData.value;
                                                const isEmptyLux = luxVal === '' || luxVal === null || luxVal === undefined ||
                                                    (typeof luxVal === 'string' && luxVal.trim() === '');
                                                if (isEmptyLux) delete updatedData.value;
                                            }
                                            await Promise.resolve(onSave(updatedData));
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
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            const updatedData = {
                                                ...data,
                                                timestamp: new Date().toISOString(),
                                                location: isAdminEdit ? data.location : currentLocation
                                            };
                                            if (!isAdminEdit) {
                                                const luxVal = updatedData.value;
                                                const isEmptyLux = luxVal === '' || luxVal === null || luxVal === undefined ||
                                                    (typeof luxVal === 'string' && luxVal.trim() === '');
                                                if (isEmptyLux) delete updatedData.value;
                                            }
                                            await Promise.resolve(onSave(updatedData));
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

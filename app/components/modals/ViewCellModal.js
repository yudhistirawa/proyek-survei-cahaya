import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Clock } from 'lucide-react';
import { CustomCalendarIcon } from '../Icons';
import { getTimezoneInfo } from '../../utils';
import { DEFAULT_CELL_STATE } from '../../constants';

// Modal for viewing cell details (read-only)
export const ViewCellModal = ({ isOpen, onClose, cellData, cellCoords, onImageClick }) => {
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
                                <img 
                                    src={data.image} 
                                    alt="Lampiran" 
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

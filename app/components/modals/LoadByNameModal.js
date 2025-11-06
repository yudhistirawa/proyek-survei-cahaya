import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw } from 'lucide-react';

// Modal for loading a report by surveyor name
export const LoadByNameModal = ({ isOpen, onClose, onConfirm, isLoading, user }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    // Nama petugas otomatis dari user yang login
    const namaPetugas = user?.displayName || user?.email?.split('@')[0] || 'Petugas';

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setIsVisible(true);
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
        }, 300);
    };

    const handleConfirm = () => {
        if (isLoading) return;
        onConfirm(namaPetugas);
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
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
                <p className="text-sm text-gray-600 mb-6">Mencari laporan untuk petugas:</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Petugas</label>
                    <p className="text-yellow-800 font-medium">{namaPetugas}</p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button 
                        onClick={handleConfirm}
                        disabled={isLoading}
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

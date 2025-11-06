import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Generic confirmation modal
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Konfirmasi" }) => {
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
    
    const handleConfirm = () => { 
        onConfirm(); 
        handleClose(); 
    };
    
    if (!isOpen) return null;
    
    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[9999] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div onClick={e => e.stopPropagation()} className={`relative bg-white p-6 rounded-2xl shadow-2xl text-center transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={20} />
                </button>
                <div className="text-lg font-semibold text-gray-800 mb-2 mt-4">{title}</div>
                <div className="text-sm text-gray-600 mb-6">{message}</div>
                <div className="flex justify-center space-x-4">
                    <button className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={handleClose}>Batal</button>
                    <button className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" onClick={handleConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

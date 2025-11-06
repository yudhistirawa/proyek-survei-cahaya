import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Generic alert modal
export const AlertModal = ({ isOpen, onClose, message, type = 'warning', okText = 'OK' }) => {
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

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />;
            case 'error':
                return <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />;
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
        <div className={`fixed inset-0 flex justify-center items-center z-[9999] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div onClick={e => e.stopPropagation()} className={`relative bg-white p-6 rounded-2xl shadow-2xl text-center transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Tutup">
                    <X size={20} />
                </button>
                <div className="mt-6">
                    {getIcon()}
                    <p className="text-lg font-semibold text-gray-800 mb-2">{getTitle()}</p>
                    <p className="text-sm text-gray-600 mb-6">{message}</p>
                    <div className="flex justify-center">
                        <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onClick={handleClose}>{okText}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

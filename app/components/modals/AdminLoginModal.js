import React, { useState, useEffect, useRef } from 'react';
import { X, Shield } from 'lucide-react';

// Modal untuk login admin
export const AdminLoginModal = ({ isOpen, onClose, onConfirm }) => {
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

import React from 'react';
import { X, Database, ArrowUp, ArrowDown } from 'lucide-react';

export const SimpleLoadModal = ({ isOpen, onClose, loadDirection, selectedSpan }) => {
    if (!isOpen) return null;

    const getDirectionIcon = () => {
        return loadDirection === 'topToBottom' ? 
            <ArrowDown className="w-5 h-5 text-blue-500" /> : 
            <ArrowUp className="w-5 h-5 text-purple-500" />;
    };

    const getDirectionText = () => {
        return loadDirection === 'topToBottom' ? 
            'Memuat dari Atas ke Bawah' : 
            'Memuat dari Bawah ke Atas';
    };

    const getDirectionColor = () => {
        return loadDirection === 'topToBottom' ? 
            'border-blue-300 bg-blue-50' : 
            'border-purple-300 bg-purple-50';
    };

    return (
        <div 
            className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center"
            style={{ 
                zIndex: 999999,
                position: 'fixed',
                inset: 0
            }}
        >
            <div 
                className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border-4 border-orange-300 relative"
                style={{ 
                    maxHeight: '90vh', 
                    overflowY: 'auto',
                    margin: '20px'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" 
                    style={{ zIndex: 10 }}
                >
                    <X size={24} />
                </button>
                
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="w-6 h-6 text-orange-500" />
                        <h3 className="text-xl font-bold text-gray-800">Load Data Modifikasi</h3>
                    </div>
                    
                    {/* Direction Indicator */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${getDirectionColor()}`}>
                        {getDirectionIcon()}
                        <span className="font-medium text-gray-800">{getDirectionText()}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="text-center py-8">
                    <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-700 mb-2 font-medium">Sedang memuat data yang sudah dimodifikasi</p>
                    <p className="text-sm text-gray-500">untuk span {selectedSpan}</p>
                    
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                            <span className="font-medium">✅ Popup berhasil muncul!</span><br/>
                            Data akan dimuat ke grid dengan arah {getDirectionText().toLowerCase()}
                        </p>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <span className="font-medium">Info:</span> Modal akan tertutup otomatis dalam 3 detik
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

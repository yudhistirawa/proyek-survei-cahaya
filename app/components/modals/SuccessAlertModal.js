import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

const SuccessAlertModal = ({ 
    isVisible, 
    onClose, 
    title = "Berhasil Di Simpan", 
    message = "Data survey telah berhasil disimpan ke database.",
    autoClose = true,
    autoCloseDelay = 3000 
}) => {
    useEffect(() => {
        if (isVisible && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [isVisible, autoClose, autoCloseDelay, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-in slide-in-from-bottom-4">
                {/* Success Icon */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="pt-8 pb-6 px-6 text-center">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        {message}
                    </p>

                    {/* Progress Bar */}
                    {autoClose && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
                            <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-1 rounded-full transition-all duration-300 ease-linear"
                                style={{
                                    width: '100%',
                                    animation: `progress ${autoCloseDelay}ms linear`
                                }}
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Tutup
                        </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-b-2xl" />
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                
                @keyframes slide-in-from-bottom-4 {
                    from {
                        opacity: 0;
                        transform: translateY(1rem);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-in {
                    animation: slide-in-from-bottom-4 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default SuccessAlertModal;

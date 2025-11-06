'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ModernAlertModal = ({ 
    isVisible, 
    onClose, 
    type = 'success', // success, error, warning, info
    title, 
    message, 
    autoClose = false, 
    autoCloseDelay = 3000,
    showCloseButton = true,
    actions = null // Custom action buttons
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            
            if (autoClose) {
                const timer = setTimeout(() => {
                    handleClose();
                }, autoCloseDelay);
                
                return () => clearTimeout(timer);
            }
        }
    }, [isVisible, autoClose, autoCloseDelay]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-8 h-8 text-green-500" />;
            case 'error':
                return <XCircle className="w-8 h-8 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
            case 'info':
                return <Info className="w-8 h-8 text-blue-500" />;
            default:
                return <CheckCircle className="w-8 h-8 text-green-500" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    text: 'text-green-800',
                    button: 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    text: 'text-red-800',
                    button: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    text: 'text-yellow-800',
                    button: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                };
            case 'info':
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-800',
                    button: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                };
            default:
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    text: 'text-green-800',
                    button: 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
                };
        }
    };

    if (!isVisible) return null;

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-[50] overflow-y-auto">
            {/* Backdrop with blur effect */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-md transition-all duration-300 ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div 
                    className={`relative w-full max-w-md transform transition-all duration-300 ${
                        isAnimating 
                            ? 'scale-100 opacity-100 translate-y-0' 
                            : 'scale-95 opacity-0 translate-y-4'
                    }`}
                >
                    <div className={`rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border-2 overflow-hidden`}>
                        {/* Header */}
                        <div className="relative px-6 pt-6 pb-4">
                            {showCloseButton && (
                                <button
                                    onClick={handleClose}
                                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            )}
                            
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    {getIcon()}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${colors.text}`}>
                                        {title}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6">
                            <p className={`text-sm leading-relaxed ${colors.text} opacity-90`}>
                                {message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6">
                            {actions ? (
                                <div className="flex space-x-3">
                                    {actions}
                                </div>
                            ) : (
                                <button
                                    onClick={handleClose}
                                    className={`w-full px-4 py-3 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${colors.button}`}
                                >
                                    OK
                                </button>
                            )}
                        </div>

                        {/* Auto-close progress bar */}
                        {autoClose && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
                                <div 
                                    className={`h-full transition-all duration-${autoCloseDelay} ease-linear ${
                                        type === 'success' ? 'bg-green-400' :
                                        type === 'error' ? 'bg-red-400' :
                                        type === 'warning' ? 'bg-yellow-400' :
                                        'bg-blue-400'
                                    }`}
                                    style={{
                                        width: isAnimating ? '0%' : '100%',
                                        transitionDuration: `${autoCloseDelay}ms`
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernAlertModal;

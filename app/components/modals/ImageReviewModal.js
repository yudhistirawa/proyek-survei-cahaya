import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, RotateCw } from 'lucide-react';

// Modal for reviewing and downloading images
export const ImageReviewModal = ({ isOpen, onClose, imageSrc, downloadName }) => {
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
                    <img 
                        src={imageSrc} 
                        alt="Image Review" 
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

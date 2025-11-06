import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

const MobileGrid = ({ 
    gridData, 
    gridConfig, 
    onCellClick, 
    className = '' 
}) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastTap, setLastTap] = useState(0);
    const containerRef = useRef(null);
    const gridRef = useRef(null);

    const minZoom = 0.5;
    const maxZoom = 3;
    const zoomStep = 0.25;

    // Handle zoom in
    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev + zoomStep, maxZoom));
    }, []);

    // Handle zoom out
    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev - zoomStep, minZoom));
    }, []);

    // Reset zoom and pan
    const handleReset = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Handle touch start
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setIsDragging(true);
            setDragStart({
                x: touch.clientX - pan.x,
                y: touch.clientY - pan.y
            });
        } else if (e.touches.length === 2) {
            // Handle pinch zoom start
            e.preventDefault();
        }
    }, [pan]);

    // Handle touch move
    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 1 && isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            setPan({
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
            });
        } else if (e.touches.length === 2) {
            // Handle pinch zoom
            e.preventDefault();
        }
    }, [isDragging, dragStart]);

    // Handle touch end
    const handleTouchEnd = useCallback((e) => {
        setIsDragging(false);
        
        // Handle double tap to zoom
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            if (zoom === 1) {
                setZoom(2);
            } else {
                handleReset();
            }
        }
        setLastTap(currentTime);
    }, [lastTap, zoom, handleReset]);

    // Handle mouse events for desktop testing
    const handleMouseDown = useCallback((e) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - pan.x,
            y: e.clientY - pan.y
        });
    }, [pan]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add event listeners
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        
        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

    // Handle cell click with zoom consideration
    const handleCellClick = useCallback((rowIndex, colIndex, e) => {
        e.stopPropagation();
        if (!isDragging) {
            onCellClick(rowIndex, colIndex);
        }
    }, [isDragging, onCellClick]);

    // Get cell color based on value
    const getCellColor = (cell) => {
        const value = parseFloat(cell.value) || 0;
        if (value === 0) return 'bg-gray-100';
        if (value < 20) return 'bg-red-200 border-red-300';
        if (value < 40) return 'bg-orange-200 border-orange-300';
        if (value < 60) return 'bg-yellow-200 border-yellow-300';
        if (value < 80) return 'bg-green-200 border-green-300';
        return 'bg-blue-200 border-blue-300';
    };

    if (!gridData || gridData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl">
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <div>Belum ada data grid</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    disabled={zoom >= maxZoom}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                </button>
                <button
                    onClick={handleZoomOut}
                    disabled={zoom <= minZoom}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                    <ZoomOut className="w-5 h-5 text-gray-700" />
                </button>
                <button
                    onClick={handleReset}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <RotateCcw className="w-5 h-5 text-gray-700" />
                </button>
            </div>

            {/* Zoom Level Indicator */}
            <div className="absolute top-4 left-4 z-10 bg-white shadow-lg rounded-full px-3 py-1">
                <span className="text-sm font-medium text-gray-700">
                    {Math.round(zoom * 100)}%
                </span>
            </div>

            {/* Grid Container */}
            <div
                ref={containerRef}
                className="mobile-grid-container h-[60vh] cursor-grab active:cursor-grabbing"
                style={{
                    touchAction: 'none',
                    userSelect: 'none'
                }}
            >
                {/* Grid Labels */}
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm p-2">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium text-blue-800">Lebar Jalan (m)</span>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div
                    ref={gridRef}
                    className="relative"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                    }}
                >
                    <div className="flex">
                        {/* Left Label */}
                        <div className="flex items-center justify-center mr-2" style={{
                            minHeight: `${gridConfig.rows * 50}px`,
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            width: '24px'
                        }}>
                            <div className="text-sm font-medium text-blue-800 bg-blue-50 rounded px-1 py-2">
                                Jarak Tiang (m)
                            </div>
                        </div>

                        {/* Grid */}
                        <div 
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                                gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`
                            }}
                        >
                            {gridData.map((row, rowIndex) =>
                                row.map((cell, colIndex) => (
                                    <div
                                        key={`${rowIndex}-${colIndex}`}
                                        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                                        className={`
                                            mobile-grid-cell
                                            ${getCellColor(cell)}
                                            ${cell.value > 0 ? 'has-data' : ''}
                                            flex items-center justify-center text-xs font-medium
                                        `}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            fontSize: zoom < 1 ? '10px' : zoom > 1.5 ? '14px' : '12px'
                                        }}
                                    >
                                        {cell.value > 0 && (
                                            <span className="text-gray-800">
                                                {parseFloat(cell.value).toFixed(1)}
                                            </span>
                                        )}
                                        {cell.hasApiPoint && (
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-white shadow-lg rounded-full px-4 py-2">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>Jarak: {gridConfig.rows}m</span>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <span>Lebar: {gridConfig.cols}m</span>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <span>Total: {gridConfig.rows * gridConfig.cols}</span>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                    Ketuk 2x untuk zoom • Geser untuk pan
                </div>
            </div>
        </div>
    );
};

export default MobileGrid;

import React, { useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink } from 'lucide-react';

const PhotoReviewModal = ({ isOpen, onClose, image }) => {
  const [zoom, setZoom] = useState(1);

  const resetZoom = useCallback(() => setZoom(1), []);
  const zoomIn = useCallback(() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))), []);

  if (!isOpen || !image) return null;

  const title = image.title || 'Review Foto';
  const subtitle = image.subtitle || image.alt || '';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.src;
    a.download = (image.title || 'photo').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Zoom out">
                <ZoomOut size={18} className="text-gray-700" />
              </button>
              <button onClick={resetZoom} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Reset zoom">
                <RotateCw size={18} className="text-gray-700" />
              </button>
              <button onClick={zoomIn} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Zoom in">
                <ZoomIn size={18} className="text-gray-700" />
              </button>
              <button onClick={() => window.open(image.src, '_blank')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Buka di tab baru">
                <ExternalLink size={18} className="text-gray-700" />
              </button>
              <button onClick={handleDownload} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700" title="Download foto">
                <Download size={18} className="text-white" />
              </button>
              <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Tutup">
                <X size={18} className="text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
            <img
              src={image.src}
              alt={image.alt}
              className="max-w-none rounded-lg shadow-lg"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 150ms ease' }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-white">
            <div className="text-xs text-gray-500">Klik area gelap untuk menutup</div>
            <div className="text-xs text-gray-500">Zoom: {Math.round(zoom * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoReviewModal;

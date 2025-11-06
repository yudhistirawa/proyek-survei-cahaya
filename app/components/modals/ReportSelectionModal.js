import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Modal for selecting a report from a list
export const ReportSelectionModal = ({ isOpen, onClose, reports, onSelectReport }) => {
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

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-[80] p-4 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}>
            <div onClick={e => e.stopPropagation()} className={`bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Tutup">
                    <X size={24} />
                </button>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Pilih Laporan untuk Dilanjutkan</h3>
                <p className="text-sm text-gray-600 mb-6">Pilih salah satu laporan di bawah untuk melanjutkan pengeditan.</p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {reports.length > 0 ? reports.map(report => (
                        <button 
                            key={report.id} 
                            onClick={() => onSelectReport(report)}
                            className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-blue-100 hover:shadow-md transition-all duration-200 border border-gray-200"
                        >
                            <p className="font-semibold text-blue-600 text-lg">{report.surveyorName || 'Tanpa Nama Petugas'}</p>
                            <p className="font-medium text-gray-800 mt-1">{report.projectTitle || "Tanpa Judul"}</p>
                            <div className="text-xs text-gray-500 grid grid-cols-2 gap-2 mt-2">
                                <span><strong className="font-medium">Daya:</strong> {report.lampPower || 'N/A'}</span>
                                <span><strong className="font-medium">Tinggi:</strong> {report.poleHeight || 'N/A'}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">{report.projectLocation || "Tanpa Lokasi"}</p>
                        </button>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Tidak ada laporan yang ditemukan untuk petugas ini.</p>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <button 
                        onClick={handleClose}
                        className="w-full flex items-center justify-center p-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

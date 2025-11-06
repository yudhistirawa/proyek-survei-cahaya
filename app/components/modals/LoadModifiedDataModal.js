import React, { useState, useEffect } from 'react';
import { X, RotateCw, Lightbulb, Database, ArrowUp, ArrowDown } from 'lucide-react';

// Modal untuk memuat data yang sudah dimodifikasi
export const LoadModifiedDataModal = ({ isOpen, onClose, onSelectData, isLoading, selectedSpan, loadDirection }) => {
    const [modifiedReports, setModifiedReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalNumericValues, setTotalNumericValues] = useState(0);

    useEffect(() => {
        console.log('LoadModifiedDataModal useEffect - isOpen:', isOpen);
        if (isOpen) {
            console.log('Modal is opening...');
            loadModifiedData();
        } else {
            console.log('Modal is closing...');
            setModifiedReports([]);
            setTotalNumericValues(0);
        }
    }, [isOpen, selectedSpan]);

    const loadModifiedData = async () => {
        if (!selectedSpan) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/reports?limit=100&lightweight=false`);
            if (!res.ok) throw new Error('Gagal memuat data');
            const data = await res.json();

            // Filter hanya data yang sudah dimodifikasi dan sesuai span
            const filtered = data.filter(report => 
                report.modifiedAt && 
                report.gridData && 
                Array.isArray(report.gridData) && 
                report.gridData.length === parseInt(selectedSpan)
            ).map(report => {
                // Hitung total nilai numerik dalam gridData
                let numericCount = 0;
                if (report.gridData && Array.isArray(report.gridData)) {
                    report.gridData.forEach(row => {
                        if (Array.isArray(row)) {
                            row.forEach(cell => {
                                const value = Number(cell?.value) || 0;
                                if (value > 0) numericCount++;
                            });
                        }
                    });
                }

                return {
                    id: report.id,
                    lampPower: report.lampPower || 'N/A',
                    poleHeight: report.poleHeight || 'N/A',
                    surveyorName: report.surveyorName || 'Unknown',
                    projectTitle: report.projectTitle || 'Untitled',
                    projectLocation: report.projectLocation || 'Unknown',
                    gridData: report.gridData,
                    numericValues: numericCount,
                    modifiedAt: report.modifiedAt
                };
            });

            // Hitung total nilai numerik dari semua laporan
            const totalValues = filtered.reduce((sum, report) => sum + report.numericValues, 0);
            
            setModifiedReports(filtered);
            setTotalNumericValues(totalValues);
        } catch (error) {
            console.error('Error loading modified data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    const handleSelect = (report) => {
        if (isLoading) return;
        onSelectData(report);
        handleClose();
    };

    console.log('LoadModifiedDataModal render - isOpen:', isOpen);
    
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
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[99999] p-4"
            style={{ zIndex: 99999 }}
        >
            <div 
                onClick={e => e.stopPropagation()} 
                className="relative bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border-4 border-orange-300"
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10" 
                    aria-label="Tutup"
                >
                    <X size={24} />
                </button>
                
                {(loading || isLoading) && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col justify-center items-center rounded-2xl z-20">
                        <RotateCw className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                        <p className="text-sm text-gray-600">Memuat data yang sudah dimodifikasi...</p>
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Database className="w-6 h-6 text-orange-500" />
                        <h3 className="text-xl font-bold text-gray-800">Load Data Modifikasi</h3>
                    </div>
                    
                    {/* Direction Indicator */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${getDirectionColor()}`}>
                        {getDirectionIcon()}
                        <span className="font-medium text-gray-800">{getDirectionText()}</span>
                    </div>
                </div>

                {/* Data Summary */}
                {modifiedReports.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">Data Siap Dimuat</span>
                        </div>
                        <div className="text-sm text-green-700">
                            <p><span className="font-medium">{modifiedReports.length}</span> laporan dengan data modifikasi</p>
                            <p><span className="font-medium">{totalNumericValues}</span> total nilai numerik akan dimuat ke grid</p>
                            <p className="text-xs mt-1 text-green-600">
                                * Hanya nilai numerik yang akan ditampilkan di grid
                            </p>
                        </div>
                    </div>
                )}
                
                {modifiedReports.length === 0 && !loading && !isLoading ? (
                    <div className="text-center py-8">
                        <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">Tidak ada data modifikasi yang tersedia</p>
                        <p className="text-xs text-gray-400">untuk span {selectedSpan}</p>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <span className="font-medium">Info:</span> Modal ini menampilkan data yang sudah dimodifikasi. Data akan dimuat otomatis ke grid.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                            Data yang akan dimuat ({modifiedReports.length} laporan):
                        </p>
                        {modifiedReports.map((report) => (
                            <div
                                key={report.id}
                                className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800 text-sm">
                                            {report.lampPower} - {report.poleHeight}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {report.surveyorName} • {report.numericValues} nilai numerik
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Auto-loading message */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <span className="font-medium">Otomatis memuat:</span> Data akan langsung dimuat ke grid dan modal akan tertutup otomatis dalam 3 detik
                    </p>
                </div>
            </div>
        </div>
    );
};

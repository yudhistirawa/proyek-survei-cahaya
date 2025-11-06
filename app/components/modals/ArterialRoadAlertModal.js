import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ArterialRoadAlertModal = ({ isOpen, onClose, gridStats, roadStandards }) => {
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

    if (!isOpen || !gridStats || !roadStandards) return null;

    // Evaluasi kriteria jalan arterial
    const lAvgStatus = gridStats.lAvg >= roadStandards.lAvgMin;
    const ratioStatus = gridStats.uniformityRatio <= roadStandards.uniformityRatioMax;
    const overallStatus = lAvgStatus && ratioStatus;

    // Fungsi untuk mendapatkan status text
    const getStatusText = (isOk) => isOk ? 'OK' : 'NOT OK';
    const getStatusColor = (isOk) => isOk ? 'text-green-600' : 'text-red-600';
    const getStatusBg = (isOk) => isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

    return (
        <div className={`fixed inset-0 z-[200] transition-all duration-500 ease-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
        }`}>
            {/* Modern blurred backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-gray-900/60 to-black/70 backdrop-blur-xl" onClick={handleClose}></div>
            
            {/* Alert content */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <div className={`bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-500 ease-out ${
                    isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
                }`}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Evaluasi Standar Jalan Arterial</h2>
                                    <p className="text-sm text-gray-600">Analisis Kesesuaian dengan Standar Pencahayaan</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Overall Status */}
                        <div className={`mb-6 p-6 rounded-xl border-2 ${getStatusBg(overallStatus)}`}>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {overallStatus ? (
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                ) : (
                                    <XCircle className="w-12 h-12 text-red-500" />
                                )}
                                <div className="text-center">
                                    <h3 className={`text-2xl font-bold ${getStatusColor(overallStatus)}`}>
                                        {overallStatus ? 'MEMENUHI STANDAR' : 'TIDAK MEMENUHI STANDAR'}
                                    </h3>
                                    <p className="text-gray-600 mt-1">Jalan Arterial - Lalu Lintas Tinggi</p>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Analysis */}
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            {/* L-avg Analysis */}
                            <div className={`p-5 rounded-xl border-2 ${getStatusBg(lAvgStatus)}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    {lAvgStatus ? (
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-500" />
                                    )}
                                    <h4 className="font-bold text-gray-800">Pencahayaan Rata-rata (L-avg)</h4>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Nilai Aktual:</span>
                                        <span className="font-black text-xl text-gray-900">{gridStats.lAvg} <span className="text-sm font-semibold text-gray-700">lux</span></span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Standar Minimum:</span>
                                        <span className="font-black text-xl text-gray-900">{roadStandards.lAvgMin} <span className="text-sm font-semibold text-gray-700">lux</span></span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        <span className={`font-black text-lg ${getStatusColor(lAvgStatus)}`}>
                                            {getStatusText(lAvgStatus)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Kriteria:</strong> Jika L-avg di atas {roadStandards.lAvgMin} lux = OK, 
                                        jika di bawah = NOT OK
                                    </p>
                                </div>
                            </div>

                            {/* Uniformity Ratio Analysis */}
                            <div className={`p-5 rounded-xl border-2 ${getStatusBg(ratioStatus)}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    {ratioStatus ? (
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-500" />
                                    )}
                                    <h4 className="font-bold text-gray-800">Rasio Kemerataan</h4>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Nilai Aktual:</span>
                                        <span className="font-black text-xl text-gray-900">{gridStats.uniformityRatio}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Batas Maksimum:</span>
                                        <span className="font-black text-xl text-gray-900">{roadStandards.uniformityRatioMax}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        <span className={`font-black text-lg ${getStatusColor(ratioStatus)}`}>
                                            {getStatusText(ratioStatus)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Kriteria:</strong> Jika rasio {roadStandards.uniformityRatioMax} atau di bawah = OK, 
                                        di atas {roadStandards.uniformityRatioMax} = NOT OK
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Additional Statistics */}
                        <div className="mb-6 p-5 bg-gray-50 rounded-xl">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Info className="w-5 h-5 text-blue-500" />
                                Detail Statistik Pencahayaan
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <p className="text-sm font-medium text-gray-600 mb-1">L-Min</p>
                                    <p className="text-2xl font-black text-gray-900">{gridStats.lMin} <span className="text-sm font-semibold text-gray-700">lux</span></p>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                                    <p className="text-sm font-medium text-gray-600 mb-1">L-Max</p>
                                    <p className="text-2xl font-black text-gray-900">{gridStats.lMax} <span className="text-sm font-semibold text-gray-700">lux</span></p>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                                    <p className="text-sm font-medium text-gray-600 mb-1">L-Avg</p>
                                    <p className="text-2xl font-black text-gray-900">{gridStats.lAvg} <span className="text-sm font-semibold text-gray-700">lux</span></p>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                                    <p className="text-sm font-medium text-gray-600 mb-1">Total Data</p>
                                    <p className="text-2xl font-black text-gray-900">{gridStats.totalCells} <span className="text-sm font-semibold text-gray-700">sel</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {!overallStatus && (
                            <div className="mb-6 p-5 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                                <h4 className="font-bold text-yellow-800 mb-3">💡 Rekomendasi Perbaikan</h4>
                                <ul className="space-y-2 text-sm text-yellow-700">
                                    {!lAvgStatus && (
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                <strong>Pencahayaan Rata-rata:</strong> Tingkatkan intensitas pencahayaan dengan 
                                                menambah daya lampu atau mengurangi jarak antar tiang lampu
                                            </span>
                                        </li>
                                    )}
                                    {!ratioStatus && (
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                                            <span>
                                                <strong>Rasio Kemerataan:</strong> Perbaiki distribusi cahaya dengan mengatur 
                                                posisi lampu atau menggunakan reflektor yang lebih baik
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Success message */}
                        {overallStatus && (
                            <div className="mb-6 p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                                <h4 className="font-bold text-green-800 mb-2">✅ Pencahayaan Memenuhi Standar</h4>
                                <p className="text-sm text-green-700">
                                    Sistem pencahayaan jalan arterial ini telah memenuhi standar yang ditetapkan 
                                    untuk pencahayaan rata-rata dan kemerataan distribusi cahaya.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gradient-to-r from-gray-50/90 to-white/90 backdrop-blur-xl border-t border-gray-200/50 px-6 py-4 rounded-b-3xl">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 font-medium">
                                Evaluasi berdasarkan standar pencahayaan jalan arterial
                            </p>
                            <button 
                                onClick={handleClose}
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { ArterialRoadAlertModal };

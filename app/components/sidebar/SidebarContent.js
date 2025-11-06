import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronDown, MapPin, Trash2, FileSpreadsheet, Upload } from 'lucide-react';
import { SurveyorIcon, CustomCalendarIcon, LampPostIcon } from '../Icons';
import { LocationStatusIndicator } from '../LocationComponents';
import { Lightbulb, Zap } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export const SidebarContent = React.memo(({ 
    projectInfo, 
    onProjectTitleChange, 
    selectedName, 
    selectedPower, 
    selectedHeight, 
    selectedTegangan, 
    stats, 
    onBack, 
    onClear, 
    onSaveToDb, 
    isSaving, 
    isUserMode, 
    isAdminView, 
    isAdminEdit, 
    onExportSingle, 
    openDocumentationModal, 
    isMobilePanel = false, 
    projectLocationStatus 
}) => {
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    // Project title is auto-filled and not editable
    const localTitle = projectInfo.title || '';
    const debouncedTitle = useDebounce(localTitle, 500);
    const mounted = useRef(false);

    const infoItems = [
        { icon: <SurveyorIcon className="text-gray-500"/>, label: "Petugas", value: selectedName },
        { icon: <CustomCalendarIcon className="text-gray-500"/>, label: "Tanggal", value: new Date(projectInfo.date).toLocaleDateString('id-ID') },
        { icon: <Lightbulb size={16} className="text-yellow-500"/>, label: "Daya", value: selectedPower },
        { icon: <Zap size={16} className="text-orange-500"/>, label: "Tegangan", value: selectedTegangan },
        { icon: <LampPostIcon className="text-blue-500"/>, label: "Tinggi Tiang", value: selectedHeight },
    ];
    
    const isTitleReadOnly = true;

    return (
        <div className="flex flex-col h-full">
            <div className={`flex-shrink-0 ${isMobilePanel ? 'pt-0' : 'pt-12 lg:pt-4'}`}>
                <button 
                    onClick={() => onBack(isAdminEdit)} 
                    className="flex items-center justify-center w-full px-4 py-2.5 mb-4 text-sm font-semibold bg-white text-blue-600 border border-slate-300 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                    <ChevronLeft size={18} className="mr-2" />
                    {isUserMode ? "Kembali ke Pemilihan" : "Kembali ke Daftar Laporan"}
                </button>
            </div>
            
            <div className={`flex-1 overflow-y-auto min-h-0 ${isMobilePanel ? '' : 'pr-2 -mr-2'}`}>
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow p-4 space-y-3">
                        <h3 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2">Info Laporan</h3>
                        <div>
                            <label className="text-xs font-medium text-gray-500">Nama Lampu</label>
                            <div className="w-full mt-1 p-2 text-sm rounded-md bg-gray-100 text-black border border-gray-200 cursor-not-allowed">
                                 {localTitle || 'Nama Lampu...'}
                             </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500">Lokasi Proyek</label>
                            <div className="space-y-2 mt-1">
                                <div className="flex items-center gap-2 p-2 text-sm rounded-md bg-gray-100 text-gray-700">
                                   <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                                   <span className="truncate">{projectInfo.location || 'Lokasi tidak diketahui'}</span>
                                </div>
                                {isUserMode && projectLocationStatus && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Status GPS:</span>
                                        <LocationStatusIndicator 
                                            location={projectLocationStatus.location}
                                            accuracy={projectLocationStatus.accuracy}
                                            error={projectLocationStatus.error}
                                            isLoading={projectLocationStatus.isLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-flow-col grid-rows-3 gap-x-4 gap-y-2 pt-2 auto-cols-fr">
                            {infoItems.map(item => (
                                <div key={item.label} className="bg-slate-50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                    <p className="font-semibold text-sm text-gray-800 mt-1 truncate">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 mb-3">Statistik (Lux)</h3>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-500">L-Min</p>
                                <p className="text-xl font-bold text-blue-600">{stats.lmin}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">L-Max</p>
                                <p className="text-xl font-bold text-green-600">{stats.lmax}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">L-Avg</p>
                                <p className="text-xl font-bold text-yellow-600">{stats.lavg}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow p-4">
                        <button onClick={() => setIsLegendOpen(!isLegendOpen)} className="w-full flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Legenda Warna</h3>
                            <ChevronDown className={`transition-transform duration-300 ${isLegendOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isLegendOpen ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="min-h-0 space-y-1">
                                {/* Color legend items would go here */}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-lg text-gray-800">Aksi</h3>
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            {(isAdminView || isAdminEdit) && (
                                <button 
                                    onClick={onExportSingle} 
                                    className="w-full flex items-center justify-center p-3 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                    <FileSpreadsheet className="mr-2" size={18}/>Export Laporan Ini (ZIP)
                                </button>
                            )}
                            {(isUserMode || isAdminEdit) && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openDocumentationModal();
                                        }} 
                                        className="w-full flex items-center justify-center p-3 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 mb-3 touch-manipulation active:bg-indigo-800 min-h-[48px]"
                                    >
                                        <Upload size={18} className="mr-2"/> Dokumentasi
                                    </button>
                                    <button onClick={() => onClear(!!isAdminEdit)} className="w-full flex items-center justify-center p-3 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                        <Trash2 size={18} className="mr-2"/>Bersihkan Grid
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

SidebarContent.displayName = 'SidebarContent';

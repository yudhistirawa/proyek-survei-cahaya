import React from 'react';
import { MapPin, ChevronUp, Lightbulb, Zap, LogOut } from 'lucide-react';
import { SurveyorIcon, CustomCalendarIcon, LampPostIcon } from '../Icons';
import { LocationStatusIndicator } from '../LocationComponents';

export const GridHeader = React.memo(({ projectInfo, selectedName, selectedPower, selectedHeight, selectedTegangan, onToggleHeader, projectLocationStatus, user, onLogout }) => {
    // Function to get role display name
    const getRoleDisplayName = (role) => {
        const roleMap = {
            'petugas_pengukuran': 'Petugas Pengukuran',
            'petugas_surveyor': 'Petugas Surveyor', 
            'petugas_kemerataan_sinar': 'Petugas Kemerataan Sinar',
            'admin': 'Administrator',
            'admin_survey': 'Admin Survey'
        };
        return roleMap[role] || 'Petugas';
    };

    // Get current date in Indonesian format
    const getCurrentDate = () => {
        return new Date().toLocaleDateString('id-ID', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const infoItems = [
        { 
            icon: <SurveyorIcon className="w-4 h-4 text-gray-500" />, 
            label: "Petugas", 
            value: user?.displayName || user?.username || selectedName || 'Petugas'
        },
        { 
            icon: <CustomCalendarIcon className="w-4 h-4 text-gray-500" />, 
            label: "Tanggal", 
            value: getCurrentDate()
        },
        { 
            icon: <Lightbulb className="w-4 h-4 text-yellow-500"/>, 
            label: "Daya Lampu", 
            value: selectedPower 
        },
        { 
            icon: <Zap className="w-4 h-4 text-orange-500"/>, 
            label: "Tegangan", 
            value: selectedTegangan 
        },
        { 
            icon: <LampPostIcon className="w-4 h-4 text-blue-500"/>, 
            label: "Jarak Tiang (m)", 
            value: selectedHeight 
        },
    ];

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm w-full relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                <div className="w-full lg:flex-grow text-center lg:text-left mb-4 lg:mb-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-800 truncate" title={projectInfo.title || 'Tanpa Nama Lampu'}>
                                {projectInfo.title || 'Tanpa Nama Lampu'}
                            </h1>
                            <div className="flex items-center justify-center lg:justify-start gap-2 mt-1">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                    <span className="text-sm text-gray-500 truncate">{projectInfo.location || 'Lokasi tidak diketahui'}</span>
                                </div>
                                {projectLocationStatus && (
                                    <LocationStatusIndicator 
                                        location={projectLocationStatus.location}
                                        accuracy={projectLocationStatus.accuracy}
                                        error={projectLocationStatus.error}
                                        isLoading={projectLocationStatus.isLoading}
                                    />
                                )}
                            </div>
                        </div>
                        
                        {/* Logout Button - Integrated in Header */}
                        {onLogout && (
                            <div className="ml-4">
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg shadow-sm transition-colors duration-200 text-sm font-medium"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="w-full lg:w-auto grid grid-rows-3 grid-flow-col auto-cols-max gap-x-6 gap-y-2 justify-between sm:justify-end lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-y-3 text-sm pt-4 lg:pt-0 border-t border-gray-200 lg:border-t-0 lg:border-l lg:pl-6">
                    {infoItems.map(item => (
                        <div key={item.label} className="flex items-center gap-2" title={item.label}>
                            <div className="flex-shrink-0">{item.icon}</div>
                            <span className="text-gray-700 font-medium truncate">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:hidden absolute bottom-[-12px] left-1/2 -translate-x-1/2">
                <button
                    onClick={onToggleHeader}
                    className="bg-white p-1 rounded-full shadow-md border border-gray-200 hover:bg-gray-100 transition-colors"
                    aria-label="Sembunyikan header"
                >
                    <ChevronUp size={20} className="text-gray-600"/>
                </button>
            </div>
        </div>
    );
});

GridHeader.displayName = 'GridHeader';

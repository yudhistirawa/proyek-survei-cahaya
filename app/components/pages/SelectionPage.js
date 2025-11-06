import React, { useState } from 'react';
import { Shield, Sun, BarChart3, LogOut, User } from 'lucide-react';
import { HEIGHT_OPTIONS } from '../../constants';

// Initial Selection Page
export const SelectionPage = React.memo(({ onStart, onAdminClick, onOpenLoadModal, allowedDashboard, onLogout, user }) => {
    // Dashboard type selection state - set based on allowedDashboard or default to measurement
    const [selectedDashboard, setSelectedDashboard] = useState(allowedDashboard || 'measurement'); // 'measurement' or 'uniformity'
    
    const [projectTitle, setProjectTitle] = useState('');
    const [power, setPower] = useState('');
    const [teganganAwal, setTeganganAwal] = useState('');
    const [height, setHeight] = useState('');

    // State untuk Dashboard Kemerataan Sinar
    const [uniformityProjectTitle, setUniformityProjectTitle] = useState('');
    const [uniformityPower, setUniformityPower] = useState('');
    const [uniformityTeganganAwal, setUniformityTeganganAwal] = useState('');
    const [uniformityHeight, setUniformityHeight] = useState('');

    // Nama petugas otomatis dari user yang login
    const namaPetugas = user?.displayName || user?.email?.split('@')[0] || 'Petugas';

    const handleAlphabeticInputChange = (setter) => (e) => {
        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        setter(value);
    };

    const handleNumericInputChange = (setter) => (e) => {
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        setter(numericValue);
    };

    const handleStartClick = () => {
        const powerWithUnit = power ? `${power}W` : '';
        const teganganWithUnit = teganganAwal ? `${teganganAwal}V` : '';
        onStart(projectTitle, namaPetugas, powerWithUnit, height, teganganWithUnit);
    };

    const handleUniformityStartClick = () => {
        const powerWithUnit = uniformityPower ? `${uniformityPower}W` : '';
        const teganganWithUnit = uniformityTeganganAwal ? `${uniformityTeganganAwal}V` : '';
        onStart(uniformityProjectTitle, namaPetugas, powerWithUnit, uniformityHeight, teganganWithUnit);
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-200 p-4">
            <div className="w-full max-w-4xl mx-auto">
                {/* Modern User Greeting Card - Top Right */}
                <div className="absolute top-6 right-6 z-10">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 flex items-center gap-4 hover:shadow-2xl transition-all duration-300 hover:scale-105">
                        {/* User Avatar */}
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                <User size={20} className="text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex flex-col">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Welcome back</div>
                            <div className="text-sm font-bold text-gray-800 truncate max-w-32">{namaPetugas}</div>
                        </div>
                        
                        {/* Logout Button */}
                        <button 
                            onClick={onLogout}
                            className="ml-2 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-200 hover:scale-110 group"
                            title="Logout"
                        >
                            <LogOut size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                        </button>
                    </div>
                </div>
                {/* Selected Dashboard Form */}
                <div className="flex justify-center">
                    <div className="w-full max-w-lg">
                        {/* Dashboard Type Selection - Only show if user can access both dashboards */}
                        {!allowedDashboard && (
                            <div className="flex justify-center gap-2 mb-6">
                                <button
                                    onClick={() => setSelectedDashboard('measurement')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                        selectedDashboard === 'measurement'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4 inline mr-2" />
                                    Dashboard Pengukuran
                                </button>
                                
                                <button
                                    onClick={() => setSelectedDashboard('uniformity')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                        selectedDashboard === 'uniformity'
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                >
                                    <Sun className="w-4 h-4 inline mr-2" />
                                    Dashboard Kemerataan Sinar
                                </button>
                            </div>
                        )}

                        {selectedDashboard === 'uniformity' ? (
                            /* Dashboard Kemerataan Sinar - Simplified */
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 space-y-6 animate-slideDown">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-4">
                                        <Sun className="w-8 h-8 text-orange-500 mr-3" />
                                        <h1 className="text-3xl font-bold text-gray-800">Dashboard Kemerataan Sinar</h1>
                                    </div>
                                    <p className="text-gray-500 mt-2">Analisis distribusi dan kemerataan pencahayaan.</p>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <button 
                                        onClick={() => onStart('Kemerataan Sinar', namaPetugas, '', '', '')} 
                                        className="w-full bg-orange-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-orange-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl text-lg"
                                    >
                                        Mulai Kemerataan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Dashboard Pengukuran */
                            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 space-y-6 animate-slideDown">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-4">
                                        <BarChart3 className="w-8 h-8 text-blue-500 mr-3" />
                                        <h1 className="text-3xl font-bold text-gray-800">Dashboard Pengukuran</h1>
                                    </div>
                                    <p className="text-gray-500 mt-2">Isi detail untuk memulai atau muat sesi terakhir.</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">Nama Lampu</label>
                                        <input 
                                            id="title-input" 
                                            type="text" 
                                            value={projectTitle} 
                                            onChange={handleAlphabeticInputChange(setProjectTitle)} 
                                            placeholder="Masukkan Nama Lampu" 
                                            className={`w-full p-3 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${projectTitle ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="power-input" className="block text-sm font-medium text-gray-700 mb-1">Daya Lampu</label>
                                            <div className="relative">
                                                <input 
                                                    id="power-input" 
                                                    type="text" 
                                                    value={power} 
                                                    onChange={handleNumericInputChange(setPower)} 
                                                    placeholder="Contoh: 55" 
                                                    className={`w-full p-3 pr-12 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${power ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}
                                                />
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">W</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="tegangan-input" className="block text-sm font-medium text-gray-700 mb-1">Tegangan Awal</label>
                                            <div className="relative">
                                                <input 
                                                    id="tegangan-input" 
                                                    type="text" 
                                                    value={teganganAwal} 
                                                    onChange={handleNumericInputChange(setTeganganAwal)} 
                                                    placeholder="Contoh: 220" 
                                                    className={`w-full p-3 pr-10 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${teganganAwal ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}
                                                />
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">V</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="height-select" className="block text-sm font-medium text-gray-700 mb-1">Tinggi Tiang</label>
                                        <select 
                                            id="height-select" 
                                            value={height} 
                                            onChange={(e) => setHeight(e.target.value)} 
                                            className={`w-full p-3 border rounded-lg transition-colors duration-300 ease-in-out focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${height ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}`}
                                        >
                                            <option value="" disabled>Pilih Tinggi Tiang...</option>
                                            {HEIGHT_OPTIONS.map(opt => <option key={opt} value={opt} className="text-black">{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                <button 
                                    onClick={handleStartClick} 
                                    disabled={!projectTitle || !power || !height || !teganganAwal} 
                                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl disabled:bg-blue-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                                >
                                    Mulai Survei Baru
                                </button>
                                    <button 
                                        onClick={onOpenLoadModal} 
                                        className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                                    >
                                        Muat Laporan Petugas
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
});

SelectionPage.displayName = 'SelectionPage';

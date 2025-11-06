import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Database, FileCheck, AlertCircle } from 'lucide-react';
import ValidSurveyDetailModal from '../modals/ValidSurveyDetailModal';
import MiniMapsComponent from '../MiniMapsComponent';

const ValidSurveyDataPage = ({ onBack }) => {
    const [currentView, setCurrentView] = useState('menu'); // 'menu' atau 'detail'
    const [selectedSurveyType, setSelectedSurveyType] = useState(null);
    const [validSurveys, setValidSurveys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const surveyTypes = [
        {
            id: 'survey_existing',
            title: 'Survey Existing',
            description: 'Data Survey Existing yang telah tervalidasi',
            icon: '🔍',
            color: 'from-blue-500 to-blue-600'
        },
        {
            id: 'survey_apj_propose',
            title: 'Survey Tiang APJ Propose',
            description: 'Data Survey Tiang APJ Propose yang telah tervalidasi',
            icon: '📋',
            color: 'from-green-500 to-green-600'
        }
    ];

    const loadValidSurveys = async (surveyType) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/valid-surveys?type=${surveyType}`);
            if (!response.ok) {
                throw new Error('Gagal mengambil data survey valid');
            }
            const data = await response.json();
            setValidSurveys(data);
        } catch (error) {
            console.error('Error loading valid surveys:', error);
            alert('Gagal memuat data survey valid: ' + error.message);
            setValidSurveys([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSurveyTypeClick = (surveyType) => {
        setSelectedSurveyType(surveyType);
        setCurrentView('detail');
        loadValidSurveys(surveyType.id);
    };

    const handleBackToMenu = () => {
        setCurrentView('menu');
        setSelectedSurveyType(null);
        setValidSurveys([]);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Tidak diketahui';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderMenuView = () => (
        <div className="flex-1 bg-gradient-to-b from-gray-200 to-gray-300 pb-20 min-h-screen">
            {/* Header dengan styling sesuai gambar */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-lg font-bold text-gray-900">
                                Data Survey Valid
                            </h1>
                        </div>
                        
                        <div className="p-2">
                            <Database size={20} className="text-gray-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu List dengan styling sesuai gambar */}
            <div className="px-4 py-6">
                <div className="space-y-3">
                    {surveyTypes.map((surveyType, index) => (
                        <button
                            key={surveyType.id}
                            onClick={() => handleSurveyTypeClick(surveyType)}
                            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:bg-gray-50 active:scale-98"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">
                                        {surveyType.icon}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {surveyType.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {surveyType.description}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex-shrink-0">
                                    <ChevronRight size={20} className="text-gray-400" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Info section */}
                <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">i</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                Informasi Data Survey Valid
                            </h4>
                            <p className="text-sm text-blue-800">
                                Halaman ini menampilkan data survey yang telah divalidasi dan disetujui oleh admin. 
                                Pilih kategori survey untuk melihat detail data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDetailView = () => (
        <div className="flex-1 bg-gray-100 pb-20 min-h-screen">
            {/* Header Detail */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBackToMenu}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-lg font-bold text-gray-900">
                                {selectedSurveyType?.title}
                            </h1>
                            <p className="text-sm text-gray-600">
                                {validSurveys.length} data tersedia
                            </p>
                        </div>
                        
                        <div className="p-2">
                            <FileCheck size={20} className="text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Detail */}
            <div className="px-4 py-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Memuat data survey...</p>
                    </div>
                ) : validSurveys.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Belum Ada Data
                        </h3>
                        <p className="text-gray-600">
                            Belum ada data survey valid untuk kategori ini.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Data akan muncul setelah admin memvalidasi survey.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {validSurveys.map((survey, index) => (
                            <button
                                key={survey.id}
                                onClick={() => {
                                    setSelectedSurvey(survey);
                                    setIsModalOpen(true);
                                }}
                                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:bg-gray-50 active:scale-98 text-left"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="space-y-3">
                                    {/* Header dengan Judul dan Koordinat */}
                                    <div>
                                        <h3 className="text-base font-semibold text-black mb-2">
                                            {selectedSurveyType?.title} - {survey.titikKordinat || survey.projectLocation || 'Koordinat tidak tersedia'}
                                        </h3>
                                        <div className="flex items-center text-sm text-black">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                            {survey.titikKordinat || survey.projectLocation || 'Lokasi tidak diketahui'}
                                        </div>
                                    </div>

                                    {/* Info Grid dengan Layout 2 Kolom */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-black block">Surveyor:</span>
                                            <p className="font-medium text-black">
                                                {survey.surveyorName || 'Petugas Survey ARM'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-black block">Kategori:</span>
                                            <p className="font-medium text-black">
                                                {survey.surveyCategory === 'survey_existing' ? 'Survey Existing' : 
                                                 survey.surveyCategory === 'survey_apj_propose' ? 'Survey Tiang APJ Propose' : 
                                                 'Survey Existing'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-black block">Divalidasi oleh:</span>
                                            <p className="font-medium text-blue-600">
                                                {survey.validatedBy || 'yudis'}
                                            </p>
                                        </div>
                                        {survey.median === 'Ada' && (
                                            <div>
                                                <span className="text-black block">Median:</span>
                                                <p className="font-medium text-black">
                                                    T: {survey.tinggiMedian || '-'}m, L: {survey.lebarMedian || '-'}m
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-black block">Tanggal Validasi:</span>
                                            <p className="font-medium text-black">
                                                {formatDate(survey.validatedAt) || '31 Jul 2025'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status Badges */}
                                    <div className="flex items-center space-x-2 pt-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                            ✅ Tervalidasi
                                        </span>
                                        
                                        {survey.hasPhoto && (
                                            <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                📷 Ada Foto
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSurvey(null);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {currentView === 'menu' ? renderMenuView() : renderDetailView()}
            
            {/* Modal Detail Survey */}
            <ValidSurveyDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                survey={selectedSurvey}
                surveyType={selectedSurveyType}
            />

            {/* Mini Maps Component - Always show if task is active */}
            <MiniMapsComponent 
                userId={null} 
                taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
            />
        </div>
    );
};

export default ValidSurveyDataPage;

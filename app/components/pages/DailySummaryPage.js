import React from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Activity, BarChart3, RefreshCw, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import useDailySummary from '../../hooks/useDailySummary';

const DailySummaryPage = ({ onBack, taskId, userId }) => {
    const {
        summary,
        loading,
        error,
        refreshSummary,
        formatTime,
        formatDate,
        formatLastUpdated,
        getStatusColor,
        getPriorityColor,
        getPriorityText,
        getStatusText
    } = useDailySummary(taskId, userId);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat ringkasan harian...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
                <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50 sticky top-0 z-40">
                    <div className="px-6 py-5">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onBack}
                                className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                            >
                                <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                            </button>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Ringkasan Harian
                            </h1>
                            <div className="w-12"></div>
                        </div>
                    </div>
                </div>
                
                <div className="px-6 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Gagal Memuat Data</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={refreshSummary}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl hover:bg-red-600 transition-colors duration-200 flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw size={16} />
                            Coba Lagi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50 sticky top-0 z-40">
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Ringkasan Harian
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {formatDate(new Date().toISOString())}
                            </p>
                        </div>
                        
                        <button
                            onClick={refreshSummary}
                            disabled={loading}
                            className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-8 pb-24 max-w-md mx-auto">
                {/* Task Info Card */}
                {summary.taskInfo && (
                    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                                <FileText size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-gray-800">Informasi Tugas</h2>
                                <p className="text-sm text-gray-600">ID: {summary.taskInfo.id}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-1">{summary.taskInfo.judul}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(summary.taskInfo.status)}`}>
                                        {getStatusText(summary.taskInfo.status)}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(summary.taskInfo.prioritas)}`}>
                                        {getPriorityText(summary.taskInfo.prioritas)}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        summary.taskInfo.tipe === 'existing' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {summary.taskInfo.tipe === 'existing' ? 'Zona Existing' : 'Propose'}
                                    </span>
                                </div>
                            </div>
                            
                            {summary.taskInfo.deadline && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={16} />
                                    <span>Deadline: {formatDate(summary.taskInfo.deadline)}</span>
                                </div>
                            )}
                            
                            <div className="text-xs text-gray-500">
                                Ditugaskan oleh: {summary.taskInfo.assignedBy}
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics Card */}
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Statistik Hari Ini</h2>
                            <p className="text-sm text-gray-600">Progress pekerjaan untuk tugas ini</p>
                            {summary.lastUpdated && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Diperbarui: {formatLastUpdated()}
                                </p>
                            )}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { 
                                value: summary.statistikHariIni.surveyHariIni, 
                                label: "Survey Hari Ini", 
                                color: "text-blue-600", 
                                bgColor: "bg-blue-50", 
                                icon: FileText 
                            },
                            { 
                                value: summary.statistikHariIni.surveySelesai, 
                                label: "Survey Selesai", 
                                color: "text-green-600", 
                                bgColor: "bg-green-50", 
                                icon: CheckCircle 
                            },
                            { 
                                value: summary.statistikHariIni.surveyPending, 
                                label: "Survey Pending", 
                                color: "text-orange-600", 
                                bgColor: "bg-orange-50", 
                                icon: AlertTriangle 
                            }
                        ].map((stat, index) => (
                            <div key={index} className="text-center group">
                                <div className={`w-12 h-12 ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                                    <stat.icon size={20} className={stat.color} />
                                </div>
                                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                                    {stat.value}
                                </div>
                                <div className="text-xs text-gray-600 font-medium leading-tight">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progress Tugas</span>
                            <span className="text-sm font-bold text-blue-600">{summary.statistikHariIni.progressPersentase}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${summary.statistikHariIni.progressPersentase}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                        Total Survey untuk Tugas Ini: {summary.statistikHariIni.totalSurveyTugas}
                    </div>
                </div>

                {/* Survey Details Today */}
                {summary.surveyHariIniDetail && summary.surveyHariIniDetail.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Survey Hari Ini</h2>
                                <p className="text-sm text-gray-600">Detail survey yang dikerjakan</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {summary.surveyHariIniDetail.map((survey, index) => (
                                <div key={index} className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{survey.jenisSurvey}</h3>
                                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                                <MapPin size={14} />
                                                {survey.lokasi}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(survey.status)}`}>
                                            {getStatusText(survey.status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock size={12} />
                                        <span>{formatTime(survey.waktu)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activities */}
                {summary.aktivitasTerbaru && summary.aktivitasTerbaru.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Activity size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Aktivitas Terbaru</h2>
                                <p className="text-sm text-gray-600">Riwayat aktivitas hari ini</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {summary.aktivitasTerbaru.map((activity, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        activity.tipe === 'survey' ? 'bg-blue-100' : 'bg-green-100'
                                    }`}>
                                        {activity.tipe === 'survey' ? (
                                            <FileText size={14} className="text-blue-600" />
                                        ) : (
                                            <Activity size={14} className="text-green-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 text-sm">{activity.aktivitas}</p>
                                        {activity.detail && (
                                            <p className="text-xs text-gray-600 mt-1 truncate">{activity.detail}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.waktu)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Location Summary */}
                {summary.ringkasanLokasi && summary.ringkasanLokasi.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Ringkasan Lokasi</h2>
                                <p className="text-sm text-gray-600">Daftar lokasi dalam tugas ini</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {summary.ringkasanLokasi.map((lokasi, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold text-teal-600">{lokasi.id}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">{lokasi.nama}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        lokasi.status === 'selesai' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {lokasi.status === 'selesai' ? 'Selesai' : 'Belum Survey'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailySummaryPage;

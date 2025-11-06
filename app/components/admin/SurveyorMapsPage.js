import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, Calendar, Clock, Navigation, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import SuccessAlertModal from '../modals/SuccessAlertModal';
import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';
import dynamic from 'next/dynamic';

// Dynamic import untuk Leaflet
const SurveyorMapsLeaflet = dynamic(() => import('./SurveyorMapsLeaflet'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Memuat peta...</p>
            </div>
        </div>
    )
});

const SurveyorMapsPage = ({ onBack, defaultFilterStatus = 'completed' }) => {
    const [surveyorRoutes, setSurveyorRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState(defaultFilterStatus);
    const [searchTerm, setSearchTerm] = useState('');
    const [dataSource, setDataSource] = useState('Maps_Surveyor');
    const [deletingId, setDeletingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [routeToDelete, setRouteToDelete] = useState(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successTitle, setSuccessTitle] = useState('Berhasil Dihapus');
    const [successMessage, setSuccessMessage] = useState('Data rute berhasil dihapus dari database.');

    // Load surveyor routes
    useEffect(() => {
        const db = getFirestore(firebaseApp);
        // Primary source: Maps_Surveyor (route-based)
        const primaryQuery = query(
            collection(db, 'Maps_Surveyor'),
            orderBy('createdAt', 'desc')
        );

        // Fallback source: maps_surveyor_collection (task-completion tracking)
        const fallbackQuery = query(
            collection(db, 'maps_surveyor_collection'),
            orderBy('completedAt', 'desc')
        );

        setLoading(true);
        const unsubscribePrimary = onSnapshot(primaryQuery, (snapshot) => {
            const routes = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                routes.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null),
                    startTime: data.startTime?.toDate?.() || (data.startTime ? new Date(data.startTime) : null),
                    endTime: data.endTime?.toDate?.() || (data.endTime ? new Date(data.endTime) : null)
                });
            });

            if (routes.length > 0) {
                setDataSource('Maps_Surveyor');
                setSurveyorRoutes(routes);
                // Auto-select latest route (first item due to desc order)
                setSelectedRoute(routes[0]);
                setLoading(false);
            } else {
                // Switch to fallback source when primary has no data
                const unsubscribeFallback = onSnapshot(fallbackQuery, (snap) => {
                    const items = [];
                    snap.forEach((d) => {
                        const x = d.data();
                        // Normalize tracking record to route-like card
                        items.push({
                            id: d.id,
                            surveyorName: x.surveyorName || x.surveyorEmail || 'Surveyor',
                            status: x.status || 'completed',
                            createdAt: x.completedAt?.toDate?.() || (x.completedAt ? new Date(x.completedAt) : new Date()),
                            startTime: null,
                            endTime: x.completedAt?.toDate?.() || (x.completedAt ? new Date(x.completedAt) : null),
                            totalDistance: 0,
                            routePoints: [],
                            surveyPoints: x.location?.coordinates ? [x.location.coordinates] : [],
                            taskId: x.originalDocId || x.surveyDocId || d.id
                        });
                    });
                    setDataSource('maps_surveyor_collection');
                    setSurveyorRoutes(items);
                    // Auto-select latest tracking item
                    if (items.length > 0) {
                        setSelectedRoute(items[0]);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('Realtime error (fallback):', err);
                    setLoading(false);
                });

                // Return combined unsubscribe
                return () => unsubscribeFallback();
            }
        }, (err) => {
            console.error('Realtime error (primary):', err);
            setError('Gagal memuat data rute surveyor');
            setLoading(false);
        });

        return () => unsubscribePrimary();
    }, []);

    // Filter routes
    const filteredRoutes = surveyorRoutes.filter(route => {
        const matchesStatus = filterStatus === 'all' || route.status === filterStatus;
        const matchesSearch = route.surveyorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             route.taskId?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Calculate route statistics
    const getRouteStats = (route) => {
        const duration = route.startTime && route.endTime 
            ? Math.floor((new Date(route.endTime) - new Date(route.startTime)) / 60000)
            : 0;
        
        return {
            duration: duration,
            distance: route.totalDistance || 0,
            points: route.routePoints?.length || 0,
            surveys: route.surveyPoints?.length || 0
        };
    };

    const openDeleteModal = (route, e) => {
        e?.stopPropagation?.();
        setRouteToDelete(route);
        setConfirmOpen(true);
    };

    const performDelete = async (route) => {
        try {
            setDeletingId(route.id);
            // Tentukan endpoint berdasarkan sumber data aktif
            const isPrimary = dataSource === 'Maps_Surveyor';
            const url = isPrimary
                ? `/api/maps-surveyor/${route.id}`
                : `/api/maps-surveyor-collection/${route.id}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Gagal menghapus (HTTP ${res.status}) ${txt}`);
            }

            // Optimistic update: hapus dari state lokal segera
            setSurveyorRoutes(prev => prev.filter(r => r.id !== route.id));
            if (selectedRoute?.id === route.id) {
                setSelectedRoute(null);
            }
            setSuccessTitle('Berhasil Dihapus');
            setSuccessMessage(`Data rute milik "${route.surveyorName || 'Surveyor'}" telah dihapus.`);
            setSuccessOpen(true);
        } finally {
            setDeletingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!routeToDelete) return;
        try {
            await performDelete(routeToDelete);
        } catch (err) {
            console.error('Delete route error:', err);
            alert(`Gagal menghapus data rute: ${err.message}`);
        } finally {
            setConfirmOpen(false);
            setRouteToDelete(null);
        }
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-x-hidden">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={onBack}
                            className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[.98] group"
                        >
                            <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center flex-1 mx-1 sm:mx-2">
                            <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">
                                Maps Surveyor
                            </h1>
                            <p className="text-[11px] sm:text-xs text-gray-600 mt-1 font-semibold">Collection: {dataSource}</p>
                        </div>
                        
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                            <MapPin size={20} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-20 sm:pt-24 px-3 sm:px-6 py-4 sm:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
                    {/* Routes List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200 shadow-lg">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Daftar Rute Surveyor
                            </h2>
                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-[11px] sm:text-xs text-blue-800 font-semibold">
                                    <strong>Database:</strong> {dataSource} Collection
                                </p>
                            </div>

                            {/* Filters */}
                            <div className="space-y-3 mb-3 sm:mb-4">
                                <div>
                                     <input
                                         type="text"
                                         placeholder="Cari surveyor atau task ID..."
                                         value={searchTerm}
                                         onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-3 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                    />
                                </div>
                                <div>
                                     <select
                                         value={filterStatus}
                                         onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-3 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                                     >
                                        <option value="all" className="text-gray-900">Semua Status</option>
                                        <option value="completed" className="text-gray-900">Selesai</option>
                                        <option value="in_progress" className="text-gray-900">Sedang Berjalan</option>
                                    </select>
                                </div>
                            </div>

                            {/* Routes List */}
                            <div className="space-y-3 max-h-[50vh] sm:max-h-96 overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-gray-800 text-sm font-semibold">Memuat data...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-8">
                                        <p className="text-red-800 text-sm font-semibold">{error}</p>
                                    </div>
                                ) : filteredRoutes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-800 text-sm font-semibold">Tidak ada data rute</p>
                                    </div>
                                ) : (
                                    filteredRoutes.map((route) => {
                                        const stats = getRouteStats(route);
                                        const isSelected = selectedRoute?.id === route.id;
                                        
                                        return (
                                            <div
                                                key={route.id}
                                                onClick={() => setSelectedRoute(route)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 active:scale-[.99] ${
                                                    isSelected 
                                                        ? 'bg-blue-50 border-blue-300 shadow-md' 
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-semibold text-gray-900 text-sm">
                                                        {route.surveyorName || 'Surveyor'}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            route.status === 'completed' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {route.status === 'completed' ? 'Selesai' : 'Berjalan'}
                                                        </span>
                                                        <button
                                                            title="Hapus"
                                                            onClick={(e) => openDeleteModal(route, e)}
                                                            className={`p-1.5 rounded-md border ${deletingId === route.id ? 'opacity-50 cursor-wait' : 'hover:bg-red-50'} border-red-200 text-red-600`}
                                                            disabled={deletingId === route.id}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-1 text-xs text-gray-800">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={12} className="text-gray-600" />
                                                        <span className="font-medium">{route.createdAt?.toLocaleDateString('id-ID')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} className="text-gray-600" />
                                                        <span className="font-medium">{formatDuration(stats.duration)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Navigation size={12} className="text-gray-600" />
                                                        <span className="font-medium">{stats.distance.toFixed(2)} km</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={12} className="text-gray-600" />
                                                        <span className="font-medium">{stats.points} titik, {stats.surveys} survey</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] sm:text-xs text-blue-800 font-bold bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                                                            📊 Maps_Surveyor
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Map View */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            <div className="p-3 sm:p-4 border-b border-gray-200">
                                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin size={20} className="text-blue-600" />
                                    {selectedRoute ? `Rute ${selectedRoute.surveyorName}` : 'Pilih Rute Surveyor'}
                                </h2>
                                {selectedRoute && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-[11px] sm:text-xs text-green-800 font-semibold">
                                            <strong>Data Source:</strong> Maps_Surveyor Collection
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="h-[360px] sm:h-[500px] lg:h-[600px]">
                                {selectedRoute ? (
                                    <SurveyorMapsLeaflet
                                        routeData={selectedRoute}
                                        surveyPoints={selectedRoute.surveyPoints || []}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                        <div className="text-center">
                                            <MapPin size={48} className="text-gray-600 mx-auto mb-4" />
                                            <p className="text-gray-800 font-semibold">Pilih rute surveyor untuk melihat peta</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={confirmOpen}
                onClose={() => { setConfirmOpen(false); setRouteToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Hapus Data Rute?"
                message={`Anda yakin ingin menghapus data rute milik "${routeToDelete?.surveyorName || 'Surveyor'}"? Aksi ini akan menghapus data dari database dan tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus"
            />
            <SuccessAlertModal
                isVisible={successOpen}
                onClose={() => setSuccessOpen(false)}
                title={successTitle}
                message={successMessage}
                autoClose={true}
                autoCloseDelay={2200}
            />
        </div>
    );
};

export default SurveyorMapsPage;

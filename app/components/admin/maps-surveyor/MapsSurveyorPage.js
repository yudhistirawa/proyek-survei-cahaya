'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Users, Route, Calendar, Search, Filter, Download, Eye, CheckCircle } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const MapsSurveyorPage = () => {
  const [surveyorData, setSurveyorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all'); // all | completed | today

  // Sample data untuk testing
  const sampleSurveyorData = [
    {
      id: 'surveyor-1',
      name: 'Ahmad Surveyor',
      status: 'active',
      totalRoutes: 15,
      totalDistance: 45.2,
      lastActivity: '2024-01-15',
      currentLocation: '-6.2088, 106.8456',
      routes: [
        { id: 'route-1', date: '2024-01-15', distance: 3.2, points: 8 },
        { id: 'route-2', date: '2024-01-14', distance: 2.8, points: 6 }
      ]
    },
    {
      id: 'surveyor-2',
      name: 'Budi Surveyor',
      status: 'active',
      totalRoutes: 12,
      totalDistance: 38.7,
      lastActivity: '2024-01-15',
      currentLocation: '-6.2089, 106.8457',
      routes: [
        { id: 'route-3', date: '2024-01-15', distance: 2.5, points: 5 },
        { id: 'route-4', date: '2024-01-13', distance: 3.1, points: 7 }
      ]
    },
    {
      id: 'surveyor-3',
      name: 'Citra Surveyor',
      status: 'inactive',
      totalRoutes: 8,
      totalDistance: 25.3,
      lastActivity: '2024-01-10',
      currentLocation: '-6.2090, 106.8458',
      routes: [
        { id: 'route-5', date: '2024-01-10', distance: 2.1, points: 4 }
      ]
    }
  ];

  useEffect(() => {
    const unsubscribe = loadSurveyorTrackingData();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [taskFilter]);

  const loadSurveyorTrackingData = () => {
    try {
      setLoading(true);
      console.log('📍 Subscribing to realtime tracking data (maps_surveyor_collection)...');

      // Build dynamic query berdasarkan taskFilter
      const colRef = collection(db, 'maps_surveyor_collection');
      let q;
      if (taskFilter === 'completed') {
        q = query(colRef, where('status', '==', 'completed'), orderBy('completedAt', 'desc'));
      } else if (taskFilter === 'today') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        q = query(
          colRef,
          where('completedAt', '>=', Timestamp.fromDate(start)),
          where('completedAt', '<=', Timestamp.fromDate(end)),
          orderBy('completedAt', 'desc')
        );
      } else {
        q = query(colRef, orderBy('completedAt', 'desc'));
      }

      const unsubscribe = onSnapshot(
        q,
        (trackingSnapshot) => {
          const trackingData = [];
          trackingSnapshot.forEach((doc) => {
            const data = doc.data();
            trackingData.push({ id: doc.id, ...data });
          });

          console.log('✅ Realtime: loaded tracking data:', trackingData.length, 'records');

          // Group data by surveyor
          const surveyorMap = new Map();
          trackingData.forEach((track) => {
            const surveyorId = track.surveyorId;
            const surveyorName = track.surveyorName || 'Unknown Surveyor';

            if (!surveyorMap.has(surveyorId)) {
              surveyorMap.set(surveyorId, {
                id: surveyorId,
                name: surveyorName,
                email: track.surveyorEmail || '',
                status: 'active',
                totalTasks: 0,
                completedTasks: 0,
                lastActivity: null,
                currentLocation: '',
                tasks: [],
                totalDistance: 0,
              });
            }

            const surveyor = surveyorMap.get(surveyorId);
            surveyor.totalTasks++;
            if (track.status === 'completed') surveyor.completedTasks++;

            const completedAt = track.completedAt?.toDate?.() || new Date(track.completedAt);
            if (!surveyor.lastActivity || completedAt > surveyor.lastActivity) {
              surveyor.lastActivity = completedAt;
              surveyor.currentLocation = track.location?.titikKordinat || track.projectLocation || '';
            }

            surveyor.tasks.push({
              id: track.id,
              taskType: track.taskType || 'Survey',
              location: track.location?.address || track.projectLocation || '',
              coordinates: track.location?.coordinates || null,
              completedAt: completedAt,
              status: track.status || 'completed',
              surveyDetails: track.surveyDetails || {},
            });
          });

          const formattedSurveyorData = Array.from(surveyorMap.values()).map((surveyor) => ({
            ...surveyor,
            totalRoutes: surveyor.totalTasks,
            lastActivity: surveyor.lastActivity ? surveyor.lastActivity.toLocaleDateString('id-ID') : 'Tidak ada data',
            tasks: surveyor.tasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
          }));

          setSurveyorData(formattedSurveyorData);
          console.log('✅ Realtime: processed surveyor data:', formattedSurveyorData.length, 'surveyors');
          setLoading(false);
        },
        (error) => {
          console.error('❌ Realtime error loading tracking data:', error);
          setSurveyorData([]);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error initializing realtime subscription:', error);
      setSurveyorData([]);
      setLoading(false);
      return undefined;
    }
  };

  const filteredData = surveyorData.filter(surveyor => {
    const matchesSearch = surveyor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || surveyor.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Tidak Aktif';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data surveyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 overflow-x-hidden min-h-[100svh]"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        paddingLeft: 'max(env(safe-area-inset-left), 0px)',
        paddingRight: 'max(env(safe-area-inset-right), 0px)'
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin size={28} className="text-blue-600" />
              </div>
              Maps Surveyor
            </h1>
            <p className="text-gray-600 mt-2">
              Monitoring dan tracking surveyor dalam melakukan survey
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm sm:text-base">
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Surveyor</p>
              <p className="text-2xl font-bold text-gray-900">{surveyorData.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Surveyor Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {surveyorData.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MapPin size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rute</p>
              <p className="text-2xl font-bold text-purple-600">
                {surveyorData.reduce((sum, s) => sum + s.totalRoutes, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Route size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jarak</p>
              <p className="text-2xl font-bold text-orange-600">
                {surveyorData.reduce((sum, s) => sum + s.totalDistance, 0).toFixed(1)} km
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Route size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari surveyor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              title="Filter Tugas"
            >
              <option value="all">Semua Tugas</option>
              <option value="completed">Selesai</option>
              <option value="today">Hari Ini</option>
            </select>
            
            <button className="px-4 py-2 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm sm:text-base">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Surveyor List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Daftar Surveyor</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredData.map((surveyor) => (
            <div key={surveyor.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users size={24} className="text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{surveyor.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(surveyor.status)}`}>
                        {getStatusText(surveyor.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Terakhir aktif: {surveyor.lastActivity}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{surveyor.completedTasks || surveyor.totalRoutes}</div>
                  <div className="text-sm text-gray-500">Tugas Selesai</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Total Tugas</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{surveyor.totalTasks || surveyor.totalRoutes}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Lokasi Terakhir</span>
                  </div>
                  <div className="text-sm text-gray-600">{surveyor.currentLocation || 'Tidak ada data'}</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Tugas Hari Ini</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {surveyor.tasks ? surveyor.tasks.filter(t => {
                      const today = new Date().toDateString();
                      const taskDate = new Date(t.completedAt).toDateString();
                      return taskDate === today;
                    }).length : (surveyor.routes ? surveyor.routes.filter(r => r.date === '2024-01-15').length : 0)}
                  </div>
                </div>
              </div>
              
              {/* Task List for Surveyor */}
              {surveyor.tasks && surveyor.tasks.length > 0 && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-600" />
                    Tugas Terbaru ({surveyor.tasks.slice(0, 3).length} dari {surveyor.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {surveyor.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{task.taskType}</span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {task.status === 'completed' ? 'Selesai' : task.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{task.location}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(task.completedAt).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors">
                            <Eye size={12} className="inline mr-1" />
                            Detail
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {surveyor.tasks.length > 3 && (
                    <div className="mt-3 text-center">
                      <button className="text-blue-600 text-sm hover:text-blue-700">
                        Lihat semua {surveyor.tasks.length} tugas
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => setSelectedSurveyor(surveyor)}
                  className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Lihat Detail
                </button>
                <button className="px-4 py-2 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Lihat Maps
                </button>
                <button className="px-4 py-2 min-h-[44px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  Export Data
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 opacity-50">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Tidak Ada Data Surveyor</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Coba ubah filter atau kata kunci pencarian'
              : 'Belum ada data surveyor yang tersedia'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MapsSurveyorPage;

'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Search, Filter, Download } from 'lucide-react';
import UniversalSurveyDetailModal from '../../modals/UniversalSurveyDetailModal';
import UniversalSurveyEditModal from '../../modals/UniversalSurveyEditModal';

const SurveyManagement = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedSurveyType, setSelectedSurveyType] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      // Simulasi fetch data dari berbagai endpoint
      const responses = await Promise.all([
        fetch('/api/survey-arm'),
        fetch('/api/survey-apj-propose'),
        fetch('/api/survey-apj-new'),
        fetch('/api/survey-trafo'),
        fetch('/api/survey-fasos-fasum')
      ]);

      const data = await Promise.all(responses.map(res => res.json()));
      
      const allSurveys = [
        ...data[0].map(item => ({ ...item, type: 'arm', typeName: 'ARM' })),
        ...data[1].map(item => ({ ...item, type: 'apj-propose', typeName: 'APJ Propose' })),
        ...data[2].map(item => ({ ...item, type: 'apj-new', typeName: 'APJ New' })),
        ...data[3].map(item => ({ ...item, type: 'trafo', typeName: 'Trafo' })),
        ...data[4].map(item => ({ ...item, type: 'fasos-fasum', typeName: 'Fasos Fasum' }))
      ];

      setSurveys(allSurveys);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (survey) => {
    setSelectedSurvey(survey);
    setSelectedSurveyType(survey.type);
    setShowDetailModal(true);
  };

  const handleEdit = (survey) => {
    setSelectedSurvey(survey);
    setSelectedSurveyType(survey.type);
    setShowEditModal(true);
  };

  const handleSave = async (surveyId, updatedData) => {
    try {
      const response = await fetch(`/api/survey-${selectedSurveyType}/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan perubahan');
      }

      // Refresh data
      await fetchSurveys();
      setShowEditModal(false);
    } catch (error) {
      throw error;
    }
  };

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         survey.namaJalan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         survey.namaTempat?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || survey.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'validated': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status] || statusConfig['pending']}`}>
        {status === 'pending' ? 'Menunggu' : status === 'validated' ? 'Tervalidasi' : 'Ditolak'}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      'arm': 'bg-blue-100 text-blue-800',
      'apj-propose': 'bg-purple-100 text-purple-800',
      'apj-new': 'bg-indigo-100 text-indigo-800',
      'trafo': 'bg-orange-100 text-orange-800',
      'fasos-fasum': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.toUpperCase().replace('-', ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Survey</h1>
          <p className="text-gray-600">Kelola semua data survey dari berbagai jenis</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari survey..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                />
              </div>
              
              <div className="relative">
                <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-48"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="arm">ARM</option>
                  <option value="apj-propose">APJ Propose</option>
                  <option value="apj-new">APJ New</option>
                  <option value="trafo">Trafo</option>
                  <option value="fasos-fasum">Fasos Fasum</option>
                </select>
              </div>
            </div>

            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Download size={16} />
              <span>Export Data</span>
            </button>
          </div>
        </div>

        {/* Survey Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Survey
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSurveys.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data survey ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredSurveys.map((survey) => (
                    <tr key={`${survey.type}-${survey.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {survey.projectTitle || survey.namaJalan || survey.namaTempat || 'Tidak ada judul'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {survey.surveyorName || 'Surveyor tidak diketahui'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getTypeBadge(survey.type)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(survey.validationStatus)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString('id-ID') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetail(survey)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(survey)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        <UniversalSurveyDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          surveyId={selectedSurvey?.id}
          surveyType={selectedSurveyType}
          onEdit={(survey) => {
            setShowDetailModal(false);
            handleEdit(survey);
          }}
        />

        <UniversalSurveyEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          survey={selectedSurvey}
          surveyType={selectedSurveyType}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default SurveyManagement;

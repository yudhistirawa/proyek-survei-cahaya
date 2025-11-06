import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, ArrowLeft, Trash2, MapPin } from 'lucide-react';

const ValidSurveyData = ({
  validSurveys,
  loadingValidSurveys,
  selectedSurveyType,
  setSelectedSurveyType,
  exportingData,
  loadValidSurveys,
  onViewDetail,
  onEdit,
  currentUser
}) => {
  const handleFolderClick = (surveyType) => {
    if (typeof setSelectedSurveyType === 'function') {
      setSelectedSurveyType(surveyType);
    }
    if (typeof loadValidSurveys === 'function') {
      loadValidSurveys(surveyType);
    }
  };

  // Hapus data survey valid dengan konfirmasi
  const handleDelete = async (survey) => {
    if (!survey?.id) return;
    const ok = window.confirm('Hapus data survey ini secara permanen? Tindakan tidak dapat dibatalkan.');
    if (!ok) return;
    try {
      setDeletingId(survey.id);
      const res = await fetch(`/api/valid-surveys/${encodeURIComponent(survey.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Gagal menghapus data');
      }
      // Refresh daftar dari sumber
      if (typeof loadValidSurveys === 'function') {
        await loadValidSurveys(selectedSurveyType || 'all');
      }
      alert('Data survey berhasil dihapus');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Gagal menghapus data: ${err?.message || ''}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBackToFolders = () => {
    if (typeof setSelectedSurveyType === 'function') {
      setSelectedSurveyType(null);
    }
  };

  // Navigate to Maps Validasi and focus corresponding marker
  const navToMaps = (survey) => {
    try {
      const coord =
        survey?.titikKordinatBaru ||
        survey?.titikKoordinatBaru ||
        survey?.koordinatBaru ||
        survey?.projectLocation ||
        survey?.titikKordinat ||
        null;

      const detail = {
        id: survey?.id,
        originalId: survey?.originalId,
        originalCollection: survey?.originalCollection || survey?.collectionName || survey?.collection,
        coord
      };

      if (typeof window !== 'undefined') {
        // Persist once so Maps page can consume if loaded fresh
        sessionStorage.setItem('maps_validasi_focus', JSON.stringify(detail));
        window.dispatchEvent(new CustomEvent('nav-to-maps-validasi', { detail }));
      }
    } catch (e) {
      console.warn('Failed to navigate to Maps Validasi with target:', e);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nav-to-maps-validasi', { detail: {} }));
      }
    }
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (list) => {
    const allIds = (Array.isArray(list) ? list : validSurveys)?.map(s => s.id).filter(Boolean) || [];
    const allSelected = allIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter(id => !allIds.includes(id)) : Array.from(new Set([...selectedIds, ...allIds])));
  };

  const handleExportData = async (surveyType = 'all', ids = []) => {
    try {
      // Build query for /api/export-existing-excel using repeated 'id' params
      const q = new URLSearchParams();
      const idsToSend = Array.isArray(ids) && ids.length > 0 ? ids : selectedIds;
      idsToSend.forEach((id) => { if (id) q.append('id', id); });
      // Choose endpoint based on survey type
      const baseEndpoint = surveyType === 'survey_apj_propose'
        ? '/api/export-apj-propose-excel'
        : '/api/export-existing-excel';
      const url = q.toString() ? `${baseEndpoint}?${q.toString()}` : baseEndpoint;
      const response = await fetch(url);
      
      if (!response.ok) {
        let details = '';
        try { details = await response.text(); } catch {}
        throw new Error(`Gagal mengekspor data. ${details || ''}`.trim());
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const fileName = `Data_Survey_Valid_${surveyType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      alert('Export Excel berhasil dibuat!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Gagal mengekspor data. Coba ulang beberapa saat lagi. Detail: ' + (error?.message || ''));
    }
  };

  const surveyTypes = [
    { type: 'survey_existing', label: 'Survey Existing', color: 'bg-blue-500', description: 'Data Survey Existing yang telah tervalidasi' },
    { type: 'survey_apj_propose', label: 'Survey Tiang APJ Propose', color: 'bg-green-500', description: 'Data Survey Tiang APJ Propose yang telah tervalidasi' }
  ];

  // Helper: ambil URL foto pertama yang tersedia untuk thumbnail
  const getThumbnailUrl = (survey) => {
    if (!survey) return null;
    // Prioritas: foto titik aktual > foto tinggi ARM > dokumentasi > grid
    const c1 = survey.fotoTitikAktual;
    if (c1) return c1.url || c1; // mendukung string atau {url}
    const c2 = survey.fotoTinggiARM;
    if (c2) return c2.url || c2;
    const docs = survey.documentationPhotos;
    if (Array.isArray(docs) && docs.length > 0) {
      const first = docs[0];
      return (typeof first === 'object' && first?.url) ? first.url : first;
    }
    const grid = survey.gridData;
    if (grid && typeof grid === 'object') {
      const photoKey = Object.keys(grid).find(k => k.toLowerCase().startsWith('photo') && grid[k]);
      if (photoKey) return grid[photoKey];
    }
    return null;
  };

  // State & handler untuk modal preview foto
  const [previewUrl, setPreviewUrl] = useState(null);
  const openPreview = (url) => setPreviewUrl(url);
  const closePreview = () => setPreviewUrl(null);

  if (selectedSurveyType) {
    const currentType = surveyTypes.find(t => t.type === selectedSurveyType);
    
    return (
      <>
        {/* Background biru muda */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
          {/* Card putih yang menutupi seluruh area dengan padding yang lebih rapi */}
          <div className="min-h-screen bg-white rounded-xl shadow-lg mx-6 my-4">
            <div className="px-8 py-6">
              {/* Header Section dengan styling yang lebih baik */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackToFolders}
                    className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors duration-200 shadow-sm"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {currentType?.label || 'Data Survey Valid'}
                    </h1>
                    <p className="text-gray-600 text-lg">
                      {currentType?.description || 'Data survey yang telah tervalidasi'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // saat buka picker, preselect semua untuk memudahkan user Select All
                      const ids = (validSurveys || []).map(s => s.id).filter(Boolean);
                      setSelectedIds(ids);
                      setShowExportPicker(true);
                    }}
                    disabled={loadingValidSurveys}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:hover:transform-none"
                  >
                    <Download size={20} />
                    <span>Ekspor Excel</span>
                  </button>
                </div>
              </div>

              {/* Content dengan spacing yang lebih baik */}
              <div className="space-y-8">
                {loadingValidSurveys ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat data survey valid...</p>
                  </div>
                ) : !Array.isArray(validSurveys) || validSurveys.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <FolderOpen size={48} className="mx-auto" />
                    </div>
                    <p className="text-gray-600">Belum ada data survey valid untuk kategori ini</p>
                    <p className="text-sm text-gray-500 mt-2">Data akan muncul setelah admin memvalidasi survey</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Menampilkan {validSurveys.length} data survey tervalidasi
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Judul Proyek</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Lokasi</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Surveyor</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Kategori</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Zona</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Foto</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Divalidasi Oleh</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal Validasi</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validSurveys.map((survey) => (
                            <tr key={survey.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 font-medium text-gray-900">
                                {survey.projectTitle || 'Judul Tidak Tersedia'}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {survey.projectLocation || 'Lokasi Tidak Diketahui'}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {survey.surveyorName || 'Tidak Diketahui'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {survey.surveyCategory === 'survey_existing' ? 'Survey Existing' : 
                                   survey.surveyCategory === 'survey_apj_propose' ? 'Survey Tiang APJ Propose' : 
                                   survey.surveyCategory || 'Umum'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  survey.surveyZone === 'propose' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {survey.surveyZone === 'propose' ? 'Propose' : 'Existing'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const thumb = getThumbnailUrl(survey);
                                  return thumb ? (
                                    <button
                                      type="button"
                                      onClick={() => openPreview(thumb)}
                                      className="group focus:outline-none"
                                      title="Klik untuk perbesar"
                                    >
                                      <img
                                        src={thumb}
                                        alt="thumbnail"
                                        className="w-12 h-12 object-cover rounded-md border border-gray-200 group-hover:opacity-90"
                                      />
                                    </button>
                                  ) : (
                                    <div className="w-12 h-12 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
                                      No Photo
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                <span className="font-medium text-indigo-600">
                                  {survey.validatedBy || 'Tidak Diketahui'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {survey.validatedAt ? new Date(survey.validatedAt).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'Tidak Diketahui'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Tervalidasi
                                  </span>
                                  <span className="text-xs text-gray-600">oleh {survey.validatedBy || 'Admin'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => navToMaps(survey)}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                    title="Lihat di Maps Validasi"
                                  >
                                    <MapPin size={16} /> <span>Lihat Maps</span>
                                  </button>
                                  {currentUser?.role === 'super_admin' && (
                                    <button
                                      onClick={() => onEdit && onEdit(survey)}
                                      className="text-emerald-600 hover:text-emerald-800 text-sm font-medium hover:underline"
                                      title="Edit Data"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onViewDetail && onViewDetail(survey)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                  >
                                    Lihat Detail
                                  </button>
                                  <button
                                    onClick={() => handleDelete(survey)}
                                    disabled={deletingId === survey.id}
                                    className={`inline-flex items-center gap-1 text-sm font-medium ${deletingId === survey.id ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'} `}
                                    title="Hapus data"
                                  >
                                    <Trash2 size={16} /> {deletingId === survey.id ? 'Menghapus...' : 'Hapus'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Export Picker Modal */}
        {showExportPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExportPicker(false)} />
            <div className="relative bg-white w-[92%] sm:w-[600px] rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pilih Data untuk Diekspor</h3>
                    <p className="text-sm text-gray-600 mt-0.5">Pilih satu atau beberapa data. Anda dapat mencari dan pilih semua.</p>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700 rounded-full w-8 h-8 bg-white border" onClick={() => setShowExportPicker(false)} aria-label="Tutup">✕</button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Array.isArray(validSurveys) && validSurveys.length > 0 && validSurveys.every(s => selectedIds.includes(s.id))}
                      onChange={() => toggleSelectAll(validSurveys)}
                    />
                    {Array.isArray(validSurveys) && validSurveys.length > 0 && validSurveys.every(s => selectedIds.includes(s.id)) ? 'Hapus Pilihan' : 'Pilih Semua'}
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Cari judul, lokasi atau tipe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔎</span>
                  </div>
                  <span className="text-xs text-gray-600">Dipilih: <b>{selectedIds.length}</b></span>
                </div>
              </div>
              <div className="p-0 max-h-[60vh] overflow-y-auto">
                <ul className="divide-y">
                  {(validSurveys || [])
                    .filter((s) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        String(s.projectTitle || s.id).toLowerCase().includes(q) ||
                        String(s.projectLocation || '').toLowerCase().includes(q) ||
                        String(s.surveyType || '').toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                    <li key={s.id} className="py-3 px-6 flex items-start gap-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="mt-1 accent-indigo-600"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 truncate">{s.projectTitle || s.id}</div>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">{s.surveyType || 'Umum'}</span>
                        </div>
                        <div className="text-sm text-gray-600 truncate">{s.projectLocation || '-'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50/60 flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setShowExportPicker(false)}
                >
                  Batal
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={exportingData || selectedIds.length === 0}
                  onClick={async () => {
                    setShowExportPicker(false);
                    await handleExportData(selectedSurveyType, selectedIds);
                  }}
                >
                  {exportingData ? 'Mengekspor...' : `Ekspor (${selectedIds.length})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Background biru muda */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Card putih yang menutupi seluruh area dengan padding yang lebih rapi */}
        <div className="min-h-screen bg-white rounded-xl shadow-lg mx-6 my-4">
          <div className="px-8 py-6">
            {/* Header Section dengan styling yang lebih baik */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Survey Valid</h1>
                <p className="text-gray-600 text-lg">Akses data survey yang telah tervalidasi berdasarkan kategori dan zona</p>
              </div>
              <button
                onClick={() => handleExportData('all')}
                disabled={exportingData}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:hover:transform-none"
              >
                <Download size={20} />
                <span>{exportingData ? 'Mengekspor...' : 'Ekspor Semua (Excel)'}</span>
              </button>
            </div>

            {/* Content dengan spacing yang lebih baik */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {surveyTypes.map((surveyType) => (
                  <button
                    key={surveyType.type}
                    onClick={() => handleFolderClick(surveyType.type)}
                    className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1"
                  >
                    <div className={`w-20 h-20 ${surveyType.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <FolderOpen size={40} className="text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-center mb-3 text-xl">{surveyType.label}</h3>
                    <p className="text-sm text-gray-600 text-center leading-relaxed mb-4">{surveyType.description}</p>
                    <div className="text-sm text-indigo-600 font-semibold bg-indigo-50 px-4 py-2 rounded-full">
                      Klik untuk melihat data →
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">i</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3">Informasi Kategori Survey</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p><strong>Survey Existing:</strong> Survey yang berkaitan dengan data existing yang sudah ada</p>
                      <p><strong>Survey Tiang APJ Propose:</strong> Survey tiang APJ untuk usulan atau rencana baru</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closePreview}
          />
          <div className="relative bg-white rounded-lg shadow-2xl max-w-3xl w-[90%] p-4 z-[1001]">
            <button
              onClick={closePreview}
              className="absolute top-3 right-3 rounded-full w-8 h-8 bg-white/90 border hover:bg-white text-gray-700"
              aria-label="Tutup"
              title="Tutup"
            >
              ✕
            </button>
            <div className="max-h-[80vh] overflow-auto">
              <img
                src={previewUrl}
                alt="Foto penuh"
                className="w-full h-auto rounded-md object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ValidSurveyData;

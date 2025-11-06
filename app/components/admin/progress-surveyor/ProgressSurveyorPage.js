"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, RefreshCw, Filter, Eye, Image as ImageIcon } from 'lucide-react';
import PhotoReviewModal from '../../modals/PhotoReviewModal';

// Helper to format bytes
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const ProgressSurveyorPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]); // [{name, label, surveyors: [{name,label,items:[]...}], ...}]
  const [search, setSearch] = useState('');
  const [selectedSurveyor, setSelectedSurveyor] = useState('all');
  const [preview, setPreview] = useState({ open: false, src: null, title: '' });

  // Extract timestamp from the end of filename: name_1699999999999.webp
  const extractTimestamp = (name) => {
    try {
      const base = name.replace(/\.[^.]+$/, '');
      const idx = base.lastIndexOf('_');
      if (idx >= 0) {
        const num = parseInt(base.slice(idx + 1), 10);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    } catch (_) {
      return null;
    }
  };
  

  const PAGE_SIZE = 12; // initial thumbnails per day folder
  const ROOT_PAGE_SIZE = 100; // max day folders per page
  const [rootToken, setRootToken] = useState(null);

  const formatFolderLabel = (name) => {
    // Expecting 'YYYY-MM-DD_Hari'; fallback to original when pattern differs
    try {
      const [datePart, dayPart] = (name || '').split('_');
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && dayPart) {
        const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10));
        const dt = new Date(y, m - 1, d);
        const dayName = dayPart.charAt(0).toUpperCase() + dayPart.slice(1);
        // Contoh: 19 Sep 2025 (Jumat)
        const dateDisp = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${dateDisp} (${dayName})`;
      }
      return name;
    } catch (_) {
      return name;
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/progress-tracking?list=days');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memuat daftar hari');
      const groups = (json.days || [])
        .map((name) => ({ name, label: formatFolderLabel(name), loaded: false, open: false, surveyors: [], pageToken: null }))
        // Keep server sorting (desc by date) as-is
        ;
      setData(groups);
      setRootToken(json.nextPageToken || null);
    } catch (err) {
      console.error('Failed loading storage list:', err);
      setError(err?.message || 'Gagal memuat data dari Storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadMoreSurveyors = async () => {
    try {
      if (!rootToken) return;
      const res = await fetch(`/api/admin/progress-tracking?list=days&pageToken=${encodeURIComponent(rootToken)}`);
      if (!res.ok) return;
      const json = await res.json();
      const more = (json.days || [])
        .map((name) => ({ name, label: formatFolderLabel(name), loaded: false, open: false, surveyors: [], pageToken: null }));
      setData((prev) => [...prev, ...more]);
      setRootToken(json.nextPageToken || null);
    } catch (e) {
      console.error('Failed to load more surveyor folders:', e);
    }
  };

  const filteredGroups = useMemo(() => {
    let groups = data;
    if (selectedSurveyor !== 'all') {
      groups = groups.filter((g) => g.name === selectedSurveyor || g.label === selectedSurveyor);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      groups = groups.filter((g) => {
        const dayMatch = (g.label || g.name).toLowerCase().includes(q);
        const surveyorMatch = (g.surveyors || []).some((s) => (s.label || s.name || '').toLowerCase().includes(q));
        return dayMatch || surveyorMatch;
      });
    }
    return groups;
  }, [data, selectedSurveyor, search]);

  const allSurveyorNames = useMemo(() => ['all', ...data.map((g) => g.name)], [data]);

  const loadGroup = async (groupName, openAfterLoad = true) => {
    try {
      const idx = data.findIndex((g) => g.name === groupName || g.label === groupName);
      if (idx === -1) return;
      const group = data[idx];
      if (group.loaded) return; // already loaded
      // Fetch surveyor list under this day
      const res = await fetch(`/api/admin/progress-tracking?list=surveyors&day=${encodeURIComponent(group.name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memuat daftar surveyor');
      const surveyors = (json.surveyors || []).map((n) => ({ name: n, label: n, loaded: false, open: false, items: [], pageToken: null }));
      const updated = { ...group, surveyors, pageToken: json.nextPageToken || null, loaded: true, open: openAfterLoad };
      const next = [...data];
      next[idx] = updated;
      setData(next);
    } catch (e) {
      console.error('Failed to load group items:', groupName, e);
    }
  };

  const toggleGroup = async (groupName) => {
    const idx = data.findIndex((g) => g.name === groupName);
    if (idx === -1) return;
    const group = data[idx];
    if (!group.loaded) {
      await loadGroup(groupName, true);
      return;
    }
    const next = [...data];
    next[idx] = { ...group, open: !group.open };
    setData(next);
  };

  const closeGroup = (groupName) => {
    const idx = data.findIndex((g) => g.name === groupName);
    if (idx === -1) return;
    const next = [...data];
    const group = next[idx];
    next[idx] = { ...group, open: false };
    setData(next);
  };

  // Auto-load when a specific surveyor is selected from filter
  useEffect(() => {
    if (selectedSurveyor && selectedSurveyor !== 'all') {
      const g = data.find((x) => x.name === selectedSurveyor);
      if (g && !g.loaded) {
        loadGroup(selectedSurveyor, true);
      } else if (g && g.loaded && !g.open) {
        toggleGroup(selectedSurveyor);
      }
    }
  }, [selectedSurveyor, data]);

  const handleLoadMore = async (groupName) => {
    const groups = [...data];
    const idx = groups.findIndex((g) => g.name === groupName || g.label === groupName);
    if (idx === -1) return;
    const group = groups[idx];
    if (!group.pageToken) return;
    const res = await fetch(`/api/admin/progress-tracking?list=surveyors&day=${encodeURIComponent(group.name)}&pageToken=${encodeURIComponent(group.pageToken)}`);
    if (!res.ok) return;
    const json = await res.json();
    const moreSurveyors = (json.surveyors || []).map((n) => ({ name: n, label: n, loaded: false, open: false, items: [], pageToken: null }));
    const updated = { ...group, surveyors: [...(group.surveyors || []), ...moreSurveyors], pageToken: json.nextPageToken || null };
    groups[idx] = updated;
    setData(groups);
  };

  const loadSurveyor = async (dayName, surveyorName, openAfterLoad = true) => {
    const groups = [...data];
    const gi = groups.findIndex((g) => g.name === dayName);
    if (gi === -1) return;
    const group = groups[gi];
    const si = (group.surveyors || []).findIndex((s) => s.name === surveyorName);
    if (si === -1) return;
    const surv = group.surveyors[si];
    if (surv.loaded) {
      group.surveyors[si] = { ...surv, open: !surv.open };
      groups[gi] = { ...group };
      setData(groups);
      return;
    }
    const res = await fetch(`/api/admin/progress-tracking?list=files&day=${encodeURIComponent(dayName)}&surveyor=${encodeURIComponent(surveyorName)}&limit=${PAGE_SIZE}`);
    if (!res.ok) return;
    const json = await res.json();
    const items = (json.items || []).map((it) => ({
      path: it.path,
      name: it.name,
      url: it.url,
      updated: (() => { const ts = extractTimestamp(it.name); return ts ? new Date(ts).toISOString() : null; })(),
      size: null
    }));
    group.surveyors[si] = { ...surv, items, pageToken: json.nextPageToken || null, loaded: true, open: openAfterLoad };
    groups[gi] = { ...group };
    setData(groups);
  };

  const loadMoreSurveyorFiles = async (dayName, surveyorName) => {
    const groups = [...data];
    const gi = groups.findIndex((g) => g.name === dayName);
    if (gi === -1) return;
    const group = groups[gi];
    const si = (group.surveyors || []).findIndex((s) => s.name === surveyorName);
    if (si === -1) return;
    const surv = group.surveyors[si];
    if (!surv.pageToken) return;
    const res = await fetch(`/api/admin/progress-tracking?list=files&day=${encodeURIComponent(dayName)}&surveyor=${encodeURIComponent(surveyorName)}&limit=${PAGE_SIZE}&pageToken=${encodeURIComponent(surv.pageToken)}`);
    if (!res.ok) return;
    const json = await res.json();
    const moreItems = (json.items || []).map((it) => ({
      path: it.path,
      name: it.name,
      url: it.url,
      updated: (() => { const ts = extractTimestamp(it.name); return ts ? new Date(ts).toISOString() : null; })(),
      size: null
    }));
    group.surveyors[si] = { ...surv, items: [...surv.items, ...moreItems], pageToken: json.nextPageToken || null };
    groups[gi] = { ...group };
    setData(groups);
  };

  const closeSurveyor = (dayName, surveyorName) => {
    const groups = [...data];
    const gi = groups.findIndex((g) => g.name === dayName);
    if (gi === -1) return;
    const group = groups[gi];
    const si = (group.surveyors || []).findIndex((s) => s.name === surveyorName);
    if (si === -1) return;
    const surv = group.surveyors[si];
    group.surveyors[si] = { ...surv, open: false };
    groups[gi] = { ...group };
    setData(groups);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ImageIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Progress Surveyor</h1>
              <p className="text-xs text-gray-600">Data Source: Firebase Storage / surveyor_tracking (per hari)</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal/hari..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <div>
            <select
              value={selectedSurveyor}
              onChange={(e) => setSelectedSurveyor(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white text-gray-700"
            >
              {allSurveyorNames.map((n) => (
                <option key={n} value={n}>{n === 'all' ? 'Semua Hari' : formatFolderLabel(n)}</option>
              ))}
            </select>
          </div>
        </div>
        {rootToken && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={loadMoreSurveyors}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Tampilkan lebih banyak surveyor
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        )}
        {loading ? (
          <div className="p-8 text-center text-gray-600">Memuat data...</div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map((group) => (
              <div key={group.name} className="bg-white rounded-xl shadow-lg border border-gray-200">
                <button
                  className="w-full px-5 py-3 border-b flex items-center justify-between text-left hover:bg-gray-50"
                  onClick={() => toggleGroup(group.name)}
                >
                  <h2 className="text-lg font-semibold text-gray-900">{group.label || group.name}</h2>
                  <div className="text-sm text-gray-500">
                    {group.loaded ? `${(group.surveyors || []).length} surveyor` : 'Klik untuk melihat'}
                  </div>
                </button>
                {!group.loaded ? (
                  <div className="p-4">
                    <button
                      onClick={() => loadGroup(group.name, true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      Lihat Daftar Surveyor
                    </button>
                  </div>
                ) : group.open ? (
                  <div className="p-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => closeGroup(group.name)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      >
                        <span>←</span> Kembali
                      </button>
                      <div className="text-xs text-gray-500">{(group.surveyors || []).length} surveyor</div>
                    </div>
                    {(group.surveyors || []).filter((s) => !search.trim() || (s.label || s.name || '').toLowerCase().includes(search.trim().toLowerCase())).map((sv) => (
                      <div key={`${group.name}-${sv.name}`} className="border rounded-lg">
                        <button
                          onClick={() => loadSurveyor(group.name, sv.name, !sv.open)}
                          className="w-full px-4 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 border-b"
                        >
                          <div className="text-sm font-semibold text-gray-800">{sv.label || sv.name}</div>
                          <div className="text-xs text-gray-500">{sv.loaded ? `${sv.items.length} foto` : 'Klik untuk melihat'}</div>
                        </button>
                        {sv.loaded && sv.open && (
                          <div className="p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                              {sv.items.map((it) => (
                              <button
                                key={it.path}
                                onClick={() => setPreview({ open: true, src: it.url, title: it.name })}
                                className="group relative rounded-lg overflow-hidden border hover:shadow-md bg-gray-50"
                              >
                                <img src={it.url} alt={it.name} className="w-full h-36 object-cover" />
                                <div className="p-2 text-left">
                                  <div className="text-xs font-medium truncate" title={it.name}>{it.name}</div>
                                    <div className="text-[11px] text-gray-500 flex justify-between">
                                      <span>{it.updated ? new Date(it.updated).toLocaleString('id-ID') : ''}</span>
                                      <span>{formatBytes(it.size)}</span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                              {sv.items.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-6">Tidak ada foto</div>
                              )}
                              {sv.pageToken && (
                                <div className="col-span-full flex justify-center">
                                  <button
                                    onClick={() => loadMoreSurveyorFiles(group.name, sv.name)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                                  >
                                    Tampilkan lebih banyak
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {group.pageToken && (
                      <div className="flex justify-center">
                        <button onClick={() => handleLoadMore(group.name)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                          Tampilkan lebih banyak surveyor
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // group.loaded && !group.open → tampilkan kembali tombol “Lihat Daftar Surveyor”
                  <div className="p-4">
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      Lihat Daftar Surveyor
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-600">Tidak ada data untuk filter saat ini</div>
            )}
          </div>
        )}
      </div>

      {/* Photo Review */}
      <PhotoReviewModal
        isOpen={preview.open}
        onClose={() => setPreview({ open: false, src: null, title: '' })}
        image={{ src: preview.src, alt: preview.title, title: preview.title }}
      />
    </div>
  );
};

export default ProgressSurveyorPage;

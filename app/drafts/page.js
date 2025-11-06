"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getDrafts, deleteDraft } from "../lib/db";
import { syncDraft, useOfflineSync } from "../lib/sync";
import {
  ArrowLeft,
  UploadCloud,
  RefreshCcw,
  Trash2,
  FileText,
  FolderSync,
  Loader2,
  BadgeCheck,
} from "lucide-react";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const { syncing, lastResult, runNow } = useOfflineSync();

  const stats = useMemo(() => ({
    total: drafts.length,
    apj: drafts.filter(d => d.type === 'apj_propose').length,
    existing: drafts.filter(d => d.type !== 'apj_propose').length,
  }), [drafts]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getDrafts();
      setDrafts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSyncOne = async (d) => {
    setSyncingId(d.id);
    try {
      const res = await syncDraft(d);
      if (res.success) {
        await deleteDraft(d.id);
        await load();
        alert('Draft tersinkron');
      } else {
        alert('Gagal sinkron: ' + res.error);
      }
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      const res = await runNow();
      await load();
      alert(`Sinkron selesai: ${res.success}/${res.total} berhasil`);
    } catch (e) {
      alert('Gagal sinkron semua');
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen pb-20">
      {/* Fixed Glass Header - sync with dashboard */}
      <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Draft Offline</h1>
              <p className="text-sm text-gray-600 mt-1">Kelola dan sinkronkan draft yang tersimpan saat offline.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md inline-flex items-center gap-2 text-gray-700"
                title="Kembali"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline text-sm font-medium">Kembali</span>
              </Link>
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-sm transition"
                title="Sinkron Semua"
              >
                {syncing ? <Loader2 size={18} className="animate-spin" /> : <FolderSync size={18} />}
                <span className="hidden sm:inline">{syncing ? 'Menyinkronkan...' : 'Sinkron Semua'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-32">

        {/* Stats - match glass cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{label:'Total Draft',value:stats.total},{label:'APJ Propose',value:stats.apj},{label:'Survey Existing',value:stats.existing}].map((s, i) => (
            <div key={i} className="rounded-3xl border border-white/50 bg-white/90 backdrop-blur p-5 shadow-lg">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur p-6 flex items-center gap-3">
              <Loader2 className="animate-spin text-slate-400" size={18} />
              <span className="text-slate-600 dark:text-slate-300">Memuat draft…</span>
            </div>
          ) : drafts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/90 backdrop-blur p-10 text-center shadow-lg">
              <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <FileText className="text-blue-600 dark:text-blue-400" size={22} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Belum ada draft</h3>
              <p className="text-sm text-gray-600 mt-1">Draft akan muncul di sini ketika Anda mengisi form saat offline.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {drafts.map((d) => {
                const isApj = d.type === 'apj_propose';
                return (
                  <li
                    key={d.id}
                    className="group rounded-3xl border border-white/50 bg-white/90 backdrop-blur p-5 shadow-lg hover:shadow-xl transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isApj ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                          <BadgeCheck size={18} className={isApj ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${isApj ? 'bg-purple-50 text-purple-700 ring-purple-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                              {isApj ? 'APJ Propose' : 'Survey Existing'}
                            </span>
                            {d.updatedAt && (
                              <span className="text-[11px] text-gray-500">{new Date(d.updatedAt).toLocaleString()}</span>
                            )}
                          </div>
                          <div className="mt-1 font-medium text-gray-900">
                            {d.data?.ruas || d.data?.lokasi || 'Tanpa judul'}
                          </div>
                          {d.lastError && (
                            <div className="text-xs text-red-600 mt-1">Gagal sebelumnya: {d.lastError}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleSyncOne(d)}
                          disabled={syncingId === d.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
                        >
                          {syncingId === d.id ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                          {syncingId === d.id ? 'Menyinkronkan…' : 'Sinkron'}
                        </button>
                        <button
                          onClick={async () => { await deleteDraft(d.id); await load(); }}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition"
                        >
                          <Trash2 size={16} />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Quick actions removed as requested: drafts managed only from this page */}
        </div>
      </div>
    </div>
  );
}

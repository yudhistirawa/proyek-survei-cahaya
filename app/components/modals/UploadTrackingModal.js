import React, { useRef, useState } from 'react';
import { X, Image as ImageIcon, UploadCloud, Repeat, CheckCircle, Loader2 } from 'lucide-react';
import { uploadPhotoWithWebPConversion } from '../../lib/photoUpload';

// Modal sederhana untuk alur Upload Progress Tracking
// 1) Pilih foto -> 2) Preview -> 3) Ganti atau Simpan -> 4) Upload ke folder `surveyor_tracking`
const UploadTrackingModal = ({ isOpen, onClose, onSuccess, userName }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const openPicker = () => {
    try {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    } catch (e) {
      console.error('Failed to open file picker:', e);
      setError('Gagal membuka pemilih file. Coba lagi.');
    }
  };

  const closeAndReset = () => {
    try { if (previewUrl) URL.revokeObjectURL(previewUrl); } catch (_) {}
    setPreviewUrl(null);
    setFile(null);
    setError('');
    onClose?.();
  };

  const handleFileChange = (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith('image/')) {
      setError('File harus berupa gambar.');
      return;
    }
    setError('');
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const resetSelection = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError('');
  };

  const handleSave = async () => {
    if (!file) return;
    let success = false;
    try {
      setIsUploading(true);
      setError('');
      const safeName = (userName || 'surveyor')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\-_\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 60);
      // Tentukan folder hari + tanggal secara realtime (contoh: '2025-09-19_Kamis')
      const hari = (() => {
        try {
          const n = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
          // Normalisasi agar konsisten (Kapital di awal, sisanya kecil)
          return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
        } catch (_) {
          // Fallback ke bahasa Indonesia manual bila locale tidak tersedia
          const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
          return days[new Date().getDay()];
        }
      })();
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const tanggal = `${yyyy}-${mm}-${dd}`;
      // Struktur penyimpanan: surveyor_tracking/{YYYY-MM-DD_Hari}/{NamaSurveyor}
      const folderLabel = `${tanggal}_${hari}`;
      const folderPath = `surveyor_tracking/${folderLabel}/${safeName || 'surveyor'}`;
      // Sertakan jam-menit-detik pada nama file base agar mudah dicari
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const timeBase = `${hh}${mi}${ss}`; // 142305
      // Sertakan nama surveyor + waktu pada nama file agar mudah diidentifikasi
      const result = await uploadPhotoWithWebPConversion(file, folderPath, 0.8, `${safeName || 'surveyor'}_${timeBase}`);
      if (result?.success) {
        if (onSuccess) onSuccess(result);
        // Tampilkan notifikasi sederhana; UI project sudah banyak pakai alert()
        alert(`Upload berhasil. Foto tersimpan di folder "surveyor_tracking/${folderLabel}"`);
        success = true;
      } else {
        setError(result?.error || 'Upload gagal. Coba lagi.');
      }
    } catch (e) {
      console.error('Upload error:', e);
      setError(e?.message || 'Terjadi kesalahan saat upload.');
    } finally {
      setIsUploading(false);
      if (success) closeAndReset();
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!isUploading) closeAndReset(); }} />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
                <ImageIcon size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Upload Progress Tracking</h2>
                <p className="text-xs text-gray-500">Pilih foto, review, lalu simpan</p>
              </div>
            </div>
            <button
              onClick={() => { if (!isUploading) closeAndReset(); }}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              disabled={isUploading}
            >
              <X size={18} className="text-gray-700" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {!file && (
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">Belum ada foto dipilih</p>
                <button
                  onClick={openPicker}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow"
                >
                  <UploadCloud size={18} /> Pilih Foto
                </button>
              </div>
            )}

            {file && (
              <div className="space-y-4">
                <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="max-h-full" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="truncate">{file.name}</span>
                  <span>{Math.round(file.size / 1024)} KB</span>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <button
                    onClick={resetSelection}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl"
                    disabled={isUploading}
                  >
                    <Repeat size={18} /> Ganti Foto
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Simpan
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
            )}
          </div>

          {/* Hidden input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};

export default UploadTrackingModal;

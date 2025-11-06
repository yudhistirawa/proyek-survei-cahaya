"use client";
import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
// Hindari upload langsung ke Firebase Storage dari client (CORS)
import { convertFileToWebP, uploadWebPToStorage } from "../lib/photoUpload";

const FIELDS = [
  { key: "lapangan", label: "Foto Lapangan" },
  { key: "sebelumNaik", label: "Foto Lampu Sebelum Naik" },
  { key: "tinggiTiang", label: "Foto Tinggi Tiang" },
  { key: "petugas", label: "Foto Petugas" },
  { key: "pengujian", label: "Foto Pengujian" },
];

function DocumentationModal({ isOpen, onClose, onSave, reportId }) {
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFiles({});
      setPreviews({});
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleFileChange = (key) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setPreviews((p) => ({ ...p, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      const urlMap = {};
      for (const field of FIELDS) {
        const file = files[field.key];
        if (!file) continue;
        // Convert ke WebP agar konsisten dan ukuran lebih kecil
        const webp = await convertFileToWebP(file, 0.8);
        // Upload via API route (hindari CORS)
        const folder = `Dokumentasi/${reportId || "temp"}`;
        const result = await uploadWebPToStorage(webp, folder);
        if (!result.success) throw new Error(result.error || "Upload gagal");
        urlMap[field.key] = result.downloadURL;
      }
      onSave(urlMap);
    } catch (err) {
      console.error("Upload dokumentasi gagal", err);
      alert("Gagal mengunggah foto dokumentasi. Coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">
          Dokumentasi Awal Survei
        </h2>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {f.label}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange(f.key)}
                  className="flex-1"
                />
                {previews[f.key] ? (
                  <Image
                    src={previews[f.key]}
                    alt={f.label}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-14 h-14 flex items-center justify-center rounded-lg border text-gray-400">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          disabled={isUploading}
          onClick={handleUpload}
          className="mt-6 w-full flex items-center justify-center bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
        >
          {isUploading ? (
            <span>Mengunggah...</span>
          ) : (
            <>
              <Upload size={18} className="mr-2" /> Simpan Dokumentasi
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const DocumentationModalComponent = DocumentationModal;
export default DocumentationModalComponent;

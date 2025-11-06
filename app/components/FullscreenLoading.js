"use client";
import React from "react";
import { RotateCw } from "lucide-react";

/**
 * FullscreenLoading
 * Menutup seluruh layar dengan layer blur dan menampilkan spinner + tombol Cancel.
 * Props:
 * - isOpen: boolean, kontrol visibilitas.
 * - onCancel: function, dipanggil saat menekan tombol Cancel.
 * - message?: string, teks di atas spinner.
 */
export default function FullscreenLoading({ isOpen, onCancel, message = "Loading…" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="flex flex-col items-center space-y-4 text-center">
        <RotateCw className="animate-spin text-white" size={48} />
        <p className="text-lg font-semibold text-white">{message}</p>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded focus:outline-none"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

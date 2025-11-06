"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CellFormPage = () => {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [cellType, setCellType] = useState("normal");
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const handleSaveRight = () => {
        setLoading(true);
        // Simpan data dan lanjut ke kanan
        setTimeout(() => {
            setLoading(false);
            // Lakukan navigasi atau aksi lain di sini
        }, 1000);
    };

    const handleSaveDown = () => {
        setLoading(true);
        // Simpan data dan lanjut ke bawah
        setTimeout(() => {
            setLoading(false);
            // Lakukan navigasi atau aksi lain di sini
        }, 1000);
    };

    return (
        <form className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 space-y-6 mt-10">
            {/* Pilihan Tipe Sel */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Sel
                </label>
                <div className="flex gap-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="cellType"
                            value="normal"
                            checked={cellType === "normal"}
                            onChange={() => setCellType("normal")}
                            className="form-radio text-blue-600"
                        />
                        <span className="ml-2">Normal</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="cellType"
                            value="titik_api"
                            checked={cellType === "titik_api"}
                            onChange={() => setCellType("titik_api")}
                            className="form-radio text-red-600"
                        />
                        <span className="ml-2">Titik Api</span>
                    </label>
                </div>
            </div>

            {/* Tombol Ambil Foto */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lampiran Foto
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {photo && (
                    <div className="mt-2 text-xs text-gray-600">{photo.name}</div>
                )}
            </div>

            {/* Tombol Bawah */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end md:flex-row md:gap-4 md:justify-end">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
                >
                    Batal
                </button>
                <button
                    type="button"
                    onClick={handleSaveRight}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    Simpan & Lanjut Kanan
                </button>
                <button
                    type="button"
                    onClick={handleSaveDown}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                    Simpan & Lanjut Bawah
                </button>
            </div>
        </form>
    );
};

export default CellFormPage;

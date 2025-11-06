'use client';

import React from 'react';
import Link from 'next/link';
import MapsValidasiPage from '../components/admin/maps-validasi/MapsValidasiPage';
import { ChevronLeft } from 'lucide-react';

export default function PetaBersamaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with Back to Login */}
      <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <ChevronLeft size={18} />
              <span className="text-sm font-semibold">Kembali ke Login</span>
            </Link>
            <span className="text-sm text-gray-400">Akses publik • tidak memerlukan login</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        <MapsValidasiPage />
      </div>
    </div>
  );
}

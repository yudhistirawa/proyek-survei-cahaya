"use client";

import React from 'react';
import Link from 'next/link';
import FormSurveyExisting from '../components/FormSurveyExisting';

export default function SurveyExistingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header - Fixed for mobile, sticky for desktop */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Survey Existing</h1>
            <div className="flex gap-1 sm:gap-2">
              <Link href="/drafts" className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors whitespace-nowrap">
                <span className="hidden sm:inline">Lihat Draft</span>
                <span className="sm:hidden">📋</span>
              </Link>
              <Link href="/" className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap">
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">🏠</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Optimized spacing */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 pb-32 md:pb-24">
        <FormSurveyExisting />
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import Link from 'next/link';
import FormSurveyExisting from '../components/FormSurveyExisting';

export default function SurveyExistingPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Form Survey Existing</h1>
        <div className="flex gap-2">
          <Link href="/drafts" className="px-3 py-2 bg-gray-100 rounded border">Lihat Draft</Link>
          <Link href="/" className="px-3 py-2 bg-gray-100 rounded border">Dashboard</Link>
        </div>
      </div>
      <FormSurveyExisting />
    </div>
  );
}

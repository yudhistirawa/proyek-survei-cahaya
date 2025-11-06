'use client';

import React from 'react';
import useDashboardStats from '../../hooks/useDashboardStats';

export default function SurveyorDashboardPage() {
  const { stats, loading, error } = useDashboardStats();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Surveyor Dashboard</h1>

      {loading && <p>Loading dashboard stats...</p>}

      {error && (
        <p className="text-red-600">
          Error loading dashboard stats: {typeof error === 'string' ? error : 'Unknown error'}
        </p>
      )}

      {stats && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Totals</h2>
            <ul className="list-disc list-inside">
              <li>Total Surveys: {stats.totalSurveys ?? 0}</li>
              <li>Completed Surveys: {stats.completedSurveys ?? stats.tugasSelesai ?? 0}</li>
            </ul>
          </div>
          {/* Add more dashboard info here if needed */}
        </div>
      )}
    </div>
  );
}

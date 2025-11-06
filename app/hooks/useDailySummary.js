import { useState, useEffect, useCallback } from 'react';

const useDailySummary = (taskId, userId) => {
  const [summary, setSummary] = useState({
    taskInfo: null,
    statistikHariIni: {
      surveyHariIni: 0,
      surveySelesai: 0,
      surveyPending: 0,
      totalSurveyTugas: 0,
      progressPersentase: 0
    },
    surveyHariIniDetail: [],
    aktivitasTerbaru: [],
    ringkasanLokasi: [],
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!taskId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/daily-summary?taskId=${taskId}&userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengambil ringkasan harian');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching daily summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Auto refresh every 2 minutes for realtime updates
  useEffect(() => {
    if (!taskId || !userId) return;

    const interval = setInterval(() => {
      fetchSummary();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [fetchSummary, taskId, userId]);

  // Manual refresh function
  const refreshSummary = useCallback(() => {
    setLoading(true);
    fetchSummary();
  }, [fetchSummary]);

  // Format time helper
  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Format last updated time
  const formatLastUpdated = useCallback(() => {
    if (!summary.lastUpdated) return '';
    
    const now = new Date();
    const updated = new Date(summary.lastUpdated);
    const diffInSeconds = Math.floor((now - updated) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Baru saja';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} menit yang lalu`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} jam yang lalu`;
    }
  }, [summary.lastUpdated]);

  // Get status color helper
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed':
      case 'validated':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'assigned':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // Get priority color helper
  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-800 bg-red-200';
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-blue-600 bg-blue-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  }, []);

  // Get priority text helper
  const getPriorityText = useCallback((priority) => {
    switch (priority) {
      case 'urgent':
        return 'Mendesak';
      case 'high':
        return 'Tinggi';
      case 'medium':
        return 'Sedang';
      case 'low':
        return 'Rendah';
      default:
        return 'Sedang';
    }
  }, []);

  // Get status text helper
  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'assigned':
        return 'Ditugaskan';
      case 'in_progress':
        return 'Sedang Dikerjakan';
      case 'completed':
        return 'Selesai';
      case 'validated':
        return 'Tervalidasi';
      case 'pending':
        return 'Menunggu';
      default:
        return status;
    }
  }, []);

  return {
    summary,
    loading,
    error,
    refreshSummary,
    formatTime,
    formatDate,
    formatLastUpdated,
    getStatusColor,
    getPriorityColor,
    getPriorityText,
    getStatusText
  };
};

export default useDailySummary;

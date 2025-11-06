import { useState, useEffect, useCallback } from 'react';

const useDashboardStats = (userId, isAdmin = false) => {
  const [stats, setStats] = useState(
    isAdmin ? {
      totalUsers: 0,
      activeTasks: 0,
      pendingValidation: 0,
      databaseRecords: 0,
      totalSurveys: 0,
      completedSurveys: 0,
      lastUpdated: null
    } : {
      surveysBaru: 0,
      tugasSelesai: 0,
      pending: 0,
      totalSurveys: 0,
      totalTasks: 0,
      validatedSurveys: 0,
      lastUpdated: null
    }
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      
      let url = '/api/dashboard-stats';
      const params = new URLSearchParams();
      
      if (isAdmin) {
        params.append('admin', 'true');
      } else if (userId) {
        params.append('userId', userId);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('🔄 Fetching dashboard stats from:', url);
      
      const response = await fetch(url);
      
      // Check if response is ok
      if (!response.ok) {
        console.warn(`⚠️ Dashboard stats API returned ${response.status}: ${response.statusText}`);
        // Don't throw error for 4xx/5xx, just log and continue with default data
        const defaultData = isAdmin ? {
          totalUsers: 0,
          activeTasks: 0,
          pendingValidation: 0,
          databaseRecords: 0,
          totalSurveys: 0,
          completedSurveys: 0,
          lastUpdated: new Date().toISOString(),
          error: `Server error: ${response.status}`
        } : {
          surveysBaru: 0,
          tugasSelesai: 0,
          pending: 0,
          totalSurveys: 0,
          totalTasks: 0,
          validatedSurveys: 0,
          lastUpdated: new Date().toISOString(),
          error: `Server error: ${response.status}`
        };
        
        setStats(prevStats => ({
          ...prevStats,
          ...defaultData
        }));
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ JSON parsing error:', jsonError);
        const text = await response.text();
        console.error('❌ Response text:', text.substring(0, 200));
        throw new Error('Failed to parse JSON response');
      }
      
      // Cek apakah ada error dalam response data
      if (data.error) {
        console.warn('⚠️ Dashboard stats warning:', data.error);
        // Tetap set data meskipun ada error, tapi dengan nilai default
        setStats(prevStats => ({
          ...prevStats,
          surveysBaru: data.surveysBaru || 0,
          tugasSelesai: data.tugasSelesai || 0,
          pending: data.pending || 0,
          totalSurveys: data.totalSurveys || 0,
          totalTasks: data.totalTasks || 0,
          validatedSurveys: data.validatedSurveys || 0,
          totalUsers: data.totalUsers || 0,
          activeTasks: data.activeTasks || 0,
          pendingValidation: data.pendingValidation || 0,
          databaseRecords: data.databaseRecords || 0,
          completedSurveys: data.completedSurveys || 0,
          lastUpdated: new Date().toISOString(),
          error: data.error
        }));
        return;
      }
      
      console.log('✅ Dashboard stats received:', data);
      setStats(prevStats => ({
        ...prevStats,
        ...data,
        lastUpdated: data.lastUpdated || new Date().toISOString()
      }));
    } catch (err) {
      console.error('❌ Error fetching dashboard stats:', err);
      setError(err.message);
      
      // Set default stats on error to prevent crashes
      setStats(prevStats => ({
        ...prevStats,
        surveysBaru: 0,
        tugasSelesai: 0,
        pending: 0,
        totalSurveys: 0,
        totalTasks: 0,
        validatedSurveys: 0,
        totalUsers: 0,
        activeTasks: 0,
        pendingValidation: 0,
        databaseRecords: 0,
        completedSurveys: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Gagal memuat statistik dashboard'
      }));
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto refresh every 10 seconds for realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [fetchStats]);

  // Manual refresh function
  const refreshStats = useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  // Format last updated time
  const formatLastUpdated = useCallback(() => {
    if (!stats.lastUpdated) return '';
    
    const now = new Date();
    const updated = new Date(stats.lastUpdated);
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
  }, [stats.lastUpdated]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    formatLastUpdated
  };
};

export default useDashboardStats;

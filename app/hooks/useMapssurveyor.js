// hooks/useMapsurveyor.js
import { useState, useEffect, useCallback } from 'react';
import { 
  loadRuteSurveyor, 
  setupRealtimeSurveyorListener,
  selesaikanTugas 
} from '../lib/maps-surveyor-service.js';

/**
 * React hook untuk mengelola data Maps Surveyor dengan real-time updates
 * @param {Object} options - Opsi konfigurasi
 * @returns {Object} State dan functions untuk Maps Surveyor
 */
export const useMapsurveyor = (options = {}) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealtime, setIsRealtime] = useState(options.realtime !== false);

  // Load initial data
  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading surveyor routes...');
      const routesData = await loadRuteSurveyor(options);
      
      setRoutes(routesData);
      console.log(`✅ Loaded ${routesData.length} routes`);
      
    } catch (err) {
      console.error('❌ Error loading routes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Setup real-time listener
  useEffect(() => {
    let unsubscribe = null;

    if (isRealtime) {
      console.log('🔄 Setting up real-time listener...');
      
      try {
        unsubscribe = setupRealtimeSurveyorListener((routesData, error) => {
          if (error) {
            console.error('❌ Real-time listener error:', error);
            setError(error.message);
          } else {
            console.log(`🔄 Real-time update: ${routesData.length} routes`);
            setRoutes(routesData);
            setLoading(false);
          }
        }, options);
        
        console.log('✅ Real-time listener setup complete');
        
      } catch (err) {
        console.error('❌ Error setting up real-time listener:', err);
        setError(err.message);
        setLoading(false);
        
        // Fallback to manual loading
        loadRoutes();
      }
    } else {
      // Manual loading if real-time is disabled
      loadRoutes();
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('🔄 Cleaning up real-time listener...');
        unsubscribe();
      }
    };
  }, [isRealtime, loadRoutes, options]);

  // Function to complete a task
  const completeTask = useCallback(async (taskId, surveyorId, route) => {
    try {
      setError(null);
      
      console.log('🏁 Completing task...', { taskId, surveyorId });
      const result = await selesaikanTugas(taskId, surveyorId, route);
      
      console.log('✅ Task completed successfully:', result);
      
      // If not using real-time, manually reload data
      if (!isRealtime) {
        await loadRoutes();
      }
      
      return result;
      
    } catch (err) {
      console.error('❌ Error completing task:', err);
      setError(err.message);
      throw err;
    }
  }, [isRealtime, loadRoutes]);

  // Function to refresh data manually
  const refreshRoutes = useCallback(async () => {
    await loadRoutes();
  }, [loadRoutes]);

  // Function to toggle real-time mode
  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  // Function to get route by ID
  const getRouteById = useCallback((routeId) => {
    return routes.find(route => route.id === routeId);
  }, [routes]);

  // Function to get routes by surveyor
  const getRoutesBySurveyor = useCallback((surveyorId) => {
    return routes.filter(route => route.surveyorId === surveyorId);
  }, [routes]);

  // Statistics
  const statistics = {
    totalRoutes: routes.length,
    totalSurveyors: [...new Set(routes.map(r => r.surveyorId))].length,
    totalDistance: routes.reduce((sum, route) => 
      sum + (route.statistics?.distance || 0), 0
    ),
    averageDistance: routes.length > 0 
      ? routes.reduce((sum, route) => sum + (route.statistics?.distance || 0), 0) / routes.length 
      : 0
  };

  return {
    // State
    routes,
    loading,
    error,
    isRealtime,
    statistics,
    
    // Functions
    completeTask,
    refreshRoutes,
    toggleRealtime,
    getRouteById,
    getRoutesBySurveyor,
    
    // Utils
    clearError: () => setError(null)
  };
};

/**
 * Hook khusus untuk admin panel dengan fitur tambahan
 * @param {Object} options - Opsi konfigurasi
 * @returns {Object} Enhanced state dan functions untuk admin
 */
export const useAdminMapsurveyor = (options = {}) => {
  const baseHook = useMapsurveyor({ ...options, realtime: true });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [filterSurveyor, setFilterSurveyor] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filtered and sorted routes
  const filteredRoutes = baseHook.routes
    .filter(route => {
      if (!filterSurveyor) return true;
      return route.surveyorId.toLowerCase().includes(filterSurveyor.toLowerCase());
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || a.statistics?.[sortBy];
      const bValue = b[sortBy] || b.statistics?.[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Enhanced statistics
  const enhancedStatistics = {
    ...baseHook.statistics,
    filteredCount: filteredRoutes.length,
    selectedRoute: selectedRoute ? {
      id: selectedRoute.id,
      surveyorId: selectedRoute.surveyorId,
      distance: selectedRoute.statistics?.distance || 0,
      duration: selectedRoute.statistics?.duration || 'N/A'
    } : null
  };

  return {
    ...baseHook,
    
    // Enhanced state
    routes: filteredRoutes,
    selectedRoute,
    filterSurveyor,
    sortBy,
    sortOrder,
    statistics: enhancedStatistics,
    
    // Enhanced functions
    setSelectedRoute,
    setFilterSurveyor,
    setSortBy,
    setSortOrder,
    
    // Utility functions
    selectRoute: (routeId) => {
      const route = baseHook.routes.find(r => r.id === routeId);
      setSelectedRoute(route);
    },
    clearSelection: () => setSelectedRoute(null),
    resetFilters: () => {
      setFilterSurveyor('');
      setSortBy('createdAt');
      setSortOrder('desc');
    }
  };
};

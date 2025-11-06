import { useState, useEffect, useRef, useCallback } from 'react';

// Cache global untuk menyimpan data antar komponen
const globalCache = new Map();
const cacheTimestamps = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export function useDataCache(key, fetcher, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);
    
    const {
        cacheTime = CACHE_DURATION,
        staleTime = 2 * 60 * 1000, // 2 menit
        enabled = true
    } = options;

    // Cek apakah data di cache masih valid
    const isCacheValid = useCallback((cacheKey) => {
        const timestamp = cacheTimestamps.get(cacheKey);
        if (!timestamp) return false;
        return Date.now() - timestamp < cacheTime;
    }, [cacheTime]);

    // Cek apakah data masih fresh (tidak stale)
    const isCacheFresh = useCallback((cacheKey) => {
        const timestamp = cacheTimestamps.get(cacheKey);
        if (!timestamp) return false;
        return Date.now() - timestamp < staleTime;
    }, [staleTime]);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!enabled) return;

        // Cek cache terlebih dahulu
        const cachedData = globalCache.get(key);
        const cacheValid = isCacheValid(key);
        const cacheFresh = isCacheFresh(key);

        // Jika ada data di cache dan masih fresh, gunakan itu
        if (cachedData && cacheFresh && !forceRefresh) {
            setData(cachedData);
            setError(null);
            return cachedData;
        }

        // Jika ada data di cache tapi sudah stale, tampilkan dulu lalu fetch di background
        if (cachedData && cacheValid && !forceRefresh) {
            setData(cachedData);
            setError(null);
            // Lanjutkan fetch di background untuk update
        }

        setLoading(true);
        
        // Cancel request sebelumnya jika ada
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();

        try {
            const result = await fetcher(abortControllerRef.current.signal);
            
            // Simpan ke cache
            globalCache.set(key, result);
            cacheTimestamps.set(key, Date.now());
            
            setData(result);
            setError(null);
            return result;
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err);
                console.error(`Error fetching data for key ${key}:`, err);
                
                // Jika ada data cache lama, tetap gunakan itu
                if (cachedData && cacheValid) {
                    setData(cachedData);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [key, enabled, isCacheValid, isCacheFresh]);

    // Auto fetch saat pertama kali atau key berubah
    useEffect(() => {
        fetchData();
        
        // Cleanup
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchData]);

    // Manual refresh function
    const refresh = useCallback(() => {
        return fetchData(true);
    }, [fetchData]);

    // Clear cache function
    const clearCache = useCallback(() => {
        globalCache.delete(key);
        cacheTimestamps.delete(key);
    }, [key]);

    return {
        data,
        loading,
        error,
        refresh,
        clearCache,
        isCached: globalCache.has(key) && isCacheValid(key)
    };
}

// Utility untuk clear semua cache
export const clearAllCache = () => {
    globalCache.clear();
    cacheTimestamps.clear();
};

// Utility untuk clear cache yang sudah expired
export const cleanupExpiredCache = () => {
    const now = Date.now();
    for (const [key, timestamp] of cacheTimestamps.entries()) {
        if (now - timestamp > CACHE_DURATION) {
            globalCache.delete(key);
            cacheTimestamps.delete(key);
        }
    }
};

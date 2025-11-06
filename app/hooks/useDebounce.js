import { useState, useEffect, useRef } from 'react';

// Custom Hook untuk Debouncing yang dioptimasi
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const timeoutRef = useRef(null);
    
    useEffect(() => {
        // Clear timeout yang ada jika ada
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        // Set timeout baru
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);
    
    // Cleanup saat component unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    
    return debouncedValue;
}

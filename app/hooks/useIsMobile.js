import { useState, useEffect } from 'react';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            // Check screen width
            const screenWidth = window.innerWidth;
            const isMobileWidth = screenWidth <= 768;

            // Check user agent for mobile devices
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

            // Check for touch capability
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Combine all checks - prioritize screen width but consider other factors
            const mobile = isMobileWidth || (isMobileUserAgent && isTouchDevice);
            
            setIsMobile(mobile);
        };

        // Check on mount
        checkIsMobile();

        // Add resize listener
        window.addEventListener('resize', checkIsMobile);

        // Cleanup
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    return isMobile;
};

export default useIsMobile;

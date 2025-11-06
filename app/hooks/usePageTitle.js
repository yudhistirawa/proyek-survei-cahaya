import { useEffect } from 'react';

const usePageTitle = (title) => {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined' && title) {
      document.title = title;
    }
    
    // Cleanup: kembalikan ke title default saat component unmount
    return () => {
      if (typeof window !== 'undefined') {
        document.title = 'Survey Cahaya';
      }
    };
  }, [title]);
};

export default usePageTitle;

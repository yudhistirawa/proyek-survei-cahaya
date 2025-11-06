'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import FloatingMapModal from './FloatingMapModal';
import { useRouter, usePathname } from 'next/navigation';

const FloatingMapsButton = () => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const updateVisibility = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Sembunyikan pada halaman admin
    const adminPaths = ['/admin', '/panel-admin', '/database-propose'];
    if (adminPaths.some((p) => pathname.startsWith(p))) {
      setVisible(false);
      return;
    }
    setVisible(!!sessionStorage.getItem('currentTaskKmz'));
  }, [pathname]);

  useEffect(() => {
    updateVisibility();

    const handleStorage = () => updateVisibility();
    const handleCustom = () => updateVisibility();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('currentTaskChanged', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('currentTaskChanged', handleCustom);
    };
  }, [updateVisibility]);

  const handleClick = useCallback(() => {
    try {
      const kmz = sessionStorage.getItem('currentTaskKmz');
      if (!kmz) {
        router.push('/task-map');
      } else {
        setOpen(true);
      }
    } catch {
      router.push('/task-map');
    }
  }, [router]);

  if (!visible) return null;

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Buka Peta"
        title="Buka Peta"
        className="fixed bottom-[88px] left-4 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <MapPin size={24} />
      </button>
      <FloatingMapModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default FloatingMapsButton;

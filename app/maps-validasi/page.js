'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyMapsValidasiRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/peta-bersama');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">Mengalihkan ke Peta Bersama...</div>
  );
}

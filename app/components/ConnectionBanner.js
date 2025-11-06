"use client";

import { useEffect, useState } from "react";

export default function ConnectionBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-md text-xs font-medium bg-amber-100 text-amber-800 shadow">
      Mode offline: perubahan akan disimpan sebagai draft dan disinkronkan saat online.
    </div>
  );
}

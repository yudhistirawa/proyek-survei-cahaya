import React, { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

const NotificationBadge = ({ count = 0, showBadge = true, className = '' }) => {
  const audioRef = useRef(null);
  const prevCountRef = useRef(0);

  // Play notification sound when count increases
  useEffect(() => {
    if (count > prevCountRef.current && count > 0) {
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.log('Audio play failed:', err);
        });
      }
    }
    prevCountRef.current = count;
  }, [count]);

  if (!showBadge || count === 0) {
    return (
      <div className={`relative ${className}`}>
        <Bell size={20} className="mb-1" />
        <audio ref={audioRef} preload="auto">
          <source src="/notification-sound.mp3" type="audio/mpeg" />
        </audio>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Bell size={20} className="mb-1" />
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-pulse shadow-lg">
        {count > 99 ? '99+' : count}
      </div>
      <audio ref={audioRef} preload="auto">
        <source src="/notification-sound.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default NotificationBadge;

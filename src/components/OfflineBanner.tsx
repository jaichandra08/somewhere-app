import React, { useState, useEffect } from 'react';
import { WifiOff, Play } from 'lucide-react';
import { playTap } from '../lib/sound.ts';

interface OfflineBannerProps {
  onDoOffline: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onDoOffline }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="offline-status-banner"
      className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Looks like the internet wandered off.</span>
      </div>
      <button
        id="offline-quick-action-btn"
        type="button"
        onClick={() => {
          playTap();
          onDoOffline();
        }}
        className="font-semibold underline hover:no-underline flex items-center gap-1 cursor-pointer"
      >
        <Play className="w-3 h-3" />
        Do a quick one offline
      </button>
    </div>
  );
};

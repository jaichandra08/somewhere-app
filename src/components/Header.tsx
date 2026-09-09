import React, { useState } from 'react';
import { Volume2, VolumeX, Settings, Compass, Users, Sparkles, Scale, User, Shield } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playTap } from '../lib/sound.ts';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      playTap();
    }
  };

  const navLinks = [
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Quiet Crowd', path: '/crowd', icon: Users },
    { label: 'Settle This', path: '/settle', icon: Scale },
    { label: 'Future You', path: '/future-you', icon: Sparkles },
    { label: 'Profile', path: '/profile', icon: User }
  ];

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 w-full bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 transition-colors"
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          id="brand-logo-button"
          onClick={() => {
            playTap();
            onNavigate('/');
          }}
          className="flex items-baseline gap-1.5 cursor-pointer select-none group"
        >
          <span className="font-bold tracking-tight text-lg sm:text-xl text-stone-900 dark:text-stone-50 group-hover:opacity-80 transition-opacity font-serif">
            SOMEWHERE
          </span>
          <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500">™</span>
        </div>

        {/* Desktop Nav Links */}
        <nav id="desktop-nav" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = currentPath === link.path;
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                id={`desktop-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => {
                  playTap();
                  onNavigate(link.path);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Sound Toggle */}
          <button
            id="header-sound-toggle-btn"
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute Sound' : 'Enable Sound'}
            title={soundOn ? 'Mute gentle sounds' : 'Turn on gentle sounds'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundOn
                ? 'border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings / Safety */}
          <button
            id="header-settings-btn"
            type="button"
            onClick={() => {
              playTap();
              onNavigate('/settings');
            }}
            aria-label="Settings"
            title="Settings & Safety"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              currentPath === '/settings'
                ? 'border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

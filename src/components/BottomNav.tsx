import React from 'react';
import { Home, Compass, Users, User } from 'lucide-react';
import { playTap } from '../lib/sound.ts';

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPath, onNavigate }) => {
  const items = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'explore', label: 'Explore', path: '/explore', icon: Compass },
    { id: 'crowd', label: 'Crowd', path: '/crowd', icon: Users },
    { id: 'profile', label: 'Profile', path: '/profile', icon: User }
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800/80 pb-safe"
    >
      <div className="grid grid-cols-4 h-14 max-w-md mx-auto">
        {items.map((item) => {
          const active = currentPath === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              type="button"
              onClick={() => {
                playTap();
                onNavigate(item.path);
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none ${
                active
                  ? 'text-stone-900 dark:text-stone-50 font-semibold'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

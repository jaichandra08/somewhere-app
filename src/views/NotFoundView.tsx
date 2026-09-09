import React from 'react';
import { Compass, Home } from 'lucide-react';
import { playTap } from '../lib/sound.ts';

interface NotFoundViewProps {
  onNavigate: (path: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  return (
    <div id="not-found-view" className="w-full max-w-md mx-auto py-20 text-center flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center">
        <Compass className="w-6 h-6 animate-spin-slow" />
      </div>

      <h1 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50">
        You found Somewhere that doesn't exist yet.
      </h1>

      <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
        This path wandered off into the quiet distance. Let’s bring you back to something real.
      </p>

      <div className="flex gap-2.5 mt-2">
        <button
          id="not-found-home-btn"
          type="button"
          onClick={() => {
            playTap();
            onNavigate('/');
          }}
          className="py-2.5 px-5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          Go Home
        </button>

        <button
          id="not-found-explore-btn"
          type="button"
          onClick={() => {
            playTap();
            onNavigate('/explore');
          }}
          className="py-2.5 px-5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold"
        >
          Explore Experiences
        </button>
      </div>
    </div>
  );
};

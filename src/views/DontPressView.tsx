import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import { getDontPressSurprise } from '../lib/api.ts';
import { playPop, playTap } from '../lib/sound.ts';

export const DontPressView: React.FC = () => {
  const [surprise, setSurprise] = useState<{
    title: string;
    flavor: string;
    task: string;
    actionType: string;
    seconds?: number;
    options?: string[];
  } | null>(null);

  const [pressing, setPressing] = useState(false);
  const [pressCount, setPressCount] = useState(0);

  const handlePress = async () => {
    setPressing(true);
    playPop();
    try {
      const data = await getDontPressSurprise();
      setSurprise(data);
      setPressCount((c) => c + 1);
    } catch {
      // fallback
    } finally {
      setPressing(false);
    }
  };

  const handleReset = () => {
    playTap();
    setSurprise(null);
  };

  return (
    <div id="dont-press-view" className="w-full max-w-md mx-auto flex flex-col items-center gap-8 py-8 pb-16 text-center">
      {/* Warning Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 font-serif">
          Strictly Forbidden
        </h1>
        <p className="text-xs text-stone-500 max-w-xs">
          Nobody told you to come here. Whatever happens next is between you and the button.
        </p>
      </div>

      {!surprise ? (
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Giant Tactile Button */}
          <button
            id="giant-dont-press-btn"
            type="button"
            disabled={pressing}
            onClick={handlePress}
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-linear-to-b from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-black text-xl sm:text-2xl uppercase tracking-widest shadow-2xl border-4 border-rose-400/50 active:scale-95 active:shadow-inner transition-all flex items-center justify-center cursor-pointer select-none ring-8 ring-rose-500/20"
          >
            {pressing ? 'Hold On...' : 'DO NOT PRESS'}
          </button>

          <span className="text-[11px] text-stone-400">
            {pressCount === 0
              ? 'Warning: irreversible consequences may include mild amusement.'
              : `Pressed ${pressCount} time${pressCount > 1 ? 's' : ''}. You really can't help yourself.`}
          </span>
        </div>
      ) : (
        /* Surprise Consequence */
        <div
          id="dont-press-result-card"
          className="w-full p-6 sm:p-8 rounded-3xl border-2 border-rose-500/40 bg-white dark:bg-stone-900 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600">
            <Sparkles className="w-4 h-4" />
            <span>{surprise.title}</span>
          </div>

          <p className="text-sm italic text-stone-500 dark:text-stone-400">
            "{surprise.flavor}"
          </p>

          <div className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug">
            {surprise.task}
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              id="press-again-btn"
              type="button"
              onClick={handlePress}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Press Again Anyway
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

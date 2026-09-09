import React, { useState } from 'react';
import { Sparkles, ArrowRight, Clock, HelpCircle, Compass } from 'lucide-react';
import { generateFutureYou } from '../lib/api.ts';
import { FutureDecision } from '../types.ts';
import { playTap, playSuccess } from '../lib/sound.ts';

export const FutureYouView: React.FC = () => {
  const [decision, setDecision] = useState('');
  const [result, setResult] = useState<(FutureDecision & { disclaimer: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision.trim()) return;
    setLoading(true);
    setError(null);
    playTap();
    try {
      const res = await generateFutureYou(decision.trim());
      setResult(res);
      playSuccess();
    } catch {
      setError('Could not consult the timelines right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="future-you-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Decision Playground</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          Future You
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
          Pondering a tiny or medium decision? Peek into three gentle, fictional timelines to loosen up the overthinking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-3 shadow-xs">
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
          What decision or hesitation is on your mind?
        </label>
        <textarea
          id="future-you-input"
          value={decision}
          onChange={(e) => setDecision(e.target.value.slice(0, 150))}
          placeholder="e.g., Should I sign up for the weekend ceramics class? Should I text them back?"
          rows={2}
          required
          className="w-full text-sm p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
        />
        <div className="text-right text-[11px] text-stone-400">
          {decision.length}/150
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <button
          id="generate-future-you-btn"
          type="submit"
          disabled={loading || !decision.trim()}
          className="py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          <Compass className="w-4 h-4" />
          {loading ? 'Consulting Timelines...' : 'Explore Timelines'}
        </button>
      </form>

      {result && (
        <div id="future-you-results" className="flex flex-col gap-4 animate-in fade-in duration-300">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Three Gentle Perspectives on "{result.decision}"
          </h2>

          {/* 7 Days */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1.5 shadow-2xs">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 7 Days From Now (If you do it)
            </span>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              {result.scenario7Days}
            </p>
          </div>

          {/* 6 Months */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1.5 shadow-2xs">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 6 Months From Now (If you do it)
            </span>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              {result.scenario6Months}
            </p>
          </div>

          {/* If you don't do it */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1.5 shadow-2xs">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> If You Decide Not To
            </span>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              {result.scenarioIfDont}
            </p>
          </div>

          <div className="p-3 bg-stone-100 dark:bg-stone-800/60 rounded-xl text-[11px] text-stone-500 text-center">
            {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};

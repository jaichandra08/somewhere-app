import React, { useEffect, useState } from 'react';
import { Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { getSharedExperience, completeSharedExperience } from '../lib/api.ts';
import { Experience } from '../types.ts';
import { ExperiencePlayer } from '../components/ExperiencePlayer.tsx';
import { playTap } from '../lib/sound.ts';

interface ShareViewProps {
  token: string;
  onNavigate: (path: string) => void;
  onSelectExperience: (experience: Experience) => void;
}

export const ShareView: React.FC<ShareViewProps> = ({ token, onNavigate, onSelectExperience }) => {
  const [experience, setExperience] = useState<Experience | null>(null);
  const [customNote, setCustomNote] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShareData();
  }, [token]);

  const loadShareData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSharedExperience(token);
      setExperience(data.experience);
      setCustomNote(data.customNote);
    } catch (err: any) {
      setError(err.message || 'That little thing wandered off.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 flex flex-col items-center gap-4 text-stone-500">
        <div className="w-8 h-8 rounded-full border-2 border-stone-900 dark:border-stone-100 border-t-transparent animate-spin" />
        <p className="text-xs">Unpacking that little thing...</p>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div
        id="share-token-error-state"
        className="w-full max-w-md mx-auto py-16 p-6 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 text-center flex flex-col items-center gap-4"
      >
        <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
          That little thing wandered off.
        </h2>
        <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
          {error || 'This link may have expired or was typed incorrectly. Links stay active for 14 days.'}
        </p>
        <button
          id="share-error-go-home-btn"
          type="button"
          onClick={() => {
            playTap();
            onNavigate('/');
          }}
          className="mt-2 py-3 px-6 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
        >
          Find a New One
        </button>
      </div>
    );
  }

  return (
    <div id="share-experience-recipient-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
      {/* Recipient Framing Header */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Someone sent you a tiny thing.</span>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-300">
          You’ve got about a minute. No registration, no app install, no strings attached.
        </p>
        {customNote && (
          <div className="mt-2 p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-700 text-xs italic text-stone-800 dark:text-stone-200">
            "{customNote}"
          </div>
        )}
      </div>

      {/* Embedded Experience Player */}
      <ExperiencePlayer
        experience={experience}
        onDoAnother={() => {
          onNavigate('/explore');
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Bookmark, CheckCircle2, Download, Trash2, Play, Sparkles } from 'lucide-react';
import { getSavedExperiences, toggleSaveExperience, clearProfileData } from '../lib/api.ts';
import { getCompletedIds, getSavedIds } from '../lib/storage.ts';
import { Experience } from '../types.ts';
import { playTap, playPop } from '../lib/sound.ts';

interface ProfileViewProps {
  onSelectExperience: (experience: Experience) => void;
  onNavigate: (path: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onSelectExperience, onNavigate }) => {
  const [savedList, setSavedList] = useState<Experience[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setCompletedCount(getCompletedIds().length);
    try {
      const list = await getSavedExperiences();
      setSavedList(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playPop();
    try {
      await toggleSaveExperience(id);
      setSavedList((prev) => prev.filter((exp) => exp.id !== id));
    } catch {
      // fallback
    }
  };

  const handleExportData = () => {
    playTap();
    const data = {
      completedCount,
      completedIds: getCompletedIds(),
      savedIds: getSavedIds(),
      savedExperiences: savedList,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `somewhere-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = async () => {
    playTap();
    setSavedList([]);
    setCompletedCount(0);
    setConfirmClear(false);
    await clearProfileData();
  };

  return (
    <div id="profile-view" className="w-full max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
          Your Somewhere
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-stone-900 dark:text-stone-50">
          A collection of tiny things you’ve done.
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Quietly remembered on this device. No surveillance, no public profile.
        </p>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-stone-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Completed</span>
          </div>
          <span className="text-3xl font-bold font-serif text-stone-900 dark:text-stone-100">
            {completedCount}
          </span>
          <span className="text-[11px] text-stone-400">Tiny moments finished</span>
        </div>

        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-stone-400 text-xs font-medium">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Saved</span>
          </div>
          <span className="text-3xl font-bold font-serif text-stone-900 dark:text-stone-100">
            {savedList.length}
          </span>
          <span className="text-[11px] text-stone-400">Bookmarked for later</span>
        </div>
      </div>

      {/* Saved List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Saved Experiences
          </h2>
          <span className="text-xs text-stone-400 font-mono">{savedList.length} items</span>
        </div>

        {savedList.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {savedList.map((exp) => (
              <div
                key={exp.id}
                onClick={() => {
                  playTap();
                  onSelectExperience(exp);
                  onNavigate(`/experience/${exp.id}`);
                }}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3 hover:border-stone-400 dark:hover:border-stone-600 transition-colors cursor-pointer group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {exp.category} · {exp.durationSeconds}s
                  </span>
                  <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-stone-700">
                    {exp.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleUnsave(exp.id, e)}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Remove from saved"
                  >
                    <Bookmark className="w-4 h-4 fill-current text-amber-500" />
                  </button>
                  <div className="p-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs flex items-center gap-1 font-semibold">
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 text-center flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 text-stone-300" />
            <p className="text-xs text-stone-500">
              You haven't saved any experiences yet. Tap the bookmark icon after finishing any prompt.
            </p>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
            Privacy & Data Ownership
          </span>
          <p className="text-xs text-stone-500">
            Export a copy of your activity or clear all local device history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-profile-data-btn"
            type="button"
            onClick={handleExportData}
            className="py-2 px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5 hover:bg-stone-100"
          >
            <Download className="w-3.5 h-3.5" />
            Export Data
          </button>

          {!confirmClear ? (
            <button
              id="clear-profile-data-btn"
              type="button"
              onClick={() => setConfirmClear(true)}
              className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Clear
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                id="confirm-clear-btn"
                type="button"
                onClick={handleClearHistory}
                className="py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="py-2 px-2 text-xs text-stone-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

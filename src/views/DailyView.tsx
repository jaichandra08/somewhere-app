import React, { useEffect, useState } from 'react';
import { Sparkles, Send, Check, Flag, Heart, Plus } from 'lucide-react';
import { getDailyMoment, submitDailyResponse, reactToDailySubmission } from '../lib/api.ts';
import { DailyMoment, DailySubmission } from '../types.ts';
import { playTap, playSuccess, playPop } from '../lib/sound.ts';
import { ReportModal } from '../components/ReportModal.tsx';

export const DailyView: React.FC = () => {
  const [moment, setMoment] = useState<DailyMoment | null>(null);
  const [submissions, setSubmissions] = useState<DailySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reactedMap, setReactedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
    try {
      const stored = localStorage.getItem('somewhere_daily_reacted');
      if (stored) {
        setReactedMap(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const loadData = async () => {
    try {
      const data = await getDailyMoment();
      setMoment(data.moment);
      setSubmissions(data.submissions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    playTap();
    try {
      await submitDailyResponse(content.trim());
      playSuccess();
      setSubmitted(true);
      setContent('');
      loadData();
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (id: string) => {
    if (reactedMap[id]) return;
    playPop();

    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, reactions: (s.reactions || 0) + 1 } : s))
    );
    const updatedMap = { ...reactedMap, [id]: true };
    setReactedMap(updatedMap);
    try {
      localStorage.setItem('somewhere_daily_reacted', JSON.stringify(updatedMap));
    } catch {
      // ignore
    }

    try {
      await reactToDailySubmission(id);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 text-center text-xs text-stone-500">
        Finding today’s little thing...
      </div>
    );
  }

  return (
    <div id="daily-moment-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Today’s Little Thing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          {moment?.prompt}
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-sm whitespace-pre-line">
          {moment?.subPrompt}
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-3 shadow-xs">
          <textarea
            id="daily-submission-input"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 280))}
            placeholder="Write your brief observation or note..."
            rows={3}
            required
            className="w-full text-sm p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
          />
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Anonymous. Shown to others today.</span>
            <span>{content.length}/280</span>
          </div>

          <button
            id="submit-daily-response-btn"
            type="submit"
            disabled={!content.trim() || submitting}
            className="py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-98 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Sharing...' : 'Share Anonymously'}
          </button>
        </form>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">Your response has been quietly added to today's collection.</span>
          </div>
          <button
            id="share-another-daily-btn"
            type="button"
            onClick={() => setSubmitted(false)}
            className="self-start text-xs font-semibold underline hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Share another note
          </button>
        </div>
      )}

      {/* Today's Submissions */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Shared Today
          </h3>
          <span className="text-xs text-stone-400">
            {submissions.length} {submissions.length === 1 ? 'thought' : 'thoughts'}
          </span>
        </div>

        {submissions.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {submissions.map((sub) => {
              const isReacted = !!reactedMap[sub.id];
              const reactionCount = sub.reactions || 0;
              return (
                <div
                  key={sub.id}
                  id={`daily-submission-${sub.id}`}
                  className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between gap-3 shadow-2xs transition-all hover:border-stone-300 dark:hover:border-stone-700"
                >
                  <p className="text-sm text-stone-800 dark:text-stone-200 italic leading-relaxed">
                    "{sub.content}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                      <span>Anonymous</span>
                      <button
                        id={`react-submission-btn-${sub.id}`}
                        type="button"
                        onClick={() => handleReact(sub.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                          isReacted
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-semibold'
                            : 'text-stone-500 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                        title={isReacted ? 'You sent warmth' : 'Send warmth'}
                        aria-label="Send warmth"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isReacted ? 'fill-current' : ''}`} />
                        <span>{reactionCount > 0 ? reactionCount : 'Felt this'}</span>
                      </button>
                    </div>
                    <button
                      id={`report-submission-btn-${sub.id}`}
                      type="button"
                      onClick={() => setReportTargetId(sub.id)}
                      className="hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Flag className="w-3 h-3" />
                      Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            id="daily-empty-state"
            className="p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500"
          >
            No notes shared yet today. Be the first.
          </div>
        )}
      </div>

      {reportTargetId && (
        <ReportModal
          targetType="submission"
          targetId={reportTargetId}
          onClose={() => setReportTargetId(null)}
        />
      )}
    </div>
  );
};


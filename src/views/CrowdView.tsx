import React, { useState, useEffect } from 'react';
import { Users, Clock, Send, Shield, Sparkles, Flag, Check } from 'lucide-react';
import { getCrowdCurrent, joinCrowdSession, submitCrowdResponse, getCrowdSubmissions } from '../lib/api.ts';
import { QuietCrowdSession, CrowdSubmission } from '../types.ts';
import { playTap, playSuccess } from '../lib/sound.ts';
import { DrawingCanvas } from '../components/DrawingCanvas.tsx';
import { ReportModal } from '../components/ReportModal.tsx';

export const CrowdView: React.FC = () => {
  const [session, setSession] = useState<QuietCrowdSession | null>(null);
  const [truthfulCopy, setTruthfulCopy] = useState<string>('Quiet right now.');
  const [submissions, setSubmissions] = useState<CrowdSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const [joined, setJoined] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'text' | 'drawing'>('text');
  const [textContent, setTextContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadCrowdData();
    const interval = setInterval(loadCrowdData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const loadCrowdData = async () => {
    try {
      const current = await getCrowdCurrent();
      setSession(current.session);
      setTruthfulCopy(current.truthfulCopy);

      const subs = await getCrowdSubmissions();
      setSubmissions(subs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    playTap();
    setJoined(true);
    try {
      await joinCrowdSession();
      loadCrowdData();
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (contentToSubmit?: string) => {
    const finalContent = contentToSubmit || textContent.trim();
    if (!finalContent) return;

    setSubmitting(true);
    playTap();
    try {
      await submitCrowdResponse(submissionMode, finalContent);
      playSuccess();
      setSubmitted(true);
      setTextContent('');
      loadCrowdData();
    } catch {
      // error handled
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="crowd-view" className="w-full max-w-2xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {truthfulCopy}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-stone-900 dark:text-stone-50">
          The Quiet Crowd
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">
          Do something alongside other people right now. No usernames, no follow buttons, no awkward introductions. Just quiet shared presence.
        </p>
      </div>

      {/* Active Session Card */}
      {session && (
        <div
          id="crowd-active-session-card"
          className="p-6 sm:p-7 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col gap-5"
        >
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Active Session
            </span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>
                {session.participantCount === 0
                  ? 'Quiet right now'
                  : `${session.participantCount} here right now`}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-50">
              {session.title}
            </h2>
            <p className="text-sm sm:text-base text-stone-700 dark:text-stone-300 mt-1">
              {session.prompt}
            </p>
          </div>

          {!joined && !submitted ? (
            <button
              id="join-crowd-btn"
              type="button"
              onClick={handleJoin}
              className="py-3.5 px-6 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Join This Session
            </button>
          ) : !submitted ? (
            /* Submission Drawer */
            <div className="flex flex-col gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Add your response to the pool:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setSubmissionMode('text');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      submissionMode === 'text'
                        ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Words
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setSubmissionMode('drawing');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      submissionMode === 'drawing'
                        ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Sketch
                  </button>
                </div>
              </div>

              {submissionMode === 'text' ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    id="crowd-text-submission-input"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value.slice(0, 280))}
                    placeholder="Describe what you see or notice..."
                    rows={3}
                    className="w-full text-sm p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
                  />
                  <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-500" />
                      Completely anonymous.
                    </span>
                    <span>{textContent.length}/280</span>
                  </div>
                  <button
                    id="submit-crowd-text-btn"
                    type="button"
                    disabled={textContent.trim().length === 0 || submitting}
                    onClick={() => handleSubmit()}
                    className="w-full py-3 px-5 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Sending...' : 'Add to Pool'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <DrawingCanvas onComplete={(dataUrl) => handleSubmit(dataUrl)} disabled={submitting} />
                </div>
              )}
            </div>
          ) : (
            /* Done State */
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 text-xs">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>You added to the pool. Your presence is recorded quietly with the crowd.</span>
            </div>
          )}
        </div>
      )}

      {/* Community Gallery */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Pool of Responses
          </h3>
          <span className="text-xs text-stone-400 font-mono">{submissions.length} shared</span>
        </div>

        {submissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                id={`crowd-submission-${sub.id}`}
                className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between gap-3 shadow-2xs"
              >
                {sub.type === 'drawing' ? (
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-white border border-stone-100 flex items-center justify-center">
                    <img
                      src={sub.content}
                      alt="Crowd drawing"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-stone-800 dark:text-stone-200 italic leading-relaxed">
                    "{sub.content}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span>Anonymous</span>
                  <button
                    type="button"
                    onClick={() => setReportTargetId(sub.id)}
                    className="hover:text-stone-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3 h-3" />
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
            No responses yet in this session. Be the first to drop something in.
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

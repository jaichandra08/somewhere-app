import React, { useState, useEffect } from 'react';
import { Scale, Copy, Check, Share2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { createSettleCase, getSettleCase, submitSettleSideB, getPublicShareBaseUrl } from '../lib/api.ts';
import { SettleCase } from '../types.ts';
import { playTap, playSuccess, playPop } from '../lib/sound.ts';

interface SettleViewProps {
  caseId?: string;
  onNavigate: (path: string) => void;
}

export const SettleView: React.FC<SettleViewProps> = ({ caseId, onNavigate }) => {
  const [currentCase, setCurrentCase] = useState<SettleCase | null>(null);
  const [loading, setLoading] = useState(!!caseId);

  // Form state for creating
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [sideAName, setSideAName] = useState('');
  const [sideA, setSideA] = useState('');
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // Form state for Person B
  const [sideBName, setSideBName] = useState('');
  const [sideB, setSideB] = useState('');
  const [submittingB, setSubmittingB] = useState(false);
  const [sideBError, setSideBError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (caseId) {
      setLoading(true);
      getSettleCase(caseId)
        .then((c) => setCurrentCase(c))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [caseId]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !sideA) return;
    playTap();
    try {
      const res = await createSettleCase(title, context, sideA, sideAName || 'Person A');
      setCreatedCaseId(res.caseId);
      playSuccess();
    } catch {
      // error
    }
  };

  const handleSubmitSideB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !sideB.trim() || submittingB) return;
    setSubmittingB(true);
    setSideBError(null);
    playTap();
    try {
      const settled = await submitSettleSideB(caseId, sideB, sideBName || 'Person B');
      setCurrentCase(settled);
      playSuccess();
    } catch (err: any) {
      if (err?.message?.includes('already') || err?.code === 'ALREADY_SETTLED') {
        setSideBError('This dispute has already been settled.');
        getSettleCase(caseId).then(setCurrentCase).catch(() => {});
      } else {
        setSideBError('Could not submit verdict right now. Please try again.');
      }
    } finally {
      setSubmittingB(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    playPop();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 text-center text-stone-500 text-xs">
        Convening Internet Court...
      </div>
    );
  }

  // 1. Case already settled or viewing
  if (currentCase) {
    const isWaitingB = currentCase.status === 'waiting_for_side_b';

    return (
      <div id="settle-case-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-stone-400">
              Internet Court
            </span>
            <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50 leading-tight">
              {currentCase.title}
            </h1>
          </div>
        </div>

        {currentCase.context && (
          <p className="text-xs text-stone-500 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
            "{currentCase.context}"
          </p>
        )}

        {/* Side A Card */}
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-2">
          <span className="text-xs font-bold text-stone-400">
            {currentCase.sideAName || 'Person A'}'s Argument:
          </span>
          <p className="text-sm text-stone-800 dark:text-stone-200">
            "{currentCase.sideA}"
          </p>
        </div>

        {/* If waiting for side B, render Side B submission form */}
        {isWaitingB ? (
          <form onSubmit={handleSubmitSideB} className="p-5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Now Enter Your Side:
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Your name or nickname (optional):
              </label>
              <input
                type="text"
                value={sideBName}
                onChange={(e) => setSideBName(e.target.value)}
                placeholder="Person B"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Your side of the story:
              </label>
              <textarea
                value={sideB}
                onChange={(e) => setSideB(e.target.value.slice(0, 500))}
                placeholder="Explain what actually happened..."
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            {sideBError && (
              <div className="text-xs text-rose-600 dark:text-rose-400">
                {sideBError}
              </div>
            )}

            <button
              id="submit-settle-side-b-btn"
              type="submit"
              disabled={!sideB.trim() || submittingB}
              className="py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {submittingB ? 'Consulting Court...' : 'Submit for Verdict'}
            </button>
          </form>
        ) : (
          /* Side B Card */
          currentCase.sideB && (
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-2">
              <span className="text-xs font-bold text-stone-400">
                {currentCase.sideBName || 'Person B'}'s Argument:
              </span>
              <p className="text-sm text-stone-800 dark:text-stone-200">
                "{currentCase.sideB}"
              </p>
            </div>
          )
        )}

        {/* VERDICT CARD */}
        {currentCase.verdict && (
          <div
            id="settle-verdict-card"
            className="p-6 rounded-3xl border-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900 shadow-md flex flex-col gap-4 text-center animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-center">
              <span className="text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900">
                {currentCase.verdict.outcome}
              </span>
            </div>

            <p className="text-sm sm:text-base font-medium text-stone-800 dark:text-stone-200 leading-relaxed">
              {currentCase.verdict.explanation}
            </p>

            {currentCase.verdict.playfulPenalty && (
              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs text-stone-600 dark:text-stone-400">
                <span className="font-bold text-stone-900 dark:text-stone-100">Playful Penalty: </span>
                {currentCase.verdict.playfulPenalty}
              </div>
            )}

            <p className="text-[10px] text-stone-400">
              For entertainment only — this is not legal advice or a binding arbitration.
            </p>

            <button
              type="button"
              onClick={() => {
                playTap();
                onNavigate('/settle');
              }}
              className="mt-2 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              Settle Another Dispute
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Case created link display
  if (createdCaseId) {
    const inviteUrl = `${getPublicShareBaseUrl()}/settle/${createdCaseId}`;
    return (
      <div className="w-full max-w-md mx-auto p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50">
          Dispute Docket Created
        </h2>
        <p className="text-xs text-stone-500">
          Send this link to the other person. Once they submit their side, the court will deliver its verdict.
        </p>

        <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-mono break-all text-stone-700 dark:text-stone-300">
          {inviteUrl}
        </div>

        <button
          id="copy-settle-invite-btn"
          type="button"
          onClick={() => handleCopyLink(inviteUrl)}
          className="py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied to Clipboard' : 'Copy Invite Link'}
        </button>

        <button
          type="button"
          onClick={() => onNavigate(`/settle/${createdCaseId}`)}
          className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 underline"
        >
          Go to Case Page
        </button>
      </div>
    );
  }

  // 3. Create Case Form
  return (
    <div id="settle-create-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          <span>Internet Court</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          Settle This
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
          Submit harmless everyday disputes between friends or partners. Get a humorous, non-legal verdict.
        </p>
      </div>

      <form onSubmit={handleCreateCase} className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-4 shadow-xs">
        <div>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
            Dispute Title:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="e.g., The Correct Way to Load Spoons in the Dishwasher"
            required
            className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
            Context / Backstory (optional):
          </label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, 150))}
            placeholder="e.g., We have argued about this every Tuesday for three years."
            className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Your Name:
            </label>
            <input
              type="text"
              value={sideAName}
              onChange={(e) => setSideAName(e.target.value)}
              placeholder="e.g. Sam"
              className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
            Your Argument:
          </label>
          <textarea
            value={sideA}
            onChange={(e) => setSideA(e.target.value.slice(0, 400))}
            placeholder="Present your case with dramatic conviction..."
            rows={3}
            required
            className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <button
          id="create-settle-case-btn"
          type="submit"
          className="w-full py-3.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          Open Case & Get Share Link
        </button>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { submitReport } from '../lib/api.ts';
import { playTap } from '../lib/sound.ts';

interface ReportModalProps {
  targetType: 'experience' | 'submission' | 'user' | 'technical';
  targetId?: string;
  onClose: () => void;
}

const REASONS = [
  'Harmful or abusive content',
  'Dangerous activity or suggestion',
  'Inappropriate or offensive drawing/text',
  'Technical bug or broken button',
  'Other safety concern'
];

export const ReportModal: React.FC<ReportModalProps> = ({ targetType, targetId, onClose }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    playTap();
    try {
      await submitReport(targetType, targetId || 'general', reason, details.trim());
      setSubmitted(true);
    } catch {
      setError('Could not send report right now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="report-modal-card"
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl p-6 relative flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-report-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-base">Report a Problem or Concern</h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              SOMEWHERE™ is designed to be calm, safe, and gentle. If something feels unsafe or broken, let us know.
            </p>

            <div>
              <label htmlFor="report-reason-select" className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Reason:
              </label>
              <select
                id="report-reason-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-details-textarea" className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Details (optional):
              </label>
              <textarea
                id="report-details-textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                placeholder="What happened or what needs attention?"
                rows={3}
                className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
              />
            </div>

            {error && (
              <div
                id="report-error-msg"
                className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50"
              >
                {error}
              </div>
            )}

            <button
              id="submit-report-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-stone-900 dark:text-stone-100">Thanks. We've received it.</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
              Our moderation team reviews every safety ticket. We appreciate you keeping SOMEWHERE™ warm and safe.
            </p>
            <button
              id="report-done-btn"
              type="button"
              onClick={onClose}
              className="mt-2 py-2 px-6 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { Experience } from '../types.ts';
import { createShare, getPublicShareBaseUrl } from '../lib/api.ts';
import { playPop, playSuccess, playTap } from '../lib/sound.ts';

interface ShareModalProps {
  experience: Experience;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ experience, onClose }) => {
  const [customNote, setCustomNote] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    playTap();
    try {
      const res = await createShare(experience.id, customNote.trim() || undefined);
      const baseUrl = getPublicShareBaseUrl();
      const fullUrl = `${baseUrl}${res.shareUrl}`;
      setShareUrl(fullUrl);
      playSuccess();
    } catch {
      setError('Could not create link right now. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      playPop();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Failed to copy. Please select the text manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    playTap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOMEWHERE™ — A Little Company',
          text: customNote ? `"${customNote}" — Someone sent you a tiny thing:` : 'Someone sent you a tiny thing:',
          url: shareUrl
        });
      } catch {
        // User canceled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      id="share-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="share-modal-card"
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden p-6 relative flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-share-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">Send a Little Company</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Takes about a minute. Leaves no obligation.</p>
          </div>
        </div>

        {/* Experience Snapshot */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-100 dark:border-stone-800 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {experience.category}
          </span>
          <p className="font-medium text-stone-800 dark:text-stone-200 mt-0.5">{experience.title}</p>
        </div>

        {!shareUrl ? (
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="share-note-input" className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Add an optional note (up to 140 characters):
              </label>
              <textarea
                id="share-note-input"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value.slice(0, 140))}
                placeholder="e.g. Saw this and thought of our tea break."
                rows={2}
                className="w-full text-sm p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
              />
              <div className="text-right text-[11px] text-stone-400 mt-0.5">
                {customNote.length}/140
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            )}

            <button
              id="generate-share-link-btn"
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="w-full py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {loading ? 'Creating link...' : 'Create Private Share Link'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs break-all select-all font-mono text-stone-700 dark:text-stone-300">
              {shareUrl}
            </div>

            <div className="flex gap-2">
              <button
                id="copy-share-link-btn"
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Link'}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="native-share-trigger-btn"
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-50"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
            </div>

            <p className="text-[11px] text-stone-400 text-center mt-1">
              Active for 14 days. Recipient needs no account to do it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

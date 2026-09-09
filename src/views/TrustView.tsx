import React from 'react';
import { Shield, ArrowLeft, Heart, Lock, AlertTriangle } from 'lucide-react';
import { playTap } from '../lib/sound.ts';

interface TrustViewProps {
  type: 'safety' | 'terms' | 'privacy' | 'community-rules';
  onNavigate: (path: string) => void;
}

export const TrustView: React.FC<TrustViewProps> = ({ type, onNavigate }) => {
  const titles = {
    safety: 'Safety Policy & Non-Coercion',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy & Zero Surveillance',
    'community-rules': 'Community Rules & Quiet Etiquette'
  };

  return (
    <div id={`trust-view-${type}`} className="w-full max-w-2xl mx-auto flex flex-col gap-6 pb-16">
      <button
        id="trust-back-btn"
        type="button"
        onClick={() => {
          playTap();
          onNavigate('/settings');
        }}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
          SOMEWHERE™ Trust & Safety
        </span>
        <h1 className="text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          {titles[type]}
        </h1>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-6 text-sm text-stone-700 dark:text-stone-300 leading-relaxed shadow-xs">
        {type === 'safety' && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                1. The Gentle Non-Coercion Principle
              </h2>
              <p>
                SOMEWHERE™ is built to be a low-pressure refuge. No prompt or mission will ever ask you to put yourself in physical danger, trespass, harass a stranger, make irreversible financial commitments, or violate your personal comfort boundaries.
              </p>
              <p>
                Every experience is an invitation, never an obligation. You can stop, abandon, or skip any activity at any second without penalty.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                2. Mental Well-Being & Crisis Resources
              </h2>
              <p>
                While SOMEWHERE™ provides gentle micro-resets and warm company, it is not a healthcare service or crisis line. If you are in distress, overwhelmed, or in need of human support, please reach out to trusted community care:
              </p>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs flex flex-col gap-1.5">
                <span className="font-bold text-stone-900 dark:text-stone-100">National Suicide & Crisis Lifeline:</span>
                <span>Call or text <strong>988</strong> (USA/Canada)</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 mt-1">Crisis Text Line:</span>
                <span>Text <strong>HOME</strong> to <strong>741741</strong></span>
                <span className="font-bold text-stone-900 dark:text-stone-100 mt-1">International Resources:</span>
                <span>Visit <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="underline font-semibold">findahelpline.com</a> for free local support anywhere in the world.</span>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                3. Safety Reporting
              </h2>
              <p>
                If an experience, drawing, or prompt feels unsafe, harmful, or broken, tap the <strong>Report</strong> button located at the bottom of the experience or in Settings. Our moderation queue audits all flags promptly.
              </p>
            </section>
          </>
        )}

        {type === 'community-rules' && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                1. Quiet Presence, Not Performance
              </h2>
              <p>
                In The Quiet Crowd and Today's Little Thing, you share space without self-promotion. Do not include handles, URLs, contact numbers, or solicitation in your drawings or text notes.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                2. Absolute Zero Tolerance for Abuse
              </h2>
              <p>
                Any submission containing hate speech, graphic violence, sexual explicitness, doxxing, harassment, or self-harm encouragement will be immediately stripped and blocked.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                3. Truthful Participation
              </h2>
              <p>
                We do not simulate users or invent fake activity. When you see a count, that is actual human presence on this service. Please honor this by sharing genuine, human drawings and reflections.
              </p>
            </section>
          </>
        )}

        {type === 'privacy' && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                1. No Account Required
              </h2>
              <p>
                You can experience SOMEWHERE™ immediately without an email, password, phone number, or social login.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                2. Client-First Storage
              </h2>
              <p>
                Your saved items, completed counters, and sensory preferences (sound, theme, motion) are kept in your browser's private local storage. You can export or erase this anytime in your Profile.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                3. Anonymous Crowd Submissions
              </h2>
              <p>
                Drawings and notes submitted to The Quiet Crowd or Today's Little Thing are stored anonymously without tracking identifiers or IP addresses linked to your identity.
              </p>
            </section>
          </>
        )}

        {type === 'terms' && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                1. Entertainment & Reflection
              </h2>
              <p>
                SOMEWHERE™ is provided as a digital experience for reflection, amusement, and gentle micro-adventures. Features such as "Internet Court — Settle This" and "Future You" are purely for entertainment and do not constitute legal, financial, relationship, or psychological advice.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">
                2. Availability & Service
              </h2>
              <p>
                The application is provided "as-is". While we strive for absolute reliability and offline graceful degradation, temporary network disruptions may occur.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

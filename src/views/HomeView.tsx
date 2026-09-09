import React, { useEffect, useState } from 'react';
import {
  Smile,
  Zap,
  Users,
  Compass,
  HelpCircle,
  HeartHandshake,
  ArrowRight,
  Flame,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { getRandomExperience, getDailyMoment, getCrowdCurrent } from '../lib/api.ts';
import { Experience, DailyMoment } from '../types.ts';
import { playTap } from '../lib/sound.ts';

interface HomeViewProps {
  onSelectExperience: (experience: Experience) => void;
  onNavigate: (path: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectExperience, onNavigate }) => {
  const [dailyMoment, setDailyMoment] = useState<DailyMoment | null>(null);
  const [crowdCopy, setCrowdCopy] = useState<string>('Quiet right now.');
  const [loadingIntention, setLoadingIntention] = useState<string | null>(null);

  useEffect(() => {
    getDailyMoment()
      .then((res) => setDailyMoment(res.moment))
      .catch(() => {});

    getCrowdCurrent()
      .then((res) => setCrowdCopy(res.truthfulCopy))
      .catch(() => {});
  }, []);

  const handleIntentionClick = async (intention: 'LAUGH' | 'DO' | 'PEOPLE' | 'HEAD' | 'SURPRISE' | 'COMPANY') => {
    setLoadingIntention(intention);
    playTap();
    try {
      const exp = await getRandomExperience({ intention });
      onSelectExperience(exp);
      onNavigate(`/experience/${exp.id}`);
    } catch {
      // fallback
    } finally {
      setLoadingIntention(null);
    }
  };

  const INTENTION_CARDS = [
    {
      id: 'LAUGH',
      title: 'Make Me Laugh',
      subtitle: 'Mildly absurd, dry, or foolish.',
      icon: Smile,
      badge: 'Funny'
    },
    {
      id: 'DO',
      title: 'Give Me Something to Do',
      subtitle: 'Tiny missions. Tactile desk rescues.',
      icon: Zap,
      badge: 'Active'
    },
    {
      id: 'PEOPLE',
      title: 'Let Me Feel Around People',
      subtitle: 'Quiet shared presence with strangers.',
      icon: Users,
      badge: 'Crowd'
    },
    {
      id: 'HEAD',
      title: 'Get Me Out of My Head',
      subtitle: 'Sensory grounding. Jaw resets. Calm.',
      icon: Compass,
      badge: 'Grounding'
    },
    {
      id: 'SURPRISE',
      title: 'Surprise Me',
      subtitle: 'Total mystery. Zero expectations.',
      icon: HelpCircle,
      badge: 'Mystery'
    },
    {
      id: 'COMPANY',
      title: 'I Want Company',
      subtitle: 'Gentle warmth without the pressure of a chat.',
      icon: HeartHandshake,
      badge: 'Warmth'
    }
  ];

  return (
    <div id="home-view" className="w-full max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      {/* Presence Status Banner */}
      <section id="home-presence-status" className="flex items-start gap-3 p-4 rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800/80">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
        <div className="flex flex-col text-xs leading-relaxed">
          <span className="font-semibold text-stone-800 dark:text-stone-200">
            {crowdCopy.toLowerCase().includes('quiet') ? 'Quiet right now. That’s okay.' : crowdCopy}
          </span>
          <span className="text-stone-500 dark:text-stone-400">
            {crowdCopy.toLowerCase().includes('quiet') ? 'You can still start something.' : 'You can do something alongside them.'}
          </span>
        </div>
      </section>

      {/* Hero Welcome */}
      <section id="home-welcome-section" className="flex flex-col gap-3 pt-1 sm:pt-2">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-stone-900 dark:text-stone-50 leading-tight">
          Hey. You’re here.
        </h1>

        <div className="text-stone-600 dark:text-stone-300 text-base sm:text-lg leading-relaxed flex flex-col gap-0.5">
          <p>A place to go when you have nobody to go with.</p>
          <p>One tiny thing can change a boring minute.</p>
        </div>
      </section>

      {/* 6 Core Intention Cards */}
      <section id="intentions-section" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            What do you need right now?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTENTION_CARDS.map((card) => {
            const Icon = card.icon;
            const isLoading = loadingIntention === card.id;
            return (
              <button
                key={card.id}
                id={`intention-card-${card.id.toLowerCase()}`}
                type="button"
                disabled={!!loadingIntention}
                onClick={() => handleIntentionClick(card.id as any)}
                className="group relative p-5 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 group-hover:bg-stone-900 group-hover:text-stone-50 dark:group-hover:bg-stone-100 dark:group-hover:text-stone-900 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      {card.badge}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="mt-3">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs rounded-2xl flex items-center justify-center text-xs font-medium text-stone-800 dark:text-stone-200">
                    Finding something...
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's Little Thing Section */}
      <section
        id="home-daily-moment-card"
        className="p-6 rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
      >
        <div className="flex flex-col gap-1.5 max-w-md">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Today’s Little Thing</span>
          </div>
          <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 leading-snug">
            {dailyMoment?.prompt || 'What tiny victory went completely uncelebrated today?'}
          </h3>
          <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-col gap-0.5 mt-1">
            <p>Got out of bed on time.</p>
            <p>Did one load of dishes.</p>
          </div>
        </div>

        <button
          id="home-open-daily-btn"
          type="button"
          onClick={() => {
            playTap();
            onNavigate('/daily');
          }}
          className="shrink-0 py-3 px-5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 cursor-pointer active:scale-95 transition-transform"
        >
          Answer Today
        </button>
      </section>

      {/* Don't Press Teaser Banner */}
      <section
        id="dont-press-teaser"
        className="p-5 rounded-3xl border-2 border-dashed border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/10 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              A Mysterious Red Button
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Strictly prohibited by nobody in particular.
            </p>
          </div>
        </div>

        <button
          id="home-dont-press-nav-btn"
          type="button"
          onClick={() => {
            playTap();
            onNavigate('/dont-press');
          }}
          className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-transform cursor-pointer shrink-0"
        >
          Don’t Press
        </button>
      </section>
    </div>
  );
};

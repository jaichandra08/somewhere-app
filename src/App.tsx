import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';
import { HomeView } from './views/HomeView.tsx';
import { ExploreView } from './views/ExploreView.tsx';
import { CrowdView } from './views/CrowdView.tsx';
import { ShareView } from './views/ShareView.tsx';
import { SettleView } from './views/SettleView.tsx';
import { FutureYouView } from './views/FutureYouView.tsx';
import { DailyView } from './views/DailyView.tsx';
import { DontPressView } from './views/DontPressView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { TrustView } from './views/TrustView.tsx';
import { AdminView } from './views/AdminView.tsx';
import { NotFoundView } from './views/NotFoundView.tsx';
import { ExperiencePlayer } from './components/ExperiencePlayer.tsx';
import { Experience } from './types.ts';
import { getExperience, getRandomExperience } from './lib/api.ts';
import { getUserPreferences } from './lib/sound.ts';
import { getOfflineSeedExperiences } from './lib/storage.ts';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Initialize theme & sensory preferences on mount
  useEffect(() => {
    const prefs = getUserPreferences();
    if (prefs.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (prefs.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (prefs.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      const isReduced =
        document.documentElement.classList.contains('reduce-motion') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
    }
  };

  // Route matching: experience/:id
  useEffect(() => {
    const expMatch = currentPath.match(/^\/experience\/([^/?#]+)/);
    if (expMatch) {
      const expId = expMatch[1];
      if (!selectedExperience || selectedExperience.id !== expId) {
        setLoadingExp(true);
        setExpError(null);
        getExperience(expId)
          .then((exp) => {
            setSelectedExperience(exp);
          })
          .catch(() => {
            // fallback
            const offline = getOfflineSeedExperiences().find((e) => e.id === expId);
            if (offline) {
              setSelectedExperience(offline);
            } else {
              setExpError('Could not find that experience.');
            }
          })
          .finally(() => setLoadingExp(false));
      }
    }
  }, [currentPath]);

  const handleNextRandomExperience = async () => {
    try {
      const exp = await getRandomExperience();
      setSelectedExperience(exp);
      navigate(`/experience/${exp.id}`);
    } catch {
      const list = getOfflineSeedExperiences();
      const exp = list[Math.floor(Math.random() * list.length)];
      setSelectedExperience(exp);
      navigate(`/experience/${exp.id}`);
    }
  };

  const handleDoOffline = () => {
    const list = getOfflineSeedExperiences();
    const exp = list[Math.floor(Math.random() * list.length)];
    setSelectedExperience(exp);
    navigate(`/experience/${exp.id}`);
  };

  // Render view router
  const renderContent = () => {
    // 1. /experience/:id
    const expMatch = currentPath.match(/^\/experience\/([^/?#]+)/);
    if (expMatch) {
      if (loadingExp) {
        return (
          <div className="w-full max-w-lg mx-auto py-20 flex flex-col items-center gap-3 text-stone-500 text-xs">
            <div className="w-6 h-6 border-2 border-stone-800 dark:border-stone-200 border-t-transparent rounded-full animate-spin" />
            <span>Finding your experience...</span>
          </div>
        );
      }
      if (expError || !selectedExperience) {
        return (
          <div className="w-full max-w-md mx-auto py-16 text-center flex flex-col items-center gap-3">
            <h2 className="text-lg font-bold font-serif">That one wandered off.</h2>
            <p className="text-xs text-stone-500">We couldn't retrieve this exact experience.</p>
            <button
              onClick={handleNextRandomExperience}
              className="py-2.5 px-5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
            >
              Do a Fresh One
            </button>
          </div>
        );
      }
      return (
        <ExperiencePlayer
          experience={selectedExperience}
          onDoAnother={handleNextRandomExperience}
          onNavigate={navigate}
        />
      );
    }

    // 2. /share/:token
    const shareMatch = currentPath.match(/^\/share\/([^/?#]+)/);
    if (shareMatch) {
      return (
        <ShareView
          token={shareMatch[1]}
          onNavigate={navigate}
          onSelectExperience={(exp) => setSelectedExperience(exp)}
        />
      );
    }

    // 3. /settle and /settle/:caseId
    const settleMatch = currentPath.match(/^\/settle(?:\/([^/?#]+))?/);
    if (settleMatch) {
      return <SettleView caseId={settleMatch[1]} onNavigate={navigate} />;
    }

    // 4. Other core paths
    switch (currentPath) {
      case '/':
        return (
          <HomeView
            onSelectExperience={(exp) => setSelectedExperience(exp)}
            onNavigate={navigate}
          />
        );
      case '/explore':
        return (
          <ExploreView
            onSelectExperience={(exp) => setSelectedExperience(exp)}
            onNavigate={navigate}
          />
        );
      case '/crowd':
        return <CrowdView />;
      case '/future-you':
        return <FutureYouView />;
      case '/daily':
        return <DailyView />;
      case '/dont-press':
        return <DontPressView />;
      case '/profile':
        return (
          <ProfileView
            onSelectExperience={(exp) => setSelectedExperience(exp)}
            onNavigate={navigate}
          />
        );
      case '/settings':
        return <SettingsView onNavigate={navigate} />;
      case '/safety':
        return <TrustView type="safety" onNavigate={navigate} />;
      case '/terms':
        return <TrustView type="terms" onNavigate={navigate} />;
      case '/privacy':
        return <TrustView type="privacy" onNavigate={navigate} />;
      case '/community-rules':
        return <TrustView type="community-rules" onNavigate={navigate} />;
      case '/admin':
        return <AdminView />;
      default:
        return <NotFoundView onNavigate={navigate} />;
    }
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans antialiased selection:bg-stone-200 dark:selection:bg-stone-800"
    >
      <OfflineBanner onDoOffline={handleDoOffline} />
      <Header currentPath={currentPath} onNavigate={navigate} />

      <main
        id="app-main-content"
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8 mb-16 md:mb-6"
      >
        {renderContent()}
      </main>

      <BottomNav currentPath={currentPath} onNavigate={navigate} />
    </div>
  );
}

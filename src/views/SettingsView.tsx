import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Laptop,
  Volume2,
  VolumeX,
  Shield,
  FileText,
  AlertCircle,
  Lock,
  ExternalLink
} from 'lucide-react';
import {
  getUserPreferences,
  saveUserPreferences,
  isSoundEnabled,
  setSoundEnabled,
  playPop,
  playTap,
  playSuccess
} from '../lib/sound.ts';
import { ReportModal } from '../components/ReportModal.tsx';

interface SettingsViewProps {
  onNavigate: (path: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const [prefs, setPrefs] = useState(getUserPreferences());
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [testingChime, setTestingChime] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleThemeChange = (theme: 'system' | 'light' | 'dark') => {
    playTap();
    const updated = { ...prefs, theme };
    saveUserPreferences(updated);
    setPrefs(updated);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleMotionToggle = () => {
    playTap();
    const next = !prefs.reducedMotion;
    const updated = { ...prefs, reducedMotion: next };
    saveUserPreferences(updated);
    setPrefs(updated);
    if (next) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    const updated = { ...prefs, soundEnabled: next };
    saveUserPreferences(updated);
    setPrefs(updated);
    if (next) {
      playSuccess();
    }
  };

  const handleTestChime = () => {
    setTestingChime(true);
    playSuccess();
    setTimeout(() => setTestingChime(false), 800);
  };

  return (
    <div id="settings-view" className="w-full max-w-lg mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          Preferences & Safety
        </h1>
        <p className="text-xs text-stone-500">
          Adjust sensory settings and access safety policies.
        </p>
      </div>

      {/* Sensory Controls */}
      <div className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Appearance & Sensations
        </h2>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
              Theme
            </h3>
            <p className="text-xs text-stone-500">Light, Dark, or Match System</p>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button
              id="theme-btn-light"
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-2 rounded-lg text-xs transition-colors ${
                prefs.theme === 'light'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              id="theme-btn-dark"
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-2 rounded-lg text-xs transition-colors ${
                prefs.theme === 'dark'
                  ? 'bg-stone-700 text-stone-100 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-100'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              id="theme-btn-system"
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`p-2 rounded-lg text-xs transition-colors ${
                prefs.theme === 'system'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-bold'
                  : 'text-stone-500'
              }`}
              title="System Theme"
            >
              <Laptop className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
              Tactile Sound Effects
            </h3>
            <p className="text-xs text-stone-500">Gentle chimes on taps & completions</p>
          </div>

          <div className="flex items-center gap-2">
            {soundOn && (
              <button
                id="test-chime-btn"
                type="button"
                onClick={handleTestChime}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                  testingChime
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
                aria-label="Test gentle chime sound"
              >
                <span>{testingChime ? 'Chimed!' : 'Test Chime'}</span>
              </button>
            )}
            <button
              id="settings-sound-toggle-btn"
              type="button"
              onClick={handleSoundToggle}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                soundOn
                  ? 'border-stone-300 dark:border-stone-700 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900'
                  : 'border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
              aria-label={soundOn ? 'Disable sound effects' : 'Enable sound effects'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
              Reduced Motion
            </h3>
            <p className="text-xs text-stone-500">Minimize animations and transitions</p>
          </div>

          <button
            id="reduced-motion-toggle-btn"
            type="button"
            onClick={handleMotionToggle}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              prefs.reducedMotion ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white dark:bg-stone-900 absolute top-0.5 transition-transform ${
                prefs.reducedMotion ? 'left-6.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Trust & Safety Menu */}
      <div className="p-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-3 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Trust & Safety
        </h2>

        <div className="flex flex-col gap-1 text-sm">
          <button
            id="nav-safety-policy-btn"
            type="button"
            onClick={() => onNavigate('/safety')}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <span className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              Safety Policy & Non-Coercion
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            id="nav-community-rules-btn"
            type="button"
            onClick={() => onNavigate('/community-rules')}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-500" />
              Community Rules & Etiquette
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            id="nav-terms-btn"
            type="button"
            onClick={() => onNavigate('/terms')}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-stone-400" />
              Terms of Service
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            id="nav-privacy-btn"
            type="button"
            onClick={() => onNavigate('/privacy')}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <span className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-stone-400" />
              Privacy Policy
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            id="open-report-from-settings-btn"
            type="button"
            onClick={() => setShowReport(true)}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400"
          >
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4" />
              Report a Problem or Safety Concern
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Admin shortcut */}
      <div className="text-center pt-2">
        <button
          id="admin-portal-link"
          type="button"
          onClick={() => onNavigate('/admin')}
          className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline"
        >
          Staff & Operator Portal
        </button>
      </div>

      {showReport && (
        <ReportModal
          targetType="technical"
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

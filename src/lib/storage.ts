import { Experience } from '../types.ts';
import { SEED_EXPERIENCES } from '../data/seedExperiences.ts';

const SESSION_KEY = 'somewhere_session_id';
const SAVED_KEY = 'somewhere_saved_ids';
const COMPLETED_KEY = 'somewhere_completed_ids';
const THEME_KEY = 'somewhere_theme';
const MOTION_KEY = 'somewhere_motion';
const CACHED_EXPERIENCES_KEY = 'somewhere_cached_experiences';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'sess_default';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getSavedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleLocalSaved(id: string): boolean {
  const current = new Set(getSavedIds());
  let saved = false;
  if (current.has(id)) {
    current.delete(id);
    saved = false;
  } else {
    current.add(id);
    saved = true;
  }
  localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(current)));
  return saved;
}

export function getCompletedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCompletedId(id: string): void {
  if (typeof window === 'undefined') return;
  const current = new Set(getCompletedIds());
  current.add(id);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(current)));
}

export function getThemePreference(): 'system' | 'light' | 'dark' {
  if (typeof window === 'undefined') return 'system';
  const val = localStorage.getItem(THEME_KEY);
  if (val === 'light' || val === 'dark' || val === 'system') return val;
  return 'system';
}

export function setThemePreference(theme: 'system' | 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: 'system' | 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getMotionPreference(): 'normal' | 'reduced' {
  if (typeof window === 'undefined') return 'normal';
  const val = localStorage.getItem(MOTION_KEY);
  if (val === 'reduced') return 'reduced';
  return 'normal';
}

export function setMotionPreference(motion: 'normal' | 'reduced'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOTION_KEY, motion);
}

export function getOfflineSeedExperiences(): Experience[] {
  if (typeof window === 'undefined') return SEED_EXPERIENCES;
  try {
    const cached = localStorage.getItem(CACHED_EXPERIENCES_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // fallback
  }
  return SEED_EXPERIENCES;
}

export function cacheExperiences(experiences: Experience[]): void {
  if (typeof window === 'undefined' || !experiences?.length) return;
  try {
    localStorage.setItem(CACHED_EXPERIENCES_KEY, JSON.stringify(experiences.slice(0, 50)));
  } catch {
    // Ignore quota errors
  }
}

export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SAVED_KEY);
  localStorage.removeItem(COMPLETED_KEY);
}

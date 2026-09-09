// Native Web Audio API gentle sound synthesizer
// Muted by default to respect user calm

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('somewhere_sound_enabled') === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('somewhere_sound_enabled', enabled ? 'true' : 'false');
}

export function playTap(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Silent fail on audio restrictions
  }
}

export function playPop(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Silent fail
  }
}

export function playSuccess(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Two-tone warm chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now); // A4
    osc1.frequency.setValueAtTime(554.37, now + 0.08); // C#5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.16); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.16);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.45);
  } catch {
    // Silent fail
  }
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  reducedMotion: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return {
      theme: 'system',
      reducedMotion: false,
      soundEnabled: false,
      highContrast: false
    };
  }

  const themeRaw = localStorage.getItem('somewhere_theme') as 'system' | 'light' | 'dark' | null;
  const motionRaw = localStorage.getItem('somewhere_motion');
  const soundRaw = localStorage.getItem('somewhere_sound_enabled');

  return {
    theme: themeRaw || 'system',
    reducedMotion: motionRaw === 'reduced',
    soundEnabled: soundRaw === 'true',
    highContrast: false
  };
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('somewhere_theme', prefs.theme);
  localStorage.setItem('somewhere_motion', prefs.reducedMotion ? 'reduced' : 'normal');
  localStorage.setItem('somewhere_sound_enabled', prefs.soundEnabled ? 'true' : 'false');
}

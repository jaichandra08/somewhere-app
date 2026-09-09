import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Bookmark,
  Share2,
  RotateCw,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Upload,
  Sparkles,
  Clock,
  Flag,
  ArrowRight
} from 'lucide-react';
import { Experience } from '../types.ts';
import { completeExperience, toggleSaveExperience } from '../lib/api.ts';
import { playTap, playSuccess, playPop } from '../lib/sound.ts';
import { DrawingCanvas } from './DrawingCanvas.tsx';
import { ShareModal } from './ShareModal.tsx';
import { ReportModal } from './ReportModal.tsx';
import { getSavedIds } from '../lib/storage.ts';

interface ExperiencePlayerProps {
  experience: Experience;
  onDoAnother: () => void;
  onNavigate?: (path: string) => void;
  onComplete?: () => void;
}

export const ExperiencePlayer: React.FC<ExperiencePlayerProps> = ({
  experience,
  onDoAnother,
  onNavigate,
  onComplete
}) => {
  const [completed, setCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const completedRef = useRef(false);

  // Completion inputs state
  const [textInput, setTextInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [drawingData, setDrawingData] = useState<string | null>(null);

  // Timer state
  const initialSeconds = experience.timerSeconds || experience.durationSeconds || 30;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset state on new experience
    completedRef.current = false;
    setCompleted(false);
    setTextInput('');
    setSelectedChoice(null);
    setCompletedSteps([]);
    setPhotoPreview(null);
    setDrawingData(null);
    const sec = experience.timerSeconds || experience.durationSeconds || 30;
    setTimeLeft(sec);
    setTimerRunning(false);
    timerEndTimeRef.current = null;

    // Check if saved
    const saved = getSavedIds().includes(experience.id);
    setIsSaved(saved);
  }, [experience.id]);

  // Timer interval with timestamp calculation to survive background tab throttle
  useEffect(() => {
    if (!timerRunning) return;

    if (!timerEndTimeRef.current) {
      timerEndTimeRef.current = Date.now() + timeLeft * 1000;
    }

    const interval = setInterval(() => {
      if (!timerEndTimeRef.current) return;
      const remainingMs = timerEndTimeRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextSeconds);

      if (nextSeconds <= 0) {
        clearInterval(interval);
        setTimerRunning(false);
        timerEndTimeRef.current = null;
        handleFinishCompletion();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartTimer = () => {
    playTap();
    timerEndTimeRef.current = Date.now() + timeLeft * 1000;
    setTimerRunning(true);
  };

  const handlePauseTimer = () => {
    playTap();
    setTimerRunning(false);
    timerEndTimeRef.current = null;
  };

  const handleResetTimer = () => {
    playTap();
    setTimerRunning(false);
    timerEndTimeRef.current = null;
    const sec = experience.timerSeconds || experience.durationSeconds || 30;
    setTimeLeft(sec);
  };

  const isSevenWords =
    experience.slug === 'seven-word-future' ||
    experience.id === 'exp-009' ||
    experience.title.toLowerCase().includes('seven words') ||
    experience.prompt.toLowerCase().includes('seven words');

  const wordCount =
    textInput.trim().length === 0 ? 0 : textInput.trim().split(/\s+/).filter(Boolean).length;

  const isTextCompleteValid = isSevenWords ? wordCount === 7 : textInput.trim().length > 0;

  const handleFinishCompletion = async () => {
    if (completedRef.current) return;
    if (isSevenWords && wordCount !== 7) return;
    completedRef.current = true;
    playSuccess();
    setCompleted(true);
    try {
      await completeExperience(experience.id);
    } catch {
      // offline fallback
    }
    if (onComplete) {
      try {
        onComplete();
      } catch {
        // ignore
      }
    }
  };

  const handleToggleSave = async () => {
    playTap();
    setSaving(true);
    try {
      const res = await toggleSaveExperience(experience.id);
      setIsSaved(res.saved);
      playPop();
    } catch {
      setIsSaved(!isSaved);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      playPop();
    };
    reader.readAsDataURL(file);
  };

  const toggleStep = (index: number) => {
    playTap();
    const next = completedSteps.includes(index)
      ? completedSteps.filter((i) => i !== index)
      : [...completedSteps, index];
    setCompletedSteps(next);

    if (experience.steps && next.length === experience.steps.length) {
      setTimeout(() => {
        handleFinishCompletion();
      }, 400);
    }
  };

  return (
    <div
      id={`experience-player-${experience.id}`}
      className="w-full max-w-lg mx-auto bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm p-6 sm:p-8 flex flex-col gap-6 transition-all"
    >
      {/* Category & Duration Bar */}
      <div className="flex items-center justify-between gap-2">
        <span
          id="experience-category-pill"
          className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
        >
          {experience.category}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-stone-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{experience.durationSeconds}s</span>
          </div>

          <button
            id="experience-header-bookmark-btn"
            type="button"
            disabled={saving}
            onClick={handleToggleSave}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              isSaved
                ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                : 'border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={isSaved ? 'Saved to profile' : 'Save for later'}
            aria-label={isSaved ? 'Saved to profile' : 'Save for later'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Prompt & Title */}
      <div className="flex flex-col gap-2">
        <h2
          id="experience-title"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 font-serif leading-snug"
        >
          {experience.title}
        </h2>
        <p
          id="experience-prompt"
          className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-normal leading-relaxed"
        >
          {experience.prompt}
        </p>
      </div>

      {/* Warm Instructions */}
      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/80 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
        {experience.instructions}
      </div>

      {/* Dynamic Interaction based on completionType */}
      {!completed ? (
        <div id="experience-interactive-area" className="flex flex-col gap-4 mt-2">
          {/* TAP */}
          {(experience.completionType === 'tap' || experience.completionType === 'challenge') && (
            <button
              id="tap-completion-btn"
              type="button"
              onClick={handleFinishCompletion}
              className="w-full py-5 px-6 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-base font-semibold shadow-md active:scale-95 transition-all hover:bg-stone-800 dark:hover:bg-white cursor-pointer"
            >
              Done — Did It
            </button>
          )}

          {/* TIMER */}
          {experience.completionType === 'timer' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                id="timer-display"
                className="text-5xl font-mono font-bold text-stone-900 dark:text-stone-100 tracking-tight"
              >
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-200"
                  style={{ width: `${((initialSeconds - timeLeft) / initialSeconds) * 100}%` }}
                />
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-3">
                {!timerRunning ? (
                  <button
                    id="timer-start-btn"
                    type="button"
                    onClick={handleStartTimer}
                    className="py-3 px-6 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold text-sm flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start
                  </button>
                ) : (
                  <button
                    id="timer-pause-btn"
                    type="button"
                    onClick={handlePauseTimer}
                    className="py-3 px-6 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold text-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    Pause
                  </button>
                )}

                <button
                  id="timer-reset-btn"
                  type="button"
                  onClick={handleResetTimer}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* CHOICE */}
          {experience.completionType === 'choice' && experience.options && (
            <div className="flex flex-col gap-2.5">
              {experience.options.map((option, idx) => (
                <button
                  key={idx}
                  id={`choice-option-${idx}`}
                  type="button"
                  onClick={() => {
                    playTap();
                    setSelectedChoice(option);
                    setTimeout(() => handleFinishCompletion(), 350);
                  }}
                  className={`w-full text-left p-4 rounded-xl border text-sm transition-all cursor-pointer ${
                    selectedChoice === option
                      ? 'border-stone-900 dark:border-stone-100 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 hover:border-stone-400 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* COMPARISON */}
          {experience.completionType === 'comparison' && experience.comparisonItems && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {experience.comparisonItems.map((item, idx) => (
                <button
                  key={idx}
                  id={`comparison-card-${idx}`}
                  type="button"
                  onClick={() => {
                    playTap();
                    setSelectedChoice(item);
                    setTimeout(() => handleFinishCompletion(), 350);
                  }}
                  className={`p-5 rounded-2xl border text-sm text-left flex flex-col justify-between min-h-[120px] transition-all cursor-pointer ${
                    selectedChoice === item
                      ? 'border-stone-900 dark:border-stone-100 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-medium'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40 hover:border-stone-400 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-60">
                    Option {idx === 0 ? 'A' : 'B'}
                  </span>
                  <span className="font-medium mt-2">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* TEXT & ANONYMOUS SUBMISSION */}
          {(experience.completionType === 'text' || experience.completionType === 'anonymous-submission') && (
            <div className="flex flex-col gap-3">
              <textarea
                id="experience-text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value.slice(0, 300))}
                placeholder={experience.placeholder || (isSevenWords ? 'Write exactly seven words to future you...' : 'Type here...')}
                rows={3}
                className="w-full text-sm p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
              />
              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span>
                  {isSevenWords ? (
                    <span className="font-medium">
                      {wordCount === 7 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Exactly 7 words. Ready.
                        </span>
                      ) : wordCount < 7 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {7 - wordCount} more word{7 - wordCount === 1 ? '' : 's'} needed ({wordCount}/7)
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          {wordCount - 7} too many word{wordCount - 7 === 1 ? '' : 's'} ({wordCount}/7)
                        </span>
                      )}
                    </span>
                  ) : experience.completionType === 'anonymous-submission' ? (
                    'Private & anonymous.'
                  ) : (
                    ''
                  )}
                </span>
                <span className="font-mono">{textInput.length}/300</span>
              </div>
              <button
                id="submit-text-completion-btn"
                type="button"
                disabled={!isTextCompleteValid}
                onClick={handleFinishCompletion}
                className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-sm font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSevenWords && wordCount !== 7 ? `Write 7 words (${wordCount}/7)` : 'Done'}
              </button>
            </div>
          )}

          {/* DRAWING */}
          {experience.completionType === 'drawing' && (
            <DrawingCanvas
              onComplete={(dataUrl) => {
                setDrawingData(dataUrl);
                handleFinishCompletion();
              }}
            />
          )}

          {/* MULTI-STEP */}
          {experience.completionType === 'multi-step' && experience.steps && (
            <div className="flex flex-col gap-2">
              {experience.steps.map((step, idx) => {
                const isDone = completedSteps.includes(idx);
                return (
                  <button
                    key={idx}
                    id={`step-item-${idx}`}
                    type="button"
                    onClick={() => toggleStep(idx)}
                    className={`w-full p-3.5 rounded-xl border text-sm flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isDone
                        ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span>{step}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PHOTO */}
          {experience.completionType === 'photo' && (
            <div className="flex flex-col items-center gap-4">
              {!photoPreview ? (
                <label
                  id="photo-upload-label"
                  className="w-full h-48 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <Camera className="w-8 h-8 text-stone-400" />
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    Snap or upload photo
                  </span>
                  <input
                    id="photo-file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="w-full flex flex-col gap-3">
                  <div className="w-full h-56 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      id="photo-retake-btn"
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      Retake
                    </button>
                    <button
                      id="photo-confirm-btn"
                      type="button"
                      onClick={handleFinishCompletion}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
                    >
                      Use Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* COMPLETION VIEW */
        <div id="experience-completion-state" className="flex flex-col gap-5 pt-2 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-serif">
              You did it.
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs">
              One tiny moment noticed and finished. That was entirely for you.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                id="do-another-btn"
                type="button"
                onClick={() => {
                  playTap();
                  onDoAnother();
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                Do Another
              </button>

              <button
                id="send-company-btn"
                type="button"
                onClick={() => {
                  playTap();
                  setShowShareModal(true);
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Send a Little Company
              </button>
            </div>

            <button
              id="save-experience-btn"
              type="button"
              disabled={saving}
              onClick={handleToggleSave}
              className={`w-full py-3 px-4 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer active:scale-95 ${
                isSaved
                  ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                  : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title={isSaved ? 'Saved to profile' : 'Save for later'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-amber-500' : ''}`} />
              <span>{isSaved ? 'Saved to Profile' : 'Save for Later'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer subtle safety link */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
        <span>SOMEWHERE™ Micro-Experience</span>
        <button
          id="report-experience-link"
          type="button"
          onClick={() => setShowReportModal(true)}
          className="hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1 cursor-pointer"
        >
          <Flag className="w-3 h-3" />
          Report concern
        </button>
      </div>

      {showShareModal && (
        <ShareModal
          experience={experience}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showReportModal && (
        <ReportModal
          targetType="experience"
          targetId={experience.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

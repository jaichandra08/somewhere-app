import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { SEED_EXPERIENCES } from './src/data/seedExperiences.ts';
import {
  Experience,
  AnonymousSession,
  ShareToken,
  QuietCrowdSession,
  CrowdSubmission,
  DailyMoment,
  DailySubmission,
  SettleCase,
  ReportItem,
  AnalyticsSummary
} from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Security Headers & Basic Hardening ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// --- In-Memory Datastore ---
const experiences: Map<string, Experience> = new Map();
SEED_EXPERIENCES.forEach((exp) => experiences.set(exp.id, { ...exp }));

const sessions: Map<string, AnonymousSession> = new Map();
const sessionCompletions: Map<string, Set<string>> = new Map();
const sessionSaves: Map<string, Set<string>> = new Map();
const sessionDailyReactions: Map<string, Set<string>> = new Map();

const shareTokens: Map<string, ShareToken> = new Map();
const shareAttributionChain: Map<string, string> = new Map(); // childToken -> parentToken

// Active Quiet Crowd session
let activeCrowdSession: QuietCrowdSession = {
  id: 'crowd-session-001',
  experienceId: 'exp-031', // Find Something Blue
  title: 'Find Something Blue Right Now',
  prompt: 'Find something blue where you are and share a photo, sketch, or quick description.',
  completionType: 'anonymous-submission',
  durationSeconds: 90,
  startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
  participantCount: 0,
  submissionCount: 0,
  status: 'active'
};

const crowdParticipants: Map<string, number> = new Map(); // sessionId -> lastActiveTimestamp
const crowdSubmissions: Map<string, CrowdSubmission> = new Map();

// Daily Moments
const dailyMoments: Map<string, DailyMoment> = new Map();
const dailySubmissions: Map<string, DailySubmission[]> = new Map();

// Settle This Cases
const settleCases: Map<string, SettleCase> = new Map();

// Reports
const reports: Map<string, ReportItem> = new Map();

// Analytics Events (privacy safe)
const analyticsEvents: Array<{ eventType: string; timestamp: string }> = [];

// Rate Limiting Map
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        error: 'That was a lot in a short time. Give it a moment.',
        retryAfterMs: record.resetAt - now
      });
    }

    record.count++;
    next();
  };
}

// Session extraction helper
function getOrCreateSession(req: Request): AnonymousSession {
  let sessionId = (req.headers['x-session-id'] as string) || '';
  const validIdFormat = typeof sessionId === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(sessionId);

  if (!sessionId || !validIdFormat || !sessions.has(sessionId)) {
    if (!validIdFormat) {
      sessionId = 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    const newSession: AnonymousSession = {
      sessionId,
      firstSeenAt: new Date().toISOString(),
      completedCount: 0,
      sharedCount: 0,
      savedIds: []
    };
    sessions.set(sessionId, newSession);
    sessionCompletions.set(sessionId, new Set());
    sessionSaves.set(sessionId, new Set());
    return newSession;
  }
  return sessions.get(sessionId)!;
}

// Gemini AI Helper with fallback
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    experiencesCount: experiences.size
  });
});

// Session init
app.get('/api/session', (req, res) => {
  const session = getOrCreateSession(req);
  const saves = Array.from(sessionSaves.get(session.sessionId) || []);
  const completions = Array.from(sessionCompletions.get(session.sessionId) || []);
  res.json({
    ...session,
    savedIds: saves,
    completedCount: completions.length
  });
});

// List Experiences with deterministic filtering
app.get('/api/experiences', (req, res) => {
  const { category, maxDuration, search, mood } = req.query;
  let list = Array.from(experiences.values()).filter((e) => e.active);

  if (category && typeof category === 'string' && category !== 'ALL') {
    const cat = category.toUpperCase();
    if (cat === 'COMPANY' || cat === 'FRIEND') {
      list = list.filter((e) => e.category === 'FRIEND' || e.category === 'SOCIAL-PRESENCE');
    } else if (cat === 'DECISIONS' || cat === 'DECISION') {
      list = list.filter((e) => e.category === 'DECISION');
    } else if (cat === 'CROWD') {
      list = list.filter((e) => e.category === 'SOCIAL-PRESENCE');
    } else if (cat === 'GROUNDING') {
      list = list.filter((e) => e.category === 'QUIET');
    } else if (cat === 'MYSTERY') {
      list = list.filter((e) => e.category === 'SURPRISE');
    } else {
      list = list.filter((e) => e.category.toUpperCase() === cat);
    }
  }

  if (maxDuration && typeof maxDuration === 'string') {
    const maxSec = parseInt(maxDuration, 10);
    if (!isNaN(maxSec) && maxSec > 0) {
      list = list.filter((e) => e.durationSeconds <= maxSec);
    }
  }

  if (mood && typeof mood === 'string') {
    const m = mood.toLowerCase();
    list = list.filter((e) => e.moodTags.some((tag) => tag.toLowerCase().includes(m)));
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.prompt.toLowerCase().includes(q) ||
          e.moodTags.some((tag) => tag.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q)
      );
    }
  }

  res.json({ experiences: list });
});

// Single Experience
app.get('/api/experiences/:id', (req, res) => {
  const exp = experiences.get(req.params.id);
  if (!exp || !exp.active) {
    return res.status(404).json({ error: 'This one has wandered off.' });
  }
  res.json(exp);
});

// Deterministic Experience Picker with smart avoidance of recent completions
app.post('/api/experiences/random', (req, res) => {
  const session = getOrCreateSession(req);
  const { category, intention } = req.body;
  const completedSet = sessionCompletions.get(session.sessionId) || new Set<string>();

  let pool = Array.from(experiences.values()).filter((e) => e.active);

  if (intention) {
    // Intention mapping from 6 homepage buttons:
    switch (intention) {
      case 'LAUGH':
        pool = pool.filter((e) => e.category === 'FUNNY');
        break;
      case 'DO':
        pool = pool.filter((e) => e.category === 'MICRO-MISSION');
        break;
      case 'PEOPLE':
        // Finding 2: Home -> Crowd must strictly return the canonical SOCIAL-PRESENCE pool
        pool = pool.filter((e) => e.category === 'SOCIAL-PRESENCE');
        break;
      case 'HEAD':
        // Finding 5: Home -> Grounding must strictly return the canonical QUIET pool
        pool = pool.filter((e) => e.category === 'QUIET');
        break;
      case 'SURPRISE':
        // Finding 4: Home -> Mystery must strictly return the canonical SURPRISE pool
        pool = pool.filter((e) => e.category === 'SURPRISE');
        break;
      case 'COMPANY':
        // Finding 3: Home -> Warmth must strictly return FRIEND & SOCIAL-PRESENCE pool
        pool = pool.filter((e) => e.category === 'FRIEND' || e.category === 'SOCIAL-PRESENCE');
        break;
    }
  } else if (category) {
    const cat = category.toUpperCase();
    if (cat === 'COMPANY' || cat === 'FRIEND') {
      pool = pool.filter((e) => e.category === 'FRIEND' || e.category === 'SOCIAL-PRESENCE');
    } else if (cat === 'DECISIONS' || cat === 'DECISION') {
      pool = pool.filter((e) => e.category === 'DECISION');
    } else if (cat === 'CROWD') {
      pool = pool.filter((e) => e.category === 'SOCIAL-PRESENCE');
    } else if (cat === 'GROUNDING') {
      pool = pool.filter((e) => e.category === 'QUIET');
    } else if (cat === 'MYSTERY') {
      pool = pool.filter((e) => e.category === 'SURPRISE');
    } else {
      pool = pool.filter((e) => e.category.toUpperCase() === cat);
    }
  }

  // Gracefully fall back if pool is empty
  if (pool.length === 0) {
    pool = Array.from(experiences.values()).filter((e) => e.active);
  }

  // Filter out recent completions if possible
  const uncompleted = pool.filter((e) => !completedSet.has(e.id));
  const candidatePool = uncompleted.length > 0 ? uncompleted : pool;

  // Weighted selection by novelty and popularity
  const selected = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  analyticsEvents.push({ eventType: 'experience_started', timestamp: new Date().toISOString() });

  res.json(selected);
});

// Complete Experience
app.post('/api/experiences/:id/complete', (req, res) => {
  const exp = experiences.get(req.params.id);
  if (!exp || !exp.active) {
    return res.status(404).json({ error: 'This one has wandered off.' });
  }

  const session = getOrCreateSession(req);
  const completions = sessionCompletions.get(session.sessionId) || new Set<string>();
  completions.add(exp.id);
  sessionCompletions.set(session.sessionId, completions);

  session.completedCount = completions.size;

  analyticsEvents.push({ eventType: 'experience_completed', timestamp: new Date().toISOString() });

  res.json({
    success: true,
    completedCount: session.completedCount,
    message: 'Nicely done.'
  });
});

// Save Experience
app.post('/api/experiences/:id/save', (req, res) => {
  const exp = experiences.get(req.params.id);
  if (!exp || !exp.active) {
    return res.status(404).json({ error: 'This one has wandered off.' });
  }

  const session = getOrCreateSession(req);
  const saves = sessionSaves.get(session.sessionId) || new Set<string>();

  const targetState = req.body?.targetState;
  let isSavedNow: boolean;

  if (typeof targetState === 'boolean') {
    if (targetState) {
      saves.add(exp.id);
      isSavedNow = true;
    } else {
      saves.delete(exp.id);
      isSavedNow = false;
    }
  } else {
    const isSaved = saves.has(exp.id);
    if (isSaved) {
      saves.delete(exp.id);
      isSavedNow = false;
    } else {
      saves.add(exp.id);
      isSavedNow = true;
    }
  }

  sessionSaves.set(session.sessionId, saves);

  analyticsEvents.push({ eventType: isSavedNow ? 'experience_saved' : 'experience_unsaved', timestamp: new Date().toISOString() });

  res.json({
    saved: isSavedNow,
    savedIds: Array.from(saves)
  });
});

// Saved list
app.get('/api/saved', (req, res) => {
  const session = getOrCreateSession(req);
  const saves = sessionSaves.get(session.sessionId) || new Set<string>();
  const savedList = Array.from(saves)
    .map((id) => experiences.get(id))
    .filter((e): e is Experience => !!e && e.active);
  res.json({ savedExperiences: savedList });
});

// Clear session profile data (saves & completions)
app.post('/api/session/clear', (req, res) => {
  const session = getOrCreateSession(req);
  sessionSaves.delete(session.sessionId);
  sessionCompletions.delete(session.sessionId);
  sessionDailyReactions.delete(session.sessionId);
  session.completedCount = 0;
  res.json({ success: true });
});

// ----------------------------------------------------
// SHARE SYSTEM (SEND A LITTLE COMPANY)
// ----------------------------------------------------

app.post('/api/share', rateLimiter(30, 60000), (req, res) => {
  const { experienceId, parentToken, customNote } = req.body;
  const exp = experiences.get(experienceId);
  if (!exp || !exp.active) {
    return res.status(404).json({ error: 'Cannot share an unavailable experience.' });
  }

  if (exp.shareable === false) {
    return res.status(400).json({ error: 'This experience is marked as private/non-shareable.' });
  }

  const session = getOrCreateSession(req);
  const token = crypto.randomBytes(8).toString('hex'); // 16-character unpredictable token
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const shareRecord: ShareToken = {
    token,
    experienceId: exp.id,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    creatorSessionId: session.sessionId,
    openCount: 0,
    completedCount: 0,
    customNote: typeof customNote === 'string' ? customNote.slice(0, 140) : undefined
  };

  shareTokens.set(token, shareRecord);
  if (parentToken && shareTokens.has(parentToken)) {
    shareAttributionChain.set(token, parentToken);
  }

  session.sharedCount = (session.sharedCount || 0) + 1;
  analyticsEvents.push({ eventType: 'share_created', timestamp: now.toISOString() });

  res.json({
    token,
    shareUrl: `/share/${token}`,
    expiresAt: shareRecord.expiresAt
  });
});

app.get('/api/share/:token', (req, res) => {
  const tokenRecord = shareTokens.get(req.params.token);
  if (!tokenRecord) {
    return res.status(404).json({
      error: 'That little thing wandered off.',
      code: 'TOKEN_NOT_FOUND'
    });
  }

  if (new Date() > new Date(tokenRecord.expiresAt)) {
    return res.status(410).json({
      error: 'That little thing has expired.',
      code: 'TOKEN_EXPIRED'
    });
  }

  const exp = experiences.get(tokenRecord.experienceId);
  if (!exp || !exp.active || exp.shareable === false) {
    return res.status(404).json({
      error: 'That little thing wandered off.',
      code: 'EXPERIENCE_UNAVAILABLE'
    });
  }

  tokenRecord.openCount++;
  analyticsEvents.push({ eventType: 'share_opened', timestamp: new Date().toISOString() });

  res.json({
    token: tokenRecord.token,
    experience: exp,
    customNote: tokenRecord.customNote,
    createdAt: tokenRecord.createdAt
  });
});

app.post('/api/share/:token/complete', (req, res) => {
  const tokenRecord = shareTokens.get(req.params.token);
  if (!tokenRecord) {
    return res.status(404).json({ error: 'That little thing wandered off.', code: 'TOKEN_NOT_FOUND' });
  }

  if (new Date() > new Date(tokenRecord.expiresAt)) {
    return res.status(410).json({ error: 'That little thing has expired.', code: 'TOKEN_EXPIRED' });
  }

  const exp = experiences.get(tokenRecord.experienceId);
  if (!exp || !exp.active || exp.shareable === false) {
    return res.status(404).json({ error: 'That little thing wandered off.', code: 'EXPERIENCE_UNAVAILABLE' });
  }

  const session = getOrCreateSession(req);
  const completions = sessionCompletions.get(session.sessionId) || new Set<string>();
  const isAlreadyCompleted = completions.has(exp.id);

  if (!isAlreadyCompleted) {
    tokenRecord.completedCount++;
    completions.add(exp.id);
    sessionCompletions.set(session.sessionId, completions);
    session.completedCount = completions.size;
    analyticsEvents.push({ eventType: 'share_completed', timestamp: new Date().toISOString() });
  }

  res.json({ success: true, message: 'You completed it.', alreadyCompleted: isAlreadyCompleted });
});

// ----------------------------------------------------
// THE QUIET CROWD (TRUTHFUL DATA)
// ----------------------------------------------------

const CROWD_CANDIDATE_IDS = [
  'exp-031', // Find Something Blue Right Now
  'exp-032', // What Color is Your Sky Right Now?
  'exp-033', // One Tiny Thing That Made You Smile
  'exp-034', // Leave an Anonymous Good Wish
  'exp-035', // Draw a Very Small Hat
  'exp-087'  // Leave One Song Title for the Crowd
];

function ensureActiveCrowdSession(): QuietCrowdSession {
  const now = Date.now();
  const isExpired = new Date(activeCrowdSession.expiresAt).getTime() <= now || activeCrowdSession.status !== 'active';
  if (isExpired) {
    activeCrowdSession.status = 'archived';

    const currentIdx = CROWD_CANDIDATE_IDS.indexOf(activeCrowdSession.experienceId);
    const nextIdx = (currentIdx + 1) % CROWD_CANDIDATE_IDS.length;
    const nextExpId = CROWD_CANDIDATE_IDS[nextIdx];
    const exp = experiences.get(nextExpId) || experiences.get('exp-031')!;

    const newSessionId = 'crowd-session-' + Date.now().toString(36);
    const twoHoursMs = 2 * 60 * 60 * 1000;

    activeCrowdSession = {
      id: newSessionId,
      experienceId: exp.id,
      title: exp.title,
      prompt: exp.prompt,
      completionType: 'anonymous-submission',
      durationSeconds: exp.durationSeconds || 90,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + twoHoursMs).toISOString(),
      participantCount: 0,
      submissionCount: 0,
      status: 'active'
    };
    crowdParticipants.clear();
  }
  return activeCrowdSession;
}

app.get('/api/crowd/current', (req, res) => {
  const session = ensureActiveCrowdSession();

  // Prune participants older than 15 minutes
  const now = Date.now();
  const activeCutoff = now - 15 * 60 * 1000;
  for (const [sId, timestamp] of crowdParticipants.entries()) {
    if (timestamp < activeCutoff) {
      crowdParticipants.delete(sId);
    }
  }

  session.participantCount = crowdParticipants.size;
  const approvedSubmissions = Array.from(crowdSubmissions.values()).filter(
    (s) => s.crowdSessionId === session.id && s.status === 'approved'
  );
  session.submissionCount = approvedSubmissions.length;

  res.json({
    session,
    // Truthful presence indicator
    truthfulCopy:
      crowdParticipants.size === 0
        ? 'Quiet right now. That’s okay. You can still start something.'
        : `People are doing this too.`
  });
});

app.post('/api/crowd/join', (req, res) => {
  const currentSession = ensureActiveCrowdSession();
  if (Date.now() > new Date(currentSession.expiresAt).getTime() || currentSession.status !== 'active') {
    return res.status(410).json({ error: 'This session has ended. Please refresh for the new active session.' });
  }

  const session = getOrCreateSession(req);
  crowdParticipants.set(session.sessionId, Date.now());
  currentSession.participantCount = crowdParticipants.size;

  analyticsEvents.push({ eventType: 'crowd_joined', timestamp: new Date().toISOString() });

  res.json({
    success: true,
    participantCount: crowdParticipants.size
  });
});

app.post('/api/crowd/submit', rateLimiter(10, 60000), (req, res) => {
  const currentSession = ensureActiveCrowdSession();
  if (Date.now() > new Date(currentSession.expiresAt).getTime() || currentSession.status !== 'active') {
    return res.status(410).json({ error: 'This session has ended. Please refresh for the active session.' });
  }

  const session = getOrCreateSession(req);
  const { type, content, crowdSessionId } = req.body;

  if (crowdSessionId && crowdSessionId !== currentSession.id) {
    return res.status(409).json({ error: 'This submission does not match the active session. Please refresh.', code: 'SESSION_MISMATCH' });
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Submission cannot be empty.' });
  }

  if (content.length > 500000) {
    // 500kb cap for base64 drawings or text
    return res.status(400).json({ error: 'Submission exceeds size limit.' });
  }

  const submissionId = 'sub_' + crypto.randomUUID().slice(0, 12);

  // Simple automated moderation check for abusive/toxic phrases
  const lower = content.toLowerCase();
  const prohibitedKeywords = [
    'hate', 'kill', 'suicide', 'bomb', 'weapon', 'nazi', 'slur', 'doxx', 'address', 'phone'
  ];
  const containsProhibited = prohibitedKeywords.some((w) => lower.includes(w));

  const submission: CrowdSubmission = {
    id: submissionId,
    sessionId: session.sessionId,
    crowdSessionId: currentSession.id, // Server derives the active session ID itself
    type: type === 'drawing' ? 'drawing' : 'text',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    status: containsProhibited ? 'rejected' : 'approved' // Safe auto-approval or moderation queue
  };

  crowdSubmissions.set(submissionId, submission);
  if (submission.status === 'approved') {
    currentSession.submissionCount++;
  }

  analyticsEvents.push({ eventType: 'crowd_completed', timestamp: new Date().toISOString() });

  res.json({
    success: true,
    status: submission.status,
    message: submission.status === 'approved' ? 'Added quietly.' : 'Submitted for moderation.'
  });
});

app.get('/api/crowd/submissions', (req, res) => {
  const currentSession = ensureActiveCrowdSession();
  const approved = Array.from(crowdSubmissions.values())
    .filter((s) => s.crowdSessionId === currentSession.id && s.status === 'approved')
    .slice(-30)
    .reverse();
  res.json({ submissions: approved });
});

// ----------------------------------------------------
// TODAY'S LITTLE THING (DAILY FEATURE)
// ----------------------------------------------------

const DAILY_PROMPTS = [
  { prompt: 'What tiny victory went completely uncelebrated today?', subPrompt: 'Got out of bed on time.\nDid one load of dishes.' },
  { prompt: 'What is something tiny that made you smile today?', subPrompt: 'A funny dog, a warm pastry, finding a misplaced pen.' },
  { prompt: 'What is the best small sound you heard today?', subPrompt: 'Rain on glass, kettle boiling, someone laughing quietly.' },
  { prompt: 'Name an ordinary object that saved your day today.', subPrompt: 'Your favorite mug, a working charger, an umbrella.' },
  { prompt: 'What is one texture you enjoyed touching today?', subPrompt: 'Soft blanket, cold ceramic, fresh notebook paper.' },
  { prompt: 'What color stood out to you unexpectedly today?', subPrompt: 'A bright yellow door, vibrant moss, an autumn leaf.' },
  { prompt: 'What is one sentence you wish someone would say to you?', subPrompt: 'No need to overthink it.' }
];

app.get('/api/daily', (req, res) => {
  const clientDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : (typeof req.headers['x-client-date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.headers['x-client-date'] as string)
        ? (req.headers['x-client-date'] as string)
        : new Date().toISOString().slice(0, 10));

  const dateKey = clientDate;
  const [y, m, d] = dateKey.split('-').map(Number);
  const epochDay = Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
  const dayIndex = Math.abs(epochDay) % DAILY_PROMPTS.length;
  const promptConfig = DAILY_PROMPTS[dayIndex];

  let moment = dailyMoments.get(dateKey);
  if (!moment) {
    moment = {
      dateKey,
      prompt: promptConfig.prompt,
      subPrompt: promptConfig.subPrompt,
      completionType: 'text',
      submissionsCount: 0
    };
    dailyMoments.set(dateKey, moment);
  }

  const approved = (dailySubmissions.get(dateKey) || []).filter((s) => s.status === 'approved');
  res.json({
    moment: {
      ...moment,
      submissionsCount: approved.length
    },
    submissions: approved.slice(-20).reverse()
  });
});

app.post('/api/daily/submit', rateLimiter(10, 60000), (req, res) => {
  const session = getOrCreateSession(req);
  const { dateKey, content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Submission cannot be empty.' });
  }

  const clientDate = typeof req.headers['x-client-date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.headers['x-client-date'] as string)
    ? (req.headers['x-client-date'] as string)
    : new Date().toISOString().slice(0, 10);

  const safeContent = content.trim().slice(0, 280);
  const todayKey = dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : clientDate;

  const sub: DailySubmission = {
    id: 'daily_' + crypto.randomUUID().slice(0, 12),
    dateKey: todayKey,
    sessionId: session.sessionId,
    content: safeContent,
    createdAt: new Date().toISOString(),
    status: 'approved'
  };

  const list = dailySubmissions.get(todayKey) || [];
  list.push(sub);
  dailySubmissions.set(todayKey, list);

  analyticsEvents.push({ eventType: 'daily_completed', timestamp: new Date().toISOString() });

  res.json({ success: true, submission: sub });
});

app.post('/api/daily/react/:id', (req, res) => {
  const session = getOrCreateSession(req);
  const { id } = req.params;
  const userReactions = sessionDailyReactions.get(session.sessionId) || new Set<string>();

  let sub: DailySubmission | undefined;
  const { dateKey } = req.body || {};
  if (dateKey && typeof dateKey === 'string' && dailySubmissions.has(dateKey)) {
    sub = dailySubmissions.get(dateKey)!.find((s) => s.id === id);
  }
  if (!sub) {
    for (const dayList of dailySubmissions.values()) {
      sub = dayList.find((item) => item.id === id);
      if (sub) break;
    }
  }

  if (!sub) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  if (userReactions.has(id)) {
    return res.json({ success: true, reactions: sub.reactions || 0, alreadyReacted: true });
  }

  sub.reactions = (sub.reactions || 0) + 1;
  userReactions.add(id);
  sessionDailyReactions.set(session.sessionId, userReactions);

  return res.json({ success: true, reactions: sub.reactions, alreadyReacted: false });
});


// ----------------------------------------------------
// DON'T PRESS (SIGNATURE MYSTERIOUS FEATURE)
// ----------------------------------------------------

const DONT_PRESS_SURPRISES = [
  {
    title: 'The Immediate Regret Button',
    flavor: 'You were specifically warned.',
    task: 'You must now stare at the wall for 15 seconds and apologize to it.',
    actionType: 'timer',
    seconds: 15
  },
  {
    title: 'The Absurd Pronunciation Law',
    flavor: 'A new decree has been issued.',
    task: 'Whisper the word "Pumpernickel" in an exaggerated Italian accent three times.',
    actionType: 'tap'
  },
  {
    title: 'The Cat Detective Agency',
    flavor: 'Emergency dispatch.',
    task: 'A nearby cat has accused you of opening a can of tuna without its explicit permission. Plead guilty or innocent.',
    actionType: 'choice',
    options: ['Guilty: The tuna was irresistible', 'Innocent: It was chickpeas, your honor']
  },
  {
    title: 'Secret Pocket Inspection',
    flavor: 'Search protocol activated.',
    task: 'Check your right pocket. If it is empty, you must fill it with a metaphorical cloud.',
    actionType: 'tap'
  },
  {
    title: 'The Synchronized Blink',
    flavor: 'Global coordination.',
    task: 'Blink three times right now. Somewhere in the world, a traffic light just changed green in sympathy.',
    actionType: 'tap'
  }
];

app.get('/api/dont-press', (req, res) => {
  const dayOffset = Math.floor(Date.now() / (1000 * 60 * 60 * 12)); // rotates twice a day
  const surprise = DONT_PRESS_SURPRISES[dayOffset % DONT_PRESS_SURPRISES.length];
  analyticsEvents.push({ eventType: 'dont_press_clicked', timestamp: new Date().toISOString() });
  res.json(surprise);
});

// ----------------------------------------------------
// INTERNET COURT — SETTLE THIS
// ----------------------------------------------------

const PLAYFUL_VERDICTS = [
  { outcome: 'TECHNICALLY RIGHT', explanation: 'One party has strict contractual precedent on their side, even if it was mildly petty.' },
  { outcome: 'BOTH ARE BEING DRAMATIC', explanation: 'A jury of miniature garden gnomes has reviewed the transcripts and concluded both sides deserve a warm nap.' },
  { outcome: 'NOBODY IS INNOCENT', explanation: 'Mistakes were made, boundaries were crossed, and a sandwich was unjustly implicated.' },
  { outcome: 'YOU HAVE A POINT', explanation: 'Under section 4.2 of Common Room Courtesy, the complaint is valid and upheld.' },
  { outcome: 'THE EVIDENCE IS INCONCLUSIVE', explanation: 'The court requires photographic evidence of the alleged dishwasher loading technique.' },
  { outcome: 'EVERYONE NEEDS A SNACK', explanation: 'The court rules that low blood sugar is the primary co-conspirator in this dispute.' }
];

app.post('/api/settle', rateLimiter(20, 60000), (req, res) => {
  const { title, context, sideA, sideAName } = req.body;
  if (!title || !sideA) {
    return res.status(400).json({ error: 'Title and your side are required.' });
  }

  const caseId = 'case_' + crypto.randomUUID().slice(0, 10);
  const settleCase: SettleCase = {
    id: caseId,
    title: title.trim().slice(0, 100),
    context: (context || '').trim().slice(0, 300),
    sideA: sideA.trim().slice(0, 500),
    sideAName: (sideAName || 'Person A').trim().slice(0, 40),
    status: 'waiting_for_side_b',
    createdAt: new Date().toISOString()
  };

  settleCases.set(caseId, settleCase);
  analyticsEvents.push({ eventType: 'settle_started', timestamp: new Date().toISOString() });

  res.json({ caseId, inviteUrl: `/settle/${caseId}` });
});

app.get('/api/settle/:caseId', (req, res) => {
  const c = settleCases.get(req.params.caseId);
  if (!c) {
    return res.status(404).json({ error: 'This dispute has settled itself or wandered off.' });
  }
  res.json(c);
});

app.post('/api/settle/:caseId/side-b', rateLimiter(20, 60000), async (req, res) => {
  const c = settleCases.get(req.params.caseId);
  if (!c) {
    return res.status(404).json({ error: 'Case not found.' });
  }

  // Prevent double settlement
  if (c.status === 'settled') {
    return res.status(409).json({
      error: 'This case has already been settled and cannot be re-settled.',
      code: 'ALREADY_SETTLED',
      settleCase: c
    });
  }

  const { sideB, sideBName } = req.body;
  if (!sideB || typeof sideB !== 'string' || sideB.trim().length === 0) {
    return res.status(400).json({ error: 'Side B argument is required.' });
  }

  c.sideB = sideB.trim().slice(0, 500);
  c.sideBName = (sideBName || 'Person B').trim().slice(0, 40);
  c.status = 'settled';

  // Allowed verdicts
  const ALLOWED_VERDICT_OUTCOMES = new Set([
    'TECHNICALLY RIGHT',
    'BOTH ARE BEING DRAMATIC',
    'NOBODY IS INNOCENT',
    'YOU HAVE A POINT',
    'THE EVIDENCE IS INCONCLUSIVE',
    'EVERYONE NEEDS A SNACK'
  ]);

  // Attempt Gemini API for clever structured verdict, with deterministic fallback
  let verdictOutcome = PLAYFUL_VERDICTS[Math.floor(Math.random() * PLAYFUL_VERDICTS.length)];
  let penalty = 'Winner gets to choose the next movie.';

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are a warm, witty, lighthearted Internet Court judge for harmless everyday disputes between friends or partners.
Dispute Title: "${c.title.replace(/"/g, "'")}"
Context: "${c.context.replace(/"/g, "'")}"
${c.sideAName.replace(/"/g, "'")}: "${c.sideA.replace(/"/g, "'")}"
${c.sideBName.replace(/"/g, "'")}: "${c.sideB.replace(/"/g, "'")}"

Deliver a playful, funny, completely non-legal verdict. Choose an outcome from:
['TECHNICALLY RIGHT', 'BOTH ARE BEING DRAMATIC', 'NOBODY IS INNOCENT', 'YOU HAVE A POINT', 'THE EVIDENCE IS INCONCLUSIVE', 'EVERYONE NEEDS A SNACK'].
Keep the explanation under 2 sentences. Include a harmless playful penalty (e.g. "Person A must make the next cup of tea").
Respond in valid JSON format:
{
  "outcome": "...",
  "explanation": "...",
  "playfulPenalty": "..."
}`;

      const aiResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3500))
      ]);

      if (aiResponse.text) {
        const parsed = JSON.parse(aiResponse.text.trim());
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.outcome === 'string' &&
          ALLOWED_VERDICT_OUTCOMES.has(parsed.outcome) &&
          typeof parsed.explanation === 'string' &&
          parsed.explanation.trim().length > 0 &&
          parsed.explanation.length <= 300
        ) {
          verdictOutcome = {
            outcome: parsed.outcome,
            explanation: parsed.explanation.trim()
          };
          if (typeof parsed.playfulPenalty === 'string' && parsed.playfulPenalty.trim().length > 0 && parsed.playfulPenalty.length <= 200) {
            penalty = parsed.playfulPenalty.trim();
          }
        }
      }
    } catch {
      // Graceful fallback to deterministic verdict
    }
  }

  c.verdict = {
    outcome: verdictOutcome.outcome,
    explanation: verdictOutcome.explanation,
    playfulPenalty: penalty
  };

  analyticsEvents.push({ eventType: 'settle_completed', timestamp: new Date().toISOString() });

  res.json(c);
});

// ----------------------------------------------------
// FUTURE YOU SCENARIOS
// ----------------------------------------------------

app.post('/api/future-you', rateLimiter(15, 60000), async (req, res) => {
  const { decision } = req.body;
  if (!decision || typeof decision !== 'string' || decision.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a decision to explore.' });
  }

  if (decision.trim().length > 150) {
    return res.status(400).json({ error: 'Decision description must be 150 characters or fewer.' });
  }

  const cleanDecision = decision.trim().slice(0, 150);

  // Deterministic fallback scenarios
  let scenarios = {
    scenario7Days: 'You feel a small twinge of relief having taken the first step. Your routine shifted by 5%, and you noticed something new on your walk.',
    scenario6Months: 'The initial awkwardness is a distant memory. You have built a quiet groove around it, and it feels natural as morning coffee.',
    scenarioIfDont: 'Life continues in its comfortable familiar loop. You still occasionally wonder about it while brushing your teeth, but you are okay.'
  };

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Generate 3 gentle, playful, fictional decision scenarios for someone pondering this choice: "${cleanDecision.replace(/"/g, "'")}".
Rules:
- NOT a fortune prediction. Keep it grounded, warm, slightly whimsical, and calming.
- Output JSON format:
{
  "scenario7Days": "Short 1-2 sentence scenario 7 days from now if they do it",
  "scenario6Months": "Short 1-2 sentence scenario 6 months from now if they do it",
  "scenarioIfDont": "Short 1-2 sentence scenario if they decide not to do it"
}`;
      const aiResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3500))
      ]);
      if (aiResponse.text) {
        const parsed = JSON.parse(aiResponse.text.trim());
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.scenario7Days === 'string' &&
          typeof parsed.scenario6Months === 'string' &&
          typeof parsed.scenarioIfDont === 'string' &&
          parsed.scenario7Days.length <= 400 &&
          parsed.scenario6Months.length <= 400 &&
          parsed.scenarioIfDont.length <= 400
        ) {
          scenarios = {
            scenario7Days: parsed.scenario7Days.trim(),
            scenario6Months: parsed.scenario6Months.trim(),
            scenarioIfDont: parsed.scenarioIfDont.trim()
          };
        }
      }
    } catch {
      // fallback
    }
  }

  analyticsEvents.push({ eventType: 'future_you_completed', timestamp: new Date().toISOString() });

  res.json({
    decision: cleanDecision,
    ...scenarios,
    disclaimer: 'Playful scenario generator — not a prediction.'
  });
});

// ----------------------------------------------------
// REPORTS (SAFETY & MODERATION)
// ----------------------------------------------------

app.post('/api/report', rateLimiter(10, 60000), (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Reason is required.' });
  }

  const id = 'rep_' + crypto.randomUUID().slice(0, 10);
  const reportItem: ReportItem = {
    id,
    targetType: targetType || 'technical',
    targetId: (targetId || '').slice(0, 50),
    reason: (reason || '').slice(0, 100),
    details: (details || '').slice(0, 500),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reports.set(id, reportItem);
  res.json({
    success: true,
    message: "Thanks. We've received it."
  });
});

// ----------------------------------------------------
// PROTECTED ADMIN DASHBOARD
// ----------------------------------------------------

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey || configuredKey.trim().length === 0) {
    return res.status(503).json({ error: 'Admin access is disabled because ADMIN_KEY is not configured.' });
  }
  const adminKey = req.headers['x-admin-key'] as string;
  if (!adminKey || adminKey !== configuredKey) {
    return res.status(403).json({ error: 'Unauthorized admin access.' });
  }
  next();
}

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;

  // Real active session count in last 15 minutes
  const activeFromCrowd = Array.from(crowdParticipants.values()).filter((t) => t >= fifteenMinutesAgo).length;
  const recentEventCount = new Set(
    analyticsEvents
      .filter((e) => new Date(e.timestamp).getTime() >= fifteenMinutesAgo)
      .map((e) => e.eventType)
  ).size;
  const activeSessionsLast15m = Math.max(activeFromCrowd, recentEventCount, sessions.size > 0 ? 1 : 0);

  const totalSessions = sessions.size;
  const totalCompletions = Array.from(sessions.values()).reduce((sum, s) => sum + (s.completedCount || 0), 0);
  const totalSharesCreated = shareTokens.size;

  const dailySubsCount = Array.from(dailySubmissions.values()).reduce((sum, list) => sum + list.length, 0);
  const totalSubmissions = crowdSubmissions.size + dailySubsCount;

  const activeExperiencesCount = Array.from(experiences.values()).filter((e) => e.active).length;
  const pendingModerationCount = Array.from(crowdSubmissions.values()).filter((s) => s.status === 'pending').length;
  const pendingReportsCount = Array.from(reports.values()).filter((r) => r.status === 'pending').length;

  const summary: AnalyticsSummary = {
    activeSessionsLast15m,
    totalSessions,
    totalCompletions,
    totalSharesCreated,
    totalSubmissions,
    pendingReportsCount,
    activeExperiencesCount,
    pendingModerationCount
  };

  res.json(summary);
});

app.get('/api/admin/experiences', requireAdmin, (req, res) => {
  res.json({ experiences: Array.from(experiences.values()) });
});

app.post('/api/admin/experiences/:id/toggle', requireAdmin, (req, res) => {
  const exp = experiences.get(req.params.id);
  if (!exp) {
    return res.status(404).json({ error: 'Experience not found.' });
  }
  exp.active = !exp.active;
  exp.updatedAt = new Date().toISOString();
  res.json({ success: true, active: exp.active });
});

app.get('/api/admin/moderation', requireAdmin, (req, res) => {
  const allSubmissions = Array.from(crowdSubmissions.values()).reverse();
  res.json({ submissions: allSubmissions });
});

app.post('/api/admin/moderation/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  const sub = crowdSubmissions.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  if (['approved', 'rejected', 'removed'].includes(status)) {
    sub.status = status;
    return res.json({ success: true, submission: sub });
  }
  res.status(400).json({ error: 'Invalid status.' });
});

app.get('/api/admin/reports', requireAdmin, (req, res) => {
  res.json({ reports: Array.from(reports.values()).reverse() });
});

app.post('/api/admin/reports/:id/resolve', requireAdmin, (req, res) => {
  const r = reports.get(req.params.id);
  if (!r) {
    return res.status(404).json({ error: 'Report not found.' });
  }
  r.status = 'resolved';
  res.json({ success: true });
});

// ----------------------------------------------------
// VITE OR STATIC SERVE
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOMEWHERE™ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

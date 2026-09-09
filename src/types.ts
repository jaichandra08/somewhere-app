export type ExperienceCategory =
  | 'FUNNY'
  | 'MICRO-MISSION'
  | 'CREATIVE'
  | 'OBSERVATION'
  | 'CURIOUS'
  | 'QUIET'
  | 'SOCIAL-PRESENCE'
  | 'DECISION'
  | 'REFLECTION'
  | 'FRIEND'
  | 'SURPRISE';

export type CompletionType =
  | 'tap'
  | 'choice'
  | 'text'
  | 'drawing'
  | 'timer'
  | 'photo'
  | 'multi-step'
  | 'comparison'
  | 'challenge'
  | 'anonymous-submission';

export interface Experience {
  id: string;
  slug: string;
  title: string;
  category: ExperienceCategory;
  prompt: string;
  instructions: string;
  completionType: CompletionType;
  durationSeconds: number;
  difficulty: 'easy' | 'medium' | 'playful';
  moodTags: string[];
  shareable: boolean;
  crowdEnabled: boolean;
  imageAllowed: boolean;
  textAllowed: boolean;
  active: boolean;
  noveltyWeight: number;
  popularityWeight: number;
  options?: string[];
  steps?: string[];
  comparisonItems?: [string, string];
  timerSeconds?: number;
  placeholder?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnonymousSession {
  sessionId: string;
  firstSeenAt: string;
  completedCount: number;
  sharedCount: number;
  savedIds: string[];
}

export interface ShareToken {
  token: string;
  experienceId: string;
  createdAt: string;
  expiresAt: string;
  creatorSessionId: string;
  openCount: number;
  completedCount: number;
  customNote?: string;
}

export interface QuietCrowdSession {
  id: string;
  experienceId: string;
  title: string;
  prompt: string;
  completionType: CompletionType;
  durationSeconds: number;
  startedAt: string;
  expiresAt: string;
  participantCount: number;
  submissionCount: number;
  status: 'active' | 'archived';
}

export interface CrowdSubmission {
  id: string;
  sessionId: string;
  crowdSessionId: string;
  type: 'text' | 'drawing' | 'image';
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
}

export interface DailyMoment {
  dateKey: string;
  prompt: string;
  subPrompt: string;
  completionType: CompletionType;
  submissionsCount: number;
}

export interface DailySubmission {
  id: string;
  dateKey: string;
  sessionId: string;
  content: string;
  createdAt: string;
  status: 'approved' | 'pending' | 'rejected';
  reactions?: number;
}

export interface SettleCase {
  id: string;
  title: string;
  context: string;
  sideA: string;
  sideAName?: string;
  sideB?: string;
  sideBName?: string;
  status: 'waiting_for_side_b' | 'settled';
  verdict?: {
    outcome: string;
    explanation: string;
    playfulPenalty?: string;
  };
  createdAt: string;
}

export interface FutureDecision {
  id: string;
  decision: string;
  scenario7Days: string;
  scenario6Months: string;
  scenarioIfDont: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'experience' | 'submission' | 'user' | 'technical';
  targetId: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface AnalyticsSummary {
  activeSessionsLast15m: number;
  totalSessions: number;
  totalCompletions: number;
  totalSharesCreated: number;
  totalSubmissions: number;
  pendingReportsCount: number;
  activeExperiencesCount: number;
  pendingModerationCount: number;
}

import {
  Experience,
  QuietCrowdSession,
  CrowdSubmission,
  DailyMoment,
  DailySubmission,
  SettleCase,
  FutureDecision,
  ReportItem,
  AnalyticsSummary
} from '../types.ts';
import {
  getSessionId,
  getOfflineSeedExperiences,
  cacheExperiences,
  addCompletedId,
  toggleLocalSaved,
  getSavedIds,
  clearLocalData
} from './storage.ts';

const BASE_URL = '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const sessionId = getSessionId();
  const headers = new Headers(options.headers || {});
  headers.set('x-session-id', sessionId);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = 'Something wandered off.';
      try {
        const errJson = await res.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    // Offline detection & graceful fallback
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline || (err instanceof TypeError && err.message.includes('fetch'))) {
      throw new Error('OFFLINE');
    }
    throw err;
  }
}

// Experiences
export async function getExperiences(params?: {
  category?: string;
  maxDuration?: number;
  search?: string;
  mood?: string;
}): Promise<Experience[]> {
  try {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.maxDuration) query.set('maxDuration', params.maxDuration.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.mood) query.set('mood', params.mood);

    const data = await request<{ experiences: Experience[] }>(`/api/experiences?${query.toString()}`);
    
    // Only cache when fetching unfiltered full catalog
    const isUnfiltered =
      (!params?.category || params.category === 'ALL') &&
      !params?.maxDuration &&
      !params?.search &&
      !params?.mood;
    if (isUnfiltered) {
      cacheExperiences(data.experiences);
    }
    
    return data.experiences;
  } catch (err: unknown) {
    if ((err as Error).message === 'OFFLINE') {
      let list = getOfflineSeedExperiences();
      if (params?.category && params.category !== 'ALL') {
        const cat = params.category.toUpperCase();
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
      if (params?.maxDuration) {
        list = list.filter((e) => e.durationSeconds <= params.maxDuration!);
      }
      if (params?.search) {
        const q = params.search.trim().toLowerCase();
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
      return list;
    }
    throw err;
  }
}

export async function getExperience(id: string): Promise<Experience> {
  try {
    return await request<Experience>(`/api/experiences/${id}`);
  } catch (err: unknown) {
    if ((err as Error).message === 'OFFLINE') {
      const offlineItem = getOfflineSeedExperiences().find((e) => e.id === id);
      if (offlineItem) return offlineItem;
    }
    throw err;
  }
}

export async function getRandomExperience(options?: {
  intention?: 'LAUGH' | 'DO' | 'PEOPLE' | 'HEAD' | 'SURPRISE' | 'COMPANY';
  category?: string;
}): Promise<Experience> {
  try {
    return await request<Experience>('/api/experiences/random', {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'OFFLINE') {
      let pool = getOfflineSeedExperiences().filter((e) => e.active);
      if (options?.intention) {
        switch (options.intention) {
          case 'LAUGH':
            pool = pool.filter((e) => e.category === 'FUNNY' || e.moodTags.includes('laugh'));
            break;
          case 'DO':
            pool = pool.filter((e) => e.category === 'MICRO-MISSION');
            break;
          case 'PEOPLE':
            pool = pool.filter((e) => e.category === 'SOCIAL-PRESENCE');
            break;
          case 'HEAD':
            pool = pool.filter((e) => e.category === 'QUIET');
            break;
          case 'SURPRISE':
            pool = pool.filter((e) => e.category === 'SURPRISE');
            break;
          case 'COMPANY':
            pool = pool.filter((e) => e.category === 'FRIEND' || e.category === 'SOCIAL-PRESENCE');
            break;
        }
      } else if (options?.category && options.category !== 'ALL') {
        const cat = options.category.toUpperCase();
        if (cat === 'COMPANY' || cat === 'FRIEND') {
          pool = pool.filter((e) => e.category === 'FRIEND' || e.category === 'SOCIAL-PRESENCE');
        } else {
          pool = pool.filter((e) => e.category.toUpperCase() === cat);
        }
      }
      if (pool.length === 0) {
        pool = getOfflineSeedExperiences().filter((e) => e.active);
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }
    throw err;
  }
}

export async function completeExperience(id: string): Promise<{ success: boolean; completedCount: number }> {
  addCompletedId(id);
  try {
    return await request<{ success: boolean; completedCount: number }>(`/api/experiences/${id}/complete`, {
      method: 'POST'
    });
  } catch {
    // Local offline completion counted
    return { success: true, completedCount: 1 };
  }
}

export async function toggleSaveExperience(id: string): Promise<{ saved: boolean }> {
  const localSaved = toggleLocalSaved(id);
  try {
    const res = await request<{ saved: boolean }>(`/api/experiences/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ targetState: localSaved })
    });
    return res;
  } catch {
    return { saved: localSaved };
  }
}

export async function clearProfileData(): Promise<void> {
  clearLocalData();
  try {
    await request<{ success: boolean }>('/api/session/clear', { method: 'POST' });
  } catch {
    // offline
  }
}

export async function getSavedExperiences(): Promise<Experience[]> {
  const localSavedIds = getSavedIds();
  if (localSavedIds.length === 0) {
    try {
      await request<{ success: boolean }>('/api/session/clear', { method: 'POST' });
    } catch {}
    return [];
  }
  try {
    const res = await request<{ savedExperiences: Experience[] }>('/api/saved');
    const savedSet = new Set(localSavedIds);
    return res.savedExperiences.filter((e) => savedSet.has(e.id));
  } catch {
    const savedIds = new Set(localSavedIds);
    return getOfflineSeedExperiences().filter((e) => savedIds.has(e.id));
  }
}

// Share
export async function createShare(experienceId: string, customNote?: string, parentToken?: string): Promise<{ token: string; shareUrl: string; expiresAt: string }> {
  return await request<{ token: string; shareUrl: string; expiresAt: string }>('/api/share', {
    method: 'POST',
    body: JSON.stringify({ experienceId, customNote, parentToken })
  });
}

export async function getSharedExperience(token: string): Promise<{ token: string; experience: Experience; customNote?: string; createdAt: string }> {
  return await request<{ token: string; experience: Experience; customNote?: string; createdAt: string }>(`/api/share/${token}`);
}

export async function completeSharedExperience(token: string): Promise<void> {
  try {
    await request(`/api/share/${token}/complete`, { method: 'POST' });
  } catch {
    // ignore
  }
}

// Quiet Crowd
export async function getCrowdCurrent(): Promise<{ session: QuietCrowdSession; truthfulCopy: string }> {
  return await request<{ session: QuietCrowdSession; truthfulCopy: string }>('/api/crowd/current');
}

export async function joinCrowdSession(): Promise<{ participantCount: number }> {
  return await request<{ participantCount: number }>('/api/crowd/join', { method: 'POST' });
}

export async function submitCrowdResponse(type: 'text' | 'drawing', content: string): Promise<{ success: boolean; status: string; message: string }> {
  return await request<{ success: boolean; status: string; message: string }>('/api/crowd/submit', {
    method: 'POST',
    body: JSON.stringify({ type, content })
  });
}

export async function getCrowdSubmissions(): Promise<CrowdSubmission[]> {
  const res = await request<{ submissions: CrowdSubmission[] }>('/api/crowd/submissions');
  return res.submissions;
}

export function getLocalCalendarDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Daily Moment
export async function getDailyMoment(dateKey?: string): Promise<{ moment: DailyMoment; submissions: DailySubmission[] }> {
  const key = dateKey || getLocalCalendarDateKey();
  return await request<{ moment: DailyMoment; submissions: DailySubmission[] }>(`/api/daily?date=${key}`, {
    headers: { 'x-client-date': key }
  });
}

export async function submitDailyResponse(content: string, dateKey?: string): Promise<{ success: boolean }> {
  const key = dateKey || getLocalCalendarDateKey();
  return await request<{ success: boolean }>('/api/daily/submit', {
    method: 'POST',
    headers: { 'x-client-date': key },
    body: JSON.stringify({ content, dateKey: key })
  });
}

export async function reactToDailySubmission(id: string, dateKey?: string): Promise<{ success: boolean; reactions: number }> {
  const key = dateKey || getLocalCalendarDateKey();
  return await request<{ success: boolean; reactions: number }>(`/api/daily/react/${id}`, {
    method: 'POST',
    headers: { 'x-client-date': key },
    body: JSON.stringify({ dateKey: key })
  });
}

// Don't Press
export async function getDontPressSurprise(): Promise<{ title: string; flavor: string; task: string; actionType: string; seconds?: number; options?: string[] }> {
  return await request<{ title: string; flavor: string; task: string; actionType: string; seconds?: number; options?: string[] }>('/api/dont-press');
}

// Settle This
export async function createSettleCase(title: string, context: string, sideA: string, sideAName?: string): Promise<{ caseId: string; inviteUrl: string }> {
  return await request<{ caseId: string; inviteUrl: string }>('/api/settle', {
    method: 'POST',
    body: JSON.stringify({ title, context, sideA, sideAName })
  });
}

export async function getSettleCase(caseId: string): Promise<SettleCase> {
  return await request<SettleCase>(`/api/settle/${caseId}`);
}

export async function submitSettleSideB(caseId: string, sideB: string, sideBName?: string): Promise<SettleCase> {
  return await request<SettleCase>(`/api/settle/${caseId}/side-b`, {
    method: 'POST',
    body: JSON.stringify({ sideB, sideBName })
  });
}

// Future You
export async function generateFutureYou(decision: string): Promise<FutureDecision & { disclaimer: string }> {
  return await request<FutureDecision & { disclaimer: string }>('/api/future-you', {
    method: 'POST',
    body: JSON.stringify({ decision })
  });
}

// Reports
export async function submitReport(targetType: string, targetId: string, reason: string, details: string): Promise<{ success: boolean; message: string }> {
  return await request<{ success: boolean; message: string }>('/api/report', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, reason, details })
  });
}

// Admin (Protected)
export async function getAdminOverview(adminKey: string): Promise<AnalyticsSummary> {
  return await request<AnalyticsSummary>('/api/admin/overview', {
    headers: { 'x-admin-key': adminKey }
  });
}

export async function getAdminExperiences(adminKey: string): Promise<Experience[]> {
  const res = await request<{ experiences: Experience[] }>('/api/admin/experiences', {
    headers: { 'x-admin-key': adminKey }
  });
  return res.experiences;
}

export async function toggleAdminExperience(id: string, adminKey: string): Promise<{ success: boolean; active: boolean }> {
  return await request<{ success: boolean; active: boolean }>(`/api/admin/experiences/${id}/toggle`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  });
}

export async function getAdminModeration(adminKey: string): Promise<CrowdSubmission[]> {
  const res = await request<{ submissions: CrowdSubmission[] }>('/api/admin/moderation', {
    headers: { 'x-admin-key': adminKey }
  });
  return res.submissions;
}

export async function moderateSubmission(id: string, status: 'approved' | 'rejected' | 'removed', adminKey: string): Promise<{ success: boolean }> {
  return await request<{ success: boolean }>(`/api/admin/moderation/${id}`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
    body: JSON.stringify({ status })
  });
}

export async function getAdminReports(adminKey: string): Promise<ReportItem[]> {
  const res = await request<{ reports: ReportItem[] }>('/api/admin/reports', {
    headers: { 'x-admin-key': adminKey }
  });
  return res.reports;
}

export async function resolveAdminReport(id: string, adminKey: string): Promise<{ success: boolean }> {
  return await request<{ success: boolean }>(`/api/admin/reports/${id}/resolve`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey }
  });
}

/**
 * Returns the public origin for shareable recipient links.
 * In AI Studio Cloud Run development containers, the dev URL (`ais-dev-`) requires
 * developer authentication and returns HTTP 403 to unauthenticated/incognito users.
 * The shared URL (`ais-pre-`) is publicly accessible to any recipient without authentication.
 */
export function getPublicShareBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return origin.replace('ais-dev-', 'ais-pre-');
}

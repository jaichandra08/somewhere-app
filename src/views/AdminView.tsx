import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Activity,
  Database,
  Eye,
  AlertTriangle,
  Check,
  X,
  Trash2,
  RefreshCw,
  Search
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminExperiences,
  toggleAdminExperience,
  getAdminModeration,
  moderateSubmission,
  getAdminReports,
  resolveAdminReport
} from '../lib/api.ts';
import { AnalyticsSummary, Experience, CrowdSubmission, ReportItem } from '../types.ts';
import { playTap, playSuccess } from '../lib/sound.ts';

export const AdminView: React.FC = () => {
  const [adminKey, setAdminKey] = useState(
    sessionStorage.getItem('somewhere_admin_key') || ''
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'experiences' | 'moderation' | 'reports'>('overview');

  // Tab Data
  const [overview, setOverview] = useState<AnalyticsSummary | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [moderationList, setModerationList] = useState<CrowdSubmission[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchExp, setSearchExp] = useState('');

  const tryLogin = async (key: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await getAdminOverview(key);
      setOverview(data);
      sessionStorage.setItem('somewhere_admin_key', key);
      setAuthenticated(true);
      playSuccess();
    } catch (err: any) {
      setAuthError('Invalid admin key. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      tryLogin(adminKey);
    }
  }, []);

  const refreshTabData = async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await getAdminOverview(adminKey);
        setOverview(data);
      } else if (activeTab === 'experiences') {
        const list = await getAdminExperiences(adminKey);
        setExperiences(list);
      } else if (activeTab === 'moderation') {
        const mod = await getAdminModeration(adminKey);
        setModerationList(mod);
      } else if (activeTab === 'reports') {
        const reps = await getAdminReports(adminKey);
        setReports(reps);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTabData();
  }, [activeTab, authenticated]);

  const handleToggleExp = async (id: string) => {
    playTap();
    try {
      const res = await toggleAdminExperience(id, adminKey);
      setExperiences((prev) =>
        prev.map((e) => (e.id === id ? { ...e, active: res.active } : e))
      );
    } catch {
      // ignore
    }
  };

  const handleModerate = async (id: string, status: 'approved' | 'rejected' | 'removed') => {
    playTap();
    try {
      await moderateSubmission(id, status, adminKey);
      setModerationList((prev) => prev.filter((s) => s.id !== id));
      playSuccess();
    } catch {
      // ignore
    }
  };

  const handleResolveReport = async (id: string) => {
    playTap();
    try {
      await resolveAdminReport(id, adminKey);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r))
      );
      playSuccess();
    } catch {
      // ignore
    }
  };

  if (!authenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-16 flex flex-col gap-6 text-center">
        <div className="p-4 rounded-3xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50">
            SOMEWHERE™ Staff Access
          </h1>
          <p className="text-xs text-stone-500 max-w-xs">
            Enter your operator key to view operational analytics and moderation controls.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              tryLogin(adminKey);
            }}
            className="w-full flex flex-col gap-3 mt-2"
          >
            <input
              id="admin-key-input"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Operator Passcode"
              className="w-full text-center text-sm p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
            />
            {authError && (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {authError}
              </span>
            )}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredExperiences = experiences.filter(
    (e) =>
      e.title.toLowerCase().includes(searchExp.toLowerCase()) ||
      e.category.toLowerCase().includes(searchExp.toLowerCase())
  );

  return (
    <div id="admin-portal-view" className="w-full max-w-4xl mx-auto flex flex-col gap-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50">
              Operations & Moderation Desk
            </h1>
            <span className="text-xs text-stone-400">Authenticated Operator Session</span>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshTabData}
          className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs flex items-center gap-1 text-stone-600 dark:text-stone-400 hover:text-stone-900"
          title="Refresh data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          id="admin-tab-overview"
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'overview'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Realtime Overview
        </button>

        <button
          id="admin-tab-experiences"
          type="button"
          onClick={() => setActiveTab('experiences')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'experiences'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Catalog ({experiences.length || '...'})
        </button>

        <button
          id="admin-tab-moderation"
          type="button"
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'moderation'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Submissions Queue
        </button>

        <button
          id="admin-tab-reports"
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'reports'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          User Reports
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-emerald-600">Active Right Now (15m)</span>
            <span className="text-3xl font-bold font-serif">{overview.activeSessionsLast15m}</span>
            <span className="text-[11px] text-stone-400">Truthful human presence</span>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-stone-500">Total Sessions</span>
            <span className="text-3xl font-bold font-serif">{overview.totalSessions}</span>
            <span className="text-[11px] text-stone-400">Total unique sessions recorded</span>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-amber-600">Completions</span>
            <span className="text-3xl font-bold font-serif">{overview.totalCompletions}</span>
            <span className="text-[11px] text-stone-400">Tiny micro-moments finished</span>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-blue-600">Shares Dispatched</span>
            <span className="text-3xl font-bold font-serif">{overview.totalSharesCreated}</span>
            <span className="text-[11px] text-stone-400">A Little Company links sent</span>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-purple-600">Submissions Pool</span>
            <span className="text-3xl font-bold font-serif">{overview.totalSubmissions}</span>
            <span className="text-[11px] text-stone-400">Drawings & reflections shared</span>
          </div>

          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-1">
            <span className="text-xs font-bold text-rose-600">Open Reports</span>
            <span className="text-3xl font-bold font-serif">{overview.pendingReportsCount}</span>
            <span className="text-[11px] text-stone-400">Safety & bug tickets awaiting check</span>
          </div>
        </div>
      )}

      {/* TAB 2: EXPERIENCES CATALOG */}
      {activeTab === 'experiences' && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchExp}
              onChange={(e) => setSearchExp(e.target.value)}
              placeholder="Filter experiences..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            {filteredExperiences.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px]">
                      {exp.category}
                    </span>
                    <span className="text-stone-400">· {exp.durationSeconds}s</span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${exp.active !== false ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 text-rose-700'}`}>
                      {exp.active !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    {exp.title}
                  </span>
                  <span className="text-stone-500 line-clamp-1">{exp.prompt}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleExp(exp.id)}
                  className={`py-2 px-3.5 rounded-xl font-semibold text-xs transition-colors ${
                    exp.active !== false
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {exp.active !== false ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Submissions under review or live in pool</span>
            <span>{moderationList.length} total</span>
          </div>

          {moderationList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {moderationList.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-stone-400 pb-2 border-b border-stone-100 dark:border-stone-800 mb-2">
                      <span className="uppercase font-bold text-[10px]">{sub.type}</span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {sub.status}
                      </span>
                    </div>

                    {sub.type === 'drawing' ? (
                      <div className="w-full h-36 bg-white border border-stone-200 rounded-xl overflow-hidden flex items-center justify-center">
                        <img
                          src={sub.content}
                          alt="Submission"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <p className="text-stone-800 dark:text-stone-200 italic">
                        "{sub.content}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => handleModerate(sub.id, 'approved')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate(sub.id, 'rejected')}
                      className="py-1.5 px-3 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate(sub.id, 'removed')}
                      className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              Queue is clear. No submissions require manual intervention.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: USER REPORTS */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Safety and technical reports submitted by users</span>
            <span>{reports.length} total</span>
          </div>

          {reports.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex flex-col gap-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-600">{rep.reason}</span>
                      <span className="text-stone-400 font-mono">[{rep.targetType} / {rep.targetId}]</span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${rep.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {rep.status}
                      </span>
                    </div>
                    {rep.details && (
                      <p className="text-stone-700 dark:text-stone-300 mt-1">
                        "{rep.details}"
                      </p>
                    )}
                    <span className="text-[10px] text-stone-400">
                      Logged {new Date(rep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {rep.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id)}
                      className="py-1.5 px-3 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold shrink-0"
                    >
                      Resolve Ticket
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              Zero open safety or bug reports.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Search, Clock, Sparkles, Filter, X, Bookmark } from 'lucide-react';
import { getExperiences, toggleSaveExperience } from '../lib/api.ts';
import { getSavedIds } from '../lib/storage.ts';
import { Experience, ExperienceCategory } from '../types.ts';
import { playTap, playPop } from '../lib/sound.ts';

interface ExploreViewProps {
  onSelectExperience: (experience: Experience) => void;
  onNavigate: (path: string) => void;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'FUNNY', label: 'Funny' },
  { id: 'MICRO-MISSION', label: 'Missions' },
  { id: 'CREATIVE', label: 'Creative' },
  { id: 'OBSERVATION', label: 'Observation' },
  { id: 'QUIET', label: 'Quiet' },
  { id: 'SOCIAL-PRESENCE', label: 'Crowd' },
  { id: 'DECISION', label: 'Decisions' },
  { id: 'REFLECTION', label: 'Reflection' },
  { id: 'COMPANY', label: 'Company' },
  { id: 'SURPRISE', label: 'Surprise' }
];

const DURATIONS = [
  { label: 'Any time', maxSec: undefined },
  { label: '≤ 30s', maxSec: 30 },
  { label: '≤ 1 min', maxSec: 60 },
  { label: '≤ 2 min', maxSec: 120 }
];

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectExperience, onNavigate }) => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    setSavedIds(getSavedIds());
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedDuration]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getExperiences({
        category: selectedCategory,
        maxDuration: selectedDuration,
        search: search.trim() || undefined
      });
      setExperiences(list);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSaveCard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playPop();
    try {
      const res = await toggleSaveExperience(id);
      setSavedIds((prev) =>
        res.saved ? [...prev, id] : prev.filter((item) => item !== id)
      );
    } catch {
      // fallback
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    playTap();
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedDuration(undefined);
  };

  return (
    <div id="explore-view" className="w-full max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-50">
          Explore Experiences
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Over 100 tiny missions, quiet resets, and curious observations.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="explore-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by keywords, objects, or mood (e.g., drawing, coffee, window)..."
          className="w-full pl-10 pr-20 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              loadData();
            }}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          id="explore-search-submit-btn"
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 py-1.5 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
        >
          Go
        </button>
      </form>

      {/* Filter Row: Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            id={`category-chip-${cat.id.toLowerCase()}`}
            type="button"
            onClick={() => {
              playTap();
              setSelectedCategory(cat.id);
            }}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold'
                : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Duration Pills */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-stone-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Duration:
        </span>
        {DURATIONS.map((d, i) => (
          <button
            key={i}
            id={`duration-filter-${i}`}
            type="button"
            onClick={() => {
              playTap();
              setSelectedDuration(d.maxSec);
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedDuration === d.maxSec
                ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>Showing {experiences.length} experiences</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-32 rounded-2xl bg-stone-100 dark:bg-stone-900 animate-pulse border border-stone-200/50 dark:border-stone-800/50"
            />
          ))}
        </div>
      ) : experiences.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {experiences.map((exp) => (
            <button
              key={exp.id}
              id={`experience-card-${exp.slug}`}
              type="button"
              onClick={() => {
                playTap();
                onSelectExperience(exp);
                onNavigate(`/experience/${exp.id}`);
              }}
              className="group p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-xs transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between gap-3 min-h-[120px]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {exp.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {exp.durationSeconds}s
                  </span>
                  <button
                    id={`bookmark-card-btn-${exp.slug}`}
                    type="button"
                    onClick={(e) => handleToggleSaveCard(e, exp.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      savedIds.includes(exp.id)
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-stone-300 dark:text-stone-600 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                    title={savedIds.includes(exp.id) ? 'Saved' : 'Save for later'}
                    aria-label={savedIds.includes(exp.id) ? 'Saved' : 'Save for later'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedIds.includes(exp.id) ? 'fill-current text-amber-500' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base leading-snug group-hover:text-stone-700 dark:group-hover:text-stone-200">
                  {exp.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                  {exp.prompt}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {exp.moodTags.slice(0, 2).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          id="explore-empty-state"
          className="p-12 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 text-center flex flex-col items-center gap-3"
        >
          <Sparkles className="w-8 h-8 text-stone-300" />
          <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
            No match. Try something stranger.
          </h3>
          <p className="text-xs text-stone-500 max-w-sm">
            We couldn't find an experience matching those exact filters.
          </p>
          <button
            id="reset-explore-filters-btn"
            type="button"
            onClick={handleResetFilters}
            className="mt-2 py-2.5 px-5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

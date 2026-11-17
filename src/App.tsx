import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, TrendingUp, X } from 'lucide-react';
import { CategorySidebar } from './components/CategorySidebar';
import { PostVideoModal } from './components/PostVideoModal';
import { SavedCollectionView } from './components/SavedCollectionView';
import { SettingsModal } from './components/SettingsModal';
import { SpotlightPlayerModal } from './components/SpotlightPlayerModal';
import { TopBar } from './components/TopBar';
import { TrendingRankingSection } from './components/TrendingRankingSection';
import { VideoCard } from './components/VideoCard';
import { INITIAL_VIDEOS } from './data/initialVideos';
import { DEFAULT_USER_SETTINGS, UserSettings } from './types/settings';
import { CategoryId, NewVideoInput, PRVideo, TrendingPeriod, ViewMode } from './types/video';
import { prAudioEngine } from './utils/prAudioEngine';
import {
  CATEGORIES,
  computeTrendingRankings,
  extractTrendingHashtags,
  filterVideos,
  getCategoryMeta,
  parseHashtags,
} from './utils/videoUtils';

const SETTINGS_STORAGE_KEY = 'prone-settings-v1';
const BOOKMARKS_STORAGE_KEY = 'prone-bookmarks-v1';
const LIKES_STORAGE_KEY = 'prone-likes-v1';

function loadInitialSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_USER_SETTINGS.notifications,
        ...(parsed.notifications ?? {}),
      },
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

function loadInitialVideos(): PRVideo[] {
  try {
    const rawBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    const rawLikes = localStorage.getItem(LIKES_STORAGE_KEY);
    const bookmarkSet = rawBookmarks ? new Set<string>(JSON.parse(rawBookmarks) as string[]) : null;
    const likeSet = rawLikes ? new Set<string>(JSON.parse(rawLikes) as string[]) : null;

    return INITIAL_VIDEOS.map((video) => {
      const bookmarked = bookmarkSet ? bookmarkSet.has(video.id) : Boolean(video.bookmarked);
      const wasLikedDefault = Boolean(video.liked);
      const liked = likeSet ? likeSet.has(video.id) : wasLikedDefault;
      const likesDelta = liked === wasLikedDefault ? 0 : liked ? 1 : -1;

      return {
        ...video,
        bookmarked,
        liked,
        likes: Math.max(0, video.likes + likesDelta),
      };
    });
  } catch {
    return INITIAL_VIDEOS;
  }
}

export default function App() {
  const [videos, setVideos] = useState<PRVideo[]>(loadInitialVideos);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [trendingPeriod, setTrendingPeriod] = useState<TrendingPeriod>('weekly');
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [theaterVideoId, setTheaterVideoId] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [settings, setSettings] = useState<UserSettings>(loadInitialSettings);
  const [isMuted, setIsMuted] = useState<boolean>(() => loadInitialSettings().defaultMuted);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync theme class (.dark) and persist user settings
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage write errors
    }
  }, [settings]);

  // Persist bookmarked and liked video IDs
  useEffect(() => {
    try {
      const bookmarkedIds = videos.filter((v) => v.bookmarked).map((v) => v.id);
      const likedIds = videos.filter((v) => v.liked).map((v) => v.id);
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarkedIds));
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likedIds));
    } catch {
      // Ignore storage errors
    }
  }, [videos]);

  // Cmd/Ctrl + K or "/" focuses search bar (Raycast/Linear ergonomics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      all: videos.length,
      politics: 0,
      local: 0,
      school: 0,
      personal: 0,
      business: 0,
    };
    for (const v of videos) {
      counts[v.category] += 1;
    }
    return counts;
  }, [videos]);

  const savedCategoryCounts = useMemo(() => {
    const saved = videos.filter((v) => v.bookmarked);
    const counts: Record<CategoryId, number> = {
      all: saved.length,
      politics: 0,
      local: 0,
      school: 0,
      personal: 0,
      business: 0,
    };
    for (const v of saved) {
      counts[v.category] += 1;
    }
    return counts;
  }, [videos]);

  const savedCount = savedCategoryCounts.all;

  const trendingHashtags = useMemo(
    () => extractTrendingHashtags(videos, 8),
    [videos]
  );

  const filteredVideos = useMemo(() => {
    return filterVideos(videos, {
      category: selectedCategory,
      query: searchQuery,
      onlyBookmarked: viewMode === 'saved',
      sortBy: viewMode === 'trending' ? 'popular' : 'latest',
    });
  }, [videos, selectedCategory, searchQuery, viewMode]);

  const rankedVideos = useMemo(
    () => computeTrendingRankings(filteredVideos, trendingPeriod, 5),
    [filteredVideos, trendingPeriod]
  );

  const weeklyTopHighlight = useMemo(
    () => computeTrendingRankings(videos, 'weekly', 1)[0] ?? null,
    [videos]
  );

  const activeTheaterVideo = useMemo(
    () => videos.find((v) => v.id === theaterVideoId) ?? null,
    [videos, theaterVideoId]
  );

  const handleTogglePreview = useCallback((videoId: string) => {
    prAudioEngine.unlock();
    setPreviewPlayingId((prev) => {
      if (prev === videoId) {
        prAudioEngine.stopAll();
        return null;
      }
      return videoId;
    });
  }, []);

  const handleOpenTheater = useCallback((videoId: string) => {
    prAudioEngine.unlock();
    setPreviewPlayingId(null);
    setTheaterVideoId(videoId);
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, views: v.views + 1 } : v))
    );
  }, []);

  const handleToggleLike = useCallback((videoId: string) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;
        const nextLiked = !v.liked;
        return {
          ...v,
          liked: nextLiked,
          likes: nextLiked ? v.likes + 1 : Math.max(0, v.likes - 1),
        };
      })
    );
  }, []);

  const handleToggleBookmark = useCallback((videoId: string) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, bookmarked: !v.bookmarked } : v
      )
    );
  }, []);

  const handleSelectHashtag = useCallback((tag: string) => {
    setSearchQuery((prev) => (prev.trim().toLowerCase() === tag.toLowerCase() ? '' : tag));
  }, []);

  const handleUpdateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    setIsMuted(next.defaultMuted);
  }, []);

  const handleCreateVideo = useCallback((input: NewVideoInput) => {
    prAudioEngine.unlock();
    const hashtags = parseHashtags(input.hashtagsInput);
    const initials = input.creatorName.trim().slice(0, 1).toUpperCase() || 'P';
    const newId = `prone-user-${Date.now()}`;

    const created: PRVideo = {
      id: newId,
      title: input.title,
      summary: input.summary,
      category: input.category,
      durationSec: input.durationSec,
      creatorName: input.creatorName,
      creatorHandle: `@${input.creatorName.replace(/\s+/g, '_').toLowerCase().slice(0, 14)}`,
      creatorRole: input.creatorRole,
      creatorInitials: initials,
      creatorAccent: '#5E6AD2',
      hashtags: hashtags.length > 0 ? hashtags : ['#PROne', '#60秒PR'],
      thumbnailUrl: input.thumbnailUrl,
      videoUrl: input.videoUrl,
      captions:
        input.captions && input.captions.length > 0
          ? input.captions
          : [
              { timeSec: 0, text: `00:00 — ${input.title}` },
              { timeSec: Math.floor(input.durationSec * 0.45), text: input.summary },
            ],
      views: 1,
      likes: 0,
      postedAtLabel: 'たった今',
      createdAtTs: Date.now(),
      liked: false,
      bookmarked: false,
    };

    setVideos((prev) => [created, ...prev]);
    setViewMode('timeline');
    setSelectedCategory(input.category);
    setSearchQuery('');
    setPreviewPlayingId(newId);
  }, []);

  const activeCategoryMeta = getCategoryMeta(selectedCategory);

  return (
    <div id="top" className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col">
      <TopBar
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          setPreviewPlayingId(null);
          prAudioEngine.stopAll();
        }}
        onOpenPostModal={() => setIsPostModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        savedCount={savedCount}
      />

      <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col lg:flex-row">
        <CategorySidebar
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setPreviewPlayingId(null);
            prAudioEngine.stopAll();
          }}
          categoryCounts={viewMode === 'saved' ? savedCategoryCounts : categoryCounts}
          trendingHashtags={trendingHashtags}
          activeQuery={searchQuery}
          onSelectHashtag={handleSelectHashtag}
        />

        <main className="flex-1 min-w-0 py-6 lg:pl-7 space-y-5">
          {/* Workspace Header + Search Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)] text-balance">
                  {viewMode === 'saved'
                    ? 'お気に入り・保存済み'
                    : viewMode === 'trending'
                      ? `人気順 · ${activeCategoryMeta.label}`
                      : activeCategoryMeta.label}
                </h1>
                <span className="text-xs font-mono tabular-nums text-[var(--text-subtle)]">
                  {filteredVideos.length}件
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[var(--text-muted)]">
                {viewMode === 'saved'
                  ? '保存した60秒PR動画をカテゴリ別に整理して、すぐにプレビュー再生・SNS共有できます。'
                  : viewMode === 'trending'
                    ? '再生数・いいね数の伸び率から急上昇中の60秒PR動画をランキング表示します。'
                    : activeCategoryMeta.description}
              </p>
            </div>

            {/* Raycast/Linear Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search
                className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル・投稿者・#ハッシュタグで検索"
                aria-label="PR動画を検索"
                className="w-full pl-9 pr-16 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs sm:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="検索をクリア"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-subtle)] bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded pointer-events-none">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Minimal Horizontal Category Tabs (shown in timeline & trending) */}
          {viewMode !== 'saved' && (
            <div
              role="tablist"
              aria-label="カテゴリ絞り込み"
              className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1"
            >
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPreviewPlayingId(null);
                      prAudioEngine.stopAll();
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white'
                        : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Timeline <-> Trending Quick Switch Strip */}
          {viewMode === 'timeline' && weeklyTopHighlight && !searchQuery.trim() && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <TrendingUp className="w-4 h-4 text-[#5E6AD2] shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--text-secondary)] shrink-0">
                  週間トレンド1位:
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenTheater(weeklyTopHighlight.video.id)}
                  className="text-xs font-medium text-[var(--text-primary)] hover:text-[#5E6AD2] truncate cursor-pointer transition-colors"
                >
                  {weeklyTopHighlight.video.title}
                </button>
                <span className="hidden sm:inline text-xs font-mono tabular-nums text-[#5E6AD2] shrink-0">
                  {weeklyTopHighlight.growthLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTrendingPeriod('weekly');
                  setViewMode('trending');
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#5E6AD2] hover:opacity-80 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>ランキングを見る</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Dedicated Trending Ranking Section in Popular/Trending Tab */}
          {viewMode === 'trending' && rankedVideos.length > 0 && (
            <TrendingRankingSection
              rankings={rankedVideos}
              period={trendingPeriod}
              onChangePeriod={setTrendingPeriod}
              onOpenTheater={handleOpenTheater}
              onTogglePreview={handleTogglePreview}
              previewPlayingId={previewPlayingId}
            />
          )}

          {/* Active Search Filter Indicator */}
          {searchQuery.trim() && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs">
              <span className="text-[var(--text-muted)]">
                絞り込み条件:{' '}
                <strong className="text-[var(--text-primary)] font-medium">{searchQuery}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#5E6AD2] hover:opacity-80 font-medium cursor-pointer whitespace-nowrap"
              >
                条件を解除
              </button>
            </div>
          )}

          {/* Main Content Area: Saved Collection View OR Timeline/Trending Grid */}
          {viewMode === 'saved' ? (
            <SavedCollectionView
              savedVideos={filteredVideos}
              allSavedVideosCountByCategory={savedCategoryCounts}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setPreviewPlayingId(null);
                prAudioEngine.stopAll();
              }}
              previewPlayingId={previewPlayingId}
              isMuted={isMuted}
              volume={settings.volume}
              enableNarration={settings.enableNarration}
              showCaptions={settings.showCaptions}
              onToggleMute={() => setIsMuted((m) => !m)}
              onTogglePreview={handleTogglePreview}
              onOpenTheater={handleOpenTheater}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
              onSelectHashtag={handleSelectHashtag}
              onBackToTimeline={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setViewMode('timeline');
              }}
            />
          ) : filteredVideos.length > 0 ? (
            <section
              aria-label="60秒PR動画タイムライン"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isPreviewPlaying={previewPlayingId === video.id}
                  isMuted={isMuted}
                  volume={settings.volume}
                  enableNarration={settings.enableNarration}
                  showCaptions={settings.showCaptions}
                  onToggleMute={() => setIsMuted((m) => !m)}
                  onTogglePreview={handleTogglePreview}
                  onOpenTheater={handleOpenTheater}
                  onToggleLike={handleToggleLike}
                  onToggleBookmark={handleToggleBookmark}
                  onSelectHashtag={handleSelectHashtag}
                />
              ))}
            </section>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl py-16 px-6 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                該当する60秒PR動画が見つかりませんでした
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                検索キーワードや選択中のカテゴリを変更するか、新しい1分PR動画を投稿してみましょう。
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setViewMode('timeline');
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                >
                  すべて表示に戻す
                </button>
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  PR動画を投稿する
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <SpotlightPlayerModal
        video={activeTheaterVideo}
        queue={filteredVideos}
        isMuted={isMuted}
        volume={settings.volume}
        enableNarration={settings.enableNarration}
        defaultPlaybackRate={settings.defaultPlaybackRate}
        onToggleMute={() => setIsMuted((m) => !m)}
        onChangeVolume={(vol) =>
          setSettings((prev) => ({ ...prev, volume: vol }))
        }
        onClose={() => setTheaterVideoId(null)}
        onSelectVideo={(id) => handleOpenTheater(id)}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onSelectHashtag={handleSelectHashtag}
      />

      <PostVideoModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSubmit={handleCreateVideo}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}

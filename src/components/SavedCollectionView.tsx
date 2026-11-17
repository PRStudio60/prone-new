import React, { useState } from 'react';
import { Bookmark, FolderKanban, LayoutGrid } from 'lucide-react';
import { CategoryId, PRVideo } from '../types/video';
import { CATEGORIES, groupVideosByCategory } from '../utils/videoUtils';
import { VideoCard } from './VideoCard';

interface SavedCollectionViewProps {
  savedVideos: PRVideo[];
  allSavedVideosCountByCategory: Record<CategoryId, number>;
  selectedCategory: CategoryId;
  onSelectCategory: (cat: CategoryId) => void;
  previewPlayingId: string | null;
  isMuted: boolean;
  volume: number;
  enableNarration: boolean;
  showCaptions: boolean;
  onToggleMute: () => void;
  onTogglePreview: (videoId: string) => void;
  onOpenTheater: (videoId: string) => void;
  onToggleLike: (videoId: string) => void;
  onToggleBookmark: (videoId: string) => void;
  onSelectHashtag: (tag: string) => void;
  onBackToTimeline: () => void;
}

export const SavedCollectionView: React.FC<SavedCollectionViewProps> = ({
  savedVideos,
  allSavedVideosCountByCategory,
  selectedCategory,
  onSelectCategory,
  previewPlayingId,
  isMuted,
  volume,
  enableNarration,
  showCaptions,
  onToggleMute,
  onTogglePreview,
  onOpenTheater,
  onToggleLike,
  onToggleBookmark,
  onSelectHashtag,
  onBackToTimeline,
}) => {
  const [groupMode, setGroupMode] = useState<'grouped' | 'flat'>('grouped');

  const grouped = groupVideosByCategory(savedVideos);

  return (
    <div className="space-y-5">
      {/* Saved Collection Control Toolbar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#5E6AD2]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              保存済みコレクションをカテゴリ別に整理
            </h2>
          </div>

          <div
            role="group"
            aria-label="表示レイアウト切替"
            className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)]"
          >
            <button
              type="button"
              onClick={() => setGroupMode('grouped')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                groupMode === 'grouped'
                  ? 'bg-[#5E6AD2] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />
              <span>カテゴリ別整理</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupMode('flat')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                groupMode === 'flat'
                  ? 'bg-[#5E6AD2] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>すべて一覧</span>
            </button>
          </div>
        </div>

        {/* Saved-Count Category Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORIES.map((cat) => {
            const count = allSavedVideosCountByCategory[cat.id] ?? 0;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#5E6AD2]/18 border-[#5E6AD2] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[11px] tabular-nums opacity-80">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {savedVideos.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl py-16 px-6 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            このカテゴリに保存済みのPR動画はありません
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            気になる60秒PR動画のブックマークアイコンを押すと、カテゴリごとに整理されていつでもプレビュー再生できます。
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
              >
                保存済みのすべてを表示
              </button>
            )}
            <button
              type="button"
              onClick={onBackToTimeline}
              className="px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] text-xs font-medium text-white transition-colors cursor-pointer"
            >
              タイムラインで探す
            </button>
          </div>
        </div>
      ) : groupMode === 'grouped' ? (
        <div className="space-y-7">
          {grouped.map((group) => (
            <section
              key={group.category.id}
              aria-label={`${group.category.label}の保存済み動画`}
              className="space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {group.category.label}
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-[var(--text-subtle)]">
                    {group.videos.length}本
                  </span>
                </div>
                <span className="text-xs text-[var(--text-subtle)] hidden sm:inline">
                  {group.category.description}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isPreviewPlaying={previewPlayingId === video.id}
                    isMuted={isMuted}
                    volume={volume}
                    enableNarration={enableNarration}
                    showCaptions={showCaptions}
                    onToggleMute={onToggleMute}
                    onTogglePreview={onTogglePreview}
                    onOpenTheater={onOpenTheater}
                    onToggleLike={onToggleLike}
                    onToggleBookmark={onToggleBookmark}
                    onSelectHashtag={onSelectHashtag}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {savedVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isPreviewPlaying={previewPlayingId === video.id}
              isMuted={isMuted}
              volume={volume}
              enableNarration={enableNarration}
              showCaptions={showCaptions}
              onToggleMute={onToggleMute}
              onTogglePreview={onTogglePreview}
              onOpenTheater={onOpenTheater}
              onToggleLike={onToggleLike}
              onToggleBookmark={onToggleBookmark}
              onSelectHashtag={onSelectHashtag}
            />
          ))}
        </div>
      )}
    </div>
  );
};

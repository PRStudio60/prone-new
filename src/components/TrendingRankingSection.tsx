import React from 'react';
import { ArrowUpRight, Eye, Heart, Play, TrendingUp } from 'lucide-react';
import { RankedVideoItem, TrendingPeriod } from '../types/video';
import { formatCompactCount, formatTimer, getCategoryMeta } from '../utils/videoUtils';

interface TrendingRankingSectionProps {
  rankings: RankedVideoItem[];
  period: TrendingPeriod;
  onChangePeriod: (period: TrendingPeriod) => void;
  onOpenTheater: (videoId: string) => void;
  onTogglePreview: (videoId: string) => void;
  previewPlayingId: string | null;
}

export const TrendingRankingSection: React.FC<TrendingRankingSectionProps> = ({
  rankings,
  period,
  onChangePeriod,
  onOpenTheater,
  onTogglePreview,
  previewPlayingId,
}) => {
  if (rankings.length === 0) return null;

  return (
    <section
      aria-label="トレンド・ランキング"
      className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5E6AD2]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            トレンド・ランキング
          </h2>
          <span className="text-xs text-[var(--text-subtle)]">
            · 再生数・いいね数が急上昇中の60秒PR
          </span>
        </div>

        {/* Period Switcher */}
        <div
          role="group"
          aria-label="ランキング集計期間"
          className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)]"
        >
          <button
            type="button"
            onClick={() => onChangePeriod('weekly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              period === 'weekly'
                ? 'bg-[#5E6AD2] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            週間急上昇
          </button>
          <button
            type="button"
            onClick={() => onChangePeriod('alltime')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              period === 'alltime'
                ? 'bg-[#5E6AD2] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            累計人気
          </button>
        </div>
      </div>

      {/* Ranked Rows */}
      <div className="divide-y divide-[var(--border-hairline)]">
        {rankings.map(({ rank, video, growthLabel }) => {
          const cat = getCategoryMeta(video.category);
          const isPreviewing = previewPlayingId === video.id;

          return (
            <div
              key={video.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-[var(--bg-input)]/45 transition-colors"
            >
              {/* Rank Number + Thumbnail */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span
                  className={`w-6 text-center font-mono text-sm font-semibold tabular-nums shrink-0 ${
                    rank <= 3 ? 'text-[#5E6AD2]' : 'text-[var(--text-subtle)]'
                  }`}
                >
                  {String(rank).padStart(2, '0')}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenTheater(video.id)}
                  className="relative w-24 h-14 rounded-lg overflow-hidden border border-[var(--border-hairline)] shrink-0 bg-[#0F1117] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]"
                  aria-label={`${video.title}を視聴`}
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {video.isSample && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#D97706] text-[9px] font-mono font-semibold tracking-wider uppercase text-white">
                      SAMPLE
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-[#0F1117]/85 text-[10px] font-mono tabular-nums text-[#F1F3F9]">
                    {formatTimer(video.durationSec)}
                  </span>
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => onOpenTheater(video.id)}
                    className="text-left text-[13px] sm:text-sm font-semibold text-[var(--text-primary)] hover:text-[#5E6AD2] transition-colors line-clamp-1 cursor-pointer"
                  >
                    {video.title}
                  </button>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--text-muted)]">
                    <span>{cat.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{video.creatorName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#5E6AD2] font-mono tabular-nums font-medium">
                      {growthLabel}
                    </span>
                    {video.isSample && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px] text-[var(--text-subtle)]">
                          ※サンプル動画
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics + Quick Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 pl-9 sm:pl-0 shrink-0">
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[var(--text-subtle)]">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatCompactCount(video.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatCompactCount(video.likes)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTogglePreview(video.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-150 hover:scale-[1.03] active:scale-[0.96] whitespace-nowrap cursor-pointer ${
                      isPreviewing
                        ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white shadow-[0_0_14px_rgba(94,106,210,0.45)]'
                        : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[#5E6AD2] hover:shadow-[0_0_10px_rgba(94,106,210,0.25)]'
                    }`}
                  >
                    <Play
                      className={`w-3 h-3 ${
                        isPreviewing ? 'fill-current' : 'text-[#5E6AD2] fill-[#5E6AD2]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{isPreviewing ? '再生中' : 'プレビュー'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTheater(video.id)}
                    aria-label={`${video.title}を拡大視聴`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[var(--bg-input)] border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

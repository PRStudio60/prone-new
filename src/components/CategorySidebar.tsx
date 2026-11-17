import React from 'react';
import { CategoryId } from '../types/video';
import { CATEGORIES } from '../utils/videoUtils';

interface CategorySidebarProps {
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  categoryCounts: Record<CategoryId, number>;
  trendingHashtags: { tag: string; count: number }[];
  activeQuery: string;
  onSelectHashtag: (tag: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  trendingHashtags,
  activeQuery,
  onSelectHashtag,
}) => {
  return (
    <aside
      aria-label="カテゴリフィルター"
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--border-hairline)] py-6 pr-5 gap-7"
    >
      {/* Category List */}
      <div className="space-y-2">
        <p className="px-2.5 text-xs font-medium text-[var(--text-subtle)]">
          カテゴリ
        </p>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                  active
                    ? 'bg-[#5E6AD2]/15 border-[#5E6AD2] text-[var(--text-primary)]'
                    : 'bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="truncate">{cat.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums shrink-0 ${
                    active ? 'text-[#5E6AD2] dark:text-[#A6B0FA]' : 'text-[var(--text-subtle)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trending Hashtags (Unboxed clean text links) */}
      <div className="space-y-2.5 pt-5 border-t border-[var(--border-hairline)]">
        <p className="px-2.5 text-xs font-medium text-[var(--text-subtle)]">
          注目のハッシュタグ
        </p>
        <div className="flex flex-col px-2.5 gap-1.5">
          {trendingHashtags.map(({ tag, count }) => {
            const isSelected = activeQuery.trim().toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectHashtag(isSelected ? '' : tag)}
                className={`flex items-center justify-between text-xs py-1 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:text-[#5E6AD2] ${
                  isSelected
                    ? 'text-[#5E6AD2] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="truncate">{tag}</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--text-subtle)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Concise 60-Second Rule Note */}
      <div className="mt-auto px-2.5 pt-5 border-t border-[var(--border-hairline)]">
        <p className="text-xs font-medium text-[var(--text-secondary)]">すべて1分（60秒）</p>
        <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed mt-1">
          PROneのPR動画はすべて最大60秒の固定長。移動中やスキマ時間で要点を把握できます。
        </p>
      </div>
    </aside>
  );
};

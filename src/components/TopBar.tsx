import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { ViewMode } from '../types/video';
import { PROneLogoMark } from './PROneLogoMark';

interface TopBarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenPostModal: () => void;
  onOpenSettingsModal: () => void;
  savedCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onChangeViewMode,
  onOpenPostModal,
  onOpenSettingsModal,
  savedCount,
}) => {
  const navItems: { id: ViewMode; label: string }[] = [
    { id: 'timeline', label: 'タイムライン' },
    { id: 'trending', label: '人気順' },
    { id: 'saved', label: `保存済み (${savedCount})` },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--border-hairline)]">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Symbol + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onChangeViewMode('timeline');
          }}
          className="group inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] rounded-lg"
        >
          <PROneLogoMark className="w-7 h-7 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:drop-shadow-[0_0_10px_rgba(94,106,210,0.45)] group-active:scale-95" />
          <span>PROne</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="メインナビゲーション"
          className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm font-medium overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = viewMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeViewMode(item.id)}
                className={`relative py-4 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-[var(--text-primary)] ${
                  active
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="font-sans tabular-nums">{item.label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5E6AD2] shadow-[0_0_8px_rgba(94,106,210,0.75)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action + Settings Gear */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPostModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] hover:shadow-[0_0_18px_rgba(94,106,210,0.45)] hover:scale-[1.02] active:scale-[0.97] text-white text-xs sm:text-sm font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>投稿する</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettingsModal}
            aria-label="設定を開く"
            title="設定"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#5E6AD2]/60 hover:scale-[1.03] active:scale-[0.96] transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

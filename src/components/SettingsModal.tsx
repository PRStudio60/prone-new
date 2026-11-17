import React, { useEffect } from 'react';
import { Bell, Moon, RotateCcw, Sun, Volume2, X } from 'lucide-react';
import { DEFAULT_USER_SETTINGS, ThemeMode, UserSettings } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <p className="text-xs sm:text-[13px] font-medium text-[var(--text-primary)]">{label}</p>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
        checked
          ? 'bg-[#5E6AD2] border-[#5E6AD2]'
          : 'bg-[var(--bg-input)] border-[var(--border-hairline)]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setTheme = (theme: ThemeMode) => {
    onUpdateSettings({ ...settings, theme });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
          <div>
            <h2 id="settings-modal-title" className="text-base font-semibold text-[var(--text-primary)]">
              設定
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              外観テーマ、通知、60秒プレイヤーの音声・再生設定を管理します。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
            aria-label="設定を閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Switcher */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            {settings.theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
            )}
            <span>外観テーマ</span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                settings.theme === 'dark'
                  ? 'bg-[#5E6AD2] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ダーク（Charcoal）</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                settings.theme === 'light'
                  ? 'bg-[#5E6AD2] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ライト（Clean）</span>
            </button>
          </div>
        </section>

        {/* 2. Audio & Playback Preferences */}
        <section className="space-y-2 pt-4 border-t border-[var(--border-hairline)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <Volume2 className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
            <span>音声・プレイヤー設定</span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            <ToggleRow
              label="音声オンで再生を開始"
              description="60秒プレビューおよび拡大視聴を開いた際、ミュートを解除して音声を出力します。"
              checked={!settings.defaultMuted}
              onChange={(unmuted) =>
                onUpdateSettings({ ...settings, defaultMuted: !unmuted })
              }
            />
            <ToggleRow
              label="PRキャプションの音声ナレーション"
              description="音声トラックがないPR動画でも、字幕に沿った日本語読み上げとBGMを再生します。"
              checked={settings.enableNarration}
              onChange={(enableNarration) =>
                onUpdateSettings({ ...settings, enableNarration })
              }
            />
            <ToggleRow
              label="プレビュー中の字幕オーバーレイ"
              description="再生中のカード下部に1分要約キャプションを表示します。"
              checked={settings.showCaptions}
              onChange={(showCaptions) =>
                onUpdateSettings({ ...settings, showCaptions })
              }
            />
          </div>

          {/* Volume Slider + Playback Speed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-secondary)]">標準音量</span>
                <span className="font-mono tabular-nums text-[var(--text-muted)]">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, volume: Number(e.target.value) })
                }
                aria-label="標準音量"
                className="w-full accent-[#5E6AD2] cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] space-y-2">
              <span className="block text-xs font-medium text-[var(--text-secondary)]">
                既定の再生速度
              </span>
              <div className="flex items-center gap-1.5">
                {([1, 1.25, 1.5] as const).map((rate) => {
                  const active = settings.defaultPlaybackRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, defaultPlaybackRate: rate })
                      }
                      className={`flex-1 py-1 rounded text-xs font-mono tabular-nums border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white'
                          : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {rate === 1 ? '1.0x' : `${rate}x`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Notification Settings */}
        <section className="space-y-1 pt-4 border-t border-[var(--border-hairline)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-1">
            <Bell className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
            <span>通知設定</span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            <ToggleRow
              label="関心カテゴリの公開通知"
              description="選択中カテゴリに新しい60秒PR動画が追加された際に通知します。"
              checked={settings.notifications.newFromFollowing}
              onChange={(val) =>
                onUpdateSettings({
                  ...settings,
                  notifications: { ...settings.notifications, newFromFollowing: val },
                })
              }
            />
            <ToggleRow
              label="いいね・保存のアクティビティ"
              description="投稿したPR動画へのリアクションをタイムライン上で受け取ります。"
              checked={settings.notifications.likesAndSaves}
              onChange={(val) =>
                onUpdateSettings({
                  ...settings,
                  notifications: { ...settings.notifications, likesAndSaves: val },
                })
              }
            />
            <ToggleRow
              label="週次ピックアップダイジェスト"
              description="注目ハッシュタグの上位60秒PRを毎週月曜日にまとめて受け取ります。"
              checked={settings.notifications.weeklyDigest}
              onChange={(val) =>
                onUpdateSettings({
                  ...settings,
                  notifications: { ...settings.notifications, weeklyDigest: val },
                })
              }
            />
          </div>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_USER_SETTINGS)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>初期設定に戻す</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};

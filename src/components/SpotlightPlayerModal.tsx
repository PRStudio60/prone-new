import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Eye,
  Heart,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { PRVideo } from '../types/video';
import { prAudioEngine } from '../utils/prAudioEngine';
import { useVideoSeo } from '../utils/seoUtils';
import {
  computeProgressRatio,
  formatCompactCount,
  formatTimer,
  getActiveCaption,
  getCategoryMeta,
} from '../utils/videoUtils';
import { OneMinuteTimerBadge } from './OneMinuteTimerBadge';
import { InlineShareBar, ShareMenuButton } from './ShareButtons';

interface SpotlightPlayerModalProps {
  video: PRVideo | null;
  queue: PRVideo[];
  isMuted: boolean;
  volume: number;
  enableNarration: boolean;
  defaultPlaybackRate: 1 | 1.25 | 1.5;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
  onToggleLike: (videoId: string) => void;
  onToggleBookmark: (videoId: string) => void;
  onSelectHashtag: (tag: string) => void;
}

export const SpotlightPlayerModal: React.FC<SpotlightPlayerModalProps> = ({
  video,
  queue,
  isMuted,
  volume,
  enableNarration,
  defaultPlaybackRate,
  onToggleMute,
  onChangeVolume,
  onClose,
  onSelectVideo,
  onToggleLike,
  onToggleBookmark,
  onSelectHashtag,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(defaultPlaybackRate);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSpokenCaptionRef = useRef<string>('');

  useVideoSeo(video);

  useEffect(() => {
    setElapsedSec(0);
    setIsPlaying(true);
    setAutoplayBlocked(false);
    setPlaybackRate(defaultPlaybackRate);
    lastSpokenCaptionRef.current = '';
  }, [video?.id, defaultPlaybackRate]);

  // Sync mute, volume, and playbackRate to native video + Web Audio engine
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
    }
    if (video && isPlaying && !video.videoUrl) {
      prAudioEngine.updateGain(volume, isMuted);
      if (isMuted) {
        prAudioEngine.stopSpeech();
      }
    }
  }, [isMuted, volume, playbackRate, video, isPlaying]);

  // Playback timer loop + audio orchestration
  useEffect(() => {
    if (!video || !isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      prAudioEngine.stopAll();
      return;
    }

    if (video.videoUrl && videoRef.current) {
      const el = videoRef.current;
      el.muted = isMuted;
      el.volume = volume;
      el.playbackRate = playbackRate;
      void el.play().catch(() => {
        el.muted = true;
        setAutoplayBlocked(true);
        void el.play().catch(() => {});
      });
    } else {
      prAudioEngine.startAmbient(video.category, volume, isMuted);
      const currentCap = getActiveCaption(video, elapsedSec);
      if (currentCap !== lastSpokenCaptionRef.current) {
        lastSpokenCaptionRef.current = currentCap;
        prAudioEngine.speakCaption(currentCap, playbackRate, volume, isMuted, enableNarration);
      }
    }

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = ((now - lastTick) / 1000) * playbackRate;
      lastTick = now;

      setElapsedSec((prev) => {
        const next = prev + delta;
        if (next >= video.durationSec) {
          setIsPlaying(false);
          prAudioEngine.stopAll();
          return video.durationSec;
        }
        if (!video.videoUrl) {
          const cap = getActiveCaption(video, next);
          if (cap !== lastSpokenCaptionRef.current) {
            lastSpokenCaptionRef.current = cap;
            prAudioEngine.playCueChime(volume, isMuted);
            prAudioEngine.speakCaption(cap, playbackRate, volume, isMuted, enableNarration);
          }
        }
        return next;
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
      prAudioEngine.stopAll();
    };
  }, [video, isPlaying, playbackRate]);

  // Keyboard shortcuts (Escape, Space, Left/Right arrows, M to mute)
  useEffect(() => {
    if (!video) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        prAudioEngine.stopAll();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        prAudioEngine.unlock();
        setIsPlaying((p) => {
          if (!p && elapsedSec >= video.durationSec) {
            setElapsedSec(0);
          }
          return !p;
        });
      } else if (e.key === 'ArrowRight') {
        setElapsedSec((prev) => Math.min(video.durationSec, prev + 5));
      } else if (e.key === 'ArrowLeft') {
        setElapsedSec((prev) => Math.max(0, prev - 5));
      } else if (e.key.toLowerCase() === 'm') {
        prAudioEngine.unlock();
        onToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, elapsedSec, onClose, onToggleMute]);

  if (!video) return null;

  const category = getCategoryMeta(video.category);
  const progressPct = computeProgressRatio(elapsedSec, video.durationSec) * 100;
  const activeCaption = getActiveCaption(video, elapsedSec);

  const handleSeek = (nextSec: number) => {
    setElapsedSec(nextSec);
    if (videoRef.current) {
      videoRef.current.currentTime = nextSec;
    }
    if (!video.videoUrl && isPlaying) {
      const cap = getActiveCaption(video, nextSec);
      lastSpokenCaptionRef.current = cap;
      prAudioEngine.speakCaption(cap, playbackRate, volume, isMuted, enableNarration);
    }
  };

  const relatedQueue = queue.filter((q) => q.id !== video.id).slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1117]/80 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theater-video-title"
      onClick={() => {
        prAudioEngine.stopAll();
        onClose();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl flex flex-col lg:grid lg:grid-cols-[1fr_340px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Video Player Frame */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)]">
          <div className="relative aspect-video bg-[#0F1117] overflow-hidden">
            {video.videoUrl ? (
              <video
                ref={videoRef}
                src={video.videoUrl}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                  isPlaying ? 'scale-[1.03]' : 'scale-100'
                }`}
              />
            )}

            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0F1117]/95 via-[#0F1117]/20 to-[#0F1117]/40 pointer-events-none"
              aria-hidden="true"
            />

            {/* Top Overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {video.isSample && (
                  <span className="px-2 py-1 rounded-md bg-[#D97706] border border-[#F59E0B]/40 text-white text-[11px] font-mono font-semibold tracking-wider uppercase shadow-[0_2px_10px_rgba(217,119,6,0.45)] whitespace-nowrap shrink-0">
                    SAMPLE
                  </span>
                )}
                <span className="text-xs font-medium text-[#E5E8F0] bg-[#0F1117]/85 border border-[#2A2E3D] px-2.5 py-1 rounded-md whitespace-nowrap truncate">
                  {category.label}
                </span>
              </div>

              <OneMinuteTimerBadge
                durationSec={video.durationSec}
                elapsedSec={elapsedSec}
                isPlaying={isPlaying}
              />
            </div>

            {autoplayBlocked && (
              <button
                type="button"
                onClick={() => {
                  prAudioEngine.unlock();
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = volume;
                  }
                  if (isMuted) onToggleMute();
                  setAutoplayBlocked(false);
                }}
                className="absolute top-14 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5E6AD2] text-white text-xs font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>クリックして音声をオンにする</span>
              </button>
            )}

            {/* Synchronized Caption Overlay */}
            <div className="absolute bottom-5 left-4 right-4">
              <div className="bg-[#0F1117]/90 border border-[#2A2E3D] rounded-lg px-3.5 py-2.5">
                <p className="text-xs sm:text-sm text-[#F1F3F9] leading-relaxed">
                  {activeCaption}
                </p>
              </div>
            </div>
          </div>

          {/* Player Controls Bar */}
          <div className="p-4 space-y-3 bg-[var(--bg-surface)]">
            {/* Scrubbable 60-Second Timeline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                <span>{formatTimer(elapsedSec)}</span>
                <span>固定枠 {formatTimer(video.durationSec)}</span>
              </div>
              <div className="relative h-5 flex items-center">
                <div className="w-full h-1.5 bg-[var(--bg-input)] border border-[var(--border-hairline)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5E6AD2]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={video.durationSec}
                  step={0.5}
                  value={elapsedSec}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  aria-label="再生位置シークバー"
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Playback + Audio + Quick Share Action Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSeek(Math.max(0, elapsedSec - 5))}
                  className="p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  aria-label="5秒戻る"
                >
                  <SkipBack className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    prAudioEngine.unlock();
                    if (!isPlaying && elapsedSec >= video.durationSec) {
                      handleSeek(0);
                    }
                    setIsPlaying((p) => !p);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#6B77DE] text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" aria-hidden="true" />
                      <span>一時停止</span>
                    </>
                  ) : elapsedSec >= video.durationSec ? (
                    <>
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>もう一度再生</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                      <span>再生</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeek(Math.min(video.durationSec, elapsedSec + 5))}
                  className="p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                  aria-label="5秒進む"
                >
                  <SkipForward className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Audio Mute & Volume Slider */}
                <div className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)]">
                  <button
                    type="button"
                    onClick={() => {
                      prAudioEngine.unlock();
                      setAutoplayBlocked(false);
                      onToggleMute();
                    }}
                    aria-label={isMuted ? '音声をオンにする' : 'ミュートにする'}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isMuted
                        ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        : 'text-[#5E6AD2]'
                    }`}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      prAudioEngine.unlock();
                      const nextVol = Number(e.target.value);
                      if (nextVol > 0 && isMuted) {
                        onToggleMute();
                      }
                      onChangeVolume(nextVol);
                    }}
                    aria-label="音量調整"
                    className="w-16 sm:w-20 accent-[#5E6AD2] cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPlaybackRate((prev) =>
                      prev === 1 ? 1.25 : prev === 1.25 ? 1.5 : 1
                    )
                  }
                  className="px-2.5 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-mono tabular-nums text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="再生速度を切り替え"
                >
                  {playbackRate.toFixed(playbackRate === 1 ? 1 : 2)}x
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLike(video.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                    video.liked
                      ? 'bg-[#F06B7E]/15 border-[#F06B7E]/50 text-[#F06B7E]'
                      : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${video.liked ? 'fill-current' : ''}`} />
                  <span>{formatCompactCount(video.likes)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(video.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    video.bookmarked
                      ? 'bg-[#5E6AD2]/15 border-[#5E6AD2] text-[#5E6AD2]'
                      : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${video.bookmarked ? 'fill-current' : ''}`} />
                  <span>{video.bookmarked ? '保存済み' : '保存'}</span>
                </button>

                <ShareMenuButton video={video} menuPlacement="top" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metadata, One-Tap SNS Share Bar, Hashtags & Next Up */}
        <div className="flex flex-col p-5 gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 border border-[var(--border-hairline)]"
                style={{ backgroundColor: video.creatorAccent }}
              >
                {video.creatorInitials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {video.creatorName}
                </p>
                <p className="text-xs text-[var(--text-subtle)] truncate">
                  {video.creatorHandle} · {video.postedAtLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                prAudioEngine.stopAll();
                onClose();
              }}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
              aria-label="プレイヤーを閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <h2
              id="theater-video-title"
              className="text-base font-semibold text-[var(--text-primary)] leading-snug"
            >
              {video.title}
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              {video.summary}
            </p>
            {video.isSample && (
              <p className="text-[11px] text-[var(--text-subtle)] leading-snug">
                ※これはプラットフォームのサンプル（デモ）動画です
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] font-mono tabular-nums pt-1">
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatCompactCount(video.views)}回再生
              </span>
              <span aria-hidden="true">·</span>
              <span>{video.creatorRole}</span>
            </div>
          </div>

          {/* Direct One-Tap SNS Share Buttons (X, LINE, Facebook, Copy Link) */}
          <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              ワンタップで拡散・共有
            </p>
            <InlineShareBar video={video} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 border-t border-[var(--border-hairline)]">
            {video.hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  prAudioEngine.stopAll();
                  onSelectHashtag(tag);
                  onClose();
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[#5E6AD2] transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Next 60s PR Queue */}
          {relatedQueue.length > 0 && (
            <div className="mt-auto pt-4 border-t border-[var(--border-hairline)] space-y-2.5">
              <p className="text-xs font-medium text-[var(--text-muted)]">続けて1分視聴</p>
              <div className="space-y-2">
                {relatedQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      prAudioEngine.unlock();
                      onSelectVideo(item.id);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-input)]/70 hover:bg-[var(--bg-input)] border border-[var(--border-hairline)] text-left transition-colors cursor-pointer"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-9 rounded object-cover shrink-0 border border-[var(--border-hairline)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-subtle)] font-mono tabular-nums">
                        {item.creatorName} · {formatTimer(item.durationSec)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

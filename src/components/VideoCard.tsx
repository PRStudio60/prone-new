import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Eye,
  Heart,
  Maximize2,
  Pause,
  Play,
  Video as VideoIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PRVideo } from '../types/video';
import { prAudioEngine } from '../utils/prAudioEngine';
import {
  computeProgressRatio,
  formatCompactCount,
  getActiveCaption,
  getCategoryMeta,
} from '../utils/videoUtils';
import { OneMinuteTimerBadge } from './OneMinuteTimerBadge';
import { ShareMenuButton } from './ShareButtons';

interface VideoCardProps {
  video: PRVideo;
  isPreviewPlaying: boolean;
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
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isPreviewPlaying,
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
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSpokenCaptionRef = useRef<string>('');
  const category = getCategoryMeta(video.category);

  // Sync mute & volume to native video element and Web Audio engine
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
    if (isPreviewPlaying && !video.videoUrl) {
      prAudioEngine.updateGain(volume, isMuted);
      if (isMuted) {
        prAudioEngine.stopSpeech();
      }
    }
  }, [isMuted, volume, isPreviewPlaying, video.videoUrl]);

  // Manage live 60-second preview timer + audio playback when card preview is active
  useEffect(() => {
    if (!isPreviewPlaying) {
      setElapsedSec(0);
      lastSpokenCaptionRef.current = '';
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      return;
    }

    if (video.videoUrl && videoRef.current) {
      const el = videoRef.current;
      el.currentTime = 0;
      el.muted = isMuted;
      el.volume = volume;
      void el.play().catch(() => {
        // Fallback to muted playback only if browser rejects unmuted autoplay
        el.muted = true;
        void el.play().catch(() => {});
      });
    } else {
      prAudioEngine.startAmbient(video.category, volume, isMuted);
      const firstCap = getActiveCaption(video, 0);
      lastSpokenCaptionRef.current = firstCap;
      prAudioEngine.speakCaption(firstCap, 1, volume, isMuted, enableNarration);
    }

    const startTime = performance.now();
    const interval = window.setInterval(() => {
      const nextElapsed = (performance.now() - startTime) / 1000;
      if (nextElapsed >= video.durationSec) {
        setElapsedSec(0);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
        prAudioEngine.stopAll();
        onTogglePreview(video.id);
      } else {
        setElapsedSec(nextElapsed);
        if (!video.videoUrl) {
          const currentCap = getActiveCaption(video, nextElapsed);
          if (currentCap !== lastSpokenCaptionRef.current) {
            lastSpokenCaptionRef.current = currentCap;
            prAudioEngine.playCueChime(volume, isMuted);
            prAudioEngine.speakCaption(currentCap, 1, volume, isMuted, enableNarration);
          }
        }
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      prAudioEngine.stopAll();
    };
  }, [
    isPreviewPlaying,
    video.durationSec,
    video.id,
    video.videoUrl,
    video.category,
    onTogglePreview,
  ]);

  const progressPct = isPreviewPlaying
    ? computeProgressRatio(elapsedSec, video.durationSec) * 100
    : 0;
  const liveCaption = getActiveCaption(video, elapsedSec);

  return (
    <article
      className={`group flex flex-col bg-[var(--bg-surface)] border rounded-xl overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
        isPreviewPlaying
          ? 'border-[#5E6AD2] shadow-[0_10px_28px_-10px_rgba(94,106,210,0.35)]'
          : 'border-[var(--border-hairline)] hover:border-[#5E6AD2]/60 hover:shadow-[0_10px_28px_-12px_rgba(94,106,210,0.22)]'
      }`}
    >
      {/* 16:9 Preview Video Frame */}
      <div className="relative aspect-video bg-[#0F1117] overflow-hidden border-b border-[var(--border-hairline)]">
        {video.videoUrl && isPreviewPlaying ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : !imgError ? (
          <img
            src={video.thumbnailUrl}
            alt={`${video.title}のプレビュー`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isPreviewPlaying ? 'scale-[1.03]' : 'group-hover:scale-[1.03]'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1A1D29] to-[#0F1117] p-6 text-center">
            <VideoIcon className="w-7 h-7 text-[#5E6AD2]" aria-hidden="true" />
            <span className="text-xs text-[#98A0B5] line-clamp-2 max-w-xs">{video.title}</span>
          </div>
        )}

        {/* Measured readability scrim */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0F1117]/90 via-[#0F1117]/20 to-[#0F1117]/35 pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Bar Inside Frame: SAMPLE Badge + Category Label & 1-Minute Timer Indicator */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {video.isSample && (
              <span className="px-2 py-0.5 rounded-md bg-[#D97706] border border-[#F59E0B]/40 text-white text-[10px] font-mono font-semibold tracking-wider uppercase shadow-[0_2px_10px_rgba(217,119,6,0.45)] whitespace-nowrap shrink-0">
                SAMPLE
              </span>
            )}
            <span className="text-[11px] font-medium text-[#E5E8F0] bg-[#0F1117]/80 backdrop-blur-sm border border-[#2A2E3D] px-2 py-0.5 rounded-md whitespace-nowrap truncate">
              {category.label}
            </span>
          </div>

          <OneMinuteTimerBadge
            durationSec={video.durationSec}
            elapsedSec={elapsedSec}
            isPlaying={isPreviewPlaying}
            showRemaining={isPreviewPlaying}
          />
        </div>

        {/* Clickable center region to open full theater player */}
        <button
          type="button"
          onClick={() => {
            prAudioEngine.unlock();
            onOpenTheater(video.id);
          }}
          className="absolute inset-0 w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5E6AD2]"
          aria-label={`${video.title}をシアタープレイヤーで開く`}
        />

        {/* Centered Indigo Play Icon Indicator */}
        {!isPreviewPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="w-11 h-11 rounded-full bg-[#5E6AD2]/90 border border-[#8E98F5]/40 text-white flex items-center justify-center shadow-[0_0_24px_rgba(94,106,210,0.5)] opacity-80 scale-95 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <Play className="w-4 h-4 fill-current translate-x-[1px]" />
            </div>
          </div>
        )}

        {/* Live Caption Overlay when previewing */}
        {isPreviewPlaying && showCaptions && (
          <div className="absolute left-3 right-3 bottom-12 pointer-events-none">
            <p className="text-xs leading-relaxed text-[#F1F3F9] bg-[#0F1117]/90 border border-[#2A2E3D] rounded-md px-2.5 py-1.5 line-clamp-2">
              {liveCaption}
            </p>
          </div>
        )}

        {/* Bottom Frame Quick Controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prAudioEngine.unlock();
                onTogglePreview(video.id);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.96] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                isPreviewPlaying
                  ? 'bg-[#5E6AD2] border-[#5E6AD2] text-white hover:bg-[#6A76DE] shadow-[0_0_16px_rgba(94,106,210,0.45)]'
                  : 'bg-[#0F1117]/88 border-[#2A2E3D] text-[#F1F3F9] hover:border-[#5E6AD2] hover:shadow-[0_0_14px_rgba(94,106,210,0.28)]'
              }`}
              aria-label={
                isPreviewPlaying
                  ? `${video.title}のプレビューを停止`
                  : `${video.title}をサクッとプレビュー再生`
              }
            >
              {isPreviewPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>プレビュー停止</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#5E6AD2] fill-[#5E6AD2]" aria-hidden="true" />
                  <span>60秒プレビュー</span>
                </>
              )}
            </button>

            {isPreviewPlaying && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prAudioEngine.unlock();
                  onToggleMute();
                }}
                aria-label={isMuted ? '音声をオンにする' : '音声をミュートする'}
                title={isMuted ? '音声オン' : 'ミュート'}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-150 hover:scale-[1.03] active:scale-[0.96] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                  isMuted
                    ? 'bg-[#0F1117]/85 border-[#2A2E3D] text-[#98A0B5] hover:text-white'
                    : 'bg-[#0F1117]/90 border-[#5E6AD2] text-[#F1F3F9] shadow-[0_0_10px_rgba(94,106,210,0.35)]'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prAudioEngine.unlock();
              onOpenTheater(video.id);
            }}
            className="pointer-events-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-[#0F1117]/85 border border-[#2A2E3D] text-[#C9D0E0] hover:text-white hover:border-[#5E6AD2]/60 hover:scale-[1.03] active:scale-[0.96] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]"
            aria-label={`${video.title}を拡大視聴`}
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            <span>拡大視聴</span>
          </button>
        </div>

        {/* Flush 1-minute progress hairline at bottom of frame */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2A2E3D]/70 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={`h-full bg-[#5E6AD2] transition-[width] duration-100 ease-linear ${
              isPreviewPlaying ? 'shadow-[0_0_8px_rgba(94,106,210,0.9)]' : ''
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Creator Identity & Metrics Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 border border-[var(--border-hairline)]"
              style={{ backgroundColor: video.creatorAccent }}
              aria-hidden="true"
            >
              {video.creatorInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {video.creatorName}
              </p>
              <p className="text-[11px] text-[var(--text-subtle)] truncate">
                {video.creatorRole}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[var(--text-subtle)] font-mono tabular-nums shrink-0">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{formatCompactCount(video.views)}</span>
          </div>
        </div>

        {/* Title & Summary */}
        <div className="space-y-1.5">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => {
                prAudioEngine.unlock();
                onOpenTheater(video.id);
              }}
              className="text-left hover:text-[#5E6AD2] transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              {video.title}
            </button>
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
            {video.summary}
          </p>
          {video.isSample && (
            <p className="text-[11px] text-[var(--text-subtle)] leading-snug">
              ※これはプラットフォームのサンプル（デモ）動画です
            </p>
          )}
        </div>

        {/* Unboxed Hashtags + Engagement Footer */}
        <div className="mt-auto pt-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
            {video.hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectHashtag(tag)}
                className="text-xs text-[var(--text-muted)] hover:text-[#5E6AD2] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:text-[#5E6AD2]"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleLike(video.id)}
              aria-pressed={Boolean(video.liked)}
              aria-label={`いいね (${video.likes})`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono tabular-nums transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                video.liked
                  ? 'text-[#F06B7E] bg-[#F06B7E]/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${video.liked ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              <span>{formatCompactCount(video.likes)}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleBookmark(video.id)}
              aria-pressed={Boolean(video.bookmarked)}
              aria-label={video.bookmarked ? '保存済みから外す' : '後で見るに保存'}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                video.bookmarked
                  ? 'text-[#5E6AD2] bg-[#5E6AD2]/15'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${video.bookmarked ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
            </button>

            <ShareMenuButton video={video} compact menuPlacement="top" />
          </div>
        </div>
      </div>
    </article>
  );
};

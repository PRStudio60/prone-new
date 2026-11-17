import React, { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Link2, Share2 } from 'lucide-react';
import { PRVideo } from '../types/video';
import { buildShareUrls } from '../utils/videoUtils';

interface ShareButtonsProps {
  video: PRVideo;
  compact?: boolean;
  menuPlacement?: 'top' | 'bottom';
}

const XBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LineBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

const FacebookBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const ShareMenuButton: React.FC<ShareButtonsProps> = ({
  video,
  compact = false,
  menuPlacement = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prone.jp';
  const urls = buildShareUrls(video, origin);

  const copyTextToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard permission denials in restricted iframes
    }
    setStatusMessage(label);
    window.setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleSnsShare = (platformLabel: string) => {
    void copyTextToClipboard(urls.shareText, `${platformLabel}用にコピー完了`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="SNSでシェアする"
        className={
          compact
            ? `inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] ${
                isOpen || statusMessage
                  ? 'text-[#5E6AD2] bg-[#5E6AD2]/15'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
              }`
            : `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                isOpen || statusMessage
                  ? 'bg-[#5E6AD2]/15 border-[#5E6AD2] text-[#5E6AD2]'
                  : 'bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`
        }
      >
        {statusMessage ? (
          <>
            <Check className="w-3.5 h-3.5 text-[#4C9A7A]" aria-hidden="true" />
            {!compact && <span>{statusMessage}</span>}
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            {!compact && <span>シェア</span>}
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="ワンタップSNSシェア"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-60 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-xl p-1.5 z-30 space-y-1`}
        >
          {/* One-Tap Quick Brand Icon Row */}
          <div className="px-2 pt-1.5 pb-1">
            <p className="text-[11px] font-medium text-[var(--text-subtle)] mb-2">
              ワンタップSNSシェア
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <a
                href={urls.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => handleSnsShare('X')}
                className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#0F1117] border border-[#2A2E3D] text-white hover:border-[#5E6AD2] transition-colors"
              >
                <XBrandIcon className="w-4 h-4 text-white" />
                <span className="text-[11px] font-medium">X</span>
              </a>

              <a
                href={urls.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => handleSnsShare('LINE')}
                className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#06C755]/15 border border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/25 transition-colors"
              >
                <LineBrandIcon className="w-4 h-4 text-[#06C755]" />
                <span className="text-[11px] font-medium">LINE</span>
              </a>

              <a
                href={urls.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => handleSnsShare('Facebook')}
                className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/25 transition-colors"
              >
                <FacebookBrandIcon className="w-4 h-4 text-[#1877F2]" />
                <span className="text-[11px] font-medium">Facebook</span>
              </a>
            </div>
          </div>

          <div className="border-t border-[var(--border-hairline)]" />

          {/* Detailed Link Rows */}
          <a
            href={urls.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleSnsShare('X')}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
          >
            <span>Xで投稿テキスト付きシェア</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-subtle)]" aria-hidden="true" />
          </a>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void copyTextToClipboard(urls.shareUrl, 'URLをコピーしました');
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer text-left"
          >
            <span className="inline-flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
              <span>視聴URLをコピー</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export const InlineShareBar: React.FC<{ video: PRVideo }> = ({ video }) => {
  const [copiedLabel, setCopiedLabel] = useState<string>('');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prone.jp';
  const urls = buildShareUrls(video, origin);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore
    }
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(''), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={urls.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void handleCopy(urls.shareText, 'X')}
        aria-label="Xでシェア"
        title="X（旧Twitter）でシェア"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0F1117] border border-[#2A2E3D] text-white text-xs font-medium hover:border-[#5E6AD2] transition-colors whitespace-nowrap"
      >
        <XBrandIcon className="w-3.5 h-3.5" />
        <span>X</span>
      </a>

      <a
        href={urls.lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void handleCopy(urls.shareText, 'LINE')}
        aria-label="LINEで共有"
        title="LINEで共有"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#06C755]/14 border border-[#06C755]/45 text-[#06C755] text-xs font-medium hover:bg-[#06C755]/24 transition-colors whitespace-nowrap"
      >
        <LineBrandIcon className="w-3.5 h-3.5" />
        <span>LINE</span>
      </a>

      <a
        href={urls.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void handleCopy(urls.shareText, 'Facebook')}
        aria-label="Facebookでシェア"
        title="Facebookでシェア"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1877F2]/14 border border-[#1877F2]/45 text-[#1877F2] text-xs font-medium hover:bg-[#1877F2]/24 transition-colors whitespace-nowrap"
      >
        <FacebookBrandIcon className="w-3.5 h-3.5" />
        <span>Facebook</span>
      </a>

      <button
        type="button"
        onClick={() => void handleCopy(urls.shareUrl, 'リンク')}
        aria-label="視聴リンクをコピー"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
      >
        {copiedLabel === 'リンク' ? (
          <>
            <Check className="w-3.5 h-3.5 text-[#4C9A7A]" aria-hidden="true" />
            <span>コピー完了</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5 text-[#5E6AD2]" aria-hidden="true" />
            <span>リンクコピー</span>
          </>
        )}
      </button>

      {copiedLabel && copiedLabel !== 'リンク' && (
        <span className="text-[11px] text-[#4C9A7A] font-medium">
          {copiedLabel}用テキストもコピーしました
        </span>
      )}
    </div>
  );
};

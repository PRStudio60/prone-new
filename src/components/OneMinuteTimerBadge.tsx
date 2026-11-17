import React from 'react';
import { computeProgressRatio, formatRemainingTimer, formatTimer } from '../utils/videoUtils';

interface OneMinuteTimerBadgeProps {
  durationSec: number;
  elapsedSec?: number;
  isPlaying?: boolean;
  showRemaining?: boolean;
}

export const OneMinuteTimerBadge: React.FC<OneMinuteTimerBadgeProps> = ({
  durationSec,
  elapsedSec = 0,
  isPlaying = false,
  showRemaining = false,
}) => {
  const ratio = isPlaying ? computeProgressRatio(elapsedSec, durationSec) : 0;
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  const label = isPlaying
    ? showRemaining
      ? formatRemainingTimer(elapsedSec, durationSec)
      : formatTimer(elapsedSec)
    : formatTimer(durationSec);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-mono tabular-nums tracking-tight transition-all duration-150 ${
        isPlaying
          ? 'bg-[#0F1117]/92 border-[#5E6AD2] text-[#F1F3F9] shadow-[0_0_12px_rgba(94,106,210,0.35)]'
          : 'bg-[#0F1117]/88 border-[#2A2E3D] text-[#E5E8F0]'
      }`}
      aria-label={`動画の長さ ${formatTimer(durationSec)}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        className={`shrink-0 -rotate-90 ${
          isPlaying ? 'drop-shadow-[0_0_4px_rgba(94,106,210,0.75)]' : ''
        }`}
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="#2A2E3D"
          strokeWidth="2"
        />
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="#5E6AD2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isPlaying ? strokeDashoffset : 0}
        />
      </svg>
      <span>{label}</span>
      {!isPlaying && <span className="text-[#8B92A5]">/ 60s</span>}
    </div>
  );
};

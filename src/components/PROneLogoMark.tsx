import React from 'react';

interface PROneLogoMarkProps {
  className?: string;
}

export const PROneLogoMark: React.FC<PROneLogoMarkProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="9"
        fill="#14161F"
        stroke="#2A2E3D"
        strokeWidth="1.25"
      />
      {/* 60-second progress track */}
      <circle cx="18" cy="18" r="11" stroke="#252A3D" strokeWidth="2.4" />
      {/* Indigo 60-second arc */}
      <circle
        cx="18"
        cy="18"
        r="11"
        stroke="#5E6AD2"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="57 14"
        transform="rotate(-90 18 18)"
      />
      {/* Glowing tip */}
      <circle cx="27.5" cy="12.5" r="1.5" fill="#8E98F5" />
      {/* Geometric "1" */}
      <path
        d="M15.4 13.7L18.5 11.4H19.9V24.6H17.1V14.7L15.4 15.8V13.7Z"
        fill="#F1F3F9"
      />
    </svg>
  );
};

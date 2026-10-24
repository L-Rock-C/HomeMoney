'use client';

import React from 'react';

interface HomeMoneyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  variant?: 'image' | 'svg';
}

const sizeMap = {
  xs: { icon: 22, text: 'text-sm' },
  sm: { icon: 30, text: 'text-base' },
  md: { icon: 38, text: 'text-lg' },
  lg: { icon: 50, text: 'text-2xl' },
  xl: { icon: 66, text: 'text-3xl' },
};

export function HomeMoneyLogo({
  className = '',
  size = 'md',
  showText = true,
  textColor,
  variant = 'image',
}: HomeMoneyLogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon portion */}
      {variant === 'image' ? (
        <div
          style={{ width: iconSize, height: iconSize }}
          className="shrink-0 flex items-center justify-center relative"
        >
          <img
            src="/logo-icon.png"
            alt="HomeMoney Logo"
            width={iconSize}
            height={iconSize}
            className="w-full h-full object-contain shrink-0 drop-shadow-xs"
          />
        </div>
      ) : (
        <div
          style={{ width: iconSize, height: iconSize }}
          className="shrink-0 flex items-center justify-center relative"
        >
          <svg
            viewBox="0 0 90 90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* House Outline with Chimney */}
            <path
              d="M 12 43 L 45 13 L 61 27 L 61 17 L 68 17 L 68 33 L 78 43"
              stroke="#688746"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Left and Right Walls + Bottom Floor with Gap for Dollar */}
            <path
              d="M 18 41 L 18 78 L 38 78"
              stroke="#688746"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 52 78 L 72 78 L 72 41"
              stroke="#688746"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dollar Sign $ */}
            {/* Vertical Stem */}
            <line
              x1="45"
              y1="30"
              x2="45"
              y2="85"
              stroke="#688746"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* S-curves of Dollar */}
            <path
              d="M 55 42 C 55 37 38 35 38 46 C 38 57 53 54 53 64 C 53 74 36 72 36 67"
              stroke="#688746"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Typography portion */}
      {showText && (
        <div className={`font-sans tracking-tight font-bold flex items-baseline leading-none ${textSize} ${textColor || ''}`}>
          <span className="text-[#688746] font-extrabold">Home</span>
          <span className="text-[#45543c] dark:text-slate-100 font-medium ml-0.5">Money</span>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';

interface HomeMoneyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  variant?: 'svg' | 'image';
}

const sizeMap = {
  xs: { icon: 20, text: 'text-sm' },
  sm: { icon: 28, text: 'text-base' },
  md: { icon: 36, text: 'text-lg' },
  lg: { icon: 48, text: 'text-2xl' },
  xl: { icon: 64, text: 'text-3xl' },
};

export function HomeMoneyLogo({
  className = '',
  size = 'md',
  showText = true,
  textColor,
  variant = 'svg',
}: HomeMoneyLogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon portion */}
      {variant === 'image' ? (
        <img
          src="/logo.png"
          alt="HomeMoney Logo"
          width={iconSize}
          height={iconSize}
          className="object-contain shrink-0 rounded-xl"
        />
      ) : (
        <div
          style={{ width: iconSize, height: iconSize }}
          className="shrink-0 flex items-center justify-center relative"
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* House Outline with Chimney */}
            <path
              d="M 18 42 L 50 14 L 66 28 L 66 18.5 L 72.5 18.5 L 72.5 33.7 L 82 42"
              stroke="#688746"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Left and Right Walls + Bottom Floor with Gap for Dollar */}
            <path
              d="M 23.5 40.5 L 23.5 83.5 L 43.5 83.5"
              stroke="#688746"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 56.5 83.5 L 76.5 83.5 L 76.5 40.5"
              stroke="#688746"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dollar Sign $ */}
            {/* Vertical Stem */}
            <line
              x1="50"
              y1="34"
              x2="50"
              y2="92"
              stroke="#688746"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* S-curves of Dollar */}
            <path
              d="M 60 46 C 60 41 42 39 42 50 C 42 61 58 57 58 68 C 58 79 40 77 40 72"
              stroke="#688746"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Typography portion */}
      {showText && (
        <div className={`font-sans tracking-tight font-bold flex items-baseline ${textSize} ${textColor || ''}`}>
          <span className="text-[#688746] font-extrabold">Home</span>
          <span className="text-[#45543c] dark:text-slate-100 font-medium ml-0.5">Money</span>
        </div>
      )}
    </div>
  );
}

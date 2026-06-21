import React from 'react';

interface DotAiLogoProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

export default function DotAiLogo({ className = '', size = '100%', glow = true }: DotAiLogoProps) {
  return (
    <svg
      viewBox="0 0 120 160"
      width={size}
      height={size}
      className={`${className} select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main premium blue-to-purple-to-magenta gradient matching the uploaded logo exactly */}
        <linearGradient id="premiumFlameGradient" x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" /> {/* Sky blue */}
          <stop offset="35%" stopColor="#2563eb" /> {/* Vivid blue */}
          <stop offset="70%" stopColor="#7c3aed" /> {/* Electric Violet */}
          <stop offset="100%" stopColor="#c084fc" /> {/* Gentle Magenta */}
        </linearGradient>

        {/* Outer subtle glow to make the logo look premium as requested */}
        {glow && (
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <g filter={glow ? "url(#neonGlow)" : undefined}>
        {/* The beautifully crafted double-curved flame of the Dot AI identifier */}
        <path
          d="M 60 10 
             C 45 25, 25 45, 25 68 
             C 25 88, 38 103, 58 103 
             C 42 103, 35 90, 35 78 
             C 35 60, 52 48, 62 38 
             C 68 32, 75 22, 75 10 
             Z"
          fill="url(#premiumFlameGradient)"
          opacity="0.85"
        />

        <path
          d="M 60 10 
             C 75 25, 95 45, 95 72 
             C 95 98, 77 122, 52 122 
             C 72 122, 83 105, 83 90 
             C 83 72, 65 58, 55 45 
             C 48 36, 42 24, 45 10 
             Z"
          fill="url(#premiumFlameGradient)"
          className="animate-pulse"
          style={{ animationDuration: '3s' }}
        />

        {/* The stylish bottom decorative swoosh shape from the uploaded image */}
        <path
          d="M 52 112
             C 45 120, 48 130, 56 138
             C 62 144, 60 148, 56 152
             C 52 148, 50 140, 58 132
             C 62 128, 60 118, 52 112 Z"
          fill="url(#premiumFlameGradient)"
        />

        {/* Spherical Glowing center core orb of Dot AI */}
        <circle
          cx="60"
          cy="75"
          r="8"
          fill="#ffffff"
          className="shadow-inner"
        />
        
        <circle
          cx="60"
          cy="75"
          r="11"
          stroke="#c084fc"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          fill="none"
        />
      </g>
    </svg>
  );
}

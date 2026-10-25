import React from 'react';

export const BrandHero = () => {
  return (
    <div className="auth-brand-side" aria-hidden="true">
      {/* Pure, clean emerald fluid waves SVG without any text or overlaid elements */}
      <svg
        className="brand-wave-canvas"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d5236" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#042718" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#02140c" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="accentGlow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#008751" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#02140c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient background curves matching design.png */}
        <path
          d="M 0,0 L 1000,0 L 1000,1000 L 0,1000 Z"
          fill="url(#waveGrad1)"
        />
        <path
          d="M 220,0 Q 580,260 460,580 T 1000,1000 L 1000,0 Z"
          fill="url(#waveGrad2)"
        />
        <path
          d="M 100,0 C 420,160 300,700 1000,820 L 1000,1000 L 0,1000 Z"
          fill="#031b11"
          opacity="0.68"
        />
        <path
          d="M 0,400 Q 300,600 700,450 T 1000,700 L 1000,1000 L 0,1000 Z"
          fill="url(#accentGlow)"
        />
        <circle cx="850" cy="200" r="320" fill="#008751" opacity="0.12" filter="blur(60px)" />
        <circle cx="200" cy="800" r="280" fill="#10b981" opacity="0.08" filter="blur(70px)" />
      </svg>
    </div>
  );
};

import React from 'react';

interface LogoProps {
    size?: number;
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, className = '' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className={className}
    >
        <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#10b981" />
                <stop offset="1" stopColor="#34d399" />
            </linearGradient>
        </defs>
        <rect x="48" y="48" width="416" height="416" rx="96" fill="#050505" />
        <rect x="80" y="80" width="352" height="352" rx="76" fill="url(#logo-gradient)" opacity="0.12" />
        <rect x="120" y="120" width="272" height="120" rx="28" fill="#0a0a0a" stroke="#10b981" strokeOpacity="0.35" strokeWidth="8" />
        <circle cx="168" cy="180" r="14" fill="#10b981" />
        <rect x="200" y="166" width="160" height="28" rx="14" fill="#10b981" opacity="0.45" />
        <g fill="#0a0a0a" stroke="#10b981" strokeOpacity="0.35" strokeWidth="8">
            <rect x="120" y="270" width="78" height="78" rx="20" />
            <rect x="217" y="270" width="78" height="78" rx="20" />
            <rect x="314" y="270" width="78" height="78" rx="20" />
            <rect x="120" y="358" width="78" height="78" rx="20" />
            <rect x="217" y="358" width="78" height="78" rx="20" />
            <rect x="314" y="358" width="78" height="78" rx="20" />
        </g>
        <path d="M144 308h30M159 293v30" stroke="#10b981" strokeWidth="10" strokeLinecap="round" />
        <path d="M241 308h30" stroke="#10b981" strokeWidth="10" strokeLinecap="round" />
        <path d="M338 300h30M338 320h30" stroke="#10b981" strokeWidth="10" strokeLinecap="round" />
    </svg>
);

// Smaller version for compact spaces
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <div
        className={`rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ${className}`}
        style={{ width: size, height: size }}
    >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
        </svg>
    </div>
);

import React from 'react';

// WhatsApp Official Icon
export const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

// Binance Official Icon
export const BinanceIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 126.61 126.61" fill="currentColor" className={className}>
        <g>
            <polygon points="38.73,53.2 63.3,28.63 87.88,53.2 102.63,38.46 63.3,0 23.98,38.46" />
            <polygon points="0,63.31 14.75,48.56 29.49,63.31 14.75,78.05" />
            <polygon points="38.73,73.41 63.3,97.98 87.88,73.41 102.63,88.15 63.3,126.61 23.98,88.15" />
            <polygon points="97.12,63.31 111.86,48.56 126.61,63.31 111.86,78.05" />
            <polygon points="77.83,63.3 63.3,48.78 52.53,59.54 51.27,60.81 48.77,63.3 63.3,77.83 77.83,63.3" />
        </g>
    </svg>
);

// Banesco Icon (simplified version based on brand colors)
export const BanescoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        {/* Main red circle */}
        <circle cx="24" cy="32" r="12" fill="#E31837" />
        {/* Top circles (blue, green) */}
        <circle cx="16" cy="12" r="6" fill="#003087" />
        <circle cx="32" cy="12" r="6" fill="#00A651" />
        {/* White ring in red circle */}
        <circle cx="24" cy="32" r="8" stroke="white" strokeWidth="2" fill="none" />
        <circle cx="24" cy="32" r="4" fill="white" />
    </svg>
);

import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
}

export const Confetti: React.FC<{ show: boolean; onComplete?: () => void }> = ({ show, onComplete }) => {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (show) {
            const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#ffffff'];
            const newPieces: ConfettiPiece[] = [];

            for (let i = 0; i < 50; i++) {
                newPieces.push({
                    id: i,
                    x: Math.random() * 100, // percentage from left
                    color: colors[Math.floor(Math.random() * colors.length)],
                    delay: Math.random() * 0.5,
                    duration: 1 + Math.random() * 1.5,
                });
            }

            setPieces(newPieces);

            // Auto-hide after animation
            const timer = setTimeout(() => {
                setPieces([]);
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    if (!show || pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{
                        left: `${piece.x}%`,
                        top: '-20px',
                        backgroundColor: piece.color,
                        animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
                    }}
                />
            ))}
            <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
};

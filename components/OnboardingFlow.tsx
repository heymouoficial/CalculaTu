import React, { useState, useEffect } from 'react';
import { Calculator, Mic, Sparkles, Download, X, ChevronRight, ChevronLeft, Smartphone } from 'lucide-react';

interface OnboardingSlide {
    icon: React.ReactNode;
    title: string;
    description: string;
    highlight?: string;
    accentColor: string;
}

const SLIDES: OnboardingSlide[] = [
    {
        icon: <Calculator size={48} />,
        title: "¡Bienvenido a CalculaTu!",
        description: "Tu asistente de mercado personal. Vamos a mostrarte cómo sacarle el máximo provecho.",
        highlight: "Solo toma 30 segundos",
        accentColor: "emerald",
    },
    {
        icon: <Calculator size={48} />,
        title: "Modo Manual",
        description: "Agrega productos con el teclado numérico. Perfecto cuando no tienes buena señal o prefieres escribir.",
        highlight: "100% Offline • Tasa BCV automática",
        accentColor: "blue",
    },
    {
        icon: <Mic size={48} />,
        title: "Savara Pro",
        description: 'Di "Savara, agrega 2 harinas a 1.50" y ella hace el resto. Manos libres mientras empujas el carrito.',
        highlight: "Reconocimiento de voz inteligente",
        accentColor: "purple",
    },
    {
        icon: <Smartphone size={48} />,
        title: "Instala la App",
        description: "Agrega CalculaTu a tu pantalla de inicio para acceso rápido y mejor rendimiento offline.",
        highlight: "Funciona como app nativa",
        accentColor: "teal",
    },
];

export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const goToSlide = (index: number) => {
        if (isAnimating || index === currentSlide) return;
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentSlide(index);
            setIsAnimating(false);
        }, 150);
    };

    const nextSlide = () => {
        if (currentSlide < SLIDES.length - 1) {
            goToSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onComplete();
    };

    const slide = SLIDES[currentSlide];
    const isLastSlide = currentSlide === SLIDES.length - 1;

    const accentColors: Record<string, { bg: string; text: string; glow: string }> = {
        emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' },
        blue: { bg: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
        purple: { bg: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
        teal: { bg: 'bg-teal-500', text: 'text-teal-400', glow: 'shadow-teal-500/30' },
    };

    const colors = accentColors[slide.accentColor] || accentColors.emerald;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Skip Button */}
            <button
                onClick={handleSkip}
                className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
                Omitir
                <X size={16} />
            </button>

            {/* Main Content */}
            <div className="w-full max-w-md">
                {/* Slide Content */}
                <div className={`text-center transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Icon */}
                    <div className={`w-24 h-24 mx-auto mb-8 rounded-3xl ${colors.bg}/20 flex items-center justify-center ${colors.text} shadow-2xl ${colors.glow}`}>
                        {slide.icon}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        {slide.title}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-400 text-lg leading-relaxed mb-4 max-w-sm mx-auto">
                        {slide.description}
                    </p>

                    {/* Highlight Badge */}
                    {slide.highlight && (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${colors.bg}/10 border border-white/10 ${colors.text} text-sm font-medium`}>
                            <Sparkles size={14} className="fill-current" />
                            {slide.highlight}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="mt-12 space-y-6">
                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-2">
                        {SLIDES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentSlide
                                        ? `${colors.bg} w-6`
                                        : 'bg-white/20 hover:bg-white/40'
                                    }`}
                                aria-label={`Ir a slide ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-3">
                        {currentSlide > 0 && (
                            <button
                                onClick={prevSlide}
                                className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={20} />
                                Atrás
                            </button>
                        )}
                        <button
                            onClick={nextSlide}
                            className={`flex-1 py-4 rounded-xl ${colors.bg} text-black font-bold shadow-lg ${colors.glow} hover:brightness-110 transition-all flex items-center justify-center gap-2`}
                        >
                            {isLastSlide ? '¡Comenzar!' : 'Siguiente'}
                            {!isLastSlide && <ChevronRight size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Hook to check if onboarding should be shown
export const useOnboarding = () => {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Check if onboarding was completed
        const completed = localStorage.getItem('onboarding_completed');
        if (!completed) {
            // Small delay before showing
            setTimeout(() => setShowOnboarding(true), 500);
        }
    }, []);

    const completeOnboarding = () => {
        setShowOnboarding(false);
    };

    return { showOnboarding, completeOnboarding };
};

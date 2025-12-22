import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallBanner: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if user dismissed previously (respect for 7 days)
        // BUT only if the app was NOT uninstalled (standalone mode is false now but was true before)
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        const wasInstalled = localStorage.getItem('pwa_was_installed');

        // If app was previously installed but now is not in standalone mode, user uninstalled - show banner again
        if (wasInstalled === 'true') {
            // App was installed before, check if it's still installed
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                // User uninstalled - clear the dismiss flag to show banner again
                localStorage.removeItem('pwa_install_dismissed');
                localStorage.removeItem('pwa_was_installed');
            }
        }

        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedAt < sevenDays) {
                return;
            }
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show banner after a short delay (let user see the app first)
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
            // Mark that the app was installed so we can detect uninstall later
            localStorage.setItem('pwa_was_installed', 'true');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setShowBanner(false);
            }
        } catch (err) {
            console.error('[InstallBanner] Error:', err);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_install_dismissed', String(Date.now()));
    };

    // Don't render if installed, no prompt, or banner hidden
    if (isInstalled || !showBanner || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-2xl shadow-emerald-500/30 border border-emerald-400/30">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                    aria-label="Cerrar"
                >
                    <X size={16} />
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm">
                            Instala CalculaTú
                        </h3>
                        <p className="text-white/80 text-xs mt-0.5">
                            Acceso rápido • Funciona sin internet
                        </p>
                    </div>

                    <button
                        onClick={handleInstall}
                        className="flex-shrink-0 bg-white text-emerald-700 font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-lg"
                    >
                        <Download size={16} />
                        Instalar
                    </button>
                </div>
            </div>
        </div>
    );
};

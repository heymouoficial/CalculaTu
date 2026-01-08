/**
 * GeminiKeyManager - Operación Hydra
 * 
 * Sistema de rotación de API Keys para evitar errores 429 (Quota Exceeded)
 * de Google Gemini Free Tier.
 * 
 * Uso:
 *   const manager = GeminiKeyManager.getInstance();
 *   const key = manager.getKey();
 *   
 *   // Si falla con 429:
 *   manager.reportError(key);
 *   const newKey = manager.getKey(); // Automáticamente rota
 * 
 * @author Multiversa Lab
 * @version 1.0.0
 */

export interface KeyPoolStatus {
    totalKeys: number;
    availableKeys: number;
    failedKeys: string[];
    currentKeyMasked: string | null;
}

export class GeminiKeyManager {
    private static instance: GeminiKeyManager;
    private pool: string[];
    private currentIndex: number = 0;
    private failedKeys: Map<string, number> = new Map(); // key → timestamp when failed
    private readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hora de cooldown

    private constructor() {
        // Intentar leer el pool de keys desde la variable de entorno
        const poolString = typeof import.meta !== 'undefined' && import.meta.env
            ? import.meta.env.VITE_GEMINI_KEY_POOL
            : undefined;

        if (poolString) {
            try {
                this.pool = JSON.parse(poolString);
                console.log(`🐍 Hydra: Inicializado con ${this.pool.length} API Keys`);
            } catch (e) {
                console.error('❌ Hydra: Error parseando VITE_GEMINI_KEY_POOL:', e);
                this.pool = [];
            }
        } else {
            console.warn('🐍 Hydra: Variable VITE_GEMINI_KEY_POOL no encontrada, buscando fallback...');
            // Fallback: usar la key única si existe
            const singleKey = typeof import.meta !== 'undefined' && import.meta.env
                ? import.meta.env.VITE_GEMINI_API_KEY
                : undefined;

            this.pool = singleKey ? [singleKey] : [];
            if (singleKey) {
                console.log('🐍 Hydra: Modo single-key (legacy) activado');
            } else {
                // DEBUG: List available keys to help the user identify the issue
                const availableKeys = typeof import.meta !== 'undefined' && import.meta.env 
                    ? Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
                    : [];
                console.log('🐍 Hydra: Variables VITE_ detectadas:', availableKeys);
                console.error('❌ Hydra: Ni VITE_GEMINI_KEY_POOL ni VITE_GEMINI_API_KEY están definidas en .env.local');
            }
        }
    }

    /**
     * Obtiene la instancia única del manager (Singleton)
     */
    static getInstance(): GeminiKeyManager {
        if (!GeminiKeyManager.instance) {
            GeminiKeyManager.instance = new GeminiKeyManager();
        }
        return GeminiKeyManager.instance;
    }

    /**
     * Limpia keys que ya pasaron el cooldown
     */
    private cleanupExpiredKeys(): void {
        const now = Date.now();
        for (const [key, failedAt] of this.failedKeys.entries()) {
            if (now - failedAt > this.COOLDOWN_MS) {
                this.failedKeys.delete(key);
                console.log(`🐍 Hydra: Key ${this.maskKey(key)} recuperada del cooldown`);
            }
        }
    }

    /**
     * Enmascara una key para logs seguros
     */
    private maskKey(key: string): string {
        if (!key || key.length < 10) return '***';
        return `${key.slice(0, 6)}...${key.slice(-4)}`;
    }

    /**
     * Obtiene la siguiente API Key disponible
     * @returns La key disponible o null si todas están en cooldown
     */
    getKey(): string | null {
        this.cleanupExpiredKeys();

        if (this.pool.length === 0) {
            console.error('❌ Hydra: No hay API Keys configuradas');
            return null;
        }

        // Intentar encontrar una key disponible (round-robin)
        const startIndex = this.currentIndex;
        let attempts = 0;

        while (attempts < this.pool.length) {
            const candidateKey = this.pool[this.currentIndex];

            if (!this.failedKeys.has(candidateKey)) {
                console.log(`🐍 Hydra: Usando key ${this.maskKey(candidateKey)} (índice ${this.currentIndex})`);
                return candidateKey;
            }

            // Rotar al siguiente
            this.currentIndex = (this.currentIndex + 1) % this.pool.length;
            attempts++;
        }

        // Todas las keys están en cooldown
        console.error('❌ Hydra: Todas las keys están en cooldown');
        return null;
    }

    /**
     * Reporta que una key falló (error 429)
     * La key entra en cooldown y el índice rota al siguiente
     */
    reportError(key: string): void {
        if (!key) return;

        this.failedKeys.set(key, Date.now());
        console.warn(`🐍 Hydra: Key ${this.maskKey(key)} marcada como fallida (cooldown 1h)`);

        // Rotar al siguiente índice
        this.currentIndex = (this.currentIndex + 1) % this.pool.length;

        const nextKey = this.getKey();
        if (nextKey) {
            console.log(`🐍 Hydra: Rotando a ${this.maskKey(nextKey)}`);
        }
    }

    /**
     * Obtiene el estado actual del pool para debugging
     */
    getStatus(): KeyPoolStatus {
        this.cleanupExpiredKeys();

        const currentKey = this.pool[this.currentIndex];

        return {
            totalKeys: this.pool.length,
            availableKeys: this.pool.length - this.failedKeys.size,
            failedKeys: Array.from(this.failedKeys.keys()).map(k => this.maskKey(k)),
            currentKeyMasked: currentKey ? this.maskKey(currentKey) : null
        };
    }

    /**
     * Limpia todas las keys fallidas (para testing)
     */
    reset(): void {
        this.failedKeys.clear();
        this.currentIndex = 0;
        console.log('🐍 Hydra: Pool reseteado');
    }

    /**
     * Verifica si hay keys disponibles
     */
    hasAvailableKeys(): boolean {
        this.cleanupExpiredKeys();
        return this.pool.length > this.failedKeys.size;
    }
}

// Exportar instancia por conveniencia
export const geminiKeyManager = GeminiKeyManager.getInstance();

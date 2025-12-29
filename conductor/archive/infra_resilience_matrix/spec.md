# Operación Hydra: Especificación Técnica
## Track: `infra_resilience_matrix`

**Versión:** 1.0.0  
**Fecha:** 29 Diciembre 2024  
**Estado:** IN PROGRESS

---

## 1. Problema

El Free Tier de Google Gemini tiene límites agresivos:
- **Gemini Live API (WebSocket):** 2 llamadas/día por proyecto
- **Gemini REST API (Chat):** 5 RPM, 250K TPM

Cuando se alcanza el límite, el usuario recibe **Error 429 (Quota Exceeded)** y la experiencia se degrada completamente.

---

## 2. Solución: Operación Hydra 🐍

Implementar un sistema de **rotación de API Keys** con fallback automático, usando múltiples proyectos de Google AI Studio.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    GeminiKeyManager (Singleton)                  │
├─────────────────────────────────────────────────────────────────┤
│  Pool: [KEY_1, KEY_2, KEY_3, KEY_4]                              │
│  currentIndex: 0                                                 │
│  failedKeys: Map<string, timestamp>                              │
├─────────────────────────────────────────────────────────────────┤
│  getKey()        → Devuelve siguiente key disponible             │
│  reportError()   → Marca key como agotada, rota al siguiente     │
│  getStatus()     → Devuelve estado actual del pool               │
│  reset()         → Limpia keys fallidas (para testing)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Variable de Entorno

### Formato
```env
VITE_GEMINI_KEY_POOL='["AIzaSyXXXXXX1", "AIzaSyXXXXXX2", "AIzaSyXXXXXX3", "AIzaSyXXXXXX4"]'
```

### Parsing
```typescript
const pool: string[] = JSON.parse(import.meta.env.VITE_GEMINI_KEY_POOL || '[]');
```

---

## 4. Clase Singleton: GeminiKeyManager

```typescript
class GeminiKeyManager {
  private static instance: GeminiKeyManager;
  private pool: string[];
  private currentIndex: number = 0;
  private failedKeys: Map<string, number> = new Map(); // key → timestamp
  private readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

  private constructor() {
    this.pool = JSON.parse(import.meta.env.VITE_GEMINI_KEY_POOL || '[]');
  }

  static getInstance(): GeminiKeyManager {
    if (!GeminiKeyManager.instance) {
      GeminiKeyManager.instance = new GeminiKeyManager();
    }
    return GeminiKeyManager.instance;
  }

  getKey(): string | null { /* ... */ }
  reportError(key: string): void { /* ... */ }
  getStatus(): KeyPoolStatus { /* ... */ }
}
```

---

## 5. Diagrama de Flujo de Recuperación

```
┌──────────────┐
│  Usuario     │
│  Activa Voz  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ useSavaraLive.connect()  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ keyManager.getKey()      │
│ → Devuelve KEY_N         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ WebSocket → Gemini       │
│ (con KEY_N)              │
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    │             │
   OK          ERROR 429
    │             │
    ▼             ▼
┌────────┐  ┌──────────────────────────┐
│ ÉXITO  │  │ keyManager.reportError() │
└────────┘  │ → Marca KEY_N fallida    │
            │ → Rota a KEY_N+1         │
            └──────────┬───────────────┘
                       │
                       ▼
                ┌──────────────────────────┐
                │ ¿Quedan keys disponibles?│
                └──────────┬───────────────┘
                    ┌──────┴──────┐
                    │             │
                   SÍ            NO
                    │             │
                    ▼             ▼
             ┌───────────┐  ┌──────────────────┐
             │  REINTENTAR│  │ ERROR FINAL:     │
             │  con nueva │  │ "Servidores      │
             │  key       │  │  saturados"      │
             └───────────┘  └──────────────────┘
```

---

## 6. Integración con Componentes Existentes

### 6.1 Para VOZ (`useSavaraLive.ts`)
- Importar `GeminiKeyManager`
- Reemplazar lectura directa de `VITE_GEMINI_API_KEY`
- En `onclose` con error 429: llamar `reportError()` y reintentar con nueva key

### 6.2 Para TEXTO (`geminiService.ts`)
- Importar `GeminiKeyManager`
- Usar `getKey()` en cada llamada
- En catch de error 429: llamar `reportError()` y reintentar

### 6.3 Para API Route (`api/chat.ts`)
- Importar `GeminiKeyManager`
- Usar pool del servidor (variable de entorno sin prefijo VITE_)

---

## 7. Métricas y Observabilidad

El `getStatus()` retorna información para debugging:

```typescript
interface KeyPoolStatus {
  totalKeys: number;
  availableKeys: number;
  failedKeys: string[];     // Keys en cooldown
  currentKeyMasked: string; // "AIzaSy...1234"
}
```

---

## 8. Seguridad

- Las API Keys NUNCA se exponen completas en logs
- Se usa máscara: `${key.slice(0,6)}...${key.slice(-4)}`
- El pool se lee solo de variables de entorno (no hardcoded)
- En producción, usar variables sin prefijo `VITE_` para funciones serverless

---

## 9. Testing

```typescript
describe('GeminiKeyManager', () => {
  it('rotates keys on error', () => {
    const manager = GeminiKeyManager.getInstance();
    const key1 = manager.getKey();
    manager.reportError(key1);
    const key2 = manager.getKey();
    expect(key2).not.toBe(key1);
  });
});
```

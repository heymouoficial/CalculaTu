# Operación Hydra: Plan de Implementación
## Track: `infra_resilience_matrix`

**Objetivo:** Evitar errores 429 de Gemini mediante rotación de API Keys.  
**Tiempo Estimado:** 30-45 minutos  
**Riesgo:** Bajo (No modifica lógica de negocio, solo infraestructura)

---

## Fase 0: Preparación (5 min)

### 0.1 Crear 4 Proyectos en Google AI Studio
1. Ir a [aistudio.google.com](https://aistudio.google.com)
2. Crear 4 proyectos separados:
   - `calculatu-hydra-1`
   - `calculatu-hydra-2`
   - `calculatu-hydra-3`
   - `calculatu-hydra-4`
3. En cada proyecto, ir a **API Keys** → **Create API Key**
4. Copiar las 4 keys generadas

### 0.2 Configurar Variables de Entorno

**Local (.env.local):**
```env
VITE_GEMINI_KEY_POOL='["AIzaSyXXX1", "AIzaSyXXX2", "AIzaSyXXX3", "AIzaSyXXX4"]'
```

**Vercel (para serverless functions):**
```env
GEMINI_KEY_POOL='["AIzaSyXXX1", "AIzaSyXXX2", "AIzaSyXXX3", "AIzaSyXXX4"]'
```

---

## Fase 1: Core - GeminiKeyManager (10 min)

### 1.1 Crear el Archivo
```bash
touch src/utils/geminiKeyManager.ts
```

### 1.2 Implementar el Singleton
- Clase `GeminiKeyManager` con patrón Singleton
- Métodos: `getKey()`, `reportError()`, `getStatus()`, `reset()`
- Cooldown de 1 hora para keys fallidas
- Logging enmascarado para seguridad

**Archivo:** `src/utils/geminiKeyManager.ts`  
**Código:** Ver documento de prototipo adjunto

---

## Fase 2: Integración VOZ - useSavaraLive (10 min)

### 2.1 Modificaciones en `hooks/useSavaraLive.ts`

**Importar:**
```typescript
import { GeminiKeyManager } from '../utils/geminiKeyManager';
```

**Antes (línea ~207):**
```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

**Después:**
```typescript
const keyManager = GeminiKeyManager.getInstance();
const apiKey = keyManager.getKey();
if (!apiKey) {
  throw { code: 'NO_KEYS_AVAILABLE', message: 'Servidores saturados. Intenta en 1 hora.' };
}
```

**En onclose (línea ~292), antes de setError:**
```typescript
if (isQuotaError) {
  keyManager.reportError(apiKey);
  const newKey = keyManager.getKey();
  if (newKey && retryCount.current < 3) {
    retryCount.current++;
    setTimeout(() => connect(initialPrompt), 2000);
    return;
  }
}
```

---

## Fase 3: Integración TEXTO - geminiService (10 min)

### 3.1 Modificaciones en `services/geminiService.ts`

**Importar:**
```typescript
import { GeminiKeyManager } from '../utils/geminiKeyManager';
```

**Modificar getGeminiApiKey():**
```typescript
const getGeminiApiKey = (): string | undefined => {
  const keyManager = GeminiKeyManager.getInstance();
  return keyManager.getKey() || undefined;
};
```

**Modificar sendMessage para manejar 429:**
```typescript
async sendMessage(...): Promise<string> {
  let lastError: Error | null = null;
  const keyManager = GeminiKeyManager.getInstance();
  
  for (let attempt = 0; attempt < 3; attempt++) {
    const key = keyManager.getKey();
    if (!key) throw new Error('No API keys available');
    
    try {
      // ... existing fetch logic with `key`
      return result;
    } catch (err) {
      if (err.message?.includes('429')) {
        keyManager.reportError(key);
        lastError = err;
        continue; // Retry with next key
      }
      throw err;
    }
  }
  throw lastError || new Error('All retries failed');
}
```

---

## Fase 4: Integración API Route (5 min)

### 4.1 Modificaciones en `api/chat.ts`

**Nota:** Las funciones serverless de Vercel NO tienen acceso a `import.meta.env`. Usar `process.env`.

**Crear versión servidor del manager:**
```typescript
// En el archivo api/chat.ts, inline:
const getServerKey = (): string | null => {
  const pool = JSON.parse(process.env.GEMINI_KEY_POOL || '[]');
  if (pool.length === 0) return process.env.GEMINI_API_KEY || null;
  return pool[Math.floor(Math.random() * pool.length)]; // Simple random para serverless
};
```

---

## Fase 5: Testing y Verificación (10 min)

### 5.1 Test Manual - Chat
1. Abrir la landing page
2. Escribir: "Hola Savara"
3. Verificar respuesta
4. Revisar logs del navegador: debe mostrar key enmascarada

### 5.2 Test Manual - Voz
1. Abrir calculadora
2. Activar Savara Pro
3. Decir: "Savara, agréga 2 harinas por 480 bolívares"
4. Verificar que agrega el item
5. Si falla con 429, verificar rotación a siguiente key

### 5.3 Verificar Rotación
1. En `useSavaraLive.ts`, agregar log temporal:
   ```typescript
   console.log('🔑 Using key:', keyManager.getStatus());
   ```
2. Provocar error 429 (usar las 2 llamadas del día)
3. Verificar que rota a la siguiente key

---

## Checklist Final

- [ ] 4 API Keys creadas en Google AI Studio
- [ ] `VITE_GEMINI_KEY_POOL` configurado en `.env.local`
- [ ] `GEMINI_KEY_POOL` configurado en Vercel
- [ ] `geminiKeyManager.ts` creado y funcional
- [ ] `useSavaraLive.ts` integrado con KeyManager
- [ ] `geminiService.ts` integrado con KeyManager
- [ ] `api/chat.ts` usando pool del servidor
- [ ] Tests manuales pasados
- [ ] Logs enmascarados verificados

---

## Rollback

Si algo falla, revertir a la API Key única:

```typescript
// Fallback temporal
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || keyManager.getKey();
```

---

## Siguiente Paso: Vectorización RAG

Una vez estabilizado el Key Rotation, proceder con:
1. Poblar tabla `knowledge_base` con documentos
2. Configurar Supabase Edge Function para embeddings
3. Integrar búsqueda semántica en Savara

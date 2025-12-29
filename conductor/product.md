# Product Guide: CalculaTú SmartWeb

## 1. Initial Concept

CalculaTú is a lightweight web application designed to simplify grocery shopping and other market activities in environments with multiple currencies. It allows users to add product prices in various currencies (USD, EUR, VES) and instantly see the total converted to the local currency (Bolívares) using the official BCV exchange rate. The application also integrates an AI assistant, "Savara AI," for an enhanced user experience, supports offline use through PWA installation, and includes a licensing system for premium features. Actualmente en fase MVP avanzada, con enfoque en estabilizar la asistente de voz Savara Pro como regalo de Navidad 2025. Modelo de monetización: suscripción mensual accesible + oferta lifetime de 9.99 USD hasta el 31 de enero 2026.

## 2. Target Audience

The primary users are everyday consumers in Venezuela who need a quick, reliable, and user-friendly tool to manage their budget and expenses while shopping. This includes:
- Individuals doing their daily or weekly grocery shopping.
- Families managing household budgets.
- Anyone who frequently deals with transactions in both local and foreign currencies.
- Usuarios que buscan una asistente IA confiable para compras en supermercado, con interacción por voz natural y respuestas contextuales.

## 3. Core Features

-   **Multi-Currency Calculator:** A manual, offline-friendly mode for quick addition of product prices with totals displayed in Bs, USD, and EUR.
-   **Savara AI (Chatbot):** A real-time chat widget on the landing page, powered by the Gemini API (gemini-2.5-flash), to assist users.
-   **Savara Pro (Voice Assistant):** Asistente de voz bidireccional premium con **Identidad y Acceso al Core**. Gemini Live API sincronizada con la huella digital (MachineID) del usuario. Capaz de consultar perfiles, estados de licencia y tasas oficiales directamente desde Supabase mediante Function Calling en tiempo real.
-   **Device-Linked Licensing:** A secure licensing system that ties premium features to a user's unique device ID using signed JWTs.
-   **Global & Local Exchange Rates:** The app uses a global exchange rate from a central database (Supabase), which can be temporarily overridden by a user-specific rate for 24 hours.
-   **Progressive Web App (PWA):** The application is installable on mobile devices for easy access and offline availability.
-   **Voucher System:** Generador de tickets/receipts con estética térmica, incluyendo avatar de Savara y tasa de cambio utilizada, listo para compartir como prueba de ahorro.
-   **Portality Admin Panel:** Panel de administración con autenticación, generación de licencias JWT, gestión de trials con calendario interactivo, y publicación de tasas BCV.

## 4. Estado Actual (29 Diciembre 2024 - Beta v1.0)

### ✅ FUNCIONANDO
- **[BETA v1.0]** Proyecto estabilizado para producción.
- **[NUEVO] Savara Voz Bidireccional** (SDK oficial Google GenAI).
- **[NUEVO] RAG Integrado** con 16 chunks vectorizados en Supabase.
- **[NUEVO] Hydra Pool** de API Keys (Resiliencia 429).
- **[NUEVO] CORS BCV Fix** desplegado vía MCP.
- **[NUEVO] Reglas de Despedida** para Savara Chat y Voz.
- Banner promocional navideño con botón dorado "ACTIVAR AHORA"
- Calculadora multi-moneda (manual mode) con tasas BCV reales.
- Portality admin panel con calendario interactivo y gestión de licencias.
- Chatbot con memoria de conversación (sessionStorage).

### ⚠️ REQUIERE ACCIÓN (No Bloqueante)
- **Límites de cuota Free Tier**: El modelo Live API (`gemini-2.0-flash-exp`) solo permite 2 llamadas/día en Free Tier. Solución: Configurar facturación para obtener $300 de crédito gratuito.

### 🔧 PROBLEMAS CONOCIDOS (NO BLOQUEANTES)
- Lint errors de Deno en supabase/functions (solo IDE, no afecta producción)
- Zustand deprecation warnings (cosmético, no afecta funcionamiento)

## 5. Technology Stack

-   **Frontend:** React 19, Vite 6.4
-   **State Management:** Zustand
-   **Artificial Intelligence:** Gemini 2.5 Flash (REST API directa a v1beta)
-   **Voice AI:** Gemini 2.0 Flash Exp (WebSocket bidiGenerateContent)
-   **Backend & Database:** Supabase for database and authentication
-   **Serverless Functions:** Vercel Functions for handling license creation and verification via JWT (`jose` library)
-   **Deployment:** Vercel
-   **Date Picker:** react-day-picker + date-fns

## 6. API Keys y Variables de Entorno

> ⚠️ **NUNCA commitear keys reales.** Ver `.env.example` para plantilla.

### Local (.env.local)
```env
VITE_GEMINI_KEY_POOL='["key1", "key2", ...]'
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
VITE_PORTALITY_PIN=xxx
```

### Vercel (Production)
```env
GEMINI_KEY_POOL='["key1", "key2", ...]'
GEMINI_API_KEY=fallback_single_key
```

## 7. Modelos Gemini Usados

| Función | Modelo | Endpoint | Límite Free Tier |
|---------|--------|----------|------------------|
| Chat (Landing) | `gemini-2.5-flash` | REST API v1beta | 5 RPM, 250K TPM |
| Voz (Calculator) | `gemini-2.0-flash-exp` | WebSocket v1alpha | 2 RPD (!!!) |

## 8. Próximos Pasos

1. ✅ ~~Configurar `GEMINI_API_KEY` en Vercel y redeploy~~ (Completado)
2. ✅ ~~Verificar chat funcionando en producción~~ (Completado)
3. **[PENDIENTE]** Configurar facturación en Google AI Studio para aumentar límites
4. ✅ ~~Implementar sistema de API Keys de backup/fallback~~ (Operación Hydra)
5. **[PENDIENTE]** Preparar métricas de uso para análisis post-navidad
6. ✅ ~~Vectorizar base de conocimiento (knowledge_base) para RAG~~ (Completado)
7. ✅ ~~Fix CORS Tasas BCV~~ (Completado vía MCP)
8. **[PENDIENTE]** Optimización final de UI/UX Mobile-First

## 9. Sesión 28-Dic-2024 - Resumen de Cambios

### Archivos Modificados:
- `constants.tsx` - Añadidas reglas de conversación para evitar saludos repetidos
- `services/geminiService.ts` - Tokens aumentados a 8192, modelo corregido
- `dev/chatApiPlugin.ts` - Límite oculto de 200 tokens removido, modelo actualizado
- `hooks/useSavaraLive.ts` - Mejor manejo de errores (1008, quota), modelo corregido
- `components/CalculatorView.tsx` - Banner de error solo 1 vez (localStorage)
- `components/ChatWidget.tsx` - Memoria de chat persistente (sessionStorage)

## 10. Sesión 29-Dic-2024 - Operación Hydra + Savara Voice SDK 🐍🎤

### Tracks Completados:

#### 1. Operación Hydra (Pool de API Keys)
- `utils/geminiKeyManager.ts` - Singleton con rotación round-robin
- Pool de 4 keys, cooldown de 1 hora
- Integrado en voz, chat y serverless

#### 2. Savara Voice SDK Oficial
- `services/savaraLiveSDK.ts` - Implementación con @google/genai
- `hooks/useSavaraSDK.ts` - Hook React compatible
- Modelo: `gemini-2.5-flash-native-audio-preview-09-2025`
- Audio bidireccional + Function Calling
- Tasas BCV inyectadas en system instruction

#### 3. RAG Vectorizado
- `scripts/ingest-knowledge.ts` - Script de ingestión
- 16 chunks vectorizados en knowledge_base
- Embeddings con text-embedding-004

#### 4. Fix Producción & CORS
- `api/chat.ts` reescrito como standalone.
- Despliegue de `bcv-rates` v4 vía Supabase MCP con headers CORS permitidos.
- Verificación en navegador: Tasas sincronizadas y sin bloqueos.

#### 5. Savara Polish (Beta v1.0)
- **Reglas de Despedida**: Implementado en `constants.tsx`, `api/chat.ts` y `savaraLiveSDK.ts`.
- **Versión Core**: Actualizado a `v1.0.0-beta`.

### Próximo:
- Optimización UX y lanzamiento final.

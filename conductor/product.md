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

## 4. Estado Actual (28 Diciembre 2024)

### ✅ FUNCIONANDO
- Banner promocional navideño con botón dorado "ACTIVAR AHORA"
- Botón otorga 24h de Savara Pro gratis
- Calculadora multi-moneda (manual mode)
- Tasas BCV en Supabase (USD: 294.96, EUR: 347.77)
- Portality admin panel con calendario interactivo react-day-picker
- Sistema de licencias JWT con device lock
- Social media links (TikTok, Instagram, Threads, Facebook, LinkedIn, X)
- Voice mode (Savara Live) via WebSocket
- **[NUEVO] Chatbot con memoria de conversación** (sessionStorage)
- **[NUEVO] Respuestas largas sin truncar** (8192 tokens max)
- **[NUEVO] Savara no repite saludos innecesarios**
- **[NUEVO] Banner de error solo aparece 1 vez (localStorage)**

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

### Local (.env.local)
```
VITE_GEMINI_API_KEY=AIzaSyB2pUIh2GWNX-C5sxC_3cLIztmcptdliRU
VITE_SUPABASE_URL=https://wkjlpfwiflecwwnrvvcv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_nkBQcnkVK4PG-K7E6n-DYw_5GBCq31Q
VITE_PORTALITY_PIN=210311
```

### Vercel (ACCIÓN REQUERIDA)
Agregar en Vercel > Settings > Environment Variables:
```
GEMINI_API_KEY=AIzaSyB2pUIh2GWNX-C5sxC_3cLIztmcptdliRU
```
**Nota:** Las variables `VITE_*` solo funcionan en el cliente. Para serverless functions en Vercel necesitas `GEMINI_API_KEY` sin prefijo.

## 7. Modelos Gemini Usados

| Función | Modelo | Endpoint | Límite Free Tier |
|---------|--------|----------|------------------|
| Chat (Landing) | `gemini-2.5-flash` | REST API v1beta | 5 RPM, 250K TPM |
| Voz (Calculator) | `gemini-2.0-flash-exp` | WebSocket v1alpha | 2 RPD (!!!) |

## 8. Próximos Pasos

1. ✅ ~~Configurar `GEMINI_API_KEY` en Vercel y redeploy~~ (Completado)
2. ✅ ~~Verificar chat funcionando en producción~~ (Completado)
3. **[PENDIENTE]** Configurar facturación en Google AI Studio para aumentar límites
4. **[PENDIENTE]** Implementar sistema de API Keys de backup/fallback
5. **[PENDIENTE]** Preparar métricas de uso para análisis post-navidad

## 9. Sesión 28-Dic-2024 - Resumen de Cambios

### Archivos Modificados:
- `constants.tsx` - Añadidas reglas de conversación para evitar saludos repetidos
- `services/geminiService.ts` - Tokens aumentados a 8192, modelo corregido
- `dev/chatApiPlugin.ts` - Límite oculto de 200 tokens removido, modelo actualizado
- `hooks/useSavaraLive.ts` - Mejor manejo de errores (1008, quota), modelo corregido
- `components/CalculatorView.tsx` - Banner de error solo 1 vez (localStorage)
- `components/ChatWidget.tsx` - Memoria de chat persistente (sessionStorage)


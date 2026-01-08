# CALCULATÚ: El Conductor (Herramienta de Supervivencia)

**Este documento es la FUENTE DE LA VERDAD TÉCNICA para CalculaTú.**
Define la arquitectura, el propósito y la infraestructura crítica.

---

## 🎯 Visión

CalculaTú (Supermarket Survival Tool) es una herramienta web de supervivencia financiera para el mercado venezolano.
**Clave:** Mobile-First, Offline-Capable, Voice-Powered (Savara).

## 🏗️ Arquitectura del Sistema

### 1. El Cerebro: SAVARA AI (Gemini Live)

- **Modelo:** Gemini 2.0 Flash-Exp (Multimodal Live API).
- **Rol:** Asistente de compras por voz.
- **Conectividad:** WebSocket directo para latencia ultra-baja.
- **Audio:** Bidireccional (Input/Output).

### 2. La Base: React + Vite (SPA)

- **Frontend:** React 18+ (SPA).
- **Estilos:** Tailwind CSS 4 + ShadCN UI.
- **Hosting:** Hostinger VPS (Producción).
- **Deploy:** Manual/Scripted a VPS.

### 3. Backend & Persistencia

- **Supabase:**
  - **Auth:** Gestión de usuarios (Google/Email).
  - **DB:** Historial de compras, listas guardadas, configuración de usuario.
  - **Edge Functions:** Tokens para Gemini, gestión de licencias.

## 📂 Estructura de "La Verdad" (Directorios)

- `/conductor`: Guías de producto, tracks y workflows.
  - `CALCULATU_CONDUCTOR.md`: Este archivo.
  - `product.md`: Especificaciones detalladas.
- `/src/components`: UI Atomic Components.
- `/src/hooks`: Lógica de React (`useSavaraLive`).
- `/src/services`: Integraciones externas.

## 🛡️ Protocolos de Estabilidad

1. **Hydra Protocol:** Rotación de API Keys para evitar límites de cuota.
2. **Offline First:** La calculadora básica debe funcionar sin internet.
3. **Low Latency:** Prioridad absoluta a la velocidad de respuesta de voz.

---

**Estado Actual:**

- ✅ **PRODUCCIÓN:** Estable en dominio público.
- ✅ Savara Voice: Integrado y funcional.
- 🚧 Pagos: Pendiente automatización (Enero 2026).

**Responsable:** Multiversa Lab

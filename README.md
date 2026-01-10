# 🇻🇪 CalculaTú SmartWeb (Beta 1.0)

**CalculaTú** es la herramienta definitiva de supervivencia financiera para Venezuela. Una Web App progresiva (PWA) diseñada para unificar tu bolsillo en Bolívares (VES), Dólares (USD) y Euros (EUR) en tiempo real, potenciada por **Savara AI**, tu copiloto de compras por voz.

> **Estado:** 🚀 **Beta 1.0 (Stable - Production Ready)** > **Stack:** React 19 + Vite + Supabase + Gemini 2.5 Flash (Live API)

![CalculaTú Preview](https://calculatu.app/CalculaTu-Featured.jpg)

## 🔥 Características Principales (v1.0)

### 🤖 Savara Pro (Live Audio)

- **Asistente de Voz Bidireccional:** Habla con Savara para agregar productos ("Agrega 2 harinas y un queso") o consultar precios.
- **Latencia Ultra-Baja:** Optimizado con WebSockets y `AudioWorklet` para respuestas casi instantáneas.
- **Límites Inteligentes:** Sistema de "Taxímetro" de voz con persistencia en la nube.
  - **FreePass / Promo:** 30 min/mes ($1/mes - Launch Promo).
  - **Lifetime:** 60 min/mes ($10 Lifetime - Launch Promo).
- **Operación Hydra:** Pool de 4 API Keys rotativas con Failover automático para máxima estabilidad.
- **Contexto Financiero:** Savara conoce la tasa del día y convierte divisas automáticamente mientras hablas.

### ⚡ Cuenta Rápida (Nuevo)

- **Supermarket Style:** Sumadora rápida diseñada para el ajetreo del mercado.
- **Teclado Nativo:** Usa el teclado numérico de tu móvil para máxima velocidad.
- **Doble Moneda:** Agrega montos en USD o VES y ve el total acumulado en ambas monedas al instante.
- **Sin Fricción:** Alterna entre lista detallada y cuenta rápida con un solo toque.

### 🛡️ Modo Búnker (Offline-First)

- **Resistencia a Fallos:** La app funciona perfectamente sin internet. Las tasas se cachean localmente por 24h.
- **Sincronización Silenciosa:** Cuando vuelve la conexión, tus consumos y licencias se sincronizan con Supabase sin interrumpir tu flujo.

### 🔐 Seguridad & Licencias

- **Hardware Fingerprint:** Las licencias se vinculan criptográficamente al dispositivo (`MachineID`) usando firmas `ES256`.
- **Anti-Warp:** Protección contra clonación de sesiones.
- **Persistencia de Saldo:** Tu consumo de voz se guarda en el backend (`contracts`), impidiendo que resetear el caché burle los límites.

### 📊 Portality (God Mode Admin)

- **Dashboard en Tiempo Real:** Monitor de nodos activos, tasas de cambio y logs del sistema.
- **Gestión de Usuarios:** Generación de licencias, extensión de contratos y auditoría de huellas digitales.
- **Control de Tasas:** Ingesta manual o automática de tasas BCV/Paralelo.

## SEO & Distribución

- **PWA Instalable:** `manifest` y `service worker` optimizados para "Add to Home Screen".
- **Social Ready:** Metadata completa (OpenGraph, Twitter Cards) para compartir recibos y enlaces.
- **Indexación:** `sitemap.xml` y `robots.txt` configurados para máxima visibilidad.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, Vite, Tailwind CSS 4 (con ShadCN UI).
- **State Management:** Zustand (Persist + Sync Logic).
- **Backend / DB:** Supabase (PostgreSQL + RLS + Edge Functions).
- **AI Core:** Google Gemini 2.5 Flash (Multimodal Live API).
- **Cryptography:** `jose` (JWT/JWE) para firmas y validación.
- **Package Manager:** PNPM (Speed & Security).

## 🚀 Instalación y Desarrollo

1. **Clonar y Preparar:**

   ```bash
   git clone <repo>
   cd CalculaTu
   pnpm install
   ```

2. **Variables de Entorno (.env.local):**

   ```env
   VITE_GEMINI_API_KEY=...
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_PORTALITY_PIN=...
   ```

3. **Correr en Local:**
   ```bash
   pnpm dev
   ```

## ☁️ Despliegue (Vercel)

El proyecto incluye `vercel.json` optimizado para SPA + Serverless Functions.

- **Build Command:** `pnpm build`
- **Output Directory:** `dist`

---

## 📜 Licencia & Derechos

**Copyright © 2025–2026 MultiversaGroup.**

Todos los derechos reservados. **CalculaTú**, **Savara AI** y **Portality** son propiedad intelectual exclusiva de sus creadores: **Runa** y **HeyMou** (MultiversaGroup).

Este proyecto y todas sus obras derivadas cuentan con **registro de autoría y timestamp oficial en SafeCreative**, garantizando la protección de los derechos morales y patrimoniales de sus autores.

> _Hecho con ❤️ y ⚡ en Venezuela por Runa & HeyMou._

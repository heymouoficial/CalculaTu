# CalculaTu SmartWeb

**CalculaTu** es una web app ligera (React + Vite) para hacer mercado **sin estrés**: suma productos en USD/EUR/VES y convierte a bolívares con tasa BCV (manual por ahora), con **Savara AI** (chat en landing y voz en la calculadora Pro), **PWA instalable**, y un sistema de **licencias** vinculado a huella digital (deviceId).

## Funciones principales

- **Modo Manual (offline-friendly)**: suma rápida de productos y total en Bs / USD / EUR.
- **Savara AI (Chatbot Landing)**: chat en tiempo real usando **Gemini Live API (TEXT)**.
- **Savara Pro (Voz)**: asistente de voz usando **Gemini Live API (AUDIO)** (requiere licencia).
- **Licencias por huella digital**: activación mediante token firmado (JWT) ligado a `deviceId`.
- **Tasa global (Supabase)**: persistencia en Supabase con **RLS** para que solo admin autorizado actualice.
- **Tasa local por usuario (24h)**: override temporal de tasa por 24 horas en cache, ligado al `deviceId`.
- **PWA**: `manifest` + `service worker` (sin plugins) para instalación.

## Stack

- **Frontend**: React 19 + Vite
- **State**: Zustand
- **AI**: `@google/genai` (Gemini Live)
- **DB/Auth**: Supabase (`@supabase/supabase-js`)
- **Licencias**: JWT firmado con `jose` (Vercel Functions)
- **Deploy**: Vercel
- **Package manager**: PNPM

## Rutas

- **`/`**: landing + chat widget
- **`/portality`**: portal interno para:
  - emitir/verificar tokens de licencia por `deviceId`
  - login Supabase (admin) y edición de tasa global

## Variables de entorno

### Frontend (Vercel → Environment Variables)

- **`GEMINI_API_KEY`**: clave de Gemini (se inyecta en build para el cliente).
- **`VITE_SUPABASE_URL`**: URL del proyecto Supabase.
- **`VITE_SUPABASE_ANON_KEY`**: anon key de Supabase.

### Serverless (Vercel Functions)

- **`LICENSE_SIGNING_KEY`**: secreto para firmar/verificar tokens de licencia.
- **`PORTAL_KEY`** *(opcional recomendado)*: protege la emisión de tokens en `/api/license/create` (header `x-portality-key`).

## Supabase (schema + RLS)

1. Abre el editor SQL en Supabase.
2. Ejecuta el script:
   - `supabase/schema.sql`

Esto crea `public.exchange_rates` con:

- **Lectura pública** (anon/auth)
- **Escritura solo admin** si el email del JWT coincide con **`multiversagroup@gmail.com`**

> Importante: crea el usuario admin en Supabase Auth con ese email (email/password).

## Licencias

- **Generación**: `POST /api/license/create` (requiere `LICENSE_SIGNING_KEY`, opcional `PORTAL_KEY`)
- **Validación**: `POST /api/license/verify`
- El token queda **ligado al `deviceId`** (`sub`) para evitar reutilización en otros dispositivos.

## Instalación / desarrollo

```bash
pnpm install
pnpm dev
```

Build:

```bash
pnpm build
pnpm preview
```

## Deploy en Vercel

El repo incluye `vercel.json` con:

- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm build`
- Output: `dist`
- Rewrites SPA (sin romper `/api/*`)

## Copyright / Derechos

Copyright © 2025–2026 **MultiversaGroup**.  
**CalculaTu** y **Multiversa** son obras protegidas. Los titulares (fundador y co-fundadora, **Runa Gold**) mantienen los derechos y cuentan con **registro/timestamp en SafeCreative (LOCK‑IN)**.

**All rights reserved.** No se concede licencia de uso, copia, modificación o distribución sin autorización expresa por escrito.



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
-   **Savara AI (Chatbot):** A real-time chat widget on the landing page, powered by the Gemini API, to assist users.
-   **Savara Pro (Voice Assistant):** Asistente de voz bidireccional premium (WebSocket + @google/genai) con memoria contextual dinámica: lee la lista de productos y tasas BCV en tiempo real para respuestas inteligentes (ej: '¿Cuánto llevo?' o '¿Me alcanza para X?').
-   **Device-Linked Licensing:** A secure licensing system that ties premium features to a user's unique device ID using signed JWTs.
-   **Global & Local Exchange Rates:** The app uses a global exchange rate from a central database (Supabase), which can be temporarily overridden by a user-specific rate for 24 hours.
-   **Progressive Web App (PWA):** The application is installable on mobile devices for easy access and offline availability.
-   **Voucher System:** Generador de tickets/receipts con estética térmica, incluyendo avatar de Savara y tasa de cambio utilizada, listo para compartir como prueba de ahorro.

## 4. Logros Técnicos Recientes

- Dual Engine Architecture: Savara Live (voz bidireccional vía WebSocket) y Savara Chat (HTTP estable).
- Robustez: Manejo elegante de límites API (429), CSP estricto, ejecución 100% en navegador (zero latency).
- Sincronización bidireccional entre voz y UI manual.

## 5. Technology Stack

-   **Frontend:** React 19, Vite
-   **State Management:** Zustand
-   **Artificial Intelligence:** `@google/genai` (Gemini Live API)
-   **Backend & Database:** Supabase for database and authentication.
-   **Serverless Functions:** Vercel Functions for handling license creation and verification via JWT (`jose` library).
-   **Deployment:** Vercel

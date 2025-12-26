# Tech Stack: CalculaTú SmartWeb

## 1. Frontend Technologies

-   **Framework:** React 19
-   **Build Tool:** Vite
-   **State Management:** Zustand + TanStack Query
-   **Styling:** Tailwind CSS 4 + ShadCN UI (with Liquid Glass aesthetic utilities)

## 2. Backend & API

-   **Serverless Functions:** Vercel Functions (TypeScript/Node.js environment)
-   **AI Integration:** `@google/genai` (Gemini Live API for both chat and voice)
-   **Authentication & Licensing:** JWT (`jose` library) for token signing and verification.

## 3. Database & Services

-   **Database:** Supabase (PostgreSQL compatible)
-   **Supabase Client:** `@supabase/supabase-js`

## 4. Deployment & Infrastructure

-   **Deployment Platform:** Vercel
-   **Package Manager:** PNPM
-   **Version Control:** Git

## 5. Other Tools & Practices

-   **TypeScript:** Used across frontend and serverless functions for type safety.
-   **Progressive Web App (PWA):** Utilizes `manifest` and `service worker` for installability and offline capabilities.

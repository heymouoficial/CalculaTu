# Plan de Implementación: Lanzamiento Navideño

## Fase 1: Pruebas de Funcionalidad Central y Robustez

-   [x] **Task:** Configurar entorno de pruebas en dispositivo Android físico. (Manual user confirmation)
-   [x] **Task:** Escribir y ejecutar script de prueba para el flujo de voz completo (FR1.1, FR1.2). (Bug found and fixed: Consolidated conflicting Gemini SDKs to resolve API connection failure.)
    -   Sub-task: Agregar 5 productos por voz.
    -   Sub-task: Preguntar "¿Cuánto llevo en total?".
    -   Sub-task: Preguntar "¿Me alcanza para [producto X]?".
    -   Sub-task: Preguntar por el total en dólares y euros.
-   [x] **Task:** Refactorizar Chatbot de Landing para arquitectura Stateless (Serverless).
    -   Sub-task: Eliminar sesión global en `api/chat.ts`.
    -   Sub-task: Implementar envío de historial desde `ChatWidget.tsx`.
-   [x] **Task:** Implementar Personalización de Usuario (SavaraPro).
    -   Sub-task: Crear tabla `profiles` en Supabase.
    -   Sub-task: Añadir persistencia de `userName` en Store.
    -   Sub-task: Actualizar `useSavaraLive` para inyectar nombre en contexto y gestionar saludos únicos.
-   [ ] **Task:** Validar la memoria contextual de Savara Pro (FR1.3).
    -   Sub-task: Verificar que las respuestas usen los datos del carrito en tiempo real.
    -   Sub-task: Verificar que Savara recuerde el nombre del usuario tras reiniciar.
-   [ ] **Task:** Simular y validar el manejo de errores (FR2).
    -   Sub-task: Simular error de API 429 y verificar mensaje amigable.
    -   Sub-task: Simular pérdida de conexión y verificar comportamiento.
    -   Sub-task: Probar flujo de denegación y habilitación de permiso de micrófono.
-   [ ] **Task:** Verificar la sincronización bidireccional entre la voz y la UI (FR3).
-   [ ] **Task:** Conductor - User Manual Verification 'Fase 1: Pruebas de Funcionalidad Central y Robustez' (Protocol in workflow.md)

## Fase 2: Validación de Features Complementarias

-   [ ] **Task:** Implementar y probar la generación del voucher térmico (FR4).
    -   Sub-task: Asegurar que todos los datos sean precisos.
    -   Sub-task: Verificar la funcionalidad de compartir.
-   [ ] **Task:** Probar el flujo completo de monetización (FR5).
    -   Sub-task: Realizar una compra de prueba para la oferta "lifetime".
    -   Sub-task: Realizar una suscripción de prueba mensual.
-   [ ] **Task:** Conductor - User Manual Verification 'Fase 2: Validación de Features Complementarias' (Protocol in workflow.md)

## Fase 3: Bug Fixing y Despliegue Final

-   [ ] **Task:** Recopilar y documentar todos los bugs encontrados durante las Fases 1 y 2.
-   [ ] **Task:** Priorizar y solucionar todos los bugs críticos y de alta prioridad.
-   [ ] **Task:** Realizar una ronda final de pruebas de regresión.
-   [ ] **Task:** Preparar la rama `main` para el despliegue (merge final, chequeos de CI).
-   [ ] **Task:** Ejecutar el despliegue de producción en Vercel (FR6).
-   [ ] **Task:** Monitorear la aplicación post-lanzamiento.
-   [ ] **Task:** Conductor - User Manual Verification 'Fase 3: Bug Fixing y Despliegue Final' (Protocol in workflow.md)
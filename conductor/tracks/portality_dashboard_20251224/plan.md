# Plan de Implementación: Portality Dashboard

## Fase 1: Autenticación y Acceso

- [x] **Task:** Investigar y solucionar el error "no autorizado" en las rutas de la API de administración. [8690c47]
- [x] **Task:** Crear una ruta protegida para el dashboard (ej: `/portal`).
- [x] **Task:** Implementar la UI para el login de dos factores (PIN numérico -> Formulario de Usuario/Contraseña).
- [~] **Task:** Conductor - User Manual Verification 'Fase 1: Autenticación y Acceso'

## Fase 2: Funcionalidades del Dashboard

- [ ] **Task:** Diseñar y construir la UI base del dashboard con navegación entre secciones (Tasas, Licencias).
- [ ] **Task:** Implementar el componente para visualizar y actualizar las tasas de cambio manualmente.
- [ ] **Task:** Implementar el componente para generar tokens de licencia a partir de un MachineID.
- [ ] **Task:** Implementar el componente para extender trials, incluyendo un selector de calendario.
- [ ] **Task:** Conductor - User Manual Verification 'Fase 2: Funcionalidades del Dashboard'

## Fase 3: Integración y Pruebas

- [ ] **Task:** Añadir pruebas unitarias y de integración para la lógica y los componentes del dashboard.
- [ ] **Task:** Asegurar que el estilo visual sea coherente con el resto de la aplicación.
- [ ] **Task:** Realizar una prueba completa del flujo de administración (desde el login hasta la generación de una licencia).
- [ ] **Task:** Conductor - User Manual Verification 'Fase 3: Integración y Pruebas'

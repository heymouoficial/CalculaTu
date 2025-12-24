# Spec: Portality Dashboard

## 1. Título

Implementación del Dashboard de Administración "Portality"

## 2. Descripción

Crear un panel de administración seguro y funcional para gestionar aspectos clave de la aplicación CalculaTú, incluyendo licencias, períodos de prueba, y configuraciones operativas como las tasas de cambio. Este dashboard es una herramienta interna para el administrador (`multiversagroup@gmail.com`).

## 3. Requisitos Funcionales Clave (FRs)

### FR1: Acceso y Seguridad
- **FR1.1:** Solucionar el error actual de "no autorizado" que impide el acceso al panel.
- **FR1.2:** Implementar un flujo de login en dos pasos: primero un PIN de seguridad y luego un formulario de usuario/contraseña para el único usuario administrador.

### FR2: Gestión de Tasas de Cambio
- **FR2.1:** Crear una UI que muestre las tasas de cambio actuales de forma dinámica.
- **FR2.2:** Permitir al administrador actualizar manualmente estas tasas y guardar los cambios.

### FR3: Gestión de Licencias y Pruebas (Trials)
- **FR3.1:** Crear una UI para generar tokens de licencia (JWT) a partir de un `MachineID` de cliente.
- **FR3.2:** Implementar una UI con un selector de calendario para extender fácilmente la fecha de finalización de los períodos de prueba (trials).

## 4. Requisitos No Funcionales (NFRs)

- **NFR1:** El dashboard debe ser una ruta protegida y no descubrible por usuarios finales.
- **NFR2:** La interfaz debe ser simple, funcional y seguir la estética general del proyecto.
- **NFR3:** Todas las operaciones que modifican el estado de la aplicación (actualizar tasas, generar licencias) deben ser seguras y estar validadas.

# Spec: Track de Lanzamiento Navideño

## 1. Título

Validación exhaustiva y lanzamiento estable de CalculaTú como regalo navideño 24 dic 2025

## 2. Descripción

Este track es la máxima prioridad para el equipo. El objetivo es asegurar la estabilidad y funcionalidad completa de la aplicación, con un enfoque especial en la asistente de voz Savara Pro, antes del lanzamiento programado para el 24 de diciembre de 2025. El lanzamiento se posiciona como un "regalo navideño" para las familias venezolanas, por lo que la calidad y la experiencia del usuario deben ser excepcionales.

## 3. Requisitos Funcionales Clave (FRs)

### FR1: Validación del Flujo de Voz de Savara Pro
- **FR1.1:** Los usuarios deben poder agregar productos a su carrito de compras utilizando comandos de voz naturales en un dispositivo Android.
- **FR1.2:** Los usuarios deben poder realizar preguntas contextuales sobre su compra, tales como "¿Cuánto llevo en total?", "¿Me alcanza para [producto]?", y "¿Cuánto sería eso en [moneda]?".
- **FR1.3:** Savara Pro debe acceder y utilizar en tiempo real los datos del carrito de compras y las tasas de cambio del BCV para formular respuestas precisas.

### FR2: Robustez y Manejo de Errores
- **FR2.1:** En caso de alcanzar el límite de la API (error 429), la aplicación debe mostrar un mensaje amigable al usuario y, si es posible, ofrecer una funcionalidad de fallback.
- **FR2.2:** La aplicación debe gestionar de forma elegante la pérdida de conexión a internet, informando al usuario sin interrumpir abruptly la experiencia.
- **FR2.3:** Si se deniega el permiso del micrófono, la aplicación debe guiar al usuario sobre cómo habilitarlo.

### FR3: Sincronización de UI y Voz
- **FR3.1:** Cualquier acción realizada a través de un comando de voz (ej. agregar un producto) debe reflejarse instantáneamente en la interfaz de usuario manual (el Dock).
- **FR3.2:** Cualquier acción realizada en la UI manual debe ser reconocida por el estado contextual de Savara Pro.

### FR4: Funcionalidad del Voucher Térmico
- **FR4.1:** La aplicación debe ser capaz de generar un "voucher" o recibo con una estética de ticket térmico.
- **FR4.2:** El voucher debe incluir todos los productos, el total en las diferentes monedas, la tasa de cambio utilizada y el avatar de Savara.
- **FR4.3:** Los usuarios deben poder compartir fácilmente este voucher.

### FR5: Validación del Modelo de Monetización
- **FR5.1:** El flujo para activar la oferta "lifetime" de 9.99 USD debe ser probado de principio a fin.
- **FR5.2:** El flujo para la suscripción mensual debe ser validado.

### FR6: Despliegue
- **FR6.1:** Todo el código en la rama `main` debe pasar las pruebas y estar en un estado estable.
- **FR6.2:** El despliegue final en Vercel debe ejecutarse sin errores.

## 4. Requisitos No Funcionales (NFRs)

- **NFR1:** La aplicación debe tener un rendimiento fluido en dispositivos Android de gama media.
- **NFR2:** La latencia en las respuestas de Savara Pro debe ser mínima para no interrumpir la conversación.
- **NFR3:** La interfaz debe ser altamente legible y usable bajo las condiciones de un supermercado (luz variable, uso con una mano).

## 5. Fuera de Alcance (Out of Scope)

-   Nuevas funcionalidades no mencionadas en los requisitos.
-   Soporte para plataformas que no sean navegadores web en Android.
-   Cambios de diseño importantes en la UI existente.

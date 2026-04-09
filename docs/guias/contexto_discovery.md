# Documento Maestro de Contexto — Discovery cerrado

Monetización reusable de guías, contenido y productos digitales dentro de Lobra

## 0. Propósito de este documento

Este documento resume las decisiones ya tomadas en Discovery para que la siguiente fase de Arquitectura no reabra temas ya definidos.

Su objetivo es servir como contexto maestro para diseñar una solución reusable dentro de Lobra que permita monetizar distintos temas, nichos y funnels sin reconstruir el sistema cada vez.

Este documento NO entra a código ni a arquitectura técnica detallada.
Solo congela visión, alcance funcional, principios y decisiones base.

---

## 1. Objetivo del sistema

Construir dentro de Lobra una base reusable para monetizar contenido digital en distintos temas y nichos, soportando funnels de adquisición, captura, venta, acceso, descargables y monetización posterior.

La intención no es crear un producto único, sino una infraestructura funcional reusable para lanzar nuevos temas con mínimo retrabajo.

---

## 2. Modelo funcional que la solución debe soportar

Flujo base objetivo:

1. Usuario llega desde una fuente de tráfico
2. Ve contenido parcial en una landing o punto de entrada
3. Se registra para obtener contenido adicional
4. Recibe acceso a continuación del contenido
5. Avanza hacia una oferta pagada
6. Compra una guía, bundle u otro producto
7. Obtiene acceso a contenido completo y herramientas descargables
8. Puede entrar a seguimiento, upsell o nuevos funnels

---

## 3. Principios congelados

1. La solución debe servir para múltiples temas y nichos futuros
2. El contenido debe poder vivir en web, no depender solo de PDFs
3. Debe existir separación clara entre lo público, lo capturado y lo pagado
4. Debe soportar productos, bundles, herramientas, cursos, sesiones y accesos
5. Debe permitir medición del funnel
6. Debe minimizar retrabajo cuando se lance un nuevo tema
7. Debe evitar hardcode innecesario
8. La validación comercial tiene prioridad sobre la perfección técnica
9. Se puede simplificar implementación, pero no romper el modelo
10. Nada nuevo debe amarrarse a un solo nicho si puede resolverse de forma reusable

---

## 4. Activos y base existente

Ya existe dentro de Lobra:

1. Landing skeleton reutilizable
2. Checkout page skeleton reutilizable
3. Sistema de correos transaccionales por Resend
4. Sistema de listas y correos por Brevo
5. Lista de leads existente
6. Lista de compradores existente
7. Integración con Stripe existente
8. Plataforma corriendo sobre Lobra con Supabase y Vercel
9. Cursos y sesiones 1 a 1 ya existen de algún modo y deberán integrarse a embudos futuros

Conclusión:
No se parte de cero.
La fase de arquitectura debe enfocarse en adaptar, completar, ordenar y desacoplar.

---

## 5. Definición real del problema

No se está construyendo una “guía digital”.
Se está construyendo un sistema reusable de monetización de contenido.

Unidad real del sistema:
Contenido → Lead → Relación → Oferta → Acceso → Expansión

Si se diseña bien:
cada nuevo tema requerirá principalmente contenido y configuración.

Si se diseña mal:
cada nuevo tema requerirá lógica, páginas y flujos nuevos.

---

## 6. Decisiones tomadas en Discovery

### 6.1 Niveles de contenido

Se confirma un modelo de 4 niveles:

1. Público
2. Lead
3. Pre-pago
4. Pago

Aclaración clave:
Estos niveles no representan solo “versión corta vs versión completa”.
Representan niveles de intención y avance del usuario dentro del funnel.

Definición conceptual:

* Público: gancho y valor inicial
* Lead: continuación del contenido y captura de interés
* Pre-pago: contenido que acerca a la decisión de compra
* Pago: contenido completo, herramientas, ejecución o acceso final

Punto crítico:
El nivel 3 es donde se gana o se pierde el dinero.

---

### 6.2 Estructura del contenido

Se confirma que el contenido debe estructurarse de forma modular por bloques.

No debe modelarse como páginas rígidas e independientes por cada etapa, porque eso duplica contenido y rompe reutilización.

Principio:
Se escribe una vez y se controla qué bloques se revelan según nivel, contexto o acceso.

---

### 6.3 Relación contenido vs producto

Se confirma que contenido y producto deben estar desacoplados.

El contenido existe por sí mismo.
El producto no “es” el contenido.
El producto funciona como llave de acceso a contenido, herramientas, acciones o beneficios.

Esto permite:

* vender una misma guía sola o en bundle
* reutilizar contenido
* crear promos y upsells sin duplicar activos
* integrar cursos, sesiones y otras ofertas bajo un mismo modelo

---

### 6.4 Funnel como entidad

Se confirma que el funnel debe existir como entidad propia.

No debe tratarse como simple secuencia de páginas enlazadas.

Un funnel representa el recorrido completo del usuario y debe contemplar:

* objetivo
* etapas
* contenido asociado
* productos asociados

---

### 6.5 Modelo de usuario

Se confirma que el usuario no debe tener un único estado global.

Debe tener estado por funnel.

Ejemplo conceptual:
un mismo usuario puede ser lead en un funnel y cliente en otro.

Esto permitirá:

* seguimiento real
* personalización
* automatización futura
* mejor medición del avance por embudo

---

### 6.6 Tracking

Se confirma que el tracking base debe construirse alrededor de cambios de etapa dentro del funnel.

No debe depender exclusivamente de eventos analíticos dispersos.

Se deben priorizar estas señales:

* entrada al funnel
* cambio de etapa
* compra

La analítica externa deberá consumir señales del sistema, no definirlas.

---

### 6.7 Tipos de producto

Se confirma un modelo expandido de productos.

La solución debe contemplar al menos:

* guía
* bundle
* toolkit o descargables
* curso
* sesión 1 a 1
* suscripción o membresía

Aclaración:
aunque la ejecución inicial puede empezar con pocos tipos, la arquitectura no debe cerrarse a ellos.

Cursos y sesiones ya existentes deberán integrarse al modelo de embudos, no tratarse como excepciones aisladas.

---

### 6.8 Estrategia de validación

Se confirma el siguiente principio:

Validación primero
Implementación simplificada
Modelo intacto

Esto significa:

* sí se vale lanzar con piezas simplificadas o semi-manuales
* no se vale romper el modelo por acelerar

Regla operativa:
Se puede fakear la implementación.
No se debe fakear el modelo.

Ejemplos válidos:

* landing estática hoy, dinámica mañana
* contenido inicialmente hardcodeado, luego más estructurado
* automatizaciones básicas hoy, más sofisticadas después

Ejemplos no válidos:

* duplicar contenido por funnel
* amarrar productos a páginas específicas
* crear lógica distinta por tema si debía ser reusable
* construir funnels manuales sin estructura común

---

## 7. Pendientes que sí quedaron definidos como estándar

Quedan confirmados también estos criterios:

1. Formato de contenido estándar: híbrido
   texto + video + assets + descargables según aplique

2. Paso de pre-pago a pago:
   oferta estructurada, no solo CTA simple

3. Post-compra:
   no termina en acceso; debe permitir loop de monetización
   upsell, cross-sell o siguiente funnel

4. Reutilización entre nichos:
   debe ser flexible y no asumir alta similitud

5. Rol del email:
   canal activo de conversión, nutrición y reenganche
   no solo canal de entrega

---

## 8. Qué entra a arquitectura y qué no

### Sí entra a arquitectura

1. Cómo traducir este modelo a bloques reales del sistema
2. Qué piezas existentes se reutilizan tal cual
3. Qué piezas faltan realmente
4. Cómo desacoplar contenido, producto, acceso y funnel
5. Cómo integrar lo ya existente con el nuevo modelo
6. Cómo mantener validación rápida sin comprometer escalabilidad
7. Qué contratos y entidades necesita la solución

### No entra todavía

1. Código
2. Copy
3. Diseño visual
4. Implementación detallada
5. Tablas o endpoints específicos si aún no son necesarios para decidir arquitectura
6. Automatizaciones finas de marketing
7. Optimización avanzada de conversión
8. A/B testing

---

## 9. Riesgos principales identificados

1. Diseñar por páginas en lugar de por sistema
2. Mezclar contenido con producto
3. Hardcodear accesos o reglas por tema
4. Construir funnels únicos e irrepetibles
5. Diseñar alrededor de GTM o herramientas de analítica
6. Querer perfección técnica antes de validar
7. Lanzar rápido pero creando deuda estructural evitable
8. Tratar cursos o sesiones como excepciones en vez de como parte del mismo modelo

---

## 10. Preguntas que arquitectura debe responder

1. Cuáles bloques del sistema deben existir oficialmente
2. Qué piezas actuales sirven tal cual y cuáles necesitan adaptación
3. Qué contratos deben separar contenido, funnel, producto, acceso y usuario
4. Cómo debe convivir este modelo con cursos y 1 a 1 ya existentes
5. Qué debe resolverse como configuración reusable y qué sí justifica lógica especial
6. Cómo soportar validación rápida sin crear callejones sin salida
7. Qué nivel de flexibilidad conviene desde inicio sin sobrediseñar

---

## 11. Criterio rector para la siguiente fase

Toda decisión de arquitectura debe poder responder esta pregunta:

¿Esto ayuda a lanzar rápido sin romper la reutilización futura?

Si la respuesta es no, debe cuestionarse.

---

## 12. Frase resumen oficial

No se está construyendo una guía digital.
Se está construyendo un sistema reusable de monetización de contenido dentro de Lobra.

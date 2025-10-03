# Documento Integral — Visión de Negocio y Recomendación de Integración

Versión: v1  
Propietario: Huerta Consulting  
Fecha: 2025-10-02  

---

## 1. Objetivo de Negocio
Construir un ecosistema de soluciones digitales que nace de necesidades personales (cursos y control financiero) y evoluciona hacia un modelo SaaS para terceros.  
El propósito es **crear productos simples pero profesionales** que permitan:  
- Vender cursos sin fricción técnica.  
- Brindar claridad financiera a microempresarios.  
- Generar ingresos recurrentes vía suscripciones, transacciones y servicios adicionales.  

---

## 2. Descripción de las Tres Líneas

### 2.1 Cursos Propios
- **Propósito**: vender y enseñar tus propios cursos de manera profesional.  
- **Cliente**: alumnos finales interesados en tus contenidos.  
- **Alcance**: catálogo, checkout, integración de pagos, control de alumnos y membresías.  
- **Valor**: experiencia profesional para el estudiante, confianza en el pago.  
- **Ingresos**: pago único por curso, membresías, upsells de materiales y asesorías.  

### 2.2 Plataforma para Creadores Externos
- **Propósito**: ofrecer a instructores/coaches la misma infraestructura que usas tú, sin que ellos deban integrar Stripe, Supabase, Brevo, etc.  
- **Cliente**: desde instructores ocasionales (1 curso/mes) hasta creadores frecuentes (2–3 cursos/semana).  
- **Alcance**: multi-tenant con planes básicos (bajo dominio Lobra) y premium (dominio propio, más alumnos, más funciones).  
- **Valor**: imagen profesional inmediata, centralización de herramientas.  
- **Ingresos**: suscripción SaaS, comisión en planes básicos, servicios adicionales (ej. soporte técnico o marketing).  

### 2.3 Herramienta Financiera
- **Propósito**: dar a microempresarios y freelancers control básico de ingresos y gastos.  
- **Cliente**: quienes hoy improvisan con Excel o no llevan control.  
- **Alcance inicial**: registro de ingresos (automáticos por ventas) y gastos manuales, reportes simples.  
- **Escalabilidad**: crecer hacia un “micro ERP” (citas, inventario, clientes), siempre enfocado en negocios pequeños.  
- **Valor**: claridad en el dinero y tranquilidad de saber “dónde están parados”.  
- **Ingresos**: SaaS por suscripción con planes básicos, intermedios y avanzados.  

---

## 3. Clientes Objetivo
- **Cursos**: alumnos finales (B2C).  
- **Plataforma**: instructores y coaches sin infraestructura técnica (B2B2C).  
- **Finanzas**: microempresarios y freelancers que buscan claridad financiera (B2B/B2C).  

---

## 4. Modelo de Ingresos Consolidado
- **Cursos** → venta directa y membresías.  
- **Plataforma** → SaaS por suscripción, planes diferenciados, comisiones opcionales.  
- **Finanzas** → SaaS independiente, con posibilidad de integrarse como add-on a la plataforma de creadores.  

---

## 5. Ruta Mínima de Prueba de Mercado
- **Cursos**: lanzar primer curso con alumnos reales y medir ventas sin intervención manual.  
- **Plataforma**: piloto con 2–3 instructores externos, validar si pagarían suscripción.  
- **Finanzas**: piloto con tu esposa y 1–2 negocios pequeños, validar uso recurrente y disposición a pagar.  

---

## 6. Matriz Valor vs. Esfuerzo
- **Cursos**: Alto valor / Esfuerzo medio → prioridad inmediata.  
- **Plataforma**: Alto valor / Esfuerzo alto → prioridad media, iniciar piloto.  
- **Finanzas**: Valor medio / Esfuerzo bajo → prioridad exploratoria, validar rápido.  

---

## 7. Complementariedades y Separaciones
- **Cursos + Plataforma**: comparten núcleo (ventas, pagos, membresías).  
- **Plataforma + Finanzas**: integración posible como módulo opcional, no núcleo.  
- **Cursos + Finanzas**: solo complementan en tu caso personal, no justifican integración de mercado.  

---

## 8. Recomendación de Integración (Nivel Funcional)
- **Cursos y Plataforma para Creadores**: sí integrarlas, son la misma base con distinto alcance (single vs. multi-tenant).  
- **Herramienta Financiera**: mantener independiente, con opción de conectarse como módulo.  
- **Razonamiento**: así se aprovechan recursos técnicos comunes sin confundir públicos ni sobrecargar complejidad.  

---

## 9. Recomendación de Integración (Nivel Técnico Alto)
### Qué Compartir
- **Infraestructura central**: base de datos multi-tenant, sistema de usuarios, manejo de dominios, pasarela de pagos (Stripe).  
- **Servicios transversales**: autenticación, facturación, notificaciones por correo, auditoría, analítica de eventos.  
- **Frontend compartido**: componentes básicos de UI (checkout, login, panel de usuario).

### Qué Separar
- **Módulos de negocio**:  
  - Cursos/membresías → propio de la línea educativa.  
  - Finanzas → módulo separado, acoplable vía API o add-on.  
- **Bases de datos específicas**:  
  - Tablas de cursos y alumnos separadas de tablas financieras.  
  - Evitar mezcla de catálogos para que cada línea pueda evolucionar sin bloquear a la otra.  
- **Escalabilidad**:  
  - Cursos/plataforma → orientado a B2C y B2B2C (creadores con alumnos).  
  - Finanzas → orientado a B2B/B2C puro, clientes que no necesariamente venden cursos.  

---

## 10. Conclusión
La visión combina tres oportunidades distintas pero relacionadas.  
- **Integración natural**: Cursos + Plataforma para creadores (misma base técnica).  
- **Separación necesaria**: Herramienta financiera debe ser producto autónomo, con integración opcional.  
- **Valor máximo**: modularidad. Un ecosistema que comparte lo esencial (pagos, usuarios, dominios), pero mantiene independencia en lo que corresponde a públicos diferentes.  

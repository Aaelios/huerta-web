CT-03 — Implementación de Helpers

1. Objetivo
Implementar capa de helpers para resolver Webinar desde Supabase + JSON editorial, eliminando dependencia operativa del JSON.

2. Archivos modificados
- /lib/webinars/f_composeWebinar.ts (nuevo)
- /lib/webinars/load.ts
- /lib/webinars/getWebinarBySku.ts

3. Decisiones clave

3.1 Fuente de verdad
- Supabase = identidad + pricing
- JSON = contenido editorial temporal

3.2 Punto único de composición
- f_composeWebinar

3.3 Resolución por slug
- slug se deriva de products.page_slug
- JSON key deja de ser fuente oficial

3.4 Resolución por SKU
- lookup directo en Supabase
- JSON solo para contenido

3.5 Manejo de errores
- sin fallback silencioso
- errores explícitos en:
  - falta de producto
  - falta de pricing
  - falta de editorial

4. Contratos

getWebinar(slug)
- nunca regresa null
- falla si no existe producto o editorial

getWebinarBySku(sku)
- null si sku inválido o no encontrado
- error si datos incompletos

5. Riesgos controlados

- mismatch entre page_slug y JSON → error explícito
- excepción controlada:
  w-fin-freeintro

6. Ajuste adicional

generateStaticParams:
- exclusión explícita de w-fin-freeintro
- aprobado por Control como fix mínimo

7. Resultado

- detalle /webinars/[slug] funcional
- hub no afectado
- checkout no afectado
- build estable

8. Pendiente futuro

- generateStaticParams debe migrar a Supabase como fuente de slugs públicos
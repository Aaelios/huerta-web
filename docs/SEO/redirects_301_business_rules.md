Documento listo. Sin rodeos. Puedes guardarlo como:

`docs/seo/redirects_301_business_rules.md`

````md
# Bloque 05 — Redirecciones 301 de Negocio  
_Ecosistema LOBRÁ · SEO Técnico_

## 0) Objetivo
Centralizar y gobernar todas las redirecciones 301 del sitio.  
Evitar cadenas, fugas, cambios no documentados y destinos prohibidos.

---

## 1) Archivo de negocio
**Ruta:** `data/redirects.business.jsonc`  
Única fuente autorizada de reglas.

### Estructura
- `version: "v1"`
- `updatedAt: string` ISO actualizado manualmente
- `rules: RedirectBusinessRule[]`

### Campos por regla
- `id: string`  
- `source: string` (path relativo, exacto)
- `destination: string` (path relativo)
- `type: "permanent" | "temporary"`  
- `match: "exact"`  
- `kind: "slug_migration" | "legacy_platform" | "typo_fix" | "business_decision"`  
- `enabled: boolean`  
- `notes: string`

### Destinos prohibidos
No puede iniciar con:
- `/checkout`
- `/gracias`
- `/cancelado`
- `/mi-cuenta`
- `/mis-compras`
- `/comunidad`
- `/api`
- `/admin`
- `/dev`

---

## 2) Reglas del sistema
1. Ninguna redirección se crea fuera del JSONC.  
2. Prohibido generar cadenas A→B→C.  
3. Todos los destinos deben existir y ser públicos.  
4. No redirigir contenido privado o no-indexable.  
5. No usar comodines ni regex en v1.  
6. Orden de evaluación: `source` más largo primero.

---

## 3) Implementación en Next.js
Archivo: `next.config.mjs`  
Contiene:
- Loader inline (`loadRedirectsBusiness`)
- Validador inline (`validateRedirectsBusinessFile`)
- `async redirects()` gobernado por el JSONC

Validaciones ejecutadas:
- IDs únicos  
- Sources únicos  
- No cadenas  
- Destino no prohibido  

Si falla algo → build se detiene con error explícito.

---

## 4) Flujo de cambio autorizado
1. Editar `data/redirects.business.jsonc`  
2. Actualizar `updatedAt`  
3. Guardar  
4. Ejecutar `next dev` o `next build`  
5. Si pasa validación → listo

---

## 5) Ejemplo comentado (referencia)
```jsonc
{
  "id": "ejemplo-cambio-slug-intro-finanzas",
  "source": "/webinars/intro-a-las-finanzas",
  "destination": "/webinars/ms-tranquilidad-financiera",
  "type": "permanent",
  "match": "exact",
  "kind": "slug_migration",
  "enabled": true,
  "notes": "Cambio de slug. Ejemplo ilustrativo."
}
````

---

## 6) Estado actual

* Infraestructura completa.
* Archivo de negocio sin reglas activas.
* Sistema estable y validado.

---

## 7) Pendientes futuros

* Alta de primeras reglas reales cuando existan.
* Revisión periódica de rutas eliminadas o renombradas.
* Extensión a patrones avanzados solo si surge una necesidad real.

```

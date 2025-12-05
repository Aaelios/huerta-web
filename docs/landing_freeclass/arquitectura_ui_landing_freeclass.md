# Bloque 4B · Curaduría UI Estructural  
## Arquitectura de Layouts y CSS para Landing Pages de Clases Gratuitas  
### Estado aprobado por Arquitectura

Este documento define **cómo deben convivir** el layout global del sitio y el nuevo layout específico para las landing pages de clases gratuitas (`/clases-gratuitas/*`).  
Es un documento de **arquitectura UI**, no de CSS ni de diseño visual.

---

# 1. Principio base  
Las landing pages son **diferentes en UX**, pero comparten el mismo **root layout** de toda la plataforma LOBRÁ.

Esto garantiza:

- Coherencia visual mínima del ecosistema  
- Un solo punto para GTM, fuentes, JSON-LD global, providers, Turnstile  
- No duplicar infraestructuras críticas  
- Evitar regressions SEO y analítica  
- Evitar duplicar configuración pesada que impactaría Lighthouse

---

# 2. Capas de layout

## 2.1. Capa 1 — Root Layout (global)  
Archivo existente:  
`app/layout.tsx`

### Funciones que **no se duplican** en landings:
- HTML `<html>` y `<body>`
- Fuentes globales
- Providers (Supabase, Theme, etc.)
- GTM + Data Layer bootstrap
- Cloudflare Turnstile **script global**
- JSON-LD global (Organization, Website, Person)
- Estructura general que ya existe para todo el sitio

### Regla dura  
**Las landing pages heredan este layout sin excepción.**

No debe existir un “root layout paralelo”.

---

## 2.2. Capa 2 — Layout de Landings  
Archivo nuevo:  
`app/clases-gratuitas/layout.tsx`

Se monta **dentro del root**.

### Permite:
- Header compacto  
- Página sin footer o footer minimal  
- Contenedor `.landing-root`  
- Importar `landing.css` (solo para landings)  
- Espaciados, proporciones y estructura específicas  
- Patrones de UX más densos orientados a conversión

### Prohibido:
- Cargar GTM
- Cargar Turnstile global
- Inyectar Organization/Website JSON-LD
- Redefinir fuentes del sitio
- Insertar scripts que ya existen en root layout

---

# 3. CSS para landing pages

## 3.1. Global CSS se mantiene  
`globals.css` sigue siendo la fuente de:
- Tokens (colores, spacing base, tipografías)  
- Resets  
- Utilidades globales

## 3.2. Nuevo CSS específico  
Archivo nuevo recomendado:  
`app/clases-gratuitas/landing.css`

Responsabilidad:
- Grid/layout propio de landings  
- Header reducido  
- Hero simplificado  
- Secciones verticales compactas  
- Patrones de oferta y CTA  
- Adaptaciones especiales mobile  
- Evitar CLS y carga innecesaria en landings

### Regla  
**landing.css debe importar solo lo indispensable.**  
No debe replicar reglas globales ni reemplazarlas de forma masiva.

---

# 4. Metadata y schemas específicos

Cada landing define su metadata en:

`app/clases-gratuitas/[slug]/page.tsx`
(`generateMetadata`)

Ahí se integran:
- Title, description
- Canonical propio
- JSON-LD tipo **Event** para la instancia actual de la free class

### Regla
Los schemas globales siguen en el root layout.  
Las landings agregan solo los schemas **propios** del producto.

---

# 5. Interacción con prelobby

Prelobby de free class vive en:

`app/clases-gratuitas/[slug]/prelobby/page.tsx`

Este prelobby:
- También hereda el root layout  
- También hereda el layout de landing  
- No duplica scripts  
- Usa el mismo CSS base de landings  
- Se sostiene solo con configuración de “registro válido” desde `contacts.metadata.free_class_registrations`

---

# 6. Beneficios de la arquitectura aprobada

1. **No se duplica infraestructura crítica**  
2. **Menor riesgo SEO y analítica**  
3. **Carga mínima y mejor Lighthouse**  
4. **Separación clara entre UI global y UI de conversión**  
5. **Mayor velocidad en el desarrollo actual y mejoras futuras**  
6. **Facilidad para migrar los webinars a esta misma arquitectura después**  
7. **Evita deuda técnica en layouts anidados o sueltos**  
8. **Refuerza consistencia de marca sin frenar optimización de conversiones**

---

# 7. Checklist para implementar (UI Engineer)

## 7.1. Crear layout local
- [ ] Crear `app/clases-gratuitas/layout.tsx`
- [ ] Envolver children en `.landing-root`
- [ ] Agregar header compacto
- [ ] No footer global

## 7.2. Crear CSS local
- [ ] Crear `landing.css`
- [ ] Importarlo solo en layout local
- [ ] No duplicar reglas globales

## 7.3. Metadata por slug
- [ ] `generateMetadata` por página
- [ ] Agregar JSON-LD Event
- [ ] Validar canonical

## 7.4. Prelobby
- [ ] Crear `/prelobby/page.tsx` nuevo
- [ ] Heredar layout y CSS de landing
- [ ] Consultar acceso en `contacts.metadata.free_class_registrations`

---

# 8. Reglas de oro del Bloque 4B

1. **Un solo root layout. Siempre.**  
2. Landings son **layouts anidados**, no sustitutos.  
3. Nada crítico se duplica: ni GTM, ni fonts, ni providers.  
4. El CSS local es **minimalista y funcional**, no un nuevo sistema.  
5. El prelobby de free class se considera **parte del mismo layout de landing**.  
6. Todos los cambios deben pasar por Control antes de implementarse.  
7. Cada entrega debe incluir validación visual + validación Lighthouse.

---

Fin del documento.

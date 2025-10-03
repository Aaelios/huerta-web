# 📄 Guía — Infraestructura Pre-Lobby de Webinars

Versión: v1 · Última actualización: 2025-09-30
Owner: Huerta Consulting · Namespace: `app/webinars/[slug]/prelobby`

---

## 1. Propósito

Estandarizar la creación de páginas **Pre-Lobby** para cualquier webinar.
Cada nueva página reutiliza la misma infraestructura: solo cambian los datos del evento.

---

## 2. Arquitectura de archivos

* `app/webinars/[slug]/prelobby/page.tsx`
  Página principal (App Router). Server component, carga datos por slug.
* `components/PrelobbyClient.tsx`
  Client component: countdown, estados dinámicos, validación de correo.
* `app/api/prelobby/verify/route.ts`
  API para validar acceso por correo contra entitlements.
* `app/api/ics/[slug]/route.ts`
  API que genera el archivo `.ics` con hora local CDMX.
* `lib/webinars/loadWebinars.ts`
  Loader que lee `data/webinars.jsonc`.
* `lib/types/webinars.ts`
  Tipos TypeScript (contrato del objeto webinar).
* `data/webinars.jsonc`
  Fallback de datos, editable manualmente. En el futuro puede ser reemplazado por Supabase.
* `globals.css`
  Único lugar donde se definen estilos. Sin estilos inline en páginas.

---

## 3. Contrato de datos

Cada webinar en `data/webinars.jsonc` debe cumplir:

```jsonc
{
  "slug": "oct-2025-01",
  "title": "Taller de Tranquilidad Financiera",
  "startAt": "2025-10-07T08:30:00-06:00", // CDMX
  "durationMin": 90,
  "zoomJoinUrl": null, // se actualiza el día del evento
  "supportEmail": "soporte@lobra.net",
  "template": { "mode": "email" }, // o { "mode": "link", "url": "https://..." }
  "whatsAppSupport": { "enabled": false },
  "calendar": { "mode": "generated" }, // o { "mode": "static", "url": "..." }
  "sku": "liveclass-huerta-mkt-webinar-oct2025-v001",
  "subtitle": null
}
```

---

## 4. Estados de la página

Evaluados en función de `now`, `startAt`, `durationMin`, `zoomJoinUrl`, `hasEntitlement`.

* **MUY_TEMPRANO**: más de 60 min antes. CTA deshabilitado.
* **TEMPRANO**: entre −60 y −15. CTA “Ver indicaciones”. Countdown activo.
* **PRE_LOBBY**: entre −15 y 0. CTA “Conectarme” (si hay Zoom + entitlement).
* **EN_VIVO**: durante el evento. CTA “Entrar ahora”.
* **FINALIZADO**: después de `startAt + durationMin`. CTA deshabilitado.

---

## 5. Gate por correo

* Campo email + botón “Validar acceso”.
* Llama a `/api/prelobby/verify` con `{ slug, email }`.
* Respuesta: `{ ok: true, hasEntitlement: boolean }`.
* Si no tiene entitlement: bloquea CTA, muestra `supportEmail`.
* Se guarda en `sessionStorage` para no pedir otra vez.

---

## 6. Checklist mínima

* Instalar/actualizar Zoom.
* Probar audio y cámara.
* Abrir Excel o Google Sheets.
* Buena luz frontal.
* Internet estable (cerrar descargas).
* Espacio sin distracciones 90 min.

---

## 7. FAQ mínima

* No puedo entrar a Zoom.
* No escucho.
* No me ven.
* ¿Habrá grabación?

---

## 8. Requerimientos para que funcione cada webinar

1. **Definir datos en JSON**: slug, título, hora CDMX, duración, SKU de Stripe, email soporte.
2. **Configurar enlace de Zoom**: actualizar `zoomJoinUrl` el día del evento.
3. **Decidir entrega de plantilla**: `email` o `link`.
4. **Decidir WhatsApp**: habilitar solo si se atenderá soporte.
5. **Calendario**: dejar `generated` salvo que se cargue un `.ics` externo.
6. **Entitlements**: asegurar que el SKU existe en Stripe y está vinculado en Supabase.
7. **Probar countdown**: cambiar manualmente la hora del sistema para validar transiciones de estado.

---

## 9. Futuro

* Migrar datos a Supabase (tabla `webinars`).
* Automatizar validación con RLS.
* Habilitar descargas de plantillas desde R2.
* Añadir GTM/GA4 para métricas.

---


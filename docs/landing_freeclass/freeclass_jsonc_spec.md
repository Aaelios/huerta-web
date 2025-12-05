# Guía de Contenido · Landing Free Class (`freeclass_pages.jsonc`)
Versión: 1.0  
Alcance: Reglas de contenido por campo para cumplir el Contrato UX 4.B

---

## 1. HERO · `hero`

### 1.1 `hero.eyebrow`
- Rol: etiqueta breve sobre el tipo de clase.
- Longitud: 1 línea.
- Estilo: descriptivo, no comercial.
- Ejemplo: `"Clase gratuita para emprendedores"`.

### 1.2 `hero.title`
- Mapea a: `[PROMESA]`.
- Líneas máximas: 2 (mobile y desktop).
- Debe poder leerse sola sin el subhead.
- Evitar:
  - Listas,
  - 2 ideas en paralelo unidas por “y”.

### 1.3 `hero.subtitle`
- Mapea a: `[SUBHEAD]`.
- Líneas: 1–2 en mobile.
- Función: explicar el problema y el beneficio principal.
- Evitar:
  - Párrafos largos,
  - Más de 2 frases.

### 1.4 `hero.image.src` / `hero.image.alt`
- `src`: ruta a imagen horizontal o medio cuerpo.
- `alt`: frase clara, sin keywords forzadas.
- Regla extra:
  - Usar siempre el mismo estilo visual de instructor.

### 1.5 `hero.ctaText`
- Mapea a: texto de `[CTA_REGISTER]` (botón del form).
- Longitud:
  - 2 a 6 palabras.
- Forma:
  - Primera persona o imperativo claro.
- Evitar:
  - “Enviar”, “Submit”, “Aceptar” solos.

### 1.6 `hero.note`
- Rol: microdetalle informativo (duración, formato, costo).
- Longitud: 1 línea.
- No repite lo mismo que el título/subhead.

---

## 2. SECCIONES DE VALOR

### 2.1 `paraQuien[]`
- Uso: material para mensajes secundarios, no directo en 4.B.
- Elementos:
  - Máx 4 ítems.
  - Cada ítem máx 1–2 líneas.
- Estilo:
  - En segunda persona implícita (“Emprendedores que…”).
- Evitar:
  - Frases condicionales demasiado largas.

### 2.2 `queAprenderas[]`
- Mapea a: `[BULLET_1..3]` de Pantalla 2 (desktop y mobile).
- Uso en UI:
  - Se muestran **máx 3 bullets** en la landing.
- Reglas por ítem:
  - 1–2 líneas por bullet.
  - Cada bullet expresa **un** beneficio concreto.
- Recomendación:
  - Mantener entre 3 y 4 ítems en el JSON.
  - La UI tomará los 3 mejores o los 3 primeros.

### 2.3 `queSeLlevan[]`
- Uso: soporte para copy futuro (no crítico en 4.B).
- Reglas:
  - 3–4 puntos máximo.
  - 1–2 líneas por ítem.
  - Enfocados en “resultado después de la clase”.

---

## 3. Títulos de secciones · `titles`

### 3.1 `titles.queAprenderas`
- Mapea a: `[SECTION_TITLE_QUE_APRENDERAS]`.
- Líneas: 1 línea.
- Rol: título de Pantalla 2 Mobile.
- Debe ser:
  - Claro + descriptivo.
- Evitar:
  - Dos ideas separadas por “/”.

### 3.2 `titles.testimonios`
- Mapea a: `[SECTION_TITLE_TESTIMONIOS]`.
- Líneas: 1 línea.
- Rol: título de Pantalla 3 Mobile.
- Debe:
  - Introducir testimonios sin sobreprometer.

---

## 4. Autor · `autor`

### 4.1 `autor.name`
- Nombre real, sin alias.
- 1 línea.

### 4.2 `autor.role`
- Frase corta.
- 1 línea.
- Enfocada en la especialidad relevante para la clase.

### 4.3 `autor.business`
- Nombre de la marca o negocio.
- 1 línea.

### 4.4 `autor.bio`
- Bio larga (uso en otras vistas).
- Longitud orientativa:
  - 2–4 frases, 3–6 líneas máx.
- No se usa directamente en la mini bio de 4.B.

### 4.5 `autor.miniBio`
- Mapea a: `[MINI_BIO]` (Pantalla 2 Desktop y Mobile).
- Longitud:
  - 1–2 líneas máximo.
- Contenido:
  - 1 dato de autoridad + 1 dato de rol/experiencia.
- Evitar:
  - Listar toda la trayectoria.

### 4.6 `autor.imageSrc` / `autor.imageAlt`
- `imageSrc`: foto consistente con el Hero.
- `imageAlt`: descripción clara, 1 línea.

---

## 5. Testimonios · `testimonios[]`

Cada elemento debe tener:

### 5.1 `name`
- Nombre de pila o nombre y apellido.
- 1 línea.

### 5.2 `role`
- Rol en el negocio.
- 1 línea.

### 5.3 `business`
- Nombre comercial.
- 1 línea.

### 5.4 `quote`
- Mapea a: `[TESTI_TEXT]`.
- Longitud:
  - 110–130 caracteres máximo, ideal < 2 líneas en mobile.
- Enfoque:
  - Cambio percibido después de aplicar el mapa o sistema.
- Evitar:
  - Listas de cosas que hicieron,
  - Tres ideas en la misma frase.

### 5.5 `photoSrc` / `photoAlt`
- `photoSrc`: retrato cuadrado o casi cuadrado.
- `photoAlt`: descripción simple, 1 línea.

### 5.6 `platform`
- Valores esperados:
  - `"instagram" | "facebook" | "linkedin" | "web"`.
- Útil para elegir el ícono correcto.

### 5.7 `link`
- URL al perfil o sitio.
- Debe abrir en `target="_blank"` (lado UI).

### 5.8 Cantidad total
- JSON:
  - 3–5 testimonios máximo.
- UI:
  - Desktop: se muestran **3 simultáneamente**.
  - Mobile: todos participan en el carrusel.

---

## 6. Estados y mensajes

### 6.1 `mensajesEstado`
Campos:
- `open`, `full`, `waitlist`, `closed`, `proximamente`.

Reglas:
- Cada mensaje:
  - 1–3 líneas máximo.
  - Debe indicar **qué pasa ahora** y **qué hace el usuario**.
- Tono:
  - Claro, directo, sin urgencias falsas.

### 6.2 `mensajeConfianza`
- 1–2 líneas.
- Debe especificar:
  - Frecuencia de envío,
  - Tipo de contenido que recibirá.
- Evitar:
  - Promesas vagas tipo “Nunca te escribiré”.

### 6.3 `mensajePostRegistro`
- 1–3 líneas.
- Debe aclarar:
  - Que el registro se guardó,
  - Que llega un correo,
  - Que habrá recordatorio.

### 6.4 `mensajeErrorGenerico`
- 1–2 líneas.
- Debe:
  - Explicar que hubo error,
  - Dar un siguiente paso (reintentar o escribir a soporte).

---

## 7. CTA secundario · `ctaVolverForm`

- Mapea a: `[CTA_VOLVER_FORM]` (desktop + sticky mobile).
- Uso:
  - Siempre lleva con scroll al formulario del Hero.
- Longitud:
  - 3–7 palabras.
- Diferente a `hero.ctaText`, pero coherente.
- Ejemplos de patrón:
  - “Volver al formulario y registrarme”
  - “Reservar mi lugar ahora”.

---

## 8. SEO · `seo`

No afecta a 4.B estructuralmente, pero por consistencia:

### 8.1 `seo.title`
- 55–65 caracteres.
- Debe incluir:
  - Tipo de clase (gratuita),
  - Tema principal,
  - Marca opcional.

### 8.2 `seo.description`
- 140–160 caracteres.
- Explica:
  - Problema + beneficio de tomar la clase.

### 8.3 `seo.canonical`
- URL absoluta a la landing actual.

### 8.4 `seo.ogImage`
- Debe coincidir con una imagen real del Hero o variante.

---

## 9. Checklist de QA de contenido (para cada SKU)

- [ ] `hero.title` cabe en 2 líneas.  
- [ ] `hero.subtitle` no excede 2 líneas.  
- [ ] `hero.ctaText` tiene entre 2 y 6 palabras.  
- [ ] Hay al menos 3 bullets en `queAprenderas[]` y todos son de 1–2 líneas.  
- [ ] `titles.queAprenderas` y `titles.testimonios` ocupan 1 línea cada uno.  
- [ ] `autor.miniBio` cabe en 1–2 líneas.  
- [ ] Cada `testimonios[].quote` está dentro de 110–130 caracteres.  
- [ ] Cada testimonio tiene `photoSrc`, `photoAlt`, `platform`, `link`.  
- [ ] Hay entre 3 y 5 testimonios.  
- [ ] `ctaVolverForm` es distinto de `hero.ctaText` y no es genérico.  
- [ ] `mensajesEstado.*` indican estado + acción en 1–3 líneas.  
- [ ] `mensajeConfianza` y `mensajePostRegistro` son concretos y sin relleno.

---
Fin de la guía.


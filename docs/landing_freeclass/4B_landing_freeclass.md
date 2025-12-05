```md
# LOBRÁ · Bloque 4.B  
## Curaduría UX Estructural — Landing Free Class  
Versión: 1.0  
Estado: Aprobado

---

# 1. Propósito  
Definir la **arquitectura estructural completa** de la landing de clases gratuitas (`/clases-gratuitas/[slug]`), sin diseño visual, sin copy final y sin estilos.  
Es la traducción ejecutable del Contrato UX + reglas de layout.

---

# 2. Estructura General

## Desktop — 2 pantallas total
1) **Pantalla 1 — HERO**  
2) **Pantalla 2 — Sección Consolidada**  
   - Bullets  
   - Mini Bio  
   - Testimonios (3 columnas)  
   - CTA final (scroll al formulario)

## Mobile — 3 pantallas total
1) **Pantalla 1 — HERO**  
2) **Pantalla 2 — Bullets + Bio + CTA fijo**  
3) **Pantalla 3 — Testimonios en carrusel + CTA fijo**

---

# 3. Pantalla 1 — HERO (Desktop + Mobile)

## 3.1 Header compacto
- Altura fija: **58 px**  
- Izquierda: Logo  
- Derecha: Menú hamburguesa  
- Ocultar íconos sociales  
- Padding horizontal 16–20 px

## 3.2 Elementos del Hero (orden vertical)
1. **Título `[PROMESA]`**  
2. **Subhead `[SUBHEAD]`**  
3. **Foto de Roberto `[HERO_IMAGE]`**  
   - Mobile: 160–185 px alto  
   - Desktop: 300–360 px alto  
4. **Formulario único `[FORM]`**  
   - Debe caber completo sin scroll en mobile  
   - Altura mobile: 460–490 px  
   - Altura desktop: 420–480 px  
   - Inputs 48 px  
   - Padding interno 30/20/20  
   - Border-radius 18–22 px  
   - CTA 70–85 px `[CTA_REGISTER]`

### Regla
**No existe otro formulario en la landing.**

---

# 4. Pantalla 2 Desktop — Sección Consolidada (1 pantalla completa)

## 4.1 Bloques y distribución
Debe caber en **450–550 px** de altura total.

### A) Bullets (izquierda)
- Ancho: **55–60%**  
- Máx 3 bullets  
- Placeholders:  
  - `[BULLET_1]`  
  - `[BULLET_2]`  
  - `[BULLET_3]`

### B) Mini Bio (derecha)
- Ancho: **40–45%**  
- 1–2 líneas  
- Placeholder: `[MINI_BIO]`

### C) Testimonios (en la misma pantalla)
Tres columnas horizontales:

Cada card:
- Foto 48–56 px `[TESTI_PHOTO]`  
- Frase corta `[TESTI_TEXT]`  
- Nombre `[TESTI_NAME]`  
- Ícono social gris 12 px `[TESTI_SOCIAL]` (clicable, `target="_blank"`)

### D) CTA Final
- Botón único full-width  
- Placeholder `[CTA_VOLVER_FORM]`  
- Acción: scroll suave hacia el formulario del Hero

---

# 5. Pantalla 2 Mobile — Bullets + Bio + CTA fijo  
*(Debe caber sin scroll vertical)*

Orden:
1. Título `[SECTION_TITLE_QUE_APRENDERAS]`  
2. Bullets: `[BULLET_1]`, `[BULLET_2]`, `[BULLET_3]`  
3. Mini Bio `[MINI_BIO]`  
4. CTA fijo inferior `[CTA_VOLVER_FORM]` (70–85 px)

---

# 6. Pantalla 3 Mobile — Testimonios en Carrusel + CTA fijo

## Estructura
1. Título `[SECTION_TITLE_TESTIMONIOS]`  
2. Carrusel horizontal (scroll-snap mandatory)  

### Especificaciones del carrusel  
- Ancho card: **220–260 px**  
- Alto card: **120–150 px**  
- Padding interno: 16–20 px  
- Gap entre cards: 12–16 px  
- Foto: **36–42 px**  
- Ícono social: 12 px, gris, `target="_blank"`  
- Máx 3–5 testimonios  
- Texto máx 110–130 chars

### CTA inferior  
- Mismo `[CTA_VOLVER_FORM]`  
- Sticky  
- Visible en Pantallas 2 y 3

---

# 7. Notas de Interacción

## Formulario único
- Es el único punto de conversión.

## Scroll-to-form
Todos los CTAs extras hacen:
```

scrollIntoView({ behavior: "smooth" })

``

## Sticky CTA (mobile)
- Activo en Pantalla 2 y Pantalla 3  
- No aparece en el Hero

## Carrusel
- scroll-snap mandatory  
- swipe manual  
- sin autoplay

---

# 8. Notas para 4.C (Copy)

- `[PROMESA]`: promesa principal del Hero  
- `[SUBHEAD]`: explicación breve  
- `[BULLET_X]`: beneficios concretos  
- `[MINI_BIO]`: credibilidad en 1 frase  
- `[TESTI_TEXT]`: micro testimonio  
- `[CTA_REGISTER]`: acción del formulario  
- `[CTA_VOLVER_FORM]`: CTA corto y directo

Señales de autoridad:
- Foto Roberto  
- Mini bio  
- Testimonios con foto + red social

---

# 9. Notas para 4.D (Estilos)

- Grid desktop 55–60% / 40–45%  
- Hero debe caber sin scroll en mobile  
- CTA del Hero muy dominante  
- CTA sticky en mobile con sombra ligera  
- Carrusel con scroll-snap y spacing uniforme  
- **Estilos finales (colores, sombras, bordes, motion)** se definen en **4.D**.

---

# 10. Checklist Final para Control

### Arquitectura
- [ ] Hereda root layout  
- [ ] Layout local reemplaza header/footer  
- [ ] landing.css cargado solo en layout local  

### Hero
- [ ] Form único  
- [ ] Cabe sin scroll (mobile)  
- [ ] CTA 70–85 px  
- [ ] Foto en medidas correctas  

### Desktop
- [ ] Pantalla 2 cabe completa  
- [ ] Bullets 55–60%  
- [ ] Bio 40–45%  
- [ ] Testimonios 3 columnas  
- [ ] CTA scroll-to-form  

### Mobile
- [ ] Pantalla 2 sin scroll  
- [ ] Carrusel en Pantalla 3  
- [ ] CTA sticky Pantalla 2 y 3  

### Testimonios
- [ ] Foto real  
- [ ] Ícono social gris  
- [ ] `target="_blank"`  
- [ ] 3–5 testimonios máximo  

---

# Fin del documento.
```

---

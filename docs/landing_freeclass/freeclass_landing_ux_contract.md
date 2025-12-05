# LOBRÁ · Contrato UX Oficial — Landing Free Class
Versión: 1.0  
Propósito: Documentar de forma completa y ejecutable la arquitectura UX de la landing  
Responsable: Bloque 4.B (UI)  
Estado: Cerrado

---

# 1. Objetivo
Optimizar al máximo la conversión al registro de una clase gratuita.  
Todas las decisiones UI/UX se subordinan a este objetivo único.

---

# 2. Estructura General (Desktop + Mobile)
La landing consta de **3 pantallas mobile** y **2 pantallas desktop**.

## Desktop (2 pantallas):
1. **Pantalla 1 = HERO**
2. **Pantalla 2 = Sección Consolidada**
   - Bullets (valor)
   - Mini Bio (autoridad)
   - Testimonios (foto + frase + nombre + ícono social)
   - CTA final (botón que regresa al formulario del Hero)

## Mobile (3 pantallas):
1. **Pantalla 1 = HERO**
2. **Pantalla 2 = Bullets + Mini Bio + CTA fijo**
3. **Pantalla 3 = Carrusel Testimonios + CTA fijo**

---

# 3. HERO (Mobile y Desktop)

## 3.1 Header
- **Sí aparece**
- Altura: **58 px**
- Elementos visibles: **Logo LOBRÁ** (izq), **hamburguesa** (der)
- Elementos ocultos: íconos de Instagram/YouTube
- Padding horizontal: 16–20 px

## 3.2 Elementos del Hero
En orden:

1. **Título (Promesa)**
   - 2 líneas máximo
   - Mobile: 26–30 px  
   - Desktop: 40–48 px
   - Line-height: 1.15–1.2

2. **Subhead (Descripción breve)**
   - 1–2 líneas
   - Mobile: 14–15 px  
   - Desktop: 18–20 px

3. **Foto de Roberto**
   - Mobile: 160–185 px alto  
   - Desktop: 300–360 px alto
   - Recorte medio  
   - Mirada hacia la derecha (apuntando al formulario)

4. **Formulario (solo uno en toda la landing)**
   - Debe ser visible **completo sin scroll** en mobile
   - Altura mobile: 460–490 px  
   - Altura desktop: 420–480 px
   - Inputs: 48 px
   - CTA: 70–85 px  
   - border-radius: 18–22 px
   - Padding: 30/20/20 (t/u/b)

## 3.3 CTA del formulario
- Botón dominante  
- Altura: **70–85 px**  
- Border-radius: **38–48 px**  
- Sin distracciones alrededor

---

# 4. Sección Consolidada (Desktop)

## 4.1 Distribución
Todo debe caber en **una sola pantalla desktop** (450–550 px altura).

Bloques:

### A) Bullets (izquierda)
- 3 bullets máximo  
- Ancho: **55–60%**

### B) Mini Bio (derecha)
- 1–2 líneas  
- Ancho: **40–45%**

### C) Testimonios (en la misma pantalla)
- 3 columnas en horizontal  
- Foto + frase + nombre + ícono social

### D) CTA final (botón)
- Full-width  
- Hace scroll automático al formulario del Hero  
- NO es un formulario duplicado

---

# 5. Pantalla 2 Mobile (Bullets + Bio + CTA fijo)

## 5.1 Layout
Debe caber **sin scroll vertical**.

Orden:
1. Título “Qué vas a aprender”
2. Bullets (3)
3. Mini Bio (1–2 líneas)
4. CTA inferior fijo (sticky)

## 5.2 Medidas exactas
- Título: 40–48 px alto  
- Bullets: 150–170 px total  
- Mini Bio: 70–90 px  
- Spacing: 18–24 px  
- CTA fijo: 70–85 px

---

# 6. Pantalla 3 Mobile (Testimonios en carrusel + CTA fijo)

## 6.1 Estructura
- Título: “Lo que dicen”
- Carrusel horizontal (scroll-snap)
- Cards pequeñas (ver medidas)
- CTA fijo abajo (mismo de Pantalla 2)

## 6.2 Medidas exactas del carrusel
- Card width: **220–260 px**
- Card height: **120–150 px**
- Foto: **36–42 px**
- Padding interno: 16–20 px
- Gap entre cards: 12–16 px
- Ícono social: 12 px, gris, opacidad 60%
- target="_blank"
- Máx 3–5 testimonios
- Texto máx 110–130 caracteres

---

# 7. Testimonios (Reglas finales)

## 7.1 Contenido obligatorio
Cada testimonio debe tener:

- Foto real (NO stock)
- Frase corta (1–2 líneas)
- Nombre (de pila es suficiente)
- Ícono social (Instagram / FB / LinkedIn)
  - Ícono gris
  - 12 px
  - Clicable
  - target="_blank"

## 7.2 Desktop vs Mobile
- Desktop: 3 columnas en una sola fila  
- Mobile: carrusel horizontal  

---

# 8. CTA Final

### Desktop:
- Botón único  
- Full-width  
- Regresa al formulario  
- No repetir formulario

### Mobile:
- CTA fijo visible en Pantalla 2 y 3  
- Altura: 70–85 px  
- Sombra leve opcional

---

# 9. Footer

**El footer se elimina por completo en esta landing.**

Razones:
- Ahorra una pantalla entera en mobile  
- Reduce fuga del funnel  
- Políticas legales ya están dentro del formulario

---

# 10. Header

- Se mantiene para branding  
- Versión reducida (58 px)  
- Sin íconos sociales  
- Menú hamburguesa sí puede estar

---

# 11. Principio General

> **Todo lo que no incrementa conversión se elimina.  
Todo lo que incrementa claridad se mantiene.**

---

# 12. Preguntas de interpretación permitidas

Ninguna.  
Este documento **es la guía completa**, y Bloque 4.B debe implementarlo tal cual.

# ANEXO · Checklist UI/UX de Implementación para Bloque 4.B

## A. GENERAL
- [ ] El formulario aparece únicamente en el Hero  
- [ ] No existe footer en esta landing  
- [ ] Header reducido (58 px) con logo + hamburguesa  
- [ ] No hay enlaces externos visibles fuera de testimonios  
- [ ] No hay navegación secundaria fuera del menú

## B. HERO MOBILE
- [ ] Hero completo cabe sin scroll (max 832–860 px)  
- [ ] Foto entre 160–185 px alto  
- [ ] Formulario 460–490 px  
- [ ] CTA con altura 70–85 px  
- [ ] Padding 30/20/20 dentro del formulario  
- [ ] Tipografía según specs

## C. HERO DESKTOP
- [ ] Foto derecha o izquierda según layout elegido  
- [ ] Formulario 420–480 px  
- [ ] CTA dominante, alto 70–85 px

## D. SECCIÓN DESKTOP CONSOLIDADA
- [ ] Bullets a la izquierda (55–60%)  
- [ ] Mini Bio a la derecha (40–45%)  
- [ ] Testimonios en 3 columnas  
- [ ] CTA final que hace scroll al formulario  
- [ ] Sección completa cabe en 450–550 px

## E. PANTALLA 2 MOBILE
- [ ] Título (40–48 px alto)  
- [ ] Bullets (150–170 px)  
- [ ] Mini Bio (70–90 px)  
- [ ] CTA fijo (70–85 px)  
- [ ] Sin scroll vertical

## F. PANTALLA 3 MOBILE
- [ ] Título visible sin scroll  
- [ ] Carrusel horizontal con cards 220–260 px ancho  
- [ ] Cards 120–150 px alto  
- [ ] Foto 36–42 px  
- [ ] Nombre + ícono social  
- [ ] Ícono clicable (target="_blank")  
- [ ] Texto corto: 1–2 líneas  
- [ ] CTA fijo abajo  
- [ ] scroll-snap mandatory

## G. TESTIMONIOS
- [ ] Fotos reales (no stock)  
- [ ] Nombre visible  
- [ ] Ícono social gris  
- [ ] Ícono clicable  
- [ ] Card pequeña, ligera  
- [ ] 3–5 testimonios máximo  
- [ ] En desktop se muestran 3 simultáneamente

## H. CTA FINAL
- [ ] En desktop: botón único, no formulario  
- [ ] En mobile: CTA fijo  
- [ ] CTA siempre visible en pantallas 2 y 3  
- [ ] CTA redirige al formulario con scroll suave

---

# FIN DEL DOCUMENTO
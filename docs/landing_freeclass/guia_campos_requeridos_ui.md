# Guía de Campos Requeridos para Interfaz (4.B)
Versión: 1.0  
Propósito: Definir qué campos del JSON son necesarios para la UI de la landing de clases gratuitas y cómo deben llenarse.

---

## 1. HERO

### 1.1 `hero.title`
**Uso:** Promesa principal del Hero.  
**Reglas:**
- Máx **2 líneas**.  
- Enuncia **una única promesa central**.  
- 6–14 palabras recomendadas.  
- Sin “y / además / también”.  
- Sin signos de exclamación.

---

### 1.2 `hero.subtitle`
**Uso:** Subhead del Hero.  
**Reglas:**
- **1–2 líneas**.  
- Debe explicar problema + beneficio.  
- Máx 25–30 palabras.  
- Evitar párrafos o conectores múltiples.

---

### 1.3 `hero.image.src` y `hero.image.alt`
**Uso:** Foto del instructor en Hero.  
**Reglas:**
- `src`: foto horizontal o medio cuerpo, consistente.  
- `alt`: 1 línea, descripción simple (“Foto de Roberto Huerta…”).  
- No usar keywords forzadas.

---

### 1.4 `hero.ctaText`
**Uso:** Botón principal del formulario.  
**Reglas:**
- **2–6 palabras**.  
- En primera persona o acción directa.  
- Ejemplos: “Quiero mi mapa”, “Registrarme a la clase”.

---

### 1.5 `hero.note`
**Uso:** Microcopy informativo bajo el formulario.  
**Reglas:**
- 1 línea.  
- Debe incluir duración + formato + costo.  
- Ejemplo: “Clase online en vivo · 45 minutos · Sin costo”.

---

## 2. BULLETS DE VALOR

### 2.1 `queAprenderas[]`
**Uso:** Bullets en Pantalla 2 Desktop y Pantalla 2 Mobile.  
**Reglas:**
- La UI utiliza **máximo 3 bullets**.  
- Cada bullet:
  - **1–2 líneas**  
  - Máx **18–22 palabras**  
- Debe expresar **un solo beneficio claro**.  
- Evitar enumeraciones internas o condicionales largos.

---

## 3. TÍTULOS DE SECCIÓN

### 3.1 `titles.queAprenderas`
**Uso:** Título Pantalla 2 Mobile.  
**Reglas:**
- 1 línea.  
- Claro y directo.  
- Ejemplo: “Lo que vas a aprender en la clase”.

---

### 3.2 `titles.testimonios`
**Uso:** Título Pantalla 3 Mobile.  
**Reglas:**
- 1 línea.  
- Introduce evidencia social sin sobreprometer.  
- Ejemplo: “Lo que dicen quienes ya aplicaron el mapa”.

---

## 4. AUTOR

### 4.1 `autor.miniBio`
**Uso:** Mini bio en Pantalla 2 (Desktop y Mobile).  
**Reglas:**
- **1–2 líneas máximo**.  
- Incluir:
  - 1 elemento de autoridad (rol/experiencia)  
  - 1 elemento de identidad o contexto  
- No usar párrafos.  
- No repetir `hero.subtitle`.

Ejemplos:
- “Consultor en claridad financiera y fundador de LOBRÁ.”  
- “Ayudo a emprendedores a tomar decisiones simples basadas en sus números.”

---

## 5. TESTIMONIOS

### Campos obligatorios por testimonio:
- `testimonios[].name`  
- `testimonios[].quote`  
- `testimonios[].photoSrc`  
- `testimonios[].photoAlt`  
- `testimonios[].link`  
- `testimonios[].platform`

### 5.1 `testimonios[].name`
**Reglas:**
- 1 línea.  
- Nombre de pila o nombre completo.

---

### 5.2 `testimonios[].quote`
**Uso:** Texto del testimonio.  
**Reglas:**
- **110–130 caracteres máximos** (1–2 líneas).  
- Enfocado al cambio percibido.  
- Evitar frases con múltiples ideas.

---

### 5.3 `testimonios[].photoSrc` y `photoAlt`
**Reglas:**
- `photoSrc`: retrato cuadrado.  
- `photoAlt`: descripción de 1 línea.  
- No usar fotos de stock.

---

### 5.4 `testimonios[].link`
**Reglas:**
- URL completa (https).  
- Debe apuntar al usuario del testimonio.  
- En UI abrirá en `target="_blank"`.

---

### 5.5 `testimonios[].platform`
**Reglas:**
- Valores permitidos:
  - `"instagram" | "facebook" | "linkedin" | "web"`
- Determina el ícono social a mostrar.

---

### 5.6 Cantidad de testimonios
**Reglas:**
- JSON debe incluir **3–5 testimonios**.  
- Desktop muestra siempre **3 simultáneos**.  
- Mobile usa todos en carrusel.

---

## 6. CTA SECUNDARIO

### 6.1 `ctaVolverForm`
**Uso:** CTA final desktop + sticky mobile (scroll-to-form).  
**Reglas:**
- **3–7 palabras**.  
- Acción clara (“Volver al formulario”, “Reservar mi lugar”).  
- Diferente a `hero.ctaText`.

---

# RESUMEN RÁPIDO PARA VALIDACIÓN

- Hero: title (2 líneas), subtitle (1–2), photo, CTA (2–6 palabras), note (1 línea).  
- Bullets: 3 items, cada uno de 1–2 líneas.  
- MiniBio: 1–2 líneas.  
- Testimonios: 3–5, con quote ≤130 caracteres + foto + plataforma + link.  
- Títulos de sección: 1 línea.  
- CTA secundario: 3–7 palabras.

---

# Fin del documento.

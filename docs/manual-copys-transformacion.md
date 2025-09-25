
```md
# Manual de Copys — Sección “Transformación” (LOBRÁ)  
**Aplicable a cualquier taller/curso** del sitio.  
**Meta**: escribir copys listos para producción en ≤30 minutos, sin tocar estilos ni layout.

---

## 0) Resultado esperado
Generar 5 piezas de texto y 1 ajuste de tracking:

1. **H2 + subtítulo PTR**  
2. **Antes**: 5 bullets emocionales  
3. **Después**: 5 bullets emocionales con `accent` solo en el sustantivo emocional clave  
4. **Cards L-O-B-R**: título con beneficio resaltado y descripción emocional corta  
5. **Card Á**: título fijo + recompensa macro + refuerzo  
6. **CTA**: copy de botón + microcopy + `track("transformacion_cta")`

> Importante: **no prometer “más ingresos”** ni métricas cuantificables si el curso no puede garantizarlo.

---

## 1) Insumos mínimos (brief de 10 minutos)
Pide o completa esto antes de escribir:

- **Nombre del curso/taller** y **duración** real.  
- **Foco del contenido** (ej.: ingresos, gastos, pricing, ventas, etc.).  
- **Qué sí promete** y **qué no** (lista clara).  
- **Top 5 emociones “ANTES”** del alumno (angustia, miedo, cansancio, ansiedad, frustración…).  
- **Top 5 emociones “DESPUÉS”** alcanzables en una sesión (confianza, tranquilidad, orgullo, paz, alegría…).  
- **Keyword primaria SEO** y **secundarias** (2–3 máx).  
- **Persona objetivo** y contexto (emprendedor solo, microempresa, creador…).  
- **Fecha o disponibilidad** si aplica urgencia real.  

> Formato rápido para pedirlos:

```

Curso:
Duración:
Foco:
Promete:
No promete:
Emociones ANTES (5):
Emociones DESPUÉS (5):
Keyword primaria:
Keywords secundarias (2–3):
Persona objetivo:
Fecha/urgencia:

```

---

## 2) Reglas de estilo y semántica
- **Emoción pura**: habla de sensaciones, no de herramientas, archivos, tareas o procesos.  
- **Sustantivos emocionales en singular**: “Confianza”, “Tranquilidad”, “Orgullo”, “Paz”, “Alegría”.  
- **Sin imperativos** dentro de “Antes/Después” y cards LOBR/Á. El imperativo vive solo en el **CTA**.  
- **No repetir “financiera”** dos veces en el mismo bloque; usa sinónimos (“claridad”, “paz con tu dinero”).  
- **`accent`**:  
  - Sí en: emociones de **Después** y beneficio resaltado de **título L-O-B-R**.  
  - No en: bullets de **Antes**, descripciones LOBR y cuerpo de Á (salvo una palabra si es crucial).  
- **Tono**: claro, directo, sin tecnicismos. 1–2 oraciones por bullet o descripción.  
- **SEO**: mezcla emoción + término buscado. Ej.: “claridad **financiera**”, “control de **ingresos**”.  
- **Accesibilidad**: CTA con `aria-describedby` a su microcopy.

---

## 3) Pasos operativos (20–30 min)

### Paso 1 — H2 + Subtítulo PTR (3 min)
- H2: “De la **[dolor]** a la **[recompensa]**. LOBRÁ”  
- Subtítulo: “En **[duración]** conviertes **[emoción negativa]** en **[emoción positiva]** sobre **[tema]**.”

**Plantilla**  
- H2: `De la {dolor-núcleo} a la {recompensa-núcleo}. LOBRÁ`  
- Sub: `En {duración} conviertes {emoción-negativa} en {emoción-positiva} sobre {tema/foco}.`

### Paso 2 — Antes (5 bullets) (5 min)
Solo emociones negativas reales del contexto. Sin procesos.

**Plantilla de bullet ANTES**  
- `{Emoción} + situación breve que la dispara.`  
  - Ej.: “Angustia cada vez que llegan las facturas.”

**Lista útil de “Antes”**  
Angustia, Miedo, Cansancio, Ansiedad, Frustración, Duda, Culpa, Confusión.

### Paso 3 — Después (5 bullets con accent selectivo) (5 min)
Emociones que sí se alcanzan en 1 sesión. El `accent` solo en el sustantivo:

**Patrón**  
- `<span class="accent">{Emoción}</span> + resultado emocional descrito en 8–12 palabras.`

**Ejemplo**  
- `<span class="accent">Confianza</span> de saber que tu esfuerzo sí genera resultados.`

**Lista útil de “Después”**  
Confianza, Tranquilidad, Orgullo, Paz, Alegría, Calma, Claridad.

### Paso 4 — L-O-B-R (6–8 min)
Cada card = **acción entendible** + **micro-recompensa emocional**.  
Título con beneficio resaltado; descripción sin `accent`.

**Plantilla de título L/O/B/R**  
- `{Letra} · {Nombre}: <span class="accent">{beneficio emocional clave}</span>`

**Plantilla de descripción**  
- `{Emoción} al {percepción resultado}.`  
  - Ej. B: “Confianza al enfocarte en lo que sí da frutos.”

**Guía por letra**  
- **L — Logro inicial**: claridad inmediata del foco del curso.  
- **O — Organizar piezas**: sensación de orden y control.  
- **B — Base sólida**: sensación de prioridades claras.  
- **R — Red integral**: sensación de visión/criterio para decidir.

> Nota SEO: coloca 1 keyword suave en **exactamente una** de las 4 descripciones.

### Paso 5 — Card Á (3–5 min)
Estado final emocional. Sin promesas cuantificables. Sin repetir “financiera” dos veces.

**Estructura**  
- Título fijo: `Alcance logrado`  
- Subtítulo: `{Recompensa macro en 5–7 palabras}`  
- Cuerpo refuerzo: `{1 frase} con un término SEO suave.`

**Ejemplo**  
- Sub: `Claridad y tranquilidad que te devuelven la confianza.`  
- Cuerpo: `Control claro de tus ingresos que se traduce en paz, seguridad y orgullo de decidir sin miedo.`

### Paso 6 — CTA (2–3 min)
- **Botón**: primera persona, beneficio directo.  
- **Microcopy**: refuerzo breve, sin repetir “financiera” si ya salió antes.  
- **Tracking**: `track("transformacion_cta")` y `aria-describedby="stone-cta-help"`.

**Recomendados**  
- Botón: `Quiero mi claridad financiera hoy`  
- Microcopy: `Empieza hoy con claridad y paz.`

---

## 4) Do / Don’t
**Sí**  
- Emociones claras: Confianza, Tranquilidad, Orgullo, Paz, Alegría.  
- Palabras de búsqueda: claridad financiera, control de ingresos, decidir sin miedo.  
- `accent` solo donde aporta jerarquía.

**No**  
- No prometer ingresos, utilidades, ROI o plazos garantizados.  
- No mencionar herramientas: Excel, archivo, dashboard, automatización.  
- No usar imperativos dentro de bullets/cards (solo en el botón).

---

## 5) Plantillas listas para rellenar

### 5.1 H2 + Sub
```

H2: De la {dolor} a la {recompensa}. LOBRÁ
Sub: En {duración} conviertes {emo-neg} en {emo-pos} sobre {tema}.

```

### 5.2 Antes (5)
```

{Emoción} + disparador breve.
{Emoción} + disparador breve.
{Emoción} + disparador breve.
{Emoción} + disparador breve.
{Emoción} + disparador breve.

```

### 5.3 Después (5) con accent
```

<accent>{Emoción}</accent> + resultado emocional en 8–12 palabras.
...

```

### 5.4 L-O-B-R
```

L · Logro inicial: <accent>{beneficio}</accent>
{Emoción} al {percepción resultado}.

O · Organizar piezas: <accent>{beneficio}</accent>
{Emoción} al {percepción resultado}.

B · Base sólida: <accent>{beneficio}</accent>
{Emoción} al {percepción resultado}.

R · Red integral: <accent>{beneficio}</accent>
{Emoción} al {percepción resultado}.

```

> Sustituye `<accent>...</accent>` por `<span className="accent">...</span>` en el código.

### 5.5 Á — Alcance logrado
```

Título: Alcance logrado
Sub: {Recompensa macro 5–7 palabras}
Cuerpo: {Frase con 1 keyword SEO suave}

```

### 5.6 CTA
```

Botón: Quiero mi {recompensa} hoy
Microcopy: Empieza hoy con {beneficio corto}.
Tracking: track("transformacion\_cta"), aria-describedby="stone-cta-help"

```

---

## 6) QA checklist antes de subir
- [ ] No hay promesas cuantificables ni “más ingresos”.  
- [ ] `accent` solo en “Después” y en beneficios de títulos L-O-B-R.  
- [ ] “Financiera” no se repite dos veces en el mismo bloque.  
- [ ] Hay 1–2 keywords SEO suaves totales, no en todos los renglones.  
- [ ] Card Á usa estado emocional, no tareas.  
- [ ] CTA en primera persona + microcopy sin repetición.  
- [ ] `track("transformacion_cta")` implementado y `aria-describedby` apuntando al microcopy.  
- [ ] JSON-LD usa títulos **sin JSX** (usa `plainTitle`).

---

## 7) Ejemplo (referencia rápida)
> Tomado del “Taller de Tranquilidad Financiera”.

- **H2**: De la confusión a la tranquilidad financiera. LOBRÁ  
- **Sub**: En 90 minutos conviertes ansiedad en claridad y confianza sobre tu dinero.  

**Antes**  
- Angustia cada vez que llegan las facturas.  
- Miedo de gastar porque no sabes si alcanza.  
- Cansancio de sentir que trabajas todo el día sin descanso.  
- Ansiedad al no saber qué pasará con tu negocio mañana.  
- Frustración de compararte con otros que avanzan más rápido.  

**Después**  
- <accent>Confianza</accent> de saber que tu esfuerzo sí genera resultados.  
- <accent>Orgullo</accent> al ver logros concretos y sentir progreso real.  
- <accent>Tranquilidad</accent> de dormir sin la carga de la incertidumbre.  
- <accent>Alegría</accent> de disfrutar tus avances sin culpa ni comparación.  
- <accent>Paz</accent> de tener claridad y decidir sin miedo.  

**L** · Logro inicial: <accent>claridad inmediata</accent>  
Alivio de ver por fin tus ingresos reales y dejar la incertidumbre atrás.

**O** · Organizar piezas: <accent>orden y control</accent>  
Seguridad al descubrir qué fuente de ingreso te da más valor y cuáles no.

**B** · Base sólida: <accent>prioridades claras</accent>  
Confianza al enfocarte en lo que sí da frutos y soltar lo que drena tu energía.

**R** · Red integral: <accent>visión de crecimiento</accent>  
Orgullo de sentirte dueño de tus decisiones y proyectar estabilidad.

**Á** · Alcance logrado  
**Claridad y tranquilidad que te devuelven la confianza**  
Control claro de tus ingresos que se traduce en paz, seguridad y orgullo de decidir sin miedo.

**CTA**  
Botón: *Quiero mi claridad financiera hoy*  
Microcopy: *Empieza hoy con claridad y paz.*  
Tracking: `track("transformacion_cta")` + `aria-describedby="stone-cta-help"`

---

## 8) Atajos para trabajar más rápido
- Reusar listas maestras de **emociones ANTES/DESPUÉS** y solo adaptar 2–3 líneas al foco del curso.  
- Redactar primero **L y Á**; luego O, B, R.  
- Escribir **CTA** al final, cuando la promesa macro esté definida.

---

## 9) Errores comunes a evitar
- Convertir los textos en tutorial: “registra, descarga, llena…”.  
- Usar “tranquilidad/financiera/claridad” repetidos en la misma tarjeta.  
- Poner `accent` en todo el “Después” completo.  
- Hacer del CTA un claim técnico (“comprar”, “pagar”); mantener beneficio.

---

## 10) Entrega final (qué debe enviarse al dev)
- Bloque de textos en Markdown con las 5 piezas (H2/Sub, Antes, Después, LOBR, Á, CTA).  
- Keywords usadas.  
- Nota si se requiere reemplazar `plainTitle` en JSON-LD.  
- Confirmación de `track("transformacion_cta")` y `aria-describedby`.

---

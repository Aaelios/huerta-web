# Estándar de SKUs y metadata — Huerta Consulting

## Convención de SKU

Formato general:
```
<tipo>-<marca?>-<tutor?>-<categoria>-<nombre>-<duracion/fecha?>-vXXX
```

### Definiciones
- **tipo** → categoría técnica del producto:
  - `course` (curso)
  - `template` (plantilla)
  - `liveclass` (clase en vivo)
  - `one2one` (asesoría individual)
  - `sub` (suscripción)
  - `product` (producto físico)
  - `service` (servicio general)

- **marca** (opcional) → identificador de la marca/línea. Ej: `rh`, `huerta`, `colab`.

- **tutor** (opcional) → autor o colaborador. Ej: `huerta`, `garcia`.

- **categoria** → agrupador simple. Ej: `fin` (finanzas), `mkt` (marketing), `aud` (audio), `cons` (consultoría).

- **nombre** → diferenciador corto. Ej: `basico`, `vip`, `prem`, `oro`, `audifonos`.

- **duracion/fecha** (opcional) → 
  - Duraciones siempre en minutos o meses, con padding numérico. Ej: `030m`, `060m`, `12m`.
  - Fechas normalizadas. Ej: `2025q1`, `sep2025`.

- **vXXX** → versión obligatoria con 3 dígitos (`v001`, `v002`, ...).

---

## Ejemplos normalizados
- Curso rentabilidad básico (Roberto, primera versión):  
  `course-rh-fin-basico-v001`

- Clase en vivo marketing VIP sep 2025:  
  `liveclass-huerta-mkt-vip-sep2025-v001`

- Asesoría 30 min con García:  
  `one2one-garcia-cons-030m-v001`

- Membresía premium anual:  
  `sub-huerta-gen-prem-12m-v001`

- Audífonos edición limitada 2025:  
  `product-huerta-aud-ltd-2025-v001`

---

## Reglas de consistencia
1. **Números siempre con padding**:
   - Versiones: `v001`, `v002`…
   - Duraciones: `030m`, `060m`, `120m`.
   - Fechas: `2025q1`, `sep2025`.  
   No mezclar formatos.

2. **Acrónimos oficiales iniciales**:
   - `fin` = finanzas  
   - `mkt` = marketing  
   - `aud` = audio  
   - `cons` = consultoría  
   - `gen` = general  
   - `prem` = premium  
   - `vip` = vip  

3. **Minúsculas, sin espacios, con guiones.**  
   Ej: `course-rh-fin-basico-v001`.

4. **Longitud máxima sugerida: 60 caracteres.**  
   Si excede, acortar `categoria` o `nombre`.

5. **Un SKU nunca se reutiliza.**  
   Si cambian beneficios o precio → nueva versión `-vXXX`.

---

## Metadata mínima en Stripe
Cada **precio** en Stripe debe incluir:
- `sku` → siguiendo convención.
- `fulfillment_type` → igual que `tipo`.
- `success_slug` → slug destino en `/gracias`.

### Metadata opcional
- `course_id`  
- `bundle_id`  
- `schedule_url`  
- `zoom_topic`  
- Para productos físicos: `shipping_required`, `weight`, etc.

---

## Validación técnica
- Patrón regex sugerido:  
  ```
  ^[a-z0-9-]+-v\d{3}$
  ```
- Rechazar si `len(SKU) > 60`.
- Rechazar si no termina en `-vXXX`.

---

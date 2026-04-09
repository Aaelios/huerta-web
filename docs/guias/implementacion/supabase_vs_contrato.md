CT-02.5 — Resultado de validación Supabase vs contrato (CT-01)

Estado general:
Supabase NO está listo para implementación estricta contra CT-01.
La base es sólida, pero hay 3 inconsistencias estructurales que rompen el contrato operativo.

---

Bloqueadores (requieren decisión, no workaround):

1. title vs name

* CT-01 exige: title
* DB actual: name
* No es un tema semántico, es contrato operativo
  → Se debe decidir cuál es el campo oficial

---

2. FREE dentro del modelo de pricing

* CT-01 define FREE como variante del mismo modelo
* DB actual:

  * amount_cents > 0 (constraint)
  * FREE no puede existir en product_prices
    → Contradicción directa con el contrato

---

3. Precio vigente único

* CT-01 exige: 1 producto → 1 price vigente
* DB permite múltiples candidatos
* RPCs actuales resuelven ambigüedad (fallback / prioridad)
  → Esto viola la regla: no resolver inconsistencias en código

---

Observaciones relevantes (no bloqueantes):

* page_slug no es NOT NULL (aunque en práctica sí se usa)
* Existe buena base:

  * PK en sku
  * FK entre tablas
  * unique en stripe_price_id
  * constraints razonables

---

Decisión requerida (antes de CT-03):

Se necesitan definiciones explícitas en estos 3 puntos:

A) ¿El contrato usa name o se migra a title?

B) ¿FREE:

* vive dentro de product_prices (permitiendo amount = 0)?
* o se modela fuera del sistema de pricing?

C) ¿El precio vigente único:

* se garantiza en DB (sin ambigüedad)?
* o se acepta lógica de selección en RPC (rompiendo regla del contrato)?

---

Recomendación:

No avanzar a implementación hasta cerrar estas 3 decisiones.
Si no se resuelven ahora, se van a parchear en helpers y se rompe la arquitectura desde el inicio.

---

Conclusión:

La base de Supabase está bien construida,
pero el contrato CT-01 no está completamente alineado con la estructura actual.

Se requiere alineación de modelo antes de continuar.

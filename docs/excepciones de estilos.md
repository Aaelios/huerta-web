# Excepciones de Estilos — Huerta Consulting

Fecha: 2025-09-22
Estado: v1 (activo)

> Propósito: registrar cualquier CSS fuera de `app/globals.css`, justificar su existencia y definir fecha de expiración.

---

## 0) Reglas generales

* Las excepciones son **casos únicos** no reutilizables o dependencias externas (ej. librerías, embeds).
* Deben documentarse aquí con:

  * **Sección/Página**
  * **Clase o selector**
  * **Justificación** (por qué no va en `globals.css`)
  * **Responsable**
  * **Fecha de creación**
  * **Fecha de expiración** (máx. 3 meses o hasta que se migre)

---

## 1) Excepciones activas

*(ninguna registrada al 2025-09-22)*

---

## 2) Flujo de gobierno

1. Al detectar necesidad, registrar aquí antes de implementar.
2. Revisar impacto: ¿puede resolverse con tokens/utilidades?
3. Si es inevitable, aprobar y marcar fecha de expiración.
4. Revisar en QA mensual y eliminar cuando ya no sea necesaria.

---

## 3) Ejemplo de registro

```md
### Ejemplo — iframe de Zoom embed
- **Página/Sección:** /webinar/slug
- **Selector:** .zoom-embed iframe
- **Justificación:** librería externa requiere ancho/alto fijo
- **Responsable:** R. Huerta
- **Fecha creación:** 2025-09-22
- **Expira:** 2025-12-22
```

---


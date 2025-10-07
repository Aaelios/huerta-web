````markdown
# 📄 Migración de `webinars.jsonc` a Supabase

Versión: v1 · Fecha: 2025-10-03  
Owner: Huerta Consulting

---

## 1. Objetivo
Eliminar dependencia de archivo plano `data/webinars.jsonc` en Vercel.  
La fuente de verdad será **Supabase (Postgres)**, permitiendo actualizar webinars sin redeployment.

---

## 2. Esquema en Supabase

Crear tabla `webinars`:

```sql
create table public.webinars (
  slug text primary key,
  shared jsonb not null,
  sales jsonb,
  prelobby jsonb,
  updated_at timestamptz default now()
);
````

* `slug` → clave única (`2025-10-14-2030`).
* `shared` → bloque obligatorio (`title`, `startAt`, `pricing`, etc.).
* `sales` → bloque opcional.
* `prelobby` → bloque opcional.
* `updated_at` → control de cambios.

---

## 3. Carga inicial de datos

1. Exportar contenido actual de `data/webinars.jsonc`.
2. Normalizar cada nodo como fila (`slug`, `shared`, `sales`, `prelobby`).
3. Insertar con `insert into webinars (slug, shared, sales, prelobby) values ...`.

---

## 4. Loader en Next.js

Reemplazar `loadWebinarsRaw()`:

```ts
// /lib/webinars/loadWebinars.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function loadWebinars() {
  const { data, error } = await supabase
    .from("webinars")
    .select("*");
  if (error) throw error;

  // reconstruir mapa { slug: { shared, sales, prelobby } }
  return Object.fromEntries(data.map((row) => [
    row.slug,
    { shared: row.shared, sales: row.sales, prelobby: row.prelobby },
  ]));
}
```

---

## 5. Validación

Se mantiene `WebinarMapSchema` en `/lib/webinars/schema.ts`.
Tras fetch de Supabase, validar con Zod como hoy.

---

## 6. Compatibilidad

* **Prelobby** y **páginas de venta** no requieren cambios → usan mismo schema.
* **Home** seguirá consumiendo `pickFeaturedForHome()` → fuente será Supabase.

---

## 7. Seguridad

* Lectura pública: opcional, si se usa `anon` con `RLS` permitiendo `select`.
* Escritura solo con `service_role` vía panel/admin.

---

## 8. Cutover Plan

1. Subir tabla en Supabase y poblarla con datos actuales.
2. Cambiar loader en `lib/webinars/loadWebinars.ts`.
3. Deploy a preview en Vercel.
4. Validar casos:

   * Evento con `featuredHome: true`.
   * Evento sin `featuredHome` → se elige el próximo.
   * Sin futuros → fallback.
5. Si todo OK, borrar `data/webinars.jsonc` del repo.
6. Comunicar que futuras actualizaciones de webinars se hacen vía Supabase.


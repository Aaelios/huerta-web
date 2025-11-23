```md
# docs/seo/schemas_globales.md
# 02B — Schemas Globales (Organization & WebSite)
Arquitectura SEO Técnico · Ecosistema LOBRÁ (lobra.net)

---

## 0) Objetivo
Definir y documentar la implementación de los **schemas globales** del sitio LOBRÁ, asegurando consistencia, limpieza y compatibilidad con motores de búsqueda y asistentes LLM.

Los schemas de este sub-bloque se generan **una sola vez** en el layout raíz y representan entidades permanentes:

- **Organization**
- **WebSite**

Estos schemas sirven como **base relacional** para todos los schemas específicos construidos en 02C–02E.

---

## 1) Alcance del Sub-bloque 02B

### Archivos creados
- `lib/seo/schemas/buildOrganizationSchema.ts`
- `lib/seo/schemas/buildWebsiteSchema.ts`
- Integración conceptual para `app/layout.tsx` (un solo bloque JSON-LD)
- Este documento: `docs/seo/schemas_globales.md`

### Entidades representadas
1. **Organization**
   - Identidad oficial de LOBRÁ.
   - Propietaria de cursos, webinars, plantillas y contenido educativo.
   - Punto de referencia para relacionar Course, Event, Product, etc.

2. **WebSite**
   - Representa el dominio primario: `https://lobra.net`
   - Expone la presencia digital del sitio y la relación con Organization.
   - Puede incluir un `SearchAction` cuando exista buscador interno.

---

## 2) Reglas Globales del Sub-bloque

### 2.1 Derivan obligatoriamente de 02A
- Sin `any`.
- Builders puros, deterministas, sin I/O.
- URLs absolutas desde capa de datos.
- Manejo estricto de `@id`.
- Combinación final siempre con `mergeSchemas`.

### 2.2 Reglas específicas de 02B
1. **Los schemas globales se insertan solo en `app/layout.tsx`**.  
   Ninguna página interna puede repetir `Organization` o `WebSite`.

2. **Los datos provienen únicamente de**  
   `data/entities/organization.lobra.jsonc`.

3. **La vinculación Organization → WebSite se hace vía `@id`.**  
   - `Organization["@id"] = "https://lobra.net/#organization"`  
   - `WebSite.publisher = { "@id": "https://lobra.net/#organization" }`

4. **`legalName` es opcional**.  
   Si no existe en el JSONC, se omite sin fallback.

5. **SearchAction es opcional.**  
   Solo se genera cuando:
   - `search.enabled === true`
   - `search.target` y `search.queryParam` son válidos

6. **Los builders no construyen URLs.**  
   Todas las URLs absolutas llegan ya definidas desde el JSONC.

---

## 3) Diseño Técnico

### 3.1 Flujo general de construcción

```

data/entities/organization.lobra.jsonc
│
▼
lib/entities/loadOrganizationEntity.ts
│
▼
─────────────── Builders 02B ──────────────────
buildOrganizationSchema(config.organization)
buildWebsiteSchema(config.website, config.organization.id)
│
▼
mergeSchemas(orgSchema, webSchema)
│
▼
app/layout.tsx → <script type="application/ld+json">

````

---

### 3.2 Responsabilidades

#### `buildOrganizationSchema`
- Recibe:
  ```ts
  {
    name: string;
    legalName?: string;
    url: string;
    logo: string;
    id?: string;       // @id
    sameAs?: string[];
  }
````

* Genera un JsonLdObject limpio y tipado.

#### `buildWebsiteSchema`

* Recibe:

  ```ts
  {
    name: string;
    url: string;
    id?: string;
    search?: { enabled: boolean; target: string; queryParam: string };
  }
  ```
* Recibe opcionalmente `publisherId` para vinculación.
* Genera SearchAction solo si corresponde.

---

## 4) Limitaciones

1. **Sin lógica de negocio.**
   No se calculan datos ni se modifican valores.

2. **Sin dependencia del request.**
   Ni locale, device, headers ni canonical dinámico.

3. **No hay fallback de URLs.**
   Si una URL no es absoluta, no se corrige. Se confía en la capa de datos.

4. **SearchAction no valida existencia real de buscador.**
   Solo responde a configuración del JSONC.

---

## 5) Contratos heredados para 02C–02E

Los sub-bloques siguientes deben:

1. **Respetar el `@id` de Organization.**
   Cualquier Course, Event, Product o Person que requiera provider/autor debe referenciar:

   ```json
   { "@id": "https://lobra.net/#organization" }
   ```

2. **Usar siempre `mergeSchemas`** como punto único de combinación.

3. **Nunca redefinir Organization ni WebSite** en builders específicos.

4. **Inyectar sus schemas en páginas internas**, nunca en `layout.tsx`.
   (Excepto 02B, único autorizado a tocar el layout).

---

## 6) Estado Final del Sub-bloque 02B

* Builders implementados y alineados con TS estricto.
* Diseño estable para LOBRÁ 2025–2026.
* Preparado para expansión a:

  * Course Schema (02C)
  * Event Schema (02D)
  * FAQPage Schema (02E)
* Todos los archivos residen en `lib/seo/schemas/` tal como dicta 02A.
* Documentación lista para auditar o extender.

---

END OF DOCUMENT

```
```

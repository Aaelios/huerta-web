```md

# 02A — Infraestructura de Schemas JSON-LD  
Ecosistema LOBRÁ (lobra.net)

## 0) Objetivo
Definir la base técnica para generar JSON-LD en el sitio, asegurando consistencia, limpieza y escalabilidad para los sub-bloques 02B–02E.  
Esta capa **no implementa lógica de negocio**, solo provee los contratos y utilidades mínimas.

---

## 1) Alcance del sub-bloque 02A
Infraestructura estricta:

1. **Tipos base**
   - `JsonLdObject`
   - Entradas: `SchemaWebinarInput`, `SchemaModuleInput`
   - Interfaces mínimas: `SchemaPerson`, `SchemaFaqItem`, `SchemaProduct`, `SchemaEvent`, `SchemaCourse`

2. **Utilidades transversales**
   - URL: extraer origin y construir rutas absolutas  
   - Fechas: validación y normalización ISO  
   - Precios: amountCents → `{ price, priceCurrency }`

3. **Sistema de combinación**
   - `mergeSchemas.ts`
   - Aplana, limpia nulos y dedup por `@id`.

4. **Skeletons de builders**
   - `buildSchemasForWebinar.ts`
   - `buildSchemasForModule.ts`
   - Sin lógica, solo estructura estricta.

---

## 2) Decisiones técnicas clave

### 2.1 Carpeta única para Schemas
```

lib/seo/schemas/

``
Concentra toda la infraestructura JSON-LD sin mezclar con metadata u otras capas de SEO.

### 2.2 Builders puros
Los builders:
- no usan React  
- no usan Next.js  
- no extraen valores del request  
- no consultan bases de datos  
Reciben todo como parámetros. Garantiza testabilidad y aislamiento.

### 2.3 `Canonical` como fuente única de verdad
Todo schema que requiera `url` se construirá desde el canonical absoluto recibido por parámetro.

### 2.4 Tipos desacoplados del dominio
Se crean DTOs específicos para schemas.  
Los sub-bloques posteriores harán la traducción desde los modelos reales del proyecto.

### 2.5 Sin lógica de negocio en 02A
Nada relacionado con:
- precios finales visuales  
- disponibilidad  
- tipos de schema concretos  
- organización del curso  
- reglas de instructor  

Todo eso se resuelve en 02B–02E.

---

## 3) Reglas que heredan los sub-bloques 02B–02E

1. **Siempre retornar `JsonLdObject[]`.**
2. **Nunca usar `any`.**
3. **Builders deben ser deterministas y puros.**
4. **URLs absolutas solo desde canonical.**
5. **Estructuras internas ensambladas con `mergeSchemas`.**
6. **Si un schema tiene `@id`, debe ser único y estable.**
7. **Todo dato debe provenir del objeto `data` o parámetros explícitos.**

---

## 4) Limitaciones y alcances futuros
02A solo arma el armazón.  
Los siguientes sub-bloques se encargan de:

- **02B:** Event + Product  
- **02C:** Course  
- **02D:** Person  
- **02E:** FAQPage

Cada uno construirá objetos JSON-LD reales apoyándose estrictamente en esta infraestructura.

---

## 5) Archivos creados en 02A

```

lib/seo/schemas/jsonLdTypes.ts
lib/seo/schemas/schemaUrlUtils.ts
lib/seo/schemas/schemaDateUtils.ts
lib/seo/schemas/schemaPriceUtils.ts
lib/seo/schemas/mergeSchemas.ts
lib/seo/schemas/buildSchemasForWebinar.ts
lib/seo/schemas/buildSchemasForModule.ts
docs/seo/schemas_infraestructura.md

```

---

## 6) Estado final del sub-bloque
02A queda **completo y funcional**, sin dependencias externas y listo para ser extendido por 02B–02E.

```

END OF DOCUMENT

```
```

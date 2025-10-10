# 📘 Supabase Inventory v1.0.0  
**Fecha de auditoría:** 2025-10-08  
**Objetivo:** Inventario completo de la instancia Supabase activa antes del cutover.  
**Propósito:** Confirmar estado actual, dependencias y limpieza/backup previo a la creación del entorno PREVIEW.

---

## 1. Metadatos de conexión

| Parámetro | Valor |
|------------|--------|
| **Project name** | huerta-consulting *(nombre visual; se puede renombrar a lobra.net sin impacto técnico)* |
| **Project ref** | `vwfwgiftbjjipzveilnx` |
| **Project URL** | https://vwfwgiftbjjipzveilnx.supabase.co |
| **Instancias activas** | 1 (única, usada tanto por PREVIEW como PROD) |
| **Integración Vercel** | `SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_URL` apuntan a la misma instancia. `ANON_KEY` y `SERVICE_ROLE_KEY` válidas. |
| **Aislamiento actual** | Ninguno — un solo proyecto Supabase usado por ambos entornos. |

---

## 2. Resumen de contenido (Tablas, vistas y datos)

### 2.1 Tablas con registros (>0 filas)

| Tabla | Filas (aprox.) | Notas |
|--------|----------------|-------|
| `rate_limits` | 8 | configuración interna |
| `products` | 4 | catálogo de productos activo |
| `bundle_items` | 2 | relación bundle-producto |
| `bundles` | 1 | bundle activo |
| `exclusivity_sets` | 1 | conjunto de exclusividad |
| `product_prices` | 1 | precios vigentes |
| **Total** | 17 filas | resto de tablas vacías |

### 2.2 Tablas sin registros
Todas las demás tablas del esquema `public`, incluyendo:  
`order_headers`, `order_items`, `payments`, `entitlements`, `contacts`, `messages`, `webhook_events`, `subscription_events`, `thankyou_copy`, etc.

### 2.3 Vistas (`public`)
| Vista | Propósito |
|--------|------------|
| `v_entitlements_active` | Entitlements filtrados por estado activo |
| `v_orders_with_payments` | Unión de órdenes y pagos |
| `v_prices_vigente` | Precios activos por SKU |
| `v_products_public` | Productos visibles públicamente |

---

## 3. Row Level Security (RLS)

- **Activo** en todas las tablas del dominio funcional.  
- Todas las políticas son **PERMISSIVE**, separadas por rol.  
- Roles principales: `{anon, authenticated, service_role}`.  
- Configuración coherente con el estándar de Supabase.  

Ejemplos:
- `products_select_public` → `{anon, authenticated}`
- `products_all_service_role` → `{service_role}`
- `entitlements_select_owner` → `{authenticated}`

Ninguna política restrictiva ni duplicada.

---

## 4. Triggers

**Total:** 20  
**Esquema:** `public`  
**Función principal:** auditoría de `updated_at` y control de integridad.

| Tabla | Trigger | Eventos | Timing | Función |
|--------|----------|----------|---------|----------|
| bundle_items | trg_bundle_items_updated_at | UPDATE | BEFORE | f_audit_set_updated_at() |
| bundles | trg_bundles_updated_at | UPDATE | BEFORE | f_audit_set_updated_at() |
| contacts | trg_contacts__touch_updated_at | UPDATE | BEFORE | f_audit_updated_at_only_update() |
| contacts | trg_contacts__updated_at | UPDATE | BEFORE | app.f_audit_updated_at_only_update_v1() |
| messages | trg_messages__touch_updated_at | UPDATE | BEFORE | f_audit_updated_at_only_update() |
| messages | trg_messages__updated_at | UPDATE | BEFORE | app.f_audit_updated_at_only_update_v1() |
| subscription_events | trg_subscription_events__block_ud | DELETE, UPDATE | BEFORE | f_block_update_delete() |
| subscription_events | trg_subscription_events__updated_at | UPDATE | BEFORE | app.f_audit_updated_at_only_update_v1() |
| thankyou_copy | trg_thankyou_copy_updated_at | UPDATE | BEFORE | tg_set_updated_at() |
| *(otras 11 tablas)* | … | … | … | f_audit_set_updated_at() |

**Conclusión:** infraestructura de triggers homogénea; auditoría y bloqueo correctos.

---

## 5. Funciones

**Total:** ~120  
**Clasificación:**

| Esquema | Cantidad | Descripción |
|----------|-----------|-------------|
| `app` | 13 | Funciones de negocio (normalización, validación, contactos, eventos) |
| `public` | 4 | Auditoría (`f_audit_set_updated_at`, `f_audit_updated_at_only_update`, `tg_set_updated_at`, `f_block_update_delete`) |
| `auth` | 4 | Funciones nativas (`email`, `jwt`, `role`, `uid`) |
| `graphql` / `graphql_public` | 5 | Resolución GraphQL y control de versión |
| `extensions` | 80+ | Criptografía, UUID, estadísticas |
| `pgbouncer` | 1 | `get_auth()` con SECURITY DEFINER |

**Seguridad:**
- `app.*` y `public.*` → `INVOKER`
- `graphql.*` y `pgbouncer.get_auth` → `SECURITY DEFINER`
- Sin funciones peligrosas ni inconsistentes detectadas.

---

## 6. Validación de aislamiento

| Elemento | Resultado | Observación |
|-----------|------------|-------------|
| Proyectos Supabase | Solo 1 (`vwfwgiftbjjipzveilnx`) | Falta entorno de QA/Preview |
| Claves Vercel | Compartidas | Misma base para producción y pruebas |
| auth.users | 0 registros | No hay datos sensibles |
| Data real | Mínima (solo catálogos) | Puede respaldarse y reimportarse sin riesgo |

---

## 7. Decisiones y plan de acción

| Área | Acción | Justificación |
|------|---------|---------------|
| **Instancias** | Crear nueva `lobra-preview` | Aislar pruebas y prevenir daño en PROD |
| **Tablas con datos** | Respaldar `products`, `bundles`, `bundle_items`, `product_prices`, `exclusivity_sets`, `rate_limits` | Contienen metadatos válidos |
| **Tablas vacías** | Mantener estructura, limpiar tras migración si fuera necesario | Evita errores de referencia |
| **RLS / Policies** | Mantener | Correctas y seguras |
| **Triggers** | Mantener | Infraestructura uniforme y necesaria |
| **Funciones** | Mantener | Sin duplicaciones ni obsolescencia |
| **auth.users** | Mantener vacío | Sin riesgo |
| **Aislamiento** | Crear entorno PREVIEW + variables separadas en Vercel | Requisito previo al cutover |

---

## 8. Recomendaciones adicionales

1. Exportar esquema actual con `pg_dump --schema-only`.
2. Exportar tablas con datos con `pg_dump -t <table>`.
3. Crear instancia `lobra-preview` en Supabase antes de próximos deploys.
4. Configurar en Vercel:  
   - `SUPABASE_URL_PREVIEW`  
   - `SUPABASE_ANON_KEY_PREVIEW`  
   - `SUPABASE_SERVICE_ROLE_KEY_PREVIEW`
5. Mantener sincronía de migraciones usando `supabase db push/pull`.

---

## 9. Conclusión

Base de datos funcional, limpia y segura.  
Sin datos de producción reales.  
Puede usarse como plantilla para entorno productivo definitivo (`lobra.net`).  
Aislamiento pendiente para garantizar despliegues seguros en futuros cortes.

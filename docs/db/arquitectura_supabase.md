# Arquitectura Supabase — Lobra

## 1. Objetivo
Restablecer un ambiente Supabase preview funcional y establecer control de estructura de base de datos en repo, sin afectar producción.

---

## 2. Modelo de Ambientes

### Local
- Desarrollo y pruebas
- Conecta a Supabase preview
- No existe base de datos local en esta fase

### Preview
- Backend de validación
- Representa la siguiente versión del sistema
- Usado por desarrollo local y Vercel preview

### Producción
- Operación estable
- Solo recibe cambios promovidos

### Reglas
- Producción no se usa para pruebas
- Preview es el único ambiente de validación
- Aislamiento total entre preview y producción

---

## 3. Fuente de Verdad

- Producción = fuente inicial para reconstrucción
- Repo = fuente oficial de estructura hacia futuro

### Regla
> Si no está en repo, no existe

---

## 4. Estructura de Base de Datos

### Incluye
- Tablas
- Relaciones
- Funciones / RPC
- Policies (RLS)
- Triggers
- Extensiones necesarias

### Regla
- Se replica producción tal cual (estructura)
- No se interpreta ni mejora en esta fase

### Excepción
- Se permiten datos semilla mínimos no reales solo para validar:
  - Ciclo de venta
  - Ciclo de contacto

---

## 5. Configuración y Variables

### En Repo
- Estructura de BD
- Migraciones
- Baseline inicial

### Fuera de Repo
- `.env.local`
- Variables por ambiente
- Keys (Supabase, Stripe, etc.)

### Reglas
- Separación estricta por ambiente
- Nunca mezclar credenciales

---

## 6. Flujo Operativo
repo → preview → validación → producción


### Flujo
1. Cambios se definen en repo
2. Se aplican en Supabase preview
3. Se validan en:
   - Backend preview
   - Vercel preview
4. Se promueven manualmente a producción

---

## 7. Validación

### Preview Funcional
- La app corre sin errores estructurales

### Validación Crítica
- Ciclo completo de venta
- Ciclo completo de contacto

### Stripe
- Test mode
- Webhook vía Vercel preview
- Productos alineados con seeds en Supabase preview

---

## 8. Control de Cambios

- Una sola línea de cambio activa
- Preview = versión en curso
- Producción = versión estable

### Reglas
- Todos los cambios pasan por repo
- UI no se usa para cambios estructurales
- No existe versionado complejo en esta fase

---

## 9. Manejo de Errores

- Preview es ambiente de iteración
- Si algo falla → se corrige
- No se promueve hasta estabilizar

### Reglas
- No rollback fino
- Preview solo se reconstruye si queda inutilizable

---

## 10. Dependencias Externas

### Preview
- Supabase preview
- Stripe test
- Vercel preview
- Webhooks hacia preview

### Producción
- Servicios live

### Regla
> Preview nunca debe impactar datos reales ni dinero

---

## 11. Riesgos Controlados

- Extracción incompleta → mitigado con pruebas reales
- Dependencias invisibles → validación funcional
- Drift entre ambientes → repo como fuente única
- Promoción incorrecta → control manual

---

## 12. Reglas Clave

- No probar en producción
- No cambios estructurales fuera de repo
- No promover sin validar en preview
- No mezclar ambientes
- Disciplina operativa es el control principal

---

## 13. Criterio de Éxito

La arquitectura se considera implementada correctamente cuando:

- Preview funcional reemplaza al anterior
- Vercel preview opera correctamente
- Estructura de BD está en repo
- Flujo repo → preview → producción funciona sin fricción
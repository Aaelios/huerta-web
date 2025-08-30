# Orden de Alimentación de Tablas — Catálogo y Reglas

Este documento define el orden correcto para poblar las tablas del catálogo y las reglas en la base de datos de Huerta Consulting.  
El objetivo es evitar violaciones de llaves foráneas y mantener consistencia lógica.

---

## Secuencia de inserción

1. **products**  
   - Insertar todos los SKUs primero.  
   - Ejemplo: cursos, plantillas, suscripciones, bundles.  
   - Cada SKU sigue la convención definida (`tipo-marca-categoria-nombre-vXXX`).  

2. **product_prices**  
   - Insertar precios después de que los SKUs existan.  
   - Soporta multi-moneda (`currency`), listas (`price_list`) y ventanas de validez (`valid_from/valid_until`).  
   - Referencia directa: `sku → products.sku`.  

3. **bundles**  
   - Insertar SKUs que actúan como bundle (ya deben existir en `products`).  
   - Solo registra que un producto es un bundle.  

4. **bundle_items**  
   - Insertar las relaciones bundle → hijos.  
   - Cada fila indica qué SKU hijo forma parte del bundle.  
   - Dependencias: `products` + `bundles`.  

5. **exclusivity_sets**  
   - Definir grupos de exclusividad.  
   - Campos clave: `name`, `rule`.  
     - `mutually_exclusive`: ninguno de los SKUs puede convivir en la misma orden.  
     - `single_selection`: solo uno puede estar activo (ej. planes de suscripción).  
   - No depende de otras tablas.  

6. **exclusivity_members**  
   - Asociar SKUs a un set de exclusividad.  
   - Dependencias: `products` + `exclusivity_sets`.  

7. **incompatibilities**  
   - Registrar pares de SKUs explícitamente prohibidos.  
   - Ejemplo: `membresía` no se puede comprar junto con `curso individual`.  
   - Dependencia: `products`.  
   - Restricción: `sku_a < sku_b` para garantizar unicidad.  

---

## Resumen visual

products
↓
product_prices
↓
bundles → bundle_items
↓
exclusivity_sets → exclusivity_members
↓
incompatibilities


---

## Notas de operación
- Todos los inserts deben ser **aditivos** (no borrar SKUs).  
- Un SKU nunca se reutiliza: cambios de precio o beneficios → nueva versión `-vXXX`.  
- `metadata` es la válvula de escape para atributos opcionales o específicos de mercado.  
- Validar integridad con `SELECT count(*)` en cada tabla después del seed.  

---

## Uso
Este orden aplica tanto para:
- **Seeds iniciales** (carga completa).  
- **Migraciones incrementales** (nuevos SKUs, precios, bundles).  

Siempre respetar esta secuencia antes de exponer productos en Stripe o en el frontend.

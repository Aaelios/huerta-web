# Huerta Web — Proyecto Next.js

## Objetivo
Migrar **huerta.consulting** de Framer a Next.js/Vercel garantizando:
- SEO y 301 sin pérdidas.
- Pagos y accesos vía Stripe + Supabase.
- Email transaccional (Resend) y marketing (Brevo).
- Comunidad (Discord).
- Analítica (GA4, GTM, Meta Pixel).

---

## Estructura de carpetas
- `/app/` → páginas y layouts Next.js.
- `/public/` → assets estáticos.
- `/utils/` → utilidades de proyecto (ej. validadores).
- `/tests/` → pruebas unitarias.
- `/ops/` → documentación y operación.
  - `/semana0/` → preparación y plan de corte (completo).
  - `/semana1/` → base Next.js y paridad visual (en curso).
  - `/dia_corte/` → checklist y ejecución de migración.

---

## Documentación de operaciones
- [Semana 0](./ops/semana0/README.md) — preparación y plan de corte.  
- [Semana 1](./ops/semana1/README.md) — base Next.js y paridad visual.  
- [Plan de corte](./ops/dia_corte/plan_corte_checklist.md).  
- [Rollback](./ops/semana0/rollback_plan.md).  
- [Estándar de SKUs](./ops/semana0/sku_standard.md).  
- [DNS plan](./ops/semana0/dns_plan.md).

---

## Uso local
```bash
# Instalar dependencias
npm install

# Levantar entorno local
npm run dev
```
Abrir en: [http://localhost:3000](http://localhost:3000)

---

## Estándares clave
- **SKUs:** definidos en `ops/semana0/sku_standard.md`.
- **Variables de entorno:** `.env.example` (raíz).
- **Redirects dominio secundario:** `ops/semana0/redirects_dominio.json`.
- **Plan de rollback:** `ops/semana0/rollback_plan.md`.

---

## Estado actual
- ✅ Semana 0 completada.  
- 🚧 Semana 1 en progreso: estructura base y paridad visual.  
- ⏭ Próximo: analítica y estrategia temporal de blog.


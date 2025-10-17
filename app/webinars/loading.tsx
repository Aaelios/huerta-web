// app/webinars/loading.tsx
/**
 * Loading UI para /webinars
 * Muestra esqueletos mientras se resuelve el SSR de page.tsx.
 * Mantiene el mismo layout base para evitar CLS.
 */

import s from '@/components/webinars/hub/WebinarsHub.module.css';

function Bar({ w = 120, h = 16 }: { w?: number; h?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'wbl-sheen 1.2s linear infinite',
      }}
    />
  );
}

function Pill({ w = 100 }: { w?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: w,
        height: 34,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    />
  );
}

function CardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={s.card}
      aria-hidden
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: tall ? 280 : 180,
          borderRadius: 12,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
          backgroundSize: '200% 100%',
          animation: 'wbl-sheen 1.2s linear infinite',
        }}
      />
      <Bar w={260} h={18} />
      <Bar w={200} h={14} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Pill w={90} />
        <Pill w={140} />
        <Pill w={110} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Bar w={80} h={20} />
        <div
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </div>
  );
}

export default function LoadingWebinars() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes wbl-sheen {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
          `,
        }}
      />
      <div className={`container ${s.hub}`}>
        {/* Hero */}
        <header className="l-hero--compact">
          <h1>Webinars LOBRÁ</h1>
          <p>
            Explora workshops en vivo, módulos y bundles. Filtra por tema y nivel. Compra individual o en paquete.
          </p>
        </header>

        {/* Destacados */}
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Casi llenos</h2>
          <div className={s.featuredGrid} style={{ display: 'grid', gap: 16 }}>
            <CardSkeleton tall />
          </div>
        </section>

        {/* Filtros */}
        <div className={`section ${s.filtersBar}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill w={90} />
            <Pill w={120} />
            <Pill w={100} />
            <Pill w={140} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill w={180} />
            <Pill w={160} />
          </div>
        </div>

        {/* Módulos/Bundles */}
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Módulos completos</h2>
          <div
            className={s.bundlesGrid}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              minHeight: 320, // reserva de altura para 2–4 cards
            }}
          >
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </section>

        {/* Workshops */}
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Workshops disponibles</h2>
          <div
            className={s.classGrid}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              minHeight: 540, // reserva de altura para 3–6 cards
            }}
          >
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </section>

        {/* Paginación */}
        <div className="section" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Pill w={90} />
          <Pill w={90} />
          <Pill w={90} />
        </div>
      </div>
    </>
  );
}

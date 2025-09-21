// components/sobreMi/EnQueAyudo.tsx
export default function EnQueAyudo() {
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <h2 id="en-que-ayudo">En qué te ayudo</h2>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr",
        }}
      >
        <div className="card">
          <h4>Ventas rápidas sin embudos complicados</h4>
          <p>Acciones concretas para validar tu oferta y generar ingresos de inmediato.</p>
        </div>
        <div className="card">
          <h4>Claridad financiera para decidir</h4>
          <p>Liquidez y métricas simples que revisamos semana a semana.</p>
        </div>
        <div className="card">
          <h4>Operación ordenada que ahorra tiempo</h4>
          <p>Procesos básicos y automatización donde aporta, menos errores y más foco.</p>
        </div>
        <div className="card">
          <h4>IA práctica como apoyo</h4>
          <p>Uso real de inteligencia artificial para tareas repetitivas y decisiones con datos, sin modas ni complejidad.</p>
        </div>
      </div>
    </div>
  );
}

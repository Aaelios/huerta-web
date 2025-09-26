// app/components/QueEsLobra/Diferenciadores.tsx
"use client";

export default function Diferenciadores() {
  return (
    <section className="section section--surface" aria-labelledby="diff-title">
      <div className="container stack-3">
        <header className="u-text-center">
          <h2 id="diff-title">¿Por qué <span className="accent">LOBRÁ</span> es distinto?</h2>
          <p className="small">Lo que no funciona vs. lo que sí <span className="accent">te da resultados</span>.</p>
        </header>

        {/* Orden DOM: LOBRÁ primero para que en móvil aparezca arriba */}
        <div className="l-heroGrid">
          {/* Columna LOBRÁ */}
          <article className="c-card is-emphasis shadow-soft" role="group" aria-labelledby="lobra-title">
            <h3 id="lobra-title">
              <span className="accent">LOBRÁ</span>
            </h3>
            <ul className="list-check u-maxw-prose" role="list">
              <li role="listitem"><strong>Certificación por acción:</strong> cada taller cierra con un entregable.</li>
              <li role="listitem"><strong>Escalabilidad real:</strong> L→O→B→R→<strong>Á</strong> sin rehacer trabajo.</li>
              <li role="listitem"><strong>Implementación primero,</strong> no presentaciones.</li>
              <li role="listitem">Lenguaje claro para cualquier nivel.</li>
              <li role="listitem">Progreso medible en cada sesión.</li>
            </ul>
            <p className="small u-maxw-prose">En cada paso, avanzas con entregables reales.</p>
          </article>

          {/* Columna Lo típico */}
          <article className="c-card" role="group" aria-labelledby="typical-title">
            <h3 id="typical-title" className="fg-70">Lo típico</h3>
            <ul className="u-maxw-prose" role="list">
              <li role="listitem">
                <span aria-hidden="true">✕</span>
                <span className="u-visually-hidden">No: </span> Cursos teóricos sin entregables.
              </li>
              <li role="listitem">
                <span aria-hidden="true">✕</span>
                <span className="u-visually-hidden">No: </span> Avances sueltos que no conectan.
              </li>
              <li role="listitem">
                <span aria-hidden="true">✕</span>
                <span className="u-visually-hidden">No: </span> Dependencia de “expertos” y plantillas.
              </li>
              <li role="listitem">
                <span aria-hidden="true">✕</span>
                <span className="u-visually-hidden">No: </span> Mucho PowerPoint, poca acción.
              </li>
              <li role="listitem">
                <span aria-hidden="true">✕</span>
                <span className="u-visually-hidden">No: </span> Cobro por hora sin resultados.
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

// components/sobreMi/CTA.tsx
import Link from "next/link";

export default function CTA() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" role="region" aria-label="Llamado a la acción">
        <h3 style={{ marginBottom: 8 }}>¿Listo para ordenar y vender?</h3>
        <p className="small" style={{ marginBottom: 16 }}>
          Empezamos simple. Priorizamos, ejecutamos y medimos resultados.
        </p>
        <Link href="/contacto" className="btn-solid">
          Quiero empezar
        </Link>
      </div>
    </div>
  );
}

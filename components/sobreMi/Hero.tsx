// components/sobreMi/Hero.tsx
import Link from "next/link";

export default function Hero() {
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <h1>Sobre Roberto Huerta</h1>
      <p className="medium" style={{ maxWidth: 720 }}>
        Ordeno negocios para que generen ingresos claros y sostenibles. Trabajo
        con pasos simples y resultados visibles desde la primera semana.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
        aria-label="Acciones principales"
      >
        <Link href="/contacto" className="btn-solid">
          Escríbeme
        </Link>
        <Link href="/" className="btn-outline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// components/sobreMi/MiniBio.tsx
import Image from "next/image";

export default function MiniBio() {
  return (
    <div
      className="container"
      style={{
        paddingTop: 32,
        paddingBottom: 32,
        display: "grid",
        gap: 24,
        alignItems: "center",
        gridTemplateColumns: "1fr",
      }}
    >
      <div>
        <h2 id="mini-bio">Quién soy y cómo trabajo</h2>
        <p style={{ maxWidth: 820 }}>
          He dirigido coporativos transnacionales fortune 500 y también lideré pymes. 
          Hoy trabajo con emprendedores que empiezan o quieren crecer. Mi enfoque: 
          priorizar lo que vende, simplificar la operación y medir cada semana.
          Sin promesas vacías. Además, sé aterrizar el ruido de la IA en tareas y 
          flujos que sí agregan valor, sin modas ni complicación.
        </p>
      </div>

      <figure style={{ justifySelf: "start" }}>
        <Image
          src="/images/home/roberto-huerta-minibio-600x600.jpg"
          alt="Retrato de Roberto Huerta, consultor para emprendedores en LATAM"
          width={300}
          height={300}
          className="img-compact"
          loading="lazy"
          sizes="(max-width: 640px) 60vw, 300px"
          priority={false}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
          }}
        />
      </figure>
    </div>
  );
}

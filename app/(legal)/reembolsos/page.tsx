// app/(legal)/reembolsos/page.tsx
// Página legal estática — Política de Reembolsos LOBRÁ
// Metadata centralizada vía buildMetadata (seoConfig + buildMetadata)

import { buildMetadata } from "@/lib/seo/buildMetadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  typeId: "legal",
  pathname: "/reembolsos",
  title: "Política de Reembolsos",
  description:
    "Reglas de reembolsos de LOBRÁ para webinars, cursos, plantillas y sesiones 1-a-1. Condiciones claras aplicables en México.",
});

export default function Page() {
  return (
    <section className="section">
      <div className="container u-maxw-prose">
        <h1>Política de Reembolsos</h1>

        <p>
          Esta política aplica a compras realizadas en lobra.net y a los
          Servicios operados por <strong>Corporativo Huerta Elek</strong> bajo la
          marca registrada <strong>LOBRÁ</strong>. Busca equilibrio: proteger al
          consumidor sin permitir abusos.
        </p>

        <h2>Webinars en vivo</h2>
        <ul>
          <li><strong>Reembolso hasta 24 h antes</strong> del inicio programado.</li>
          <li>Si el evento ya ocurrió, <strong>no procede</strong> reembolso.</li>
        </ul>

        <h2>Cursos grabados / on-demand</h2>
        <ul>
          <li><strong>Ventana de 7 días</strong> desde la compra.</li>
          <li>Aplica solo si el consumo es <strong>&lt;= 20%</strong> del contenido.</li>
          <li>Si se supera ese umbral, <strong>no procede</strong>.</li>
        </ul>

        <h2>Plantillas, descargas y herramientas digitales</h2>
        <ul>
          <li><strong>No reembolsables</strong> una vez descargadas o accedidas.</li>
          <li>
            Excepción: <strong>error técnico imputable</strong> a nosotros (archivo
            corrupto, acceso no otorgado). En ese caso, reembolso completo.
          </li>
        </ul>

        <h2>Sesiones 1-a-1 / consultoría</h2>
        <ul>
          <li><strong>Reembolso si cancelas con 24 h</strong> de anticipación.</li>
          <li><strong>No show</strong> o cancelación tardía: no procede.</li>
        </ul>

        <h2>Bundles o paquetes</h2>
        <p>
          Se tratan como <strong>un solo producto</strong>. El reembolso procede solo
          si <strong>ningún componente</strong> ha sido consumido o descargado.
        </p>

        <h2>Código de conducta</h2>
        <p>
          Si se suspende o cancela el acceso por incumplir el{" "}
          <a href="/terminos">Código de conducta</a>, <strong>no hay</strong> derecho
          a reembolso.
        </p>

        <h2>Moneda, comisiones y tiempos</h2>
        <ul>
          <li>
            La devolución se realiza por el <strong>mismo medio de pago</strong> y en
            la <strong>misma moneda</strong> de la compra.
          </li>
          <li>
            Variaciones cambiarias y cargos de banca emisora corren por cuenta del cliente.
          </li>
          <li>
            Procesamiento: <strong>5–10 días hábiles</strong> desde la aprobación.
          </li>
        </ul>

        <h2>Cómo solicitar un reembolso</h2>
        <ol>
          <li>
            Escribe a <a href="mailto:legal@lobra.net">legal@lobra.net</a> con asunto
            “Solicitud de reembolso”.
          </li>
          <li>Incluye correo de compra, número de pedido, fecha y producto.</li>
          <li>
            Describe el motivo y, si aplica, evidencia del problema técnico.
          </li>
        </ol>

        <h2>Excepciones y prevalencia legal</h2>
        <p>
          En caso de conflicto, esta política se interpretará conforme a la
          legislación mexicana vigente.
        </p>

        <p>
          <small>
            Actualizado: <time dateTime="2025-09">septiembre 2025</time>
          </small>
        </p>
      </div>
    </section>
  );
}

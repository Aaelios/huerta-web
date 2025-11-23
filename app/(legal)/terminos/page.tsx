// app/(legal)/terminos/page.tsx
// Página legal estática — Términos y Condiciones LOBRÁ
// Metadata centralizada vía buildMetadata (seoConfig + buildMetadata)

import { buildMetadata } from "@/lib/seo/buildMetadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  typeId: "legal",
  pathname: "/terminos",
  title: "Términos y Condiciones",
  description:
    "Condiciones de uso del sitio y de los productos digitales de LOBRÁ. Licencia personal, propiedad intelectual, reembolsos, conducta y afiliados.",
});

export default function Page() {
  return (
    <section className="section">
      <div className="container u-maxw-prose">
        <h1>Términos y Condiciones</h1>

        <p>
          Estos Términos regulan el uso de lobra.net y el acceso a nuestros
          productos y servicios digitales (“Servicios”). Al usar el sitio aceptas
          estas condiciones. Aplica en México.
        </p>

        <h2>Responsable</h2>
        <p>
          Los Servicios son ofrecidos por <strong>Corporativo Huerta Elek</strong>,
          bajo la marca registrada <strong>LOBRÁ</strong>. Toda referencia a
          “LOBRÁ” corresponde a la marca comercial operada por Corporativo Huerta Elek.
        </p>

        <h2>Cuenta y acceso</h2>
        <p>
          Puedes necesitar una cuenta para acceder a ciertos Servicios. Debes
          proporcionar información veraz y mantener la confidencialidad de tus
          credenciales. Eres responsable de la actividad realizada con tu cuenta.
        </p>

        <h2>Licencia de uso</h2>
        <p>
          Al comprar o acceder a un curso, plantilla, webinar u otro material
          digital, recibes una licencia limitada, revocable, no exclusiva y
          estrictamente personal. No puedes revender, compartir, publicar,
          sublicenciar, distribuir ni hacer uso comercial del contenido fuera de
          lo permitido en estos Términos.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>
          Todo el contenido del sitio y de los Servicios (textos, videos,
          plantillas, código, marcas, imágenes) es propiedad de Corporativo Huerta
          Elek o de sus licenciantes. No se transfiere ningún derecho de propiedad
          intelectual.
        </p>

        <h2>Código de conducta</h2>
        <p>
          Nuestros espacios compartidos (webinars en vivo, foros, chats y comunidad)
          requieren trato respetuoso. Se prohíbe lenguaje o conducta ofensiva,
          discriminatoria, de acoso o que perturbe el desarrollo de actividades.
          Corporativo Huerta Elek podrá suspender o cancelar el acceso, total o
          parcial, ante incumplimientos. Si la cancelación se debe a violación del
          Código de conducta, no procede reembolso.
        </p>

        <h2>Enlaces de afiliados</h2>
        <p>
          Algunos enlaces a herramientas o servicios de terceros (por ejemplo,
          Brevo, Notion u otros) pueden ser de afiliados. Si realizas una compra a
          través de ellos, Corporativo Huerta Elek puede recibir una comisión. Esto
          no afecta el precio que pagas ni condiciona nuestras recomendaciones.
        </p>

        <h2>Disponibilidad y cambios</h2>
        <p>
          Los Servicios pueden cambiar o interrumpirse total o parcialmente en
          cualquier momento por mantenimiento, mejoras o causas externas. No se
          garantiza disponibilidad continua.
        </p>

        <h2>Precios, impuestos y facturación</h2>
        <p>
          Los precios se muestran antes de pagar e incluyen o excluyen impuestos
          según corresponda. El cargo se procesa por nuestro proveedor de pagos.
          Revisa tus datos antes de finalizar la compra.
        </p>

        <h2>Reembolsos</h2>
        <p>
          La elegibilidad y plazos se rigen por la{" "}
          <a href="/reembolsos">Política de Reembolsos</a>. Al comprar, aceptas
          esas condiciones. Algunos productos pueden ser no reembolsables.
        </p>

        <h2>Limitación de responsabilidad</h2>
        <p>
          En la medida permitida por la ley, Corporativo Huerta Elek no será
          responsable por daños indirectos, incidentales, especiales o
          consecuenciales derivados del uso o imposibilidad de uso de los
          Servicios. Los materiales se proporcionan “tal cual”, sin garantías de
          resultado específico.
        </p>

        <h2>Enlaces y contenidos de terceros</h2>
        <p>
          El sitio puede incluir enlaces o integraciones de terceros. No
          controlamos su contenido ni sus prácticas; su uso se rige por sus
          propios términos y políticas.
        </p>

        <h2>Datos personales</h2>
        <p>
          El tratamiento de datos se describe en nuestro{" "}
          <a href="/privacidad">Aviso de Privacidad</a>.
        </p>

        <h2>Jurisdicción y ley aplicable</h2>
        <p>
          Estos Términos se rigen por las leyes de México. Cualquier disputa se
          someterá a los tribunales competentes en la Ciudad de México, renunciando
          a cualquier otro fuero.
        </p>

        <h2>Contacto</h2>
        <p>
          Dudas sobre estos Términos:{" "}
          <a href="mailto:legal@lobra.net">legal@lobra.net</a>
        </p>

        <h2>Cambios a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos por cambios operativos o legales. La
          versión vigente se publica en esta página.
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

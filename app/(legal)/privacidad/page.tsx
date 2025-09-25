// app/(legal)/privacidad/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad | LOBRÁ",
  description:
    "Aviso de privacidad de LOBRÁ. Datos recabados, uso, cookies y ejercicio de derechos ARCO.",
};

export default function Page() {
  return (
    <section className="section">
      <div className="container u-maxw-prose">
        <h1>Privacidad</h1>

        <p>
          Este aviso explica cómo LOBRÁ (“nosotros”) trata tus datos personales
          cuando usas lobra.net y nuestros productos digitales. Aplica en México.
        </p>

        <h2>Responsable</h2>
        <p>
          Responsable: Roberto Huerta. Zona Esmeralda, Atizapán, Estado de México.
          Contacto: <a href="mailto:legal@lobra.net">legal@lobra.net</a>
          {/* TODO: confirmar mailbox final en chat de control */}
        </p>

        <h2>Cookies y tecnologías similares</h2>
        <p>
          Usamos cookies propias y de terceros para analizar el uso del sitio,
          mejorar tu experiencia y mostrar contenidos o anuncios relevantes.
          Al continuar navegando aceptas su uso. Puedes deshabilitarlas en tu
          navegador, lo cual podría afectar funciones del sitio.
        </p>

        <h2>Datos que recabamos</h2>
        <ul>
          <li>Identificación: nombre.</li>
          <li>Contacto: correo y, opcionalmente, teléfono.</li>
          <li>
            Transacciones: pagos procesados por Stripe. No almacenamos datos
            de tarjetas en nuestros servidores.
          </li>
          <li>
            Uso del sitio: eventos de navegación y conversión medidos con
            herramientas de analítica y publicidad.
          </li>
        </ul>

        <h2>Finalidades</h2>
        <ul>
          <li>Procesar pagos y habilitar accesos a productos/servicios.</li>
          <li>Enviar correos operativos y comprobantes de compra.</li>
          <li>
            Comunicación de contenidos y novedades si otorgas consentimiento
            para marketing.
          </li>
          <li>Mejorar seguridad, desempeño y experiencia del sitio.</li>
        </ul>

        <h2>Proveedores que utilizamos</h2>
        <ul>
          <li>Hosting y despliegue: Vercel.</li>
          <li>Base de datos y autenticación: Supabase.</li>
          <li>Pagos: Stripe.</li>
          <li>Correo transaccional: Resend.</li>
          <li>Email marketing y automatizaciones: Brevo.</li>
          <li>Analítica y anuncios: Google Analytics 4 y Google Ads.</li>
          <li>Publicidad/remarketing: Meta Pixel.</li>
          <li>Contenido legado o incrustado: Framer (cuando corresponda).</li>
          {/* Opcionales del stack general: Cloudflare R2, Vimeo Pro (si aplica en el futuro) */}
        </ul>
        <p>
          Estos terceros procesan datos conforme a sus propias políticas. No
          vendemos tu información a terceros.
        </p>

        <h2>Derechos ARCO</h2>
        <p>
          Puedes ejercer acceso, rectificación, cancelación u oposición, así
          como revocar tu consentimiento para marketing. Escríbenos a{" "}
          <a href="mailto:legal@lobra.net">legal@lobra.net</a> con el asunto
          “Derechos ARCO”.
        </p>

        <h2>Conservación y seguridad</h2>
        <p>
          Conservamos datos por el tiempo necesario para fines operativos,
          legales o contables. Aplicamos medidas razonables de seguridad.
        </p>

        <h2>Menores de edad</h2>
        <p>
          El sitio no está dirigido a menores de 13 años. Si crees que
          recabamos datos de un menor, contáctanos para eliminarlos.
        </p>

        <h2>Actualizaciones a este aviso</h2>
        <p>
          Podemos actualizar este aviso por cambios operativos o regulatorios.
          La versión vigente se publica en esta página.
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

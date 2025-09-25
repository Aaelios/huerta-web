import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">
        {/* Columna izquierda: Marca + Newsletter */}
        <div className="footer-col">
          <h3 className="brand">
            <Link href="/" className="c-link">LOBRÁ</Link>
          </h3>

          <h5>Mantente al tanto</h5>
          <p className="text-white-75">
            Suscríbete y recibe ideas prácticas para tener más ingresos, más tiempo libre y orgullo en lo que logras.
          </p>

          {/* Embed Brevo pendiente: Semana 3 */}
          <form className="subscribe-form" method="post">
            {/* Honeypot anti-bots */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />

            <label htmlFor="email" className="sr-only">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Correo electrónico"
              required
              className="c-form-control"
              aria-label="Correo electrónico"
            />

            <button type="submit" className="c-btn c-btn--solid" aria-label="Suscribirme al newsletter">
              Suscribirme
            </button>

            <small className="text-white-60">
              Al suscribirte aceptas la{" "}
              <Link href="/privacidad" className="c-link">Política de Privacidad</Link>.
            </small>
          </form>
        </div>

        {/* Columna centro: Secciones */}
        <nav className="footer-col" aria-label="Secciones">
          <strong>Secciones</strong>
          <ul className="footer-list">
            <li>
              <Link href="/" className="c-link">Home</Link>
            </li>
            <li>
              <Link href="/sobre-mi" className="c-link">Sobre mí</Link>
            </li>
            <li>
              <Link href="/blog" className="c-link">Blog</Link>
            </li>
            <li>
              <a
                href="https://www.huerta.consulting"
                target="_blank"
                rel="noopener noreferrer"
                className="c-link"
              >
                Consultoría
              </a>
            </li>
          </ul>
        </nav>

        {/* Columna derecha: Información */}
        <nav className="footer-col" aria-label="Información">
          <strong>Información</strong>
          <ul className="footer-list">
            <li>
              <Link href="/#faq" className="c-link">FAQs</Link>
            </li>
            <li>
              <Link href="/privacidad" className="c-link">Privacidad</Link>
            </li>
            <li>
              <Link href="/terminos" className="c-link">Términos</Link>
            </li>
            <li>
              <Link href="/reembolsos" className="c-link">Reembolsos</Link>
            </li>
            <li>
              <Link href="/contacto" className="c-link">Soporte y contacto</Link>
            </li>
          </ul>
        </nav>
      </div>

      <hr className="footer-divider" />

      <div className="container footer-bottom">
        <small>© {year} Corporativo Huerta Elek — Todos los derechos reservados</small>
        <small>
          <a
            href="https://www.huerta.consulting"
            target="_blank"
            rel="noopener noreferrer"
            className="c-link"
          >
            Desarrollado con pasión y café por Roberto Huerta
          </a>
        </small>
        <small>
          Fotografías por{" "}
          <a
            href="https://www.juditelek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="c-link"
          >
            Judit Elek
          </a>
        </small>
      </div>
    </footer>
  );
}

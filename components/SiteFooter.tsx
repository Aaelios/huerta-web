import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        {/* Columna izquierda */}
        <div className="footer-col">
          <h3 className="brand">Roberto Huerta</h3>
          <h5>Mantente al tanto</h5>
          <p className="text-white-75">
            Suscríbete si quieres recibir ideas prácticas para mejorar tu negocio sin perder tiempo en soluciones genéricas.
          </p>

          {/* Sustituir por embed de Brevo en Semana 3 */}
          <form className="subscribe-form">
            <label htmlFor="email" className="sr-only">Correo electrónico</label>
            <input id="email" type="email" placeholder="Correo electrónico" required className="c-form-control" />
            <button type="submit" className="c-btn c-btn--solid">Suscribirme</button>
          </form>
        </div>

        {/* Columna centro */}
        <div className="footer-col">
          <strong>Secciones</strong>
          <ul className="footer-list">
            <li><Link href="/" className="c-link">Home</Link></li>
            <li><Link href="/sobre-mi" className="c-link">Sobre mi</Link></li>
            <li><Link href="/blog" className="c-link">Blog</Link></li>
          </ul>
        </div>

        {/* Columna derecha */}
        <div className="footer-col">
          <strong>Información</strong>
          <ul className="footer-list">
            <li><Link href="/#faq" className="c-link">FAQs</Link></li>
            <li><Link href="/aviso-de-privacidad" className="c-link">Privacidad</Link></li>
            <li><Link href="/contacto" className="c-link">Contacto</Link></li>
          </ul>
        </div>
      </div>

      <hr className="footer-divider" />

      <div className="container footer-bottom">
        <small>© 2025 Huerta Consulting — Todos los derechos reservados</small>
        <small>Desarrollado con pasión y café por Roberto Huerta</small>
      </div>
    </footer>
  );
}

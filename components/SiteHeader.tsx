// app/components/SiteHeader.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Tracking CTA header
const trackCTA = () => {
  try {
    window.dataLayer?.push({
      event: 'cta_click',
      placement: 'header',
      label: 'Inscribirme al próximo webinar',
    });
  } catch {}
};

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  // Cierra panel al cambiar de ruta o con Escape y bloquea scroll del body
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="site-header" role="banner">
      <div className="container">
        <div className="nav-container">
          {/* Brand */}
          <Link href="/" className="brand" aria-label="Inicio">
            LOBRÁ
          </Link>

          {/* Nav desktop */}
          <nav className="nav-center" aria-label="Principal">
            <Link
              href="/que-es-lobra"
              className={`c-link--nav ${isActive('/que-es-lobra') ? 'is-active' : ''}`}
            >
              Qué es LOBRÁ
            </Link>
            <Link
              href="/webinars"
              className={`c-link--nav ${isActive('/webinars') ? 'is-active' : ''}`}
            >
              Webinars
            </Link>
            <Link
              href="/sobre-mi"
              className={`c-link--nav ${isActive('/sobre-mi') ? 'is-active' : ''}`}
            >
              Sobre mí
            </Link>
          </nav>

          {/* Right actions */}
          <div className="nav-right">
            <a
              className="c-btn c-btn--icon"
              href="https://www.instagram.com/soylobra"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <SvgInstagram />
            </a>
            <a
              className="c-btn c-btn--icon"
              href="https://www.youtube.com/@soylobra"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              title="YouTube"
            >
              <SvgYouTube />
            </a>

            {/* CTA principal */}
            <Link
              href="/webinars"
              className="c-btn c-btn--solid c-btn--pill"
              onClick={trackCTA}
            >
              Inscribirme al próximo webinar
            </Link>
            <button
              type="button"
              className="hamburger c-btn c-btn--icon"
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <SvgMenu />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay móvil */}
      <div
        className="mobile-overlay"
        aria-hidden="true"
        data-open={open ? 'true' : 'false'}
        onClick={() => setOpen(false)}
      />

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        className="mobile-panel"
        data-open={open ? 'true' : 'false'}
      >
        <button
          type="button"
          className="c-btn c-btn--icon mobile-close"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        >
          <SvgClose />
        </button>

        {/* CTA arriba del panel */}
        <div className="mobile-actions">
          <Link
            href="/webinars"
            className="c-btn c-btn--solid c-btn--pill"
            onClick={() => { trackCTA(); setOpen(false); }}
          >
            Inscribirme al próximo webinar
          </Link>
        </div>

        <nav aria-label="Menú móvil">
          <Link
            href="/"
            className={`c-link--nav ${isActive('/') ? 'is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            Inicio
          </Link>
          <Link
            href="/que-es-lobra"
            className={`c-link--nav ${isActive('/que-es-lobra') ? 'is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            Qué es LOBRÁ
          </Link>
          <Link
            href="/webinars"
            className={`c-link--nav ${isActive('/webinars') ? 'is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            Webinars
          </Link>
          <Link
            href="/sobre-mi"
            className={`c-link--nav ${isActive('/sobre-mi') ? 'is-active' : ''}`}
            onClick={() => setOpen(false)}
          >
            Sobre mí
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ==== Inline SVGs sin dependencias ==== */
function SvgInstagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.75-3.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
    </svg>
  );
}

function SvgYouTube(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.2a3.1 3.1 0 0 0-2.2-2.2C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.3.5A3.1 3.1 0 0 0 .5 6.2 32.9 32.9 0 0 0 0 12a32.9 32.9 0 0 0 .5 5.8 3.1 3.1 0 0 0 2.2 2.2c1.9.5 9.3.5 9.3.5s7.4 0 9.3-.5a3.1 3.1 0 0 0 2.2-2.2A32.9 32.9 0 0 0 24 12a32.9 32.9 0 0 0-.5-5.8zM9.8 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );
}

function SvgMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
}

function SvgClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"/>
    </svg>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/sobre-mi", label: "Sobre mí" },
  { href: "/blog", label: "Blog" }, // ajusta si usas subdominio
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú al cambiar de ruta y con Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="site-header" role="banner">
      <div className="container nav-container">
        {/* Marca a la izquierda */}
        <Link href="/" className="brand" aria-label="Ir al inicio">
          <span>Roberto Huerta</span>
        </Link>

        {/* Nav centrado en desktop */}
        <nav className="nav-center" aria-label="Navegación principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Iconos + CTA + Hamburguesa a la derecha */}
        <div className="nav-right">
          <a
            className="icon-btn"
            aria-label="YouTube"
            href="https://www.youtube.com/@RHUniversity"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* YouTube */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23.5 6.2a4 4 0 0 0-2.8-2.8C18.7 3 12 3 12 3s-6.7 0-8.7.4A4 4 0 0 0 .5 6.2 41 41 0 0 0 0 12a41 41 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.8C5.3 21 12 21 12 21s6.7 0 8.7-.4a4 4 0 0 0 2.8-2.8A41 41 0 0 0 24 12a41 41 0 0 0-.5-5.8ZM9.8 15.5V8.5L16 12l-6.2 3.5Z" fill="currentColor"/>
            </svg>
          </a>
          <a
            className="icon-btn"
            aria-label="Instagram"
            href="https://www.instagram.com/rh.university"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Instagram */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 7a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7Zm0 8a3 3 0 1 1 .001-6.001A3 3 0 0 1 12 15Zm6.5-8.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5Zm-2 0A2.5 2.5 0 0 0 16.5 5h-9A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5v-9Z" fill="currentColor"/>
            </svg>
          </a>

          <Link href="/contacto" className="btn-pill">Contáctame</Link>

          {/* Hamburguesa / Cerrar */}
          <button
            type="button"
            className="hamburger"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              /* Icono cerrar */
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Icono hamburguesa */
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Panel móvil: solo links + CTA (sin iconos) */}
      <div id="mobile-menu" className="mobile-panel" data-open={open ? "true" : "false"}>
        <nav aria-label="Menú móvil">
          {NAV.map((item) => (
            <Link
              key={`m-${item.href}`}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mobile-actions">
            <Link href="/contacto" className="btn-pill">Contáctame</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

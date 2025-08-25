import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Huerta Consulting",
  description: "Migración a Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <nav className="site-nav container">
            <Link href="/" style={{ fontWeight: 700 }}>Huerta Consulting</Link>
            <Link href="/sobre-mi">Sobre mí</Link>
            <Link href="/contacto">Contacto</Link>
            <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <small>© {new Date().getFullYear()} Huerta Consulting</small>
          </div>
        </footer>
      </body>
    </html>
  );
}

export const metadata = {
  title: "Huerta Consulting",
  description: "Migración a Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "sans-serif", color: "#111" }}>
        <header style={{ padding: "12px 20px", borderBottom: "1px solid #eee" }}>
          <nav style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <a href="/" style={{ fontWeight: 700 }}>Huerta Consulting</a>
            <a href="/sobre-mi">Sobre mí</a>
            <a href="/contacto">Contacto</a>
            <a href="/aviso-de-privacidad">Aviso de privacidad</a>
          </nav>
        </header>
        <main style={{ padding: "24px 20px", maxWidth: 960, margin: "0 auto" }}>{children}</main>
        <footer style={{ padding: "24px 20px", borderTop: "1px solid #eee", marginTop: 40 }}>
          <small>© {new Date().getFullYear()} Huerta Consulting</small>
        </footer>
      </body>
    </html>
  );
}

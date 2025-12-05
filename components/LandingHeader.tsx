// components/LandingHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/que-es-lobra", label: "Qué es LOBRÁ" },
  { href: "/webinars", label: "Webinars" },
  { href: "/sobre-mi", label: "Sobre mí" },
];

export default function LandingHeader(): React.ReactNode {
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string): boolean => {
      if (!pathname) return false;
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname],
  );

  return (
    <header className="landing-header" role="banner">
      <div className="landing-header-inner">
        <Link
          href="/"
          className="landing-header-brand"
          aria-label="Inicio LOBRÁ"
        >
          LOBRÁ
        </Link>

        <nav
          className="landing-header-nav"
          aria-label="Navegación principal"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? "landing-header-link is-active"
                  : "landing-header-link"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

// components/modules/StickyCTA.tsx
// Propósito: Mostrar un llamado a la acción fijo en la parte inferior de la pantalla.
"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type StickyCTAProps = {
  ctaText: string;
  ctaHref: string;
};

export function StickyCTA({ ctaText, ctaHref }: StickyCTAProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollY =
        typeof window !== "undefined"
          ? window.scrollY || window.pageYOffset
          : 0;

      const viewportHeight =
        typeof window !== "undefined" ? window.innerHeight : 0;

      const docElement =
        typeof document !== "undefined"
          ? document.documentElement
          : null;

      const docHeight = docElement?.scrollHeight ?? 0;

      const distanceFromBottom = docHeight - (scrollY + viewportHeight);

      // 1) Mostrar solo cuando ya pasaste el hero
      const pastHero = scrollY > 320;

      // 2) Ocultar cuando estás muy cerca del final (footer / fin del main)
      const beforeFooter = distanceFromBottom > 700;

      setVisible(pastHero && beforeFooter);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        right: "16px",
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 300ms ease, transform 300ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Link
        href={ctaHref}
        prefetch={false}
        className="c-btn c-btn--solid c-btn--pill"
        aria-label={ctaText}
        style={{
          paddingInline: "1.75rem",
          paddingBlock: "0.85rem",
          fontSize: "0.95rem",
          fontWeight: 600,
          backdropFilter: "blur(6px)",
        }}
      >
        {ctaText}
      </Link>
    </div>,
    document.body
  );
}

// components/modules/ModuleStatement.tsx
// Propósito: Mostrar el statement del módulo con animación suave al entrar en viewport.

"use client";

import React, { useEffect, useRef, useState } from "react";

type ModuleStatementProps = {
  text: string;
};

function renderAccentLocal(input: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }

    parts.push(
      <span key={match.index} className="accent">
        {match[1]}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return parts;
}

export function ModuleStatement({ text }: ModuleStatementProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.45 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      className="section section--light"
      aria-label="Resumen visual del módulo"
      style={{
        paddingTop: "var(--space-10)",
        paddingBottom: "var(--space-12)",
        backgroundColor: "#ffffff",
      }}
    >
      <div className="container">
        <div
          ref={containerRef}
          className="u-text-center"
          style={{
            maxWidth: "820px",
            marginInline: "auto",
            paddingInline: "var(--space-4)",
            paddingBlock: "var(--space-6)",
            background:
              "radial-gradient(circle at 50% 0, rgba(51,130,77,0.10), transparent 75%)",
            borderRadius: "24px",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 500ms ease-out, transform 500ms ease-out",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(22px, 3.2vw, 44px)",
              lineHeight: 1.35,
              fontWeight: 500,
              color: "rgba(10,10,10,0.7)",
            }}
          >
            {renderAccentLocal(text)}
          </h2>
        </div>
      </div>
    </section>
  );
}

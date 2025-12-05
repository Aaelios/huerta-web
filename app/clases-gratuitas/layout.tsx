// app/clases-gratuitas/layout.tsx
import type { ReactNode } from "react";
import "./landing.css";

export default function FreeClassLandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="landing-root">{children}</div>;
}

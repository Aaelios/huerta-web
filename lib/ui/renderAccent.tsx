// /lib/ui/renderAccent.tsx
import React from "react";

/** [[texto]] -> <span className="accent">texto</span> */
export function renderAccent(input?: string): React.ReactNode {
  if (!input) return null;

  const parts: React.ReactNode[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) parts.push(input.slice(lastIndex, m.index));
    parts.push(
      <span key={m.index} className="accent">
        {m[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) parts.push(input.slice(lastIndex));
  return parts;
}

// components/webinars/prelobby/PrelobbyShell.tsx

import React from "react";
import Header from "./Header";
import PreparationList from "./PreparationList";
import ResourcesRow from "./ResourcesRow";
import FaqList from "./FaqList";
import SupportNote from "./SupportNote";
import type { Webinar } from "@/lib/types/webinars";

type Props = {
  webinar: Webinar;
  children?: React.ReactNode; // PrelobbyClient renderiza aquí el estado/CTA dinámico
};

/**
 * PrelobbyShell
 * Layout estático. El bloque de estado/CTA lo pinta solo PrelobbyClient vía {children}.
 */
export default function PrelobbyShell({ webinar, children }: Props) {
  const shared: any = (webinar as any)?.shared ?? webinar;

  return (
    <main className="section section--surface">
      <div className="container stack-8">
        <Header webinar={webinar} />

        <div className="grid-2">
          <div className="stack-4">{children}</div>
          <div className="stack-4">
            <PreparationList />
          </div>
        </div>

        <ResourcesRow webinar={webinar} />
        <FaqList />
        <SupportNote email={shared?.supportEmail ?? ""} />
      </div>
    </main>
  );
}

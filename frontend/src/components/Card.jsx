import React from "react";
import { cn } from "../lib/utils";

export function Card({ title, right, children, className, bodyClass }) {
  return (
    <section className={cn("glass rounded-md border border-border bg-card/60", className)}>
      {title && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h3>
          {right}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

import { type ReactNode } from "react";
import "./legal.css";

export function LegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="legal-shell">
      <div className="legal-grid" aria-hidden="true" />
      {children}
    </div>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { DocsApp } from "./docs/docs-app";
import { LegalShell } from "./legal/legal-shell";
import { PrivacyPage } from "./legal/privacy";
import { TermsPage } from "./legal/terms";
import "./index.css";

function Root() {
  const path = window.location.pathname;
  if (path === "/docs" || path.startsWith("/docs/")) {
    return <DocsApp />;
  }
  if (path === "/terms") {
    return (
      <LegalShell>
        <TermsPage />
      </LegalShell>
    );
  }
  if (path === "/privacy") {
    return (
      <LegalShell>
        <PrivacyPage />
      </LegalShell>
    );
  }
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { DocsApp } from "./docs/docs-app";
import { LegalShell } from "./legal/legal-shell";
import { PrivacyPage } from "./legal/privacy";
import { TermsPage } from "./legal/terms";
import { privacyMeta, termsMeta } from "./lib/site-seo";
import { usePageMeta } from "./lib/use-page-meta";
import "./index.css";

function TermsRoute() {
  usePageMeta(termsMeta);
  return (
    <LegalShell>
      <TermsPage />
    </LegalShell>
  );
}

function PrivacyRoute() {
  usePageMeta(privacyMeta);
  return (
    <LegalShell>
      <PrivacyPage />
    </LegalShell>
  );
}

function Root() {
  const path = window.location.pathname;
  if (path === "/docs" || path.startsWith("/docs/")) {
    return <DocsApp />;
  }
  if (path === "/terms") {
    return <TermsRoute />;
  }
  if (path === "/privacy") {
    return <PrivacyRoute />;
  }
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

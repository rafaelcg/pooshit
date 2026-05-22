import { useEffect } from "react";
import { DEFAULT_OG_IMAGE, type PageMeta } from "./site-seo";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function setJsonLd(id: string, data: object | object[] | undefined) {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  if (!data) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const url = `https://pooshit.dev${meta.path === "/" ? "/" : meta.path}`;

    document.title = meta.title;
    setMeta("name", "description", meta.description);
    setLink("canonical", url);
    setMeta("property", "og:type", meta.ogType ?? "website");
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", meta.description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", DEFAULT_OG_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", meta.description);
    setMeta("name", "twitter:image", DEFAULT_OG_IMAGE);

    if (meta.jsonLd) {
      setJsonLd("page-json-ld", meta.jsonLd);
    }

    return () => {
      document.getElementById("page-json-ld")?.remove();
    };
  }, [meta.description, meta.jsonLd, meta.ogType, meta.path, meta.title]);
}

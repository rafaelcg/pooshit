import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllSitemapPaths, SITE_URL } from "./src/lib/site-seo";

const rootDir = dirname(fileURLToPath(import.meta.url));

function sitemapPlugin(): Plugin {
  return {
    name: "generate-sitemap",
    closeBundle() {
      const paths = getAllSitemapPaths();
      const urls = paths
        .map((path) => {
          const loc = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
          const changefreq = path === "/" ? "weekly" : "monthly";
          return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n  </url>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      writeFileSync(resolve(rootDir, "dist/sitemap.xml"), xml);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemapPlugin()],
  server: {
    port: 5173,
  },
});

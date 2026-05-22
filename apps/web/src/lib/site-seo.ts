import { getAllPages, getCommandById, getPageBySlug } from "../docs/content";

export const SITE_URL = "https://pooshit.dev";
export const SITE_NAME = "pooshit";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.jpg`;

const HOME_DESCRIPTION =
  "Deploy from your terminal with one command. Free hosting, live URL in ~60s on *.pooshit.dev. No signup — just npx pooshit.";

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  jsonLd?: object | object[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "How does pooshit work?",
    answer:
      "Run npx pooshit from your project folder. Pooshit packs your code, detects the stack (static HTML, Node.js, Docker), uploads it, and deploys to shared infrastructure. You get a public URL on *.pooshit.dev in about 60 seconds.",
  },
  {
    question: "Is pooshit free?",
    answer:
      "Yes. The free tier includes 50 MB projects, a random *.pooshit.dev subdomain, and 24-hour live URLs — no credit card or signup required. Pro ($9.99/mo) adds permanent hosting, custom subdomains, and larger uploads.",
  },
  {
    question: "What can I deploy with pooshit?",
    answer:
      "Static sites (index.html), Node.js apps, and Docker projects. Pooshit auto-detects your stack from package.json, Dockerfile, or index.html. See the docs for Vite, React, and CI/CD examples.",
  },
  {
    question: "Do I need an account to deploy?",
    answer:
      "No. Run npx pooshit from any directory — no signup, no dashboard, no API key on the free tier. Your deploy token is saved locally in .pooshit/project.json for redeploys.",
  },
  {
    question: "How long does a free deploy stay live?",
    answer:
      "Free-tier deploys expire after 24 hours. Run npx pooshit again in the same directory to redeploy, or upgrade to Pro for permanent hosting.",
  },
];

export function getSoftwareApplicationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    downloadUrl: "https://www.npmjs.com/package/pooshit",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function getFaqJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export const homeMeta: PageMeta = {
  title: "pooshit — deploy from your terminal in 60 seconds",
  description: HOME_DESCRIPTION,
  path: "/",
  jsonLd: [getSoftwareApplicationJsonLd(), getFaqJsonLd()],
};

export const termsMeta: PageMeta = {
  title: "Terms of Service — pooshit",
  description:
    "Terms of Service for Pooshit — free-tier terminal hosting. Acceptable use, data retention, and liability.",
  path: "/terms",
};

export const privacyMeta: PageMeta = {
  title: "Privacy Policy — pooshit",
  description:
    "Privacy Policy for Pooshit. What we collect when you deploy, how long we keep it, and your rights.",
  path: "/privacy",
};

export function getDocsMeta(slug: string): PageMeta {
  if (slug.startsWith("commands/")) {
    const commandId = slug.replace("commands/", "");
    const command = getCommandById(commandId);
    if (command) {
      return {
        title: `${command.name} — pooshit docs`,
        description: `${command.summary}. ${command.description}`,
        path: `/docs/${slug}`,
      };
    }
  }

  const page = getPageBySlug(slug);
  if (page) {
    const path = page.slug ? `/docs/${page.slug}` : "/docs";
    return {
      title: `${page.title} — pooshit docs`,
      description: page.description,
      path,
    };
  }

  return {
    title: "Documentation — pooshit",
    description:
      "Pooshit documentation — deploy static sites, Node apps, and more from your terminal with npx pooshit.",
    path: slug ? `/docs/${slug}` : "/docs",
  };
}

export function getAllSitemapPaths(): string[] {
  const docPaths = getAllPages().map((page) =>
    page.slug ? `/docs/${page.slug}` : "/docs",
  );

  return ["/", "/terms", "/privacy", ...docPaths];
}

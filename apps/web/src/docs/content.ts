export type CommandStatus = "available" | "coming-soon";

export interface CommandOption {
  flag: string;
  description: string;
}

export interface CliCommand {
  id: string;
  name: string;
  summary: string;
  usage: string;
  description: string;
  status: CommandStatus;
  options?: CommandOption[];
  examples?: string[];
  notes?: string[];
}

export interface DocPage {
  id: string;
  title: string;
  slug: string;
  section: string;
  description: string;
  searchTerms: string[];
}

export interface DocSection {
  id: string;
  title: string;
  pages: DocPage[];
}

export const cliCommands: CliCommand[] = [
  {
    id: "deploy",
    name: "deploy",
    summary: "Deploy the current directory (default command)",
    usage: "npx pooshit [deploy] [options]",
    description:
      "Packages the current directory, detects your stack (static, Node, etc.), uploads to Pooshit, and returns a public URL. If the directory is already linked to a deploy, updates the existing site instead of creating a new one.",
    status: "available",
    options: [
      { flag: "--token <token>", description: "Redeploy using a specific deploy token" },
      { flag: "--json", description: "Output machine-readable JSON" },
    ],
    examples: [
      "npx pooshit",
      "npx pooshit deploy --json",
      "npx pooshit deploy --token ps_abc123",
    ],
    notes: [
      "Run from the folder you want live — not a monorepo root unless that is the app.",
      "See What you can deploy for how static vs Node detection works.",
      "Token resolution order: --token flag → POOSHIT_DEPLOY_TOKEN env → .pooshit/project.json → ~/.pooshit/deploys.json",
    ],
  },
  {
    id: "status",
    name: "status",
    summary: "Show deploy info for this directory",
    usage: "npx pooshit status [options]",
    description:
      "Prints the live URL, deploy token, and expiry for the project linked to the current directory.",
    status: "available",
    options: [{ flag: "--json", description: "Output machine-readable JSON" }],
    examples: ["npx pooshit status", "npx pooshit status --json"],
  },
  {
    id: "open",
    name: "open",
    summary: "Open the live URL in your browser",
    usage: "npx pooshit open",
    description: "Opens the linked deploy URL in your default browser.",
    status: "available",
    examples: ["npx pooshit open"],
  },
  {
    id: "logs",
    name: "logs",
    summary: "Fetch Railway build/runtime logs",
    usage: "npx pooshit logs [options]",
    description:
      "Streams recent logs for the linked deploy from Railway. Useful when a build fails or the service crashes.",
    status: "available",
    options: [
      { flag: "--lines <n>", description: "Number of log lines (default: 100)" },
      { flag: "--json", description: "Output machine-readable JSON" },
    ],
    examples: ["npx pooshit logs", "npx pooshit logs --lines 200"],
  },
  {
    id: "init",
    name: "init",
    summary: "Create .pooshit/project.json",
    usage: "npx pooshit init [options]",
    description:
      "Scaffolds a project manifest before your first deploy. Optional but recommended for teams and CI — gives the directory a stable project ID.",
    status: "available",
    options: [{ flag: "--json", description: "Output machine-readable JSON" }],
    examples: ["npx pooshit init"],
  },
  {
    id: "link",
    name: "link",
    summary: "Link directory to an existing deploy",
    usage: "npx pooshit link --token <token> [options]",
    description:
      "Associates the current directory with an existing deploy token. Use when cloning a repo, setting up CI, or recovering from a lost local state file.",
    status: "available",
    options: [
      { flag: "--token <token>", description: "Deploy token (required, ps_…)" },
      { flag: "--json", description: "Output machine-readable JSON" },
    ],
    examples: ["npx pooshit link --token ps_abc123def456"],
  },
  {
    id: "destroy",
    name: "destroy",
    summary: "Delete a deploy and tear down Railway resources",
    usage: "npx pooshit destroy [options]",
    description:
      "Removes the linked deploy from Pooshit and deletes the Railway service. Clears .pooshit/project.json deploy fields and local state. Alias: delete.",
    status: "available",
    options: [
      { flag: "--token <token>", description: "Destroy by deploy token (CI teardown)" },
      { flag: "--yes", description: "Skip confirmation prompt" },
      { flag: "--json", description: "Output machine-readable JSON" },
    ],
    examples: [
      "npx pooshit destroy",
      "npx pooshit delete --yes",
      "npx pooshit destroy --token ps_abc123 --yes",
    ],
  },
  {
    id: "list",
    name: "list",
    summary: "List your deploys",
    usage: "npx pooshit list [options]",
    description:
      "Shows deploys associated with your network (by IP hash on the free tier). Also lists locally linked directories from ~/.pooshit/deploys.json.",
    status: "available",
    options: [{ flag: "--json", description: "Output machine-readable JSON" }],
    examples: ["npx pooshit list", "npx pooshit list --json"],
  },
  {
    id: "login",
    name: "login",
    summary: "Log in with GitHub",
    usage: "npx pooshit login",
    description:
      "Authenticates via GitHub OAuth and stores an API key in ~/.pooshit/credentials. Required for Pro billing and cross-device deploy management.",
    status: "coming-soon",
    examples: ["npx pooshit login"],
  },
  {
    id: "upgrade",
    name: "upgrade",
    summary: "Upgrade to Pooshit Pro",
    usage: "npx pooshit upgrade",
    description:
      "Opens Stripe Checkout for Pro ($9.99/mo): 500 MB uploads, no TTL, custom subdomain, custom domain, 10 concurrent projects.",
    status: "coming-soon",
    examples: ["npx pooshit upgrade"],
  },
  {
    id: "env",
    name: "env",
    summary: "Manage environment variables",
    usage: "npx pooshit env <set|list|unset> [options]",
    description:
      "Set, list, or remove environment variables for the linked deploy. Useful for API keys and database URLs without committing secrets.",
    status: "coming-soon",
    examples: [
      "npx pooshit env set DATABASE_URL=postgres://…",
      "npx pooshit env list",
      "npx pooshit env unset DATABASE_URL",
    ],
  },
];

export const envVars = [
  {
    name: "POOSHIT_API_URL",
    default: "https://api.pooshit.dev",
    description: "Override the Pooshit API base URL (useful for self-hosting or staging).",
  },
  {
    name: "POOSHIT_DEPLOY_TOKEN",
    default: "—",
    description:
      "Deploy token for CI/CD. When set, npx pooshit redeploys to that site without needing .pooshit/project.json on disk.",
  },
];

export const docSections: DocSection[] = [
  {
    id: "start",
    title: "Getting started",
    pages: [
      {
        id: "introduction",
        title: "Introduction",
        slug: "",
        section: "Getting started",
        description: "What Pooshit is and how it works",
        searchTerms: ["quick start", "overview", "what is pooshit"],
      },
      {
        id: "quickstart",
        title: "Quickstart",
        slug: "quickstart",
        section: "Getting started",
        description: "Deploy in 60 seconds",
        searchTerms: ["install", "first deploy", "npx"],
      },
      {
        id: "project-types",
        title: "What you can deploy",
        slug: "project-types",
        section: "Getting started",
        description: "Static HTML, Node apps, Docker, and common gotchas",
        searchTerms: [
          "static",
          "index.html",
          "node",
          "docker",
          "vite",
          "react",
          "detection",
          "stack",
        ],
      },
    ],
  },
  {
    id: "commands",
    title: "Commands",
    pages: cliCommands.map((cmd) => ({
      id: cmd.id,
      title: cmd.name,
      slug: `commands/${cmd.id}`,
      section: "Commands",
      description: cmd.summary,
      searchTerms: [cmd.name, cmd.summary, ...cmd.examples ?? []],
    })),
  },
  {
    id: "reference",
    title: "Reference",
    pages: [
      {
        id: "project-file",
        title: "Project file",
        slug: "project-file",
        section: "Reference",
        description: ".pooshit/project.json format and token resolution",
        searchTerms: ["project.json", "deploy token", "redeploy", "ci"],
      },
      {
        id: "environment",
        title: "Environment variables",
        slug: "environment",
        section: "Reference",
        description: "POOSHIT_API_URL and POOSHIT_DEPLOY_TOKEN",
        searchTerms: ["env", "ci", "github actions"],
      },
      {
        id: "limits",
        title: "Limits & pricing",
        slug: "limits",
        section: "Reference",
        description: "Free vs Pro tier limits",
        searchTerms: ["free", "pro", "rate limit", "ttl", "pricing"],
      },
      {
        id: "ci",
        title: "CI/CD",
        slug: "ci",
        section: "Reference",
        description: "Deploy from GitHub Actions and other CI",
        searchTerms: ["github actions", "pipeline", "automation"],
      },
    ],
  },
];

export function getAllPages(): DocPage[] {
  return docSections.flatMap((section) => section.pages);
}

export function getPageBySlug(slug: string): DocPage | undefined {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  return getAllPages().find((page) => page.slug === normalized);
}

export function getCommandById(id: string): CliCommand | undefined {
  return cliCommands.find((cmd) => cmd.id === id);
}

export const projectFileExample = `{
  "version": 1,
  "projectId": "proj_a1b2c3d4e5f67890",
  "deployId": "f4e2a1b3c5d6",
  "deployToken": "ps_abc123…",
  "slug": "f4k9x2",
  "url": "https://f4k9x2.up.railway.app",
  "expiresAt": "2026-05-22T12:00:00.000Z",
  "updatedAt": "2026-05-21T12:00:00.000Z"
}`;

export const gitignoreExample = `# Pooshit — keeps deploy tokens out of git
.pooshit/`;

export const ciExample = `- name: Deploy to Pooshit
  env:
    POOSHIT_DEPLOY_TOKEN: \${{ secrets.POOSHIT_DEPLOY_TOKEN }}
  run: npx pooshit --json

- name: Teardown preview deploy
  if: always()
  env:
    POOSHIT_DEPLOY_TOKEN: \${{ secrets.POOSHIT_DEPLOY_TOKEN }}
  run: npx pooshit destroy --yes --json`;

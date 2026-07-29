"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// ─── URL Detection ──────────────────────────────────────────────────────────

function detectUrlType(url: string): "github" | "gitlab" | "bitbucket" | "vercel" | "netlify" | "railway" | "render" | "website" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.includes("github.com")) return "github";
  if (lower.includes("gitlab.com")) return "gitlab";
  if (lower.includes("bitbucket.org")) return "bitbucket";
  if (lower.includes("vercel.app") || lower.includes("vercel.com")) return "vercel";
  if (lower.includes("netlify.app") || lower.includes("netlify.com")) return "netlify";
  if (lower.includes("railway.app") || lower.includes("railway.com")) return "railway";
  if (lower.includes("render.com") || lower.includes("onrender.com")) return "render";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "website";
  return "unknown";
}

function parseRepoUrl(url: string): { owner: string; repo: string; provider: string } | null {
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubMatch) return { owner: githubMatch[1], repo: githubMatch[2].replace(/\.git$/, ""), provider: "github" };

  const gitlabMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+)/);
  if (gitlabMatch) return { owner: gitlabMatch[1], repo: gitlabMatch[2].replace(/\.git$/, ""), provider: "gitlab" };

  const bitbucketMatch = url.match(/bitbucket\.org\/([^/]+)\/([^/]+)/);
  if (bitbucketMatch) return { owner: bitbucketMatch[1], repo: bitbucketMatch[2].replace(/\.git$/, ""), provider: "bitbucket" };

  return null;
}

// ─── Repository Fetching ────────────────────────────────────────────────────

interface RepoInfo {
  name: string;
  description: string | undefined;
  language: string | undefined;
  framework: string | undefined;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
  license: string | undefined;
  openIssues: number;
  lastPush: string | undefined;
}

async function fetchGitHubRepo(owner: string, repo: string): Promise<RepoInfo> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub repo not found: ${owner}/${repo}`);
  const data = await res.json();
  return {
    name: data.name,
    description: data.description,
    language: data.language,
    framework: undefined,
    stars: data.stargazers_count,
    forks: data.forks_count,
    topics: data.topics || [],
    defaultBranch: data.default_branch,
    license: data.license?.name,
    openIssues: data.open_issues_count,
    lastPush: data.pushed_at,
  };
}

async function fetchGitHubTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tree || []).slice(0, 500).map((f: { path: string; size?: number }) => f.path);
}

async function fetchGitHubFile(owner: string, repo: string, path: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  if (data.content) return Buffer.from(data.content, "base64").toString("utf-8");
  return "";
}

async function fetchGitLabRepo(owner: string, repo: string): Promise<RepoInfo> {
  const encoded = encodeURIComponent(`${owner}/${repo}`);
  const res = await fetch(`https://gitlab.com/api/v4/projects/${encoded}`);
  if (!res.ok) throw new Error(`GitLab repo not found: ${owner}/${repo}`);
  const data = await res.json();
  return {
    name: data.name,
    description: data.description,
    language: data.main_language,
    framework: undefined,
    stars: data.star_count,
    forks: data.forks_count,
    topics: data.topics || [],
    defaultBranch: data.default_branch,
    license: data.license?.name,
    openIssues: data.open_issues_count,
    lastPush: data.last_activity_at,
  };
}

async function fetchGitLabTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const encoded = encodeURIComponent(`${owner}/${repo}`);
  const res = await fetch(`https://gitlab.com/api/v4/projects/${encoded}/repository/tree?ref=${branch}&per_page=100&recursive=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []).slice(0, 500).map((f: { path: string }) => f.path);
}

// ─── Technology Detection ───────────────────────────────────────────────────

interface TechStack {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  ai: string[];
  testing: string[];
  devops: string[];
  packageManagers: string[];
}

function detectTechnologies(files: string[], readmeContent: string = ""): TechStack {
  const result: TechStack = {
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    ai: [],
    testing: [],
    devops: [],
    packageManagers: [],
  };

  const allFiles = files.join(" ").toLowerCase();
  const allNames = files.map((f) => f.split("/").pop() || "").join(" ").toLowerCase();
  const readme = readmeContent.toLowerCase();

  // ── Languages ──
  if (files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) result.languages.push("TypeScript");
  if (files.some((f) => f.endsWith(".js") || f.endsWith(".jsx")) && !result.languages.includes("TypeScript")) result.languages.push("JavaScript");
  if (files.some((f) => f.endsWith(".py"))) result.languages.push("Python");
  if (files.some((f) => f.endsWith(".go"))) result.languages.push("Go");
  if (files.some((f) => f.endsWith(".rs"))) result.languages.push("Rust");
  if (files.some((f) => f.endsWith(".java"))) result.languages.push("Java");
  if (files.some((f) => f.endsWith(".rb"))) result.languages.push("Ruby");
  if (files.some((f) => f.endsWith(".cs"))) result.languages.push("C#");
  if (files.some((f) => f.endsWith(".swift"))) result.languages.push("Swift");
  if (files.some((f) => f.endsWith(".kt"))) result.languages.push("Kotlin");
  if (files.some((f) => f.endsWith(".dart"))) result.languages.push("Dart");
  if (files.some((f) => f.endsWith(".php"))) result.languages.push("PHP");

  // ── Frontend Frameworks ──
  if (allNames.includes("next.config") || allFiles.includes("app/page.") || allFiles.includes("pages/")) result.frameworks.push("Next.js");
  if (allNames.includes("vite.config") || allFiles.includes("src/main.tsx")) result.frameworks.push("Vite");
  if (allFiles.includes("nuxt.config") || (allFiles.includes("pages/") && !result.frameworks.includes("Next.js"))) result.frameworks.push("Nuxt.js");
  if (allNames.includes("angular.json") || allFiles.includes("app.module")) result.frameworks.push("Angular");
  if (allNames.includes("vue.config") || allFiles.includes("src/App.vue")) result.frameworks.push("Vue.js");
  if (allFiles.includes("svelte.config") || files.some((f) => f.endsWith(".svelte"))) result.frameworks.push("Svelte");
  if (allFiles.includes("remix.config") || allFiles.includes("app/root.")) result.frameworks.push("Remix");
  if (allFiles.includes("astro.config")) result.frameworks.push("Astro");
  if ((allFiles.includes("src/") || allFiles.includes("app/")) && files.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"))) result.frameworks.push("React");
  if (allFiles.includes("flutter") || files.some((f) => f.endsWith(".dart"))) result.frameworks.push("Flutter");
  if (allFiles.includes("react-native") || files.some((f) => f.includes("react-native"))) result.frameworks.push("React Native");
  if (allFiles.includes("electron") || allNames.includes("electron-builder")) result.frameworks.push("Electron");

  // ── Backend Frameworks ──
  if (allFiles.includes("manage.py") || allFiles.includes("settings.py")) result.frameworks.push("Django");
  if (allFiles.includes("main.py") && (allFiles.includes("fastapi") || allNames.includes("uvicorn"))) result.frameworks.push("FastAPI");
  if ((allFiles.includes("app.py") || allFiles.includes("wsgi.py")) && !result.frameworks.includes("Django")) result.frameworks.push("Flask");
  if (allNames.includes("nest-cli") || allFiles.includes("src/*.module.ts")) result.frameworks.push("NestJS");
  if (allNames.includes("express") || allFiles.includes("middleware/")) result.frameworks.push("Express.js");
  if (allFiles.includes("go.mod")) result.frameworks.push("Go");
  if (allFiles.includes("Cargo.toml")) result.frameworks.push("Rust");
  if (allFiles.includes("pom.xml") || allFiles.includes("build.gradle")) result.frameworks.push("Spring Boot");
  if (allFiles.includes("Gemfile")) result.frameworks.push("Rails");
  if (allFiles.includes("composer.json")) result.frameworks.push("Laravel");

  // ── Databases ──
  if (allFiles.includes("prisma/") || allFiles.includes("schema.prisma")) result.databases.push("Prisma");
  if (allFiles.includes("drizzle/") || allFiles.includes("drizzle.config")) result.databases.push("Drizzle");
  if (allFiles.includes("knexfile") || allFiles.includes("migrations/")) result.databases.push("Knex.js");
  if (allFiles.includes("convex/")) result.databases.push("Convex");
  if (allFiles.includes("firebase") || allFiles.includes("firestore")) result.databases.push("Firebase");
  if (allFiles.includes("mongodb") || allFiles.includes("mongoose")) result.databases.push("MongoDB");
  if (allFiles.includes("redis")) result.databases.push("Redis");
  if (allFiles.includes("postgres") || allFiles.includes("postgresql")) result.databases.push("PostgreSQL");
  if (allFiles.includes("mysql")) result.databases.push("MySQL");
  if (allFiles.includes("sqlite")) result.databases.push("SQLite");
  if (allFiles.includes("supabase")) result.databases.push("Supabase");

  // ── Cloud / Infrastructure ──
  if (allFiles.includes("dockerfile") || allFiles.includes("docker-compose")) result.cloud.push("Docker");
  if (allFiles.includes("kubernetes") || allFiles.includes("k8s")) result.cloud.push("Kubernetes");
  if (allFiles.includes("vercel.json") || allFiles.includes("netlify.toml")) result.cloud.push("Vercel/Netlify");
  if (allFiles.includes("aws") || allFiles.includes("samconfig") || allFiles.includes("serverless.yml")) result.cloud.push("AWS");
  if (allFiles.includes("cloudbuild") || allFiles.includes("app.yaml")) result.cloud.push("GCP");
  if (allFiles.includes("terraform") || allFiles.includes("main.tf")) result.cloud.push("Terraform");

  // ── AI / ML ──
  if (allFiles.includes("openai") || readme.includes("openai")) result.ai.push("OpenAI");
  if (allFiles.includes("gemini") || readme.includes("gemini")) result.ai.push("Gemini");
  if (allFiles.includes("anthropic") || readme.includes("claude")) result.ai.push("Anthropic");
  if (allFiles.includes("langchain") || allFiles.includes("llamaindex")) result.ai.push("LangChain");
  if (allFiles.includes("tensorflow") || allFiles.includes("pytorch")) result.ai.push("ML Framework");
  if (allFiles.includes("huggingface") || allFiles.includes("transformers")) result.ai.push("HuggingFace");

  // ── Testing ──
  if (allFiles.includes("jest") || allFiles.includes("__tests__") || allFiles.includes(".test.") || allFiles.includes(".spec.")) result.testing.push("Jest");
  if (allFiles.includes("vitest") || allFiles.includes("vite.config")) result.testing.push("Vitest");
  if (allFiles.includes("cypress") || allFiles.includes("cypress.config")) result.testing.push("Cypress");
  if (allFiles.includes("playwright") || allFiles.includes("playwright.config")) result.testing.push("Playwright");
  if (allFiles.includes("pytest") || allFiles.includes("conftest.py")) result.testing.push("Pytest");

  // ── DevOps ──
  if (allFiles.includes(".github/workflows")) result.devops.push("GitHub Actions");
  if (allFiles.includes(".gitlab-ci")) result.devops.push("GitLab CI");
  if (allFiles.includes("Jenkinsfile")) result.devops.push("Jenkins");
  if (allFiles.includes(".circleci")) result.devops.push("CircleCI");
  if (allFiles.includes("tailwind.config") || allFiles.includes("tailwindcss")) result.devops.push("Tailwind CSS");

  // ── Package Managers ──
  if (allFiles.includes("bun.lockb") || allFiles.includes("bunfig.toml")) result.packageManagers.push("Bun");
  if (allFiles.includes("yarn.lock")) result.packageManagers.push("Yarn");
  if (allFiles.includes("pnpm-lock.yaml")) result.packageManagers.push("pnpm");
  if (allFiles.includes("package-lock.json")) result.packageManagers.push("npm");
  if (allFiles.includes("requirements.txt") || allFiles.includes("pyproject.toml")) result.packageManagers.push("pip");
  if (allFiles.includes("Pipfile")) result.packageManagers.push("pipenv");
  if (allFiles.includes("poetry.lock")) result.packageManagers.push("Poetry");
  if (allFiles.includes("go.sum")) result.packageManagers.push("Go modules");
  if (allFiles.includes("Cargo.lock")) result.packageManagers.push("Cargo");

  return result;
}

// ─── Structural Analysis ────────────────────────────────────────────────────

interface StructuralAnalysis {
  totalFiles: number;
  directoryDepth: number;
  rootDirs: string[];
  hasReadme: boolean;
  hasTests: boolean;
  hasCI: boolean;
  hasDocker: boolean;
  hasEnvExample: boolean;
  hasGitignore: boolean;
  hasLicense: boolean;
  hasDocumentation: boolean;
  hasMonorepo: boolean;
  configFiles: string[];
  entryPoints: string[];
  componentCount: number;
  hookCount: number;
  serviceCount: number;
  apiRoutes: number;
  duplicatePatterns: string[];
  deadCodeIndicators: string[];
  securityFiles: string[];
}

function analyzeStructure(files: string[]): StructuralAnalysis {
  const dirs = new Set<string>();
  let maxDepth = 0;

  for (const f of files) {
    const parts = f.split("/");
    if (parts.length > maxDepth) maxDepth = parts.length;
    if (parts.length > 1) dirs.add(parts[0]);
  }

  const hasFile = (patterns: string[]) => files.some((f) => patterns.some((p) => f.toLowerCase().includes(p)));

  return {
    totalFiles: files.length,
    directoryDepth: maxDepth,
    rootDirs: Array.from(dirs).slice(0, 20),
    hasReadme: hasFile(["readme"]),
    hasTests: hasFile(["test", "spec", "__tests__", "tests/"]),
    hasCI: hasFile([".github/workflows", ".gitlab-ci", "Jenkinsfile", ".circleci"]),
    hasDocker: hasFile(["dockerfile", "docker-compose"]),
    hasEnvExample: hasFile([".env.example", ".env.sample", ".env.template"]),
    hasGitignore: hasFile([".gitignore"]),
    hasLicense: hasFile(["license"]),
    hasDocumentation: hasFile(["docs/", "documentation", "wiki"]),
    hasMonorepo: files.some((f) => f.includes("packages/") || f.includes("apps/")),
    configFiles: files.filter((f) => f.match(/\.(config|rc|json|yaml|yml|toml)$/i)).slice(0, 15),
    entryPoints: files.filter((f) => f.match(/(main|index|app)\.(ts|tsx|js|jsx|py|go)$/)).slice(0, 10),
    componentCount: files.filter((f) => f.match(/\.(tsx|jsx)$/) && !f.includes("test") && !f.includes("spec")).length,
    hookCount: files.filter((f) => f.includes("use") && f.match(/\.(ts|tsx)$/)).length,
    serviceCount: files.filter((f) => f.includes("service") || f.includes("api") || f.includes("handler")).length,
    apiRoutes: files.filter((f) => f.includes("route") || f.includes("api/") || f.includes("endpoint")).length,
    duplicatePatterns: findDuplicatePatterns(files),
    deadCodeIndicators: files.filter((f) => f.includes("deprecated") || f.includes("old") || f.includes("backup") || f.includes(".bak")),
    securityFiles: files.filter((f) => f.includes("security") || f.includes("auth") || f.includes("oauth") || f.includes("jwt")),
  };
}

function findDuplicatePatterns(files: string[]): string[] {
  const nameCount = new Map<string, number>();
  for (const f of files) {
    const name = f.split("/").pop()?.split(".")[0] || "";
    if (name.length > 3) nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }
  return Array.from(nameCount.entries())
    .filter(([, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count} copies)`);
}

// ─── Dynamic Scoring Engine ─────────────────────────────────────────────────

function computeScores(
  tech: TechStack,
  structure: StructuralAnalysis,
  repoInfo: RepoInfo | null,
  urlType: string,
): {
  overall: number;
  codeQuality: number;
  architecture: number;
  performance: number;
  security: number;
  documentation: number;
  testing: number;
  devOps: number;
  maintainability: number;
  scalability: number;
} {
  // ── Code Quality (0-100) ──
  let codeQuality = 40; // Base
  if (structure.totalFiles > 50) codeQuality += 10;
  if (structure.totalFiles > 100) codeQuality += 5;
  if (tech.languages.includes("TypeScript")) codeQuality += 15;
  if (structure.componentCount > 5) codeQuality += 5;
  if (structure.duplicatePatterns.length === 0) codeQuality += 10;
  if (structure.duplicatePatterns.length > 3) codeQuality -= 10;
  if (structure.configFiles.length > 3) codeQuality += 5;

  // ── Architecture (0-100) ──
  let architecture = 35;
  if (structure.rootDirs.includes("src") || structure.rootDirs.includes("app")) architecture += 10;
  if (structure.rootDirs.includes("components")) architecture += 5;
  if (structure.rootDirs.includes("services") || structure.rootDirs.includes("lib")) architecture += 5;
  if (structure.rootDirs.includes("hooks")) architecture += 5;
  if (structure.rootDirs.includes("utils")) architecture += 3;
  if (structure.hasMonorepo) architecture += 10;
  if (structure.directoryDepth > 3) architecture += 5;
  if (structure.entryPoints.length > 0 && structure.entryPoints.length < 5) architecture += 5;
  if (tech.frameworks.length > 1) architecture += 5;

  // ── Performance (0-100) ──
  let performance = 45;
  if (tech.frameworks.includes("Next.js")) performance += 15;
  if (tech.frameworks.includes("Vite")) performance += 10;
  if (structure.hasDocker) performance += 5;
  if (tech.cloud.includes("Vercel/Netlify")) performance += 5;
  if (structure.totalFiles > 200) performance -= 5;

  // ── Security (0-100) ──
  let security = 35;
  if (structure.securityFiles.length > 0) security += 10;
  if (structure.hasEnvExample) security += 10;
  if (structure.hasGitignore) security += 5;
  if (tech.databases.length > 0) security += 5;
  if (tech.frameworks.includes("Django") || tech.frameworks.includes("Next.js")) security += 10;

  // ── Documentation (0-100) ──
  let documentation = 20;
  if (structure.hasReadme) documentation += 25;
  if (structure.hasDocumentation) documentation += 15;
  if (structure.hasLicense) documentation += 10;
  if (repoInfo?.description) documentation += 5;
  if (repoInfo?.topics && repoInfo.topics.length > 3) documentation += 5;
  if (structure.hasEnvExample) documentation += 5;

  // ── Testing (0-100) ──
  let testing = 15;
  if (structure.hasTests) testing += 30;
  if (tech.testing.length > 0) testing += 15;
  if (tech.testing.includes("Playwright") || tech.testing.includes("Cypress")) testing += 10;

  // ── DevOps (0-100) ──
  let devOps = 20;
  if (structure.hasCI) devOps += 25;
  if (structure.hasDocker) devOps += 15;
  if (tech.devops.length > 0) devOps += 10;
  if (tech.cloud.length > 0) devOps += 5;

  // ── Maintainability (0-100) ──
  let maintainability = 40;
  if (tech.languages.includes("TypeScript")) maintainability += 10;
  if (structure.duplicatePatterns.length === 0) maintainability += 10;
  if (structure.totalFiles < 150) maintainability += 5;
  if (structure.componentCount > 3 && structure.serviceCount > 0) maintainability += 5;

  // ── Scalability (0-100) ──
  let scalability = 30;
  if (structure.hasMonorepo) scalability += 15;
  if (tech.databases.length > 1) scalability += 10;
  if (tech.cloud.length > 0) scalability += 10;
  if (structure.serviceCount > 2) scalability += 5;

  // Clamp all scores
  const clamp = (v: number) => Math.max(10, Math.min(95, Math.round(v)));
  codeQuality = clamp(codeQuality);
  architecture = clamp(architecture);
  performance = clamp(performance);
  security = clamp(security);
  documentation = clamp(documentation);
  testing = clamp(testing);
  devOps = clamp(devOps);
  maintainability = clamp(maintainability);
  scalability = clamp(scalability);

  const overall = Math.round(
    codeQuality * 0.15 + architecture * 0.15 + performance * 0.12 + security * 0.12 +
    documentation * 0.1 + testing * 0.1 + devOps * 0.08 + maintainability * 0.1 + scalability * 0.08
  );

  return { overall: clamp(overall), codeQuality, architecture, performance, security, documentation, testing, devOps, maintainability, scalability };
}

// ─── Evidence Generator ─────────────────────────────────────────────────────

function generateEvidence(
  tech: TechStack,
  structure: StructuralAnalysis,
  scores: ReturnType<typeof computeScores>,
  repoInfo: RepoInfo | null,
): {
  strengths: string[];
  weaknesses: string[];
  evidence: Record<string, { positive: string[]; negative: string[] }>;
  quickWins: string[];
  longTermImprovements: string[];
  risks: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const evidence: Record<string, { positive: string[]; negative: string[] }> = {};
  const quickWins: string[] = [];
  const longTermImprovements: string[] = [];
  const risks: string[] = [];

  // ── Code Quality Evidence ──
  evidence.codeQuality = { positive: [], negative: [] };
  if (tech.languages.includes("TypeScript")) {
    evidence.codeQuality.positive.push("Uses TypeScript for type safety");
    strengths.push("TypeScript adoption ensures type safety");
  } else {
    evidence.codeQuality.negative.push("No TypeScript — relies on dynamic typing");
    weaknesses.push("JavaScript-only codebase lacks type safety");
    quickWins.push("Migrate to TypeScript for better code quality");
  }
  if (structure.duplicatePatterns.length > 0) {
    evidence.codeQuality.negative.push(`Duplicate patterns detected: ${structure.duplicatePatterns.join(", ")}`);
    weaknesses.push(`${structure.duplicatePatterns.length} potential code duplications found`);
    longTermImprovements.push("Refactor duplicate code into shared utilities");
  }

  // ── Architecture Evidence ──
  evidence.architecture = { positive: [], negative: [] };
  if (structure.rootDirs.includes("src") || structure.rootDirs.includes("app")) {
    evidence.architecture.positive.push("Standard source directory structure");
    strengths.push("Well-organized project structure");
  }
  if (structure.componentCount > 5) {
    evidence.architecture.positive.push(`${structure.componentCount} components identified`);
  }
  if (structure.serviceCount > 0) {
    evidence.architecture.positive.push(`${structure.serviceCount} service layers detected`);
  }
  if (!structure.hasMonorepo && structure.totalFiles > 200) {
    evidence.architecture.negative.push("Large codebase without monorepo structure");
    longTermImprovements.push("Consider migrating to monorepo for better separation");
  }

  // ── Performance Evidence ──
  evidence.performance = { positive: [], negative: [] };
  if (tech.frameworks.includes("Next.js")) {
    evidence.performance.positive.push("Server-side rendering with Next.js");
    strengths.push("SSR/SSG capability for optimal performance");
  }
  if (tech.frameworks.includes("Vite")) {
    evidence.performance.positive.push("Fast HMR with Vite bundler");
  }
  if (structure.totalFiles > 300) {
    evidence.performance.negative.push(`Large file count (${structure.totalFiles}) may impact build times`);
  }

  // ── Security Evidence ──
  evidence.security = { positive: [], negative: [] };
  if (structure.securityFiles.length > 0) {
    evidence.security.positive.push(`${structure.securityFiles.length} security-related files detected`);
    strengths.push("Security-conscious implementation");
  }
  if (structure.hasEnvExample) {
    evidence.security.positive.push("Environment variable template provided");
  }
  if (!structure.hasEnvExample) {
    evidence.security.negative.push("No .env.example — developers may hardcode secrets");
    quickWins.push("Add .env.example with documented environment variables");
  }

  // ── Documentation Evidence ──
  evidence.documentation = { positive: [], negative: [] };
  if (structure.hasReadme) {
    evidence.documentation.positive.push("README present");
  }
  if (!structure.hasReadme) {
    evidence.documentation.negative.push("No README found");
    quickWins.push("Write a comprehensive README with setup instructions");
  }
  if (!structure.hasLicense) {
    evidence.documentation.negative.push("No LICENSE file — legal status unclear");
  }

  // ── Testing Evidence ──
  evidence.testing = { positive: [], negative: [] };
  if (structure.hasTests) {
    evidence.testing.positive.push("Test files detected");
    strengths.push("Testing infrastructure in place");
  }
  if (!structure.hasTests) {
    evidence.testing.negative.push("No test files found");
    weaknesses.push("No automated testing");
    quickWins.push("Add unit tests for critical business logic");
  }
  if (tech.testing.length > 0) {
    evidence.testing.positive.push(`Testing frameworks: ${tech.testing.join(", ")}`);
  }

  // ── DevOps Evidence ──
  evidence.devOps = { positive: [], negative: [] };
  if (structure.hasCI) {
    evidence.devOps.positive.push("CI/CD pipeline configured");
    strengths.push("Automated CI/CD pipeline");
  }
  if (structure.hasDocker) {
    evidence.devOps.positive.push("Containerized with Docker");
  }
  if (!structure.hasCI) {
    evidence.devOps.negative.push("No CI/CD pipeline detected");
    quickWins.push("Set up GitHub Actions for automated testing and deployment");
  }

  // ── Risks ──
  if (structure.totalFiles < 10) risks.push("Very small codebase — may be incomplete");
  if (repoInfo?.openIssues && repoInfo.openIssues > 50) risks.push(`${repoInfo.openIssues} open issues indicate potential maintenance burden`);
  if (tech.databases.length === 0 && tech.frameworks.length > 0) risks.push("No database layer detected — may lack persistence");
  if (structure.duplicatePatterns.length > 3) risks.push("High code duplication increases maintenance cost");

  // ── Long-term improvements ──
  if (tech.testing.length === 0) longTermImprovements.push("Implement comprehensive test suite with E2E testing");
  if (tech.cloud.length === 0) longTermImprovements.push("Containerize application for consistent deployments");
  if (tech.devops.length === 0) longTermImprovements.push("Establish CI/CD pipeline with automated quality gates");
  longTermImprovements.push("Implement monitoring and observability stack");

  return { strengths, weaknesses, evidence, quickWins, longTermImprovements, risks };
}

// ─── Task Generator ─────────────────────────────────────────────────────────

function generateTasks(
  tech: TechStack,
  structure: StructuralAnalysis,
  evidence: ReturnType<typeof generateEvidence>,
): Array<{ title: string; description: string; priority: string; tags: string[]; estimatedHours: number }> {
  const tasks: Array<{ title: string; description: string; priority: string; tags: string[]; estimatedHours: number }> = [];

  if (!structure.hasTests) {
    tasks.push({ title: "Set up testing infrastructure", description: "Configure unit and integration testing with appropriate frameworks", priority: "high", tags: ["testing", "quality"], estimatedHours: 12 });
  }
  if (!structure.hasCI) {
    tasks.push({ title: "Configure CI/CD pipeline", description: "Set up automated build, test, and deployment workflows", priority: "high", tags: ["devops", "automation"], estimatedHours: 8 });
  }
  if (!structure.hasReadme) {
    tasks.push({ title: "Write project documentation", description: "Create comprehensive README with setup, usage, and contribution guidelines", priority: "medium", tags: ["documentation"], estimatedHours: 4 });
  }
  if (!structure.hasDocker) {
    tasks.push({ title: "Add Docker containerization", description: "Create Dockerfile and docker-compose for consistent environments", priority: "medium", tags: ["devops", "containerization"], estimatedHours: 6 });
  }
  if (!structure.hasEnvExample) {
    tasks.push({ title: "Create environment configuration template", description: "Document all required environment variables with .env.example", priority: "medium", tags: ["security", "documentation"], estimatedHours: 2 });
  }
  if (evidence.risks.length > 0) {
    tasks.push({ title: "Address identified risks", description: `Mitigate ${evidence.risks.length} identified risks: ${evidence.risks.slice(0, 2).join("; ")}`, priority: "high", tags: ["risk-management"], estimatedHours: 16 });
  }
  if (structure.duplicatePatterns.length > 0) {
    tasks.push({ title: "Refactor duplicate code", description: "Extract shared logic from duplicated patterns into reusable utilities", priority: "medium", tags: ["refactoring", "code-quality"], estimatedHours: 8 });
  }
  tasks.push({ title: "Performance audit", description: "Profile application performance and optimize critical paths", priority: "low", tags: ["performance"], estimatedHours: 6 });
  tasks.push({ title: "Security review", description: "Conduct security audit of authentication, input validation, and API endpoints", priority: "medium", tags: ["security"], estimatedHours: 8 });

  return tasks.slice(0, 10);
}

// ─── Gemini AI Analysis ─────────────────────────────────────────────────────

async function callGeminiAnalysis(apiKey: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Main Analysis Action ───────────────────────────────────────────────────

export const analyzeProject = action({
  args: {
    url: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const urlType = detectUrlType(args.url);
    const repoInfo = parseRepoUrl(args.url);

    let fetchedInfo: RepoInfo | null = null;
    let files: string[] = [];
    let readmeContent = "";

    // Stage 1 & 2: Fetch repository data based on provider
    if (repoInfo) {
      try {
        if (repoInfo.provider === "github") {
          fetchedInfo = await fetchGitHubRepo(repoInfo.owner, repoInfo.repo);
          files = await fetchGitHubTree(repoInfo.owner, repoInfo.repo, fetchedInfo.defaultBranch);
          readmeContent = await fetchGitHubFile(repoInfo.owner, repoInfo.repo, "README.md");
        } else if (repoInfo.provider === "gitlab") {
          fetchedInfo = await fetchGitLabRepo(repoInfo.owner, repoInfo.repo);
          files = await fetchGitLabTree(repoInfo.owner, repoInfo.repo, fetchedInfo.defaultBranch);
        }
      } catch (err) {
        console.error("Failed to fetch repo:", err);
      }
    }

    // Stage 3: Technology detection
    const technologies = detectTechnologies(files, readmeContent);

    // Stage 4: Structural analysis
    const structure = analyzeStructure(files);

    // Stage 5: Dynamic scoring (evidence-based, never static)
    const scores = computeScores(technologies, structure, fetchedInfo, urlType);

    // Stage 6: Generate evidence
    const evidenceData = generateEvidence(technologies, structure, scores, fetchedInfo);

    // Stage 7: Generate tasks
    const generatedTasks = generateTasks(technologies, structure, evidenceData);

    // Stage 8: AI-enhanced analysis (if Gemini available)
    const apiKey = process.env.GEMINI_API_KEY;
    let aiSummary = "";
    let aiProjectType = "Unknown";

    if (apiKey) {
      try {
        const fileSample = files.slice(0, 80).join("\n");
        const prompt = `You are an expert software architect analyzing a project. Based on the following data, provide a concise executive summary (2-3 sentences) and the most accurate project type classification.

PROJECT: ${fetchedInfo?.name || "Unknown"}
DESCRIPTION: ${fetchedInfo?.description || "No description"}
LANGUAGE: ${fetchedInfo?.language || "Unknown"}
STARS: ${fetchedInfo?.stars || 0}
FRAMEWORKS: ${technologies.frameworks.join(", ") || "None detected"}
DATABASES: ${technologies.databases.join(", ") || "None detected"}
AI/ML: ${technologies.ai.join(", ") || "None detected"}
TESTING: ${technologies.testing.join(", ") || "None detected"}
FILE COUNT: ${structure.totalFiles}
HAS TESTS: ${structure.hasTests}
HAS CI: ${structure.hasCI}
HAS DOCKER: ${structure.hasDocker}

FILE STRUCTURE (first 80 files):
${fileSample}

Respond with ONLY a JSON object:
{"summary": "your executive summary", "projectType": "one of: SaaS, AI Platform, CRM, Portfolio, Ecommerce, ERP, Project Management, Chatbot, Internal Tool, Library, Mobile App, API, Full-Stack App, Data Pipeline, DevOps Tool"}`;

        const geminiResponse = await callGeminiAnalysis(apiKey, prompt);
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiSummary = parsed.summary || "";
          aiProjectType = parsed.projectType || "Unknown";
        }
      } catch {
        // Fall through to defaults
      }
    }

    // Build fallback summary if AI didn't provide one
    if (!aiSummary) {
      const allTech = [...technologies.frameworks, ...technologies.languages].slice(0, 3).join("/");
      aiSummary = `${fetchedInfo?.name || "Imported project"} is a ${allTech || "software"} project${fetchedInfo?.description ? ` — ${fetchedInfo.description}` : ""}. Analyzed ${structure.totalFiles} files across ${structure.rootDirs.length} directories. Overall health score: ${scores.overall}/100.`;
    }

    if (aiProjectType === "Unknown") {
      aiProjectType = detectProjectType(fetchedInfo, technologies);
    }

    // Stage 9: Build and return complete result
    return {
      urlType,
      repoInfo: fetchedInfo
        ? {
            name: fetchedInfo.name,
            description: fetchedInfo.description,
            language: fetchedInfo.language,
            framework: technologies.frameworks[0] || undefined,
            stars: fetchedInfo.stars,
            forks: fetchedInfo.forks,
            readme: readmeContent.slice(0, 5000),
            fileStructure: files.slice(0, 500),
            dependencies: [],
            topics: fetchedInfo.topics,
            license: fetchedInfo.license,
            openIssues: fetchedInfo.openIssues,
            lastPush: fetchedInfo.lastPush,
          }
        : {
            name: new URL(args.url.startsWith("http") ? args.url : `https://${args.url}`).hostname.replace("www.", ""),
            description: `Imported from ${args.url}`,
            language: undefined,
            framework: undefined,
            stars: 0,
            forks: 0,
            readme: "",
            fileStructure: [],
            dependencies: [],
            topics: [],
            license: undefined,
            openIssues: 0,
            lastPush: undefined,
          },
      analysis: {
        projectType: aiProjectType,
        executiveSummary: aiSummary,
        keyFeatures: [
          `${structure.componentCount} components`,
          `${structure.totalFiles} total files`,
          `${technologies.frameworks.length} frameworks detected`,
          technologies.databases.length > 0 ? `${technologies.databases.join(", ")} database layer` : "No database detected",
        ],
        missingFeatures: [
          !structure.hasTests ? "Automated testing" : null,
          !structure.hasCI ? "CI/CD pipeline" : null,
          !structure.hasDocker ? "Containerization" : null,
          !structure.hasReadme ? "Documentation" : null,
        ].filter(Boolean) as string[],
        architecture: `${technologies.frameworks.length > 0 ? technologies.frameworks.join(" + ") : "Custom"} architecture${structure.hasMonorepo ? " (monorepo)" : ""}`,
        technologies,
        structure: {
          totalFiles: structure.totalFiles,
          directoryDepth: structure.directoryDepth,
          rootDirs: structure.rootDirs,
          componentCount: structure.componentCount,
          serviceCount: structure.serviceCount,
          configFiles: structure.configFiles.length,
        },
      },
      scores,
      evidence: evidenceData,
      recommendations: {
        immediate: evidenceData.quickWins,
        nextSprint: ["Implement error handling and logging", "Add performance monitoring", "Security audit and fixes"],
        futureRoadmap: evidenceData.longTermImprovements,
        strengths: evidenceData.strengths,
        weaknesses: evidenceData.weaknesses,
        risks: evidenceData.risks,
        riskLevel: scores.overall >= 70 ? "low" : scores.overall >= 45 ? "medium" : "high",
        developmentStage: structure.totalFiles > 200 ? "Production" : structure.totalFiles > 50 ? "Beta" : structure.totalFiles > 15 ? "MVP" : "Prototype",
        technicalDebt: scores.maintainability >= 70 ? "low" : scores.maintainability >= 45 ? "medium" : "high",
      },
      tasks: generatedTasks,
    };
  },
});

function detectProjectType(info: RepoInfo | null, tech: TechStack): string {
  if (tech.ai.length > 0) return "AI Platform";
  if (info?.description?.toLowerCase().includes("chat")) return "Chatbot";
  if (info?.description?.toLowerCase().includes("ecommerce") || info?.description?.toLowerCase().includes("shop")) return "Ecommerce";
  if (info?.description?.toLowerCase().includes("portfolio")) return "Portfolio";
  if (info?.description?.toLowerCase().includes("crm")) return "CRM";
  if (info?.description?.toLowerCase().includes("erp")) return "ERP";
  if (info?.description?.toLowerCase().includes("dashboard") || info?.description?.toLowerCase().includes("admin")) return "Internal Tool";
  if (tech.frameworks.includes("Next.js") || tech.frameworks.includes("React")) return "SaaS";
  if (tech.frameworks.length > 0 && tech.frameworks.some((f) => ["FastAPI", "Django", "Flask", "Express.js", "NestJS"].includes(f))) return "Full-Stack App";
  if (tech.frameworks.length === 0 && tech.languages.length > 0) return "Library";
  return "Software Project";
}

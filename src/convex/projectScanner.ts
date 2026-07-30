"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/** Detect URL type from a string */
function detectUrlType(url: string): "github" | "gitlab" | "bitbucket" | "vercel" | "netlify" | "npm" | "pypi" | "website" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.includes("github.com")) return "github";
  if (lower.includes("gitlab.com")) return "gitlab";
  if (lower.includes("bitbucket.org")) return "bitbucket";
  if (lower.includes("vercel.app") || lower.includes("vercel.com")) return "vercel";
  if (lower.includes("netlify.app") || lower.includes("netlify.com")) return "netlify";
  if (lower.includes("npmjs.com") || lower.includes("npm.io")) return "npm";
  if (lower.includes("pypi.org") || lower.includes("pypi.python")) return "pypi";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "website";
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(url.trim())) return "github"; // owner/repo shorthand
  return "unknown";
}

/** Parse GitHub/GitLab/Bitbucket owner and repo from URL */
function parseRepoUrl(url: string): { owner: string; repo: string; platform: string } | null {
  // GitHub
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubMatch) return { owner: githubMatch[1], repo: githubMatch[2].replace(/\.git$/, ""), platform: "github" };

  // GitLab
  const gitlabMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+)/);
  if (gitlabMatch) return { owner: gitlabMatch[1], repo: gitlabMatch[2].replace(/\.git$/, ""), platform: "gitlab" };

  // Bitbucket
  const bitbucketMatch = url.match(/bitbucket\.org\/([^/]+)\/([^/]+)/);
  if (bitbucketMatch) return { owner: bitbucketMatch[1], repo: bitbucketMatch[2].replace(/\.git$/, ""), platform: "bitbucket" };

  // owner/repo shorthand (assumes GitHub)
  const shorthandMatch = url.trim().match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/);
  if (shorthandMatch) return { owner: shorthandMatch[1], repo: shorthandMatch[2], platform: "github" };

  return null;
}

/** Validate and normalize any URL */
function validateAndNormalizeUrl(input: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, normalized: "", error: "URL is required" };

  // owner/repo shorthand
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: true, normalized: `https://github.com/${trimmed}` };
  }

  // Add protocol if missing
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    // Check if it's a domain-like string
    if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/.test(url)) {
      url = `https://${url}`;
    } else {
      return { valid: false, normalized: "", error: "Invalid URL format. Use https://example.com or owner/repo" };
    }
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return { valid: false, normalized: "", error: "Invalid hostname" };
    return { valid: true, normalized: url };
  } catch {
    return { valid: false, normalized: "", error: "Invalid URL format" };
  }
}

interface RepoInfo {
  name: string;
  description: string | undefined;
  language: string | undefined;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
  homepage?: string;
  license?: string;
  openIssues?: number;
  watchers?: number;
  size?: number;
}

/** Fetch GitHub repository info */
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
    stars: data.stargazers_count,
    forks: data.forks_count,
    topics: data.topics || [],
    defaultBranch: data.default_branch,
    homepage: data.homepage,
    license: data.license?.spdx_id,
    openIssues: data.open_issues_count,
    watchers: data.watchers_count,
    size: data.size,
  };
}

/** Fetch file tree from GitHub */
async function fetchGitHubTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tree || []).slice(0, 300).map((f: { path: string }) => f.path);
}

/** Fetch a file's content from GitHub */
async function fetchGitHubFile(owner: string, repo: string, path: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  if (data.content) return Buffer.from(data.content, "base64").toString("utf-8");
  return "";
}

/** Analyze file structure to detect technologies */
function detectTechnologies(files: string[]): { frontend: string[]; backend: string[]; database: string[]; cloud: string[]; ai: string[]; devops: string[]; languages: string[] } {
  const frontend: string[] = [];
  const backend: string[] = [];
  const database: string[] = [];
  const cloud: string[] = [];
  const ai: string[] = [];
  const devops: string[] = [];
  const languages: string[] = [];

  const allFiles = files.join(" ").toLowerCase();
  const allNames = files.map((f) => f.split("/").pop() || "").join(" ").toLowerCase();
  const fileExtensions = files.map(f => f.split(".").pop()?.toLowerCase() || "");

  // Language detection from file extensions
  const extCount: Record<string, number> = {};
  for (const ext of fileExtensions) {
    if (ext && ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "rb", "php", "cs", "cpp", "c", "swift", "kt"].includes(ext)) {
      extCount[ext] = (extCount[ext] || 0) + 1;
    }
  }
  if (extCount["ts"] || extCount["tsx"]) languages.push("TypeScript");
  if (extCount["js"] || extCount["jsx"]) languages.push("JavaScript");
  if (extCount["py"]) languages.push("Python");
  if (extCount["go"]) languages.push("Go");
  if (extCount["rs"]) languages.push("Rust");
  if (extCount["java"]) languages.push("Java");
  if (extCount["rb"]) languages.push("Ruby");
  if (extCount["php"]) languages.push("PHP");

  // Frontend frameworks
  if (allFiles.includes("package.json")) {
    if (allNames.includes("next.config") || allFiles.includes("app/page") || allFiles.includes("app/layout")) frontend.push("Next.js");
    if (allNames.includes("vite.config") || allFiles.includes("src/main.tsx")) frontend.push("Vite");
    if (allFiles.includes("src/") && (allFiles.includes(".tsx") || allFiles.includes(".jsx"))) frontend.push("React");
    if (allFiles.includes("nuxt.config") || allFiles.includes("pages/")) frontend.push("Nuxt.js");
    if (allNames.includes("angular.json") || allFiles.includes("app.module")) frontend.push("Angular");
    if (allNames.includes("vue.config") || allFiles.includes("src/App.vue")) frontend.push("Vue.js");
    if (allFiles.includes("svelte.config") || allFiles.includes(".svelte")) frontend.push("Svelte");
    if (allFiles.includes("tailwind.config") || allFiles.includes("tailwindcss")) frontend.push("Tailwind CSS");
    if (allFiles.includes("src/index.css") || allFiles.includes("globals.css")) frontend.push("CSS");
    if (allFiles.includes("src/styles/") || allFiles.includes("scss")) frontend.push("SCSS");
    if (allFiles.includes("@chakra-ui") || allFiles.includes("chakra")) frontend.push("Chakra UI");
    if (allFiles.includes("@mui/") || allFiles.includes("material-ui")) frontend.push("Material UI");
    if (allFiles.includes("antd")) frontend.push("Ant Design");
  }

  // Backend frameworks
  if (allFiles.includes("requirements.txt") || allFiles.includes("pyproject.toml") || allFiles.includes("Pipfile")) {
    if (allFiles.includes("manage.py") || allFiles.includes("settings.py")) backend.push("Django");
    if (allFiles.includes("main.py") && (allFiles.includes("fastapi") || allNames.includes("uvicorn"))) backend.push("FastAPI");
    if (allFiles.includes("app.py") || allFiles.includes("wsgi.py")) backend.push("Flask");
    if (allFiles.includes("celery")) backend.push("Celery");
  }
  if (allNames.includes("server.") || allNames.includes("app.") || allFiles.includes("routes/")) {
    if (allNames.includes("express") || allFiles.includes("middleware/")) backend.push("Express.js");
    if (allNames.includes("nest-cli") || allFiles.includes("src/*.module.ts")) backend.push("NestJS");
  }
  if (allFiles.includes("go.mod")) backend.push("Go");
  if (allFiles.includes("Cargo.toml")) backend.push("Rust");
  if (allFiles.includes("pom.xml") || allFiles.includes("build.gradle")) backend.push("Spring Boot");
  if (allFiles.includes("gemfile") || allFiles.includes("config.ru")) backend.push("Ruby on Rails");
  if (allFiles.includes("composer.json")) backend.push("Laravel");
  if (allFiles.includes("*.csproj") || allFiles.includes("*.sln")) backend.push("ASP.NET");

  // Database
  if (allFiles.includes("prisma/") || allFiles.includes("schema.prisma")) database.push("Prisma");
  if (allFiles.includes("drizzle/") || allFiles.includes("drizzle.config")) database.push("Drizzle");
  if (allFiles.includes("knexfile") || allFiles.includes("migrations/")) database.push("Knex.js");
  if (allNames.includes("docker-compose") && (allFiles.includes("postgres") || allFiles.includes("mysql"))) database.push("SQL Database");
  if (allFiles.includes("mongodb") || allFiles.includes("mongoose")) database.push("MongoDB");
  if (allFiles.includes("redis")) database.push("Redis");
  if (allFiles.includes("convex/")) database.push("Convex");
  if (allFiles.includes("firebase") || allFiles.includes("firestore")) database.push("Firebase");
  if (allFiles.includes("supabase")) database.push("Supabase");
  if (allFiles.includes("planetscale") || allFiles.includes("mysql")) database.push("MySQL");
  if (allFiles.includes("postgres") || allFiles.includes("postgresql")) database.push("PostgreSQL");
  if (allFiles.includes("sqlite")) database.push("SQLite");

  // Cloud & Infrastructure
  if (allFiles.includes("dockerfile") || allFiles.includes("docker-compose")) cloud.push("Docker");
  if (allFiles.includes("vercel.json") || allFiles.includes("netlify.toml")) cloud.push("Vercel/Netlify");
  if (allFiles.includes("aws") || allFiles.includes("samconfig")) cloud.push("AWS");
  if (allFiles.includes("cloudbuild") || allFiles.includes("app.yaml")) cloud.push("GCP");
  if (allFiles.includes(".github/workflows")) devops.push("GitHub Actions");
  if (allFiles.includes(".gitlab-ci")) devops.push("GitLab CI");
  if (allFiles.includes("jenkinsfile")) devops.push("Jenkins");
  if (allFiles.includes("terraform") || allFiles.includes(".tf")) devops.push("Terraform");
  if (allFiles.includes("kubernetes") || allFiles.includes("k8s")) devops.push("Kubernetes");
  if (allFiles.includes("helm")) devops.push("Helm");

  // AI/ML
  if (allFiles.includes("openai") || allFiles.includes("gpt")) ai.push("OpenAI");
  if (allFiles.includes("gemini") || allFiles.includes("google.ai")) ai.push("Gemini");
  if (allFiles.includes("anthropic") || allFiles.includes("claude")) ai.push("Claude");
  if (allFiles.includes("langchain") || allFiles.includes("llamaindex")) ai.push("LangChain");
  if (allFiles.includes("tensorflow") || allFiles.includes(".pb")) ai.push("TensorFlow");
  if (allFiles.includes("pytorch") || allFiles.includes("torch")) ai.push("PyTorch");
  if (allFiles.includes("huggingface") || allFiles.includes("transformers")) ai.push("Hugging Face");
  if (allFiles.includes("opencv")) ai.push("OpenCV");
  if (allFiles.includes("sklearn") || allFiles.includes("scikit")) ai.push("Scikit-learn");

  return { frontend, backend, database, cloud, ai, devops, languages };
}

/** Calculate project metrics from file structure */
function calculateProjectMetrics(files: string[], technologies: ReturnType<typeof detectTechnologies>) {
  const totalFiles = files.length;
  const sourceFiles = files.filter(f => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".py") || f.endsWith(".go") || f.endsWith(".rs"));
  const testFiles = files.filter(f => f.includes("test") || f.includes("spec") || f.includes("__tests__"));
  const configFiles = files.filter(f => f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml") || f.endsWith(".toml") || f.endsWith(".config"));
  const docFiles = files.filter(f => f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".rst"));

  const hasCI = technologies.devops.length > 0;
  const hasDocker = technologies.cloud.some(t => t.includes("Docker"));
  const hasTests = testFiles.length > 0;
  const hasDocs = docFiles.length > 0;
  const hasReadme = files.some(f => f.toLowerCase().includes("readme"));

  return {
    totalFiles,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    configFiles: configFiles.length,
    docFiles: docFiles.length,
    testRatio: sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0,
    docRatio: totalFiles > 0 ? docFiles.length / totalFiles : 0,
    hasCI,
    hasDocker,
    hasTests,
    hasDocs,
    hasReadme,
    complexity: Math.min(100, Math.round((sourceFiles.length / 10) + (technologies.backend.length * 5) + (technologies.frontend.length * 3))),
    maturity: totalFiles > 100 ? "Production" : totalFiles > 30 ? "Beta" : totalFiles > 10 ? "MVP" : "Prototype",
  };
}

/** Call Gemini for project analysis */
async function callGeminiAnalysis(apiKey: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/** Main analysis action — fetches repo data, analyzes with Gemini, returns structured results */
export const analyzeProject = action({
  args: {
    url: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Validate and normalize URL
    const urlValidation = validateAndNormalizeUrl(args.url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || "Invalid URL");
    }

    const normalizedUrl = urlValidation.normalized;
    const urlType = detectUrlType(normalizedUrl);
    const repoInfo = parseRepoUrl(normalizedUrl);

    let fetchedInfo: RepoInfo | null = null;
    let files: string[] = [];
    let readmeContent = "";
    let technologies = { frontend: [] as string[], backend: [] as string[], database: [] as string[], cloud: [] as string[], ai: [] as string[], devops: [] as string[], languages: [] as string[] };

    // Stage 1 & 2: Fetch repository data based on URL type
    if (repoInfo) {
      try {
        if (repoInfo.platform === "github") {
          fetchedInfo = await fetchGitHubRepo(repoInfo.owner, repoInfo.repo);
          files = await fetchGitHubTree(repoInfo.owner, repoInfo.repo, fetchedInfo.defaultBranch);
          readmeContent = await fetchGitHubFile(repoInfo.owner, repoInfo.repo, "README.md");
        }
        // Note: GitLab and Bitbucket would need similar fetch functions
        technologies = detectTechnologies(files);
      } catch (err) {
        console.error("Failed to fetch repo:", err);
        // Continue with partial data
      }
    } else if (urlType === "website" || urlType === "vercel" || urlType === "netlify") {
      // For websites, try to fetch the page content
      try {
        const response = await fetch(normalizedUrl, {
          method: "GET",
          headers: { "User-Agent": "KORTEX-AI-Scanner/1.0" },
        });
        if (response.ok) {
          const html = await response.text();
          // Extract basic info from HTML
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

          fetchedInfo = {
            name: titleMatch?.[1]?.trim() || new URL(normalizedUrl).hostname,
            description: descMatch?.[1]?.trim() || `Website at ${new URL(normalizedUrl).hostname}`,
            language: undefined,
            stars: 0,
            forks: 0,
            topics: [],
            defaultBranch: "main",
          };
        }
      } catch (err) {
        console.error("Failed to fetch website:", err);
      }
    }

    // Calculate project metrics
    const metrics = calculateProjectMetrics(files, technologies);

    const apiKey = process.env.GEMINI_API_KEY;

    // Stage 4 & 5: AI Analysis (if Gemini available, otherwise generate smart defaults)
    let analysisResult: {
      analysis: { projectType: string; executiveSummary: string; keyFeatures: string[]; missingFeatures: string[]; architecture: string };
      scores: { overall: number; codeQuality: number; uiUx: number; performance: number; security: number; documentation: number; aiReadiness: number; devOps: number; productQuality: number };
      recommendations: { immediate: string[]; nextSprint: string[]; futureRoadmap: string[]; strengths: string[]; weaknesses: string[]; riskLevel: string; developmentStage: string; technicalDebt: string };
      tasks: Array<{ title: string; description: string; priority: string; tags: string[]; estimatedHours: number }>;
    };

    if (apiKey) {
      const fileStructureSample = files.slice(0, 150).join("\n");
      const prompt = `You are an expert AI software architect and technical project manager analyzing a project. Provide a comprehensive analysis in VALID JSON format only (no markdown, no code blocks).

PROJECT: ${fetchedInfo?.name || "Unknown"}
DESCRIPTION: ${fetchedInfo?.description || "No description"}
LANGUAGE: ${fetchedInfo?.language || technologies.languages.join(", ") || "Unknown"}
STARS: ${fetchedInfo?.stars || 0}
FILE STRUCTURE (first 150 files):
${fileStructureSample}

README (first 3000 chars):
${readmeContent.slice(0, 3000)}

DETECTED TECHNOLOGIES:
Frontend: ${technologies.frontend.join(", ") || "None detected"}
Backend: ${technologies.backend.join(", ") || "None detected"}
Database: ${technologies.database.join(", ") || "None detected"}
Cloud: ${technologies.cloud.join(", ") || "None detected"}
AI/ML: ${technologies.ai.join(", ") || "None detected"}
DevOps: ${technologies.devops.join(", ") || "None detected"}
Languages: ${technologies.languages.join(", ") || "None detected"}

PROJECT METRICS:
Total Files: ${metrics.totalFiles}
Source Files: ${metrics.sourceFiles}
Test Files: ${metrics.testFiles}
Test Ratio: ${(metrics.testRatio * 100).toFixed(1)}%
Has CI/CD: ${metrics.hasCI}
Has Docker: ${metrics.hasDocker}
Has Tests: ${metrics.hasTests}
Has Documentation: ${metrics.hasDocs}

Respond with this exact JSON structure:
{
  "analysis": {
    "projectType": "one of: SaaS, AI Platform, CRM, Portfolio, Ecommerce, ERP, Project Management, Chatbot, Internal Tool, Library, Mobile App, API, Data Pipeline, DevOps Tool",
    "executiveSummary": "2-3 sentence summary of what this project does, its purpose, and key technical characteristics",
    "keyFeatures": ["feature1", "feature2", "feature3", "feature4"],
    "missingFeatures": ["missing1", "missing2", "missing3"],
    "architecture": "Description of the architecture pattern (MVC, microservices, monolith, serverless, etc.) with specific details"
  },
  "scores": {
    "overall": 75,
    "codeQuality": 70,
    "uiUx": 80,
    "performance": 75,
    "security": 65,
    "documentation": 60,
    "aiReadiness": 50,
    "devOps": 70,
    "productQuality": 75
  },
  "recommendations": {
    "immediate": ["critical fix 1", "critical fix 2"],
    "nextSprint": ["improvement 1", "improvement 2"],
    "futureRoadmap": ["strategic goal 1", "strategic goal 2"],
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "riskLevel": "low or medium or high",
    "developmentStage": "Prototype or MVP or Beta or Production or Enterprise Ready",
    "technicalDebt": "low or medium or high"
  },
  "tasks": [
    {"title": "Set up CI/CD pipeline", "description": "Configure automated testing and deployment with GitHub Actions", "priority": "high", "tags": ["devops", "automation"], "estimatedHours": 8},
    {"title": "Add input validation", "description": "Implement comprehensive form validation across all user inputs", "priority": "medium", "tags": ["security", "ux"], "estimatedHours": 4},
    {"title": "Write unit tests", "description": "Add unit tests for core business logic with 80% coverage target", "priority": "high", "tags": ["testing", "quality"], "estimatedHours": 16}
  ]
}`;

      try {
        const geminiResponse = await callGeminiAnalysis(apiKey, prompt);
        // Extract JSON from response (may have markdown code blocks)
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          // Validate and sanitize scores
          for (const key of Object.keys(analysisResult.scores)) {
            const val = (analysisResult.scores as Record<string, number>)[key];
            if (typeof val !== "number" || val < 0 || val > 100) {
              (analysisResult.scores as Record<string, number>)[key] = 70;
            }
          }
        } else {
          throw new Error("No JSON in response");
        }
      } catch (err) {
        console.error("Gemini analysis failed, using defaults:", err);
        analysisResult = generateDefaultAnalysis(fetchedInfo, files, technologies, metrics);
      }
    } else {
      analysisResult = generateDefaultAnalysis(fetchedInfo, files, technologies, metrics);
    }

    // Build the final result with comprehensive data
    return {
      urlType,
      url: normalizedUrl,
      repoInfo: fetchedInfo
        ? {
          name: fetchedInfo.name,
          description: fetchedInfo.description,
          language: fetchedInfo.language || technologies.languages[0],
          framework: technologies.frontend[0] || technologies.backend[0] || undefined,
          stars: fetchedInfo.stars,
          forks: fetchedInfo.forks,
          readme: readmeContent.slice(0, 5000),
          fileStructure: files.slice(0, 200),
          dependencies: [],
          topics: fetchedInfo.topics,
          homepage: fetchedInfo.homepage,
          license: fetchedInfo.license,
          openIssues: fetchedInfo.openIssues,
        }
        : {
          name: (() => {
            try {
              return new URL(normalizedUrl).hostname.replace("www.", "");
            } catch {
              return "Imported Project";
            }
          })(),
          description: `Imported from ${normalizedUrl}`,
          language: undefined,
          framework: undefined,
          stars: 0,
          forks: 0,
          readme: "",
          fileStructure: [],
          dependencies: [],
          topics: [],
        },
      technologies: {
        frontend: technologies.frontend,
        backend: technologies.backend,
        database: technologies.database,
        cloud: technologies.cloud,
        ai: technologies.ai,
        devops: technologies.devops,
        languages: technologies.languages,
      },
      metrics,
      analysis: analysisResult.analysis,
      scores: analysisResult.scores,
      recommendations: analysisResult.recommendations,
      tasks: analysisResult.tasks,
      timestamp: Date.now(),
    };
  },
});

/** Generate sensible default analysis when Gemini is unavailable */
function generateDefaultAnalysis(
  fetchedInfo: RepoInfo | null,
  files: string[],
  technologies: ReturnType<typeof detectTechnologies>,
  metrics: ReturnType<typeof calculateProjectMetrics>
) {
  const name = fetchedInfo?.name || "Imported Project";
  const lang = fetchedInfo?.language || technologies.languages[0] || "Unknown";
  const fileCount = files.length;
  const { hasReadme, hasDocker, hasCI, hasTests, testRatio, complexity } = metrics;

  // Compute scores based on comprehensive heuristics
  const codeQuality = Math.min(95, 45 +
    (fileCount > 10 ? 10 : 0) +
    (technologies.frontend.length > 0 || technologies.backend.length > 0 ? 10 : 0) +
    (hasTests ? 15 : 0) +
    (testRatio > 0.1 ? 10 : 0) +
    (fetchedInfo?.stars && fetchedInfo.stars > 10 ? 5 : 0) +
    (complexity > 50 ? 5 : 0)
  );

  const uiUx = technologies.frontend.length > 0
    ? Math.min(90, 50 +
      (technologies.frontend.includes("Tailwind CSS") ? 15 : 0) +
      (technologies.frontend.includes("React") || technologies.frontend.includes("Next.js") ? 10 : 0) +
      (technologies.frontend.some(t => t.includes("UI")) ? 10 : 0) +
      5
    )
    : 35;

  const performance = Math.min(90, 50 +
    (technologies.frontend.includes("Next.js") ? 15 : 0) +
    (hasDocker ? 10 : 0) +
    (technologies.backend.includes("FastAPI") || technologies.backend.includes("Express.js") ? 10 : 0) +
    5
  );

  const security = Math.min(90, 40 +
    (technologies.database.length > 0 ? 15 : 0) +
    (hasDocker ? 10 : 0) +
    (technologies.backend.some(t => t.includes("Auth") || t.includes("Express")) ? 10 : 0) +
    10
  );

  const documentation = hasReadme
    ? Math.min(85, 50 + (fileCount > 20 ? 15 : 0) + (metrics.docFiles > 2 ? 10 : 0) + 10)
    : 30;

  const aiReadiness = technologies.ai.length > 0
    ? Math.min(90, 60 + technologies.ai.length * 5)
    : 25;

  const devOps = Math.min(90, 35 +
    (hasDocker ? 20 : 0) +
    (hasCI ? 20 : 0) +
    (technologies.devops.length > 0 ? 10 : 0) +
    5
  );

  const productQuality = Math.round((codeQuality + uiUx + performance + security) / 4);
  const overall = Math.round(
    codeQuality * 0.20 +
    uiUx * 0.15 +
    performance * 0.15 +
    security * 0.15 +
    documentation * 0.10 +
    aiReadiness * 0.10 +
    devOps * 0.10 +
    productQuality * 0.05
  );

  const allTech = [...technologies.frontend, ...technologies.backend, ...technologies.database];
  const devStage = fileCount > 100 ? "Production" : fileCount > 30 ? "Beta" : fileCount > 10 ? "MVP" : "Prototype";

  // Generate intelligent recommendations based on actual gaps
  const immediate: string[] = [];
  if (!hasTests) immediate.push("Add unit and integration tests for core functionality");
  if (!hasCI) immediate.push("Set up CI/CD pipeline with automated testing");
  if (!hasDocker) immediate.push("Add Docker containerization for consistent deployments");
  if (documentation < 50) immediate.push("Improve documentation and API docs");
  if (immediate.length === 0) immediate.push("Review and optimize existing code patterns");

  const nextSprint: string[] = [];
  if (security < 70) nextSprint.push("Conduct security audit and fix vulnerabilities");
  if (performance < 70) nextSprint.push("Implement performance monitoring and optimization");
  nextSprint.push("Refactor complex code areas");
  nextSprint.push("Add comprehensive error handling");

  const futureRoadmap: string[] = [];
  if (aiReadiness < 50) futureRoadmap.push("Evaluate AI/ML integration opportunities");
  futureRoadmap.push("Implement analytics and monitoring dashboard");
  futureRoadmap.push("Scale infrastructure for growth");
  futureRoadmap.push("Add multi-tenancy and enterprise features");

  // Detect strengths and weaknesses
  const strengths: string[] = [];
  if (allTech.length > 0) strengths.push(`Modern tech stack (${allTech.slice(0, 3).join(", ")})`);
  if (fileCount > 20) strengths.push("Well-structured codebase with clear organization");
  if (hasTests) strengths.push("Includes automated testing");
  if (hasCI) strengths.push("CI/CD pipeline configured");
  if (hasDocker) strengths.push("Containerized deployment ready");
  if (fetchedInfo?.stars && fetchedInfo.stars > 5) strengths.push("Community interest and adoption");
  if (strengths.length === 0) strengths.push("Solid foundation for development");

  const weaknesses: string[] = [];
  if (!hasTests) weaknesses.push("Lack of automated test coverage");
  if (!hasCI) weaknesses.push("No CI/CD pipeline for automated deployments");
  if (!hasDocker) weaknesses.push("No containerization for consistent environments");
  if (documentation < 50) weaknesses.push("Insufficient documentation");
  if (complexity > 70) weaknesses.push("High code complexity in some areas");
  if (weaknesses.length === 0) weaknesses.push("Minor areas for improvement identified");

  return {
    analysis: {
      projectType: detectProjectType(fetchedInfo, technologies),
      executiveSummary: `${name} is a ${allTech.join("/") || "software"} project${fetchedInfo?.description ? ` — ${fetchedInfo.description}` : ""}. The codebase contains ${fileCount} files with ${lang !== "Unknown" ? lang + " as the primary language" : "multiple languages"}. ${hasTests ? "Includes automated testing." : "Testing infrastructure could be improved."} ${hasCI ? "CI/CD pipeline is configured." : "No CI/CD pipeline detected."}`,
      keyFeatures: [
        "Core application functionality",
        technologies.frontend.length > 0 ? "Frontend user interface" : "Backend services",
        technologies.database.length > 0 ? "Data persistence layer" : "API endpoints",
        hasDocker ? "Containerized deployment" : "Standard build pipeline",
        technologies.ai.length > 0 ? "AI/ML integration" : null,
      ].filter(Boolean) as string[],
      missingFeatures: [
        !hasTests ? "Comprehensive test suite" : null,
        !hasCI ? "CI/CD pipeline" : null,
        !hasDocker ? "Containerization (Docker)" : null,
        !hasReadme ? "Project documentation" : null,
        aiReadiness < 40 ? "AI/ML capabilities" : null,
      ].filter(Boolean) as string[],
      architecture: technologies.backend.length > 0 && technologies.frontend.length > 0
        ? "Full-stack architecture with separated frontend and backend services"
        : technologies.frontend.length > 0
          ? "Frontend application architecture"
          : technologies.backend.length > 0
            ? "Backend service architecture"
            : "Standard application architecture",
    },
    scores: { overall, codeQuality, uiUx, performance, security, documentation, aiReadiness, devOps, productQuality },
    recommendations: {
      immediate,
      nextSprint,
      futureRoadmap,
      strengths,
      weaknesses,
      riskLevel: overall >= 75 ? "low" : overall >= 50 ? "medium" : "high",
      developmentStage: devStage,
      technicalDebt: overall >= 70 ? "low" : overall >= 45 ? "medium" : "high",
    },
    tasks: generateIntelligentTasks(technologies, metrics, weaknesses),
  };
}

/** Generate intelligent tasks based on project analysis */
function generateIntelligentTasks(
  technologies: ReturnType<typeof detectTechnologies>,
  metrics: ReturnType<typeof calculateProjectMetrics>,
  weaknesses: string[]
) {
  const tasks: Array<{ title: string; description: string; priority: string; tags: string[]; estimatedHours: number }> = [];

  // High priority tasks based on weaknesses
  if (!metrics.hasTests) {
    tasks.push({
      title: "Add comprehensive test suite",
      description: "Write unit tests for core business logic, integration tests for API endpoints, and end-to-end tests for critical user flows",
      priority: "high",
      tags: ["testing", "quality", "automation"],
      estimatedHours: 24,
    });
  }

  if (!metrics.hasCI) {
    tasks.push({
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions or GitLab CI for automated testing, building, and deployment",
      priority: "high",
      tags: ["devops", "automation", "deployment"],
      estimatedHours: 8,
    });
  }

  // Security tasks
  tasks.push({
    title: "Security audit and hardening",
    description: "Review authentication, input validation, API security, and implement security best practices",
    priority: "high",
    tags: ["security", "audit"],
    estimatedHours: 12,
  });

  // Documentation
  if (!metrics.hasReadme || metrics.docFiles < 2) {
    tasks.push({
      title: "Improve documentation",
      description: "Update README with setup instructions, API documentation, and architecture overview",
      priority: "medium",
      tags: ["documentation"],
      estimatedHours: 6,
    });
  }

  // Performance optimization
  tasks.push({
    title: "Performance optimization",
    description: "Profile application, optimize critical paths, implement caching strategies",
    priority: "medium",
    tags: ["performance", "optimization"],
    estimatedHours: 10,
  });

  // Code quality
  tasks.push({
    title: "Code review and refactoring",
    description: "Review codebase for anti-patterns, refactor complex areas, improve code maintainability",
    priority: "medium",
    tags: ["code-quality", "refactoring"],
    estimatedHours: 16,
  });

  // Docker (if missing)
  if (!metrics.hasDocker) {
    tasks.push({
      title: "Add Docker containerization",
      description: "Create Dockerfile and docker-compose.yml for consistent development and deployment environments",
      priority: "medium",
      tags: ["devops", "docker", "deployment"],
      estimatedHours: 6,
    });
  }

  // AI integration (if not present)
  if (technologies.ai.length === 0) {
    tasks.push({
      title: "Evaluate AI integration opportunities",
      description: "Research and prototype AI/ML features that could enhance the product",
      priority: "low",
      tags: ["ai", "innovation"],
      estimatedHours: 8,
    });
  }

  return tasks;
}

function detectProjectType(info: RepoInfo | null, tech: { frontend: string[]; backend: string[]; ai: string[] }): string {
  if (tech.ai.length > 0) return "AI Platform";
  if (info?.description?.toLowerCase().includes("chat")) return "Chatbot";
  if (info?.description?.toLowerCase().includes("ecommerce") || info?.description?.toLowerCase().includes("shop")) return "Ecommerce";
  if (info?.description?.toLowerCase().includes("portfolio")) return "Portfolio";
  if (info?.description?.toLowerCase().includes("crm")) return "CRM";
  if (info?.description?.toLowerCase().includes("erp")) return "ERP";
  if (info?.description?.toLowerCase().includes("dashboard") || info?.description?.toLowerCase().includes("admin")) return "Internal Tool";
  if (tech.frontend.includes("Next.js") || tech.frontend.includes("React")) return "SaaS";
  if (tech.backend.length > 0 && tech.frontend.length === 0) return "API";
  return "Library";
}

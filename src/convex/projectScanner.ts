"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/** Detect URL type from a string */
function detectUrlType(url: string): "github" | "gitlab" | "bitbucket" | "vercel" | "netlify" | "website" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.includes("github.com")) return "github";
  if (lower.includes("gitlab.com")) return "gitlab";
  if (lower.includes("bitbucket.org")) return "bitbucket";
  if (lower.includes("vercel.app") || lower.includes("vercel.com")) return "vercel";
  if (lower.includes("netlify.app") || lower.includes("netlify.com")) return "netlify";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "website";
  return "unknown";
}

/** Parse GitHub/GitLab owner and repo from URL */
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^/]+)\/([^/]+)/);
  if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  return null;
}

interface RepoInfo {
  name: string;
  description: string | undefined;
  language: string | undefined;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
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
  };
}

/** Fetch file tree from GitHub */
async function fetchGitHubTree(owner: string, repo: string, branch: string): Promise<string[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tree || []).slice(0, 200).map((f: { path: string }) => f.path);
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
function detectTechnologies(files: string[]): { frontend: string[]; backend: string[]; database: string[]; cloud: string[]; ai: string[] } {
  const frontend: string[] = [];
  const backend: string[] = [];
  const database: string[] = [];
  const cloud: string[] = [];
  const ai: string[] = [];

  const allFiles = files.join(" ").toLowerCase();
  const allNames = files.map((f) => f.split("/").pop() || "").join(" ").toLowerCase();

  // Frontend
  if (allFiles.includes("package.json") && (allFiles.includes("src/") || allFiles.includes("app/"))) {
    if (allNames.includes("next.config") || allFiles.includes("pages/") || allFiles.includes("app/page")) frontend.push("Next.js");
    if (allNames.includes("vite.config") || allFiles.includes("src/main.tsx")) frontend.push("Vite");
    if (allFiles.includes("src/") && (allFiles.includes(".tsx") || allFiles.includes(".jsx"))) frontend.push("React");
    if (allFiles.includes("nuxt.config") || allFiles.includes("pages/")) frontend.push("Nuxt.js");
    if (allNames.includes("angular.json") || allFiles.includes("app.module")) frontend.push("Angular");
    if (allNames.includes("vue.config") || allFiles.includes("src/App.vue")) frontend.push("Vue.js");
    if (allFiles.includes("svelte.config") || allFiles.includes(".svelte")) frontend.push("Svelte");
    if (allFiles.includes("tailwind.config") || allFiles.includes("tailwindcss")) frontend.push("Tailwind CSS");
    if (allFiles.includes("src/index.css") || allFiles.includes("globals.css")) frontend.push("CSS");
  }

  // Backend
  if (allFiles.includes("requirements.txt") || allFiles.includes("pyproject.toml") || allFiles.includes("Pipfile")) {
    if (allFiles.includes("manage.py") || allFiles.includes("settings.py")) backend.push("Django");
    if (allFiles.includes("main.py") && (allFiles.includes("fastapi") || allNames.includes("uvicorn"))) backend.push("FastAPI");
    if (allFiles.includes("app.py") || allFiles.includes("wsgi.py")) backend.push("Flask");
  }
  if (allNames.includes("server.") || allNames.includes("app.") || allFiles.includes("routes/")) {
    if (allNames.includes("express") || allFiles.includes("middleware/")) backend.push("Express.js");
    if (allNames.includes("nest-cli") || allFiles.includes("src/*.module.ts")) backend.push("NestJS");
  }
  if (allFiles.includes("go.mod")) backend.push("Go");
  if (allFiles.includes("Cargo.toml")) backend.push("Rust");
  if (allFiles.includes("pom.xml") || allFiles.includes("build.gradle")) backend.push("Spring Boot");

  // Database
  if (allFiles.includes("prisma/") || allFiles.includes("schema.prisma")) database.push("Prisma");
  if (allFiles.includes("drizzle/") || allFiles.includes("drizzle.config")) database.push("Drizzle");
  if (allFiles.includes("knexfile") || allFiles.includes("migrations/")) database.push("Knex.js");
  if (allNames.includes("docker-compose") && (allFiles.includes("postgres") || allFiles.includes("mysql"))) database.push("SQL Database");
  if (allFiles.includes("mongodb") || allFiles.includes("mongoose")) database.push("MongoDB");
  if (allFiles.includes("redis")) database.push("Redis");
  if (allFiles.includes("convex/")) database.push("Convex");
  if (allFiles.includes("firebase") || allFiles.includes("firestore")) database.push("Firebase");

  // Cloud
  if (allFiles.includes("dockerfile") || allFiles.includes("docker-compose")) cloud.push("Docker");
  if (allFiles.includes("vercel.json") || allFiles.includes("netlify.toml")) cloud.push("Vercel/Netlify");
  if (allFiles.includes("aws") || allFiles.includes("samconfig")) cloud.push("AWS");
  if (allFiles.includes("cloudbuild") || allFiles.includes("app.yaml")) cloud.push("GCP");

  // AI
  if (allFiles.includes("openai") || allFiles.includes("gpt")) ai.push("OpenAI");
  if (allFiles.includes("gemini") || allFiles.includes("google.ai")) ai.push("Gemini");
  if (allFiles.includes("anthropic") || allFiles.includes("claude")) ai.push("Claude");
  if (allFiles.includes("langchain") || allFiles.includes("llamaindex")) ai.push("LangChain");

  return { frontend, backend, database, cloud, ai };
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
    const urlType = detectUrlType(args.url);
    const repoInfo = parseRepoUrl(args.url);

    let fetchedInfo: RepoInfo | null = null;
    let files: string[] = [];
    let readmeContent = "";
    let technologies = { frontend: [] as string[], backend: [] as string[], database: [] as string[], cloud: [] as string[], ai: [] as string[] };

    // Stage 1 & 2: Fetch repository data
    if (repoInfo && (urlType === "github" || urlType === "gitlab" || urlType === "bitbucket")) {
      try {
        fetchedInfo = await fetchGitHubRepo(repoInfo.owner, repoInfo.repo);
        files = await fetchGitHubTree(repoInfo.owner, repoInfo.repo, fetchedInfo.defaultBranch);
        readmeContent = await fetchGitHubFile(repoInfo.owner, repoInfo.repo, "README.md");
        technologies = detectTechnologies(files);
      } catch (err) {
        console.error("Failed to fetch repo:", err);
      }
    }

    // Stage 3: Technology detection from files
    if (files.length > 0 && technologies.frontend.length === 0 && technologies.backend.length === 0) {
      technologies = detectTechnologies(files);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Stage 4 & 5: AI Analysis (if Gemini available, otherwise generate smart defaults)
    let analysisResult: {
      analysis: { projectType: string; executiveSummary: string; keyFeatures: string[]; missingFeatures: string[]; architecture: string };
      scores: { overall: number; codeQuality: number; uiUx: number; performance: number; security: number; documentation: number; aiReadiness: number; devOps: number; productQuality: number };
      recommendations: { immediate: string[]; nextSprint: string[]; futureRoadmap: string[]; strengths: string[]; weaknesses: string[]; riskLevel: string; developmentStage: string; technicalDebt: string };
      tasks: Array<{ title: string; description: string; priority: string; tags: string[]; estimatedHours: number }>;
    };

    if (apiKey) {
      const fileStructureSample = files.slice(0, 100).join("\n");
      const prompt = `You are an expert AI software architect analyzing a project. Given the following information, provide a comprehensive analysis in VALID JSON format only (no markdown, no code blocks).

PROJECT: ${fetchedInfo?.name || "Unknown"}
DESCRIPTION: ${fetchedInfo?.description || "No description"}
LANGUAGE: ${fetchedInfo?.language || "Unknown"}
STARS: ${fetchedInfo?.stars || 0}
FILE STRUCTURE (first 100 files):
${fileStructureSample}

README (first 2000 chars):
${readmeContent.slice(0, 2000)}

DETECTED TECHNOLOGIES:
Frontend: ${technologies.frontend.join(", ") || "None detected"}
Backend: ${technologies.backend.join(", ") || "None detected"}
Database: ${technologies.database.join(", ") || "None detected"}
Cloud: ${technologies.cloud.join(", ") || "None detected"}
AI: ${technologies.ai.join(", ") || "None detected"}

Respond with this exact JSON structure:
{
  "analysis": {
    "projectType": "one of: SaaS, AI Platform, CRM, Portfolio, Ecommerce, ERP, Project Management, Chatbot, Internal Tool, Library, Mobile App, API",
    "executiveSummary": "2-3 sentence summary of what this project does and its purpose",
    "keyFeatures": ["feature1", "feature2", "feature3"],
    "missingFeatures": ["missing1", "missing2"],
    "architecture": "Description of the architecture pattern (MVC, microservices, monolith, etc.)"
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
    "immediate": ["do this first", "then this"],
    "nextSprint": ["sprint task 1", "sprint task 2"],
    "futureRoadmap": ["long term goal 1", "long term goal 2"],
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "riskLevel": "low or medium or high",
    "developmentStage": "Prototype or MVP or Beta or Production or Enterprise Ready",
    "technicalDebt": "low or medium or high"
  },
  "tasks": [
    {"title": "Set up CI/CD pipeline", "description": "Configure automated testing and deployment", "priority": "high", "tags": ["devops", "automation"], "estimatedHours": 8},
    {"title": "Add input validation", "description": "Implement form validation across all user inputs", "priority": "medium", "tags": ["security", "ux"], "estimatedHours": 4}
  ]
}`;

      try {
        const geminiResponse = await callGeminiAnalysis(apiKey, prompt);
        // Extract JSON from response (may have markdown code blocks)
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON in response");
        }
      } catch {
        // Fall through to default analysis
        analysisResult = generateDefaultAnalysis(fetchedInfo, files, technologies);
      }
    } else {
      analysisResult = generateDefaultAnalysis(fetchedInfo, files, technologies);
    }

    return {
      urlType,
      repoInfo: fetchedInfo
        ? {
            name: fetchedInfo.name,
            description: fetchedInfo.description,
            language: fetchedInfo.language,
            framework: technologies.frontend[0] || technologies.backend[0] || undefined,
            stars: fetchedInfo.stars,
            forks: fetchedInfo.forks,
            readme: readmeContent.slice(0, 5000),
            fileStructure: files.slice(0, 200),
            dependencies: [],
            topics: fetchedInfo.topics,
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
          },
      analysis: analysisResult.analysis,
      scores: analysisResult.scores,
      recommendations: analysisResult.recommendations,
      tasks: analysisResult.tasks,
    };
  },
});

/** Generate sensible default analysis when Gemini is unavailable */
function generateDefaultAnalysis(
  fetchedInfo: RepoInfo | null,
  files: string[],
  technologies: { frontend: string[]; backend: string[]; database: string[]; cloud: string[]; ai: string[] }
) {
  const name = fetchedInfo?.name || "Imported Project";
  const lang = fetchedInfo?.language || "Unknown";
  const fileCount = files.length;
  const hasReadme = files.some((f) => f.toLowerCase().includes("readme"));
  const hasDocker = files.some((f) => f.toLowerCase().includes("dockerfile") || f.toLowerCase().includes("docker-compose"));
  const hasCI = files.some((f) => f.includes(".github/workflows") || f.includes(".gitlab-ci") || f.includes("Jenkinsfile"));
  const hasTests = files.some((f) => f.includes("test") || f.includes("spec") || f.includes("__tests__"));

  // Compute scores based on heuristics
  const codeQuality = Math.min(95, 50 + (fileCount > 10 ? 15 : 0) + (technologies.frontend.length > 0 || technologies.backend.length > 0 ? 10 : 0) + (hasTests ? 15 : 0) + (fetchedInfo?.stars && fetchedInfo.stars > 10 ? 5 : 0));
  const uiUx = technologies.frontend.length > 0 ? Math.min(90, 55 + (technologies.frontend.includes("Tailwind CSS") ? 15 : 0) + (technologies.frontend.includes("React") || technologies.frontend.includes("Next.js") ? 10 : 0) + 10) : 40;
  const performance = Math.min(90, 55 + (technologies.frontend.includes("Next.js") ? 15 : 0) + (hasDocker ? 10 : 0) + 10);
  const security = Math.min(90, 45 + (technologies.database.length > 0 ? 15 : 0) + (hasDocker ? 10 : 0) + 10);
  const documentation = hasReadme ? Math.min(85, 55 + (fileCount > 20 ? 15 : 0) + 15) : 35;
  const aiReadiness = technologies.ai.length > 0 ? 75 : 30;
  const devOps = Math.min(90, 40 + (hasDocker ? 20 : 0) + (hasCI ? 20 : 0) + 10);
  const productQuality = Math.round((codeQuality + uiUx + performance + security) / 4);
  const overall = Math.round(codeQuality * 0.2 + uiUx * 0.15 + performance * 0.15 + security * 0.15 + documentation * 0.1 + aiReadiness * 0.1 + devOps * 0.1 + productQuality * 0.05);

  const allTech = [...technologies.frontend, ...technologies.backend, ...technologies.database];
  const devStage = fileCount > 100 ? "Production" : fileCount > 30 ? "Beta" : fileCount > 10 ? "MVP" : "Prototype";

  return {
    analysis: {
      projectType: detectProjectType(fetchedInfo, technologies),
      executiveSummary: `${name} is a ${allTech.join("/")} project${fetchedInfo?.description ? ` — ${fetchedInfo.description}` : ""}. It contains ${fileCount} files across the codebase with ${lang !== "Unknown" ? lang + " as the primary language" : "multiple languages"}.`,
      keyFeatures: [
        "Core application functionality",
        technologies.frontend.length > 0 ? "Frontend user interface" : "Backend services",
        technologies.database.length > 0 ? "Data persistence layer" : "API endpoints",
        hasDocker ? "Containerized deployment" : "Standard build pipeline",
      ],
      missingFeatures: [
        !hasTests ? "Automated test suite" : null,
        !hasCI ? "CI/CD pipeline" : null,
        !hasDocker ? "Containerization (Docker)" : null,
        !hasReadme ? "Comprehensive documentation" : null,
      ].filter(Boolean) as string[],
      architecture: technologies.backend.length > 0 && technologies.frontend.length > 0
        ? "Full-stack architecture with separate frontend and backend"
        : technologies.frontend.length > 0
          ? "Frontend application architecture"
          : "Backend service architecture",
    },
    scores: { overall, codeQuality, uiUx, performance, security, documentation, aiReadiness, devOps, productQuality },
    recommendations: {
      immediate: [
        !hasTests ? "Add unit and integration tests" : null,
        !hasCI ? "Set up CI/CD pipeline" : null,
        "Review and update dependencies",
      ].filter(Boolean) as string[],
      nextSprint: [
        "Implement error handling and logging",
        "Add performance monitoring",
        "Improve documentation",
        "Security audit and fixes",
      ],
      futureRoadmap: [
        "Add AI/ML capabilities",
        "Implement analytics dashboard",
        "Scale infrastructure",
        "Add multi-tenancy support",
      ],
      strengths: [
        allTech.length > 0 ? `Modern tech stack (${allTech.slice(0, 3).join(", ")})` : "Solid foundation",
        fileCount > 20 ? "Well-structured codebase" : "Clean project structure",
        fetchedInfo?.stars && fetchedInfo.stars > 5 ? "Community interest" : "Active development",
      ],
      weaknesses: [
        !hasTests ? "Lack of automated tests" : null,
        !hasCI ? "No CI/CD pipeline" : null,
        !hasDocker ? "No containerization" : null,
      ].filter(Boolean) as string[],
      riskLevel: overall >= 75 ? "low" : overall >= 50 ? "medium" : "high",
      developmentStage: devStage,
      technicalDebt: overall >= 70 ? "low" : overall >= 45 ? "medium" : "high",
    },
    tasks: [
      { title: "Code review and refactoring", description: "Review codebase quality and refactor critical areas", priority: "high", tags: ["code-quality", "refactor"], estimatedHours: 12 },
      { title: "Add automated tests", description: "Write unit and integration tests for core functionality", priority: "high", tags: ["testing", "quality"], estimatedHours: 16 },
      { title: "Set up CI/CD pipeline", description: "Configure automated build, test, and deployment", priority: "medium", tags: ["devops", "automation"], estimatedHours: 8 },
      { title: "Security audit", description: "Review authentication, input validation, and API security", priority: "medium", tags: ["security"], estimatedHours: 6 },
      { title: "Documentation update", description: "Update README, API docs, and architecture documentation", priority: "low", tags: ["documentation"], estimatedHours: 4 },
      { title: "Performance optimization", description: "Profile and optimize critical performance paths", priority: "medium", tags: ["performance"], estimatedHours: 8 },
    ],
  };
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

/**
 * KORTEX AI — Gemini API Client
 *
 * Direct browser-to-Gemini integration for autonomous AI responses.
 * No backend dependency — calls Gemini REST API directly.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiMessage {
  role: "user" | "model";
  parts: string;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
}

/**
 * Get the Gemini API key from environment or user settings
 */
function getApiKey(): string {
  // Try Vite env var first
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;

  // Try localStorage (user-configured)
  const stored = localStorage.getItem("kortex_gemini_api_key");
  if (stored) return stored;

  return "";
}

/**
 * Set the Gemini API key in localStorage
 */
export function setGeminiApiKey(key: string): void {
  localStorage.setItem("kortex_gemini_api_key", key);
}

/**
 * Check if a Gemini API key is configured
 */
export function hasGeminiApiKey(): boolean {
  return getApiKey().length > 0;
}

/**
 * Build the system prompt with full workspace context
 */
export function buildSystemPrompt(context: {
  projectName?: string;
  projectStatus?: string;
  healthScore?: number;
  tasks: Array<{ title: string; status: string; priority: string; description?: string }>;
  completionRate: number;
  totalTasks: number;
  totalDone: number;
  totalInProgress: number;
  totalRisk: number;
  totalOverdue: number;
  sprintName?: string;
  sprintProgress?: string;
  analyses: Array<{ name: string; score: number; strengths: string[]; weaknesses: string[]; architecture: string; techStack: Record<string, string[]> }>;
  recentMessages: Array<{ role: string; content: string }>;
  userName?: string;
}): string {
  const { projectName, projectStatus, healthScore, tasks, completionRate, totalTasks, totalDone, totalInProgress, totalRisk, totalOverdue, sprintName, sprintProgress, analyses, recentMessages, userName } = context;

  const parts: string[] = [
    "You are KORTEX AI — an autonomous AI Technical Project Manager and workspace intelligence agent.",
    "You are NOT a chatbot. You are an AI engineer who has full access to the user's workspace.",
    "",
    "━━━ CRITICAL RULES ━━━",
    "1. NEVER respond with generic text like 'You can ask me about...' or 'I can help with...' or 'Try asking...'",
    "2. NEVER advertise your capabilities or list what you can do.",
    "3. NEVER use template responses. Every answer must be generated fresh from the workspace data.",
    "4. ALWAYS answer using the actual workspace data provided below.",
    "5. Reference specific task names, numbers, statuses, and priorities.",
    "6. Every response must include: what I found → analysis → recommendation → next action.",
    "7. Keep responses concise (3-8 sentences) unless the user asks for detail.",
    "8. Tone: Professional, concise, technical, actionable — like a senior engineering lead.",
    "9. You can reason step-by-step internally but present clear, direct answers.",
    "10. If you don't have enough information, ask a specific clarifying question — never say 'I can help with...'",
    "",
    "━━━ CAPABILITIES ━━━",
    "You can analyze, plan, prioritize, estimate effort, identify blockers, suggest architecture improvements,",
    "break down epics, write user stories, track progress, and provide technical recommendations.",
    "You reason over the workspace data to give specific, evidence-based advice.",
  ];

  // User context
  if (userName) {
    parts.push("", `WORKSPACE USER: ${userName}`);
  }

  // Project context
  if (projectName) {
    parts.push("", "━━━ PROJECT DATA ━━━");
    parts.push(`Project: ${projectName}`);
    parts.push(`Status: ${projectStatus || "active"}`);
    if (healthScore) parts.push(`Health Score: ${healthScore}/100`);
    parts.push(`Completion: ${completionRate}%`);
    parts.push(`Tasks: ${totalTasks} total, ${totalDone} done, ${totalInProgress} in progress`);
    if (totalRisk > 0) parts.push(`⚠️ High-risk tasks: ${totalRisk}`);
    if (totalOverdue > 0) parts.push(`⏰ Overdue tasks: ${totalOverdue}`);
  }

  // Sprint context
  if (sprintName) {
    parts.push("", "━━━ ACTIVE SPRINT ━━━");
    parts.push(`Sprint: ${sprintName}`);
    if (sprintProgress) parts.push(`Progress: ${sprintProgress}`);
  }

  // Task details
  if (tasks.length > 0) {
    parts.push("", "━━━ TASKS ━━━");
    for (const t of tasks.slice(0, 15)) {
      let line = `- "${t.title}" [${t.status}] priority:${t.priority}`;
      if (t.description) line += ` — ${t.description.slice(0, 80)}`;
      parts.push(line);
    }
    if (tasks.length > 15) parts.push(`... and ${tasks.length - 15} more tasks`);
  }

  // Repository analysis
  if (analyses.length > 0) {
    parts.push("", "━━━ REPOSITORY ANALYSIS ━━━");
    for (const a of analyses) {
      parts.push(`Repository: ${a.name} (Score: ${a.score}/100)`);
      parts.push(`Architecture: ${a.architecture}`);
      if (a.strengths.length > 0) parts.push(`Strengths: ${a.strengths.join("; ")}`);
      if (a.weaknesses.length > 0) parts.push(`Weaknesses: ${a.weaknesses.join("; ")}`);
      for (const [category, items] of Object.entries(a.techStack)) {
        if (items.length > 0) parts.push(`  ${category}: ${items.join(", ")}`);
      }
    }
  }

  // Conversation memory
  if (recentMessages.length > 0) {
    parts.push("", "━━━ CONVERSATION HISTORY (last 10 messages) ━━━");
    for (const m of recentMessages.slice(-10)) {
      parts.push(`${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 200)}`);
    }
  }

  parts.push("", "━━━ INSTRUCTIONS ━━━");
  parts.push("Based on the workspace data above, provide a specific, actionable response.");
  parts.push("If the user asks about something not in the data, reason from what you know and suggest next steps.");
  parts.push("Never give generic advice — always tie your response to the actual data.");

  return parts.join("\n");
}

/**
 * Call Gemini API with workspace context
 */
export async function callGemini(options: {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  model?: string;
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const { systemPrompt, userMessage, conversationHistory, model = "gemini-2.0-flash" } = options;

  // Build the contents array for Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Add conversation history
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Add current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API error:", response.status, errorBody);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No response from Gemini");
  }

  const text = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text;
}

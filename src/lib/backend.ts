/**
 * KORTEX AI Backend Configuration
 * Connects to the FastAPI Python backend
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  status?: string;
  health_score?: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
}

export interface ChatRequest {
  message: string;
  project_id?: string;
  conversation_id?: string;
  conversation_history: Array<{ role: string; content: string }>;
  gemini_api_key?: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
  confidence: number;
  conversation_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Send a message to the KORTEX AI backend
 */
export async function sendToBackend(
  message: string,
  conversationId?: string,
  projectId?: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): Promise<ChatResponse> {
  const request: ChatRequest = {
    message,
    conversation_id: conversationId,
    project_id: projectId,
    conversation_history: conversationHistory,
    gemini_api_key: GEMINI_KEY || undefined,
  };

  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/projects`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    // Backend unavailable — return empty; Convex is the primary data source
    return [];
  }
}

export async function fetchTasks(): Promise<TaskSummary[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tasks`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    // Backend unavailable — return empty; Convex is the primary data source
    return [];
  }
}

export async function createProject(payload: { name: string; description?: string }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}

export async function createTask(payload: { title: string; description?: string; status?: string; priority?: string }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}

/**
 * Get agent status
 */
export async function getAgentStatus(): Promise<Record<string, unknown>> {
  const response = await fetch(`${BACKEND_URL}/api/agent/status`);
  return response.json();
}

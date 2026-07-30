import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Safe reference name extraction
//
// Convex anyApi returns Proxy objects that intercept ALL property accesses.
// Accessing `.toString()`, `.name`, or `.__convexName` on these Proxies may
// return another Proxy (not a string), causing "Cannot convert object to
// primitive value" or "name.includes is not a function" errors.
//
// We ONLY extract names via __convexName with a strict type guard and wrap
// everything in try-catch. If extraction fails we return the fallback string.
// ---------------------------------------------------------------------------

function safeName(ref: unknown, fallback: string): string {
  if (ref == null) return fallback;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (ref as any).__convexName;
    return typeof raw === "string" ? raw : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Route map: maps Convex function names to local fallback responses.
// ---------------------------------------------------------------------------

const QUERY_ROUTES: Record<string, () => unknown> = {
  "projects.list": () => [
    {
      _id: "project-1",
      name: "Sample Project",
      status: "active",
      description: "Local demo project",
    },
  ],
  "projects.get": () => ({
    _id: "project-1",
    name: "Sample Project",
    status: "active",
  }),
  "projects.stats": () => ({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    completionRate: 0,
    highRiskTasks: 0,
  }),
  "tasks.list": () => [],
  "sprints.list": () => [],
  "notifications.recent": () => [],
  "notifications.unreadCount": () => 0,
  "ai.getProjectInsights": () => ({
    project: { name: "Sample Project", status: "active", healthScore: 88, sprintDuration: 14 },
    stats: { total: 6, done: 3, inProgress: 1, todo: 1, backlog: 1, review: 0, highRisk: 1, overdue: 0, completionRate: 60 },
    stage: "Execution",
    insights: [
      { type: "status", title: "Stable delivery", detail: "The current sprint is on track with healthy momentum." },
    ],
  }),
  "ai.getGlobalInsights": () => ({
    totalProjects: 1,
    activeProjects: 1,
    totalTasks: 6,
    totalDone: 3,
    totalInProgress: 1,
    totalRisk: 1,
    totalOverdue: 0,
    globalCompletion: 60,
    insights: [{ type: "suggestion", title: "Focus on risks", detail: "Review the remaining high-risk task before the next sprint review." }],
  }),
  "ai.getConversations": () => [],
};

const MUTATION_ROUTES: Record<string, (args?: unknown) => unknown> = {
  "notifications.markAllRead": () => ({}),
  "ai.createConversation": () => "local-conversation",
  "ai.sendMessage": () => ({ conversationHistory: [], context: "Local fallback context" }),
  "ai.saveAssistantResponse": () => [{ role: "assistant", content: "Local fallback response" }],
  "sprints.create": () => ({ _id: "sprint-" + Date.now(), name: "New Sprint" }),
  "sprints.updateStatus": () => ({}),
  "projects.create": () => "project-" + Date.now(),
  "projects.update": () => ({}),
  "tasks.create": () => "task-" + Date.now(),
  "tasks.update": () => ({}),
  "tasks.remove": () => ({}),
};

const ACTION_ROUTES: Record<string, (args?: unknown) => unknown> = {
  generateResponse: (args) =>
    `Local fallback response to: ${(args as { userMessage?: string } | undefined)?.userMessage ?? "your request"}`,
  analyzeProject: () => ({
    repoInfo: { name: "Analyzed Project", topics: ["javascript"], fileStructure: ["package.json", "src/index.ts"] },
    analysis: { executiveSummary: "Project analysis complete.", projectType: "web-app", strengths: [], weaknesses: [], risks: [] },
    scores: { overall: 75 },
  }),
};

function matchRoute(name: string, routes: Record<string, (...a: unknown[]) => unknown>): ((...a: unknown[]) => unknown) | null {
  for (const key in routes) {
    if (name.includes(key)) return routes[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useLocalQuery<T>(queryRef: unknown, args?: unknown) {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    try {
      if (!queryRef) {
        setData(undefined);
        return;
      }

      const name = safeName(queryRef, "query");
      const handler = matchRoute(name, QUERY_ROUTES);
      if (handler) {
        setData(handler() as T);
      } else {
        setData(undefined);
      }
    } catch {
      // Never crash — return undefined for unrecognized queries
      setData(undefined);
    }
  }, [queryRef, args]);

  return data;
}

export function useLocalMutation<TArgs = unknown, TReturn = unknown>(mutationRef: unknown) {
  const name = safeName(mutationRef, "mutation");

  return useMemo(() => {
    return async (args?: TArgs): Promise<TReturn> => {
      try {
        const handler = matchRoute(name, MUTATION_ROUTES);
        if (handler) return handler(args) as TReturn;
        return {} as TReturn;
      } catch {
        return {} as TReturn;
      }
    };
  }, [name]);
}

export function useLocalAction<TArgs = unknown, TReturn = unknown>(actionRef: unknown) {
  const name = safeName(actionRef, "action");

  return useMemo(() => {
    return async (args?: TArgs): Promise<TReturn> => {
      try {
        const handler = matchRoute(name, ACTION_ROUTES);
        if (handler) return handler(args) as TReturn;
        return {} as TReturn;
      } catch {
        return {} as TReturn;
      }
    };
  }, [name]);
}

export { safeName as extractName };

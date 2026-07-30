import { useEffect, useMemo, useState } from "react";

/**
 * Safely extract a string name from a Convex function reference or Proxy object.
 * Convex anyApi returns Proxy objects that don't have __convexName.
 * We try toString() which Convex FunctionReferences support.
 */
function extractName(ref: unknown, fallback: string): string {
  if (!ref) return fallback;

  // If it's a function with __convexName
  if (typeof ref === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnRef = ref as any;
    if (typeof fnRef.__convexName === "string") return fnRef.__convexName;
    if (typeof fnRef.name === "string" && fnRef.name.length > 0) return fnRef.name;
  }

  // If it's an object (Convex Proxy / FunctionReference)
  if (typeof ref === "object" && ref !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objRef = ref as any;
    if (typeof objRef.__convexName === "string") return objRef.__convexName;

    // Convex FunctionReference Proxies support toString()
    try {
      const str = objRef.toString();
      if (typeof str === "string" && str.length > 0 && str.length < 200) return str;
    } catch {
      // Proxy toString() threw — ignore
    }
  }

  return fallback;
}

export function useLocalQuery<T>(queryRef: unknown, args?: unknown) {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!queryRef) {
      setData(undefined);
      return;
    }

    const name = extractName(queryRef, "query");

    if (name.includes("projects.list")) {
      setData([
        {
          _id: "project-1",
          name: "Sample Project",
          status: "active",
          description: "Local demo project",
        },
      ] as T);
      return;
    }

    if (name.includes("notifications.recent")) {
      setData([] as T);
      return;
    }

    if (name.includes("notifications.unreadCount")) {
      setData(0 as T);
      return;
    }

    if (name.includes("ai.getProjectInsights")) {
      setData({
        project: { name: "Sample Project", status: "active", healthScore: 88, sprintDuration: 14 },
        stats: { total: 6, done: 3, inProgress: 1, todo: 1, backlog: 1, review: 0, highRisk: 1, overdue: 0, completionRate: 60 },
        stage: "Execution",
        insights: [
          { type: "status", title: "Stable delivery", detail: "The current sprint is on track with healthy momentum." },
        ],
      } as T);
      return;
    }

    if (name.includes("ai.getGlobalInsights")) {
      setData({
        totalProjects: 1,
        activeProjects: 1,
        totalTasks: 6,
        totalDone: 3,
        totalInProgress: 1,
        totalRisk: 1,
        totalOverdue: 0,
        globalCompletion: 60,
        insights: [{ type: "suggestion", title: "Focus on risks", detail: "Review the remaining high-risk task before the next sprint review." }],
      } as T);
      return;
    }

    if (name.includes("ai.getConversations")) {
      setData([] as T);
      return;
    }

    if (name.includes("sprints.list")) {
      setData([] as T);
      return;
    }

    if (name.includes("projects.get")) {
      setData({ _id: "project-1", name: "Sample Project", status: "active" } as T);
      return;
    }

    if (name.includes("projects.stats")) {
      setData({ totalTasks: 0, completedTasks: 0, inProgressTasks: 0, completionRate: 0, highRiskTasks: 0 } as T);
      return;
    }

    if (name.includes("tasks.list")) {
      setData([] as T);
      return;
    }

    // Default: return undefined for unrecognized queries
    setData(undefined);
  }, [queryRef, args]);

  return data;
}

export function useLocalMutation<TArgs = unknown, TReturn = unknown>(mutationRef: unknown) {
  const name = extractName(mutationRef, "mutation");

  return useMemo(() => {
    return async (args?: TArgs) => {
      if (name.includes("notifications.markAllRead")) {
        return {} as TReturn;
      }
      if (name.includes("ai.createConversation")) {
        return "local-conversation" as TReturn;
      }
      if (name.includes("ai.sendMessage")) {
        return { conversationHistory: [], context: "Local fallback context" } as TReturn;
      }
      if (name.includes("ai.saveAssistantResponse")) {
        return [{ role: "assistant", content: "Local fallback response" }] as TReturn;
      }
      if (name.includes("sprints.create")) {
        return { _id: "sprint-" + Date.now(), name: "New Sprint" } as TReturn;
      }
      if (name.includes("sprints.updateStatus")) {
        return {} as TReturn;
      }
      if (name.includes("projects.create")) {
        return "project-" + Date.now() as TReturn;
      }
      if (name.includes("projects.update")) {
        return {} as TReturn;
      }
      if (name.includes("tasks.create")) {
        return "task-" + Date.now() as TReturn;
      }
      if (name.includes("tasks.update")) {
        return {} as TReturn;
      }
      if (name.includes("tasks.remove")) {
        return {} as TReturn;
      }
      return {} as TReturn;
    };
  }, [name]);
}

export function useLocalAction<TArgs = unknown, TReturn = unknown>(actionRef: unknown) {
  const name = extractName(actionRef, "action");

  return useMemo(() => {
    return async (args?: TArgs) => {
      if (name.includes("generateResponse")) {
        return `Local fallback response to: ${(args as { userMessage?: string } | undefined)?.userMessage ?? "your request"}` as TReturn;
      }
      if (name.includes("analyzeProject")) {
        return {
          repoInfo: { name: "Analyzed Project", topics: ["javascript"], fileStructure: ["package.json", "src/index.ts"] },
          analysis: { executiveSummary: "Project analysis complete.", projectType: "web-app", strengths: [], weaknesses: [], risks: [] },
          scores: { overall: 75 },
        } as TReturn;
      }
      return {} as TReturn;
    };
  }, [name]);
}

export { extractName };

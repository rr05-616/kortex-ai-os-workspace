import { useEffect, useMemo, useState } from "react";

function createReference(name: string) {
  return Object.assign(
    (..._args: unknown[]) => undefined,
    {
      __convexName: name,
    }
  );
}

export function useLocalQuery<T>(queryRef: unknown, args?: unknown) {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    const maybeRef = queryRef as { __convexName?: string } | ((...args: unknown[]) => unknown) | undefined;
    if (!maybeRef) {
      setData(undefined);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnRef = maybeRef as any;
    const name = typeof maybeRef === "function"
      ? fnRef.__convexName ?? maybeRef.name
      : (maybeRef as { __convexName?: string }).__convexName ?? "query";

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

    setData(undefined);
  }, [queryRef, args]);

  return data;
}

export function useLocalMutation<TArgs = unknown, TReturn = unknown>(mutationRef: unknown) {
  return useMemo(() => {
    const name = (mutationRef as { __convexName?: string }).__convexName ?? "mutation";
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
      return {} as TReturn;
    };
  }, [mutationRef]);
}

export function useLocalAction<TArgs = unknown, TReturn = unknown>(actionRef: unknown) {
  return useMemo(() => {
    const name = (actionRef as { __convexName?: string }).__convexName ?? "action";
    return async (args?: TArgs) => {
      if (name.includes("generateResponse")) {
        return `Local fallback response to: ${(args as { userMessage?: string } | undefined)?.userMessage ?? "your request"}` as TReturn;
      }
      return {} as TReturn;
    };
  }, [actionRef]);
}

export { createReference };
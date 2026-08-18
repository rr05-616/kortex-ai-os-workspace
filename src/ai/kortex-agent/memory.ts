/**
 * KORTEX AI Agent — Conversational Memory
 *
 * Maintains short-term conversational context so the agent can
 * resolve references like "this project", "that task", "its deadline".
 */

import type { ConversationMemory } from "./types";

// ─── EMPTY MEMORY ────────────────────────────────────────────────────────────

export function createEmptyMemory(): ConversationMemory {
  return {
    recentTopics: [],
    discussedProjects: [],
    discussedTasks: [],
    discussedSprints: [],
    lastAction: undefined,
    lastRecommendation: undefined,
    currentGoal: undefined,
    entityReferences: {},
  };
}

// ─── EXTRACT MEMORY FROM CONVERSATION HISTORY ────────────────────────────────

export function extractMemoryFromHistory(
  history: Array<{ role: string; content: string }>
): ConversationMemory {
  const memory = createEmptyMemory();
  const assistantResponses = history.filter((m) => m.role === "assistant").slice(-5);
  const userMessages = history.filter((m) => m.role === "user");

  // Extract topics from recent assistant responses
  for (const response of assistantResponses) {
    const content = response.content.toLowerCase();

    if (content.includes("risk") || content.includes("block")) {
      addUnique(memory.recentTopics, "risk");
    }
    if (content.includes("sprint") || content.includes("velocity")) {
      addUnique(memory.recentTopics, "sprints");
    }
    if (content.includes("task") || content.includes("todo")) {
      addUnique(memory.recentTopics, "tasks");
    }
    if (content.includes("project")) {
      addUnique(memory.recentTopics, "projects");
    }
    if (content.includes("architect") || content.includes("tech stack")) {
      addUnique(memory.recentTopics, "architecture");
    }
    if (content.includes("progress") || content.includes("status") || content.includes("completion")) {
      addUnique(memory.recentTopics, "progress");
    }

    // Extract mentioned task names (bold text pattern)
    const taskMatches = content.match(/\*\*"([^"]+)"\*\*/g);
    if (taskMatches) {
      for (const match of taskMatches) {
        const taskName = match.replace(/\*\*"/g, "").replace(/"\*\*/g, "");
        addUnique(memory.discussedTasks, taskName);
      }
    }

    // Extract sprint names
    const sprintMatches = content.match(/Sprint \d+/gi);
    if (sprintMatches) {
      for (const match of sprintMatches) {
        addUnique(memory.discussedSprints, match);
      }
    }

    // Detect last action type
    if (content.includes("create") || content.includes("generated") || content.includes("created")) {
      memory.lastAction = "creation";
    } else if (content.includes("recommend") || content.includes("suggestion")) {
      memory.lastAction = "recommendation";
    } else if (content.includes("analyz") || content.includes("found")) {
      memory.lastAction = "analysis";
    }
  }

  // Extract entity references from user messages
  for (const msg of userMessages) {
    const content = msg.content.toLowerCase();
    if (content.includes("this project") || content.includes("current project")) {
      memory.entityReferences["this project"] = "current_project";
    }
    if (content.includes("its deadline") || content.includes("its due date")) {
      memory.entityReferences["its deadline"] = "last_discussed_task";
    }
  }

  // Keep recent topics trimmed
  memory.recentTopics = memory.recentTopics.slice(-5);
  memory.discussedTasks = memory.discussedTasks.slice(-10);
  memory.discussedSprints = memory.discussedSprints.slice(-5);

  return memory;
}

// ─── FOLLOW-UP DETECTION ─────────────────────────────────────────────────────

export function detectFollowUp(
  message: string,
  history: Array<{ role: string; content: string }>
): { isFollowUp: boolean; resolvedQuery: string } | null {
  const msg = message.toLowerCase().trim();

  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return null;

  const prevContent = lastAssistant.content.slice(0, 300);

  const strongFollowUps: Array<{ patterns: string[]; resolver: () => string }> = [
    {
      patterns: ["why", "why?", "explain why", "tell me why", "reason"],
      resolver: () => `Explain the detailed reasoning behind your previous response. Focus on: ${prevContent}`,
    },
    {
      patterns: ["how", "how?", "how do i", "how does", "how can"],
      resolver: () => `Provide detailed implementation steps for: ${prevContent}`,
    },
    {
      patterns: ["continue", "go on", "keep going", "what else", "more", "else"],
      resolver: () => `Continue the previous analysis. What else should the user know about: ${prevContent}`,
    },
    {
      patterns: ["explain", "elaborate", "details", "tell me more"],
      resolver: () => `Provide more detailed explanation about: ${prevContent}`,
    },
    {
      patterns: ["do it", "start", "proceed", "go ahead", "execute"],
      resolver: () => `Execute the recommended action from: ${prevContent}`,
    },
  ];

  for (const { patterns, resolver } of strongFollowUps) {
    if (patterns.some((p) => msg === p || msg.startsWith(p) || msg.endsWith(p))) {
      return { isFollowUp: true, resolvedQuery: resolver() };
    }
  }

  // Weak follow-ups: short messages with pronouns
  const wordCount = msg.split(/\s+/).length;
  if (wordCount <= 12) {
    const referencePatterns = ["it", "this", "that", "them", "the task", "the sprint", "the project", "can you", "please"];
    if (referencePatterns.some((p) => msg.startsWith(p) || msg === p)) {
      return {
        isFollowUp: true,
        resolvedQuery: `Continue discussing: ${prevContent}. The user is asking about "${message}"`,
      };
    }
  }

  return null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function addUnique(arr: string[], item: string): void {
  if (!arr.includes(item)) {
    arr.push(item);
  }
}

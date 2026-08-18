/**
 * KORTEX AI Agent — Public API
 *
 * Re-exports the agent system components for use by the
 * AI Copilot UI and the Convex backend actions.
 */

// Types
export type {
  WorkspaceContext,
  ConversationMemory,
  Intent,
  AgentResponse,
  AgentAnswerResponse,
  AgentNavigationResponse,
  AgentActionResponse,
  AgentConfirmationResponse,
  AgentStep,
  TaskData,
  ProjectData,
  SprintData,
  ProjectStats,
  AnalysisData,
  SearchResult,
  ToolDefinition,
  ToolName,
} from "./types";

// Agent pipeline
export { runAgentPipeline, type AgentInput, type AgentOutput } from "./agent";

// Intent detection
export { detectIntent } from "./planner";

// Tools
export { selectToolsForIntent, searchWorkspace, resolveEntityReference, TOOL_DEFINITIONS } from "./tools";

// Context builder
export { buildWorkspaceContext, calculateStage, type RawContextData } from "./context";

// Memory
export { createEmptyMemory, extractMemoryFromHistory, detectFollowUp } from "./memory";

// Prompts
export { buildAgentPrompt, buildLocalFallback } from "./prompts";

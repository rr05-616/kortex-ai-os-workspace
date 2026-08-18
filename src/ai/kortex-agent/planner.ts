/**
 * KORTEX AI Agent — Intent Detector
 *
 * Detects the user's intent from their message to determine
 * which tools to use and how to respond.
 */

import type { Intent } from "./types";

const GREETINGS = [
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "what's up", "sup", "yo", "howdy", "greetings", "hola",
];

export function detectIntent(message: string): Intent {
  const msg = message.toLowerCase().trim();

  // Greetings
  if (GREETINGS.some((g) => msg.startsWith(g) || msg === g)) return "greeting";

  // Identity
  if (msg.match(/^(who|what) are you|your name|tell me about yourself/)) return "identity";

  // Help
  if (msg.match(/help|what can you do|capabilities|features|commands/)) return "help";

  // Progress / Status
  if (msg.match(/progress|status|stage|how.*going|how.*project|completion|health|where.*stand/)) return "progress";

  // Risk analysis
  if (msg.match(/risk|block|issue|problem|stuck|danger|warning|overdue|delayed|bottleneck|critical/)) return "risk";

  // Suggestions
  if (msg.match(/suggest|recommend|improve|better|advice|tip|optimize|should i|what should/)) return "suggest";

  // Sprint
  if (msg.match(/sprint|plan|roadmap|backlog|milestone|release|velocity/)) return "sprint";

  // Task creation
  if (msg.match(/create.*task|add.*task|new.*task|generate.*task|make.*task/)) return "task_create";

  // Task update
  if (msg.match(/update.*task|change.*task|move.*task|mark.*task|complete.*task/)) return "task_update";

  // Task assignment
  if (msg.match(/assign.*task|give.*to|who.*work|whose.*task|task.*for/)) return "task_assign";

  // Task listing
  if (msg.match(/list.*task|show.*task|my.*task|all.*task|what.*task|tasks.*assigned/)) return "task_list";

  // Team
  if (msg.match(/team|member|collaborat|workload|resource|overloaded/)) return "team";

  // Analytics
  if (msg.match(/analy|metric|score|report|summary|dashboard|insight|trend|chart/)) return "analytics";

  // Architecture
  if (msg.match(/architect|structure|folder|file|component|service|module|tech stack|design/)) return "architecture";

  // Navigation
  if (msg.match(/open|go to|show|take me|navigate|go to|switch to/)) return "navigate";

  // Search
  if (msg.match(/search|find|look for|where is|locate/)) return "search";

  // Explain
  if (msg.match(/explain|why|how does|what is|reason|because/)) return "explain";

  // Create (general)
  if (msg.match(/create|generate|write|build|implement|setup/)) return "create";

  // Review
  if (msg.match(/review|check|inspect|audit|examine/)) return "review";

  // Thanks
  if (msg.match(/thank|thanks|thx|appreciate|great|perfect|awesome/)) return "thanks";

  // Farewell
  if (msg.match(/bye|goodbye|see you|later|exit|quit/)) return "farewell";

  return "general";
}

"""Intent Classifier — Classifies every user request into typed intents."""

from __future__ import annotations

import re
import structlog
from .schemas import IntentResult, IntentType

logger = structlog.get_logger(__name__)

# ─── Pattern definitions ──────────────────────────────────────────────────────

_INTENT_PATTERNS: list[tuple[IntentType, list[str]]] = [
    (IntentType.GREETING, [
        r"\b(hello|hi|hey|good morning|good afternoon|good evening|sup|yo|howdy|hola)\b",
    ]),
    (IntentType.THANK_YOU, [
        r"\b(thanks|thank you|thx|appreciate|great|perfect|awesome)\b",
    ]),
    (IntentType.FOLLOW_UP, [
        r"^(why|how|continue|go on|explain|elaborate|more|details|review|improve|do it|start|next|and\?)$",
        r"^(why\?|how\?|what about|should i|can you|could you|would you)\b",
    ]),
    (IntentType.RISK_ANALYSIS, [
        r"\b(risk|block|blocked|issue|problem|stuck|danger|warning|overdue|delayed|bottleneck|critical|fail)\b",
    ]),
    (IntentType.TASK_RECOMMENDATION, [
        r"\b(what should i|recommend|suggest|priorit|next task|work on|start with|focus on)\b",
    ]),
    (IntentType.PROJECT_STATUS, [
        r"\b(progress|status|stage|how.*(going|is)|completion|health|where.*(stand|are)|overview)\b",
    ]),
    (IntentType.SPRINT_PLANNING, [
        r"\b(sprint|plan|roadmap|backlog|milestone|release|velocity|sprint plan)\b",
    ]),
    (IntentType.TASK_BREAKDOWN, [
        r"\b(break down|breakdown|subtask|sub-task|decompose|split task|divide)\b",
    ]),
    (IntentType.ARCHITECTURE_REVIEW, [
        r"\b(architect|structure|folder|file tree|component|service|module|tech stack|design pattern)\b",
    ]),
    (IntentType.CODE_REVIEW, [
        r"\b(code review|review code|check code|inspect|audit code|code quality)\b",
    ]),
    (IntentType.IMPLEMENTATION_GUIDE, [
        r"\b(how (do|to|does)|implement|build|create|setup|initialize|configure|write)\b",
    ]),
    (IntentType.HOW_TO, [
        r"\b(how (do i|can i|to)|tutorial|guide|steps for|walkthrough)\b",
    ]),
    (IntentType.PERFORMANCE, [
        r"\b(performance|speed|fast|slow|optimi[zs]|cache|latency|bottleneck|throughput)\b",
    ]),
    (IntentType.SECURITY, [
        r"\b(security|auth|authentication|authorization|encrypt|vulnerability|injection|xss|csrf)\b",
    ]),
    (IntentType.DOCUMENTATION, [
        r"\b(document|docs|readme|api doc|swagger|openapi|comment|docstring)\b",
    ]),
    (IntentType.SEARCH, [
        r"\b(search|find|look for|where is|locate|grep|filter)\b",
    ]),
    (IntentType.EXECUTE_ACTION, [
        r"\b(execute|run|deploy|ship|publish|start|stop|restart|delete|remove|move|update)\b",
    ]),
    (IntentType.PROJECT_HEALTH, [
        r"\b(health|healthy|score|rating|quality|technical debt|code smell)\b",
    ]),
    (IntentType.ROADMAP, [
        r"\b(roadmap|timeline|milestone|future|plan ahead|what.*(next|coming))\b",
    ]),
    (IntentType.GENERAL_AI, [
        r"\b(explain|what is|what are|define|tell me about|difference between|compare)\b",
    ]),
    (IntentType.SMALL_TALK, [
        r"\b(weather|joke|fun|bored|tired|cool|nice|wow)\b",
    ]),
]

_GREETING_WORDS = {
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
    "sup", "yo", "howdy", "greetings", "hola",
}


class IntentClassifier:
    """Classifies user messages into typed intents with confidence scores."""

    def classify(
        self,
        message: str,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> IntentResult:
        """Classify a user message into an IntentResult."""
        msg = message.lower().strip()
        logger.info("intent_classifier.classify", message=msg[:80])

        # Check greeting first (highest priority)
        if any(g in msg for g in _GREETING_WORDS):
            return IntentResult(
                intent=IntentType.GREETING,
                confidence=0.95,
                raw_message=message,
            )

        # Check each intent pattern
        best_intent = IntentType.UNKNOWN
        best_confidence = 0.0

        for intent_type, patterns in _INTENT_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, msg, re.IGNORECASE):
                    # Calculate confidence based on specificity
                    confidence = self._compute_confidence(intent_type, msg, pattern)
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_intent = intent_type
                    break  # One match per intent type is enough

        # Detect follow-up from conversation context
        if best_intent == IntentType.UNKNOWN and conversation_history:
            if len(msg.split()) <= 5:
                best_intent = IntentType.FOLLOW_UP
                best_confidence = 0.6

        # Default to general AI if nothing matches
        if best_intent == IntentType.UNKNOWN:
            best_intent = IntentType.GENERAL_AI
            best_confidence = 0.4

        # Extract entities
        entities = self._extract_entities(msg)

        result = IntentResult(
            intent=best_intent,
            confidence=round(best_confidence, 2),
            entities=entities,
            raw_message=message,
        )

        logger.info(
            "intent_classifier.result",
            intent=result.intent.value,
            confidence=result.confidence,
        )
        return result

    def _compute_confidence(
        self, intent_type: IntentType, msg: str, pattern: str
    ) -> float:
        """Compute confidence score for a matched intent."""
        # Base confidence by intent specificity
        base = {
            IntentType.GREETING: 0.95,
            IntentType.THANK_YOU: 0.90,
            IntentType.RISK_ANALYSIS: 0.85,
            IntentType.TASK_RECOMMENDATION: 0.80,
            IntentType.PROJECT_STATUS: 0.80,
            IntentType.SPRINT_PLANNING: 0.85,
            IntentType.ARCHITECTURE_REVIEW: 0.80,
            IntentType.CODE_REVIEW: 0.80,
            IntentType.IMPLEMENTATION_GUIDE: 0.75,
            IntentType.HOW_TO: 0.75,
            IntentType.PERFORMANCE: 0.80,
            IntentType.SECURITY: 0.80,
            IntentType.FOLLOW_UP: 0.70,
            IntentType.EXECUTE_ACTION: 0.75,
            IntentType.GENERAL_AI: 0.50,
        }.get(intent_type, 0.50)

        # Boost if message is short and matches well
        word_count = len(msg.split())
        if word_count <= 5:
            base += 0.05

        return min(base, 0.99)

    def _extract_entities(self, msg: str) -> dict[str, str]:
        """Extract key entities from the message."""
        entities: dict[str, str] = {}

        # Detect task references
        task_match = re.search(r'"([^"]+)"', msg)
        if task_match:
            entities["task_name"] = task_match.group(1)

        # Detect numbers
        num_match = re.search(r"\b(\d+)\b", msg)
        if num_match:
            entities["number"] = num_match.group(1)

        # Detect sprint references
        sprint_match = re.search(r"sprint\s*(\d+)", msg, re.IGNORECASE)
        if sprint_match:
            entities["sprint_number"] = sprint_match.group(1)

        return entities

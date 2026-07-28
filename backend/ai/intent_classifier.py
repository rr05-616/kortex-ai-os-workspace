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
        r"\b(risks?|block|blocked|issues?|problems?|stuck|danger|warning|overdue|delayed|bottleneck|critical|fail)\b",
    ]),
    (IntentType.TASK_RECOMMENDATION, [
        r"\b(what should i|recommend|suggest|priorit|next task|work on|start with|focus on)\b",
    ]),
    (IntentType.PROJECT_STATUS, [
        r"\b(progress|status|stage|how\s+(is|are|going)|completion|where.*(stand|are)|overview)\b",
    ]),
    (IntentType.ROADMAP, [
        r"\b(roadmap|timeline|future plan|plan ahead|what.*(next|coming))\b",
    ]),
    (IntentType.SPRINT_PLANNING, [
        r"\b(sprint|backlog|milestone|release|velocity|sprint plan)\b",
    ]),
    (IntentType.TASK_BREAKDOWN, [
        r"\b(break down|breakdown|subtask|sub-task|decompose|split task|divide)\b",
    ]),
    (IntentType.ARCHITECTURE_REVIEW, [
        r"\b(architect|architecture|structure|folder|file tree|design pattern|tech stack)\b",
    ]),
    (IntentType.CODE_REVIEW, [
        r"\b(code review|review code|check code|inspect|audit code|code quality|review.*(code|my code))\b",
    ]),
    (IntentType.IMPLEMENTATION_GUIDE, [
        r"\b(how (do|to|does) (i|we|to)|implement|build|create|setup|initialize|configure|write)\b",
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

    (IntentType.GENERAL_AI, [
        r"\b(explain|what is|what are|define|tell me about|difference between|compare)\b",
    ]),
    (IntentType.SMALL_TALK, [
        r"\b(weather|joke|fun|bored|tired|cool|nice|wow)\b",
    ]),
]

_GREETING_PATTERN = re.compile(
    r"\b(hello|hi|hey|good\s*morning|good\s*afternoon|good\s*evening|sup|yo|howdy|greetings|hola)\b",
    re.IGNORECASE,
)


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

        # Check if the message is ONLY a greeting (standalone greeting)
        is_standalone_greeting = bool(_GREETING_PATTERN.fullmatch(msg))

        # Check each intent pattern — track ALL matches, pick highest confidence
        best_intent = IntentType.UNKNOWN
        best_confidence = 0.0
        greeting_matched = False

        for intent_type, patterns in _INTENT_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, msg, re.IGNORECASE):
                    # Calculate confidence based on specificity
                    confidence = self._compute_confidence(intent_type, msg, pattern)
                    if intent_type == IntentType.GREETING:
                        greeting_matched = True
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_intent = intent_type
                    break  # One match per intent type is enough

        # Only return greeting if it's a standalone greeting or the sole match
        if greeting_matched and best_intent != IntentType.GREETING:
            # Another more specific intent won — prefer it
            pass
        elif greeting_matched and is_standalone_greeting:
            best_intent = IntentType.GREETING
            best_confidence = 0.95
        elif greeting_matched and not is_standalone_greeting:
            # Greeting word present but message has more content —
            # only keep greeting if nothing else matched
            if best_intent == IntentType.UNKNOWN or best_confidence < 0.5:
                best_intent = IntentType.GREETING
                best_confidence = 0.6

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
            IntentType.TASK_RECOMMENDATION: 0.85,
            IntentType.PROJECT_STATUS: 0.75,
            IntentType.PROJECT_HEALTH: 0.85,
            IntentType.SPRINT_PLANNING: 0.85,
            IntentType.ARCHITECTURE_REVIEW: 0.85,
            IntentType.CODE_REVIEW: 0.85,
            IntentType.IMPLEMENTATION_GUIDE: 0.85,
            IntentType.HOW_TO: 0.85,
            IntentType.PERFORMANCE: 0.85,
            IntentType.SECURITY: 0.85,
            IntentType.FOLLOW_UP: 0.70,
            IntentType.EXECUTE_ACTION: 0.75,
            IntentType.ROADMAP: 0.85,
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

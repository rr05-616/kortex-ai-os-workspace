"""Conversation Memory — Maintains session memory across the conversation."""

from __future__ import annotations

import time
import structlog
from .schemas import IntentType

logger = structlog.get_logger(__name__)


class ConversationMemory:
    """Maintains session-level memory for a conversation.

    Tracks current context, previous recommendations, and conversation state.
    """

    def __init__(self, session_id: str = "default"):
        self.session_id = session_id
        self.current_project: str | None = None
        self.current_sprint: str | None = None
        self.current_recommendation: str | None = None
        self.current_discussion: str | None = None
        self.current_goal: str | None = None
        self.accepted_suggestions: list[str] = []
        self.rejected_suggestions: list[str] = []
        self.previous_responses: list[dict] = []
        self.last_tool_calls: list[str] = []
        self.conversation_summary: str = ""
        self.discussed_tasks: list[str] = []
        self.discussed_sprints: list[str] = []
        self.last_intent: IntentType | None = None
        self.created_at: float = time.time()
        self.updated_at: float = time.time()

    def update_from_message(
        self,
        user_message: str,
        assistant_response: str,
        intent: IntentType,
        entities: dict[str, str],
    ) -> None:
        """Update memory after a user-assistant exchange."""
        self.updated_at = time.time()
        self.last_intent = intent

        # Track discussed tasks
        import re
        task_matches = re.findall(r'\*\*"([^"]+)"\*\*', assistant_response)
        for task in task_matches:
            if task not in self.discussed_tasks:
                self.discussed_tasks.append(task)

        # Track discussed sprints
        sprint_matches = re.findall(r'Sprint\s*\d+', assistant_response, re.IGNORECASE)
        for sprint in sprint_matches:
            if sprint not in self.discussed_sprints:
                self.discussed_sprints.append(sprint)

        # Update current recommendation
        if intent in (IntentType.TASK_RECOMMENDATION, IntentType.SPRINT_PLANNING):
            self.current_recommendation = assistant_response[:200]

        # Update current discussion
        self.current_discussion = assistant_response[:300]

        # Store response history (keep last 10)
        self.previous_responses.append({
            "user": user_message[:200],
            "assistant": assistant_response[:200],
            "intent": intent.value,
            "timestamp": self.updated_at,
        })
        if len(self.previous_responses) > 10:
            self.previous_responses = self.previous_responses[-10:]

        # Track entities
        if "task_name" in entities:
            name = entities["task_name"]
            if name not in self.discussed_tasks:
                self.discussed_tasks.append(name)

        if "sprint_number" in entities:
            sprint = f"Sprint {entities['sprint_number']}"
            if sprint not in self.discussed_sprints:
                self.discussed_sprints.append(sprint)

        logger.info(
            "memory.updated",
            session=self.session_id,
            intent=intent.value,
            discussed_tasks=len(self.discussed_tasks),
        )

    def get_context_string(self) -> str:
        """Return a string representation of memory for the LLM prompt."""
        parts = []
        if self.current_project:
            parts.append(f"Current project: {self.current_project}")
        if self.current_sprint:
            parts.append(f"Current sprint: {self.current_sprint}")
        if self.discussed_tasks:
            parts.append(f"Tasks discussed: {', '.join(self.discussed_tasks[-5:])}")
        if self.discussed_sprints:
            parts.append(f"Sprints discussed: {', '.join(self.discussed_sprints[-3:])}")
        if self.current_recommendation:
            parts.append(f"Last recommendation: {self.current_recommendation[:100]}...")
        if self.last_intent:
            parts.append(f"Last intent: {self.last_intent.value}")

        return "\n".join(parts) if parts else "Fresh conversation — no previous context."

    def is_follow_up(self, message: str) -> bool:
        """Detect if a message is likely a follow-up to previous context."""
        msg = message.lower().strip()
        word_count = len(msg.split())

        # Short messages are likely follow-ups
        if word_count > 10:
            return False

        follow_up_words = {
            "why", "how", "continue", "explain", "more", "details",
            "review", "improve", "do it", "start", "next", "and",
            "what about", "should i", "can you", "could you",
            "it", "this", "that", "them", "those",
        }

        return any(
            msg == word or msg.startswith(word)
            for word in follow_up_words
        )

    def get_recent_context(self, n: int = 5) -> list[dict]:
        """Get the last n conversation exchanges."""
        return self.previous_responses[-n:]

    def clear(self) -> None:
        """Reset all memory."""
        self.__init__(self.session_id)

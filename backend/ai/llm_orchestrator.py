"""LLM Orchestrator — Only module that communicates with Gemini/OpenAI."""

from __future__ import annotations

import os
import structlog

logger = structlog.get_logger(__name__)


class LLMOrchestrator:
    """Communicates with LLM providers (Gemini, OpenAI).

    Never called directly from routes — always through AIAgent.
    Supports Gemini (primary) and OpenAI (fallback).
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self._gemini_client = None
        self._openai_client = None

    def _get_gemini(self):
        if self._gemini_client is None and self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                self._gemini_client = genai.GenerativeModel("gemini-2.0-flash")
            except Exception as e:
                logger.warning("gemini.init.failed", error=str(e))
        return self._gemini_client

    def _get_openai(self):
        if self._openai_client is None and self.openai_key:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=self.openai_key)
            except Exception as e:
                logger.warning("openai.init.failed", error=str(e))
        return self._openai_client

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> str:
        """Generate a response using the best available LLM.

        Tries Gemini first, falls back to OpenAI, then to a rule-based fallback.
        """
        logger.info("llm_orchestrator.generate", message=user_message[:80])

        # Try Gemini first
        if self.gemini_key:
            result = await self._generate_gemini(
                system_prompt, user_message, conversation_history
            )
            if result:
                return result

        # Try OpenAI
        if self.openai_key:
            result = await self._generate_openai(
                system_prompt, user_message, conversation_history
            )
            if result:
                return result

        # Rule-based fallback (never returns empty)
        return self._generate_fallback(user_message)

    async def _generate_gemini(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict[str, str]] | None,
    ) -> str | None:
        """Generate using Google Gemini."""
        try:
            model = self._get_gemini()
            if not model:
                return None

            # Build chat with history
            chat_history = []
            if history:
                for msg in history[-10:]:
                    role = "user" if msg.get("role") == "user" else "model"
                    chat_history.append({
                        "role": role,
                        "parts": [msg.get("content", "")],
                    })

            chat = model.start_chat(history=chat_history)
            response = chat.send_message(
                f"{system_prompt}\n\n---\n\nUser: {user_message}"
            )
            return response.text
        except Exception as e:
            logger.error("gemini.generate.failed", error=str(e))
            return None

    async def _generate_openai(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict[str, str]] | None,
    ) -> str | None:
        """Generate using OpenAI."""
        try:
            client = self._get_openai()
            if not client:
                return None

            messages = [{"role": "system", "content": system_prompt}]
            if history:
                for msg in history[-10:]:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", ""),
                    })
            messages.append({"role": "user", "content": user_message})

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=2000,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("openai.generate.failed", error=str(e))
            return None

    def _generate_fallback(self, message: str) -> str:
        """Rule-based fallback when no LLM is available."""
        msg = message.lower()

        if any(g in msg for g in ["hello", "hi", "hey"]):
            return "Hello! I'm your KORTEX AI workspace agent. Ask me about your project, tasks, or architecture."

        if "what should i work on" in msg:
            return (
                "**Analysis:** I need workspace context to provide specific recommendations.\n\n"
                "**Next step:** Create a project and add tasks, then ask me again."
            )

        if "risk" in msg or "block" in msg:
            return (
                "**Risk Analysis:** I need to scan your workspace for risks.\n\n"
                "**Next step:** Import a project or create tasks, then I'll analyze risks."
            )

        return (
            "I can help with project analysis, task recommendations, sprint planning, "
            "risk assessment, and architecture reviews. What would you like to investigate?"
        )

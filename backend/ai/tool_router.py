"""Tool Router — Maps intents to tools and determines execution order."""

from __future__ import annotations

import structlog
from .schemas import IntentType, IntentResult, ToolCall

logger = structlog.get_logger(__name__)


class ToolRouter:
    """Dynamically determines which tools to execute based on intent.

    No hardcoded workflows — intent-driven tool selection.
    """

    # Intent → ordered list of tool calls
    _INTENT_TOOLS: dict[IntentType, list[ToolCall]] = {
        IntentType.TASK_RECOMMENDATION: [
            ToolCall(tool_name="get_actionable_tasks"),
            ToolCall(tool_name="get_dependencies"),
            ToolCall(tool_name="get_sprint_context"),
            ToolCall(tool_name="rank_tasks"),
        ],
        IntentType.PROJECT_STATUS: [
            ToolCall(tool_name="get_project_status"),
            ToolCall(tool_name="get_metrics"),
            ToolCall(tool_name="get_sprint_context"),
        ],
        IntentType.PROJECT_HEALTH: [
            ToolCall(tool_name="get_project_health"),
            ToolCall(tool_name="get_risks"),
            ToolCall(tool_name="get_metrics"),
        ],
        IntentType.RISK_ANALYSIS: [
            ToolCall(tool_name="get_risks"),
            ToolCall(tool_name="get_overdue_tasks"),
            ToolCall(tool_name="get_dependencies"),
            ToolCall(tool_name="analyze_risk"),
        ],
        IntentType.SPRINT_PLANNING: [
            ToolCall(tool_name="get_sprint_context"),
            ToolCall(tool_name="get_actionable_tasks"),
            ToolCall(tool_name="get_velocity"),
            ToolCall(tool_name="plan_sprint"),
        ],
        IntentType.TASK_BREAKDOWN: [
            ToolCall(tool_name="get_task_details"),
            ToolCall(tool_name="get_dependencies"),
            ToolCall(tool_name="break_down_task"),
        ],
        IntentType.ARCHITECTURE_REVIEW: [
            ToolCall(tool_name="get_repository_analysis"),
            ToolCall(tool_name="get_tech_stack"),
            ToolCall(tool_name="analyze_architecture"),
        ],
        IntentType.CODE_REVIEW: [
            ToolCall(tool_name="get_repository_analysis"),
            ToolCall(tool_name="get_code_quality"),
        ],
        IntentType.IMPLEMENTATION_GUIDE: [
            ToolCall(tool_name="get_task_details"),
            ToolCall(tool_name="get_architecture"),
            ToolCall(tool_name="generate_guide"),
        ],
        IntentType.PERFORMANCE: [
            ToolCall(tool_name="get_performance_metrics"),
            ToolCall(tool_name="get_bottlenecks"),
        ],
        IntentType.SECURITY: [
            ToolCall(tool_name="get_security_analysis"),
            ToolCall(tool_name="get_vulnerabilities"),
        ],
        IntentType.EXECUTE_ACTION: [
            ToolCall(tool_name="get_task_details"),
            ToolCall(tool_name="execute_action"),
        ],
        IntentType.FOLLOW_UP: [
            ToolCall(tool_name="get_previous_context"),
            ToolCall(tool_name="continue_analysis"),
        ],
    }

    def route(self, intent: IntentResult) -> list[ToolCall]:
        """Return ordered list of tool calls for the given intent."""
        tools = self._INTENT_TOOLS.get(intent.intent, [
            ToolCall(tool_name="get_overview"),
        ])

        # Add entity-specific tools if entities are present
        if intent.entities.get("task_name"):
            tools.insert(0, ToolCall(
                tool_name="get_task_by_name",
                arguments={"name": intent.entities["task_name"]},
            ))

        if intent.entities.get("sprint_number"):
            tools.insert(0, ToolCall(
                tool_name="get_sprint_by_number",
                arguments={"number": intent.entities["sprint_number"]},
            ))

        logger.info(
            "tool_router.routed",
            intent=intent.intent.value,
            tools=[t.tool_name for t in tools],
        )
        return tools

    def execute_tools(
        self,
        tools: list[ToolCall],
        context_data: dict,
    ) -> list[dict]:
        """Execute tool calls against the context data.

        Returns list of tool results.
        """
        results = []
        for tool in tools:
            result = self._execute_single(tool, context_data)
            results.append(result)
        return results

    def _execute_single(self, tool: ToolCall, data: dict) -> dict:
        """Execute a single tool call."""
        tool_name = tool.tool_name

        # Map tool names to data keys
        tool_map = {
            "get_actionable_tasks": lambda d: d.get("tasks", []),
            "get_dependencies": lambda d: {"dependencies": []},
            "get_sprint_context": lambda d: d.get("sprints", []),
            "get_project_status": lambda d: d.get("status", {}),
            "get_metrics": lambda d: d.get("metrics", {}),
            "get_project_health": lambda d: d.get("status", {}),
            "get_risks": lambda d: d.get("risks", []),
            "get_overdue_tasks": lambda d: d.get("overdue", []),
            "get_repository_analysis": lambda d: d.get("analyses", []),
            "get_tech_stack": lambda d: d.get("tech_stack", {}),
            "get_overview": lambda d: d.get("overview", {}),
            "get_velocity": lambda d: {"velocity": "calculated"},
            "rank_tasks": lambda d: {"ranked": True},
            "get_task_details": lambda d: tool.arguments,
            "get_task_by_name": lambda d: tool.arguments,
            "get_sprint_by_number": lambda d: tool.arguments,
            "get_previous_context": lambda d: d.get("context_summary", ""),
            "analyze_risk": lambda d: {"analysis": "completed"},
            "plan_sprint": lambda d: {"planned": True},
            "break_down_task": lambda d: {"broken_down": True},
            "analyze_architecture": lambda d: {"analyzed": True},
            "get_code_quality": lambda d: {"quality": "assessed"},
            "generate_guide": lambda d: {"guide": "generated"},
            "get_performance_metrics": lambda d: {"metrics": "collected"},
            "get_bottlenecks": lambda d: {"bottlenecks": []},
            "get_security_analysis": lambda d: {"analysis": "completed"},
            "get_vulnerabilities": lambda d: {"vulnerabilities": []},
            "execute_action": lambda d: {"executed": True},
            "continue_analysis": lambda d: {"continued": True},
        }

        handler = tool_map.get(tool_name, lambda d: {"result": "no_handler"})

        try:
            result_data = handler(data)
            return {
                "tool_name": tool_name,
                "success": True,
                "data": result_data,
            }
        except Exception as e:
            return {
                "tool_name": tool_name,
                "success": False,
                "error": str(e),
            }

from __future__ import annotations


def create_plan(task: str) -> list[str]:
    lowered = task.lower()

    if any(keyword in lowered for keyword in ("website", "landing page", "portfolio", "frontend", "ui", "ui/ux")):
        return [
            "Clarify the target audience, layout, and must-have sections",
            "Design the page structure and content hierarchy",
            "Implement the visual layout, styles, and interactions",
            "Check responsiveness, accessibility, and copy quality",
            "Refine the result and prepare the final handoff",
        ]

    if any(keyword in lowered for keyword in ("bug", "error", "fix", "broken", "issue")):
        return [
            "Reproduce the issue and isolate the failing path",
            "Identify the root cause and confirm the exact failure mode",
            "Apply the smallest safe fix",
            "Verify the fix against nearby edge cases",
            "Summarize the change and any follow-up checks",
        ]

    if any(keyword in lowered for keyword in ("refactor", "cleanup", "restructure", "architecture")):
        return [
            "Map the current structure and identify coupling points",
            "Decide the target architecture and migration steps",
            "Refactor incrementally to keep behavior stable",
            "Run validation to ensure nothing regressed",
            "Document the new shape and remaining risks",
        ]

    if any(keyword in lowered for keyword in ("api", "backend", "endpoint", "route", "service")):
        return [
            "Define the request, response, and data flow clearly",
            "Implement the server-side logic with error handling",
            "Connect persistence or external integrations if needed",
            "Validate inputs, outputs, and failure cases",
            "Review the result for correctness and maintainability",
        ]

    return [
        "Clarify the goal and success criteria",
        "Break the task into ordered implementation steps",
        "Implement the core solution",
        "Validate behavior and edge cases",
        "Refine the result and summarize the outcome",
    ]
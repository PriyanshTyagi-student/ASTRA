from __future__ import annotations

import json
from dataclasses import dataclass

from app.services.executor import execute_plan
from app.services.memory import memory_store
from app.services.model_client import call_model
from app.services.planner import create_plan


@dataclass
class AIResult:
    response: str
    mode: str = "chat"
    plan: list[str] | None = None
    execution: list[str] | None = None
    code: str | None = None
    artifacts: list[str] | None = None


@dataclass
class PendingPlan:
    request: str
    plan: list[str]


_pending_plan: PendingPlan | None = None


_EXPLICIT_APPROVAL_COMMANDS = {
    "/approve",
    "approve plan",
    "approve and implement",
}


_CHANGE_KEYWORDS = {
    "change",
    "update",
    "modify",
    "revise",
    "instead",
    "adjust",
    "not this",
}


def _is_approval_message(message: str) -> bool:
    lowered = message.lower().strip()
    return lowered in _EXPLICIT_APPROVAL_COMMANDS


def _is_change_request(message: str) -> bool:
    lowered = message.lower().strip()
    return any(keyword in lowered for keyword in _CHANGE_KEYWORDS)


def _detect_intent(message: str) -> str:
    lowered = message.lower().strip()
    if "build" in lowered or "create" in lowered:
        return "agent"
    if any(keyword in lowered for keyword in ["code", "generate code", "write code", "component", "function", "class"]):
        return "code"
    return "chat"


async def _generate_code(message: str) -> tuple[str, str]:
    prompt = (
        "Generate code for the following request. "
        "Return a JSON object with keys: filename, language, code, summary. "
        f"Request: {message}"
    )
    raw = await call_model(prompt, temperature=0.25)
    try:
        parsed = json.loads(raw)
        if all(key in parsed for key in ["filename", "language", "code"]):
            return json.dumps({
                "type": "code_generation",
                "filename": str(parsed["filename"]),
                "language": str(parsed["language"]),
                "code": str(parsed["code"]),
                "summary": str(parsed.get("summary", "Generated code from ASTRA.")),
            }), str(parsed["code"])
    except json.JSONDecodeError:
        pass

    fallback_code = (
        "export function generatedFeature(input: string): string {\n"
        "  return `ASTRA generated: ${input}`;\n"
        "}\n"
    )
    payload = {
        "type": "code_generation",
        "filename": "generated-feature.ts",
        "language": "typescript",
        "code": fallback_code,
        "summary": "Generated a TypeScript starter from ASTRA.",
    }
    return json.dumps(payload), fallback_code


async def _generate_project(message: str) -> AIResult:
    global _pending_plan

    plan = create_plan(message)
    _pending_plan = PendingPlan(request=message, plan=plan)

    summary = [
        "Here is the proposed plan:",
        *[f"{index + 1}. {step}" for index, step in enumerate(plan)],
        "",
        "Reply with '/approve' to execute this plan, or describe changes you want before implementation.",
    ]

    return AIResult(
        response="\n".join(summary),
        mode="chat",
        plan=plan,
        execution=[],
        artifacts=[],
    )


async def _execute_pending_plan() -> AIResult:
    global _pending_plan

    if _pending_plan is None:
        return AIResult(
            response="There is no pending plan to execute. Ask me to create a plan first.",
            mode="chat",
        )

    execution = execute_plan(
        _pending_plan.plan,
        project_name="astra_project",
        request_text=_pending_plan.request,
    )
    landing_entry = next((path for path in execution["artifacts"] if path.endswith("frontend\\index.html")), None)
    response = [
        "Approved. I implemented your request.",
        f"Created {len(execution['artifacts'])} files in {execution['project_path']}.",
        f"Landing page entry file: {landing_entry}" if landing_entry else "",
        "If you want, ask for execution details and I will show the full step-by-step log.",
    ]

    result = AIResult(
        response="\n".join(line for line in response if line),
        mode="chat",
        plan=_pending_plan.plan,
        execution=execution["execution_log"],
        artifacts=execution["artifacts"],
    )
    _pending_plan = None
    return result


async def process_input(message: str) -> AIResult:
    global _pending_plan

    if _pending_plan is not None:
        if _is_approval_message(message):
            return await _execute_pending_plan()

        if message.lower().strip() in {"approve", "yes", "go ahead", "proceed"}:
            return AIResult(
                response=(
                    "I have the plan ready, but I need explicit confirmation. "
                    "Reply with '/approve' to execute, or send changes to revise the plan."
                ),
                mode="chat",
            )

        if _is_change_request(message):
            revised_request = f"{_pending_plan.request}. Requested changes: {message}"
            _pending_plan = None
            return await _generate_project(revised_request)

        return AIResult(
            response=(
                "A plan is waiting for approval. Reply with '/approve' to execute it, "
                "or send the changes you want."
            ),
            mode="chat",
        )

    intent = _detect_intent(message)

    if intent == "agent":
        return await _generate_project(message)

    if intent == "code":
        code_json, code = await _generate_code(message)
        return AIResult(
            response=code_json,
            mode="code",
            code=code,
        )

    recent_topics = memory_store.recent_topics(limit=5)
    prompt = (
        "You are ASTRA, a modular AI assistant. Answer the user with clear structure. "
        "If a plan helps, include a short numbered plan. If code is needed, wrap it in markdown fences. "
        f"Recent context: {recent_topics[:2]}\nUser message: {message}"
    )
    response = await call_model(prompt, temperature=0.6)
    return AIResult(response=response, mode="chat")


async def chat(message: str) -> AIResult:
    result = await process_input(message)
    memory_store.save_message(message, result.response, mode=result.mode)
    return result

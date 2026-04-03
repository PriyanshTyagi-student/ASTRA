import json
import re
from dataclasses import dataclass
from typing import List


@dataclass
class CommandResult:
    action: str = "none"
    url: str | None = None


class LocalAIEngine:
    """A fully local, rules-and-heuristics AI engine with no external model/API calls."""

    def __init__(self) -> None:
        self._greeting_keywords = {"hi", "hello", "hey", "yo"}
        self._code_keywords = {
            "code",
            "function",
            "class",
            "api",
            "script",
            "bug",
            "debug",
            "component",
            "react",
            "python",
            "typescript",
        }

    def parse_command(self, message: str) -> CommandResult:
        text = message.strip().lower()

        if text.startswith("open "):
            candidate = message.strip()[5:].strip()
            url = self._normalize_url(candidate)
            if url:
                return CommandResult(action="open_url", url=url)

        if text.startswith("search "):
            query = message.strip()[7:].strip()
            if query:
                return CommandResult(action="open_url", url=f"https://www.google.com/search?q={query.replace(' ', '+')}")

        url_match = re.search(r"https?://[^\s]+", message)
        if url_match:
            return CommandResult(action="open_url", url=url_match.group(0))

        return CommandResult(action="none", url=None)

    def respond(self, message: str, recent_topics: List[str]) -> str:
        clean = message.strip()
        lower = clean.lower()

        if self._is_greeting(lower):
            return "Hello. I am your standalone local AI. I can help with planning, coding, debugging, UI ideas, and commands without calling external AI APIs."

        if self._looks_like_code_request(lower):
            return self._generate_code_payload(clean)

        if "plan" in lower or "roadmap" in lower:
            return self._plan_response(clean)

        if "debug" in lower or "error" in lower or "fix" in lower:
            return self._debug_response(clean, recent_topics)

        return self._general_response(clean, recent_topics)

    def _is_greeting(self, lower: str) -> bool:
        tokens = set(re.findall(r"[a-z]+", lower))
        return bool(tokens & self._greeting_keywords)

    def _looks_like_code_request(self, lower: str) -> bool:
        tokens = set(re.findall(r"[a-z]+", lower))
        return bool(tokens & self._code_keywords) or "create" in lower or "build" in lower

    def _generate_code_payload(self, prompt: str) -> str:
        language = "typescript"
        filename = "generated.ts"

        lower = prompt.lower()
        if "python" in lower:
            language = "python"
            filename = "generated.py"
            code = (
                "def main() -> None:\n"
                "    \"\"\"Entry point for generated script.\"\"\"\n"
                "    print('Hello from your standalone local AI.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
        elif "react" in lower or "component" in lower or "ui" in lower:
            language = "typescript"
            filename = "GeneratedCard.tsx"
            code = (
                "type GeneratedCardProps = {\n"
                "  title: string\n"
                "  subtitle?: string\n"
                "}\n\n"
                "export function GeneratedCard({ title, subtitle }: GeneratedCardProps) {\n"
                "  return (\n"
                "    <section className=\"rounded-xl border border-zinc-700 bg-zinc-900 p-4\">\n"
                "      <h3 className=\"text-lg font-semibold text-zinc-100\">{title}</h3>\n"
                "      {subtitle ? <p className=\"mt-1 text-sm text-zinc-400\">{subtitle}</p> : null}\n"
                "    </section>\n"
                "  )\n"
                "}\n"
            )
        else:
            code = (
                "export function generatedUtility(input: string): string {\n"
                "  const normalized = input.trim();\n"
                "  if (!normalized) return 'No input provided';\n"
                "  return `Processed: ${normalized}`;\n"
                "}\n"
            )

        payload = {
            "type": "code_generation",
            "filename": filename,
            "language": language,
            "code": code,
            "summary": f"Generated {filename} using the standalone local AI engine.",
        }
        return json.dumps(payload)

    def _plan_response(self, prompt: str) -> str:
        return (
            "Local execution plan:\n"
            "1. Clarify the goal and constraints from your prompt.\n"
            "2. Break work into backend, frontend, and testing milestones.\n"
            "3. Implement the smallest vertical slice first.\n"
            "4. Validate with real input/output checks.\n"
            f"5. Iterate based on feedback for: {prompt[:120]}"
        )

    def _debug_response(self, prompt: str, recent_topics: List[str]) -> str:
        context_hint = ""
        if recent_topics:
            context_hint = f" Recent context: {recent_topics[0][:80]}"
        return (
            "Debug workflow:\n"
            "1. Reproduce the issue exactly once.\n"
            "2. Capture the failing input and stack trace.\n"
            "3. Isolate one smallest suspect module.\n"
            "4. Patch and retest with the original failing case.\n"
            f"I can help step-by-step for your issue: {prompt[:140]}.{context_hint}"
        )

    def _general_response(self, prompt: str, recent_topics: List[str]) -> str:
        if recent_topics:
            return (
                "I am running fully local with no external AI APIs. "
                f"You asked: \"{prompt[:180]}\". "
                "Based on your recent conversation, I can propose architecture, generate starter code, or create a step-by-step execution checklist."
            )
        return (
            "I am your standalone local AI engine. "
            f"You asked: \"{prompt[:180]}\". "
            "Tell me whether you want planning, code generation, debugging, UI design, or command handling and I will respond in that mode."
        )

    @staticmethod
    def _normalize_url(text: str) -> str | None:
        candidate = text.strip()
        if not candidate:
            return None

        if re.match(r"^https?://", candidate, flags=re.IGNORECASE):
            return candidate

        if re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$", candidate):
            return f"https://{candidate}"

        return None

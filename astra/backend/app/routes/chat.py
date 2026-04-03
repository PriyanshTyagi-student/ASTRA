from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from pathlib import Path

from app.schemas.chat import ChatRequest, ChatResponse, CodeRequest, ProjectRequest, HistoryItem, HistoryResponse
from app.services.ai_service import chat as chat_service, process_input
from app.services.memory import memory_store
from app.services.file_service import FileService

router = APIRouter()


@router.post("/command")
async def command_route(request: ChatRequest) -> dict:
    message = request.message.strip().lower()

    if message.startswith("open "):
        target = request.message.strip()[5:].strip()
        if target.startswith("http://") or target.startswith("https://"):
            return {"action": "open_url", "url": target}
        if "." in target:
            return {"action": "open_url", "url": f"https://{target}"}

    return {"action": "none", "details": {"message": request.message}}


@router.post("/chat", response_model=ChatResponse)
async def chat_route(request: ChatRequest) -> ChatResponse:
    result = await chat_service(request.message)
    return ChatResponse(
        type="code" if result.mode == "code" else "chat",
        response=result.response,
        mode=result.mode,
        plan=result.plan or [],
        code=result.code,
        execution=result.execution or [],
        artifacts=result.artifacts or [],
    )


@router.post("/generate-code", response_model=ChatResponse)
async def generate_code_route(request: CodeRequest) -> ChatResponse:
    result = await process_input(f"Generate code: {request.prompt} in {request.language}")
    return ChatResponse(
        type="code" if result.mode == "code" else "chat",
        response=result.response,
        mode=result.mode,
        plan=result.plan or [],
        code=result.code,
        execution=result.artifacts or [],
        artifacts=result.artifacts or [],
    )


@router.post("/generate-project", response_model=ChatResponse)
async def generate_project_route(request: ProjectRequest) -> ChatResponse:
    result = await process_input(f"Create project: {request.prompt}")
    return ChatResponse(
        type="agent" if result.mode == "agent" else "chat",
        response=result.response,
        mode=result.mode,
        plan=result.plan or [],
        code=result.code,
        execution=result.artifacts or [],
        artifacts=result.artifacts or [],
    )


@router.get("/history", response_model=HistoryResponse)
async def history_route(limit: int = Query(100, ge=1, le=500)) -> HistoryResponse:
    history = [HistoryItem.model_validate(item) for item in memory_store.get_history(limit=limit)]
    return HistoryResponse(history=history, total=len(history))


@router.get("/memory", response_model=HistoryResponse)
async def memory_route(limit: int = Query(100, ge=1, le=500)) -> HistoryResponse:
    history = [HistoryItem.model_validate(item) for item in memory_store.get_history(limit=limit)]
    return HistoryResponse(history=history, total=len(history))


@router.delete("/history")
async def clear_history_route() -> dict:
    count = memory_store.clear_history()
    return {"message": f"Cleared {count} history records", "count": count}


@router.delete("/memory")
async def clear_memory_route() -> dict:
    count = memory_store.clear_history()
    return {"message": f"Cleared {count} memory records", "count": count}


@router.post("/save-code")
async def save_code_route(request: CodeRequest) -> dict:
    """Save generated code to workspace and return file info."""
    try:
        result = FileService.save_code_file(
            filename=request.filename or "generated.js",
            code=request.code or "",
            language=request.language or "javascript",
            project_name=request.project_name or "astra-project",
        )
        # Try to open in VS Code
        open_result = await FileService.open_in_vscode(result["project_dir"])
        result["vscode_opened"] = open_result["success"]
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/preview/file")
async def preview_file_route(file_path: str = Query(...)) -> dict:
    """Get file content for preview."""
    return FileService.read_file(file_path)


@router.get("/preview/html")
async def preview_html_route(file_path: str = Query(...)) -> FileResponse:
    """Serve HTML file for preview in iframe."""
    try:
        path = Path(file_path).absolute()
        if not path.exists() or path.suffix.lower() != ".html":
            # Return a blank HTML if file not found
            return FileResponse(
                content=b"<html><body><p>File not found</p></body></html>",
                media_type="text/html",
            )
        return FileResponse(path, media_type="text/html")
    except Exception as e:
        return FileResponse(
            content=f"<html><body><p>Error: {str(e)}</p></body></html>".encode(),
            media_type="text/html",
        )


@router.post("/open-vscode")
async def open_vscode_route(request: dict) -> dict:
    """Open a folder in VS Code."""
    folder_path = request.get("folder_path", "")
    return await FileService.open_in_vscode(folder_path)

"""File management service for saving generated code and opening in VS Code."""

from __future__ import annotations

import asyncio
import json
import platform
import subprocess
from datetime import datetime
from pathlib import Path


# Workspace directory where generated files are saved
WORKSPACE_DIR = Path(__file__).parent.parent.parent.parent / "workspace"


class FileService:
    """Handles file operations for generated code."""

    @staticmethod
    def get_workspace_dir() -> Path:
        """Get or create workspace directory."""
        WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
        return WORKSPACE_DIR

    @staticmethod
    def save_code_file(
        filename: str,
        code: str,
        language: str,
        project_name: str = "untitled",
    ) -> dict:
        """
        Save generated code to file and return metadata.

        Returns:
            {
                "file_path": "workspace/project-name/filename.ext",
                "full_path": "/absolute/path/to/file",
                "project_dir": "/absolute/path/to/project",
                "filename": "filename.ext",
                "language": "javascript",
                "timestamp": "2026-04-03T05:03:36"
            }
        """
        workspace = FileService.get_workspace_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = workspace / f"{project_name}_{timestamp}"
        project_dir.mkdir(parents=True, exist_ok=True)

        file_path = project_dir / filename
        file_path.write_text(code, encoding="utf-8")

        return {
            "file_path": str(file_path.relative_to(workspace.parent)),
            "full_path": str(file_path.absolute()),
            "project_dir": str(project_dir.absolute()),
            "filename": filename,
            "language": language,
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    def save_project(
        files: list[dict[str, str]],
        project_name: str = "astra-project",
    ) -> dict:
        """
        Save multiple files to a project directory.

        Args:
            files: List of {"filename": "...", "code": "...", "language": "..."}

        Returns:
            {
                "project_name": "astra-project_20260403_050336",
                "project_dir": "/absolute/path/to/project",
                "files_saved": 5,
                "file_paths": [{"filename": "...", "path": "..."}],
                "timestamp": "2026-04-03T05:03:36"
            }
        """
        workspace = FileService.get_workspace_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = workspace / f"{project_name}_{timestamp}"
        project_dir.mkdir(parents=True, exist_ok=True)

        saved_files = []
        for file_data in files:
            filename = file_data.get("filename", "file.txt")
            code = file_data.get("code", "")
            language = file_data.get("language", "text")

            file_path = project_dir / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(code, encoding="utf-8")

            saved_files.append({
                "filename": filename,
                "path": str(file_path.relative_to(workspace.parent)),
                "language": language,
            })

        return {
            "project_name": project_dir.name,
            "project_dir": str(project_dir.absolute()),
            "files_saved": len(saved_files),
            "file_paths": saved_files,
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    async def open_in_vscode(folder_path: str) -> dict:
        """
        Open a folder in VS Code.

        Returns:
            {"success": true/false, "message": "..."}
        """
        try:
            folder_path = Path(folder_path).absolute()
            if not folder_path.exists():
                return {"success": False, "message": f"Folder does not exist: {folder_path}"}

            system = platform.system()

            if system == "Windows":
                # Use PowerShell to open in VS Code (handles spaces in paths)
                cmd = f'code "{folder_path}"'
                await asyncio.to_thread(subprocess.Popen, cmd, shell=True)
            elif system == "Darwin":  # macOS
                await asyncio.to_thread(
                    subprocess.run,
                    ["open", "-a", "Visual Studio Code", str(folder_path)],
                    check=True,
                )
            elif system == "Linux":
                await asyncio.to_thread(
                    subprocess.run,
                    ["code", str(folder_path)],
                    check=True,
                )

            return {
                "success": True,
                "message": f"Opened {folder_path} in VS Code",
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to open in VS Code: {str(e)}",
            }

    @staticmethod
    def read_file(file_path: str) -> dict:
        """Read file content for preview."""
        try:
            path = Path(file_path).absolute()
            if not path.exists():
                return {"success": False, "error": "File not found"}

            content = path.read_text(encoding="utf-8")
            return {
                "success": True,
                "filename": path.name,
                "content": content,
                "language": path.suffix.lstrip(".") or "text",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def list_project_files(project_dir: str) -> dict:
        """List all files in a project directory."""
        try:
            project_path = Path(project_dir).absolute()
            if not project_path.exists():
                return {"success": False, "error": "Project directory not found"}

            files = []
            for file_path in project_path.rglob("*"):
                if file_path.is_file():
                    files.append({
                        "filename": file_path.name,
                        "path": str(file_path.absolute()),
                        "relative_path": str(file_path.relative_to(project_path)),
                        "size": file_path.stat().st_size,
                    })

            return {
                "success": True,
                "project_dir": str(project_path),
                "file_count": len(files),
                "files": files,
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

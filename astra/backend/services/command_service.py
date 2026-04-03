def detect_command(message: str) -> dict[str, str] | None:
    normalized = " ".join(message.lower().strip().split())

    command_map = {
        "open youtube": "https://youtube.com",
        "open google": "https://google.com",
    }

    if normalized in command_map:
        return {"action": "open_url", "url": command_map[normalized]}

    return None

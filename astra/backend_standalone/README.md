# ASTRA Standalone Local Backend

This backend is fully local and does not call external AI APIs.

## Features
- FastAPI server with frontend-compatible endpoints
- Local in-house AI engine (rules + heuristics)
- SQLite conversation memory
- CORS configured for local frontend

## Endpoints
- `GET /status`
- `GET /health`
- `GET /history?limit=100`
- `POST /command` with `{ "message": "..." }`
- `POST /chat` with `{ "message": "..." }`

## Run
```bash
cd astra/backend_standalone
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

## Frontend Link
Set frontend env:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```
Then restart frontend dev server.

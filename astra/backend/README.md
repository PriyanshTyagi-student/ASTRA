# ASTRA Backend - Production-Ready AI System

A multi-agent AI system combining ChatGPT-like conversational AI, GitHub Copilot-like code generation, v0.dev-like UI component generation, and Jarvis-like command execution.

## 🚀 Features

### Multi-Agent Architecture
- **Chat Agent**: Natural conversational AI for general inquiries
- **Code Agent**: Generates clean, documented code (Python, JavaScript, etc.)
- **UI Agent**: Creates React components with Tailwind CSS
- **Command Agent**: Parses and executes user commands

### Core Features
- ✅ **Async/Await**: Full async support for high performance
- ✅ **SQLite Database**: Persistent chat history and memory storage
- ✅ **Agent-Based Routing**: Automatic detection of request type
- ✅ **Multiple AI Providers**: OpenAI and Groq support with fallback
- ✅ **CORS Enabled**: Ready for frontend integration
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Memory System**: Store and retrieve chat history

## 📦 Installation

1. **Install Python Dependencies**
```bash
cd astra/backend
pip install -r requirements.txt
```

2. **Environment Configuration**
Create `.env` file:
```
OPENAI_API_KEY=your_key_here
GROQ_API_KEY=your_groq_key_here
AI_PROVIDER=groq  # or "openai"
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./astra.db
DEBUG=true
HOST=127.0.0.1
PORT=8000
```

## 🚀 Running the Backend

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at `http://localhost:8000`

## 📚 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /status` - System status

### Chat & Conversations
- `POST /chat` - Send message to chat agent
- `GET /memory` - Retrieve chat history
- `GET /memory/{agent_name}` - Get history for specific agent
- `DELETE /memory` - Clear all history

### Code Generation
- `POST /generate-code` - Generate code
  ```json
  {
    "prompt": "Create a hello world function",
    "language": "python"
  }
  ```

### UI Generation
- `POST /generate-ui` - Generate React component
  ```json
  {
    "prompt": "Create a modern dashboard card",
    "framework": "react"
  }
  ```

### Command Execution
- `POST /command` - Execute command
  ```json
  {
    "message": "Open google.com"
  }
  ```

## 🏗️ Project Structure

```
backend/
├── main.py                     # FastAPI app entry point
├── core/
│   ├── config.py              # Configuration management
│   └── agent_manager.py       # Agent routing logic
├── agents/
│   ├── chat_agent.py          # Chat agent
│   ├── code_agent.py          # Code generation agent
│   ├── ui_agent.py            # UI component agent
│   └── command_agent.py       # Command execution agent
├── routes/
│   ├── chat.py                # Chat endpoints
│   ├── generate_code.py       # Code generation endpoints
│   ├── generate_ui.py         # UI generation endpoints
│   ├── command.py             # Command endpoints
│   ├── memory.py              # Memory/history endpoints
│   └── health.py              # Health check endpoints
├── services/
│   ├── openai_service.py      # AI provider integration
│   └── memory_service.py      # Chat history management
├── database/
│   └── models.py              # SQLAlchemy models
├── schemas/
│   └── request_models.py      # Pydantic request/response models
├── utils/
│   └── helpers.py             # Utility functions
├── .env                        # Environment configuration
└── requirements.txt            # Python dependencies
```

## 🤖 Agent System

The system automatically detects user intent and routes requests to the appropriate agent:

### Chat Agent
Handles general conversation requests.
- Keywords: Default fallback
- System Role: Helpful engineering assistant

### Code Agent
Generates programming code for any language.
- Keywords: "code", "function", "script", "debug", "implement"
- System Role: Expert programmer
- Output: Clean, commented, production-ready code

### UI Agent
Creates React components with Tailwind CSS styling.
- Keywords: "design", "component", "ui", "interface", "dashboard"
- System Role: Frontend designer
- Output: Beautiful, responsive components

### Command Agent
Parses and structures commands for execution.
- Keywords: "open", "run", "execute", "search", "navigate"
- System Role: Automation assistant
- Output: Structured JSON actions

## 🔄 AI Provider Support

### OpenAI (Default)
- Model: `gpt-4o-mini`
- Set: `AI_PROVIDER=openai`
- Requires: `OPENAI_API_KEY`

### Groq (Recommended)
- Model: `llama-3.3-70b-versatile`
- Set: `AI_PROVIDER=groq`
- Requires: `GROQ_API_KEY`
- Benefits: Faster, free tier available

## 💾 Database

SQLite database stores:
- User inputs
- AI responses
- Agent used
- Timestamps

Query history:
```bash
sqlite3 astra.db
sqlite> SELECT * FROM memory LIMIT 10;
```

## 🔐 Error Handling

The system includes comprehensive error handling:
- Authentication errors (invalid API keys)
- Rate limit handling
- Connection timeouts
- Request validation errors

## 📝 Logging

Logs are output to console. Configure logging level in `main.py`:
```python
logging.basicConfig(level=logging.INFO)
```

## 🚀 Production Deployment

### Gunicorn (Recommended)
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### Docker
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🧪 Testing

Test endpoints with curl:
```bash
# Health check
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Code generation
curl -X POST http://localhost:8000/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a hello function","language":"python"}'
```

## 📦 Dependencies

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `openai` - OpenAI/Groq API client
- `sqlalchemy` - ORM
- `pydantic` - Data validation
- `python-dotenv` - Environment management

## 🎯 Next Steps

1. Set up OpenAI or Groq API keys
2. Start the backend
3. Connect the frontend
4. Test all endpoints
5. Deploy to production

## 📞 Support

For issues or questions:
1. Check logs for error details
2. Verify API keys are correct
3. Ensure frontend CORS origin is in allowed list
4. Test endpoints with curl

---

**ASTRA** - Autonomous System for Tasks, Research & Automation
"# astra-backend" 
"# astra-backend" 
"# astra-backend" 

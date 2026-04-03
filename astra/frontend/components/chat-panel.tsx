'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, Send, Plus, X } from 'lucide-react'
import { Message } from './message'
import { CodeEditor } from './code-view'

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface CodeGenerationPayload {
  type: 'code_generation'
  filename: string
  language: 'typescript' | 'javascript' | 'json' | 'markdown' | 'css' | 'html' | 'python'
  code: string
  summary?: string
}

interface AgentResponsePayload {
  type: 'agent' | 'chat' | 'code'
  response: string
  mode?: string
  plan?: string[]
  execution?: string[]
  code?: string | null
  artifacts?: string[]
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! I\'m ASTRA, your AI assistant. How can I help you today?',
    sender: 'assistant',
    timestamp: new Date('2026-03-22T14:30:00'),
  },
  {
    id: '2',
    content: 'Can you help me build a dashboard?',
    sender: 'user',
    timestamp: new Date('2026-03-22T14:31:00'),
  },
  {
    id: '3',
    content: 'Absolutely! I can help you create a beautiful, responsive dashboard. I\'ll start by setting up the project structure and styling, then build interactive components.',
    sender: 'assistant',
    timestamp: new Date('2026-03-22T14:31:30'),
  },
]

interface ChatPanelProps {
  focusTrigger?: number
}

export function ChatPanel({ focusTrigger = 0 }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [hasLoadedStoredMessages, setHasLoadedStoredMessages] = useState(false)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [pendingCodeGeneration, setPendingCodeGeneration] = useState<CodeGenerationPayload | null>(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('astra-chat-messages')
      if (!saved) {
        return
      }

      const parsed = JSON.parse(saved) as Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>
      setMessages(
        parsed.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        }))
      )
    } catch {
      // Ignore malformed stored data and continue with initial messages.
    } finally {
      setHasLoadedStoredMessages(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedStoredMessages) {
      return
    }

    window.localStorage.setItem('astra-chat-messages', JSON.stringify(messages))
  }, [messages, hasLoadedStoredMessages])

  useEffect(() => {
    if (!hasLoadedStoredMessages) {
      return
    }

    const loadBackendHistory = async () => {
      try {
        const saved = window.localStorage.getItem('astra-chat-messages')
        if (saved) {
          return
        }

        const response = await fetch(`${BACKEND_BASE_URL}/history?limit=100`)
        if (!response.ok) {
          return
        }

        const data = await response.json() as { history: Array<{ id: number; user_message: string; ai_response: string; timestamp: string }> }
        if (data.history && data.history.length > 0) {
          const backendMessages: ChatMessage[] = data.history.flatMap((item) => [
            {
              id: `history-user-${item.id}`,
              content: item.user_message,
              sender: 'user' as const,
              timestamp: new Date(item.timestamp),
            },
            {
              id: `history-assistant-${item.id}`,
              content: item.ai_response,
              sender: 'assistant' as const,
              timestamp: new Date(item.timestamp),
            },
          ])
          setMessages((prev) => [...backendMessages, ...prev])
        }
      } catch {
        // Silently fail if backend history unavailable
      }
    }

    void loadBackendHistory()
  }, [hasLoadedStoredMessages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [focusTrigger])

  useEffect(() => {
    let mounted = true

    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/status`)
        if (mounted && response.ok) {
          setBackendStatus('online')
          return
        }
      } catch {
        // Ignore network errors and mark as offline below.
      }

      if (mounted) {
        setBackendStatus('offline')
      }
    }

    void checkBackendStatus()
    const intervalId = window.setInterval(() => {
      void checkBackendStatus()
    }, 15000)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const createMessageId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const tryParseCodeGeneration = (rawResponse: string): CodeGenerationPayload | null => {
    const normalized = rawResponse.trim()
    const jsonCandidate = (() => {
      if (normalized.startsWith('{') && normalized.endsWith('}')) {
        return normalized
      }

      const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i)
      return fencedMatch?.[1]?.trim() || ''
    })()

    if (!jsonCandidate) {
      return null
    }

    try {
      const parsed = JSON.parse(jsonCandidate) as Partial<CodeGenerationPayload>
      if (
        parsed.type === 'code_generation'
        && typeof parsed.filename === 'string'
        && typeof parsed.language === 'string'
        && typeof parsed.code === 'string'
      ) {
        return {
          type: 'code_generation',
          filename: parsed.filename.trim() || 'generated-file.ts',
          language: parsed.language as CodeGenerationPayload['language'],
          code: parsed.code,
          summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
        }
      }
    } catch {
      return null
    }

    return null
  }

  const applyGeneratedCodeToEditor = () => {
    if (!pendingCodeGeneration) {
      return
    }
    setShowCodeEditor(true)
  }

  const parseAgentResponse = async (message: string) => {
    const response = await fetch(`${BACKEND_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      throw new Error('Unable to process chat request.')
    }

    return response.json() as Promise<AgentResponsePayload>
  }

  const getAssistantResponse = async (message: string) => {
    const chatData = await parseAgentResponse(message)
    return chatData
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userInput = input.trim()

    if (userInput.toLowerCase() === '/clear') {
      handleNewChat()
      return
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      content: userInput,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    try {
      const assistantResponse = await getAssistantResponse(userMessage.content)
      const generatedPayload = assistantResponse.type === 'code'
        ? tryParseCodeGeneration(assistantResponse.response)
        : null

      if (generatedPayload) {
        setPendingCodeGeneration(generatedPayload)
      }

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        content: assistantResponse.type === 'agent'
          ? assistantResponse.response
          : assistantResponse.type === 'code'
            ? (generatedPayload?.summary || 'ASTRA generated code successfully.')
            : assistantResponse.response,
        sender: 'assistant',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: createMessageId(),
        content: 'I could not reach the backend. Please check if it is running on port 8000.',
        sender: 'assistant',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsThinking(false)
    }
  }

  const handleNewChat = () => {
    setIsThinking(false)
    setInput('')
    setMessages([
      {
        id: createMessageId(),
        content: 'New chat created. What would you like to work on?',
        sender: 'assistant',
        timestamp: new Date(),
      },
    ])
  }

  const handleExportTranscript = () => {
    const transcript = messages
      .map((message) => {
        const hh = String(message.timestamp.getHours()).padStart(2, '0')
        const mm = String(message.timestamp.getMinutes()).padStart(2, '0')
        return `[${hh}:${mm}] ${message.sender.toUpperCase()}: ${message.content}`
      })
      .join('\n')

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `astra-chat-${Date.now()}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (showCodeEditor && pendingCodeGeneration) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0f] border-r border-[#1a1a2e]">
        <div className="flex items-center justify-between p-3 border-b border-[#1a1a2e] bg-[#0f0f17]">
          <span className="text-sm font-medium text-[#e0e0e6]">Code Editor</span>
          <button
            onClick={() => setShowCodeEditor(false)}
            className="p-1 hover:bg-[#1a1a2e] rounded transition-colors"
          >
            <X className="w-4 h-4 text-[#a0a0a6]" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            filename={pendingCodeGeneration.filename}
            code={pendingCodeGeneration.code}
            language={pendingCodeGeneration.language}
            projectName="astra-project"
            onClose={() => setShowCodeEditor(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] border-r border-[#1a1a2e]">
      <div className="p-4 border-b border-[#1a1a2e] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e0e0e6]">Chat</h2>
          <p className="text-xs text-[#a0a0a6] flex items-center gap-2">
            <span>ASTRA Assistant</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-none ${
                backendStatus === 'online'
                  ? 'border-[#00ff88]/40 text-[#00ff88]'
                  : backendStatus === 'offline'
                    ? 'border-[#ff6666]/40 text-[#ff6666]'
                    : 'border-[#a0a0a6]/40 text-[#a0a0a6]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendStatus === 'online'
                    ? 'bg-[#00ff88]'
                    : backendStatus === 'offline'
                      ? 'bg-[#ff6666]'
                      : 'bg-[#a0a0a6]'
                }`}
              />
              {backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Offline' : 'Checking'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Export chat transcript"
            onClick={handleExportTranscript}
            className="p-2 rounded-lg bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] text-[#a0a0a6] hover:text-[#e0e0e6] transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Create new chat"
            onClick={handleNewChat}
            className="p-2 rounded-lg bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] text-[#00d9ff] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
          />
        ))}

        {isThinking && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#00d9ff] to-[#b100ff] text-[#0a0a0f] text-xs font-bold neon-glow-blue">
              A
            </div>
            <div className="flex items-center gap-1 bg-[#141420] border border-[#b100ff]/30 rounded-lg px-4 py-3 glow-box-violet">
              <span className="text-sm text-[#e0e0e6]">ASTRA is thinking</span>
              <span className="animate-typing">...</span>
            </div>
          </div>
        )}

        {pendingCodeGeneration && (
          <div className="rounded-lg border border-[#00d9ff]/40 bg-[#0f1720] p-3">
            <p className="text-sm text-[#e0e0e6]">
              Generated file ready: <span className="text-[#00d9ff]">{pendingCodeGeneration.filename}</span>
            </p>
            <p className="text-xs text-[#a0a0a6] mt-1">Language: {pendingCodeGeneration.language}</p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={applyGeneratedCodeToEditor}
                className="px-3 py-1.5 rounded-md bg-[#00d9ff] text-[#0a0a0f] text-xs font-semibold"
              >
                View in Editor
              </button>
              <button
                type="button"
                onClick={() => setPendingCodeGeneration(null)}
                className="px-3 py-1.5 rounded-md bg-[#1a1a2e] text-[#a0a0a6] text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#1a1a2e] space-y-4 bg-[#0f0f17]/50">
        <div className="flex flex-wrap gap-2">
          {['Build dashboard layout', 'Fix a runtime error', 'Create a new feature plan', '/help', '/time'].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInput(prompt)
                inputRef.current?.focus()
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-[#141420] text-[#a0a0a6] border border-[#1a1a2e] hover:text-[#e0e0e6] hover:border-[#00d9ff]/30"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask ASTRA anything..."
              className="w-full bg-[#141420] border border-[#00d9ff]/30 rounded-lg px-4 py-3 text-[#e0e0e6] placeholder-[#a0a0a6] focus:outline-none focus:border-[#00d9ff]/60 group-hover:border-[#00d9ff]/40 focus:glow-box-blue transition-all duration-200"
            />
          </div>
          <button
            type="button"
            aria-label="Send message"
            onClick={handleSendMessage}
            disabled={!input.trim() || isThinking}
            className="px-4 py-3 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#b100ff] text-[#0a0a0f] font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 glow-box-dual active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#a0a0a6] text-center">Press Enter to send message</p>
      </div>
    </div>
  )
}

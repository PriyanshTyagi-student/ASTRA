'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Plus, Send } from 'lucide-react'
import { Message } from './message'
import { useToast } from '@/hooks/use-toast'

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

type FileLanguage = 'typescript' | 'javascript' | 'json' | 'markdown' | 'css' | 'html' | 'python'
type Sender = 'user' | 'assistant' | 'system'

interface ChatMessage {
  id: string
  content: string
  sender: Sender
  timestamp: Date
}

interface CodeGenerationPayload {
  type: 'code_generation'
  filename: string
  language: FileLanguage
  code: string
  summary?: string
}

interface PendingPlan {
  plan: string[]
  request: string
}

interface AgentResponsePayload {
  type: 'agent' | 'chat' | 'code' | 'plan' | 'project'
  response: string
  mode?: string
  plan?: string[]
  execution?: string[]
  code?: string | null
  language?: string | null
  requiresApproval?: boolean
  artifacts?: string[]
  files?: Array<{ name: string; content: string }>
  results?: Array<{ type?: string; filename?: string; language?: string; content?: string }>
}

interface LoadSessionDetail {
  id: string
  kind: string
  title: string
  messages: Array<{ sender: Sender | string; content: string; timestamp: string }>
  files: Array<{ id: string; name: string; language: FileLanguage; content: string }>
}

interface ProjectFile {
  id: string
  name: string
  language: FileLanguage
  content: string
}

interface ChatPanelProps {
  focusTrigger?: number
  onEditorCodeChange?: (code: string) => void
  onEditorLanguageChange?: (language: string) => void
  onProjectFilesChange?: (files: ProjectFile[]) => void
  onProjectActiveFileChange?: (fileId: string) => void
  onOpenEditor?: () => void
}

const SYSTEM_GREETING: ChatMessage = {
  id: 'system-startup',
  content: 'Hello, I am ASTRA — Autonomous System for Tasks, Research & Automation. How can I assist you today?',
  sender: 'system',
  timestamp: new Date(),
}

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeLanguage(value: string | null | undefined): FileLanguage {
  const language = (value || '').toLowerCase()
  if (language === 'ts' || language === 'tsx' || language === 'typescript') return 'typescript'
  if (language === 'js' || language === 'jsx' || language === 'javascript') return 'javascript'
  if (language === 'json') return 'json'
  if (language === 'markdown' || language === 'md') return 'markdown'
  if (language === 'css') return 'css'
  if (language === 'html') return 'html'
  if (language === 'python' || language === 'py') return 'python'
  return 'javascript'
}

function makeProjectFiles(files: Array<{ name: string; content: string }>): ProjectFile[] {
  return files.map((file, index) => ({
    id: `${file.name}-${index}-${Date.now()}`,
    name: file.name,
    language: normalizeLanguage(file.name.split('.').pop()),
    content: file.content,
  }))
}

export function ChatPanel({
  focusTrigger = 0,
  onEditorCodeChange,
  onEditorLanguageChange,
  onProjectFilesChange,
  onProjectActiveFileChange,
  onOpenEditor,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null)
  const [sessionId, setSessionId] = useState(() => createMessageId())
  const [sessionTitle, setSessionTitle] = useState('ASTRA Chat')
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sanitizeText = (rawResponse: string) => rawResponse.replace(/```[\s\S]*?```/g, '').trim()

  const extractCodeBlocks = (rawResponse: string) => {
    const blocks: Array<{ language: string; code: string }> = []
    const regex = /```(\w+)?([\s\S]*?)```/g
    for (const match of rawResponse.matchAll(regex)) {
      const language = (match[1] || 'javascript').toLowerCase()
      const code = (match[2] || '').trim()
      if (code) {
        blocks.push({ language, code })
      }
    }
    return blocks
  }

  const dispatchGeneratedCode = (payload: CodeGenerationPayload) => {
    window.dispatchEvent(new CustomEvent('astra:apply-generated-code', { detail: payload }))
  }

  const applyCodeToEditor = (payload: CodeGenerationPayload) => {
    onEditorCodeChange?.(payload.code)
    onEditorLanguageChange?.(payload.language)
    dispatchGeneratedCode(payload)
    onOpenEditor?.()
    toast({ title: 'Code loaded in editor', description: payload.filename })
  }

  const parseAgentResponse = async (message: string) => {
    const response = await fetch(`${BACKEND_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      throw new Error('Unable to process chat request.')
    }

    return response.json() as Promise<AgentResponsePayload>
  }

  const persistSession = async () => {
    const payload = {
      id: sessionId,
      kind: projectFiles.length > 0 ? 'project' : 'chat',
      title: sessionTitle,
      messages: messages.map((message) => ({
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      })),
      files: projectFiles,
    }

    try {
      await fetch(`${BACKEND_BASE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // Local state is still preserved.
    }
  }

  const archiveCurrentSession = async () => {
    await persistSession()
    window.dispatchEvent(new CustomEvent('astra:session-updated'))
  }

  const queuePersistSession = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      void persistSession()
    }, 450)
  }

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [...prev, { id: createMessageId(), content, sender: 'assistant', timestamp: new Date() }])
  }

  const handleSessionLoad = (event: Event) => {
    const detail = (event as CustomEvent<LoadSessionDetail>).detail
    if (!detail) {
      return
    }

    setSessionId(detail.id)
    setSessionTitle(detail.title)
    setMessages(
      detail.messages.map((message, index) => ({
        id: `${detail.id}-${index}`,
        sender: message.sender === 'system' ? 'system' : message.sender === 'assistant' ? 'assistant' : 'user',
        content: message.content,
        timestamp: new Date(message.timestamp),
      })),
    )

    const loadedFiles = detail.files || []
    setProjectFiles(loadedFiles)
    onProjectFilesChange?.(loadedFiles)
    onProjectActiveFileChange?.(loadedFiles[0]?.id || '')

    if (loadedFiles.length > 0) {
      const firstFile = loadedFiles[0]
      applyCodeToEditor({
        type: 'code_generation',
        filename: firstFile.name,
        language: firstFile.language,
        code: firstFile.content,
        summary: 'Loaded from saved project.',
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/history`)
        if (response.ok) {
          // Sidebar loads the list; this keeps the API warm and confirms availability.
        }
      } catch {
        // Ignore initialization errors.
      }

      const savedMessages = window.localStorage.getItem('astra-chat-messages')
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages) as Array<{ id: string; sender: Sender; content: string; timestamp: string }>
          if (parsed.length > 0) {
            setMessages(parsed.map((message) => ({
              id: message.id,
              sender: message.sender,
              content: message.content,
              timestamp: new Date(message.timestamp),
            })))
            return
          }
        } catch {
          // ignore malformed cache
        }
      }

      setMessages([SYSTEM_GREETING])
    }

    void initialize()
    window.addEventListener('astra:load-session', handleSessionLoad as EventListener)
    window.addEventListener('astra:new-chat', handleNewChat as EventListener)

    return () => {
      window.removeEventListener('astra:load-session', handleSessionLoad as EventListener)
      window.removeEventListener('astra:new-chat', handleNewChat as EventListener)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!messages.length) {
      return
    }
    window.localStorage.setItem('astra-chat-messages', JSON.stringify(messages))
    queuePersistSession()
  }, [messages, projectFiles, sessionId, sessionTitle])

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
        // ignore
      }
      if (mounted) {
        setBackendStatus('offline')
      }
    }

    void checkBackendStatus()
    const intervalId = window.setInterval(() => void checkBackendStatus(), 15000)
    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [focusTrigger])

  const handleNewChat = async () => {
    await archiveCurrentSession()
    const nextSessionId = createMessageId()
    setSessionId(nextSessionId)
    setSessionTitle('ASTRA Chat')
    setProjectFiles([])
    onProjectFilesChange?.([])
    onProjectActiveFileChange?.('')
    setPendingPlan(null)
    setInput('')
    setMessages([SYSTEM_GREETING])
  }

  const handleApprovePlan = async () => {
    if (!pendingPlan) return

    setIsThinking(true)
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: pendingPlan.plan, request: pendingPlan.request }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Unable to execute plan')
      }

      const result = await response.json() as { results?: Array<{ type?: string; filename?: string; language?: string; content?: string }> }
      console.log('AI Response:', result)

      const firstCode = result.results?.find((item) => item.type === 'code' && typeof item.content === 'string')
      if (firstCode?.content) {
        applyCodeToEditor({
          type: 'code_generation',
          filename: firstCode.filename || 'generated-file.html',
          language: normalizeLanguage(firstCode.language),
          code: firstCode.content,
        })
        addAssistantMessage('✅ Code loaded in editor')
      } else {
        addAssistantMessage('✅ Plan approved and executed')
      }

      setPendingPlan(null)
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Could not execute the pending plan.'
      toast({ title: 'Execution failed', description: message, variant: 'destructive' })
    } finally {
      setIsThinking(false)
    }
  }

  const handleRejectPlan = async () => {
    setPendingPlan(null)
    addAssistantMessage('Plan rejected')
    try {
      await fetch(`${BACKEND_BASE_URL}/reject`, { method: 'POST' })
    } catch {
      // ignore
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userText = input.trim()

    const userMessage: ChatMessage = {
      id: createMessageId(),
      content: userText,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    if (sessionTitle === 'ASTRA Chat' && userText.length > 0) {
      setSessionTitle(userText.slice(0, 48))
    }

    try {
      const assistantResponse = await parseAgentResponse(userText)
      console.log('AI Response:', assistantResponse)

      if (assistantResponse.type === 'project' && assistantResponse.files && assistantResponse.files.length > 0) {
        const normalizedFiles = makeProjectFiles(assistantResponse.files)
        setProjectFiles(normalizedFiles)
        onProjectFilesChange?.(normalizedFiles)
        onProjectActiveFileChange?.(normalizedFiles[0]?.id || '')

        const firstFile = normalizedFiles[0]
        applyCodeToEditor({
          type: 'code_generation',
          filename: firstFile.name,
          language: firstFile.language,
          code: firstFile.content,
          summary: 'Website project loaded into the editor.',
        })

        addAssistantMessage('✅ Website project loaded in editor')
        return
      }

      if (assistantResponse.type === 'plan' || assistantResponse.requiresApproval || (assistantResponse.plan && assistantResponse.plan.length > 0)) {
        setPendingPlan({ plan: assistantResponse.plan || [], request: userMessage.content })
        addAssistantMessage(sanitizeText(assistantResponse.response))
        return
      }

      if (assistantResponse.type === 'code' || assistantResponse.code) {
        const code = assistantResponse.code || ''
        const language = normalizeLanguage(assistantResponse.language)
        applyCodeToEditor({
          type: 'code_generation',
          filename: assistantResponse.language === 'html' ? 'generated.html' : language === 'css' ? 'generated.css' : language === 'python' ? 'generated.py' : 'generated.js',
          language,
          code,
          summary: assistantResponse.response,
        })
        addAssistantMessage('✅ Code generated and opened in editor')
        return
      }

      const codeBlocks = extractCodeBlocks(assistantResponse.response)
      if (codeBlocks.length > 0) {
        const firstBlock = codeBlocks[0]
        const normalizedLanguage = normalizeLanguage(firstBlock.language)
        applyCodeToEditor({
          type: 'code_generation',
          filename: `generated-${Date.now()}.${normalizedLanguage === 'html' ? 'html' : normalizedLanguage === 'css' ? 'css' : normalizedLanguage === 'python' ? 'py' : normalizedLanguage === 'typescript' ? 'ts' : 'js'}`,
          language: normalizedLanguage,
          code: firstBlock.code,
        })
        addAssistantMessage('✅ Code generated and opened in editor')
        return
      }

      addAssistantMessage(sanitizeText(assistantResponse.response))
    } catch {
      toast({ title: 'AI failed, try again', description: 'Could not reach backend provider.', variant: 'destructive' })
      addAssistantMessage('I could not reach the backend. Please check if it is running on port 8000.')
    } finally {
      setIsThinking(false)
    }
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

  const normalizedTitle = useMemo(() => sessionTitle || 'ASTRA Chat', [sessionTitle])

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] border-r border-[#1a1a2e]">
      <div className="p-4 border-b border-[#1a1a2e] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e0e0e6]">Chat</h2>
          <p className="text-xs text-[#a0a0a6] flex items-center gap-2">
            <span>{normalizedTitle}</span>
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
          <Message key={message.id} content={message.content} sender={message.sender} timestamp={message.timestamp} />
        ))}

        {pendingPlan && (
          <div className="rounded-lg border border-[#00d9ff]/40 bg-[#0f1720] p-3">
            <p className="text-sm font-semibold text-[#e0e0e6] mb-2">Proposed Plan</p>
            <ol className="space-y-1 text-sm text-[#cbd5e1] list-decimal pl-4">
              {pendingPlan.plan.map((step, index) => (
                <li key={`plan-step-${index}`}>{step}</li>
              ))}
            </ol>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={handleApprovePlan} className="px-3 py-1.5 rounded-md bg-[#00d9ff] text-[#0a0a0f] text-xs font-semibold">
                Approve ✅
              </button>
              <button type="button" onClick={handleRejectPlan} className="px-3 py-1.5 rounded-md bg-[#1a1a2e] text-[#e0e0e6] text-xs">
                Reject ❌
              </button>
            </div>
          </div>
        )}

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

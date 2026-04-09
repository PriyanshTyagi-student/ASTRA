'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileText, FolderOpen, MessageCircle, Plus, RefreshCw, Settings } from 'lucide-react'

export type SidebarSection = 'chat' | 'files' | 'projects' | 'settings'

interface SidebarProps {
  activeSection: SidebarSection
  onSectionChange: (section: SidebarSection) => void
}

interface NavItem {
  id: SidebarSection
  label: string
  icon: ReactNode
}

interface SidebarSession {
  id: string
  kind: 'chat' | 'project'
  title: string
  updated_at?: string
  created_at?: string
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [sessions, setSessions] = useState<SidebarSession[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

  const navItems: NavItem[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderOpen className="w-5 h-5" />,
    },
  ]

  const chatSessions = useMemo(() => sessions.filter((session) => session.kind !== 'project'), [sessions])
  const projectSessions = useMemo(() => sessions.filter((session) => session.kind === 'project'), [sessions])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${backendBaseUrl}/history`)
      if (!response.ok) {
        return
      }

      const payload = await response.json() as { sessions?: SidebarSession[] }
      setSessions(payload.sessions || [])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSessions()

    const handleSessionUpdate = () => {
      void loadSessions()
    }

    window.addEventListener('astra:session-updated', handleSessionUpdate)

    return () => {
      window.removeEventListener('astra:session-updated', handleSessionUpdate)
    }
  }, [])

  const openSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    try {
      const response = await fetch(`${backendBaseUrl}/history/${sessionId}`)
      if (!response.ok) {
        return
      }

      const session = await response.json()
      window.dispatchEvent(new CustomEvent('astra:load-session', { detail: session }))
      onSectionChange('chat')
    } catch {
      // ignore restore errors; the current workspace remains intact.
    }
  }

  const createNewChat = () => {
    setSelectedSessionId(null)
    window.dispatchEvent(new CustomEvent('astra:new-chat'))
    onSectionChange('chat')
  }

  const renderSessionList = (title: string, items: SidebarSession[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">{title}</h3>
        <span className="text-[10px] text-[#6b7280]">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[#6b7280] rounded-lg border border-dashed border-[#1f2937]">
            No saved {title.toLowerCase()} yet.
          </p>
        ) : (
          items.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => void openSession(session.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                selectedSessionId === session.id
                  ? 'border-[#00d9ff]/40 bg-[#121a28] text-[#e0e0e6]'
                  : 'border-[#1a1a2e] bg-[#0f0f17] text-[#a0a0a6] hover:border-[#00d9ff]/20 hover:text-[#e0e0e6]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium line-clamp-2">{session.title}</span>
                <span className="rounded-full border border-[#1f2937] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#6b7280]">
                  {session.kind}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#6b7280]">
                {session.updated_at ? new Date(session.updated_at).toLocaleString() : 'Saved session'}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <aside className="w-64 bg-[#0f0f17] border-r border-[#1a1a2e] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#1a1a2e]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#b100ff] flex items-center justify-center neon-glow-blue">
              <span className="text-[#0a0a0f] font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold neon-glow-blue">ASTRA</h1>
              <p className="text-xs text-[#a0a0a6]">AI Workspace Memory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            className="rounded-lg border border-[#1a1a2e] p-2 text-[#a0a0a6] transition-colors hover:border-[#00d9ff]/20 hover:text-[#e0e0e6]"
            aria-label="Refresh sessions"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-[#1a1a2e] space-y-2">
        <button
          type="button"
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#b100ff] px-4 py-3 text-sm font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeSection === item.id
                ? 'bg-[#1a1a2e] text-[#00d9ff] glow-box-blue border border-[#00d9ff]/20'
                : 'text-[#a0a0a6] hover:text-[#e0e0e6] hover:bg-[#1a1a2e]/50 hover:border-[#00d9ff]/10'
            }`}
          >
            <span className="transition-transform duration-200 group-hover:scale-110">
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-2 space-y-4">
          {renderSessionList('Chats', chatSessions)}
          {renderSessionList('Projects', projectSessions)}
        </div>
      </nav>

      <div className="p-4 border-t border-[#1a1a2e]">
        <button
          type="button"
          onClick={() => onSectionChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
            activeSection === 'settings'
              ? 'bg-[#1a1a2e] text-[#00d9ff] glow-box-blue border border-[#00d9ff]/20'
              : 'text-[#a0a0a6] hover:text-[#e0e0e6] hover:bg-[#1a1a2e]/50'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  )
}

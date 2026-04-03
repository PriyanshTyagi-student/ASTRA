'use client'

import { MessageCircle, FileText, FolderOpen, Settings } from 'lucide-react'

export type SidebarSection = 'chat' | 'files' | 'projects' | 'settings'

interface SidebarProps {
  activeSection: SidebarSection
  onSectionChange: (section: SidebarSection) => void
}

interface NavItem {
  id: SidebarSection
  label: string
  icon: React.ReactNode
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {

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

  return (
    <aside className="w-64 bg-[#0f0f17] border-r border-[#1a1a2e] flex flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#b100ff] flex items-center justify-center neon-glow-blue">
            <span className="text-[#0a0a0f] font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-lg font-bold neon-glow-blue">ASTRA</h1>
            <p className="text-xs text-[#a0a0a6]">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
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
      </nav>

      {/* Settings */}
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

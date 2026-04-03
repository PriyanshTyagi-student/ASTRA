'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar, type SidebarSection } from '@/components/sidebar'
import { ChatPanel } from '@/components/chat-panel'
import { Workspace } from '@/components/workspace'
import { HolographicOrb } from '@/components/holographic-orb'

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<SidebarSection>('chat')
  const [chatFocusTrigger, setChatFocusTrigger] = useState(0)

  const handleSectionChange = (section: SidebarSection) => {
    setActiveSection(section)
    if (section === 'chat') {
      setChatFocusTrigger((prev) => prev + 1)
    }
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false)
    }
  }

  return (
    <main className="flex h-screen w-screen bg-[#0a0a0f] text-[#e0e0e6] overflow-hidden">
      {/* Holographic Background */}
      <HolographicOrb />

      {/* Main Content */}
      <div className="relative z-10 flex w-full h-full">
        {/* Sidebar */}
        <div
          className={`hidden md:flex transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          {sidebarOpen && (
            <Sidebar
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />
          )}
        </div>

        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden absolute top-4 left-4 z-50">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="p-2 rounded-lg bg-[#1a1a2e]/80 text-[#00d9ff] hover:bg-[#1a1a2e] transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="w-64 h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </div>
          </div>
        )}

        {/* Main Panel - Split Layout */}
        <div className="flex-1 flex gap-0 flex-col md:flex-row">
          {/* Left Panel - Chat */}
          <div className="w-full md:w-1/2 flex flex-col min-w-0 order-2 md:order-1">
            <ChatPanel focusTrigger={chatFocusTrigger} />
          </div>

          {/* Right Panel - Code/Logs */}
          <div className="w-full md:w-1/2 flex flex-col min-w-0 order-1 md:order-2 border-t md:border-t-0 md:border-l border-[#1a1a2e]">
            <Workspace key={activeSection} activeSection={activeSection} />
          </div>
        </div>
      </div>
    </main>
  )
}

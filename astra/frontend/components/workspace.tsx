'use client'

import { useEffect, useRef, useState } from 'react'
import { CodeEditor } from './code-editor'
import { LogsPanel } from './logs-panel'
import { StatusBar } from './status-bar'
import type { SidebarSection } from './sidebar'

type Tab = 'code' | 'logs' | 'projects' | 'settings'

interface WorkspaceProps {
  activeSection: SidebarSection
}

export function Workspace({ activeSection }: WorkspaceProps) {
  const sectionToTab: Record<SidebarSection, Tab> = {
    chat: 'code',
    files: 'code',
    projects: 'projects',
    settings: 'settings',
  }

  const [activeTab, setActiveTab] = useState<Tab>(sectionToTab[activeSection])
  const [projectName, setProjectName] = useState('')
  const [projects, setProjects] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return ['astra-dashboard']
    }

    try {
      const saved = window.localStorage.getItem('astra-projects')
      if (!saved) {
        return ['astra-dashboard']
      }
      const parsed = JSON.parse(saved) as string[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['astra-dashboard']
    } catch {
      return ['astra-dashboard']
    }
  })
  const [activeProject, setActiveProject] = useState(() => {
    if (typeof window === 'undefined') {
      return 'astra-dashboard'
    }
    return window.localStorage.getItem('astra-active-project') || 'astra-dashboard'
  })
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return window.localStorage.getItem('astra-notifications-enabled') !== 'false'
  })
  const saveFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.localStorage.setItem('astra-projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    window.localStorage.setItem('astra-active-project', activeProject)
  }, [activeProject])

  useEffect(() => {
    window.localStorage.setItem('astra-notifications-enabled', String(notificationsEnabled))
  }, [notificationsEnabled])

  useEffect(() => {
    return () => {
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current)
      }
    }
  }, [])

  const status: 'idle' | 'processing' | 'completed' =
    activeTab === 'logs'
      ? 'processing'
      : settingsSaved
        ? 'completed'
        : 'idle'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'code', label: 'Code' },
    { id: 'logs', label: 'Logs' },
    { id: 'projects', label: 'Projects' },
    { id: 'settings', label: 'Settings' },
  ]

  const handleCreateProject = () => {
    const trimmedName = projectName.trim()
    if (!trimmedName) return

    if (projects.some((project) => project.toLowerCase() === trimmedName.toLowerCase())) {
      return
    }

    setProjects((prev) => [trimmedName, ...prev])
    setActiveProject(trimmedName)
    setProjectName('')
  }

  const handleRemoveProject = (projectToRemove: string) => {
    setProjects((prev) => {
      const updatedProjects = prev.filter((project) => project !== projectToRemove)
      if (projectToRemove === activeProject) {
        setActiveProject(updatedProjects[0] || 'astra-dashboard')
      }
      return updatedProjects.length > 0 ? updatedProjects : ['astra-dashboard']
    })
  }

  const handleSaveSettings = () => {
    setSettingsSaved(true)
    if (saveFeedbackTimeoutRef.current) {
      clearTimeout(saveFeedbackTimeoutRef.current)
    }
    saveFeedbackTimeoutRef.current = setTimeout(() => {
      setSettingsSaved(false)
    }, 2000)
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f]">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-[#1a1a2e] bg-[#0f0f17]/50">
        <div className="flex gap-1 p-2">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg transition-all duration-200 border-b-2 font-medium ${
                activeTab === tab.id
                  ? 'bg-[#141420] border-b-[#b100ff] text-[#b100ff]'
                  : 'bg-transparent border-b-transparent text-[#a0a0a6] hover:text-[#e0e0e6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' && <CodeEditor />}
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'projects' && (
          <div className="h-full overflow-y-auto p-5 space-y-4">
            <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f17] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#e0e0e6]">Create Project</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 bg-[#141420] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-[#e0e0e6] focus:outline-none focus:border-[#00d9ff]/60"
                />
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={!projectName.trim()}
                  className="px-4 py-2 rounded-lg bg-[#00d9ff] text-[#0a0a0f] text-sm font-semibold disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f17] p-4 space-y-2">
              <h3 className="text-sm font-semibold text-[#e0e0e6]">Project List</h3>
              {projects.map((project) => (
                <div
                  key={project}
                  className={`rounded-md border px-3 py-2 text-sm flex items-center justify-between ${
                    activeProject === project
                      ? 'border-[#00d9ff]/40 bg-[#141420] text-[#00d9ff]'
                      : 'border-[#1a1a2e] bg-[#141420] text-[#a0a0a6]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveProject(project)}
                    className="text-left flex-1"
                  >
                    {project}
                  </button>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(project)}
                      className="ml-2 text-[#ff3333] hover:text-[#ff6666]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-5">
            <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f17] p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[#e0e0e6]">Workspace Settings</h3>
              <label className="flex items-center justify-between rounded-lg border border-[#1a1a2e] bg-[#141420] px-3 py-2 text-sm text-[#a0a0a6]">
                Enable notifications
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
              </label>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg bg-[#b100ff] text-white text-sm font-semibold"
              >
                Save Settings
              </button>
              {settingsSaved && (
                <p className="text-xs text-[#00ff88]">Settings saved successfully.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        status={status}
        projectName={activeProject}
        activityCount={activeTab === 'logs' ? 1 : 0}
      />
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { CodeEditor } from './code-editor'
import { LivePreview } from './live-preview'
import { LogsPanel } from './logs-panel'
import { StatusBar } from './status-bar'
import type { SidebarSection } from './sidebar'

type WorkspaceTab = 'editor' | 'preview' | 'logs' | 'projects' | 'settings'

interface WorkspaceProps {
  activeSection: SidebarSection
  requestedTab?: 'chat' | 'editor' | 'preview' | null
  editorCode?: string
  editorLanguage?: string
  projectFiles?: Array<{ id: string; name: string; language: 'typescript' | 'javascript' | 'json' | 'markdown' | 'css' | 'html' | 'python'; content: string }>
  projectActiveFileId?: string
  previewVisible?: boolean
  onPreviewVisibleChange?: (value: boolean) => void
}

export function Workspace({
  activeSection,
  requestedTab = null,
  editorCode = '',
  editorLanguage = 'javascript',
  projectFiles = [],
  projectActiveFileId = '',
  previewVisible = false,
  onPreviewVisibleChange,
}: WorkspaceProps) {
  const defaultProject = 'astra-dashboard'
  const sectionToTab: Record<SidebarSection, WorkspaceTab> = {
    chat: 'editor',
    files: 'editor',
    projects: 'projects',
    settings: 'settings',
  }

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(sectionToTab[activeSection])
  const [projectName, setProjectName] = useState('')
  const [projects, setProjects] = useState<string[]>([defaultProject])
  const [activeProject, setActiveProject] = useState(defaultProject)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const saveFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const savedProjects = window.localStorage.getItem('astra-projects')
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects) as string[]
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          setProjects(parsedProjects)
        }
      }

      const savedActiveProject = window.localStorage.getItem('astra-active-project')
      if (savedActiveProject) {
        setActiveProject(savedActiveProject)
      }

      const savedNotifications = window.localStorage.getItem('astra-notifications-enabled')
      if (savedNotifications !== null) {
        setNotificationsEnabled(savedNotifications !== 'false')
      }
    } catch {
      // Keep defaults when persisted values are malformed.
    }
  }, [])

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
    if (requestedTab === 'editor') {
      setActiveTab('editor')
      return
    }

    if (requestedTab === 'preview') {
      setActiveTab('preview')
      return
    }

    if (requestedTab === 'chat') {
      setActiveTab('editor')
    }
  }, [requestedTab])

  useEffect(() => {
    if (previewVisible) {
      setActiveTab('preview')
    }
  }, [previewVisible])

  useEffect(() => {
    onPreviewVisibleChange?.(activeTab === 'preview')
  }, [activeTab, onPreviewVisibleChange])

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

  const tabs: { id: WorkspaceTab; label: string }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'preview', label: 'Preview' },
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
        setActiveProject(updatedProjects[0] || defaultProject)
      }
      return updatedProjects.length > 0 ? updatedProjects : [defaultProject]
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
    <div className="flex-1 flex flex-col min-h-0 h-full bg-[#0a0a0f] overflow-hidden">
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
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'editor' && (
          <CodeEditor
            initialFiles={projectFiles}
            activeFile={projectActiveFileId || undefined}
            initialCode={editorCode}
            initialLanguage={editorLanguage}
            initialFilename={editorLanguage === 'html' ? 'generated.html' : editorLanguage === 'css' ? 'generated.css' : editorLanguage === 'python' ? 'generated.py' : 'generated.js'}
          />
        )}
        {activeTab === 'preview' && (
          <div className="h-full min-h-0 p-4">
            <LivePreview editorCode={editorCode} editorLanguage={editorLanguage} />
          </div>
        )}
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

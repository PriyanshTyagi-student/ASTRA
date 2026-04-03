'use client'

import { useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import {
  ChevronDown,
  Command,
  Copy,
  Download,
  FileCode,
  FilePenLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

interface MonacoEditorInstance {
  getAction: (id: string) => { run: () => Promise<void> } | null
  focus: () => void
}

interface CodeFile {
  id: string
  name: string
  language: 'typescript' | 'javascript' | 'json' | 'markdown' | 'css' | 'html' | 'python'
  content: string
}

interface GeneratedCodeEventPayload {
  type?: string
  filename?: string
  language?: string
  code?: string
}

interface CodeEditorProps {
  activeFile?: string
}

interface CommandItem {
  id: string
  label: string
}

const SAMPLE_FILES: CodeFile[] = [
  {
    id: '1',
    name: 'dashboard.tsx',
    language: 'typescript',
    content: `'use client'

import { Sidebar } from '@/components/sidebar'
import { ChatPanel } from '@/components/chat-panel'
import { Workspace } from '@/components/workspace'
import { HolographicOrb } from '@/components/holographic-orb'

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <HolographicOrb />
      <Sidebar />
      <div className="flex-1 flex">
        <ChatPanel />
        <Workspace />
      </div>
    </div>
  )
}`,
  },
  {
    id: '2',
    name: 'sidebar.tsx',
    language: 'typescript',
    content: `'use client'

import { MessageCircle, FileText, FolderOpen } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0f0f17] border-r border-[#1a1a2e]">
      {/* Navigation items */}
    </aside>
  )
}`,
  },
]

export function CodeEditor({ activeFile: initialActiveFile }: CodeEditorProps) {
  const [files, setFiles] = useState<CodeFile[]>(SAMPLE_FILES)
  const [activeFile, setActiveFile] = useState(initialActiveFile || SAMPLE_FILES[0].id)
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false)
  const [showFileExplorer, setShowFileExplorer] = useState(true)
  const [fileQuery, setFileQuery] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const editorRef = useRef<MonacoEditorInstance | null>(null)
  const idCounterRef = useRef(1000)

  const deduplicateFiles = (filesToDeduplicate: CodeFile[]): CodeFile[] => {
    const seen = new Set<string>()
    return filesToDeduplicate.filter((file) => {
      if (seen.has(file.id)) {
        return false
      }
      seen.add(file.id)
      return true
    })
  }

  useEffect(() => {
    try {
      const savedFiles = window.localStorage.getItem('astra-code-files')
      const savedActiveFile = window.localStorage.getItem('astra-active-file')

      if (savedFiles) {
        const parsed = JSON.parse(savedFiles) as CodeFile[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deduped = deduplicateFiles(parsed)
          setFiles(deduped)

          // Update ID counter to avoid duplicates
          const maxId = Math.max(
            ...deduped.map((file) => {
              const match = file.id.match(/file-(\d+)/)
              return match ? parseInt(match[1], 10) : 0
            })
          )
          if (maxId > idCounterRef.current) {
            idCounterRef.current = maxId
          }

          const activeFromStorage = savedActiveFile && deduped.some((file) => file.id === savedActiveFile)
            ? savedActiveFile
            : deduped[0].id

          setActiveFile(activeFromStorage)
          return
        }
      }

      if (savedActiveFile && SAMPLE_FILES.some((file) => file.id === savedActiveFile)) {
        setActiveFile(savedActiveFile)
      }
    } catch {
      // Ignore malformed stored editor state and continue with sample files.
    } finally {
      setHasLoadedStoredState(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedStoredState) {
      return
    }

    // Deduplicate files by ID before saving to prevent duplicate key errors
    const seen = new Set<string>()
    const deduplicatedFiles = files.filter((file) => {
      if (seen.has(file.id)) {
        return false
      }
      seen.add(file.id)
      return true
    })

    window.localStorage.setItem('astra-code-files', JSON.stringify(deduplicatedFiles))
  }, [files, hasLoadedStoredState])

  useEffect(() => {
    if (!hasLoadedStoredState) {
      return
    }

    window.localStorage.setItem('astra-active-file', activeFile)
  }, [activeFile, hasLoadedStoredState])

  // Auto-deduplicate files state if duplicates are detected
  useEffect(() => {
    if (!hasLoadedStoredState || files.length === 0) {
      return
    }

    const deduped = deduplicateFiles(files)
    if (deduped.length < files.length) {
      // Duplicates were found and removed, sync state
      setFiles(deduped)
    }
  }, [files, hasLoadedStoredState])

  // Deduplicate files for rendering to prevent React key warnings
  const safeFiles = deduplicateFiles(files)
  const currentFile = safeFiles.find((f) => f.id === activeFile)
  const filteredFiles = safeFiles.filter((file) => file.name.toLowerCase().includes(fileQuery.toLowerCase()))

  const nextFileId = () => {
    idCounterRef.current += 1
    return `file-${idCounterRef.current}`
  }

  const resolveLanguage = (language: string | undefined, filename: string): CodeFile['language'] => {
    const normalized = (language || '').toLowerCase()
    if (['typescript', 'javascript', 'json', 'markdown', 'css', 'html', 'python'].includes(normalized)) {
      return normalized as CodeFile['language']
    }

    if (filename.endsWith('.py')) return 'python'
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript'
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript'
    if (filename.endsWith('.json')) return 'json'
    if (filename.endsWith('.md')) return 'markdown'
    if (filename.endsWith('.css')) return 'css'
    if (filename.endsWith('.html')) return 'html'

    return 'typescript'
  }

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = {
      getAction: editor.getAction.bind(editor),
      focus: editor.focus.bind(editor),
    }
  }

  const handleCreateFile = () => {
    const id = nextFileId()
    const nextIndex = files.length + 1
    const newFile: CodeFile = {
      id,
      name: `new-file-${nextIndex}.ts`,
      language: 'typescript',
      content: `export function file${nextIndex}() {\n  return 'Hello from new file ${nextIndex}'\n}`,
    }

    setFiles((prev) => [...prev, newFile])
    setActiveFile(id)
    setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
  }

  const handleContentChange = (value: string | undefined) => {
    if (!currentFile || typeof value !== 'string') {
      return
    }

    setFiles((prev) =>
      prev.map((file) =>
        file.id === currentFile.id
          ? { ...file, content: value }
          : file,
      ),
    )
  }

  const handleDeleteActiveFile = () => {
    if (!currentFile || files.length === 1) {
      return
    }

    const remaining = files.filter((file) => file.id !== currentFile.id)
    setFiles(remaining)
    setActiveFile(remaining[0].id)
  }

  const handleDuplicateActiveFile = () => {
    if (!currentFile) {
      return
    }

    const duplicatedId = nextFileId()
    const duplicated: CodeFile = {
      ...currentFile,
      id: duplicatedId,
      name: currentFile.name.replace(/(\.[^.]+)?$/, '-copy$1'),
    }
    setFiles((prev) => [duplicated, ...prev])
    setActiveFile(duplicatedId)
  }

  const handleDownloadActiveFile = () => {
    if (!currentFile) {
      return
    }

    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = currentFile.name
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleStartRename = () => {
    if (!currentFile) {
      return
    }

    setRenameValue(currentFile.name)
    setIsRenaming(true)
  }

  const handleCommitRename = () => {
    if (!currentFile) {
      return
    }

    const trimmed = renameValue.trim()
    if (!trimmed) {
      setIsRenaming(false)
      return
    }

    setFiles((prev) => prev.map((file) => (file.id === currentFile.id ? { ...file, name: trimmed } : file)))
    setIsRenaming(false)
  }

  const handleFormatDocument = async () => {
    if (!editorRef.current) {
      return
    }

    const formatAction = editorRef.current.getAction('editor.action.formatDocument')
    if (!formatAction) {
      return
    }

    await formatAction.run()
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const metaOrCtrl = event.ctrlKey || event.metaKey

      if (metaOrCtrl && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleDownloadActiveFile()
      }

      if (metaOrCtrl && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleCreateFile()
      }

      if (metaOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandOpen(true)
      }

      if (metaOrCtrl && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setShowFileExplorer(true)
        const input = document.getElementById('file-search-input') as HTMLInputElement | null
        input?.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  })

  useEffect(() => {
    const onGeneratedCode = (event: Event) => {
      const customEvent = event as CustomEvent<GeneratedCodeEventPayload>
      const detail = customEvent.detail

      if (!detail || detail.type !== 'code_generation' || !detail.filename || !detail.code) {
        return
      }

      const id = nextFileId()
      const newFile: CodeFile = {
        id,
        name: detail.filename,
        language: resolveLanguage(detail.language, detail.filename),
        content: detail.code,
      }

      setFiles((prev) => {
        // Check if file with this ID already exists to prevent duplicates
        if (prev.some((f) => f.id === id)) {
          return prev
        }
        return [newFile, ...prev]
      })
      setActiveFile(id)
      setShowFileExplorer(true)
    }

    window.addEventListener('astra:apply-generated-code', onGeneratedCode as EventListener)
    return () => {
      window.removeEventListener('astra:apply-generated-code', onGeneratedCode as EventListener)
    }
  }, [])

  const commandItems: CommandItem[] = [
    { id: 'new-file', label: 'New File' },
    { id: 'rename-file', label: 'Rename Active File' },
    { id: 'duplicate-file', label: 'Duplicate Active File' },
    { id: 'delete-file', label: 'Delete Active File' },
    { id: 'download-file', label: 'Save/Download Active File' },
    { id: 'format-document', label: 'Format Document' },
  ]

  const filteredCommands = commandItems.filter((item) => item.label.toLowerCase().includes(commandQuery.toLowerCase()))

  const handleRunCommand = (command: CommandItem) => {
    switch (command.id) {
      case 'new-file':
        handleCreateFile()
        break
      case 'rename-file':
        handleStartRename()
        break
      case 'duplicate-file':
        handleDuplicateActiveFile()
        break
      case 'delete-file':
        handleDeleteActiveFile()
        break
      case 'download-file':
        handleDownloadActiveFile()
        break
      case 'format-document':
        void handleFormatDocument()
        break
      default:
        break
    }
    setCommandOpen(false)
    setCommandQuery('')
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] relative">
      {/* Tabs */}
      <div className="flex items-center border-b border-[#1a1a2e] bg-[#0f0f17]/50">
        <div className="flex-1 flex gap-1 p-2 overflow-x-auto">
          <button
            type="button"
            aria-label="Toggle file explorer"
            onClick={() => setShowFileExplorer((prev) => !prev)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showFileExplorer ? '' : '-rotate-90'}`} />
          </button>
          <button
            type="button"
            aria-label="Open command palette"
            onClick={() => setCommandOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors"
          >
            <Command className="w-4 h-4" />
          </button>
          {safeFiles.map((file) => (
            <div
              key={file.id}
              className="group flex items-center rounded-t-lg border-b-2 transition-all duration-200 border-b-transparent"
            >
              <button
                type="button"
                onClick={() => setActiveFile(file.id)}
                className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap transition-all duration-200 rounded-t-lg ${
                  activeFile === file.id
                    ? 'bg-[#141420] border-b-[#00d9ff] text-[#00d9ff] neon-glow-blue'
                    : 'bg-transparent text-[#a0a0a6] hover:text-[#e0e0e6]'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </button>
              <button 
                type="button"
                aria-label={`Close ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (files.length === 1) {
                    return
                  }
                  const updatedFiles = files.filter((f) => f.id !== file.id)
                  setFiles(updatedFiles)
                  if (activeFile === file.id) {
                    setActiveFile(updatedFiles[0].id)
                  }
                }}
                className="ml-1 p-1 rounded hover:bg-[#1a1a2e]/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label="Create new file"
            onClick={handleCreateFile}
            className="flex items-center justify-center w-8 h-8 ml-2 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Rename active file"
            onClick={handleStartRename}
            disabled={!currentFile}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors disabled:opacity-50"
          >
            <FilePenLine className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Duplicate active file"
            onClick={handleDuplicateActiveFile}
            disabled={!currentFile}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Download active file"
            onClick={handleDownloadActiveFile}
            disabled={!currentFile}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#00d9ff] hover:bg-[#1a1a2e]/50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete active file"
            onClick={handleDeleteActiveFile}
            disabled={!currentFile || files.length === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#a0a0a6] hover:text-[#ff6666] hover:bg-[#1a1a2e]/50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        {showFileExplorer && (
          <div className="w-48 border-r border-[#1a1a2e] bg-[#0f0f17] p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setShowFileExplorer((prev) => !prev)}
                  className="flex items-center gap-2 text-[#a0a0a6] hover:text-[#e0e0e6] transition-colors mb-2"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFileExplorer ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-semibold">Files</span>
                </button>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#60606a]" />
                  <input
                    id="file-search-input"
                    type="text"
                    value={fileQuery}
                    onChange={(e) => setFileQuery(e.target.value)}
                    placeholder="Search files"
                    className="w-full mb-2 bg-[#141420] border border-[#1a1a2e] rounded-md pl-7 pr-2 py-1.5 text-xs text-[#e0e0e6] focus:outline-none focus:border-[#00d9ff]/60"
                  />
                </div>
                <div className="space-y-1 ml-4">
                  {filteredFiles.map((file) => (
                    <button
                      type="button"
                      key={file.id}
                      onClick={() => setActiveFile(file.id)}
                      className={`w-full text-left px-2 py-1 rounded text-sm transition-all duration-200 ${
                        activeFile === file.id
                          ? 'bg-[#1a1a2e] text-[#00d9ff] neon-glow-blue'
                          : 'text-[#a0a0a6] hover:text-[#e0e0e6]'
                      }`}
                    >
                      {file.name}
                    </button>
                  ))}
                  {filteredFiles.length === 0 && (
                    <p className="text-xs text-[#60606a]">No matching files</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Code Content */}
        <div className="flex-1 flex flex-col">
          {isRenaming && currentFile && (
            <div className="p-2 border-b border-[#1a1a2e] bg-[#0f0f17] flex gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 bg-[#141420] border border-[#1a1a2e] rounded-md px-2 py-1 text-sm text-[#e0e0e6] focus:outline-none focus:border-[#00d9ff]/60"
              />
              <button
                type="button"
                onClick={handleCommitRename}
                className="px-3 py-1 rounded-md bg-[#00d9ff] text-[#0a0a0f] text-xs font-semibold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="px-3 py-1 rounded-md bg-[#1a1a2e] text-[#a0a0a6] text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          {currentFile ? (
            <Editor
              height="100%"
              path={currentFile.name}
              language={currentFile.language}
              value={currentFile.content}
              onMount={handleEditorMount}
              onChange={handleContentChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                smoothScrolling: true,
                automaticLayout: true,
                wordWrap: 'on',
                tabSize: 2,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                glyphMargin: true,
                folding: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          ) : (
            <div className="text-[#a0a0a6] flex items-center justify-center h-full">
              Select a file to view
            </div>
          )}
        </div>
      </div>

      {commandOpen && (
        <div className="absolute inset-0 bg-black/40 z-30 flex items-start justify-center pt-20">
          <div className="w-full max-w-xl rounded-lg border border-[#1a1a2e] bg-[#0f0f17] shadow-xl">
            <input
              autoFocus
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCommandOpen(false)
                  setCommandQuery('')
                }
              }}
              placeholder="Type a command..."
              className="w-full bg-transparent border-b border-[#1a1a2e] px-4 py-3 text-sm text-[#e0e0e6] focus:outline-none"
            />
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => handleRunCommand(command)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-[#a0a0a6] hover:text-[#e0e0e6] hover:bg-[#1a1a2e]"
                >
                  {command.label}
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="px-3 py-2 text-sm text-[#60606a]">No command found</p>
              )}
            </div>
            <div className="border-t border-[#1a1a2e] px-3 py-2 text-xs text-[#60606a]">
              Shortcuts: Ctrl/Cmd+N New File, Ctrl/Cmd+S Save, Ctrl/Cmd+Shift+P Command Palette, Ctrl/Cmd+F File Search
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

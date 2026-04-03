'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Trash2 } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: '14:32:45',
      level: 'info',
      message: 'Build process initiated...',
    },
    {
      id: '2',
      timestamp: '14:32:46',
      level: 'info',
      message: 'Compiling TypeScript files...',
    },
    {
      id: '3',
      timestamp: '14:32:48',
      level: 'success',
      message: 'TypeScript compilation complete',
    },
    {
      id: '4',
      timestamp: '14:32:49',
      level: 'info',
      message: 'Processing styles and assets...',
    },
    {
      id: '5',
      timestamp: '14:32:52',
      level: 'success',
      message: 'Build completed successfully',
    },
  ])
  const [isRunning, setIsRunning] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id))
      timeoutIdsRef.current = []
    }
  }, [])

  const handleRun = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id))
    timeoutIdsRef.current = []
    setIsRunning(true)
    setLogs([
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Build process initiated...',
      },
    ])

    const logSequence = [
      { delay: 500, message: 'Compiling TypeScript files...' },
      { delay: 1000, message: 'Loading dependencies...', level: 'info' as const },
      { delay: 1500, message: 'TypeScript compilation complete', level: 'success' as const },
      { delay: 2000, message: 'Processing styles and assets...' },
      { delay: 2800, message: 'Bundling modules...', level: 'info' as const },
      { delay: 3500, message: 'Build completed successfully', level: 'success' as const },
    ]

    let logIndex = 0

    const addLog = () => {
      if (logIndex < logSequence.length) {
        const logItem = logSequence[logIndex]
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            level: logItem.level || 'info',
            message: logItem.message,
          },
        ])
        logIndex++
        const timeoutId = setTimeout(addLog, logItem.delay)
        timeoutIdsRef.current.push(timeoutId)
      } else {
        setIsRunning(false)
      }
    }

    const timeoutId = setTimeout(addLog, logSequence[0].delay)
    timeoutIdsRef.current.push(timeoutId)
  }

  const handleStop = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id))
    timeoutIdsRef.current = []
    setIsRunning(false)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-[#00ff88]'
      case 'warning':
        return 'text-[#ffaa00]'
      case 'error':
        return 'text-[#ff3333]'
      default:
        return 'text-[#00d9ff]'
    }
  }

  const handleClear = () => {
    setLogs([])
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a2e] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e6]">Terminal</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm">Run</span>
          </button>
          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="p-2 rounded-lg bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] hover:bg-[#ff3333]/20 transition-all duration-200"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-lg bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] text-[#a0a0a6] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm bg-[#0f0f17]/50 [scrollbar-width:thin] [scrollbar-color:#1a1a2e_transparent]">
        {logs.length === 0 ? (
          <div className="text-[#a0a0a6] text-center py-8 flex flex-col items-center gap-3">
            <div className="text-4xl opacity-30">›</div>
            <p>No logs yet. Click &quot;Run&quot; to start the build process.</p>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={log.id}
              className={`flex gap-4 animate-stream-in ${getLevelColor(log.level)} ${
                idx === logs.length - 1 ? 'font-semibold' : ''
              }`}
              style={{
                animationDelay: `${idx * 50}ms`,
              }}
            >
              <span className="text-[#a0a0a6] flex-shrink-0 w-20">
                {log.timestamp}
              </span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Status Bar */}
      {logs.length > 0 && (
        <div className="p-3 border-t border-[#1a1a2e] text-xs text-[#a0a0a6] flex items-center justify-between">
          <span>
            {logs.length} log{logs.length !== 1 ? 's' : ''} • Status:{' '}
            <span className={isRunning ? 'text-[#ffaa00]' : 'text-[#00ff88]'}>
              {isRunning ? 'Running' : 'Ready'}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

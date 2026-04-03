'use client'

import { Zap } from 'lucide-react'

interface StatusBarProps {
  projectName?: string
  status?: 'idle' | 'processing' | 'completed'
  activityCount?: number
}

export function StatusBar({
  projectName = 'ASTRA Dashboard',
  status = 'idle',
  activityCount = 0,
}: StatusBarProps) {
  const statusConfig = {
    idle: {
      color: 'text-[#00d9ff]',
      dotColor: 'bg-[#00d9ff]',
      label: 'Ready',
      pulsing: false,
    },
    processing: {
      color: 'text-[#ffaa00]',
      dotColor: 'bg-[#ffaa00]',
      label: 'Processing',
      pulsing: true,
    },
    completed: {
      color: 'text-[#00ff88]',
      dotColor: 'bg-[#00ff88]',
      label: 'Completed',
      pulsing: false,
    },
  }

  const config = statusConfig[status]

  return (
    <div className="h-10 bg-[#0f0f17] border-t border-[#1a1a2e] flex items-center justify-between px-4 text-xs text-[#a0a0a6] font-mono">
      {/* Left side - Project info */}
      <div className="flex items-center gap-3">
        <span className="text-[#e0e0e6]">{projectName}</span>
        <div className="w-px h-4 bg-[#1a1a2e]" />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.dotColor} ${config.pulsing ? 'animate-pulse' : ''}`} />
          <span className={config.color}>{config.label}</span>
        </div>
      </div>

      {/* Right side - Activity */}
      {activityCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-[#1a1a2e]" />
          <Zap className="w-3 h-3 text-[#ffaa00]" />
          <span>{activityCount} active task{activityCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}

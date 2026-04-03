'use client'

import { Fragment } from 'react'

interface MessageProps {
  content: string
  sender: 'user' | 'assistant'
  timestamp?: Date
}

export function Message({ content, sender, timestamp }: MessageProps) {
  const isUser = sender === 'user'
  const parts = content.split(/```/)

  return (
    <div
      className={`flex gap-4 animate-stream-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser
            ? 'bg-[#1a1a2e] text-[#e0e0e6]'
            : 'bg-gradient-to-br from-[#00d9ff] to-[#b100ff] text-[#0a0a0f] neon-glow-blue'
        }`}
      >
        {isUser ? 'YOU' : 'A'}
      </div>

      {/* Message Bubble */}
      <div
        className={`flex-1 ${
          isUser ? 'flex justify-end' : 'flex justify-start'
        }`}
      >
        <div
          className={`max-w-md px-4 py-3 rounded-lg border ${
            isUser
              ? 'bg-[#1a1a2e] border-[#00d9ff]/30 text-[#e0e0e6]'
              : 'bg-[#141420] border-[#b100ff]/30 text-[#e0e0e6] glow-box-violet'
          }`}
        >
          <div className="text-sm leading-relaxed space-y-3 whitespace-pre-wrap break-words">
            {parts.map((part, index) => {
              const isCodeBlock = index % 2 === 1

              if (!isCodeBlock) {
                return <Fragment key={`text-${index}`}>{part}</Fragment>
              }

              const lines = part.split('\n')
              const maybeLanguage = lines[0]?.trim()
              const code = lines.slice(maybeLanguage ? 1 : 0).join('\n').trim()

              return (
                <pre
                  key={`code-${index}`}
                  className="overflow-x-auto rounded-lg border border-[#2a2a3d] bg-black/40 p-3 text-xs leading-relaxed text-[#d8d8e2]"
                >
                  {maybeLanguage && maybeLanguage.length < 20 ? `${maybeLanguage}\n` : ''}
                  {code}
                </pre>
              )
            })}
          </div>
          {timestamp && (
            <p className="text-xs text-[#a0a0a6] mt-2 opacity-70">
              {String(timestamp.getHours()).padStart(2, '0')}:
              {String(timestamp.getMinutes()).padStart(2, '0')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

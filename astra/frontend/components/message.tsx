'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'

interface MessageProps {
  content: string
  sender: 'user' | 'assistant' | 'system'
  timestamp?: Date
}

export function Message({ content, sender, timestamp }: MessageProps) {
  const isUser = sender === 'user'
  const isSystem = sender === 'system'

  return (
    <div
      className={`flex gap-4 animate-stream-in ${
        isSystem ? 'justify-center' : isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {isSystem ? (
        <div className="max-w-lg rounded-full border border-[#00d9ff]/30 bg-[#0f1720] px-4 py-2 text-xs text-[#a0a0a6] shadow-lg shadow-[#00d9ff]/10">
          {content}
        </div>
      ) : (
        <>
          <div
            className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              isUser
                ? 'bg-[#1a1a2e] text-[#e0e0e6]'
                : 'bg-gradient-to-br from-[#00d9ff] to-[#b100ff] text-[#0a0a0f] neon-glow-blue'
            }`}
          >
            {isUser ? 'YOU' : 'A'}
          </div>

          <div className={`flex-1 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
            <div
              className={`max-w-md px-4 py-3 rounded-lg border ${
                isUser
                  ? 'bg-[#1a1a2e] border-[#00d9ff]/30 text-[#e0e0e6]'
                  : 'bg-[#141420] border-[#b100ff]/30 text-[#e0e0e6] glow-box-violet'
              }`}
            >
              <div className="text-sm leading-relaxed break-words message-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const { children, className } = props
                      const match = /language-(\w+)/.exec(className || '')
                      const code = String(children).replace(/\n$/, '')

                      if (!match) {
                        return (
                          <code className="rounded bg-black/30 px-1 py-0.5 text-xs">
                            {children}
                          </code>
                        )
                      }

                      const language = match[1].toLowerCase()
                      const grammar = Prism.languages[language] || Prism.languages.javascript
                      const highlighted = Prism.highlight(code, grammar, language)

                      return (
                        <pre className="overflow-x-auto rounded-lg border border-[#2a2a3d] bg-black/40 p-3 text-xs leading-relaxed">
                          <code
                            className={`language-${language}`}
                            dangerouslySetInnerHTML={{ __html: highlighted }}
                          />
                        </pre>
                      )
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              {timestamp && (
                <p className="text-xs text-[#a0a0a6] mt-2 opacity-70">
                  {String(timestamp.getHours()).padStart(2, '0')}:
                  {String(timestamp.getMinutes()).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

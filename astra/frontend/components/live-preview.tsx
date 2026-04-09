'use client'

import { useEffect, useMemo, useState } from 'react'

interface CodeFile {
  id: string
  name: string
  language: string
  content: string
}

interface EditorStateEventPayload {
  files: CodeFile[]
  activeFileId: string
}

interface LivePreviewProps {
  editorCode?: string
  editorLanguage?: string
}

function buildPreviewDocument(files: CodeFile[], activeFile: CodeFile | null, editorCode?: string, editorLanguage?: string): string {
  const htmlFiles = files.filter((file) => file.language === 'html' || file.name.endsWith('.html'))
  const cssFiles = files.filter((file) => file.language === 'css' || file.name.endsWith('.css'))
  const jsFiles = files.filter((file) => file.language === 'javascript' || file.name.endsWith('.js'))

  const fallbackHtml =
    editorLanguage === 'html' && editorCode
      ? editorCode
      : htmlFiles[0]?.content || '<main id="app" style="font-family: sans-serif; padding: 20px;"><h1>Live Preview</h1><p>Add an HTML file to your editor to render a full page.</p></main>'

  const cssBundle = cssFiles.map((file) => file.content).join('\n\n')
  const jsBundle = jsFiles.map((file) => file.content).join('\n\n')

  const htmlHasDocumentTag = /<\s*html[\s>]/i.test(fallbackHtml)

  if (htmlHasDocumentTag) {
    return fallbackHtml
      .replace('</head>', `<style>${cssBundle}</style></head>`)
      .replace('</body>', `<script>${jsBundle}</script></body>`)
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${cssBundle}</style>
  </head>
  <body>
    ${fallbackHtml}
    <script>${jsBundle}</script>
  </body>
</html>`
}

export function LivePreview({ editorCode, editorLanguage }: LivePreviewProps) {
  const [files, setFiles] = useState<CodeFile[]>([])
  const [activeFileId, setActiveFileId] = useState('')

  useEffect(() => {
    const loadLocalEditorState = () => {
      try {
        const savedFiles = window.localStorage.getItem('astra-code-files')
        const savedActiveFile = window.localStorage.getItem('astra-active-file')

        if (savedFiles) {
          const parsed = JSON.parse(savedFiles) as CodeFile[]
          if (Array.isArray(parsed)) {
            setFiles(parsed)
          }
        }

        if (savedActiveFile) {
          setActiveFileId(savedActiveFile)
        }
      } catch {
        // Ignore malformed local state and render fallback preview.
      }
    }

    const onEditorStateUpdate = (event: Event) => {
      const detail = (event as CustomEvent<EditorStateEventPayload>).detail
      if (!detail) {
        return
      }

      setFiles(detail.files || [])
      setActiveFileId(detail.activeFileId || '')
    }

    loadLocalEditorState()
    window.addEventListener('astra:editor-state', onEditorStateUpdate as EventListener)

    return () => {
      window.removeEventListener('astra:editor-state', onEditorStateUpdate as EventListener)
    }
  }, [])

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) || null,
    [files, activeFileId],
  )

  const srcDoc = useMemo(
    () => buildPreviewDocument(files, activeFile, editorCode, editorLanguage),
    [activeFile, editorCode, editorLanguage, files],
  )

  return (
    <div className="h-full rounded-xl border border-[#1a1a2e] bg-[#0f0f17] overflow-hidden">
      <iframe
        title="ASTRA Live Preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="w-full h-full border-none bg-white"
      />
    </div>
  )
}

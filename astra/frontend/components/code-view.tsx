'use client'

import { useState, useEffect } from 'react'
import { Copy, Download, Send, Chrome, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

interface CodeEditorProps {
  filename?: string
  code: string
  language: string
  projectName?: string
  onClose?: () => void
}

export function CodeEditor({ filename = 'generated.js', code, language, projectName = 'astra-project', onClose }: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState('code')
  const [previewContent, setPreviewContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [previewPath, setPreviewPath] = useState('')
  const [copied, setCopied] = useState(false)

  // Try to load preview if HTML file
  useEffect(() => {
    if (language === 'html' && code) {
      // For HTML, we can create a blob URL or pass the code directly
      const previewData = `data:text/html;base64,${btoa(code)}`
      setPreviewPath(previewData)
    }
  }, [code, language])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveToFile = async () => {
    setIsSaving(true)
    setSaveStatus('Saving...')
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/save-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          code,
          language,
          project_name: projectName,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setSaveStatus(`✓ Saved to: ${result.project_dir}`)
        if (result.vscode_opened) {
          setSaveStatus('✓ Opened in VS Code!')
        }
        // Auto-open preview if HTML
        if (language === 'html' && result.file_path) {
          setPreviewPath(`${BACKEND_BASE_URL}/preview/html?file_path=${encodeURIComponent(result.full_path)}`)
          setActiveTab('preview')
        }
      } else {
        setSaveStatus(`Error: ${result.error || 'Failed to save'}`)
      }
    } catch (error) {
      setSaveStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const downloadCode = () => {
    const element = document.createElement('a')
    const file = new Blob([code], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white rounded-lg border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-400" />
          <span className="font-mono text-sm">{filename}</span>
          <span className="text-xs text-zinc-500 ml-2">({language})</span>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus && <span className="text-xs text-green-400">{saveStatus}</span>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full border-b border-zinc-800 bg-zinc-950 rounded-none">
          <TabsTrigger value="code">Code</TabsTrigger>
          {(language === 'html' || previewPath) && <TabsTrigger value="preview">Preview</TabsTrigger>}
        </TabsList>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <textarea
              readOnly
              value={code}
              className="flex-1 p-4 bg-zinc-900 text-zinc-100 font-mono text-sm border-none outline-none resize-none"
              style={{ tabSize: 2 }}
            />
          </div>
        </TabsContent>

        {/* Preview Tab */}
        {(language === 'html' || previewPath) && (
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {previewPath ? (
              <iframe
                src={previewPath}
                className="w-full h-full border-none"
                title="Code preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <p>No preview available for this file type</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 p-4 border-t border-zinc-800 bg-zinc-900">
        <Button
          size="sm"
          onClick={copyToClipboard}
          variant="outline"
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy'}
        </Button>

        <Button
          size="sm"
          onClick={downloadCode}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>

        <Button
          size="sm"
          onClick={saveToFile}
          disabled={isSaving}
          className="gap-2 ml-auto bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save to Editor'}
        </Button>

        {onClose && (
          <Button
            size="sm"
            onClick={onClose}
            variant="ghost"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

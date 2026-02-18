'use client'

import { useRef, useEffect } from 'react'
import { useTheme } from '@raystack/apsara'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import styles from './json-editor.module.css'

interface JsonEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export function JsonEditor({ value, onChange, readOnly }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme } = useTheme()

  const isDark = theme === 'dark'

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      basicSetup,
      json(),
      EditorView.lineWrapping,
      ...(isDark ? [oneDark] : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
      ...(onChange
        ? [EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          })]
        : []),
    ]

    const state = EditorState.create({ doc: value, extensions })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => view.destroy()
  }, [isDark, readOnly, onChange])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return <div ref={containerRef} className={styles.editor} />
}

import { useState, useRef, useEffect, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { Link } from "@tiptap/extension-link"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Underline } from "@tiptap/extension-underline"
import { TextAlign } from "@tiptap/extension-text-align"
import { Extension } from "@tiptap/core"

const TabIndent = Extension.create({
  name: "tabIndent",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive("table")) return false
        editor.chain().focus().insertContent("\u00a0\u00a0\u00a0\u00a0").run()
        return true
      },
    }
  },
})

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  isDark?: boolean
  blockType?: "content" | "image" | "table"
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
  isDark,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
  isDark?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg text-sm transition ${
        active
          ? "bg-navy-500 text-white"
          : isDark
            ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider({ isDark }: { isDark?: boolean }) {
  return <div className={`w-px h-6 mx-0.5 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
}

export default function TiptapEditor({ content, onChange, placeholder = "Write here...", isDark, blockType }: TiptapEditorProps) {
  const [tablePickerOpen, setTablePickerOpen] = useState(false)
  const [tablePickerHover, setTablePickerHover] = useState({ row: 0, col: 0 })
  const tablePickerBtnRef = useRef<HTMLButtonElement>(null)
  const tablePickerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TabIndent,
    ],
    content,
    editorProps: {
      attributes: {
        class: `tiptap min-h-[180px] outline-none px-3 py-2 text-sm ${
          isDark ? "text-gray-100" : "text-gray-800"
        }`,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  useEffect(() => {
    if (!tablePickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target as Node)) {
        setTablePickerOpen(false)
        setTablePickerHover({ row: 0, col: 0 })
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [tablePickerOpen])

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
      setTablePickerOpen(false)
      setTablePickerHover({ row: 0, col: 0 })
    },
    [editor]
  )

  if (!editor) return null

  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-0.5 p-1.5 border-b ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
        <select
          onChange={(e) => {
            const val = e.target.value
            if (val === "") {
              editor.chain().focus().setParagraph().run()
            } else {
              editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run()
            }
          }}
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : ""
          }
          className={`text-xs rounded-lg px-1.5 py-1.5 border-0 outline-none cursor-pointer ${isDark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600"}`}
        >
          <option value="">Normal</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
        </select>

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold" isDark={isDark}>
          <i className="fas fa-bold text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic" isDark={isDark}>
          <i className="fas fa-italic text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline" isDark={isDark}>
          <i className="fas fa-underline text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough" isDark={isDark}>
          <i className="fas fa-strikethrough text-xs" />
        </ToolbarBtn>

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List" isDark={isDark}>
          <i className="fas fa-list-ul text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List" isDark={isDark}>
          <i className="fas fa-list-ol text-xs" />
        </ToolbarBtn>

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote" isDark={isDark}>
          <i className="fas fa-quote-left text-xs" />
        </ToolbarBtn>

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left" isDark={isDark}>
          <i className="fas fa-align-left text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center" isDark={isDark}>
          <i className="fas fa-align-center text-xs" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right" isDark={isDark}>
          <i className="fas fa-align-right text-xs" />
        </ToolbarBtn>

        <ToolbarDivider isDark={isDark} />

        {blockType === "table" && (
          <>
            <ToolbarDivider isDark={isDark} />
            <div className="relative" ref={tablePickerBtnRef}>
              <ToolbarBtn
                onClick={() => {
                  if (tablePickerOpen) {
                    setTablePickerOpen(false)
                    setTablePickerHover({ row: 0, col: 0 })
                  } else {
                    setTablePickerOpen(true)
                    setTablePickerHover({ row: 0, col: 0 })
                  }
                }}
                active={editor.isActive("table")}
                title="Insert Table"
                isDark={isDark}
              >
                <i className="fas fa-table text-xs" />
              </ToolbarBtn>
              {tablePickerOpen && (
                <div className="fixed inset-0 z-50" onClick={() => { setTablePickerOpen(false); setTablePickerHover({ row: 0, col: 0 }) }}>
                  <div
                    ref={tablePickerRef}
                    className={`absolute z-[60] rounded-xl shadow-lg p-3 w-[220px] ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}
                    style={{ top: (tablePickerBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4, left: tablePickerBtnRef.current?.getBoundingClientRect().left ?? 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-8 gap-0.5">
                      {Array.from({ length: 8 }, (_, r) =>
                        Array.from({ length: 8 }, (_, c) => (
                          <div
                            key={`${r}-${c}`}
                            className={`w-[22px] h-[22px] border rounded-[3px] cursor-pointer transition-all ${
                              r < tablePickerHover.row && c < tablePickerHover.col
                                ? isDark ? "bg-blue-500 border-blue-500" : "bg-[#1e3a5f] border-[#1e3a5f]"
                                : isDark ? "border-gray-600" : "border-gray-300"
                            }`}
                            onMouseEnter={() => setTablePickerHover({ row: r + 1, col: c + 1 })}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              insertTable(r + 1, c + 1)
                            }}
                          />
                        ))
                      )}
                    </div>
                    <div className={`text-center text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {tablePickerHover.row > 0 && tablePickerHover.col > 0
                        ? `${tablePickerHover.row} × ${tablePickerHover.col} Table`
                        : "Insert Table"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Enter URL:")
            if (url === null) return
            if (url === "") {
              editor.chain().focus().unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
          }}
          active={editor.isActive("link")}
          title="Link"
          isDark={isDark}
        >
          <i className="fas fa-link text-xs" />
        </ToolbarBtn>

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting" isDark={isDark}>
          <i className="fas fa-eraser text-xs" />
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Tiptap styles */}
      <style>{`
        .tiptap p { margin: 0.25rem 0; }
        .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
        .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; }
        .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin: 0.5rem 0; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
        .tiptap blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75rem; margin: 0.5rem 0; color: #6b7280; font-style: italic; }
        .tiptap a { color: #2563eb; text-decoration: underline; }
        .tiptap table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; table-layout: fixed; }
        .tiptap td, .tiptap th { border: 1px solid #d1d5db; padding: 0.5rem; position: relative; min-width: 60px; }
        .tiptap th { background: #f3f4f6; font-weight: 600; }
        .tiptap .selectedCell::after { content: ""; position: absolute; inset: 0; background: rgba(30, 58, 95, 0.1); pointer-events: none; }
        .tiptap .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #3b82f6; cursor: col-resize; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .tiptap-dark .tiptap { color: #f3f4f6; }
        .tiptap-dark .tiptap blockquote { color: #9ca3af; border-color: #4b5563; }
        .tiptap-dark .tiptap a { color: #60a5fa; }
        .tiptap-dark .tiptap td, .tiptap-dark .tiptap th { border-color: #4b5563; }
        .tiptap-dark .tiptap th { background: #374151; }
        .tiptap-dark .tiptap .selectedCell::after { background: rgba(96, 165, 250, 0.15); }
        .tiptap-dark .tiptap p.is-editor-empty:first-child::before { color: #4b5563; }
      `}</style>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from "react"
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { Link } from "@tiptap/extension-link"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Underline } from "@tiptap/extension-underline"
import { TextAlign } from "@tiptap/extension-text-align"
import { Image } from "@tiptap/extension-image"
import { Extension, Node } from "@tiptap/core"

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

function ImageNodeView({ node, selected, editor, getPos, deleteNode }: {
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  selected: boolean
  editor: any
  getPos: () => number
  deleteNode: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const addFileRef = useRef<HTMLInputElement>(null)
  const [hovered, setHovered] = useState(false)

  const selectNode = useCallback(() => {
    if (!editor || !getPos) return
    const pos = getPos()
    editor.chain().focus().setNodeSelection(pos).run()
  }, [editor, getPos])

  const handleAddImage = useCallback((file: File) => {
    if (!editor || !getPos) return
    const pos = getPos() + node.nodeSize
    const reader = new FileReader()
    reader.onload = () => {
      const imgHtml = `<img src="${reader.result}" alt="${file.name}">`
      editor.chain().focus().insertContentAt(pos, imgHtml).run()
    }
    reader.readAsDataURL(file)
  }, [editor, getPos, node.nodeSize])

  return (
    <NodeViewWrapper
      className="image-resize-wrapper"
      onClick={() => { selectNode() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        selectNode()
        window.dispatchEvent(new CustomEvent("tiptap-image-contextmenu", {
          detail: {
            x: e.clientX,
            y: e.clientY,
            src: node.attrs.src,
            deleteNode,
          },
        }))
      }}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        style={{ cursor: "pointer", display: "block", borderRadius: "0.5rem" }}
        className={selected ? "ProseMirror-selectednode" : ""}
      />
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: -18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            zIndex: 12,
          }}
          onClick={(e) => { e.stopPropagation(); addFileRef.current?.click() }}
          title="Add image below"
        >
          <i className="fas fa-plus" style={{ color: "white", fontSize: 12 }} />
        </div>
      )}
      <input
        ref={addFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleAddImage(file)
          e.target.value = ""
        }}
      />
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
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
  const [tableCtx, setTableCtx] = useState<{ x: number; y: number } | null>(null)
  const tableCtxRef = useRef<HTMLDivElement>(null)
  const [imageCtx, setImageCtx] = useState<{ x: number; y: number; nodePos: number } | null>(null)
  const imageCtxRef = useRef<HTMLDivElement>(null)
  const imageDeleteRef = useRef<(() => void) | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const ed = editorRef.current
    if (!ed) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"))
    if (imageFiles.length === 0) return
    imageFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        ed.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run()
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const transformPastedHTML = useCallback((html: string): string => {
    if (!/<table[\s>]/i.test(html)) return html
    const doc = new DOMParser().parseFromString(html, "text/html")
    const table = doc.querySelector("table")
    if (!table) return html

    const cleanCellContent = (cell: Element): string => {
      const tmp = document.createElement("div")
      Array.from(cell.childNodes).forEach((node) => tmp.appendChild(node.cloneNode(true)))
      let html = tmp.innerHTML
      html = html.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
      html = html.replace(/<\/?o:p[^>]*>/gi, "")
      html = html.replace(/<m:o[^>]*>[\s\S]*?<\/m:o[^>]*>/gi, "")
      html = html.replace(/<\/?m:[^>]*>/gi, "")
      html = html.replace(/<w:sdt[^>]*>[\s\S]*?<\/w:sdt>/gi, "")
      html = html.replace(/<\/?w:[^>]*>/gi, "")
      html = html.replace(/<font[^>]*>/gi, "")
      html = html.replace(/<\/font>/gi, "")
      html = html.replace(/<span\s*style="[^"]*mso-[^"]*"[^>]*>/gi, "")
      html = html.replace(/<span\s+class="[^"]*"/gi, "<span")
      html = html.replace(/&nbsp;/g, " ")
      html = html.replace(/<p[^>]*>\s*<\/p>/gi, "")
      html = html.replace(/<div[^>]*>\s*<\/div>/gi, "")
      html = html.replace(/<br\s*\/?>\s*<br\s*\/?>/g, "<br>")
      const inner = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body
        .querySelector("div")
      if (!inner) return "<p><br></p>"
      Array.from(inner.querySelectorAll("p > p")).forEach((p) => {
        p.parentNode!.insertBefore(document.createTextNode("\n"), p)
        while (p.firstChild) p.parentNode!.insertBefore(p.firstChild, p)
        p.remove()
      })
      Array.from(inner.querySelectorAll("p")).forEach((p) => {
        while (p.firstChild) p.parentNode!.insertBefore(p.firstChild, p)
        p.remove()
      })
      inner.querySelectorAll("br + br, br:only-child").forEach((br) => {
        const prev = br.previousSibling
        if (!prev || (prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim())) br.remove()
      })
      let result = inner.innerHTML.trim()
      result = result.replace(/<br\s*\/?>$/gi, "")
      if (!result.trim() || result === "<br>" || result === "<br/>" || result === "<br />") return "<p><br></p>"
      if (!result.startsWith("<p>")) result = `<p>${result}</p>`
      return result
    }

    const cleanTable = (tbl: Element): string => {
      const allRows = tbl.querySelectorAll("tr")
      if (allRows.length === 0) return ""

      const hasThead = tbl.querySelector(":scope > thead") !== null
      let out = "<table>"
      allRows.forEach((tr, rowIdx) => {
        out += "<tr>"
        tr.querySelectorAll(":scope > th, :scope > td").forEach((cell) => {
          const isTh = cell.tagName.toLowerCase() === "th" || (hasThead && rowIdx === 0 && cell.closest("thead") !== null)
          const tag = isTh ? "th" : "td"
          const colspan = parseInt(cell.getAttribute("colspan") || "1", 10)
          const rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10)
          const attrs: string[] = []
          if (colspan > 1) attrs.push(`colspan="${colspan}"`)
          if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`)
          const content = cleanCellContent(cell)
          out += `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>${content}</${tag}>`
        })
        out += "</tr>"
      })
      out += "</table>"
      return out
    }

    const tables = doc.querySelectorAll("table")
    let result = ""
    tables.forEach((tbl) => { result += cleanTable(tbl) })
    return result || html
  }, [])

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
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
      TabIndent,
    ],
    content,
    editorProps: {
      attributes: {
        class: `tiptap min-h-[180px] outline-none px-3 py-2 text-sm ${
          isDark ? "text-gray-100" : "text-gray-800"
        }`,
      },
      transformPastedHTML,
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        const imageFiles: File[] = []
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) imageFiles.push(file)
          }
        }
        if (imageFiles.length > 0) {
          event.preventDefault()
          handleImageFiles(imageFiles)
          return true
        }
        return false
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"))
        if (imageFiles.length > 0) {
          event.preventDefault()
          handleImageFiles(imageFiles)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  useEffect(() => { editorRef.current = editor }, [editor])

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

  useEffect(() => {
    if (!tableCtx) return
    const handleClick = (e: MouseEvent) => {
      if (tableCtxRef.current && !tableCtxRef.current.contains(e.target as Node)) setTableCtx(null)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTableCtx(null) }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey) }
  }, [tableCtx])

  useEffect(() => {
    if (!imageCtx) return
    const handleClick = (e: MouseEvent) => {
      if (imageCtxRef.current && !imageCtxRef.current.contains(e.target as Node)) setImageCtx(null)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setImageCtx(null) }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey) }
  }, [imageCtx])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || !editor) return
      imageDeleteRef.current = detail.deleteNode || null
      let nodePos = -1
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.src === detail.src) {
          nodePos = pos
          return false
        }
      })
      if (nodePos >= 0) {
        setImageCtx({ x: detail.x, y: detail.y, nodePos })
      }
    }
    window.addEventListener("tiptap-image-contextmenu", handler)
    return () => window.removeEventListener("tiptap-image-contextmenu", handler)
  }, [editor])

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

        {(blockType === "content" || blockType === "table") && (
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

        <ToolbarBtn
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
          isDark={isDark}
        >
          <i className="fas fa-image text-xs" />
        </ToolbarBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) handleImageFiles(files)
            e.target.value = ""
          }}
        />

        <ToolbarDivider isDark={isDark} />

        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting" isDark={isDark}>
          <i className="fas fa-eraser text-xs" />
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        onContextMenu={(e) => {
          if (!editor) return
          const isInsideTable = editor.isActive("table")
          if (isInsideTable) {
            e.preventDefault()
            setTableCtx({ x: e.clientX, y: e.clientY })
          }
        }}
      />

      {/* Table Context Menu */}
      {tableCtx && editor && (
        <div className="fixed inset-0 z-[80]" onContextMenu={(e) => { e.preventDefault(); setTableCtx(null) }}>
          <div
            ref={tableCtxRef}
            className={`fixed z-[81] min-w-[200px] rounded-xl border shadow-2xl py-1.5 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            style={{ left: Math.min(tableCtx.x, window.innerWidth - 220), top: Math.min(tableCtx.y, window.innerHeight - 320) }}
          >
            <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Table
            </div>
            <div className={`my-1 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`} />
            {[
              { icon: "fa-arrow-up", label: "Insert Row Above", action: () => { editor.chain().focus().addRowBefore().run(); setTableCtx(null) } },
              { icon: "fa-arrow-down", label: "Insert Row Below", action: () => { editor.chain().focus().addRowAfter().run(); setTableCtx(null) } },
              { icon: "fa-arrow-left", label: "Insert Column Left", action: () => { editor.chain().focus().addColumnBefore().run(); setTableCtx(null) } },
              { icon: "fa-arrow-right", label: "Insert Column Right", action: () => { editor.chain().focus().addColumnAfter().run(); setTableCtx(null) } },
              { divider: true },
              { icon: "fa-minus", label: "Delete Row", danger: true, action: () => { editor.chain().focus().deleteRow().run(); setTableCtx(null) } },
              { icon: "fa-minus", label: "Delete Column", danger: true, action: () => { editor.chain().focus().deleteColumn().run(); setTableCtx(null) } },
              { icon: "fa-trash-alt", label: "Delete Table", danger: true, action: () => { editor.chain().focus().deleteTable().run(); setTableCtx(null) } },
            ].map((item, i) => {
              if ("divider" in item && item.divider) return <div key={i} className={`my-1 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`} />
              const mi = item as { icon: string; label: string; danger?: boolean; action: () => void }
              return (
                <button
                  key={i}
                  onClick={mi.action}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition ${
                    mi.danger
                      ? isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-500 hover:bg-red-50"
                      : isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <i className={`fas ${mi.icon} w-4 text-center text-[10px] ${mi.danger ? "" : isDark ? "text-gray-500" : "text-gray-400"}`} />
                  {mi.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Image Context Menu */}
      {imageCtx && editor && (
        <div className="fixed inset-0 z-[80]" onContextMenu={(e) => { e.preventDefault(); setImageCtx(null) }}>
          <div
            ref={imageCtxRef}
            className={`fixed z-[81] min-w-[180px] rounded-xl border shadow-2xl py-1.5 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            style={{ left: Math.min(imageCtx.x, window.innerWidth - 200), top: Math.min(imageCtx.y, window.innerHeight - 80) }}
          >
            <button
              onClick={() => {
                if (imageDeleteRef.current) {
                  imageDeleteRef.current()
                } else {
                  editor.chain().focus().deleteSelection().run()
                }
                setImageCtx(null)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition ${
                isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-500 hover:bg-red-50"
              }`}
            >
              <i className="fas fa-trash-alt w-4 text-center text-[10px]" />
              Delete Image
            </button>
          </div>
        </div>
      )}

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
        .tiptap table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; table-layout: auto; overflow: hidden; border-radius: 0.5rem; border: 1px solid #d1d5db; }
        .tiptap td, .tiptap th { border: 1px solid #d1d5db; padding: 0.375rem 0.5rem; position: relative; line-height: 1.5; vertical-align: top; }
        .tiptap td p, .tiptap th p { margin: 0; }
        .tiptap th { background: #1e3a5f; color: #ffffff; font-weight: 600; text-align: left; }
        .tiptap td:first-child { font-weight: 500; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0; cursor: pointer; display: block; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid #3b82f6; outline-offset: 2px; }
        .tiptap .image-resize-wrapper { position: relative; display: inline-block; line-height: 0; }
        .tiptap .image-resize-wrapper:hover { outline: 2px dashed rgba(59,130,246,0.4); outline-offset: 4px; border-radius: 4px; }
        .tiptap .image-resize-wrapper.ProseMirror-selectednode { outline: none; }
        .tiptap .wrap-inline { margin: 0.5rem 0; }
        .tiptap::after { content: ""; display: table; clear: both; }
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
        .tiptap-dark .tiptap th { background: #1e3a5f; color: #f3f4f6; }
        .tiptap-dark .tiptap table { border-color: #4b5563; }
        .tiptap-dark .tiptap .selectedCell::after { background: rgba(96, 165, 250, 0.15); }
        .tiptap-dark .tiptap p.is-editor-empty:first-child::before { color: #4b5563; }
      `}</style>
    </div>
  )
}

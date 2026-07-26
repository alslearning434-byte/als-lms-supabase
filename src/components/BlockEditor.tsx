import { useState, useRef, useEffect, useCallback } from "react"
import TiptapEditor from "./TiptapEditor"
import TaskBuilder from "./TaskBuilder"
import type { ModuleContent, ModuleBlock, BlockType } from "../types"

interface BlockEditorProps {
  module: ModuleContent
  index: number
  moduleCount: number
  onChange: (updated: ModuleContent) => void
  onRemove: () => void
  isDark?: boolean
  subject?: string
  isActive?: boolean
}

let blockIdCounter = 0
function newBlockId(): string {
  return `blk_${Date.now()}_${++blockIdCounter}`
}

function makeBlock(type: BlockType): ModuleBlock {
  const base: ModuleBlock = { id: newBlockId(), type, topic: "", description: "" }
  if (type === "image") return { ...base, imageData: "" }
  return base
}

const blockTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  content: { label: "Content", icon: "fa-align-left", color: "bg-blue-100 text-blue-600" },
  image: { label: "Content", icon: "fa-align-left", color: "bg-blue-100 text-blue-600" },
  table: { label: "Content", icon: "fa-align-left", color: "bg-blue-100 text-blue-600" },
}

export default function BlockEditor({ module, index, moduleCount, onChange, onRemove, isDark, subject, isActive }: BlockEditorProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; blockIdx: number } | null>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const handleClick = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) setCtxMenu(null)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCtxMenu(null) }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey) }
  }, [ctxMenu])
  const updateField = (field: keyof ModuleContent, value: string) => {
    onChange({ ...module, [field]: value })
  }

  const updateBlock = (blockId: string, partial: Partial<ModuleBlock>) => {
    onChange({
      ...module,
      blocks: module.blocks.map((b) => (b.id === blockId ? { ...b, ...partial } : b)),
    })
  }

  const addBlock = (type: BlockType) => {
    onChange({ ...module, blocks: [...module.blocks, makeBlock(type)] })
  }

  const removeBlock = (blockId: string) => {
    onChange({ ...module, blocks: module.blocks.filter((b) => b.id !== blockId) })
  }

  const moveBlock = (blockId: string, dir: "up" | "down") => {
    const blocks = [...module.blocks]
    const i = blocks.findIndex((b) => b.id === blockId)
    const swap = dir === "up" ? i - 1 : i + 1
    if (swap < 0 || swap >= blocks.length) return
    ;[blocks[i], blocks[swap]] = [blocks[swap], blocks[i]]
    onChange({ ...module, blocks })
  }

  const duplicateBlock = (blockId: string) => {
    const block = module.blocks.find((b) => b.id === blockId)
    if (!block) return
    const dup: ModuleBlock = { ...block, id: newBlockId(), topic: block.topic + " (copy)", description: block.description }
    if (block.imageData) dup.imageData = block.imageData
    const idx = module.blocks.findIndex((b) => b.id === blockId)
    const next = [...module.blocks]
    next.splice(idx + 1, 0, dup)
    onChange({ ...module, blocks: next })
    setCtxMenu(null)
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all duration-200 ${
      isActive
        ? isDark ? "bg-navy-600/5 border-navy-500 ring-2 ring-navy-500/20 shadow-lg shadow-navy-500/5" : "bg-navy-50/30 border-navy-400 ring-2 ring-navy-400/20 shadow-lg shadow-navy-500/5"
        : isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Module {index + 1}
        </span>
        {moduleCount > 1 && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-sm transition">
            <i className="fas fa-trash-alt" />
          </button>
        )}
      </div>

      <input
        type="text"
        value={module.name}
        onChange={(e) => updateField("name", e.target.value)}
        placeholder="Module name (e.g. Lesson 1: Introduction)"
        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
      />

      <textarea
        value={module.description}
        onChange={(e) => updateField("description", e.target.value)}
        rows={2}
        placeholder="Module description (optional)"
        className={`w-full p-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
      />

      {module.blocks.map((block, blockIdx) => {
        const cfg = blockTypeConfig[block.type]
        return (
          <div key={block.id} className={`rounded-lg border p-3 space-y-2 ${isDark ? "bg-gray-900/50 border-gray-700" : "bg-white border-gray-200"}`}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, blockIdx }) }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                  <i className={`fas ${cfg.icon} mr-1`} />{cfg.label}
                </span>
                <div className="flex items-center">
                  <button
                    onClick={() => moveBlock(block.id, "up")}
                    disabled={blockIdx === 0}
                    className={`p-1 rounded transition disabled:opacity-30 ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                    title="Move up"
                  >
                    <i className="fas fa-chevron-up text-[10px]" />
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, "down")}
                    disabled={blockIdx === module.blocks.length - 1}
                    className={`p-1 rounded transition disabled:opacity-30 ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                    title="Move down"
                  >
                    <i className="fas fa-chevron-down text-[10px]" />
                  </button>
                </div>
              </div>
              <button onClick={() => removeBlock(block.id)} className="text-red-400 hover:text-red-600 text-xs transition">
                <i className="fas fa-times" />
              </button>
            </div>

            <input
              type="text"
              value={block.topic}
              onChange={(e) => updateBlock(block.id, { topic: e.target.value })}
              placeholder="Topic / title (optional)"
              className={`w-full p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-gray-50 text-gray-800"}`}
            />

            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>{block.type === "image" ? "Image description" : "Content"}</label>
              <TiptapEditor
                content={block.description}
                onChange={(html) => updateBlock(block.id, { description: html })}
                placeholder={block.type === "content" ? "Write content, add tables, or paste material here..." : "Add image description..."}
                isDark={isDark}
                blockType={block.type}
              />
            </div>

          </div>
        )
      })}

      <div className="flex items-center gap-2">
        <button
          onClick={() => addBlock("content")}
          className={`flex-1 py-2 rounded-lg border border-dashed text-xs font-medium transition flex items-center justify-center gap-1.5 ${isDark ? "border-gray-700 text-gray-400 hover:border-navy-500 hover:text-navy-400" : "border-gray-300 text-gray-500 hover:border-navy-500 hover:text-navy-600"}`}
        >
          <i className="fas fa-plus text-[10px]" /> Add Content
        </button>
      </div>

      {/* Tasks Section */}
      <div>
        <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Module Quiz & Tasks</label>
        <TaskBuilder
          tasks={module.tasks || []}
          onChange={(tasks) => onChange({ ...module, tasks })}
          isDark={isDark}
          moduleData={{ name: module.name, description: module.description, blocks: module.blocks, subject: subject || "" }}
        />
      </div>

      {/* Block Context Menu */}
      {ctxMenu && (() => {
        const blk = module.blocks[ctxMenu.blockIdx]
        if (!blk) return null
        const isFirst = ctxMenu.blockIdx === 0
        const isLast = ctxMenu.blockIdx === module.blocks.length - 1
        const menuItems = [
          { icon: "fa-arrow-up", label: "Move Up", disabled: isFirst, action: () => { moveBlock(blk.id, "up"); setCtxMenu(null) } },
          { icon: "fa-arrow-down", label: "Move Down", disabled: isLast, action: () => { moveBlock(blk.id, "down"); setCtxMenu(null) } },
          { icon: "fa-clone", label: "Duplicate", action: () => duplicateBlock(blk.id) },
          { icon: "fa-pen", label: "Edit Topic", action: () => { setCtxMenu(null) } },
          { divider: true },
          { icon: "fa-trash-alt", label: "Delete Block", danger: true, action: () => { removeBlock(blk.id); setCtxMenu(null) } },
        ]
        return (
          <div className="fixed inset-0 z-[70]" onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null) }}>
            <div
              ref={ctxMenuRef}
              className={`fixed z-[71] min-w-[180px] rounded-xl border shadow-2xl py-1.5 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 250) }}
            >
              {menuItems.map((item, i) => {
                if (item.divider) return <div key={i} className={`my-1 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`} />
                return (
                  <button
                    key={i}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition ${
                      item.danger
                        ? isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-500 hover:bg-red-50"
                        : item.disabled
                          ? isDark ? "text-gray-600 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                          : isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <i className={`fas ${item.icon} w-4 text-center text-[10px] ${item.danger ? "" : isDark ? "text-gray-500" : "text-gray-400"}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from "react"
import TiptapEditor from "./TiptapEditor"
import TaskBuilder from "./TaskBuilder"
import type { ModuleContent, ModuleBlock, BlockType, AdaptiveRules } from "../types"

interface BlockEditorProps {
  module: ModuleContent
  index: number
  moduleCount: number
  onChange: (updated: ModuleContent) => void
  onRemove: () => void
  isDark?: boolean
  subject?: string
  isActive?: boolean
  activeContentId?: string | null
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

export default function BlockEditor({ module, index, moduleCount, onChange, onRemove, isDark, subject, isActive, activeContentId }: BlockEditorProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; blockIdx: number } | null>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)
  const [adaptiveExpanded, setAdaptiveExpanded] = useState(false)

  const updateAdaptiveRules = (partial: Partial<AdaptiveRules>) => {
    onChange({ ...module, adaptiveRules: { ...module.adaptiveRules! , ...partial } })
  }

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
        const isHighlighted = activeContentId === block.id
        return (
          <div key={block.id} data-block-id={block.id} className={`rounded-lg border p-3 space-y-2 transition-all duration-300 ${isHighlighted
            ? isDark ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10 bg-emerald-900/10" : "border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-500/10 bg-emerald-50/50"
            : isDark ? "bg-gray-900/50 border-gray-700" : "bg-white border-gray-200"
          }`}
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
          activeContentId={activeContentId}
        />
      </div>

      {/* Adaptive Rules Section */}
      <div className={`rounded-lg border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <button onClick={() => setAdaptiveExpanded(!adaptiveExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition ${isDark ? "text-gray-400 hover:bg-gray-700/50" : "text-gray-500 hover:bg-gray-100"}`}>
          <span><i className="fas fa-bolt mr-1.5" />Adaptive Learning</span>
          <i className={`fas fa-chevron-down text-[10px] transition-transform ${adaptiveExpanded ? "rotate-180" : ""}`} />
        </button>
        {adaptiveExpanded && (
          <div className={`px-3 pb-3 space-y-3 ${isDark ? "bg-gray-900/30" : "bg-gray-50/50"}`}>
            {/* Prerequisite */}
            <div>
              <label className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Prerequisite — require passing quiz to unlock next module</span>
                <button onClick={() => updateAdaptiveRules({ prerequisite: { ...module.adaptiveRules!.prerequisite, enabled: !module.adaptiveRules!.prerequisite.enabled } })}
                  className={`relative w-8 h-4 rounded-full transition-colors ${module.adaptiveRules!.prerequisite.enabled ? "bg-navy-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${module.adaptiveRules!.prerequisite.enabled ? "translate-x-4" : ""}`} />
                </button>
              </label>
              {module.adaptiveRules!.prerequisite.enabled && (
                <div className="space-y-2 ml-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Min score: {module.adaptiveRules!.prerequisite.minScore}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={module.adaptiveRules!.prerequisite.minScore}
                    onChange={(e) => updateAdaptiveRules({ prerequisite: { ...module.adaptiveRules!.prerequisite, minScore: Number(e.target.value) } })}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-navy-500" />
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Max attempts</span>
                    <input type="number" min="0" max="10" value={module.adaptiveRules!.prerequisite.maxAttempts}
                      onChange={(e) => updateAdaptiveRules({ prerequisite: { ...module.adaptiveRules!.prerequisite, maxAttempts: Math.max(0, Number(e.target.value)) } })}
                      className={`w-16 p-1 text-xs text-center rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "border-gray-200 text-gray-700"}"`} />
                  </div>
                </div>
              )}
            </div>
            {/* Remediation */}
            <div className={`border-t pt-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <label className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Remediation — redirect to another module on failure</span>
                <button onClick={() => updateAdaptiveRules({ remediation: { ...module.adaptiveRules!.remediation, enabled: !module.adaptiveRules!.remediation.enabled } })}
                  className={`relative w-8 h-4 rounded-full transition-colors ${module.adaptiveRules!.remediation.enabled ? "bg-navy-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${module.adaptiveRules!.remediation.enabled ? "translate-x-4" : ""}`} />
                </button>
              </label>
              {module.adaptiveRules!.remediation.enabled && (
                <div className="ml-2">
                  <select value={module.adaptiveRules!.remediation.moduleIdx}
                    onChange={(e) => updateAdaptiveRules({ remediation: { ...module.adaptiveRules!.remediation, moduleIdx: Number(e.target.value) } })}
                    className={`w-full p-1.5 text-xs rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "border-gray-200 text-gray-700"}`}>
                    {Array.from({ length: moduleCount }, (_, i) => (
                      <option key={i} value={i} disabled={i === index}>Module {i + 1}{i === index ? " (current)" : ""}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Acceleration */}
            <div className={`border-t pt-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <label className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Acceleration — skip content when mastery is demonstrated</span>
                <button onClick={() => updateAdaptiveRules({ acceleration: { ...module.adaptiveRules!.acceleration, enabled: !module.adaptiveRules!.acceleration.enabled } })}
                  className={`relative w-8 h-4 rounded-full transition-colors ${module.adaptiveRules!.acceleration.enabled ? "bg-navy-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${module.adaptiveRules!.acceleration.enabled ? "translate-x-4" : ""}`} />
                </button>
              </label>
              {module.adaptiveRules!.acceleration.enabled && (
                <div className="space-y-2 ml-2">
                  <div className="flex gap-2">
                    {(["pretest", "postquiz"] as const).map((mode) => (
                      <button key={mode} onClick={() => updateAdaptiveRules({ acceleration: { ...module.adaptiveRules!.acceleration, mode } })}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
                          module.adaptiveRules!.acceleration.mode === mode
                            ? "bg-navy-500 text-white border-navy-500"
                            : isDark ? "border-gray-600 text-gray-400 hover:border-gray-500" : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>
                        {mode === "pretest" ? "Pre-test" : "Post-quiz"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Threshold: {module.adaptiveRules!.acceleration.threshold}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={module.adaptiveRules!.acceleration.threshold}
                    onChange={(e) => updateAdaptiveRules({ acceleration: { ...module.adaptiveRules!.acceleration, threshold: Number(e.target.value) } })}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-navy-500" />
                </div>
              )}
            </div>
            {/* Topics */}
            <div className={`border-t pt-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <span className={`text-[11px] font-medium block mb-1.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Topics (for recommendations)</span>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {module.adaptiveRules!.topics.map((topic, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? "bg-navy-900/50 text-navy-300" : "bg-navy-100 text-navy-700"}`}>
                    {topic}
                    <button onClick={() => updateAdaptiveRules({ topics: module.adaptiveRules!.topics.filter((_, j) => j !== i) })}
                      className="hover:opacity-70"><i className="fas fa-times" /></button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder="Type a topic and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !module.adaptiveRules!.topics.includes(val)) {
                      updateAdaptiveRules({ topics: [...module.adaptiveRules!.topics, val] })
                    }
                    (e.target as HTMLInputElement).value = ""
                  }
                }}
                className={`w-full p-1.5 text-xs rounded border ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 text-gray-700 placeholder-gray-400"}`} />
            </div>
          </div>
        )}
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

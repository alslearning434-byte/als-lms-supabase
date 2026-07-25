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

const blockTypeConfig: Record<BlockType, { label: string; icon: string; color: string }> = {
  content: { label: "Content", icon: "fa-align-left", color: "bg-blue-100 text-blue-600" },
  image: { label: "Image", icon: "fa-image", color: "bg-green-100 text-green-600" },
  table: { label: "Table", icon: "fa-table", color: "bg-purple-100 text-purple-600" },
}

export default function BlockEditor({ module, index, moduleCount, onChange, onRemove, isDark }: BlockEditorProps) {
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

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
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
          <div key={block.id} className={`rounded-lg border p-3 space-y-2 ${isDark ? "bg-gray-900/50 border-gray-700" : "bg-white border-gray-200"}`}>
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
              <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>{block.type === "table" ? "Paste or create table below" : "Description"}</label>
              <TiptapEditor
                content={block.description}
                onChange={(html) => updateBlock(block.id, { description: html })}
                placeholder={block.type === "content" ? "Write content here..." : block.type === "image" ? "Add image description..." : "Paste a table here or add one using the toolbar above..."}
                isDark={isDark}
                blockType={block.type}
              />
            </div>

            {block.type === "image" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const handler = (e: Event) => {
                        const input = e.target as HTMLInputElement
                        const file = input.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => updateBlock(block.id, { imageData: reader.result as string })
                        reader.readAsDataURL(file)
                        input.value = ""
                        input.removeEventListener("change", handler)
                      }
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "image/*"
                      input.addEventListener("change", handler)
                      input.click()
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                  >
                    <i className="fas fa-image text-[10px]" /> Upload Image
                  </button>
                  {block.imageData && (
                    <button
                      onClick={() => updateBlock(block.id, { imageData: "" })}
                      className="text-red-400 hover:text-red-600 text-xs transition"
                    >
                      <i className="fas fa-trash-alt mr-1" />Remove
                    </button>
                  )}
                </div>
                {block.imageData && (
                  <img src={block.imageData} alt="" className="w-32 h-32 object-cover rounded-lg border" />
                )}
              </div>
            )}

          </div>
        )
      })}

      <div className="flex items-center gap-2">
        {(["content", "image", "table"] as BlockType[]).map((type) => {
          const cfg = blockTypeConfig[type]
          return (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className={`flex-1 py-2 rounded-lg border border-dashed text-xs font-medium transition flex items-center justify-center gap-1.5 ${isDark ? "border-gray-700 text-gray-400 hover:border-navy-500 hover:text-navy-400" : "border-gray-300 text-gray-500 hover:border-navy-500 hover:text-navy-600"}`}
            >
              <i className={`fas ${cfg.icon} text-[10px]`} /> Add {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Tasks Section */}
      <div>
        <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Tasks & Activities</label>
        <TaskBuilder
          tasks={module.tasks || []}
          onChange={(tasks) => onChange({ ...module, tasks })}
          isDark={isDark}
        />
      </div>
    </div>
  )
}

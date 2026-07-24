import { useState } from "react"
import TiptapEditor from "./TiptapEditor"
import type { ModuleContent, ModuleBlock, BlockType, AssessmentQuestion } from "../types"

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

let qIdCounter = 0
function newQId(): string {
  return `q_${Date.now()}_${++qIdCounter}`
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
  const [assOpen, setAssOpen] = useState(false)
  const [newQText, setNewQText] = useState("")
  const [newQType, setNewQType] = useState<"Multiple Choice" | "True/False" | "Short Answer">("Multiple Choice")
  const [newQOptions, setNewQOptions] = useState<string[]>(["", ""])
  const [newQCorrect, setNewQCorrect] = useState("")

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

  const assessment = module.assessment

  const updateAssessment = (field: string, value: string) => {
    const current = assessment || { title: "", description: "", questions: [] }
    onChange({ ...module, assessment: { ...current, [field]: value } })
  }

  const addQuestion = () => {
    if (!newQText.trim()) return
    if (newQType === "Multiple Choice") {
      const opts = newQOptions.filter(o => o.trim())
      if (opts.length < 2 || !newQCorrect.trim()) return
      if (!opts.includes(newQCorrect.trim())) return
    }
    if (newQType === "True/False" && !newQCorrect) return
    if (newQType === "Short Answer" && !newQCorrect.trim()) return

    const q: AssessmentQuestion = {
      id: newQId(),
      text: newQText.trim(),
      type: newQType,
      options: newQType === "Multiple Choice" ? newQOptions.filter(o => o.trim()) : newQType === "True/False" ? ["True", "False"] : [],
      correctAnswer: newQCorrect.trim(),
    }
    const current = assessment || { title: "", description: "", questions: [] }
    onChange({ ...module, assessment: { ...current, questions: [...current.questions, q] } })
    setNewQText("")
    setNewQOptions(["", ""])
    setNewQCorrect("")
  }

  const removeQuestion = (qId: string) => {
    if (!assessment) return
    onChange({ ...module, assessment: { ...assessment, questions: assessment.questions.filter(q => q.id !== qId) } })
  }

  const removeAssessment = () => {
    onChange({ ...module, assessment: undefined })
    setAssOpen(false)
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

      {/* Assessment Section */}
      <div className={`rounded-lg border border-dashed ${isDark ? "border-amber-600/40" : "border-amber-300"}`}>
        {!assessment ? (
          <button
            onClick={() => setAssOpen(!assOpen)}
            className={`w-full py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${isDark ? "text-amber-400 hover:bg-amber-900/20" : "text-amber-600 hover:bg-amber-50"}`}
          >
            <i className="fas fa-clipboard-list text-[10px]" /> Add Assessment
          </button>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setAssOpen(!assOpen)} className={`flex items-center gap-2 text-xs font-semibold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                <i className={`fas fa-clipboard-list`} />
                Assessment ({assessment.questions.length} question{assessment.questions.length !== 1 ? "s" : ""})
                <i className={`fas fa-chevron-${assOpen ? "up" : "down"} text-[10px]`} />
              </button>
              <button onClick={removeAssessment} className="text-red-400 hover:text-red-600 text-[10px] transition">
                <i className="fas fa-trash-alt" /> Remove
              </button>
            </div>

            {assOpen && (
              <>
                <input
                  type="text"
                  value={assessment.title}
                  onChange={(e) => updateAssessment("title", e.target.value)}
                  placeholder="Assessment title (e.g. Module 1 Quiz)"
                  className={`w-full p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
                />
                <textarea
                  value={assessment.description}
                  onChange={(e) => updateAssessment("description", e.target.value)}
                  rows={2}
                  placeholder="Instructions (optional)"
                  className={`w-full p-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
                />

                {/* Existing questions */}
                {assessment.questions.length > 0 && (
                  <div className="space-y-2">
                    {assessment.questions.map((q, qi) => (
                      <div key={q.id} className={`rounded-lg p-2.5 border ${isDark ? "bg-gray-900/50 border-gray-700" : "bg-white border-gray-200"}`}>
                        <div className="flex items-start justify-between mb-1">
                          <span className={`text-[10px] font-semibold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Q{qi + 1} &middot; {q.type}</span>
                          <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600 text-[10px]">
                            <i className="fas fa-times" />
                          </button>
                        </div>
                        <p className={`text-xs font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{q.text}</p>
                        {q.type === "Multiple Choice" && (
                          <div className="mt-1 space-y-0.5">
                            {q.options.map((o, oi) => (
                              <span key={oi} className={`text-[11px] flex items-center gap-1 ${o === q.correctAnswer ? "text-green-600 font-semibold" : isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {o === q.correctAnswer ? <i className="fas fa-check-circle text-[10px]" /> : <span className="w-3" />}
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.type === "True/False" && (
                          <p className="mt-1 text-[11px] text-green-600 font-semibold">
                            <i className="fas fa-check-circle mr-1" />{q.correctAnswer}
                          </p>
                        )}
                        {q.type === "Short Answer" && (
                          <p className="mt-1 text-[11px] text-green-600 font-semibold">
                            <i className="fas fa-check-circle mr-1" />"{q.correctAnswer}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add question form */}
                <div className={`rounded-lg p-3 border border-dashed ${isDark ? "border-gray-600 bg-gray-900/30" : "border-gray-300 bg-gray-100/50"}`}>
                  <p className={`text-[11px] font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Add a Question</p>
                  <input
                    type="text"
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    placeholder="Enter question text"
                    className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 mb-2 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
                  />
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newQType}
                      onChange={(e) => { setNewQType(e.target.value as typeof newQType); setNewQCorrect(""); setNewQOptions(["", ""]) }}
                      className={`flex-1 p-2 rounded-lg border text-xs ${isDark ? "bg-gray-800 border-gray-700 text-white" : "border-gray-200 bg-white text-gray-800"}`}
                    >
                      <option value="Multiple Choice">Multiple Choice</option>
                      <option value="True/False">True/False</option>
                      <option value="Short Answer">Short Answer</option>
                    </select>
                  </div>

                  {newQType === "Multiple Choice" && (
                    <div className="space-y-1.5 mb-2">
                      {newQOptions.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`newq-correct-${index}`}
                            checked={newQCorrect === o && o.trim() !== ""}
                            disabled={!o.trim()}
                            onChange={() => setNewQCorrect(o)}
                            className="accent-green-600"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={o}
                            onChange={(e) => { const next = [...newQOptions]; next[oi] = e.target.value; setNewQOptions(next) }}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className={`flex-1 p-1.5 rounded-lg border text-xs ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
                          />
                          {newQOptions.length > 2 && (
                            <button onClick={() => { const next = newQOptions.filter((_, k) => k !== oi); setNewQOptions(next); if (newQCorrect === o) setNewQCorrect("") }} className="text-red-400 hover:text-red-600 text-[10px]">
                              <i className="fas fa-times" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setNewQOptions([...newQOptions, ""])} className="text-[11px] text-navy-500 font-medium hover:text-navy-600 transition flex items-center gap-1">
                        <i className="fas fa-plus" /> Add option
                      </button>
                    </div>
                  )}

                  {newQType === "True/False" && (
                    <div className="flex gap-2 mb-2">
                      {["True", "False"].map(v => (
                        <button key={v} onClick={() => setNewQCorrect(v)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${newQCorrect === v ? "bg-green-100 border-green-400 text-green-700" : isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                          {v === "True" ? <><i className="fas fa-check mr-1" />True</> : <><i className="fas fa-times mr-1" />False</>}
                        </button>
                      ))}
                    </div>
                  )}

                  {newQType === "Short Answer" && (
                    <input
                      type="text"
                      value={newQCorrect}
                      onChange={(e) => setNewQCorrect(e.target.value)}
                      placeholder="Correct answer"
                      className={`w-full p-1.5 rounded-lg border text-xs mb-2 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-800"}`}
                    />
                  )}

                  <button onClick={addQuestion}
                    disabled={!newQText.trim() || (newQType === "Multiple Choice" && (newQOptions.filter(o => o.trim()).length < 2 || !newQCorrect.trim())) || (newQType === "True/False" && !newQCorrect) || (newQType === "Short Answer" && !newQCorrect.trim())}
                    className={`w-full py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 ${isDark ? "bg-navy-600 text-white hover:bg-navy-500 disabled:opacity-50" : "bg-navy-500 text-white hover:bg-navy-600 disabled:opacity-50"}`}>
                    <i className="fas fa-plus-circle text-[10px]" /> Add Question
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

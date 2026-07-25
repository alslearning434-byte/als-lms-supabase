import { useState } from "react"
import type { ModuleTask, TaskType, RubricItem, TaskAttachment } from "../types"
import AssessmentBuilder from "./AssessmentBuilder"

const TASK_TYPES: { type: TaskType; icon: string; label: string; desc: string; color: string }[] = [
  { type: "assignment", icon: "fa-book-open", label: "Assignment", desc: "Task with instructions and file submission", color: "#1A73E8" },
  { type: "quiz", icon: "fa-clipboard-list", label: "Quiz", desc: "Auto-graded quiz with questions", color: "#0F9D58" },
  { type: "discussion", icon: "fa-comments", label: "Discussion", desc: "Open-ended question for student responses", color: "#E67C13" },
  { type: "material", icon: "fa-newspaper", label: "Material", desc: "Post content, readings, or resources", color: "#673AB7" },
]

let taskIdCounter = 0
function newTaskId(): string {
  return `task_${Date.now()}_${++taskIdCounter}`
}

export function makeTask(type: TaskType): ModuleTask {
  return {
    id: newTaskId(),
    type,
    title: "",
    description: "",
    dueDate: "",
    points: type === "quiz" || type === "assignment" ? 100 : undefined,
    attachments: [],
    assessment: type === "quiz" ? { title: "", description: "", questions: [], accentColor: "#0F9D58" } : undefined,
    rubric: [],
    allowLateSubmission: true,
    anonymous: false,
  }
}

interface Props {
  tasks: ModuleTask[]
  onChange: (tasks: ModuleTask[]) => void
  isDark?: boolean
}

export default function TaskBuilder({ tasks, onChange, isDark }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)

  const addTask = (type: TaskType) => {
    const task = makeTask(type)
    const next = [...tasks, task]
    onChange(next)
    setExpandedId(task.id)
    setTypeMenuOpen(false)
  }

  const updateTask = (taskId: string, partial: Partial<ModuleTask>) => {
    onChange(tasks.map((t) => (t.id === taskId ? { ...t, ...partial } : t)))
  }

  const removeTask = (taskId: string) => {
    onChange(tasks.filter((t) => t.id !== taskId))
    if (expandedId === taskId) setExpandedId(null)
  }

  const typeConfig = (t: TaskType) => TASK_TYPES.find((x) => x.type === t) || TASK_TYPES[0]

  return (
    <div className="space-y-3">
      {/* Task list */}
      {tasks.map((task) => {
        const cfg = typeConfig(task.type)
        const isExpanded = expandedId === task.id
        return (
          <div key={task.id} className={`rounded-xl border overflow-hidden transition group/task ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"}`}>
            {/* Task header */}
            <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`}
              onClick={() => setExpandedId(isExpanded ? null : task.id)}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + "18" }}>
                <i className={`fas ${cfg.icon} text-xs`} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  {task.title || `Untitled ${cfg.label}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.color + "18", color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {task.dueDate && <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    <i className="fas fa-calendar-day mr-1" />{new Date(task.dueDate).toLocaleDateString()}
                  </span>}
                  {task.points !== undefined && <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {task.points} pts
                  </span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); removeTask(task.id) }}
                  className={`p-1.5 rounded-lg text-xs transition opacity-0 group-hover/task:opacity-100 ${isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-400 hover:bg-red-50"}`}>
                  <i className="fas fa-trash-alt" />
                </button>
                <i className={`fas fa-chevron-${isExpanded ? "up" : "down"} text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                {/* Title */}
                <div className="pt-4">
                  <input type="text" value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder={`${cfg.label} title`}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"}`} />
                </div>

                {/* Description */}
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Instructions</label>
                  <textarea value={task.description} onChange={(e) => updateTask(task.id, { description: e.target.value })}
                    rows={3} placeholder="Add instructions for students..."
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"}`} />
                </div>

                {/* Points + Due date row */}
                <div className="flex gap-3">
                  {(task.type === "assignment" || task.type === "quiz") && (
                    <div className="flex-1">
                      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Points</label>
                      <input type="number" value={task.points ?? ""} onChange={(e) => updateTask(task.id, { points: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="100"
                        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                  )}
                  {task.type !== "material" && (
                    <div className="flex-1">
                      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Due Date</label>
                      <input type="date" value={task.dueDate || ""} onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <AttachmentsEditor task={task} update={updateTask} isDark={!!isDark} />

                {/* Type-specific editors */}
                {task.type === "quiz" && task.assessment && (
                  <div>
                    <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Quiz Questions</label>
                    <AssessmentBuilder
                      assessment={task.assessment}
                      onChange={(ass) => updateTask(task.id, { assessment: ass })}
                      onRemove={() => updateTask(task.id, { assessment: undefined })}
                      isDark={isDark}
                    />
                  </div>
                )}

                {task.type === "assignment" && (
                  <RubricEditor task={task} update={updateTask} isDark={!!isDark} />
                )}

                {/* Options toggles */}
                {task.type !== "material" && (
                  <div className={`flex flex-wrap gap-4 pt-3 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => updateTask(task.id, { allowLateSubmission: !task.allowLateSubmission })}
                        className={`relative w-8 h-4 rounded-full transition-colors ${task.allowLateSubmission ? "bg-green-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${task.allowLateSubmission ? "translate-x-4" : ""}`} />
                      </div>
                      <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Allow late submission</span>
                    </label>
                    {task.type === "discussion" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div onClick={() => updateTask(task.id, { anonymous: !task.anonymous })}
                          className={`relative w-8 h-4 rounded-full transition-colors ${task.anonymous ? "bg-green-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${task.anonymous ? "translate-x-4" : ""}`} />
                        </div>
                        <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Anonymous responses</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add task button */}
      <div className="relative">
        <button onClick={() => setTypeMenuOpen(!typeMenuOpen)}
          className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2 ${isDark ? "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300" : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600"}`}>
          <i className="fas fa-plus-circle" /> Add task
        </button>

        {typeMenuOpen && (
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl border shadow-xl p-3 z-20 w-80 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <p className={`text-[10px] font-semibold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Choose task type</p>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map((tt) => (
                <button key={tt.type} onClick={() => addTask(tt.type)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${isDark ? "border-gray-700 hover:border-gray-600 hover:bg-gray-700/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tt.color + "18" }}>
                    <i className={`fas ${tt.icon} text-sm`} style={{ color: tt.color }} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{tt.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{tt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Attachments sub-editor ─── */

function AttachmentsEditor({ task, update, isDark }: { task: ModuleTask; update: (id: string, p: Partial<ModuleTask>) => void; isDark: boolean }) {
  const [newName, setNewName] = useState("")
  const [newUrl, setNewUrl] = useState("")

  const addAttachment = () => {
    if (!newName.trim() || !newUrl.trim()) return
    const att: TaskAttachment = { name: newName.trim(), url: newUrl.trim(), type: "link" }
    update(task.id, { attachments: [...task.attachments, att] })
    setNewName("")
    setNewUrl("")
  }

  const removeAttachment = (idx: number) => {
    update(task.id, { attachments: task.attachments.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Attachments</label>
      {task.attachments.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {task.attachments.map((att, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}>
              <i className="fas fa-link text-[10px] text-gray-400" />
              <span className={`text-xs flex-1 truncate ${isDark ? "text-gray-300" : "text-gray-600"}`}>{att.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-500 text-[10px]">
                <i className="fas fa-times" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Link name"
          className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white placeholder-gray-400"}`} />
        <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL"
          className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white placeholder-gray-400"}`} />
        <button onClick={addAttachment}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <i className="fas fa-plus" />
        </button>
      </div>
    </div>
  )
}

/* ─── Rubric sub-editor ─── */

function RubricEditor({ task, update, isDark }: { task: ModuleTask; update: (id: string, p: Partial<ModuleTask>) => void; isDark: boolean }) {
  const addRow = () => {
    update(task.id, { rubric: [...task.rubric, { criterion: "", points: 0 }] })
  }

  const updateRow = (idx: number, partial: Partial<RubricItem>) => {
    const next = [...task.rubric]
    next[idx] = { ...next[idx], ...partial }
    update(task.id, { rubric: next })
  }

  const removeRow = (idx: number) => {
    update(task.id, { rubric: task.rubric.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Rubric (optional)</label>
      {task.rubric.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {task.rubric.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={r.criterion} onChange={(e) => updateRow(i, { criterion: e.target.value })}
                placeholder="Criterion"
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white placeholder-gray-400"}`} />
              <input type="number" value={r.points || ""} onChange={(e) => updateRow(i, { points: Number(e.target.value) })}
                placeholder="Pts" min={0}
                className={`w-20 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "border-gray-200 bg-white"}`} />
              <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-500 text-[10px]">
                <i className="fas fa-times" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={addRow}
        className={`text-[11px] font-medium flex items-center gap-1 transition ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-500 hover:text-blue-600"}`}>
        <i className="fas fa-plus text-[9px]" /> Add rubric row
      </button>
    </div>
  )
}

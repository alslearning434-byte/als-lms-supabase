import { useState, useRef, useEffect } from "react"
import type { ModuleTask, TaskType, RubricItem, TaskAttachment, ModuleBlock, AssessmentQuestion } from "../types"
import AssessmentBuilder from "./AssessmentBuilder"

const API_BASE = (import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : "")).replace(/\/+$/, "")

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
    points: type === "assignment" ? 100 : undefined,
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
  moduleData?: { name: string; description: string; blocks: ModuleBlock[]; subject: string }
  activeContentId?: string | null
}

interface AIQuizQuestion {
  id: string
  text: string
  type: string
  options: string[]
  correctAnswer: string
  required?: boolean
}

export default function TaskBuilder({ tasks, onChange, isDark, moduleData, activeContentId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const quizTasks = tasks.filter((t) => t.type === "quiz")
  const otherTasks = tasks.filter((t) => t.type !== "quiz")
  const hasQuiz = quizTasks.length > 0

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

  const renderTask = (task: ModuleTask, isQuiz: boolean) => {
    const cfg = typeConfig(task.type)
    const isExpanded = expandedId === task.id
    const isHighlighted = activeContentId === task.id
    return (
      <div key={task.id} data-task-id={task.id} className={`rounded-xl border overflow-hidden transition-all duration-300 group/task ${isHighlighted
        ? isDark ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10 bg-emerald-900/10" : "border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-500/10 bg-emerald-50/50"
        : isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`}
          onClick={() => setExpandedId(isExpanded ? null : task.id)}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + "18" }}>
            <i className={`fas ${cfg.icon} text-xs`} style={{ color: cfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {isQuiz ? (task.assessment?.title || "Untitled Quiz") : (task.title || `Untitled ${cfg.label}`)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.color + "18", color: cfg.color }}>
                {cfg.label}
              </span>
              {isQuiz && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                  Required
                </span>
              )}
              {task.assessment && task.assessment.questions.length > 0 && (
                <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {task.assessment.questions.length} question{task.assessment.questions.length !== 1 ? "s" : ""}
                </span>
              )}
              {task.dueDate && <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                <i className="fas fa-calendar-day mr-1" />{new Date(task.dueDate).toLocaleDateString()}
              </span>}
              {!isQuiz && task.points !== undefined && <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
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

        {isExpanded && (
          <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
            {task.type !== "quiz" && (
              <>
                <div className="pt-4 flex items-center justify-between">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    <i className="fas fa-wand-magic-sparkles mr-1 text-purple-500" />AI Assistant
                  </label>
                  <button
                    onClick={async () => {
                      if (!moduleData) return
                      const endpoints: Record<string, string> = {
                        assignment: `${API_BASE}/api/generate-assignment`,
                        discussion: `${API_BASE}/api/generate-discussion`,
                        material: `${API_BASE}/api/generate-material`,
                      }
                      const url = endpoints[task.type]
                      if (!url) return
                      setAiGenerating(task.id)
                      setAiError(null)
                      try {
                        const res = await fetch(url, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            moduleTitle: moduleData.name || "Untitled Module",
                            moduleDescription: moduleData.description || "",
                            subject: moduleData.subject || "",
                            blocks: moduleData.blocks.map(b => ({ topic: b.topic || "", description: b.description || "" })),
                          }),
                        })
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Generation failed" }))
                          throw new Error(err.error || "Generation failed")
                        }
                        const data = await res.json()
                        const updates: Partial<typeof task> = {}
                        if (data.title) updates.title = data.title
                        if (data.description) updates.description = data.description
                        if (data.rubric && Array.isArray(data.rubric)) updates.rubric = data.rubric
                        updateTask(task.id, updates)
                      } catch (err) {
                        setAiError(err instanceof Error ? err.message : "Failed to generate content")
                      } finally {
                        setAiGenerating(null)
                      }
                    }}
                    disabled={aiGenerating !== null || !moduleData || moduleData.blocks.length === 0}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                      aiGenerating !== null ? "opacity-50 cursor-not-allowed " : ""
                    }${isDark ? "border-purple-700 text-purple-400 hover:bg-purple-900/20" : "border-purple-200 text-purple-600 hover:bg-purple-50"}`}
                  >
                    {aiGenerating === task.id ? (
                      <><i className="fas fa-spinner fa-spin text-[10px]" /> Generating...</>
                    ) : (
                      <><i className="fas fa-wand-magic-sparkles text-[10px]" /> Generate with AI</>
                    )}
                  </button>
                </div>

                {aiError && aiGenerating === null && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                    <i className="fas fa-exclamation-circle text-[10px] shrink-0" />
                    <span className="flex-1">{aiError}</span>
                    <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600"><i className="fas fa-times text-[10px]" /></button>
                  </div>
                )}

                {aiGenerating === task.id && (
                  <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 text-xs flex items-center gap-2">
                    <i className="fas fa-spinner fa-spin text-[10px]" />
                    <span>Generating {task.type} content with AI...</span>
                  </div>
                )}

                <div>
                  <input type="text" value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder={`${cfg.label} title`}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"}`} />
                </div>

                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Instructions</label>
                  <textarea value={task.description} onChange={(e) => updateTask(task.id, { description: e.target.value })}
                    rows={3} placeholder="Add instructions for students..."
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"}`} />
                </div>

                <div className="flex gap-3">
                  {task.type === "assignment" && (
                    <div className="flex-1">
                      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Points</label>
                      <input type="number" value={task.points ?? ""} onChange={(e) => updateTask(task.id, { points: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="100"
                        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                  )}
                  {task.type !== "material" && task.type !== "quiz" && (
                    <div className="flex-1">
                      <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-gray-500" : "text-gray-400"}`}>Due Date</label>
                      <CustomDatePicker value={task.dueDate || ""} onChange={(val) => updateTask(task.id, { dueDate: val })} isDark={!!isDark} />
                    </div>
                  )}
                </div>

                <AttachmentsEditor task={task} update={updateTask} isDark={!!isDark} />
              </>
            )}

            {task.type === "quiz" && task.assessment && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Quiz Questions</label>
                  <button
                    onClick={async () => {
                      if (!moduleData) return
                      setAiGenerating(task.id)
                      setAiError(null)
                      try {
                        const res = await fetch(`${API_BASE}/api/generate-quiz`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            moduleTitle: moduleData.name || "Untitled Module",
                            moduleDescription: moduleData.description || "",
                            subject: moduleData.subject || "",
                            blocks: moduleData.blocks.map(b => ({ topic: b.topic || "", description: b.description || "" })),
                          }),
                        })
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: "Generation failed" }))
                          throw new Error(err.error || "Generation failed")
                        }
                        const data = await res.json()
                        if (!data.questions || data.questions.length === 0) throw new Error("No questions generated")
                        const newQuestions: AssessmentQuestion[] = data.questions.map((q: AIQuizQuestion) => ({
                          id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          text: q.text || "",
                          type: q.type === "True/False" ? "True/False" as const : "Multiple Choice" as const,
                          options: Array.isArray(q.options) ? q.options : ["True", "False"],
                          correctAnswer: q.correctAnswer || "",
                          required: q.required !== false,
                        }))
                        updateTask(task.id, {
                          assessment: {
                            ...task.assessment,
                            title: task.assessment.title || moduleData.name || "Module Quiz",
                            questions: [...task.assessment.questions, ...newQuestions],
                            accentColor: task.assessment.accentColor || "#0F9D58",
                            quizSource: "ai",
                          }
                        })
                      } catch (err) {
                        setAiError(err instanceof Error ? err.message : "Failed to generate quiz")
                      } finally {
                        setAiGenerating(null)
                      }
                    }}
                    disabled={aiGenerating !== null || !moduleData || moduleData.blocks.length === 0}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                      aiGenerating !== null
                        ? "opacity-50 cursor-not-allowed "
                        : ""
                    }${isDark ? "border-purple-700 text-purple-400 hover:bg-purple-900/20" : "border-purple-200 text-purple-600 hover:bg-purple-50"}`}
                  >
                    {aiGenerating === task.id ? (
                      <><i className="fas fa-spinner fa-spin text-[10px]" /> Generating...</>
                    ) : (
                      <><i className="fas fa-wand-magic-sparkles text-[10px]" /> Generate with AI</>
                    )}
                  </button>
                </div>
                {aiError && (
                  <p className="text-[11px] text-red-500 mb-2 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle" /> {aiError}
                    <button onClick={() => setAiError(null)} className="ml-1 text-gray-400 hover:text-gray-600"><i className="fas fa-times" /></button>
                  </p>
                )}
                {aiGenerating === task.id && (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-2 ${isDark ? "bg-purple-900/10 border-purple-800/30" : "bg-purple-50 border-purple-200"}`}>
                    <i className="fas fa-spinner fa-spin text-purple-500" />
                    <div>
                      <p className={`text-xs font-medium ${isDark ? "text-purple-300" : "text-purple-700"}`}>Generating quiz questions...</p>
                      <p className={`text-[10px] ${isDark ? "text-purple-400" : "text-purple-500"}`}>AI is analyzing module content</p>
                    </div>
                  </div>
                )}
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
  }

  return (
    <div className="space-y-3">
      {/* Module Quiz Section - Prioritized */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-amber-800/40 bg-amber-900/10" : "border-amber-200 bg-amber-50/50"}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <i className="fas fa-clipboard-list text-xs text-amber-600" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>Module Quiz</p>
              <p className={`text-[10px] ${isDark ? "text-amber-400/70" : "text-amber-500"}`}>Unlocks when students complete this module</p>
            </div>
          </div>
          {!hasQuiz && (
            <button onClick={() => addTask("quiz")}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border-2 border-dashed transition flex items-center gap-1.5 ${isDark ? "border-amber-700 text-amber-400 hover:bg-amber-900/20" : "border-amber-300 text-amber-600 hover:bg-amber-100"}`}>
              <i className="fas fa-plus text-[10px]" /> Add Quiz
            </button>
          )}
        </div>
        {quizTasks.length > 0 ? (
          <div className={`border-t ${isDark ? "border-amber-800/30" : "border-amber-200/60"}`}>
            <div className="px-3 py-2 space-y-2">
              {quizTasks.map((task) => renderTask(task, true))}
            </div>
          </div>
        ) : (
          <div className={`px-4 py-4 text-center border-t ${isDark ? "border-amber-800/30" : "border-amber-200/60"}`}>
            <i className="fas fa-clipboard-list text-2xl text-amber-300 mb-2" />
            <p className={`text-xs ${isDark ? "text-amber-400/60" : "text-amber-400"}`}>No quiz added yet. Students can take this quiz after completing the module.</p>
          </div>
        )}
      </div>

      {/* Other Tasks Section */}
      {otherTasks.length > 0 && (
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            <i className="fas fa-list-check mr-1" />Other Tasks & Activities
          </p>
          <div className="space-y-2">
            {otherTasks.map((task) => renderTask(task, false))}
          </div>
        </div>
      )}

      {/* Add other task button */}
      <div className="relative">
        <button onClick={() => setTypeMenuOpen(!typeMenuOpen)}
          className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2 ${isDark ? "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300" : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600"}`}>
          <i className="fas fa-plus-circle" /> Add task
        </button>

        {typeMenuOpen && (
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl border shadow-xl p-3 z-20 w-80 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <p className={`text-[10px] font-semibold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Choose task type</p>
            <div className="grid grid-cols-3 gap-2">
              {TASK_TYPES.filter((tt) => tt.type !== "quiz").map((tt) => (
                <button key={tt.type} onClick={() => addTask(tt.type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition ${isDark ? "border-gray-700 hover:border-gray-600 hover:bg-gray-700/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: tt.color + "18" }}>
                    <i className={`fas ${tt.icon}`} style={{ color: tt.color }} />
                  </div>
                  <p className={`text-[11px] font-semibold leading-tight ${isDark ? "text-gray-200" : "text-gray-800"}`}>{tt.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Custom Date Picker ─── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function CustomDatePicker({ value, onChange, isDark }: { value: string; onChange: (val: string) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const parsed = value ? new Date(value + "T00:00:00") : null
  const [viewDate, setViewDate] = useState(parsed || new Date())

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  useEffect(() => {
    if (open && parsed) setViewDate(parsed)
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const selectDate = (day: number) => {
    const selected = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    onChange(selected)
    setOpen(false)
  }

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setOpen(false)
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-800"} ${!value ? "text-gray-400" : ""}`}>
        <span className="flex items-center gap-2">
          <i className="fas fa-calendar-day text-[11px] text-gray-400" />
          {value ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pick a date"}
        </span>
        {value && (
          <span onClick={clearDate} className="text-gray-400 hover:text-red-400 transition text-xs" title="Clear">
            <i className="fas fa-times" />
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute bottom-full left-0 mb-2 rounded-xl border shadow-xl p-3 z-30 w-[260px] ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className={`p-1.5 rounded-lg transition ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              <i className="fas fa-chevron-left text-[10px]" />
            </button>
            <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              {MONTHS[month]} {year}
            </p>
            <button type="button" onClick={nextMonth} className={`p-1.5 rounded-lg transition ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              <i className="fas fa-chevron-right text-[10px]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map((d) => (
              <div key={d} className={`text-center text-[9px] font-semibold py-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr
              return (
                <button key={day} type="button" onClick={() => selectDate(day)}
                  className={`h-7 rounded-lg text-[11px] font-medium transition flex items-center justify-center ${
                    isSelected
                      ? "bg-navy-500 text-white"
                      : isToday
                        ? isDark ? "bg-gray-700 text-navy-400" : "bg-navy-50 text-navy-600"
                        : isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                  }`}>
                  {day}
                </button>
              )
            })}
          </div>

          <div className={`flex justify-between items-center mt-2 pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
            <button type="button" onClick={() => { onChange(todayStr); setOpen(false) }}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition ${isDark ? "text-navy-400 hover:bg-gray-700" : "text-navy-600 hover:bg-navy-50"}`}>
              Today
            </button>
            {value && (
              <button type="button" onClick={clearDate}
                className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition ${isDark ? "text-red-400 hover:bg-gray-700" : "text-red-500 hover:bg-red-50"}`}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
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

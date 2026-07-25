import { useState } from "react"
import type { AssessmentQuestion, QuestionType, ModuleAssessment } from "../types"

const ACCENT_COLORS = [
  { name: "Purple", value: "#673AB7" },
  { name: "Blue", value: "#1A73E8" },
  { name: "Teal", value: "#009688" },
  { name: "Green", value: "#0F9D58" },
  { name: "Yellow", value: "#F4B400" },
  { name: "Orange", value: "#E67C13" },
  { name: "Red", value: "#D93025" },
  { name: "Pink", value: "#E91E63" },
  { name: "Navy", value: "#1B2A4A" },
]

const QUESTION_TYPES: { type: QuestionType; icon: string; label: string }[] = [
  { type: "Multiple Choice", icon: "fa-circle-dot", label: "Multiple Choice" },
  { type: "Checkboxes", icon: "fa-square-check", label: "Checkboxes" },
  { type: "Dropdown", icon: "fa-list", label: "Dropdown" },
  { type: "Short Answer", icon: "fa-pen", label: "Short Answer" },
  { type: "Paragraph", icon: "fa-align-left", label: "Paragraph" },
  { type: "True/False", icon: "fa-circle-half-stroke", label: "True / False" },
  { type: "File Upload", icon: "fa-cloud-arrow-up", label: "File Upload" },
  { type: "Number", icon: "fa-hashtag", label: "Number" },
  { type: "Date", icon: "fa-calendar", label: "Date" },
]

let qIdCounter = 0
function newQId(): string {
  return `q_${Date.now()}_${++qIdCounter}`
}

function makeQuestion(type: QuestionType): AssessmentQuestion {
  const base: AssessmentQuestion = {
    id: newQId(),
    text: "",
    type,
    options: [],
    correctAnswer: "",
    required: false,
  }
  if (type === "Multiple Choice" || type === "Checkboxes" || type === "Dropdown") {
    base.options = ["", ""]
  }
  if (type === "True/False") {
    base.options = ["True", "False"]
  }
  if (type === "Number") {
    base.min = undefined
    base.max = undefined
  }
  if (type === "File Upload") {
    base.accept = ".pdf,.doc,.docx,.jpg,.png"
  }
  return base
}

interface Props {
  assessment: ModuleAssessment | null
  onChange: (assessment: ModuleAssessment) => void
  onRemove: () => void
  isDark?: boolean
  context?: "quiz" | "assessment"
}

export default function AssessmentBuilder({ assessment, onChange, onRemove, isDark, context = "quiz" }: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({})

  const data = assessment || { title: "", description: "", questions: [], accentColor: "#673AB7" }

  const update = (partial: Partial<ModuleAssessment>) => {
    onChange({ ...data, ...partial })
  }

  const addQuestion = (type: QuestionType) => {
    const q = makeQuestion(type)
    update({ questions: [...data.questions, q] })
    setAddMenuOpen(false)
  }

  const updateQuestion = (qId: string, partial: Partial<AssessmentQuestion>) => {
    update({
      questions: data.questions.map((q) => (q.id === qId ? { ...q, ...partial } : q)),
    })
  }

  const removeQuestion = (qId: string) => {
    update({ questions: data.questions.filter((q) => q.id !== qId) })
  }

  const duplicateQuestion = (qId: string) => {
    const source = data.questions.find((q) => q.id === qId)
    if (!source) return
    const dup: AssessmentQuestion = {
      ...source,
      id: newQId(),
      options: [...source.options],
      text: source.text + " (copy)",
    }
    const idx = data.questions.findIndex((q) => q.id === qId)
    const next = [...data.questions]
    next.splice(idx + 1, 0, dup)
    update({ questions: next })
  }

  const moveQuestion = (qId: string, dir: "up" | "down") => {
    const idx = data.questions.findIndex((q) => q.id === qId)
    if (idx < 0) return
    const swap = dir === "up" ? idx - 1 : idx + 1
    if (swap < 0 || swap >= data.questions.length) return
    const next = [...data.questions]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    update({ questions: next })
  }

  const qTypeConfig = (t: QuestionType) => QUESTION_TYPES.find((x) => x.type === t) || QUESTION_TYPES[0]

  if (previewMode) {
    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="px-6 py-4 text-white" style={{ backgroundColor: data.accentColor }}>
          <h3 className="text-lg font-bold">{data.title || (context === "assessment" ? "Untitled Assessment" : "Untitled Quiz")}</h3>
          {data.description && <p className="text-sm mt-1 opacity-90">{data.description}</p>}
        </div>
        <div className="p-6 space-y-6">
          {data.questions.length === 0 && (
            <p className={`text-sm text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>No questions yet</p>
          )}
          {data.questions.map((q, i) => (
            <PreviewQuestion key={q.id} q={q} index={i} isDark={!!isDark} accentColor={data.accentColor}
              answer={previewAnswers[q.id] || ""}
              onChangeAnswer={(val) => setPreviewAnswers((prev) => ({ ...prev, [q.id]: val }))}
            />
          ))}
        </div>
        <div className={`px-6 py-4 border-t flex justify-end ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button onClick={() => { setPreviewMode(false); setPreviewAnswers({}) }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition" style={{ backgroundColor: data.accentColor }}>
            Exit Preview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className="px-6 py-4 text-white" style={{ backgroundColor: data.accentColor }}>
        <input type="text" value={data.title} onChange={(e) => update({ title: e.target.value })}
          placeholder={context === "assessment" ? "Assessment Title" : "Quiz Title"}
          className="w-full bg-transparent text-lg font-bold placeholder-white/60 outline-none border-none" />
        <input type="text" value={data.description} onChange={(e) => update({ description: e.target.value })}
          placeholder={context === "assessment" ? "Assessment description (optional)" : "Quiz description (optional)"}
          className="w-full bg-transparent text-sm mt-1 placeholder-white/50 outline-none border-none" />
        <div className="flex items-center gap-3 mt-3">
          {ACCENT_COLORS.map((c) => (
            <button key={c.value} onClick={() => update({ accentColor: c.value })}
              className={`w-5 h-5 rounded-full border-2 transition ${data.accentColor === c.value ? "border-white scale-110" : "border-white/30 hover:border-white/60"}`}
              style={{ backgroundColor: c.value }} title={c.name} />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className={`px-6 py-3 border-b flex items-center justify-between ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {data.questions.length} question{data.questions.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewMode(true)}
            className={`p-2 rounded-lg text-sm transition ${isDark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"}`} title="Preview">
            <i className="fas fa-eye" />
          </button>
          <button onClick={onRemove}
            className={`p-2 rounded-lg text-sm transition ${isDark ? "text-red-400 hover:bg-red-900/20" : "text-red-500 hover:bg-red-50"}`} title={context === "assessment" ? "Remove assessment" : "Remove quiz"}>
            <i className="fas fa-trash-alt" />
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="p-4 space-y-3">
        {data.questions.length === 0 && (
          <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"}`}>
            <i className="fas fa-clipboard-list text-3xl mb-3 block opacity-40" />
            <p className="text-sm font-medium">No questions yet</p>
            <p className="text-xs mt-1">Click "Add question" below to get started</p>
          </div>
        )}

        {data.questions.map((q, i) => {
          const cfg = qTypeConfig(q.type)
          return (
            <div key={q.id} className={`rounded-xl border transition group ${isDark ? "bg-gray-900/50 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"}`}>
              <div className="flex">
                {/* Reorder sidebar */}
                <div className={`w-10 flex flex-col items-center gap-1 pt-3 border-r ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <button onClick={() => moveQuestion(q.id, "up")} disabled={i === 0}
                    className={`p-1 rounded transition disabled:opacity-20 ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                    <i className="fas fa-chevron-up text-[9px]" />
                  </button>
                  <button onClick={() => moveQuestion(q.id, "down")} disabled={i === data.questions.length - 1}
                    className={`p-1 rounded transition disabled:opacity-20 ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                    <i className="fas fa-chevron-down text-[9px]" />
                  </button>
                </div>

                {/* Question content */}
                <div className="flex-1 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input type="text" value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      placeholder="Question"
                      className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg border focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-gray-500" : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-400"}`} />
                    <span className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                      <i className={`fas ${cfg.icon} mr-1`} />{cfg.label}
                    </span>
                  </div>

                  {/* Type-specific editor */}
                  <div className="pl-2">
                    {(q.type === "Multiple Choice" || q.type === "Checkboxes" || q.type === "Dropdown") && (
                      <OptionsEditor q={q} update={updateQuestion} isDark={!!isDark} accentColor={data.accentColor} />
                    )}
                    {q.type === "True/False" && (
                      <TrueFalseEditor q={q} update={updateQuestion} isDark={!!isDark} accentColor={data.accentColor} />
                    )}
                    {q.type === "Short Answer" && (
                      <ShortAnswerEditor q={q} update={updateQuestion} isDark={!!isDark} />
                    )}
                    {q.type === "Paragraph" && (
                      <ParagraphEditor isDark={!!isDark} />
                    )}
                    {q.type === "File Upload" && (
                      <FileUploadEditor q={q} update={updateQuestion} isDark={!!isDark} />
                    )}
                    {q.type === "Number" && (
                      <NumberEditor q={q} update={updateQuestion} isDark={!!isDark} />
                    )}
                    {q.type === "Date" && (
                      <DateEditor isDark={!!isDark} />
                    )}
                  </div>

                  {/* Bottom bar: required + actions */}
                  <div className={`flex items-center justify-between pt-2 border-t ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => updateQuestion(q.id, { required: !q.required })}
                        className={`relative w-8 h-4 rounded-full transition-colors ${q.required ? "bg-green-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${q.required ? "translate-x-4" : ""}`} />
                      </div>
                      <span className={`text-[11px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Required</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => duplicateQuestion(q.id)}
                        className={`p-1.5 rounded-lg text-xs transition ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`} title="Duplicate">
                        <i className="fas fa-copy" />
                      </button>
                      <button onClick={() => removeQuestion(q.id)}
                        className={`p-1.5 rounded-lg text-xs transition ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-900/20" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`} title="Delete">
                        <i className="fas fa-trash-alt" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add question button */}
        <div className="relative">
          <button onClick={() => setAddMenuOpen(!addMenuOpen)}
            className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2 ${isDark ? "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300" : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600"}`}
            style={!addMenuOpen ? { borderColor: data.accentColor + "40", color: data.accentColor } : {}}>
            <i className="fas fa-plus-circle" /> Add question
          </button>

          {addMenuOpen && (
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl border shadow-xl p-2 z-20 w-72 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <p className={`text-[10px] font-semibold uppercase px-2 py-1 mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Question type</p>
              <div className="grid grid-cols-3 gap-1">
                {QUESTION_TYPES.map((qt) => (
                  <button key={qt.type} onClick={() => addQuestion(qt.type)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-[10px] font-medium transition ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                    <i className={`fas ${qt.icon} text-sm`} style={{ color: data.accentColor }} />
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Option editors for each question type ─── */

function OptionsEditor({ q, update, isDark, accentColor }: { q: AssessmentQuestion; update: (id: string, p: Partial<AssessmentQuestion>) => void; isDark: boolean; accentColor: string }) {
  const isMulti = q.type === "Checkboxes"
  const isDropdown = q.type === "Dropdown"

  const addOption = () => update(q.id, { options: [...q.options, ""] })
  const removeOption = (idx: number) => {
    const next = q.options.filter((_, i) => i !== idx)
    update(q.id, { options: next, correctAnswer: q.correctAnswer === q.options[idx] ? "" : q.correctAnswer })
  }

  return (
    <div className="space-y-2">
      <p className={`text-[10px] font-semibold uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {isMulti ? "Checkbox options" : isDropdown ? "Dropdown options" : "Options"} &middot; Click to mark correct
      </p>
      {q.options.map((opt, i) => {
        const isCorrect = isMulti ? (q.correctAnswers || []).includes(opt) && opt.trim() : q.correctAnswer === opt && opt.trim()
        return (
          <div key={i} className="flex items-center gap-2">
            {isMulti ? (
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition"
                style={isCorrect ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: isDark ? "#4B5563" : "#D1D5DB" }}>
                {isCorrect && <i className="fas fa-check text-[8px] text-white" />}
              </div>
            ) : isDropdown ? (
              <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {i + 1}
              </span>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition"
                style={isCorrect ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: isDark ? "#4B5563" : "#D1D5DB" }}>
                {isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            )}
            <button onClick={() => {
              if (isMulti) {
                const cur = q.correctAnswers || []
                const next = isCorrect ? cur.filter((c) => c !== opt) : [...cur, opt]
                update(q.id, { correctAnswers: next })
              } else {
                update(q.id, { correctAnswer: isCorrect ? "" : opt })
              }
            }}
              className={`flex-1 text-left px-3 py-1.5 rounded-lg border text-xs transition ${isCorrect ? "" : isDark ? "border-gray-700 bg-gray-800 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}
              style={isCorrect ? { borderColor: accentColor + "60", backgroundColor: accentColor + "10", color: accentColor } : {}}>
              {opt || `Option ${String.fromCharCode(65 + i)}`}
            </button>
            {q.options.length > 2 && (
              <button onClick={() => removeOption(i)}
                className={`p-1 rounded transition ${isDark ? "text-gray-600 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
                <i className="fas fa-times text-[10px]" />
              </button>
            )}
          </div>
        )
      })}
      <button onClick={addOption}
        className={`text-[11px] font-medium flex items-center gap-1 transition px-2 py-1 rounded-lg`}
        style={{ color: accentColor }}>
        <i className="fas fa-plus text-[9px]" /> Add option
      </button>
    </div>
  )
}

function TrueFalseEditor({ q, update, isDark, accentColor }: { q: AssessmentQuestion; update: (id: string, p: Partial<AssessmentQuestion>) => void; isDark: boolean; accentColor: string }) {
  return (
    <div className="flex gap-3">
      {["True", "False"].map((v) => {
        const selected = q.correctAnswer === v
        return (
          <button key={v} onClick={() => update(q.id, { correctAnswer: selected ? "" : v })}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition flex items-center justify-center gap-2`}
            style={selected
              ? { borderColor: accentColor, backgroundColor: accentColor + "15", color: accentColor }
              : { borderColor: isDark ? "#374151" : "#E5E7EB", color: isDark ? "#9CA3AF" : "#6B7280" }}>
            <i className={`fas ${v === "True" ? "fa-check-circle" : "fa-times-circle"}`} />
            {v}
          </button>
        )
      })}
    </div>
  )
}

function ShortAnswerEditor({ q, update, isDark }: { q: AssessmentQuestion; update: (id: string, p: Partial<AssessmentQuestion>) => void; isDark: boolean }) {
  return (
    <div className="space-y-2">
      <input type="text" value={q.correctAnswer} onChange={(e) => update(q.id, { correctAnswer: e.target.value })}
        placeholder="Correct answer (for auto-grading)"
        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-gray-500" : "border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:border-gray-400"}`} />
      <div className={`h-8 rounded-lg border border-dashed ${isDark ? "border-gray-700" : "border-gray-300"}`} />
    </div>
  )
}

function ParagraphEditor({ isDark }: { isDark: boolean }) {
  return (
    <div className={`h-20 rounded-lg border border-dashed p-2 text-xs ${isDark ? "border-gray-700 text-gray-600" : "border-gray-300 text-gray-400"}`}>
      Long answer text
    </div>
  )
}

function FileUploadEditor({ q, update, isDark }: { q: AssessmentQuestion; update: (id: string, p: Partial<AssessmentQuestion>) => void; isDark: boolean }) {
  return (
    <div className="space-y-2">
      <input type="text" value={q.accept || ""} onChange={(e) => update(q.id, { accept: e.target.value })}
        placeholder="Accepted file types (e.g. .pdf,.doc,.jpg)"
        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-gray-500" : "border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:border-gray-400"}`} />
      <div className={`flex items-center gap-2 p-3 rounded-lg border border-dashed ${isDark ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"}`}>
        <i className="fas fa-cloud-arrow-up text-lg" />
        <span className="text-xs">Students will be able to upload files here</span>
      </div>
    </div>
  )
}

function NumberEditor({ q, update, isDark }: { q: AssessmentQuestion; update: (id: string, p: Partial<AssessmentQuestion>) => void; isDark: boolean }) {
  return (
    <div className="space-y-2">
      <input type="text" value={q.correctAnswer} onChange={(e) => update(q.id, { correctAnswer: e.target.value })}
        placeholder="Correct answer (for auto-grading)"
        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-gray-500" : "border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:border-gray-400"}`} />
      <div className="flex gap-2">
        <input type="number" value={q.min ?? ""} onChange={(e) => update(q.id, { min: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Min"
          className={`w-24 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400"}`} />
        <input type="number" value={q.max ?? ""} onChange={(e) => update(q.id, { max: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Max"
          className={`w-24 px-3 py-1.5 rounded-lg border text-xs focus:outline-none transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400"}`} />
      </div>
    </div>
  )
}

function DateEditor({ isDark }: { isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${isDark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
      <i className="fas fa-calendar text-lg" />
      <span className="text-xs">Students will select a date</span>
    </div>
  )
}

/* ─── Preview sub-component ─── */

function PreviewQuestion({ q, index, isDark, accentColor, answer, onChangeAnswer }: {
  q: AssessmentQuestion; index: number; isDark: boolean; accentColor: string; answer: string; onChangeAnswer: (val: string) => void
}) {
  return (
    <div className={`rounded-xl border p-5 ${isDark ? "bg-gray-900/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xs font-bold" style={{ color: accentColor }}>Q{index + 1}</span>
        <p className={`text-sm font-medium flex-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{q.text || "Untitled question"}</p>
        {q.required && <span className="text-red-400 text-xs">*</span>}
      </div>

      {(q.type === "Multiple Choice" || q.type === "Dropdown") && (
        <div className="space-y-2">
          {q.type === "Dropdown" ? (
            <select value={answer} onChange={(e) => onChangeAnswer(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200"}`}>
              <option value="">Select...</option>
              {q.options.map((o, i) => <option key={i} value={o}>{o || `Option ${i + 1}`}</option>)}
            </select>
          ) : q.options.map((o, i) => (
            <label key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition text-sm ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-white"}`}
              style={answer === o ? { borderColor: accentColor + "60", backgroundColor: accentColor + "10" } : {}}>
              <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition"
                style={answer === o ? { borderColor: accentColor } : { borderColor: isDark ? "#4B5563" : "#D1D5DB" }}>
                {answer === o && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />}
              </div>
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>{o}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "Checkboxes" && (
        <div className="space-y-2">
          {q.options.map((o, i) => {
            const checked = answer.split(",").includes(o)
            return (
              <label key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition text-sm ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-white"}`}
                style={checked ? { borderColor: accentColor + "60", backgroundColor: accentColor + "10" } : {}}>
                <div className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition"
                  style={checked ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: isDark ? "#4B5563" : "#D1D5DB" }}>
                  {checked && <i className="fas fa-check text-[8px] text-white" />}
                </div>
                <span className={isDark ? "text-gray-300" : "text-gray-700"}>{o}</span>
              </label>
            )
          })}
        </div>
      )}

      {q.type === "True/False" && (
        <div className="flex gap-3">
          {["True", "False"].map((v) => (
            <button key={v} onClick={() => onChangeAnswer(v)}
              className="flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition flex items-center justify-center gap-2"
              style={answer === v
                ? { borderColor: accentColor, backgroundColor: accentColor + "15", color: accentColor }
                : { borderColor: isDark ? "#374151" : "#E5E7EB", color: isDark ? "#9CA3AF" : "#6B7280" }}>
              <i className={`fas ${v === "True" ? "fa-check-circle" : "fa-times-circle"}`} /> {v}
            </button>
          ))}
        </div>
      )}

      {q.type === "Short Answer" && (
        <input type="text" value={answer} onChange={(e) => onChangeAnswer(e.target.value)} placeholder="Your answer"
          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 placeholder-gray-400"}`} />
      )}

      {q.type === "Paragraph" && (
        <textarea value={answer} onChange={(e) => onChangeAnswer(e.target.value)} placeholder="Your answer" rows={4}
          className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 placeholder-gray-400"}`} />
      )}

      {q.type === "File Upload" && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border border-dashed ${isDark ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"}`}>
          <i className="fas fa-paperclip text-lg" />
          <div>
            <p className="text-xs font-medium">Attach files</p>
            <p className="text-[10px] opacity-70">{q.accept || "All file types"}</p>
          </div>
        </div>
      )}

      {q.type === "Number" && (
        <input type="number" value={answer} onChange={(e) => onChangeAnswer(e.target.value)} placeholder="Your answer"
          min={q.min} max={q.max}
          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 placeholder-gray-400"}`} />
      )}

      {q.type === "Date" && (
        <input type="date" value={answer} onChange={(e) => onChangeAnswer(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200"}`} />
      )}
    </div>
  )
}

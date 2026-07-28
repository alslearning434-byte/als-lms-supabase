import { useState } from "react"
import type { ModuleAssessment, AssessmentQuestion } from "../types"
import { db } from "../firebase"
import { collection, addDoc } from "firebase/firestore"

interface Props {
  resourceId: string
  assessmentId: string
  assessment: ModuleAssessment
  studentId: string
  studentName: string
  onClose: () => void
  context?: "quiz" | "assessment"
  moduleIdx?: number
}

export default function AssessmentTaker({ resourceId, assessmentId, assessment, studentId, studentName, onClose, context = "assessment", moduleIdx }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ score: number; total: number; results: { qId: string; correct: boolean; correctAnswer: string; needsReview: boolean }[] } | null>(null)

  const accentColor = assessment.accentColor || "#673AB7"

  const grade = () => {
    const results = assessment.questions.map((q) => {
      const a = answers[q.id] || ""
      let correct = false
      let needsReview = false

      switch (q.type) {
        case "Multiple Choice":
        case "True/False":
        case "Dropdown":
          correct = a === q.correctAnswer
          break
        case "Checkboxes": {
          const selected = a.split(",").filter(Boolean).sort()
          const expected = (q.correctAnswers || []).sort()
          correct = selected.length === expected.length && selected.every((s, i) => s === expected[i])
          break
        }
        case "Short Answer":
          correct = a.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
          break
        case "Number":
          correct = Number(a) === Number(q.correctAnswer)
          break
        case "Date":
          correct = a === q.correctAnswer
          break
        case "Paragraph":
        case "File Upload":
          needsReview = true
          correct = false
          break
      }
      return { qId: q.id, correct, correctAnswer: getDisplayAnswer(q), needsReview }
    })
    const sc = results.filter((r) => r.correct).length
    setScore({ score: sc, total: results.length, results })
    setSubmitted(true)
    addDoc(collection(db, "assessmentSubmissions"), {
      assessmentId,
      resourceId,
      studentId,
      studentName,
      score: sc,
      totalPoints: results.length,
      answers,
      submittedAt: new Date().toISOString(),
    }).catch(() => {})
    if (context === "quiz" && moduleIdx !== undefined) {
      addDoc(collection(db, "quizSubmissions"), {
        resourceId,
        moduleIdx,
        studentId,
        studentName,
        score: sc,
        total: results.length,
        passed: sc >= results.length * 0.5,
        answers,
        submittedAt: new Date().toISOString(),
      }).catch(() => {})
    }
  }

  const autogradable = assessment.questions.filter((q) => q.type !== "Paragraph" && q.type !== "File Upload")

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="rounded-t-2xl overflow-hidden mb-6">
          <div className="px-6 py-5 text-white" style={{ backgroundColor: accentColor }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                  <i className="fas fa-arrow-left text-white" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">{assessment.title}</h2>
                  <p className="text-sm opacity-80">{assessment.questions.length} question{assessment.questions.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-white/20 text-sm font-medium rounded-lg">
                <i className="fas fa-clipboard-list mr-1" /> {context === "assessment" ? "Assessment" : "Quiz"}
              </span>
            </div>
          </div>
        </div>

        {assessment.description && (
          <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: accentColor + "08", borderColor: accentColor + "20" }}>
            <p className="text-sm text-gray-600">{assessment.description}</p>
          </div>
        )}

        {/* Questions */}
        {!submitted && (
          <div className="space-y-6">
            {assessment.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} answer={answers[q.id]}
                onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                accentColor={accentColor} />
            ))}
            <div className="flex gap-3 pb-8">
              <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={grade}
                disabled={autogradable.some((q) => !answers[q.id])}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}>
                <i className="fas fa-paper-plane text-xs" /> {context === "assessment" ? "Submit Assessment" : "Submit Quiz"}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {submitted && score && (
          <div className="space-y-6 pb-8">
            <div className={`rounded-xl p-6 text-center ${score.score === score.total ? "bg-green-50 border border-green-200" : score.score / score.total >= 0.5 ? "border border-gray-200" : "bg-red-50 border border-red-200"}`}
              style={score.score < score.total && score.score / score.total >= 0.5 ? { backgroundColor: accentColor + "08", borderColor: accentColor + "30" } : {}}>
              <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: score.score === score.total ? "#0F9D58" : score.score / score.total >= 0.5 ? accentColor : "#D93025" }}>
                <span className="text-2xl font-bold text-white">{Math.round((score.score / score.total) * 100)}%</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {score.score === score.total ? "Perfect Score!" : score.score / score.total >= 0.5 ? "Good Job!" : "Keep Practicing!"}
              </h3>
              <p className="text-sm text-gray-500">{score.score} out of {score.total} correct</p>
            </div>

            <h3 className="font-semibold text-gray-800">Review Answers</h3>
            {assessment.questions.map((q, i) => {
              const r = score.results.find((x) => x.qId === q.id)
              const isCorrect = r?.correct
              const needsReview = r?.needsReview
              return (
                <div key={q.id} className={`rounded-xl border p-5 ${needsReview ? "bg-amber-50 border-amber-200" : isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${needsReview ? "bg-amber-500" : isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                      {needsReview ? <i className="fas fa-eye text-xs" /> : isCorrect ? <i className="fas fa-check text-xs" /> : <i className="fas fa-times text-xs" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{i + 1}. {q.text}</p>
                      <span className="text-[10px] font-semibold uppercase text-gray-400">{q.type}</span>
                    </div>
                    {q.required && <span className="text-red-400 text-xs">*</span>}
                  </div>
                  <div className="ml-11 space-y-1">
                    {needsReview ? (
                      <p className="text-sm text-amber-700 font-medium">Submitted for review</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">Your answer: <span className={`font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>{getAnswerDisplay(q, answers[q.id])}</span></p>
                        {!isCorrect && <p className="text-sm text-green-700">Correct answer: <span className="font-medium">{r?.correctAnswer}</span></p>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <button onClick={onClose} className="w-full py-3 rounded-xl text-white text-sm font-medium transition"
              style={{ backgroundColor: accentColor }}>
              Back to Modules
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function getDisplayAnswer(q: AssessmentQuestion): string {
  if (q.type === "Checkboxes") return (q.correctAnswers || []).join(", ")
  if (q.type === "True/False") return q.correctAnswer
  if (q.type === "Dropdown") return q.correctAnswer
  return q.correctAnswer
}

function getAnswerDisplay(q: AssessmentQuestion, answer: string | undefined): string {
  if (!answer) return "Not answered"
  if (q.type === "Checkboxes") return answer.split(",").join(", ") || "Not answered"
  return answer || "Not answered"
}

function QuestionCard({ q, index, answer, onChange, accentColor }: {
  q: AssessmentQuestion; index: number; answer: string | undefined; onChange: (val: string) => void; accentColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{q.text || "Untitled question"}</p>
          <span className="text-[10px] font-semibold uppercase text-gray-400">{q.type}</span>
        </div>
        {q.required && <span className="text-red-400 text-xs">*</span>}
      </div>

      <div className="ml-11">
        {/* Multiple Choice */}
        {q.type === "Multiple Choice" && (
          <div className="space-y-2">
            {q.options.map((opt, j) => (
              <label key={j} onClick={() => onChange(opt)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${answer === opt ? "" : "border-gray-200 hover:border-gray-300"}`}
                style={answer === opt ? { borderColor: accentColor + "60", backgroundColor: accentColor + "08" } : {}}>
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition"
                  style={answer === opt ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: "#D1D5DB" }}>
                  {answer === opt && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {/* Checkboxes */}
        {q.type === "Checkboxes" && (
          <div className="space-y-2">
            {q.options.map((opt, j) => {
              const selected = (answer || "").split(",").includes(opt)
              return (
                <label key={j} onClick={() => {
                  const cur = (answer || "").split(",").filter(Boolean)
                  const next = selected ? cur.filter((c) => c !== opt) : [...cur, opt]
                  onChange(next.join(","))
                }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${selected ? "" : "border-gray-200 hover:border-gray-300"}`}
                  style={selected ? { borderColor: accentColor + "60", backgroundColor: accentColor + "08" } : {}}>
                  <span className="w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition"
                    style={selected ? { borderColor: accentColor, backgroundColor: accentColor } : { borderColor: "#D1D5DB" }}>
                    {selected && <i className="fas fa-check text-[10px] text-white" />}
                  </span>
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              )
            })}
          </div>
        )}

        {/* Dropdown */}
        {q.type === "Dropdown" && (
          <select value={answer || ""} onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-navy-500 transition bg-white">
            <option value="">Select an answer...</option>
            {q.options.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
          </select>
        )}

        {/* True/False */}
        {q.type === "True/False" && (
          <div className="flex gap-3">
            {["True", "False"].map((v) => (
              <button key={v} onClick={() => onChange(v)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border transition"
                style={answer === v
                  ? { borderColor: accentColor, backgroundColor: accentColor, color: "white" }
                  : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                {v === "True" ? <><i className="fas fa-check mr-1" /> True</> : <><i className="fas fa-times mr-1" /> False</>}
              </button>
            ))}
          </div>
        )}

        {/* Short Answer */}
        {q.type === "Short Answer" && (
          <input type="text" value={answer || ""} onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-navy-500 transition" />
        )}

        {/* Paragraph */}
        {q.type === "Paragraph" && (
          <textarea value={answer || ""} onChange={(e) => onChange(e.target.value)}
            placeholder="Write your response here..." rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:border-navy-500 transition" />
        )}

        {/* File Upload */}
        {q.type === "File Upload" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <i className="fas fa-cloud-arrow-up text-xl text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
                <p className="text-[11px] text-gray-400">{q.accept || "PDF, DOC, JPG, PNG"}</p>
              </div>
            </div>
            {answer && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <i className="fas fa-paperclip text-xs text-gray-400" />
                <span className="text-xs text-gray-600 flex-1 truncate">{answer}</span>
                <button onClick={() => onChange("")} className="text-red-400 hover:text-red-500 text-[10px]">
                  <i className="fas fa-times" />
                </button>
              </div>
            )}
            <input type="file" accept={q.accept}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange(file.name)
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer"
              style={{ ["--tw-file-bg" as string]: accentColor } as React.CSSProperties} />
          </div>
        )}

        {/* Number */}
        {q.type === "Number" && (
          <input type="number" value={answer || ""} onChange={(e) => onChange(e.target.value)}
            placeholder="Enter a number" min={q.min} max={q.max}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-navy-500 transition" />
        )}

        {/* Date */}
        {q.type === "Date" && (
          <input type="date" value={answer || ""} onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-navy-500 transition" />
        )}
      </div>
    </div>
  )
}

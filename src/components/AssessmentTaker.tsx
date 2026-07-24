import { useState } from "react"
import type { Resource, Assessment, AssessmentQuestion } from "../types"
import { db } from "../firebase"
import { collection, addDoc } from "firebase/firestore"

interface Props {
  resource: Resource
  assessment: Assessment
  studentId: string
  studentName: string
  onClose: () => void
}

export default function AssessmentTaker({ resource, assessment, studentId, studentName, onClose }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ score: number; total: number; results: { qId: string; correct: boolean; correctAnswer: string | string[] }[] } | null>(null)

  const grade = () => {
    const results = assessment.questions.map((q) => {
      const a = answers[q.id]
      let correct = false
      if (q.type === "Multiple Choice" || q.type === "True/False") {
        correct = a === q.correctAnswer
      } else if (q.type === "Checkboxes") {
        const s = Array.isArray(a) ? [...a].sort() : []
        const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
        correct = JSON.stringify(s) === JSON.stringify(c)
      } else if (q.type === "Short Answer") {
        const expected = String(q.correctAnswer).toLowerCase()
        const given = String(a || "").toLowerCase().trim()
        correct = expected.includes(given) && given.length > 0
      }
      return { qId: q.id, correct, correctAnswer: q.correctAnswer }
    })
    const sc = results.filter((r) => r.correct).length
    setScore({ score: sc, total: results.length, results })
    setSubmitted(true)
    addDoc(collection(db, "assessmentSubmissions"), {
      assessmentId: assessment.id,
      resourceId: resource.id,
      studentId,
      studentName,
      score: sc,
      totalPoints: results.length,
      answers,
      submittedAt: new Date().toISOString(),
    }).catch(() => {})
  }

  const typeColor: Record<string, string> = { quiz: "bg-purple-100 text-purple-600", task: "bg-blue-100 text-blue-600", activity: "bg-amber-100 text-amber-600", assignment: "bg-green-100 text-green-600" }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
              <i className="fas fa-arrow-left text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{assessment.title}</h2>
              <p className="text-sm text-gray-400">{resource.title} &bull; {assessment.questions.length} questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assessment.timeLimit && (
              <span className="px-3 py-1.5 bg-navy-100 text-navy-600 text-sm font-medium rounded-lg">
                <i className="fas fa-clock mr-1" /> {assessment.timeLimit} min
              </span>
            )}
            <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${typeColor[assessment.type] || "bg-gray-100 text-gray-600"}`}>
              {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
            </span>
          </div>
        </div>

        {assessment.description && (
          <div className="bg-navy-500/5 rounded-xl p-4 mb-6 border border-navy-500/10">
            <p className="text-sm text-gray-600">{assessment.description}</p>
          </div>
        )}

        {!submitted && (
          <div className="space-y-6">
            {assessment.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} answer={answers[q.id]} onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))} />
            ))}
            <div className="flex gap-3 pb-8">
              <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={grade}
                disabled={assessment.questions.some((q) => answers[q.id] === undefined || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0))}
                className="flex-1 py-3 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                <i className="fas fa-paper-plane text-xs" /> Submit Assessment
              </button>
            </div>
          </div>
        )}

        {submitted && score && (
          <div className="space-y-6 pb-8">
            <div className={`rounded-xl p-6 text-center ${score.score === score.total ? "bg-green-50 border border-green-200" : score.score / score.total >= 0.5 ? "bg-navy-50 border border-navy-200" : "bg-red-50 border border-red-200"}`}>
              <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${score.score === score.total ? "bg-green-500" : score.score / score.total >= 0.5 ? "bg-navy-500" : "bg-red-500"}`}>
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
              return (
                <div key={q.id} className={`rounded-xl border p-5 ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                      {isCorrect ? <i className="fas fa-check text-xs" /> : <i className="fas fa-times text-xs" />}
                    </span>
                    <div className="flex-1">
                      {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-32 rounded-lg mb-2 object-contain" />}
                      <p className="text-sm font-semibold text-gray-800">{i + 1}. {q.text}</p>
                    </div>
                  </div>
                  <div className="ml-11 space-y-1">
                    <p className="text-sm text-gray-600">Your answer: <span className={`font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>{formatAnswer(answers[q.id])}</span></p>
                    {!isCorrect && <p className="text-sm text-green-700">Correct answer: <span className="font-medium">{formatAnswer(r?.correctAnswer)}</span></p>}
                  </div>
                </div>
              )
            })}

            <button onClick={onClose} className="w-full py-3 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition">
              Back to Modules
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatAnswer(a: string | string[] | undefined): string {
  if (a === undefined) return "Not answered"
  if (Array.isArray(a)) return a.length > 0 ? a.join(", ") : "Not answered"
  return a || "Not answered"
}

function QuestionCard({ q, index, answer, onChange }: {
  q: AssessmentQuestion
  index: number
  answer: string | string[] | undefined
  onChange: (val: string | string[]) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-8 h-8 rounded-full bg-navy-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{index + 1}</span>
        <div className="flex-1">
          {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-48 rounded-lg mb-3 object-contain" />}
          <p className="text-sm font-semibold text-gray-800">{q.text}</p>
        </div>
      </div>

      {q.type === "Multiple Choice" && (
        <div className="space-y-2 ml-11">
          {q.options.map((opt, j) => (
            <label key={j} onClick={() => onChange(opt.text)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${answer === opt.text ? "border-navy-500 bg-navy-500/5" : "border-gray-200 hover:border-gray-300"}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${answer === opt.text ? "border-navy-500 bg-navy-500" : "border-gray-300"}`}>
                {answer === opt.text && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-10 rounded" />}
              <span className="text-sm text-gray-700">{opt.text}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "True/False" && (
        <div className="flex gap-3 ml-11">
          {["True", "False"].map((v) => (
            <button key={v} onClick={() => onChange(v)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border transition ${answer === v ? "border-navy-500 bg-navy-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {v === "True" ? <><i className="fas fa-check mr-1" /> True</> : <><i className="fas fa-times mr-1" /> False</>}
            </button>
          ))}
        </div>
      )}

      {q.type === "Checkboxes" && (
        <div className="space-y-2 ml-11">
          {q.options.map((opt, j) => {
            const selected = Array.isArray(answer) && answer.includes(opt.text)
            return (
              <label key={j} onClick={() => {
                const current = Array.isArray(answer) ? [...answer] : []
                const idx = current.indexOf(opt.text)
                if (idx >= 0) current.splice(idx, 1); else current.push(opt.text)
                onChange(current)
              }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${selected ? "border-navy-500 bg-navy-500/5" : "border-gray-200 hover:border-gray-300"}`}>
                <span className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${selected ? "border-navy-500 bg-navy-500" : "border-gray-300"}`}>
                  {selected && <i className="fas fa-check text-white text-xs" />}
                </span>
                {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-10 rounded" />}
                <span className="text-sm text-gray-700">{opt.text}</span>
              </label>
            )
          })}
        </div>
      )}

      {q.type === "Short Answer" && (
        <div className="ml-11">
          <input type="text" value={typeof answer === "string" ? answer : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
        </div>
      )}
    </div>
  )
}

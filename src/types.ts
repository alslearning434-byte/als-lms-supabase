export interface StudentSubmission {
  name: string
  status: "on-time" | "late" | "missing" | "ahead"
  submittedDate: string | null
}

export interface Assignment {
  id: number
  title: string
  cohort: string
  dueDate: string
  totalStudents: number
  students: StudentSubmission[]
}

export interface NavItem {
  id: string
  label: string
  icon: string
}

export interface TableData {
  rows: number
  cols: number
  cells: string[][]
  textAlign: "left" | "center" | "right"
}

export type BlockType = "content" | "image" | "table"

export interface ModuleBlock {
  id: string
  type: BlockType
  topic: string
  description: string
  imageData?: string
}

export type QuestionType =
  | "Multiple Choice"
  | "Checkboxes"
  | "Dropdown"
  | "Short Answer"
  | "Paragraph"
  | "True/False"
  | "File Upload"
  | "Number"
  | "Date"

export interface AssessmentQuestion {
  id: string
  text: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  correctAnswers?: string[]
  required: boolean
  placeholder?: string
  min?: number
  max?: number
  accept?: string
}

export interface ModuleAssessment {
  title: string
  description: string
  questions: AssessmentQuestion[]
  accentColor: string
  quizSource?: "manual" | "ai"
}

export type TaskType = "assignment" | "quiz" | "discussion" | "material"

export interface RubricItem {
  criterion: string
  points: number
}

export interface TaskAttachment {
  name: string
  url: string
  type: string
}

export interface ModuleTask {
  id: string
  type: TaskType
  title: string
  description: string
  dueDate?: string
  points?: number
  attachments: TaskAttachment[]
  assessment?: ModuleAssessment
  rubric: RubricItem[]
  allowLateSubmission: boolean
  anonymous: boolean
}

export interface ModuleContent {
  name: string
  description: string
  blocks: ModuleBlock[]
  tasks: ModuleTask[]
}

export interface Resource {
  id: string
  subject: string
  title: string
  description: string
  modules: ModuleContent[]
  assessment?: ModuleAssessment
  uploadedBy: string
  uploadedAt: string
}

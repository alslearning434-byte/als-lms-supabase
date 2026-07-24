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

export interface ModuleContent {
  name: string
  description: string
  blocks: ModuleBlock[]
}

export interface Resource {
  id: string
  subject: string
  title: string
  description: string
  modules: ModuleContent[]
  uploadedBy: string
  uploadedAt: string
}

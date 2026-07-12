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

export interface Resource {
  id: string
  subject: string
  title: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
}

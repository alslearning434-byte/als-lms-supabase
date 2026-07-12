import type { Assignment } from "../types"

export const assignments: Assignment[] = [
  {
    id: 1,
    title: "Math Module 2 Assessment",
    cohort: "Grade 11 Section A",
    dueDate: "May 28, 2026",
    totalStudents: 6,
    students: [
      { name: "Juan Dela Cruz", status: "on-time", submittedDate: "May 26, 2026" },
      { name: "Maria Santos", status: "late", submittedDate: "May 30, 2026" },
      { name: "Pedro Reyes", status: "missing", submittedDate: null },
      { name: "Anna Rivera", status: "ahead", submittedDate: "May 20, 2026" },
      { name: "Luis Gomez", status: "on-time", submittedDate: "May 27, 2026" },
      { name: "Elena Cruz", status: "missing", submittedDate: null }
    ]
  },
  {
    id: 2,
    title: "Science Lab Report",
    cohort: "Grade 11 Section B",
    dueDate: "June 2, 2026",
    totalStudents: 5,
    students: [
      { name: "Carlos Mendoza", status: "on-time", submittedDate: "June 1, 2026" },
      { name: "Luzviminda Santos", status: "ahead", submittedDate: "May 28, 2026" },
      { name: "Ricardo Ramos", status: "late", submittedDate: "June 5, 2026" },
      { name: "Teresa Cruz", status: "missing", submittedDate: null },
      { name: "Jose Rizal", status: "on-time", submittedDate: "June 1, 2026" }
    ]
  },
  {
    id: 3,
    title: "English Literature Essay",
    cohort: "Grade 12 Section A",
    dueDate: "June 5, 2026",
    totalStudents: 5,
    students: [
      { name: "Andres Bonifacio", status: "ahead", submittedDate: "May 30, 2026" },
      { name: "Gabriela Silang", status: "on-time", submittedDate: "June 4, 2026" },
      { name: "Emilio Aguinaldo", status: "missing", submittedDate: null },
      { name: "Melchora Aquino", status: "late", submittedDate: "June 8, 2026" },
      { name: "Antonio Luna", status: "on-time", submittedDate: "June 3, 2026" }
    ]
  },
  {
    id: 4,
    title: "Filipino Wika at Panitikan",
    cohort: "Grade 11 Section A",
    dueDate: "June 10, 2026",
    totalStudents: 4,
    students: [
      { name: "Francisco Balagtas", status: "ahead", submittedDate: "June 2, 2026" },
      { name: "Jose Garcia Villa", status: "on-time", submittedDate: "June 9, 2026" },
      { name: "Nick Joaquin", status: "late", submittedDate: "June 12, 2026" },
      { name: "F. Sionil Jose", status: "missing", submittedDate: null }
    ]
  }
]

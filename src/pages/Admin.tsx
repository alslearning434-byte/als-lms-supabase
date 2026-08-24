import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"

import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { supabase, getActivities, subscribeActivities } from "../supabase"
import type { NavItem } from "../types"

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/+$/, "")

async function fetchAPI(path: string) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

type LeaderboardEntry = { rank: number; name: string; email: string; gradeLevel: string; tasksAssigned: number; tasksCompleted: number; completionRate: number }

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "th-large" },
  { id: "user-management", label: "User Management", icon: "users-cog" },
  { id: "database-backup", label: "Database Back-up", icon: "database" },
  { id: "calendar", label: "Calendar", icon: "calendar-alt" },
  { id: "reports", label: "Reports", icon: "chart-bar" }
]

const ANNOUNCEMENT_CATEGORIES = ["General", "Holiday", "Exam", "Event", "Meeting"]

const categoryStyles: Record<string, string> = {
  General: "bg-gray-100 text-gray-600",
  Holiday: "bg-green-100 text-green-600",
  Exam: "bg-red-100 text-red-600",
  Event: "bg-blue-100 text-blue-600",
  Meeting: "bg-purple-100 text-purple-600",
}
const categoryDotColors: Record<string, string> = {
  General: "bg-gray-400",
  Holiday: "bg-green-500",
  Exam: "bg-red-500",
  Event: "bg-blue-500",
  Meeting: "bg-purple-500",
}

export default function Admin() {
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { logout, profile } = useAuth()
  const [activePage, setActivePage] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [backupSuccess, setBackupSuccess] = useState(false)
  const [backupError, setBackupError] = useState("")
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calSelected, setCalSelected] = useState<number | null>(null)
  const [calModalOpen, setCalModalOpen] = useState(false)
  const [calInput, setCalInput] = useState("")
  const [calCategory, setCalCategory] = useState("General")
  const [announcements, setAnnouncements] = useState<Record<string, { id: string; text: string; category: string }[]>>({})
  const [userFilter, setUserFilter] = useState("jhs")
  const [userPage, setUserPage] = useState(1)
  const userPageSize = 10
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [teacherForm, setTeacherForm] = useState({ name: "", employeeId: "", email: "", department: "", contact: "", password: "" })
  const [teacherSaving, setTeacherSaving] = useState(false)
  const [teacherError, setTeacherError] = useState("")
  const [teachers, setTeachers] = useState<{ uid: string; displayName: string; email: string; department: string; employeeId: string; phone: string; joinDate: string }[]>([])
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false)
  const [jhsModalOpen, setJhsModalOpen] = useState(false)
  const [shsModalOpen, setShsModalOpen] = useState(false)
  const [jhsPage, setJhsPage] = useState(1)
  const [shsPage, setShsPage] = useState(1)
  const isDark = theme === "dark"
  const [userStats, setUserStats] = useState({ total: 0, students: 0, teachers: 0, admins: 0 })
  const [serverStatus, setServerStatus] = useState<{ status: string; uptimeSeconds: number; nextBackupAt?: string; health?: { cpu: number; memory: number; storage: number } } | null>(null)
  const [backups, setBackups] = useState<{ id: string; date: string; time: string; type: string; size: string; status: string; statusColor: string; bytes?: number; fileId?: string }[]>([])
  const [activities, setActivities] = useState<{ id: string; action: string; detail: string; user: string; status: string; createdAt: string }[]>([])
  const [reportsOverview, setReportsOverview] = useState<{
    totalStudents: number
    totalTasksAssigned: number
    totalTasksCompleted: number
    completionRate: number
    byType: Record<string, { assigned: number; completed: number; rate: number }>
    byCohort: Record<string, { students: number; tasksAssigned: number; tasksCompleted: number; rate: number }>
  } | null>(null)
  const [jhsLeaderboard, setJhsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [shsLeaderboard, setShsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [jhsAll, setJhsAll] = useState<LeaderboardEntry[]>([])
  const [shsAll, setShsAll] = useState<LeaderboardEntry[]>([])
  const [enrollmentByYear, setEnrollmentByYear] = useState<{ year: string; count: number }[]>([])
  const [quickStats, setQuickStats] = useState({ assignmentsCompleted: 0, activeTeachers: 0, activeCohorts: 0 })

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const users = await fetchAPI("/api/users")
        const items = users
          .filter((u: any) => u.role === "teacher")
        setTeachers(items.map((t: any) => ({
          uid: t.uid || t.id,
          displayName: t.displayName,
          email: t.email,
          department: t.department || "",
          employeeId: t.employeeId || "",
          phone: t.phone || "",
          joinDate: t.joinDate || "",
        })))
      } catch { /* offline */ }
    }
    fetchTeachers()
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const users = await fetchAPI("/api/users")
        const all = users.map((u: { role?: string }) => ({ role: u.role }))
        setUserStats({
          total: all.length,
          students: all.filter((u: { role?: string }) => u.role === "student" || !u.role).length,
          teachers: all.filter((u: { role?: string }) => u.role === "teacher").length,
          admins: all.filter((u: { role?: string }) => u.role === "admin").length,
        })
      } catch { /* offline */ }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        const status = await fetchAPI("/api/status")
        setServerStatus(status)
      } catch { /* offline */ }
    }
    fetchServerStatus()
  }, [])

  useEffect(() => {
    loadBackups()

    const channel = supabase
      .channel("backups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "backups" }, () => { loadBackups() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    loadAnnouncements()

    const channel = supabase
      .channel("announcements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => { loadAnnouncements() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubPocket: (() => void) | null = null

    async function initActivities() {
      try {
        const initial = await getActivities()
        if (cancelled) return
        setActivities(initial)
        unsubPocket = await subscribeActivities((acts) => { if (!cancelled) setActivities(acts) })
      } catch { /* offline */ }
    }
    initActivities()

    return () => { cancelled = true; unsubPocket?.() }
  }, [])

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [overview, jhsLb, shsLb, jhsFull, shsFull, users] = await Promise.all([
          fetchAPI("/api/reports/overview"),
          fetchAPI("/api/reports/leaderboard?cohort=jhs&limit=10"),
          fetchAPI("/api/reports/leaderboard?cohort=shs&limit=10"),
          fetchAPI("/api/reports/leaderboard?cohort=jhs&limit=500"),
          fetchAPI("/api/reports/leaderboard?cohort=shs&limit=500"),
          fetchAPI("/api/users"),
        ])
        setReportsOverview(overview)
        setJhsLeaderboard(jhsLb.students || [])
        setShsLeaderboard(shsLb.students || [])
        setJhsAll(jhsFull.students || [])
        setShsAll(shsFull.students || [])

        const students = users.filter((u: any) => u.role === "student" || !u.role)
        const byYear: Record<string, number> = {}
        students.forEach((s: any) => {
          const y = s.joinDate ? String(s.joinDate).match(/\d{4}/)?.[0] : ""
          byYear[y || "Unknown"] = (byYear[y || "Unknown"] || 0) + 1
        })
        setEnrollmentByYear(
          Object.entries(byYear)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => b.year.localeCompare(a.year))
        )

        const teachers = users.filter((u: any) => u.role === "teacher").length
        const cohorts = new Set(students.map((s: any) => s.gradeLevel).filter(Boolean)).size
        setQuickStats({
          assignmentsCompleted: overview.totalTasksCompleted || 0,
          activeTeachers: teachers,
          activeCohorts: cohorts,
        })
      } catch { /* offline */ }
    }
    fetchReports()
  }, [])

  useEffect(() => { setUserPage(1) }, [userFilter])

  const goTo = (page: string) => setActivePage(page)

  const loadBackups = async () => {
    try {
      const { data } = await supabase.from("backups").select("*").order("created_at", { ascending: false })
      const docs = data ?? []
      const items = docs.map((d) => ({
        id: d.id,
        date: d.date || "",
        time: d.time || "",
        type: d.type || "Automatic",
        size: d.size || "",
        status: d.status || "Completed",
        statusColor: d.status === "Completed"
          ? "bg-green-100 text-green-600"
          : String(d.status || "").toLowerCase().includes("fail")
            ? "bg-red-100 text-red-600"
            : "bg-amber-100 text-amber-600",
        fileId: d.file_id || "",
      }))
      setBackups(items)
    } catch { /* offline */ }
  }

  const handleRunBackup = async () => {
    setBackingUp(true)
    setBackupError("")
    try {
      const res = await fetch(`${API_BASE}/api/backups/run`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const record = await res.json()
      setBackups((prev) => [{
        id: record.id,
        date: record.date,
        time: record.time,
        type: record.type || "Manual",
        size: record.size,
        status: record.status || "Completed",
        statusColor: "bg-green-100 text-green-600",
        fileId: record.fileId || "",
      }, ...prev])
      setBackupSuccess(true)
      loadBackups()
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Backup failed. Please try again.")
      setBackupSuccess(false)
    } finally {
      setBackingUp(false)
    }
  }

  const handleDownloadBackup = async (b: { id: string; fileId?: string; date: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/${b.id}/download`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Download failed")
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") || ""
      const match = disposition.match(/filename="?([^"]+)"?/)
      const fileName = match ? match[1] : `backup-${b.date.replace(/[^\w]+/g, "-")}.json.gz`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert("Download failed. Is the server running?")
    }
  }

  const handleDeleteBackup = async (b: { id: string; date: string }) => {
    if (!window.confirm(`Delete backup from ${b.date}? This cannot be undone.`)) return
    try {
      const res = await fetch(`${API_BASE}/api/backups/${b.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setBackups((prev) => prev.filter((x) => x.id !== b.id))
    } catch {
      alert("Failed to delete backup. Is the server running?")
    }
  }

  const loadAnnouncements = async () => {
    try {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
      const docs = data ?? []
      const byDate: Record<string, { id: string; text: string; category: string }[]> = {}
      for (const d of docs) {
        const k = d.date
        if (!byDate[k]) byDate[k] = []
        byDate[k].push({ id: d.id, text: d.text, category: d.category || "General" })
      }
      setAnnouncements(byDate)
    } catch { /* offline */ }
  }

  const handleDeleteAnnouncement = async (id: string, key: string) => {
    try {
      await supabase.from("announcements").delete().eq("id", id)
      setAnnouncements((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((a) => a.id !== id) }))
    } catch { /* offline */ }
  }

  const handleExportReport = async () => {
    try {
      const [overview, jhsFull, shsFull] = await Promise.all([
        fetchAPI("/api/reports/overview"),
        fetchAPI("/api/reports/leaderboard?cohort=jhs&limit=500"),
        fetchAPI("/api/reports/leaderboard?cohort=shs&limit=500"),
      ])
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
      const cells = (...vals: (string | number)[]) => vals.map(esc).join(",")
      const lines: string[] = []
      lines.push(cells("ALS LMS Report"))
      lines.push(cells("Generated", new Date().toLocaleString()))
      lines.push("")
      lines.push(cells("Total Students", overview.totalStudents))
      lines.push(cells("Total Tasks Assigned", overview.totalTasksAssigned))
      lines.push(cells("Total Tasks Completed", overview.totalTasksCompleted))
      lines.push(cells("Completion Rate (%)", overview.completionRate))
      lines.push("")
      lines.push(cells("Tasks by Type", "Assigned", "Completed", "Rate (%)"))
      Object.keys(overview.byType || {}).forEach((t) => {
        const b = overview.byType[t]
        lines.push(cells(t, b.assigned, b.completed, b.rate))
      })
      lines.push("")
      lines.push(cells("JHS Leaderboard"))
      lines.push(cells("Rank", "Name", "Email", "Grade Level", "Tasks Assigned", "Tasks Completed", "Completion Rate (%)"))
      ;(jhsFull.students || []).forEach((s: any) => lines.push(cells(s.rank, s.name, s.email, s.gradeLevel, s.tasksAssigned, s.tasksCompleted, s.completionRate)))
      lines.push("")
      lines.push(cells("SHS Leaderboard"))
      lines.push(cells("Rank", "Name", "Email", "Grade Level", "Tasks Assigned", "Tasks Completed", "Completion Rate (%)"))
      ;(shsFull.students || []).forEach((s: any) => lines.push(cells(s.rank, s.name, s.email, s.gradeLevel, s.tasksAssigned, s.tasksCompleted, s.completionRate)))

      const csv = "\uFEFF" + lines.join("\r\n") + "\r\n"
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `als-lms-report-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert("Export failed. Is the server running?")
    }
  }

  const allUserRows = (userFilter === "jhs" ? [
    { initials: "JD", name: "Juan Dela Cruz", email: "juan.delacruz@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2026", initialsBg: "bg-amber-100 text-amber-600" },
    { initials: "PR", name: "Pedro Reyes", email: "pedro.reyes@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Feb 2026", initialsBg: "bg-red-100 text-red-600" },
    { initials: "AG", name: "Ana Gomez", email: "ana.gomez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2026", initialsBg: "bg-blue-100 text-blue-600" },
    { initials: "CT", name: "Carlos Tan", email: "carlos.tan@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2025", initialsBg: "bg-teal-100 text-teal-600" },
    { initials: "MF", name: "Maria Flores", email: "maria.flores@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Oct 2025", initialsBg: "bg-pink-100 text-pink-600" },
    { initials: "RG", name: "Ricardo Garcia", email: "ricardo.garcia@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2025", initialsBg: "bg-indigo-100 text-indigo-600" },
    { initials: "LS", name: "Liza Santos", email: "liza.santos@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Aug 2025", initialsBg: "bg-rose-100 text-rose-600" },
    { initials: "BM", name: "Ben Mendoza", email: "ben.mendoza@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2025", initialsBg: "bg-cyan-100 text-cyan-600" },
    { initials: "CV", name: "Celia Villanueva", email: "celia.villanueva@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jun 2025", initialsBg: "bg-lime-100 text-lime-600" },
    { initials: "DA", name: "Dante Aquino", email: "dante.aquino@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "May 2025", initialsBg: "bg-orange-100 text-orange-600" },
    { initials: "ES", name: "Elena Santiago", email: "elena.santiago@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Apr 2025", initialsBg: "bg-purple-100 text-purple-600" },
    { initials: "FC", name: "Fernando Cruz", email: "fernando.cruz@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2025", initialsBg: "bg-yellow-100 text-yellow-600" },
    { initials: "GV", name: "Gina Villar", email: "gina.villar@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Feb 2025", initialsBg: "bg-emerald-100 text-emerald-600" },
    { initials: "HS", name: "Hector Santos", email: "hector.santos@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2025", initialsBg: "bg-sky-100 text-sky-600" },
    { initials: "IR", name: "Isabella Ramos", email: "isabella.ramos@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Dec 2024", initialsBg: "bg-violet-100 text-violet-600" },
    { initials: "JB", name: "Joel Bautista", email: "joel.bautista@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2024", initialsBg: "bg-fuchsia-100 text-fuchsia-600" },
    { initials: "KL", name: "Karen Lim", email: "karen.lim@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Oct 2024", initialsBg: "bg-rose-100 text-rose-600" },
    { initials: "LF", name: "Leo Fernandez", email: "leo.fernandez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2024", initialsBg: "bg-teal-100 text-teal-600" },
    { initials: "MD", name: "Mona Dela Torre", email: "mona.delatorre@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Aug 2024", initialsBg: "bg-amber-100 text-amber-600" },
    { initials: "NA", name: "Nestor Aguilar", email: "nestor.aguilar@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2024", initialsBg: "bg-blue-100 text-blue-600" },
    { initials: "OM", name: "Olivia Manalo", email: "olivia.manalo@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jun 2024", initialsBg: "bg-indigo-100 text-indigo-600" },
    { initials: "PR2", name: "Paolo Ramirez", email: "paolo.ramirez@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "May 2024", initialsBg: "bg-pink-100 text-pink-600" },
    { initials: "QS", name: "Queenie Sison", email: "queenie.sison@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Apr 2024", initialsBg: "bg-cyan-100 text-cyan-600" },
    { initials: "RT", name: "Rafael Torres", email: "rafael.torres@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2024", initialsBg: "bg-lime-100 text-lime-600" },
    { initials: "SM", name: "Sofia Mercado", email: "sofia.mercado@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Feb 2024", initialsBg: "bg-orange-100 text-orange-600" },
    { initials: "TR", name: "Tomas Rivera", email: "tomas.rivera@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2024", initialsBg: "bg-purple-100 text-purple-600" },
    { initials: "UD", name: "Ursula David", email: "ursula.david@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Dec 2023", initialsBg: "bg-sky-100 text-sky-600" },
    { initials: "VG", name: "Victor Gonzales", email: "victor.gonzales@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2023", initialsBg: "bg-emerald-100 text-emerald-600" },
    { initials: "WP", name: "Wanda Pineda", email: "wanda.pineda@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Oct 2023", initialsBg: "bg-violet-100 text-violet-600" },
    { initials: "XL", name: "Xavier Lozano", email: "xavier.lozano@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2023", initialsBg: "bg-fuchsia-100 text-fuchsia-600" }
  ] : userFilter === "shs" ? [
    { initials: "MS", name: "Maria Santos", email: "maria.santos@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2026", initialsBg: "bg-blue-100 text-blue-600" },
    { initials: "JL", name: "Jose Lopez", email: "jose.lopez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Dec 2025", initialsBg: "bg-purple-100 text-purple-600" },
    { initials: "RM", name: "Rosa Mendoza", email: "rosa.mendoza@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Oct 2025", initialsBg: "bg-pink-100 text-pink-600" },
    { initials: "KT", name: "Kevin Torres", email: "kevin.torres@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2025", initialsBg: "bg-teal-100 text-teal-600" },
    { initials: "NP", name: "Nina Perez", email: "nina.perez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Aug 2025", initialsBg: "bg-indigo-100 text-indigo-600" },
    { initials: "OR", name: "Oscar Ramos", email: "oscar.ramos@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2025", initialsBg: "bg-amber-100 text-amber-600" },
    { initials: "PM", name: "Paula Martinez", email: "paula.martinez@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Jun 2025", initialsBg: "bg-rose-100 text-rose-600" },
    { initials: "QC", name: "Quinn Cruz", email: "quinn.cruz@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "May 2025", initialsBg: "bg-cyan-100 text-cyan-600" },
    { initials: "RD", name: "Ria Dimagiba", email: "ria.dimagiba@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Apr 2025", initialsBg: "bg-lime-100 text-lime-600" },
    { initials: "SJ", name: "Sam Jimenez", email: "sam.jimenez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2025", initialsBg: "bg-orange-100 text-orange-600" },
    { initials: "TA", name: "Trisha Angeles", email: "trisha.angeles@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Feb 2025", initialsBg: "bg-purple-100 text-purple-600" },
    { initials: "US", name: "Uriel Salvacion", email: "uriel.salvacion@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2025", initialsBg: "bg-sky-100 text-sky-600" },
    { initials: "VM", name: "Vince Macapagal", email: "vince.macapagal@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Dec 2024", initialsBg: "bg-emerald-100 text-emerald-600" },
    { initials: "WC", name: "Wendy Corpuz", email: "wendy.corpuz@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2024", initialsBg: "bg-violet-100 text-violet-600" },
    { initials: "YD", name: "Yanni Del Rosario", email: "yanni.delrosario@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Oct 2024", initialsBg: "bg-fuchsia-100 text-fuchsia-600" },
    { initials: "ZC", name: "Zandro Cabrera", email: "zandro.cabrera@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2024", initialsBg: "bg-rose-100 text-rose-600" },
    { initials: "AP", name: "Angela Pangilinan", email: "angela.pangilinan@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Aug 2024", initialsBg: "bg-amber-100 text-amber-600" },
    { initials: "BS", name: "Bong Salazar", email: "bong.salazar@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2024", initialsBg: "bg-teal-100 text-teal-600" },
    { initials: "CL2", name: "Cathy Lopez", email: "cathy.lopez@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jun 2024", initialsBg: "bg-blue-100 text-blue-600" },
    { initials: "DA2", name: "Dexter Alcantara", email: "dexter.alcantara@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "May 2024", initialsBg: "bg-indigo-100 text-indigo-600" },
    { initials: "EM", name: "Eva Magtoto", email: "eva.magtoto@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Apr 2024", initialsBg: "bg-pink-100 text-pink-600" },
    { initials: "FN", name: "Freddie Natividad", email: "freddie.natividad@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2024", initialsBg: "bg-cyan-100 text-cyan-600" },
    { initials: "GZ", name: "Grace Zamora", email: "grace.zamora@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Feb 2024", initialsBg: "bg-lime-100 text-lime-600" },
    { initials: "HT", name: "Henry Tambong", email: "henry.tambong@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2024", initialsBg: "bg-orange-100 text-orange-600" },
    { initials: "IV", name: "Iris Valenzuela", email: "iris.valenzuela@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Dec 2023", initialsBg: "bg-purple-100 text-purple-600" },
    { initials: "JR", name: "Jeko Resurreccion", email: "jeko.resurreccion@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2023", initialsBg: "bg-sky-100 text-sky-600" },
    { initials: "KM", name: "Kyla Manansala", email: "kyla.manansala@gmail.com", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Oct 2023", initialsBg: "bg-emerald-100 text-emerald-600" },
    { initials: "LC", name: "Luis Catapang", email: "luis.catapang@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2023", initialsBg: "bg-violet-100 text-violet-600" },
    { initials: "MA2", name: "Mitch Araneta", email: "mitch.araneta@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Aug 2023", initialsBg: "bg-fuchsia-100 text-fuchsia-600" },
    { initials: "NT", name: "Noel Tengco", email: "noel.tengco@gmail.com", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2023", initialsBg: "bg-rose-100 text-rose-600" }
  ] : teachers.map((t) => ({
    initials: t.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
    name: t.displayName,
    email: t.email,
    status: "Active",
    statusColor: "bg-green-100 text-green-600",
    joined: t.joinDate || "—",
    initialsBg: "bg-green-100 text-green-600"
  })))
  const userTotalPages = Math.ceil(allUserRows.length / userPageSize)
  const userPaginatedRows = allUserRows.slice((userPage - 1) * userPageSize, userPage * userPageSize)

  return (
    <div className="flex h-screen overflow-hidden">
      <style>{`
        @keyframes dotPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,77,130,0.4); } 50% { box-shadow: 0 0 0 4px rgba(59,77,130,0); } }
        .cal-dot-pulse { animation: dotPulse 2s ease-in-out infinite; }
      `}</style>
      <Sidebar title="ALS Learning" subtitle="Admin Console" items={navItems} activePage={activePage} onNavigate={goTo} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={profile?.displayName || "Admin"} initials={profile?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD"} userEmail={profile?.email || ""} notificationCount={3}
          onLogout={() => setLogoutOpen(true)} onMenuToggle={() => setMobileMenuOpen(p => !p)} />

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Dashboard */}
          {activePage === "dashboard" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
                <p className="text-gray-500 mt-1">System-wide overview and management</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {[
                  { 
                    label: "Total Active Users System-wide", 
                    value: userStats.total > 0 ? userStats.total.toLocaleString() : "—", 
                    sub: userStats.students > 0 ? `+${userStats.students} students, ${userStats.teachers} teachers` : "Loading...", 
                    icon: "fa-users", 
                    color: "bg-blue-100 text-blue-600", 
                    subColor: "text-green-600", 
                    subIcon: "fa-arrow-up" 
                  },
                  { 
                    label: "Server Status", 
                    value: serverStatus?.status === "Operational" ? "Operational" : "Checking...", 
                    sub: serverStatus ? `Uptime: ${Math.floor(serverStatus.uptimeSeconds / 3600)}h ${Math.floor((serverStatus.uptimeSeconds % 3600) / 60)}m` : "Loading...", 
                    icon: "fa-server", 
                    color: "bg-green-100 text-green-600", 
                    subColor: "text-xs text-green-600", 
                    subIcon: null, 
                    dot: true 
                  },
                  { 
                    label: "Last Database Backup", 
                    value: backups[0] ? backups[0].date : "No backups yet", 
                    sub: backups[0] ? `${backups[0].time} • Size: ${backups[0].size}` : "Run a manual back-up to create one", 
                    icon: "fa-database", 
                    color: "bg-amber-100 text-amber-600", 
                    subColor: "" 
                  }
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center`}>
                        <i className={`fas ${s.icon} text-lg`} />
                      </div>
                    </div>
                    {s.dot ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                        <p className="text-lg font-bold text-green-600">{s.value}</p>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-gray-800">{s.value}</p>
                    )}
                    <p className={`text-xs mt-2 ${s.subColor || "text-gray-400"}`}>
                      {s.subIcon && <i className={`fas ${s.subIcon}`} />} {s.sub}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 bg-navy-500">
                  <h3 className="font-bold text-white"><i className="fas fa-clock mr-2" />Recent System Activities</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Status", "User", "Action", "Timestamp", "Details"].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">No activities recorded</td>
                        </tr>
                      ) : (
                        activities.slice(0, 5).map((a, i) => {
                          const statusColorMap: Record<string, string> = {
                            Completed: "bg-green-100 text-green-600",
                            "In Progress": "bg-blue-100 text-blue-600",
                            Pending: "bg-yellow-100 text-yellow-600",
                            Failed: "bg-red-100 text-red-600",
                          }
                          const statusColor = statusColorMap[a.status] || "bg-gray-100 text-gray-600"
                          const time = a.createdAt ? new Date(a.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "numeric", minute: "2-digit", hour12: true
                          }).replace(",", "") : ""
                          return (
                            <tr key={a.id || i} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4"><span className={`text-xs font-medium ${statusColor} px-2 py-0.5 rounded`}>{a.status}</span></td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-800">{a.user}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{a.action}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{time}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{a.detail}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4"><i className="fas fa-heartbeat text-red-500 mr-2" />System Health Metrics</h3>
                  <div className="space-y-5">
                    {[
                      { label: "CPU Usage", key: "cpu", color: "bg-blue-500", icon: "fa-microchip" },
                      { label: "Memory Usage", key: "memory", color: "bg-purple-500", icon: "fa-memory" },
                      { label: "Storage Usage", key: "storage", color: "bg-amber-500", icon: "fa-hdd" }
                    ].map((m) => {
                      const pct = serverStatus?.health?.[m.key as keyof typeof serverStatus.health] ?? 0
                      return (
                        <div key={m.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600"><i className={`fas ${m.icon} mr-1`} />{m.label}</span>
                            <span className="font-medium text-gray-800">{pct}%</span>
                          </div>
                          <div className="progress-bar h-2.5"><div className={`progress-fill ${m.color}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4"><i className="fas fa-chart-pie text-green-500 mr-2" />User Distribution</h3>
                  <div className="space-y-5">
                    {[
                      { label: "Students", count: userStats.students, color: "bg-blue-500", icon: "fa-user-graduate", iconColor: "text-blue-500" },
                      { label: "Teachers", count: userStats.teachers, color: "bg-purple-500", icon: "fa-chalkboard-teacher", iconColor: "text-purple-500" },
                      { label: "Administrators", count: userStats.admins, color: "bg-green-500", icon: "fa-user-shield", iconColor: "text-green-500" }
                    ].map((u) => {
                      const pct = userStats.total > 0 ? Math.round((u.count / userStats.total) * 100) : 0
                      return (
                        <div key={u.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600"><i className={`fas ${u.icon} mr-1 ${u.iconColor}`} />{u.label}</span>
                            <span className="font-medium text-gray-800">{u.count.toLocaleString()}</span>
                          </div>
                          <div className="progress-bar h-2.5"><div className={`progress-fill ${u.color}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* User Management */}
          {activePage === "user-management" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                  <p className="text-gray-500 mt-1">Manage students, teachers, and administrators</p>
                </div>
                {userFilter === "teacher" && (
                  <button onClick={() => setAddTeacherOpen(true)}
                    className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                    <i className="fas fa-plus text-xs" /> Add Teacher
                  </button>
                )}
              </div>
              <div className="flex gap-2 mb-4">
                {[
                  { id: "jhs", label: "JHS" },
                  { id: "shs", label: "SHS" },
                  { id: "teacher", label: "Teacher" }
                ].map((f) => (
                  <button key={f.id} onClick={() => setUserFilter(f.id)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition ${userFilter === f.id ? "bg-navy-500 text-white shadow-md" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input type="text" placeholder="Search users..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Name", "Email", "Status", "Joined", "Actions"].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {userPaginatedRows.map((u) => (
                        <tr key={u.email} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${u.initialsBg} flex items-center justify-center text-xs font-bold`}>{u.initials}</div>
                              <span className="text-sm font-medium text-gray-800">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${u.statusColor} px-2 py-0.5 rounded`}>{u.status}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.joined}</td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button className="text-primary hover:underline">Edit</button>
                            <button className="text-red-500 hover:underline">Suspend</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {allUserRows.length > userPageSize && (
                  <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Showing {(userPage - 1) * userPageSize + 1}-{Math.min(userPage * userPageSize, allUserRows.length)} of {allUserRows.length} users</p>
                    <div className="flex gap-1">
                      <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1}
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                      {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setUserPage(p)}
                          className={`px-3 py-1 text-sm border border-gray-200 rounded-lg transition ${userPage === p ? "bg-navy-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{p}</button>
                      ))}
                      <button onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))} disabled={userPage === userTotalPages}
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Teacher Modal */}
              {addTeacherOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!teacherSaving) { setAddTeacherOpen(false); setTeacherError(""); } }}>
                  <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-chalkboard-teacher text-purple-600 text-2xl" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">Add New Teacher</h3>
                      <p className="text-sm text-gray-500 mt-1">Create a teacher account for the system</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <input type="text" value={teacherForm.name} onChange={(e) => setTeacherForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name" disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                        <input type="text" value={teacherForm.employeeId} onChange={(e) => setTeacherForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="e.g., TCH-2026-001" disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm(p => ({ ...p, email: e.target.value }))} placeholder="teacher@gmail.com" disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <input type="password" value={teacherForm.password} onChange={(e) => setTeacherForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 6 characters" disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <select value={teacherForm.department} onChange={(e) => setTeacherForm(p => ({ ...p, department: e.target.value }))} disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 appearance-none text-gray-500 disabled:opacity-50">
                          <option value="">Select department</option>
                          <option value="Junior High School">Junior High School</option>
                          <option value="Senior High School">Senior High School</option>
                          <option value="Science & Mathematics">Science & Mathematics</option>
                          <option value="English">English</option>
                          <option value="Filipino">Filipino</option>
                          <option value="MAPEH">MAPEH</option>
                          <option value="TLE">TLE</option>
                          <option value="ABM">ABM</option>
                          <option value="HUMSS">HUMSS</option>
                          <option value="STEM">STEM</option>
                          <option value="TVL">TVL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                        <input type="text" value={teacherForm.contact} onChange={(e) => setTeacherForm(p => ({ ...p, contact: e.target.value }))} placeholder="e.g., 0917-xxx-xxxx" disabled={teacherSaving}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:opacity-50" />
                      </div>
                    </div>
                    {teacherError && <p className="text-red-500 text-xs mt-3 text-center">{teacherError}</p>}
                    <div className="flex gap-3 mt-6">
                      {!teacherSaving && (
                        <button onClick={() => { setAddTeacherOpen(false); setTeacherError(""); setTeacherForm({ name: "", employeeId: "", email: "", department: "", contact: "", password: "" }) }}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      )}
                      <button onClick={async () => {
                        if (!teacherForm.name || !teacherForm.email || !teacherForm.employeeId || !teacherForm.password) return
                        if (teacherForm.password.length < 6) { setTeacherError("Password must be at least 6 characters."); return }
                        setTeacherSaving(true)
                        setTeacherError("")
                        try {
                          const now = new Date()
                          const joinDate = `${["January","February","March","April","May","June","July","August","September","October","November","December"][now.getMonth()]} ${now.getFullYear()}`
                          const { data: rec, error } = await supabase.from("profiles").insert({
                            email: teacherForm.email,
                            name: teacherForm.name.trim(),
                            role: "teacher",
                            employee_id: teacherForm.employeeId.trim(),
                            department: teacherForm.department,
                            phone: teacherForm.contact.trim(),
                            join_date: joinDate,
                          }).select().single()
                          if (error) throw new Error(error.message)
                          const uid = rec.id
                          await supabase.from("profiles").update({ uid }).eq("id", uid).select().single()
                          setTeachers((prev) => [...prev, {
                            uid,
                            displayName: teacherForm.name.trim(),
                            email: teacherForm.email,
                            department: teacherForm.department,
                            employeeId: teacherForm.employeeId.trim(),
                            phone: teacherForm.contact.trim(),
                            joinDate,
                          }])
                          setTeacherForm({ name: "", employeeId: "", email: "", department: "", contact: "", password: "" })
                          setAddTeacherOpen(false)
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : "Failed to create teacher account."
                          if (msg.includes("email-already")) setTeacherError("This email is already registered.")
                          else setTeacherError(msg)
                        } finally {
                          setTeacherSaving(false)
                        }
                      }}
                        disabled={teacherSaving || !teacherForm.name || !teacherForm.email || !teacherForm.employeeId || !teacherForm.password}
                        className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2 disabled:opacity-70">
                        {teacherSaving ? <><i className="fas fa-spinner fa-spin text-xs" /> Creating...</> : <><i className="fas fa-user-plus text-sm" /> Add Teacher</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Database Backup */}
          {activePage === "database-backup" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Database Back-up</h2>
                  <p className="text-gray-500 mt-1">Create and manage system backups</p>
                </div>
                <button onClick={() => setBackupModalOpen(true)}
                  className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                  <i className="fas fa-database text-xs" /> Manual Back-up
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-clock text-navy-500 text-sm" /> Automatic Backup Schedule
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">Every day at <span className="font-semibold text-gray-800">5:00 PM</span></p>
                  <p className="text-xs text-gray-400">System automatically backs up the database daily at 5:00 PM server time.</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-info-circle text-blue-500 text-sm" /> Storage Summary
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">Total backups: <span className="font-semibold text-gray-800">{backups.length}</span></p>
                  <p className="text-xs text-gray-400">
                    {backups.length > 0
                      ? `Average size: ${(backups.reduce((a, b) => a + (b.bytes || 0), 0) / backups.length / 1024 / 1024 / 1024).toFixed(1)} GB per backup • Latest: ${backups[0].date} at ${backups[0].time}`
                      : "No backups yet"}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-navy-500">
                  <h3 className="font-bold text-white"><i className="fas fa-history mr-2" />Backup History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Date", "Time", "Type", "Size", "Status", "Action"].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {backups.map((b, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{b.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{b.time}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${b.type === "Automatic" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"} px-2 py-0.5 rounded`}>{b.type}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-600">{b.size}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${b.statusColor} px-2 py-0.5 rounded`}>{b.status}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleDownloadBackup(b)}
                                className="text-navy-500 hover:text-navy-700 text-sm font-medium transition flex items-center gap-1">
                                <i className="fas fa-download text-xs" /> Download
                              </button>
                              <button onClick={() => handleDeleteBackup(b)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium transition flex items-center gap-1">
                                <i className="fas fa-trash text-xs" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual Backup Modal */}
              {backupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!backingUp) setBackupModalOpen(false) }}>
                  <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    {!backupSuccess ? (
                      <>
                        <div className="text-center mb-5">
                          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-amber-600 text-2xl" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">Manual Database Backup</h3>
                          <p className="text-sm text-gray-500 mt-1">Are you sure you want to create a manual backup of the database?</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setBackupModalOpen(false)} disabled={backingUp}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                            Cancel
                          </button>
                          <button onClick={handleRunBackup} disabled={backingUp}
                            className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2 disabled:opacity-70">
                            {backingUp ? (
                              <><i className="fas fa-spinner fa-spin text-sm" /> Backing up...</>
                            ) : (
                              <><i className="fas fa-database text-sm" /> Proceed Backup</>
                            )}
                          </button>
                        </div>
                        {backupError && (
                          <p className="text-sm text-red-600 mt-4 text-center"><i className="fas fa-exclamation-circle mr-1" />{backupError}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-center mb-5">
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-check-circle text-green-600 text-2xl" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">Backup Complete</h3>
                          <p className="text-sm text-gray-500 mt-1">Database has been backed up successfully.</p>
                        </div>
                        <button onClick={() => { setBackupModalOpen(false); setBackupSuccess(false) }}
                          className="w-full py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition">
                          Done
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {activePage === "reports" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
                  <p className="text-gray-500 mt-1">View system reports and performance data</p>
                </div>
                <button onClick={handleExportReport} className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                  <i className="fas fa-download text-xs" /> Export Report
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">Overall Performance by Cohort</h3>
                    <div className="space-y-3">
                      {reportsOverview?.byCohort && [
                        { label: "Junior High School", key: "jhs", color: "bg-blue-500" },
                        { label: "Senior High School", key: "shs", color: "bg-purple-500" }
                      ].map((c) => {
                        const cohort = reportsOverview.byCohort[c.key]
                        const pct = cohort?.rate ?? 0
                        return (
                          <div key={c.label}>
                            <div className="flex justify-between text-sm mb-1"><span>{c.label}</span><span className="font-medium">{pct}%</span></div>
                            <div className="progress-bar"><div className={`progress-fill ${c.color}`} style={{ width: `${pct}%` }} /></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">System-wide Completion Rate</h3>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset={188.5 - (188.5 * (reportsOverview?.completionRate || 0) / 100)} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">{reportsOverview?.completionRate ?? 0}%</span>
                        <span className="text-[10px] text-gray-400">Complete</span>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-3">{reportsOverview?.totalTasksCompleted ?? 0} out of {reportsOverview?.totalTasksAssigned ?? 0} total tasks completed</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold bg-navy-500 text-white px-4 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                    <i className="fas fa-trophy text-amber-500 text-sm" /> JHS Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {jhsLeaderboard.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                    ) : (
                      jhsLeaderboard.map((s) => (
                        <div key={s.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                          <span className={`w-7 h-7 rounded-full ${s.rank === 1 ? "bg-yellow-400" : s.rank === 2 ? "bg-gray-400" : s.rank === 3 ? "bg-amber-700" : "bg-gray-300"} flex items-center justify-center text-xs font-bold text-white`}>{s.rank}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                          <span className="text-sm font-semibold text-green-600">{s.completionRate}%</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={() => { setJhsModalOpen(true); setJhsPage(1) }}
                      className="px-3 py-1.5 bg-navy-500 text-white text-xs font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-1.5">
                      View All <i className="fas fa-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold bg-navy-500 text-white px-4 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                    <i className="fas fa-trophy text-amber-500 text-sm" /> SHS Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {shsLeaderboard.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                    ) : (
                      shsLeaderboard.map((s) => (
                        <div key={s.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                          <span className={`w-7 h-7 rounded-full ${s.rank === 1 ? "bg-yellow-400" : s.rank === 2 ? "bg-gray-400" : s.rank === 3 ? "bg-amber-700" : "bg-gray-300"} flex items-center justify-center text-xs font-bold text-white`}>{s.rank}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                          <span className="text-sm font-semibold text-green-600">{s.completionRate}%</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={() => { setShsModalOpen(true); setShsPage(1) }}
                      className="px-3 py-1.5 bg-navy-500 text-white text-xs font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-1.5">
                      View All <i className="fas fa-arrow-right text-xs" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                    Enrollment Trends
                    <button onClick={() => setEnrollmentModalOpen(true)}
                      className="px-3 py-1.5 bg-navy-500 text-white text-xs font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-1.5">
                      <i className="fas fa-chart-bar text-xs" /> View Details
                    </button>
                  </h3>
                  <div className="space-y-3">
                    {enrollmentByYear.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No enrollment data</p>
                    ) : enrollmentByYear.map((e) => (
                      <div key={e.year} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{e.year === String(new Date().getFullYear()) ? "This Year" : e.year}</span>
                        <span className="font-bold text-gray-800">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    {[
                      { icon: "fa-check-circle", color: "bg-green-100 text-green-600", value: quickStats.assignmentsCompleted.toLocaleString(), label: "Tasks Completed" },
                      { icon: "fa-users", color: "bg-blue-100 text-blue-600", value: quickStats.activeTeachers.toLocaleString(), label: "Active Teachers" },
                      { icon: "fa-layer-group", color: "bg-amber-100 text-amber-600", value: quickStats.activeCohorts.toLocaleString(), label: "Active Cohorts" }
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                          <i className={`fas ${s.icon} text-sm`} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-800">{s.value}</p>
                          <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enrollment Details Modal */}
              {enrollmentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEnrollmentModalOpen(false)}>
                  <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800">Enrollment Per Year</h3>
                      <button onClick={() => setEnrollmentModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <i className="fas fa-times text-gray-500 text-sm" />
                      </button>
                    </div>
                    <div className="flex items-end justify-around gap-4 h-56 px-2">
                      {(() => {
                        const max = Math.max(1, ...enrollmentByYear.map((e) => e.count))
                        const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-navy-500", "bg-amber-500"]
                        return enrollmentByYear.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8 w-full">No enrollment data</p>
                        ) : enrollmentByYear.map((e, i) => (
                          <div key={e.year} className="flex flex-col items-center gap-2 flex-1">
                            <span className="text-xs font-semibold text-gray-500">{e.count}</span>
                            <div className="w-full rounded-lg bg-gray-100 flex items-end justify-center relative" style={{ height: "160px" }}>
                              <div className={`w-full rounded-lg ${colors[i % colors.length]} transition-all duration-700 absolute bottom-0`}
                                style={{ height: `${Math.max(4, (e.count / max) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{e.year === String(new Date().getFullYear()) ? "This Year" : e.year}</span>
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="mt-6 text-center text-xs text-gray-400">Total enrollment per year</div>
                  </div>
                </div>
              )}

              {/* JHS Leaderboard Modal */}
              {(() => {
                const perPage = 10
                const totalJhsPages = Math.max(1, Math.ceil(jhsAll.length / perPage))
                const startJhs = (jhsPage - 1) * perPage
                const paginatedJhs = jhsAll.slice(startJhs, startJhs + perPage)
                return jhsModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setJhsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-gray-800">Junior High School Leaderboard</h3>
                        <button onClick={() => setJhsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <i className="fas fa-times text-gray-500 text-sm" />
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              {["Rank", "Name", "Grade Level", "Tasks Completed", "Rate"].map((h) => (
                                <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedJhs.length === 0 ? (
                              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No student data available</td></tr>
                            ) : paginatedJhs.map((s) => (
                              <tr key={s.rank} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-3">
                                  <span className="w-7 h-7 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white">{s.rank}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                  <p className="text-xs text-gray-400">{s.email}</p>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.gradeLevel}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.tasksCompleted} / {s.tasksAssigned}</td>
                                <td className="px-5 py-3"><span className="text-sm font-semibold text-green-600">{s.completionRate}%</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalJhsPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100">
                          <button onClick={() => setJhsPage(p => Math.max(1, p - 1))} disabled={jhsPage === 1}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${jhsPage === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                            <i className="fas fa-chevron-left text-xs" />
                          </button>
                          {Array.from({ length: totalJhsPages }, (_, i) => i + 1).map((p) => (
                            <button key={p} onClick={() => setJhsPage(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${p === jhsPage ? "bg-navy-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                              {p}
                            </button>
                          ))}
                          <button onClick={() => setJhsPage(p => Math.min(totalJhsPages, p + 1))} disabled={jhsPage === totalJhsPages}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${jhsPage === totalJhsPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                            <i className="fas fa-chevron-right text-xs" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* SHS Leaderboard Modal */}
              {(() => {
                const perPage = 10
                const totalShsPages = Math.max(1, Math.ceil(shsAll.length / perPage))
                const startShs = (shsPage - 1) * perPage
                const paginatedShs = shsAll.slice(startShs, startShs + perPage)
                return shsModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-gray-800">Senior High School Leaderboard</h3>
                        <button onClick={() => setShsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <i className="fas fa-times text-gray-500 text-sm" />
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              {["Rank", "Name", "Grade Level", "Tasks Completed", "Rate"].map((h) => (
                                <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedShs.length === 0 ? (
                              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No student data available</td></tr>
                            ) : paginatedShs.map((s) => (
                              <tr key={s.rank} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-3">
                                  <span className="w-7 h-7 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white">{s.rank}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                  <p className="text-xs text-gray-400">{s.email}</p>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.gradeLevel}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.tasksCompleted} / {s.tasksAssigned}</td>
                                <td className="px-5 py-3"><span className="text-sm font-semibold text-green-600">{s.completionRate}%</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalShsPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100">
                          <button onClick={() => setShsPage(p => Math.max(1, p - 1))} disabled={shsPage === 1}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${shsPage === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                            <i className="fas fa-chevron-left text-xs" />
                          </button>
                          {Array.from({ length: totalShsPages }, (_, i) => i + 1).map((p) => (
                            <button key={p} onClick={() => setShsPage(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${p === shsPage ? "bg-navy-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                              {p}
                            </button>
                          ))}
                          <button onClick={() => setShsPage(p => Math.min(totalShsPages, p + 1))} disabled={shsPage === totalShsPages}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${shsPage === totalShsPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}>
                            <i className="fas fa-chevron-right text-xs" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Calendar */}
          {activePage === "calendar" && (
            <div className="flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
              <p className="text-gray-500 mt-1 mb-6">View important dates and schedule events</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 bg-navy-500 -m-6 mb-5 p-4 rounded-t-xl">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else { setCalMonth(m => m - 1) }; setCalSelected(null) }}
                      className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                      <i className="fas fa-chevron-left text-white text-sm" />
                    </button>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white">{["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} {calYear}</h3>
                    </div>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else { setCalMonth(m => m + 1) }; setCalSelected(null) }}
                      className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                      <i className="fas fa-chevron-right text-white text-sm" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="py-2">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                      const day = i + 1
                      const today = new Date()
                      const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                      const isSelected = day === calSelected
                      const key = `${calYear}-${calMonth}-${day}`
                      const hasEvents = announcements[key] && announcements[key].length > 0
                      return (
                        <button key={day} onClick={() => {
                          setCalSelected(day)
                          const date = new Date(calYear, calMonth, day)
                          const today2 = new Date()
                          today2.setHours(0, 0, 0, 0)
                          if (date >= today2) setCalModalOpen(true)
                          else setCalSelected(day)
                        }}
                          className={`flex flex-col items-center justify-center rounded-lg text-sm font-medium transition relative min-h-[48px]
                            ${isSelected ? "bg-navy-500 text-white shadow-md shadow-navy-500/25 z-10" : isToday ? "bg-navy-50 text-navy-700 font-bold ring-2 ring-navy-200" : "hover:bg-gray-50 text-gray-700"}`}>
                          <span>{day}</span>
                          {hasEvents && (
                            announcements[key].length > 1
                              ? <span className={`absolute bottom-2 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none shadow-sm ${isSelected ? "bg-white text-navy-500" : "bg-navy-500 text-white"}`}>{announcements[key].length}</span>
                              : <span className={`absolute bottom-[13px] w-2 h-2 rounded-full ${(categoryDotColors[announcements[key][0]?.category] || "bg-navy-500")} cal-dot-pulse ${isSelected ? "ring-2 ring-white" : ""}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                  <div className="pb-4 border-b border-gray-100 mb-4">
                    <h3 className="font-semibold text-gray-800 text-base">
                      {calSelected ? `${["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} ${calSelected}, ${calYear}` : "Select a date"}
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {calSelected ? (
                      (() => {
                        const key = `${calYear}-${calMonth}-${calSelected}`
                        const items = announcements[key] ?? []
                        return items.length > 0 ? (
                          <div className="space-y-3">
                            {items.map((a) => (
                              <div key={a.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50 transition hover:shadow-sm">
                                <div className="flex items-start gap-3">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1.5 ${categoryStyles[a.category] || categoryStyles.General}`}>
                                      {a.category || "General"}
                                    </span>
                                    <p className="text-sm text-gray-700">{a.text}</p>
                                  </div>
                                  <button onClick={() => handleDeleteAnnouncement(a.id, key)}
                                    className="text-gray-300 hover:text-red-500 transition flex-shrink-0" title="Delete announcement">
                                    <i className="fas fa-trash-alt text-sm" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                              <i className="fas fa-calendar-day text-gray-300 text-2xl" />
                            </div>
                            <p className="text-sm text-gray-400">No announcements</p>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <i className="fas fa-calendar-plus text-gray-300 text-2xl" />
                        </div>
                        <p className="text-sm text-gray-400">Click a date to manage</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Announcement Modal */}
              {calModalOpen && calSelected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setCalModalOpen(false); setCalInput(""); setCalCategory("General") }}>
                  <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-bullhorn text-navy-600 text-2xl" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">Add Announcement</h3>
                      <p className="text-sm text-gray-500 mt-1">{["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} {calSelected}, {calYear}</p>
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ANNOUNCEMENT_CATEGORIES.map((c) => (
                        <button key={c} type="button" onClick={() => setCalCategory(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${calCategory === c ? "bg-navy-500 text-white border-navy-500" : "bg-white text-gray-600 border-gray-200 hover:border-navy-300"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <textarea value={calInput} onChange={(e) => setCalInput(e.target.value)} rows={3} placeholder="Type your announcement here..."
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setCalModalOpen(false); setCalInput(""); setCalCategory("General") }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={async () => {
                        if (!calInput.trim()) return
                        const key = `${calYear}-${calMonth}-${calSelected}`
                        try {
                          const { data: rec } = await supabase.from("announcements").insert({ date: key, text: calInput.trim(), category: calCategory }).select().single()
                          if (rec) setAnnouncements(prev => ({ ...prev, [key]: [...(prev[key] ?? []), { id: rec.id, text: rec.text, category: rec.category || calCategory }] }))
                        } catch { /* offline */ }
                        setCalInput("")
                        setCalCategory("General")
                        setCalModalOpen(false)
                      }} disabled={!calInput.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition disabled:opacity-50">
                        <i className="fas fa-save text-sm mr-1.5" /> Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activePage === "settings" && (
            <div className="flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
              <p className="text-gray-500 mt-1 mb-6">Customize your preferences and account settings</p>
              <div className="space-y-4 flex-1">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    {["Email notifications for new registrations", "System health alerts", "Monthly report summaries"].map((n, i) => (
                      <label key={n} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">{n}</span>
                        <input type="checkbox" defaultChecked={i < 2} className="rounded text-navy-500 focus:ring-navy-500/20" />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Account</h3>
                  <div className="space-y-3">
                    <button onClick={() => setPwdOpen(true)}
                      className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                      <i className="fas fa-key text-gray-400 w-4" /> Change Password
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Design</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-3 text-sm text-gray-700">
                        <i className="fas fa-moon text-gray-400 w-4" /> Dark Mode
                      </span>
                      <button onClick={toggleTheme}
                        className="relative w-12 h-7 rounded-full transition-colors duration-300"
                        style={{ background: isDark ? "#2563eb" : "#cbd5e1" }}>
                        <span className="absolute left-0.5 top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 text-xs"
                          style={{ transform: isDark ? "translateX(20px)" : "translateX(0)" }}>
                          <i className={`fas fa-${isDark ? "moon text-white" : "sun text-yellow-500"}`} />
                        </span>
                      </button>
                    </label>
                  </div>
                </div>
              </div>
              <button onClick={() => setLogoutOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition mt-4"
                style={{ background: "#dc2626", color: "#fff" }}>
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { logout(); navigate("/"); }} />
    </div>
  )
}

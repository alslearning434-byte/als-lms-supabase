import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"

import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import type { NavItem } from "../types"

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "th-large" },
  { id: "user-management", label: "User Management", icon: "users-cog" },
  { id: "database-backup", label: "Database Back-up", icon: "database" },
  { id: "calendar", label: "Calendar", icon: "calendar-alt" },
  { id: "reports", label: "Reports", icon: "chart-bar" }
]

const backupHistory = [
  { date: "May 26, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 25, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 24, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 23, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 22, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 22, 2026", time: "10:30 AM", type: "Manual", size: "1.1 GB", status: "Completed", statusColor: "bg-blue-100 text-blue-600" },
  { date: "May 21, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" },
  { date: "May 20, 2026", time: "05:00 PM", type: "Automatic", size: "1.2 GB", status: "Completed", statusColor: "bg-green-100 text-green-600" }
]

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
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calSelected, setCalSelected] = useState<number | null>(null)
  const [calModalOpen, setCalModalOpen] = useState(false)
  const [calInput, setCalInput] = useState("")
  const [announcements, setAnnouncements] = useState<Record<string, string[]>>({})
  const [userFilter, setUserFilter] = useState("jhs")
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [teacherForm, setTeacherForm] = useState({ name: "", employeeId: "", email: "", department: "", contact: "" })
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false)
  const [jhsModalOpen, setJhsModalOpen] = useState(false)
  const [shsModalOpen, setShsModalOpen] = useState(false)
  const [jhsPage, setJhsPage] = useState(1)
  const [shsPage, setShsPage] = useState(1)
  const isDark = theme === "dark"

  const goTo = (page: string) => setActivePage(page)

  const jhsAllData = [
    { rank: 1, name: "Juan Dela Cruz", section: "Section A", score: "89%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 2, name: "Ana Gomez", section: "Section B", score: "76%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 3, name: "Carlos Tan", section: "Section C", score: "71%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 4, name: "Maria Flores", section: "Section D", score: "68%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 5, name: "Pedro Reyes", section: "Section E", score: "62%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 6, name: "Ricardo Garcia", section: "Section A", score: "58%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 7, name: "Liza Santos", section: "Section B", score: "55%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 8, name: "Ben Mendoza", section: "Section C", score: "51%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 9, name: "Celia Villanueva", section: "Section D", score: "47%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 10, name: "Dante Aquino", section: "Section E", score: "43%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 11, name: "Elena Santiago", section: "Section A", score: "82%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 12, name: "Fernando Cruz", section: "Section B", score: "78%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 13, name: "Gina Villar", section: "Section C", score: "73%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 14, name: "Hector Santos", section: "Section D", score: "69%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 15, name: "Isabella Ramos", section: "Section E", score: "65%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 16, name: "Joel Bautista", section: "Section A", score: "61%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 17, name: "Karen Lim", section: "Section B", score: "57%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 18, name: "Leo Fernandez", section: "Section C", score: "53%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 19, name: "Mona Dela Torre", section: "Section D", score: "49%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 20, name: "Nestor Aguilar", section: "Section E", score: "44%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 21, name: "Olivia Manalo", section: "Section A", score: "86%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 22, name: "Paolo Ramirez", section: "Section B", score: "80%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 23, name: "Queenie Sison", section: "Section C", score: "75%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 24, name: "Rafael Torres", section: "Section D", score: "70%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 25, name: "Sofia Mercado", section: "Section E", score: "66%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 26, name: "Tomas Rivera", section: "Section A", score: "60%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 27, name: "Ursula David", section: "Section B", score: "56%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 28, name: "Victor Gonzales", section: "Section C", score: "52%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 29, name: "Wanda Pineda", section: "Section D", score: "48%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 30, name: "Xavier Lozano", section: "Section E", score: "41%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" }
  ]
  const shsAllData = [
    { rank: 1, name: "Maria Santos", section: "Section A", score: "92%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 2, name: "Kevin Torres", section: "Section B", score: "85%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 3, name: "Nina Perez", section: "Section C", score: "79%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 4, name: "Jose Lopez", section: "Section D", score: "74%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 5, name: "Rosa Mendoza", section: "Section E", score: "67%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 6, name: "Oscar Ramos", section: "Section A", score: "63%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 7, name: "Paula Martinez", section: "Section B", score: "59%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 8, name: "Quinn Cruz", section: "Section C", score: "54%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 9, name: "Ria Dimagiba", section: "Section D", score: "50%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 10, name: "Sam Jimenez", section: "Section E", score: "46%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 11, name: "Trisha Angeles", section: "Section A", score: "88%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 12, name: "Uriel Salvacion", section: "Section B", score: "83%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 13, name: "Vince Macapagal", section: "Section C", score: "77%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 14, name: "Wendy Corpuz", section: "Section D", score: "72%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 15, name: "Yanni Del Rosario", section: "Section E", score: "68%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 16, name: "Zandro Cabrera", section: "Section A", score: "64%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 17, name: "Angela Pangilinan", section: "Section B", score: "60%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 18, name: "Bong Salazar", section: "Section C", score: "55%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 19, name: "Cathy Lopez", section: "Section D", score: "51%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 20, name: "Dexter Alcantara", section: "Section E", score: "47%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 21, name: "Eva Magtoto", section: "Section A", score: "91%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 22, name: "Freddie Natividad", section: "Section B", score: "84%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 23, name: "Grace Zamora", section: "Section C", score: "78%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 24, name: "Henry Tambong", section: "Section D", score: "73%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 25, name: "Iris Valenzuela", section: "Section E", score: "69%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 26, name: "Jeko Resurreccion", section: "Section A", score: "62%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" },
    { rank: 27, name: "Kyla Manansala", section: "Section B", score: "58%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 28, name: "Luis Catapang", section: "Section C", score: "53%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 29, name: "Mitch Araneta", section: "Section D", score: "49%", status: "Active", statusColor: "bg-green-100 text-green-600" },
    { rank: 30, name: "Noel Tengco", section: "Section E", score: "45%", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600" }
  ]

  return (
    <div className="flex h-screen overflow-hidden">
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
                  { label: "Total Active Users System-wide", value: "1,284", sub: "+42 this month", icon: "fa-users", color: "bg-blue-100 text-blue-600", subColor: "text-green-600", subIcon: "fa-arrow-up" },
                  { label: "Server Status", value: "Operational", sub: "Uptime: 99.9% over 30 days", icon: "fa-server", color: "bg-green-100 text-green-600", subColor: "text-xs text-green-600", subIcon: null, dot: true },
                  { label: "Last Database Backup", value: "May 23, 2026", sub: "02:30 AM • Size: 1.2 GB", icon: "fa-database", color: "bg-amber-100 text-amber-600", subColor: "" }
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
                      {[
                        { status: "Completed", statusColor: "bg-green-100 text-green-600", user: "admin@als.edu", action: "User Provision", time: "May 23, 2026 09:15 AM", detail: "New teacher account created" },
                        { status: "Completed", statusColor: "bg-green-100 text-green-600", user: "system", action: "Backup", time: "May 23, 2026 02:30 AM", detail: "Database backup completed" },
                        { status: "In Progress", statusColor: "bg-blue-100 text-blue-600", user: "michael.reyes@als.edu", action: "Curriculum Update", time: "May 22, 2026 04:45 PM", detail: "Science module revision pending" },
                        { status: "Completed", statusColor: "bg-green-100 text-green-600", user: "system", action: "Security Scan", time: "May 22, 2026 12:00 PM", detail: "Weekly vulnerability scan — no threats" },
                        { status: "Pending", statusColor: "bg-yellow-100 text-yellow-600", user: "juan.delacruz@als.edu", action: "Registration", time: "May 22, 2026 10:20 AM", detail: "Teacher registration awaiting approval" }
                      ].map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${r.statusColor} px-2 py-0.5 rounded`}>{r.status}</span></td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{r.user}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.action}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.time}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{r.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4"><i className="fas fa-heartbeat text-red-500 mr-2" />System Health Metrics</h3>
                  <div className="space-y-5">
                    {[
                      { label: "CPU Usage", pct: 42, color: "bg-blue-500", icon: "fa-microchip" },
                      { label: "Memory Usage", pct: 67, color: "bg-purple-500", icon: "fa-memory" },
                      { label: "Storage Usage", pct: 53, color: "bg-amber-500", icon: "fa-hdd" }
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600"><i className={`fas ${m.icon} mr-1`} />{m.label}</span>
                          <span className="font-medium text-gray-800">{m.pct}%</span>
                        </div>
                        <div className="progress-bar h-2.5"><div className={`progress-fill ${m.color}`} style={{ width: `${m.pct}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4"><i className="fas fa-chart-pie text-green-500 mr-2" />User Distribution</h3>
                  <div className="space-y-5">
                    {[
                      { label: "Students", count: 1142, pct: 89, color: "bg-blue-500", icon: "fa-user-graduate", iconColor: "text-blue-500" },
                      { label: "Teachers", count: 142, pct: 11, color: "bg-purple-500", icon: "fa-chalkboard-teacher", iconColor: "text-purple-500" },
                      { label: "Administrator", count: 1, pct: 0.08, color: "bg-green-500", icon: "fa-user-shield", iconColor: "text-green-500" }
                    ].map((u) => (
                      <div key={u.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600"><i className={`fas ${u.icon} mr-1 ${u.iconColor}`} />{u.label}</span>
                          <span className="font-medium text-gray-800">{u.count.toLocaleString()}</span>
                        </div>
                        <div className="progress-bar h-2.5"><div className={`progress-fill ${u.color}`} style={{ width: `${Math.min(u.pct, 100)}%` }} /></div>
                      </div>
                    ))}
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
                      {(userFilter === "jhs" ? [
                        { initials: "JD", name: "Juan Dela Cruz", email: "juan.delacruz@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2026", initialsBg: "bg-amber-100 text-amber-600" },
                        { initials: "PR", name: "Pedro Reyes", email: "pedro.reyes@als.edu", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Feb 2026", initialsBg: "bg-red-100 text-red-600" },
                        { initials: "AG", name: "Ana Gomez", email: "ana.gomez@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2026", initialsBg: "bg-blue-100 text-blue-600" },
                        { initials: "CT", name: "Carlos Tan", email: "carlos.tan@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2025", initialsBg: "bg-teal-100 text-teal-600" },
                        { initials: "MF", name: "Maria Flores", email: "maria.flores@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Oct 2025", initialsBg: "bg-pink-100 text-pink-600" },
                        { initials: "RG", name: "Ricardo Garcia", email: "ricardo.garcia@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2025", initialsBg: "bg-indigo-100 text-indigo-600" },
                        { initials: "LS", name: "Liza Santos", email: "liza.santos@als.edu", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Aug 2025", initialsBg: "bg-rose-100 text-rose-600" },
                        { initials: "BM", name: "Ben Mendoza", email: "ben.mendoza@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2025", initialsBg: "bg-cyan-100 text-cyan-600" },
                        { initials: "CV", name: "Celia Villanueva", email: "celia.villanueva@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jun 2025", initialsBg: "bg-lime-100 text-lime-600" },
                        { initials: "DA", name: "Dante Aquino", email: "dante.aquino@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "May 2025", initialsBg: "bg-orange-100 text-orange-600" }
                      ] : userFilter === "shs" ? [
                        { initials: "MS", name: "Maria Santos", email: "maria.santos@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2026", initialsBg: "bg-blue-100 text-blue-600" },
                        { initials: "JL", name: "Jose Lopez", email: "jose.lopez@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Dec 2025", initialsBg: "bg-purple-100 text-purple-600" },
                        { initials: "RM", name: "Rosa Mendoza", email: "rosa.mendoza@als.edu", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Oct 2025", initialsBg: "bg-pink-100 text-pink-600" },
                        { initials: "KT", name: "Kevin Torres", email: "kevin.torres@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2025", initialsBg: "bg-teal-100 text-teal-600" },
                        { initials: "NP", name: "Nina Perez", email: "nina.perez@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Aug 2025", initialsBg: "bg-indigo-100 text-indigo-600" },
                        { initials: "OR", name: "Oscar Ramos", email: "oscar.ramos@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2025", initialsBg: "bg-amber-100 text-amber-600" },
                        { initials: "PM", name: "Paula Martinez", email: "paula.martinez@als.edu", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Jun 2025", initialsBg: "bg-rose-100 text-rose-600" },
                        { initials: "QC", name: "Quinn Cruz", email: "quinn.cruz@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "May 2025", initialsBg: "bg-cyan-100 text-cyan-600" },
                        { initials: "RD", name: "Ria Dimagiba", email: "ria.dimagiba@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Apr 2025", initialsBg: "bg-lime-100 text-lime-600" },
                        { initials: "SJ", name: "Sam Jimenez", email: "sam.jimenez@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2025", initialsBg: "bg-orange-100 text-orange-600" }
                      ] : [
                        { initials: "MR", name: "Michael Reyes", email: "michael.reyes@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Aug 2018", initialsBg: "bg-green-100 text-green-600" },
                        { initials: "LG", name: "Luzviminda Gomez", email: "luzviminda.gomez@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jun 2019", initialsBg: "bg-teal-100 text-teal-600" },
                        { initials: "DV", name: "David Villanueva", email: "david.villanueva@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2020", initialsBg: "bg-indigo-100 text-indigo-600" },
                        { initials: "SC", name: "Sofia Castillo", email: "sofia.castillo@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Mar 2020", initialsBg: "bg-pink-100 text-pink-600" },
                        { initials: "AF", name: "Anthony Ferrer", email: "anthony.ferrer@als.edu", status: "Inactive", statusColor: "bg-yellow-100 text-yellow-600", joined: "Jun 2020", initialsBg: "bg-rose-100 text-rose-600" },
                        { initials: "GN", name: "Grace Navarro", email: "grace.navarro@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Nov 2020", initialsBg: "bg-cyan-100 text-cyan-600" },
                        { initials: "EL", name: "Eduardo Lim", email: "eduardo.lim@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Feb 2021", initialsBg: "bg-lime-100 text-lime-600" },
                        { initials: "ID", name: "Isabel Dizon", email: "isabel.dizon@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jul 2021", initialsBg: "bg-orange-100 text-orange-600" },
                        { initials: "JG", name: "Josefina Garcia", email: "josefina.garcia@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Jan 2022", initialsBg: "bg-purple-100 text-purple-600" },
                        { initials: "KT", name: "Kristoffer Tan", email: "kristoffer.tan@als.edu", status: "Active", statusColor: "bg-green-100 text-green-600", joined: "Sep 2022", initialsBg: "bg-amber-100 text-amber-600" }
                      ]).map((u) => (
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
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Showing 1-10 of {userFilter === "jhs" ? "284" : userFilter === "shs" ? "858" : "142"} users</p>
                  <div className="flex gap-1">
                    <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">Previous</button>
                    <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-navy-500 text-white">1</button>
                    <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">2</button>
                    <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">3</button>
                    <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              </div>

              {/* Add Teacher Modal */}
              {addTeacherOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAddTeacherOpen(false)}>
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
                        <input type="text" value={teacherForm.name} onChange={(e) => setTeacherForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                        <input type="text" value={teacherForm.employeeId} onChange={(e) => setTeacherForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="e.g., TCH-2026-001"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm(p => ({ ...p, email: e.target.value }))} placeholder="teacher@als.edu"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <select value={teacherForm.department} onChange={(e) => setTeacherForm(p => ({ ...p, department: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 appearance-none text-gray-500">
                          <option value="">Select department</option>
                          <option value="Junior High School">Junior High School</option>
                          <option value="Senior High School">Senior High School</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                        <input type="text" value={teacherForm.contact} onChange={(e) => setTeacherForm(p => ({ ...p, contact: e.target.value }))} placeholder="e.g., 0917-xxx-xxxx"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setAddTeacherOpen(false); setTeacherForm({ name: "", employeeId: "", email: "", department: "", contact: "" }) }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={() => {
                        if (!teacherForm.name || !teacherForm.email || !teacherForm.employeeId) return
                        setAddTeacherOpen(false)
                        setTeacherForm({ name: "", employeeId: "", email: "", department: "", contact: "" })
                      }}
                        className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition">
                        <i className="fas fa-user-plus text-sm mr-1.5" /> Add Teacher
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
                  <p className="text-sm text-gray-500 mb-1">Total backups: <span className="font-semibold text-gray-800">{backupHistory.length}</span></p>
                  <p className="text-xs text-gray-400">Average size: 1.2 GB per backup • Latest: May 26, 2026 at 5:00 PM</p>
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
                      {backupHistory.map((b, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{b.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{b.time}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${b.type === "Automatic" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"} px-2 py-0.5 rounded`}>{b.type}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-600">{b.size}</td>
                          <td className="px-6 py-4"><span className={`text-xs font-medium ${b.statusColor} px-2 py-0.5 rounded`}>{b.status}</span></td>
                          <td className="px-6 py-4">
                            <button onClick={() => alert(`Downloading backup from ${b.date} at ${b.time}...`)}
                              className="text-navy-500 hover:text-navy-700 text-sm font-medium transition flex items-center gap-1">
                              <i className="fas fa-download text-xs" /> Download
                            </button>
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
                          <button onClick={() => {
                            setBackingUp(true)
                            setTimeout(() => {
                              setBackingUp(false)
                              setBackupSuccess(true)
                            }, 2000)
                          }} disabled={backingUp}
                            className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2 disabled:opacity-70">
                            {backingUp ? (
                              <><i className="fas fa-spinner fa-spin text-sm" /> Backing up...</>
                            ) : (
                              <><i className="fas fa-database text-sm" /> Proceed Backup</>
                            )}
                          </button>
                        </div>
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
                <button className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                  <i className="fas fa-download text-xs" /> Export Report
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">Overall Performance by Cohort</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Junior High School", pct: 68, color: "bg-blue-500" },
                        { label: "Senior High School", pct: 82, color: "bg-purple-500" }
                      ].map((c) => (
                        <div key={c.label}>
                          <div className="flex justify-between text-sm mb-1"><span>{c.label}</span><span className="font-medium">{c.pct}%</span></div>
                          <div className="progress-bar"><div className={`progress-fill ${c.color}`} style={{ width: `${c.pct}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">System-wide Completion Rate</h3>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="56.5" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">70%</span>
                        <span className="text-[10px] text-gray-400">Complete</span>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-3">847 out of 1,210 total assignments completed</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold bg-navy-500 text-white px-4 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                    <i className="fas fa-trophy text-amber-500 text-sm" /> JHS Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {[
                      { rank: 1, name: "Juan Dela Cruz", score: "89%", color: "bg-yellow-400" },
                      { rank: 2, name: "Ana Gomez", score: "76%", color: "bg-gray-400" },
                      { rank: 3, name: "Carlos Tan", score: "71%", color: "bg-amber-700" },
                      { rank: 4, name: "Maria Flores", score: "68%", color: "bg-gray-300" },
                      { rank: 5, name: "Pedro Reyes", score: "62%", color: "bg-gray-300" }
                    ].map((s) => (
                      <div key={s.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                        <span className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center text-xs font-bold text-white`}>{s.rank}</span>
                        <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                        <span className="text-sm font-semibold text-green-600">{s.score}</span>
                      </div>
                    ))}
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
                    {[
                      { rank: 1, name: "Maria Santos", score: "92%", color: "bg-yellow-400" },
                      { rank: 2, name: "Kevin Torres", score: "85%", color: "bg-gray-400" },
                      { rank: 3, name: "Nina Perez", score: "79%", color: "bg-amber-700" },
                      { rank: 4, name: "Jose Lopez", score: "74%", color: "bg-gray-300" },
                      { rank: 5, name: "Rosa Mendoza", score: "67%", color: "bg-gray-300" }
                    ].map((s) => (
                      <div key={s.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                        <span className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center text-xs font-bold text-white`}>{s.rank}</span>
                        <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                        <span className="text-sm font-semibold text-green-600">{s.score}</span>
                      </div>
                    ))}
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
                    {[
                      { label: "This Year", value: "1,284" },
                      { label: "2025", value: "1,042" },
                      { label: "2024", value: "856" },
                      { label: "2023", value: "712" }
                    ].map((e) => (
                      <div key={e.label} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{e.label}</span>
                        <span className="font-bold text-gray-800">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    {[
                      { icon: "fa-check-circle", color: "bg-green-100 text-green-600", value: "847", label: "Assignments Completed" },
                      { icon: "fa-users", color: "bg-blue-100 text-blue-600", value: "142", label: "Active Teachers" },
                      { icon: "fa-layer-group", color: "bg-amber-100 text-amber-600", value: "24", label: "Active Cohorts" }
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
                      {[
                        { year: "2023", count: 712, pct: 55, color: "bg-blue-500" },
                        { year: "2024", count: 856, pct: 67, color: "bg-indigo-500" },
                        { year: "2025", count: 1042, pct: 81, color: "bg-purple-500" },
                        { year: "2026", count: 1284, pct: 100, color: "bg-navy-500" }
                      ].map((e) => (
                        <div key={e.year} className="flex flex-col items-center gap-2 flex-1">
                          <span className="text-xs font-semibold text-gray-500">{e.count}</span>
                          <div className="w-full rounded-lg bg-gray-100 flex items-end justify-center relative" style={{ height: "160px" }}>
                            <div className={`w-full rounded-lg ${e.color} transition-all duration-700 absolute bottom-0`}
                              style={{ height: `${e.pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{e.year}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 text-center text-xs text-gray-400">Total enrollment per year</div>
                  </div>
                </div>
              )}

              {/* JHS Leaderboard Modal */}
              {(() => {
                const perPage = 10
                const totalJhsPages = Math.ceil(jhsAllData.length / perPage)
                const startJhs = (jhsPage - 1) * perPage
                const paginatedJhs = jhsAllData.slice(startJhs, startJhs + perPage)
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
                              {["Rank", "Name", "Section", "Overall Score", "Status"].map((h) => (
                                <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedJhs.map((s) => (
                              <tr key={s.rank} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-3">
                                  <span className="w-7 h-7 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white">{s.rank}</span>
                                </td>
                                <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.section}</td>
                                <td className="px-5 py-3"><span className="text-sm font-semibold text-green-600">{s.score}</span></td>
                                <td className="px-5 py-3"><span className={`text-xs font-medium ${s.statusColor} px-2 py-0.5 rounded`}>{s.status}</span></td>
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
                const totalShsPages = Math.ceil(shsAllData.length / perPage)
                const startShs = (shsPage - 1) * perPage
                const paginatedShs = shsAllData.slice(startShs, startShs + perPage)
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
                              {["Rank", "Name", "Section", "Overall Score", "Status"].map((h) => (
                                <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedShs.map((s) => (
                              <tr key={s.rank} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-3">
                                  <span className="w-7 h-7 rounded-full bg-navy-500 flex items-center justify-center text-xs font-bold text-white">{s.rank}</span>
                                </td>
                                <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{s.section}</td>
                                <td className="px-5 py-3"><span className="text-sm font-semibold text-green-600">{s.score}</span></td>
                                <td className="px-5 py-3"><span className={`text-xs font-medium ${s.statusColor} px-2 py-0.5 rounded`}>{s.status}</span></td>
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
                          {hasEvents && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-navy-500" />}
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
                            {items.map((a, i) => (
                              <div key={i} className="p-4 rounded-xl border border-amber-200 bg-amber-50 transition hover:shadow-sm">
                                <div className="flex items-start gap-3">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700">{a}</p>
                                  </div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setCalModalOpen(false); setCalInput("") }}>
                  <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-bullhorn text-navy-600 text-2xl" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">Add Announcement</h3>
                      <p className="text-sm text-gray-500 mt-1">{["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} {calSelected}, {calYear}</p>
                    </div>
                    <textarea value={calInput} onChange={(e) => setCalInput(e.target.value)} rows={3} placeholder="Type your announcement here..."
                      className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setCalModalOpen(false); setCalInput("") }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={() => {
                        if (!calInput.trim()) return
                        const key = `${calYear}-${calMonth}-${calSelected}`
                        setAnnouncements(prev => ({ ...prev, [key]: [...(prev[key] ?? []), calInput.trim()] }))
                        setCalInput("")
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

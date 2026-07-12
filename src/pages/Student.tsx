import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"
import ChatWidget from "../components/ChatWidget"
import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import type { NavItem } from "../types"

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "th-large" },
  { id: "modules", label: "My Modules", icon: "book-open" },
  { id: "finish-modules", label: "Finish Modules", icon: "check-double" },
  { id: "assignments", label: "Assignments", icon: "tasks" },
  { id: "progress", label: "Progress", icon: "chart-line" },
  { id: "calendar", label: "Calendar", icon: "calendar-alt" },
  { id: "profile", label: "Profile", icon: "user-circle" }
]

export default function Student() {
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { logout, profile } = useAuth()
  const [activePage, setActivePage] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deadlinesExpanded, setDeadlinesExpanded] = useState(false)
  const [progressExpanded, setProgressExpanded] = useState(false)
  const [badgesExpanded, setBadgesExpanded] = useState(false)
  const [moduleModal, setModuleModal] = useState<{ title: string; type: "start" | "continue" | "finished" } | null>(null)
  const [language, setLanguage] = useState<"en" | "tl">("en")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [submissionOpen, setSubmissionOpen] = useState<string | null>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set(["sci-lab-report"]))
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [submissionNote, setSubmissionNote] = useState("")

  const t = (text: string): string => {
    if (language !== "tl") return text
    const map: Record<string, string> = {
      "Welcome back, Maria!": "Maligayang pagbabalik, Maria!",
      "Continue your learning journey today": "Ipagpatuloy ang iyong paglalakbay sa pag-aaral ngayon",
      "Overall Progress Tracker": "Pangkalahatang Tagasubaybay ng Pag-unlad",
      "Complete": "Tapos",
      "Completed Modules": "Mga Natapos na Modyul",
      "Remaining Modules": "Mga Natitirang Modyul",
      "On Track": "Nasa Tamang Landas",
      "Estimated completion: October 2026": "Tinatayang pagkumpleto: Oktubre 2026",
      "My Active Modules": "Aktibo Kong Modyul",
      "Current:": "Kasalukuyang:",
      "Continue Lesson": "Ipagpatuloy ang Aralin",
      "Upcoming Deadlines": "Mga Paparating na Deadline",
      "View All Deadlines": "Tingnan Lahat ng Deadline",
      "Show Less": "Ipakita ang Mas Kaunti",
      "My Modules": "Aking Modyul",
      "Finish": "Tapos",
      "Start": "Simulan",
      "Finish Modules": "Tapos na Modyul",
      "Unlock Activities, Tasks, Quizzes, and Assignments by completing each module.": "I-unlock ang mga Aktibidad, Gawain, Pagsusulit, at Takdang-aralin sa pamamagitan ng pagkumpleto ng bawat modyul.",
      "Unlocked": "Naka-unlock",
      "Complete this module to unlock": "Kumpletuhin ang modyul na ito para ma-unlock",
      "Activities": "Mga Aktibidad",
      "Task": "Gawain",
      "Quiz": "Pagsusulit",
      "Assignments": "Takdang-aralin",
      "My Progress": "Aking Pag-unlad",
      "Your learning completion status": "Katayuan ng iyong pagkumpleto ng pag-aaral",
      "Modules Completed": "Mga Modyul na Natapos",
      "Estimated Completion": "Tinatayang Pagkumpleto",
      "Study Streak": "Araw-araw na Pag-aaral",
      "days": "araw",
      "Overall Progress": "Pangkalahatang Pag-unlad",
      "Calendar": "Kalendaryo",
      "Select a date": "Pumili ng petsa",
      "No events scheduled for this day.": "Walang naka-iskedyul na kaganapan sa araw na ito.",
      "No events scheduled": "Walang naka-iskedyul na kaganapan",
      "Click a date with a dot to view events": "Pindutin ang petsa na may tuldok upang makita ang mga kaganapan",
      "event": "kaganapan",
      "events": "mga kaganapan",
      "My Profile": "Aking Profile",
      "Student Information": "Impormasyon ng Mag-aaral",
      "Full Name": "Buong Pangalan",
      "Email Address": "Email Address",
      "LRN": "LRN",
      "Grade Level": "Antas ng Baitang",
      "Section": "Seksyon",
      "Enrollment Date": "Petsa ng Pag-enroll",
      "Contact Information": "Impormasyon sa Pakikipag-ugnayan",
      "Phone": "Telepono",
      "Address": "Tirahan",
      "Emergency Contact": "Emergency na Kontak",
      "Academic Performance": "Akademikong Pagganap",
      "GPA": "GPA",
      "Honors": "Mga Karangalan",
      "Edit Profile": "I-edit ang Profile",
      "Save Changes": "I-save ang mga Pagbabago",
      "Cancel": "Kanselahin",
      "Settings": "Mga Setting",
      "Notifications": "Mga Abiso",
      "Email notifications for new assignments": "Mga abiso sa email para sa mga bagong takdang-aralin",
      "Deadline reminders": "Mga paalala ng deadline",
      "Progress report updates": "Mga update sa ulat ng pag-unlad",
      "Account": "Account",
      "Change Password": "Baguhin ang Password",
      "Languages": "Mga Wika",
      "Tagalog": "Tagalog",
      "English": "English",
      "Design": "Disenyo",
      "Dark Mode": "Dark Mode",
      "Logout": "Mag-logout",
      "Maria Santos": "Maria Santos",
      "Student Portal": "Portal ng Mag-aaral",
      "Dashboard": "Dashboard",
      "Profile": "Profile",
      "Progress": "Pag-unlad",
      "Password": "Password",
      "Current: Effective Writing Techniques": "Kasalukuyang: Epektibong Teknik sa Pagsulat",
      "Current: Environmental Science Basics": "Kasalukuyang: Batayan ng Agham Pangkalikasan",
      "Current: Problem Solving Strategies": "Kasalukuyang: Estratehiya sa Paglutas ng Problema",
      "Current: Financial Literacy Fundamentals": "Kasalukuyang: Batayan ng Financial Literacy",
      "12 lessons • 100% complete": "12 aralin • 100% tapos",
      "8 lessons • 100% complete": "8 aralin • 100% tapos",
      "10 lessons • 60% complete": "10 aralin • 60% tapos",
      "6 lessons • 30% complete": "6 aralin • 30% tapos",
      "14 lessons • 0% complete": "14 aralin • 0% tapos",
      "9 lessons • 0% complete": "9 aralin • 0% tapos",
      "10 lessons • 0% complete": "10 aralin • 0% tapos",
      "8 lessons • 0% complete": "8 aralin • 0% tapos",
      "12 lessons • 0% complete": "12 aralin • 0% tapos",
      "No events": "Walang kaganapan",
      "Assignment": "Takdang-aralin",
      "Meeting": "Pagpupulong",
      "Event": "Kaganapan",
      "Milestone": "Milyahe",
      "Module Accomplishments": "Mga Natapos na Modyul",
      "Completed Modules (21)": "Mga Natapos na Modyul (21)",
      "Unlock Your": "Buksan ang Iyong",
      "Learning Potential": "Potensyal sa Pag-aaral",
      "Your journey to knowledge starts here. Track progress, master courses, and achieve more than you thought possible.": "Ang iyong paglalakbay sa kaalaman ay nagsisimula dito. Subaybayan ang pag-unlad, master ang mga kurso, at makamit ang higit pa sa iyong inaakala.",
      "Learn": "Matuto",
      "At your pace": "Sa iyong bilis",
      "Track": "Subaybayan",
      "Your progress": "Iyong pag-unlad",
      "Achieve": "Makamit",
      "Your goals": "Iyong mga layunin",
      "Start Module": "Simulan ang Modyul",
      "Done": "Tapos",
      "Continue": "Magpatuloy",
      "Select a subject to view and submit your assignments": "Pumili ng asignatura upang tingnan at isumite ang iyong mga takdang-aralin",
      "assignments": "takdang-aralin",
      "points": "puntos",
      "Submit Assignment": "Isumite ang Takdang-aralin",
      "View Submission": "Tingnan ang Isinumite",
      "Overdue": "Nakalipas na",
      "Pending": "Nakabinbin",
      "Submitted": "Na-isumite",
      "Attach file": "Mag-attach ng file",
      "Add notes": "Magdagdag ng tala",
      "Submit": "Isumite",
      "No file chosen": "Walang napiling file",
      "Choose File": "Pumili ng File",
      "File attached:": "Nakakabit na file:",
      "Remove": "Alisin",
      "Back to subjects": "Bumalik sa mga asignatura",
      "Yes": "Oo",
      "No": "Hindi"
    }
    return map[text] ?? text
  }

  const goTo = (page: string) => {
    setActivePage(page)
    if (page === "profile") setActivePage("profile")
  }

  const subjects = [
    { id: "comm", name: "Communication Skills", teacher: "Ms. Reyes", color: "bg-blue-500", icon: "fa-comments" },
    { id: "sci", name: "Scientific Literacy", teacher: "Dr. Cruz", color: "bg-amber-500", icon: "fa-flask" },
    { id: "math", name: "Mathematical Reasoning", teacher: "Mr. Santos", color: "bg-purple-500", icon: "fa-calculator" },
    { id: "english", name: "English Language", teacher: "Ms. Garcia", color: "bg-teal-500", icon: "fa-globe" },
    { id: "humanities", name: "Humanities & Social Sciences", teacher: "Dr. Villanueva", color: "bg-indigo-500", icon: "fa-book" },
    { id: "life", name: "Life & Career Skills", teacher: "Mr. Fernandez", color: "bg-rose-500", icon: "fa-briefcase" },
    { id: "digital", name: "Digital Literacy", teacher: "Ms. Torres", color: "bg-orange-500", icon: "fa-laptop-code" },
    { id: "tle", name: "TLE", teacher: "Mr. Lim", color: "bg-emerald-500", icon: "fa-tools" }
  ]

  const assignmentsBySubject: Record<string, { id: string; title: string; description: string; dueDate: string; points: number; icon: string; status: "pending" | "overdue" }[]> = {
    comm: [
      { id: "comm-quiz", title: "Communication Skills Quiz 3", description: "Answer the questions based on effective communication techniques discussed in Module 3.", dueDate: "May 22, 2026", points: 30, icon: "fa-pen-alt", status: "overdue" },
      { id: "comm-essay", title: "Persuasive Speech Outline", description: "Create a 3-minute persuasive speech outline on a topic of your choice.", dueDate: "May 30, 2026", points: 25, icon: "fa-microphone", status: "pending" },
      { id: "comm-vlog", title: "Vlog Presentation", description: "Record a 2-minute vlog introducing yourself using formal and informal language.", dueDate: "June 10, 2026", points: 40, icon: "fa-video", status: "pending" }
    ],
    sci: [
      { id: "sci-portfolio", title: "Scientific Literacy Portfolio", description: "Compile your lab reports and reflections from the first quarter.", dueDate: "May 25, 2026", points: 100, icon: "fa-folder-open", status: "pending" },
      { id: "sci-lab-report", title: "Scientific Literacy Lab Report", description: "Submit your laboratory report on the ecosystem experiment.", dueDate: "May 18, 2026", points: 50, icon: "fa-check", status: "overdue" }
    ],
    math: [
      { id: "math-assessment", title: "Math Module 2 Assessment", description: "Complete the assessment covering algebra and geometry concepts from Module 2.", dueDate: "May 28, 2026", points: 60, icon: "fa-calculator", status: "pending" },
      { id: "math-problem-set", title: "Problem Set 4: Fractions & Decimals", description: "Solve 10 word problems involving fractions and decimals.", dueDate: "June 3, 2026", points: 35, icon: "fa-divide", status: "pending" },
      { id: "math-project", title: "Statistics Survey Project", description: "Conduct a small survey and present your findings using charts and graphs.", dueDate: "June 15, 2026", points: 80, icon: "fa-chart-bar", status: "pending" }
    ],
    english: [
      { id: "eng-essay", title: "English Literature Essay", description: "Write a 500-word essay analyzing the theme of resilience in the story 'The Last Leaf'.", dueDate: "June 2, 2026", points: 50, icon: "fa-book", status: "pending" },
      { id: "eng-grammar", title: "Grammar Practice Worksheet", description: "Complete the subject-verb agreement and tenses worksheet.", dueDate: "June 8, 2026", points: 20, icon: "fa-spell-check", status: "pending" }
    ],
    humanities: [
      { id: "hum-report", title: "Philippine History Reflection", description: "Write a reflection paper on the significance of the 1986 EDSA People Power Revolution.", dueDate: "June 5, 2026", points: 40, icon: "fa-landmark", status: "pending" },
      { id: "hum-map", title: "Cultural Map of the Philippines", description: "Create a visual map highlighting the cultural diversity of at least 5 regions.", dueDate: "June 12, 2026", points: 45, icon: "fa-map", status: "pending" }
    ],
    life: [
      { id: "life-budget", title: "Personal Budget Plan", description: "Create a monthly budget plan for a minimum-wage earner in Metro Manila.", dueDate: "June 6, 2026", points: 35, icon: "fa-wallet", status: "pending" },
      { id: "life-resume", title: "Resume & Cover Letter", description: "Draft a professional resume and cover letter for a job application.", dueDate: "June 14, 2026", points: 30, icon: "fa-file-alt", status: "pending" }
    ],
    digital: [
      { id: "digi-spreadsheet", title: "Excel Spreadsheet Exercise", description: "Create a spreadsheet with formulas, charts, and data sorting.", dueDate: "June 7, 2026", points: 40, icon: "fa-table", status: "pending" },
      { id: "digi-presentation", title: "Multimedia Presentation", description: "Make a 5-slide presentation about internet safety and digital citizenship.", dueDate: "June 13, 2026", points: 35, icon: "fa-sliders-h", status: "pending" }
    ],
    tle: [
      { id: "tle-cook", title: "Cooking Video Demonstration", description: "Record a 5-minute video demonstrating a native Filipino dish.", dueDate: "June 9, 2026", points: 50, icon: "fa-utensils", status: "pending" },
      { id: "tle-dress", title: "Drafting Pattern Project", description: "Draft a basic pattern for a button-down shirt.", dueDate: "June 16, 2026", points: 45, icon: "fa-tshirt", status: "pending" }
    ]
  }

  const isDark = theme === "dark"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar title="ALS Learning" subtitle={t("Student Portal")} items={navItems} activePage={activePage} onNavigate={goTo} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          userName={t(profile?.displayName || "Student")}
          initials={profile?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S"}
          userEmail={profile?.email || ""}
          notificationCount={3}
          onLogout={() => setLogoutOpen(true)}
          onProfile={() => goTo("profile")}
          onMenuToggle={() => setMobileMenuOpen(p => !p)}
        />

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Dashboard */}
          {activePage === "dashboard" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{t(`Welcome back, ${profile?.displayName?.split(" ")[0] || "Student"}!`)}</h2>
                <p className="text-gray-500 mt-1">{t("Continue your learning journey today")}</p>
              </div>

              <div className="stat-card mb-5">
                <p className="text-gray-500 text-sm font-medium mb-5">{t("Overall Progress Tracker")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" strokeDasharray="263.89" strokeDashoffset="126.67" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-800 -mb-0.5">52%</span>
                        <span className="text-xs font-medium text-gray-400">{t("Complete")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-medium text-gray-700">{t("Completed Modules")}</span>
                        <span className="text-base text-gray-500">21/40</span>
                      </div>
                      <div className="progress-bar h-2.5">
                        <div className="progress-fill bg-green-500" style={{ width: "52.5%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-medium text-gray-700">{t("Remaining Modules")}</span>
                        <span className="text-base text-gray-500">19/40</span>
                      </div>
                      <div className="progress-bar h-2.5">
                        <div className="progress-fill bg-green-300" style={{ width: "47.5%" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm pt-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium text-green-600">{t("On Track")}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400">{t("Estimated completion: October 2026")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <button onClick={() => setProgressExpanded((p) => !p)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                    <i className={`fas fa-chevron-down text-gray-500 text-sm transition-transform duration-300 ${progressExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {progressExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 animate-fade">
                    <p className="text-sm font-semibold text-gray-700 mb-3">{t("Completed Modules (21)")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: "Communication Skills I", icon: "fa-comments", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Effective Writing Techniques", badge: "⭐", badgeColor: "bg-yellow-100 text-yellow-700" },
                        { name: "Communication Skills II", icon: "fa-comments", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Public Speaking", badge: "🏆", badgeColor: "bg-amber-100 text-amber-700" },
                        { name: "Scientific Literacy I", icon: "fa-flask", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Environmental Science", badge: "🔥", badgeColor: "bg-orange-100 text-orange-700" },
                        { name: "Scientific Literacy II", icon: "fa-flask", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Biology Basics", badge: "💎", badgeColor: "bg-blue-100 text-blue-700" },
                        { name: "Mathematical Reasoning I", icon: "fa-calculator", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Algebra Fundamentals", badge: "👑", badgeColor: "bg-purple-100 text-purple-700" },
                        { name: "Mathematical Reasoning II", icon: "fa-calculator", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Geometry", badge: "🎯", badgeColor: "bg-red-100 text-red-700" },
                        { name: "Life & Career Skills I", icon: "fa-briefcase", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Financial Literacy", badge: "🚀", badgeColor: "bg-indigo-100 text-indigo-700" },
                        { name: "Life & Career Skills II", icon: "fa-briefcase", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Entrepreneurship", badge: "🎖️", badgeColor: "bg-teal-100 text-teal-700" },
                        { name: "English Language I", icon: "fa-globe", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Grammar & Composition", badge: "🏅", badgeColor: "bg-green-100 text-green-700" },
                        { name: "English Language II", icon: "fa-globe", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Literature", badge: "✨", badgeColor: "bg-pink-100 text-pink-700" },
                        { name: "Digital Literacy I", icon: "fa-laptop-code", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Computer Fundamentals", badge: "⚡", badgeColor: "bg-yellow-100 text-yellow-700" },
                        { name: "Digital Literacy II", icon: "fa-laptop-code", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Internet Safety", badge: "🛡️", badgeColor: "bg-cyan-100 text-cyan-700" },
                        { name: "Physical Education I", icon: "fa-running", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Health & Wellness", badge: "💪", badgeColor: "bg-lime-100 text-lime-700" },
                        { name: "Physical Education II", icon: "fa-running", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Team Sports", badge: "🏀", badgeColor: "bg-orange-100 text-orange-700" },
                        { name: "Social Studies I", icon: "fa-landmark", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Philippine History", badge: "📜", badgeColor: "bg-amber-100 text-amber-700" },
                        { name: "Social Studies II", icon: "fa-landmark", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "World Geography", badge: "🌍", badgeColor: "bg-emerald-100 text-emerald-700" },
                        { name: "Values Education I", icon: "fa-hand-holding-heart", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Good Citizenship", badge: "🤝", badgeColor: "bg-rose-100 text-rose-700" },
                        { name: "Values Education II", icon: "fa-hand-holding-heart", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Ethics & Morality", badge: "🌈", badgeColor: "bg-violet-100 text-violet-700" },
                        { name: "Arts & Design I", icon: "fa-palette", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Visual Arts", badge: "🎨", badgeColor: "bg-fuchsia-100 text-fuchsia-700" },
                        { name: "Arts & Design II", icon: "fa-palette", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Music Appreciation", badge: "🎵", badgeColor: "bg-sky-100 text-sky-700" },
                        { name: "Technology & Livelihood", icon: "fa-tools", iconBg: "bg-green-100", iconColor: "text-green-600", desc: "Basic Carpentry", badge: "🔧", badgeColor: "bg-stone-100 text-stone-700" }
                      ].map((m) => (
                        <div key={m.name} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full ${m.iconBg} flex items-center justify-center ${m.iconColor} mb-3`}>
                              <i className={`fas ${m.icon} text-lg`} />
                            </div>
                            <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
                          </div>
                          <span className={`text-3xl font-bold px-3 py-2 rounded-lg ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">{t("My Active Modules")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {[
                      { title: "Communication Skills", pct: 75, color: "bg-primary", labelColor: "text-primary", bg: "bg-blue-100", desc: "Effective Writing Techniques" },
                      { title: "Scientific Literacy", pct: 45, color: "bg-amber-500", labelColor: "text-amber-600", bg: "bg-amber-100", desc: "Environmental Science Basics" },
                      { title: "Mathematical Reasoning", pct: 60, color: "bg-purple-500", labelColor: "text-purple-600", bg: "bg-purple-100", desc: "Problem Solving Strategies" },
                      { title: "Life & Career Skills", pct: 30, color: "bg-rose-500", labelColor: "text-rose-600", bg: "bg-rose-100", desc: "Financial Literacy Fundamentals" }
                    ].map((m) => (
                      <div key={m.title} className="module-card p-5 flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-800 text-lg">{m.title}</h4>
                                <span className={`text-sm font-medium ${m.labelColor} ${m.bg} px-2.5 py-0.5 rounded`}>{m.pct}%</span>
                              </div>
                              <p className="text-base text-gray-400">{t("Current:")} {m.desc}</p>
                            </div>
                          </div>
                          <div className="progress-bar mb-4 h-2.5">
                            <div className={`progress-fill ${m.color}`} style={{ width: `${m.pct}%` }} />
                          </div>
                        </div>
                        <button className="w-full py-2.5 bg-navy-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-navy-500 transition">
                          {t("Continue Lesson")} <i className="fas fa-arrow-right text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">{t("Upcoming Deadlines")}</h3>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col" style={{ flex: deadlinesExpanded ? "1" : undefined }}>
                    <div className="space-y-0" style={{ flex: deadlinesExpanded ? "1" : undefined }}>
                      {[
                        { title: "Communication Skills Quiz 3", date: "May 22, 2026", tag: "Quiz", color: "bg-blue-100 text-blue-600", icon: "fa-pen-alt" },
                        { title: "Scientific Literacy Portfolio", date: "May 25, 2026", tag: "Portfolio", color: "bg-amber-100 text-amber-600", icon: "fa-folder-open" },
                        { title: "Math Module 2 Assessment", date: "May 28, 2026", tag: "Assessment", color: "bg-purple-100 text-purple-600", icon: "fa-calculator" }
                      ].map((d) => (
                        <div key={d.title} className="deadline-item">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg ${d.color} flex items-center justify-center flex-shrink-0`}>
                              <i className={`fas ${d.icon} text-sm`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{d.date}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">{d.tag}</span>
                        </div>
                      ))}
                      {deadlinesExpanded && (
                        <>
                          {[
                            { title: "English Literature Essay", date: "June 2, 2026", tag: "Essay", color: "bg-pink-100 text-pink-600", icon: "fa-book" },
                            { title: "Scientific Literacy Lab Report", date: "June 5, 2026", tag: "Lab", color: "bg-teal-100 text-teal-600", icon: "fa-flask" },
                            { title: "Group Project Presentation", date: "June 10, 2026", tag: "Group", color: "bg-orange-100 text-orange-600", icon: "fa-users" },
                            { title: "Life & Career Skills Final Paper", date: "June 15, 2026", tag: "Final", color: "bg-red-100 text-red-600", icon: "fa-file-alt" },
                            { title: "Mathematical Reasoning Final Exam", date: "June 20, 2026", tag: "Exam", color: "bg-indigo-100 text-indigo-600", icon: "fa-chalkboard-teacher" }
                          ].map((d) => (
                            <div key={d.title} className="deadline-item">
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg ${d.color} flex items-center justify-center flex-shrink-0`}>
                                  <i className={`fas ${d.icon} text-sm`} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{d.date}</p>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">{d.tag}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button onClick={() => setDeadlinesExpanded((p) => !p)}
                        className="w-full text-sm font-medium text-primary hover:text-primary-700 flex items-center justify-center gap-1">
                        <span>{deadlinesExpanded ? t("Show Less") : t("View All Deadlines")}</span>
                        <i className={`fas fa-arrow-${deadlinesExpanded ? "up" : "right"} text-xs`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Modules */}
          {activePage === "modules" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t("My Modules")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("Access your learning materials and lessons")}</p>
              <ModuleModal data={moduleModal} onClose={() => setModuleModal(null)} t={t} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: "Mathematical Reasoning", icon: "fa-calculator", color: "bg-purple-100 text-purple-600", lessons: t("10 lessons • 60% complete"), pct: 60, bar: "bg-purple-500", btn: t("Continue Lesson"), status: "continue" as const },
                  { title: "Life & Career Skills", icon: "fa-briefcase", color: "bg-rose-100 text-rose-600", lessons: t("6 lessons • 30% complete"), pct: 30, bar: "bg-rose-500", btn: t("Continue Lesson"), status: "continue" as const },
                  { title: "English Language", icon: "fa-globe", color: "bg-teal-100 text-teal-600", lessons: t("14 lessons • 0% complete"), pct: 0, bar: "bg-gray-300", btn: t("Start"), status: "start" as const },
                  { title: "Digital Literacy", icon: "fa-laptop-code", color: "bg-orange-100 text-orange-600", lessons: t("9 lessons • 0% complete"), pct: 0, bar: "bg-gray-300", btn: t("Start"), status: "start" as const },
                  { title: "Humanities & Social Sciences", icon: "fa-book", color: "bg-indigo-100 text-indigo-600", lessons: t("10 lessons • 0% complete"), pct: 0, bar: "bg-gray-300", btn: t("Start"), status: "start" as const },
                  { title: "Physical Education & Health", icon: "fa-dumbbell", color: "bg-cyan-100 text-cyan-600", lessons: t("8 lessons • 0% complete"), pct: 0, bar: "bg-gray-300", btn: t("Start"), status: "start" as const },
                  { title: "Technology & Livelihood Education", icon: "fa-tools", color: "bg-emerald-100 text-emerald-600", lessons: t("12 lessons • 0% complete"), pct: 0, bar: "bg-gray-300", btn: t("Start"), status: "start" as const },
                  { title: "Communication Skills", icon: "fa-comments", color: "bg-blue-100 text-blue-600", lessons: t("12 lessons • 100% complete"), pct: 100, bar: "bg-green-500", btn: t("Finish"), status: "finished" as const },
                  { title: "Scientific Literacy", icon: "fa-flask", color: "bg-amber-100 text-amber-600", lessons: t("8 lessons • 100% complete"), pct: 100, bar: "bg-green-500", btn: t("Finish"), status: "finished" as const }
                ].map((m) => (
                  <ModuleCard key={m.title} module={m} onClick={(type) => setModuleModal({ title: m.title, type })} />
                ))}
              </div>
            </div>
          )}

          {/* Finish Modules */}
          {activePage === "finish-modules" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{t("Finish Modules")}</h2>
              <p className="text-gray-500 text-sm mb-6">{t("Unlock Activities, Tasks, Quizzes, and Assignments by completing each module.")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { title: "Communication Skills", icon: "fa-comments", color: "bg-blue-100 text-blue-600", status: "finished" as const },
                  { title: "Scientific Literacy", icon: "fa-flask", color: "bg-amber-100 text-amber-600", status: "finished" as const },
                  { title: "Mathematical Reasoning", icon: "fa-calculator", color: "bg-purple-100 text-purple-600", status: "continue" as const },
                  { title: "Life & Career Skills", icon: "fa-briefcase", color: "bg-rose-100 text-rose-600", status: "continue" as const },
                  { title: "English Language", icon: "fa-globe", color: "bg-teal-100 text-teal-600", status: "start" as const },
                  { title: "Digital Literacy", icon: "fa-laptop-code", color: "bg-orange-100 text-orange-600", status: "start" as const },
                  { title: "Humanities & Social Sciences", icon: "fa-book", color: "bg-indigo-100 text-indigo-600", status: "start" as const },
                  { title: "Physical Education & Health", icon: "fa-dumbbell", color: "bg-cyan-100 text-cyan-600", status: "start" as const },
                  { title: "Technology & Livelihood Education", icon: "fa-tools", color: "bg-emerald-100 text-emerald-600", status: "start" as const }
                ].map((m) => {
                  const unlocked = m.status === "finished"
                  return (
                    <div key={m.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center`}>
                          <i className={`fas ${m.icon} text-xl`} />
                        </div>
                        {!unlocked && <i className="fas fa-lock text-gray-300 text-lg" />}
                        {unlocked && <i className="fas fa-unlock text-green-500 text-lg" />}
                      </div>
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">{m.title}</h3>
                      <p className={`text-xs font-medium mb-4 ${unlocked ? "text-green-600" : "text-gray-400"}`}>
                        {unlocked ? t("Unlocked") : t("Complete this module to unlock")}
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: t("Activities"), icon: "fa-tasks" },
                          { label: t("Task"), icon: "fa-clipboard-list" },
                          { label: t("Quiz"), icon: "fa-pen-alt" },
                          { label: t("Assignments"), icon: "fa-file-alt" }
                        ].map((item) => (
                          <div key={item.label}
                            className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${unlocked ? "bg-gray-50 hover:bg-gray-100 cursor-pointer" : "bg-gray-100 opacity-50 cursor-not-allowed"}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${unlocked ? "bg-navy-100 text-navy-600" : "bg-gray-200 text-gray-400"}`}>
                              <i className={`fas ${item.icon} text-xs`} />
                            </div>
                            <span className={`font-medium ${unlocked ? "text-gray-700" : "text-gray-400"}`}>{item.label}</span>
                            {!unlocked && <i className="fas fa-lock text-gray-300 text-xs ml-auto" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Assignments */}
          {activePage === "assignments" && (
            <div className="flex-1 flex flex-col min-h-0">
              {(() => {
                if (!selectedSubject) {
                  return (
                    <>
                      <h2 className="text-2xl font-bold text-gray-800">{t("Assignments")}</h2>
                      <p className="text-gray-500 mt-1 mb-6">{t("Select a subject to view and submit your assignments")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {subjects.map((subj) => {
                          const list = assignmentsBySubject[subj.id] ?? []
                          const done = list.filter(a => submittedIds.has(a.id)).length
                          return (
                            <div key={subj.id}
                              onClick={() => setSelectedSubject(subj.id)}
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition group">
                              <div className={`h-14 ${subj.color} flex items-center px-5`}>
                                <i className={`fas ${subj.icon} text-white text-xl`} />
                              </div>
                              <div className="p-4">
                                <h3 className="font-bold text-gray-800 text-sm group-hover:text-navy-600 transition">{subj.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{subj.teacher}</p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                  <span className="text-xs text-gray-500">{list.length} {t("assignments")}</span>
                                  {list.length > 0 && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${done === list.length ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                      {done}/{list.length} {t("done")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                }

                const current = subjects.find(s => s.id === selectedSubject)
                const list = assignmentsBySubject[selectedSubject] ?? []
                return (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setSelectedSubject(null)}
                        className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition">
                        <i className="fas fa-arrow-left text-sm" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">{current?.name}</h2>
                        <p className="text-sm text-gray-400">{current?.teacher}</p>
                      </div>
                    </div>
                    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                      {list.map((a) => {
                        const isSubmitted = submittedIds.has(a.id)
                        return (
                          <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-5">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isSubmitted ? "bg-green-100 text-green-600" : "bg-navy-100 text-navy-600"}`}>
                                    <i className={`fas ${isSubmitted ? "fa-check-circle" : a.icon}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800">{a.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                      <span><i className="far fa-calendar mr-1" />{a.dueDate}</span>
                                      <span><i className="far fa-star mr-1" />{a.points} {t("points")}</span>
                                      {isSubmitted && (
                                        <span className="text-green-600 font-medium">
                                          <i className="fas fa-check-circle mr-1" />{t("Submitted")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded ${isSubmitted ? "bg-green-100 text-green-600" : a.status === "overdue" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                                  {isSubmitted ? t("Submitted") : a.status === "overdue" ? t("Overdue") : t("Pending")}
                                </span>
                                <button onClick={() => { setSubmissionOpen(a.id); setSubmissionFile(null); setSubmissionNote("") }}
                                  className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${isSubmitted ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-navy-500 text-white hover:bg-navy-600"}`}>
                                  <i className={`fas ${isSubmitted ? "fa-eye" : "fa-upload"} text-xs`} />
                                  {isSubmitted ? t("View Submission") : t("Submit Assignment")}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}

              {/* Submission Modal */}
              {submissionOpen && selectedSubject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSubmissionOpen(null)}>
                  <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4"
                    style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{t("Submit Assignment")}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {(() => {
                            const a = assignmentsBySubject[selectedSubject]?.find(x => x.id === submissionOpen)
                            return a ? `${a.title}` : ""
                          })()}
                        </p>
                      </div>
                      <button onClick={() => setSubmissionOpen(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Attach file")}</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-navy-400 transition cursor-pointer"
                          onClick={() => document.getElementById("file-input")?.click()}>
                          {submissionFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center">
                                <i className="fas fa-file text-lg" />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-700">{submissionFile.name}</p>
                                <p className="text-xs text-gray-400">{(submissionFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setSubmissionFile(null) }}
                                className="text-xs text-red-500 hover:text-red-600 ml-2">{t("Remove")}</button>
                            </div>
                          ) : (
                            <div>
                              <i className="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2" />
                              <p className="text-sm text-gray-500">{t("Choose File")}</p>
                              <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, or image files</p>
                            </div>
                          )}
                        </div>
                        <input id="file-input" type="file" className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) setSubmissionFile(e.target.files[0]) }} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Add notes")}</label>
                        <textarea value={submissionNote} onChange={(e) => setSubmissionNote(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 resize-none"
                          rows={4} placeholder={t("Add notes")} />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-400">{t("Submitted")}: {submittedIds.has(submissionOpen) ? t("Yes") : t("No")}</span>
                        <div className="flex gap-3">
                          <button onClick={() => setSubmissionOpen(null)}
                            className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">{t("Cancel")}</button>
                          <button onClick={() => {
                            setSubmittedIds(prev => new Set([...prev, submissionOpen]))
                            setSubmissionOpen(null)
                            setSubmissionFile(null)
                            setSubmissionNote("")
                          }}
                            className="px-5 py-2.5 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                            <i className="fas fa-paper-plane text-xs" /> {t("Submit")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {activePage === "progress" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t("My Progress")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("Monitor your academic performance and achievements")}</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                      <i className="fas fa-chart-simple text-lg" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{t("Overall Progress")}</h3>
                      <p className="text-sm text-gray-400">{t("Your learning completion status")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pl-4">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="90.5" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800 -mb-0.5">52%</span>
                        <span className="text-[10px] font-medium text-gray-400">{t("Complete")}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      {[
                        { icon: "fa-check-double", bg: "bg-blue-100", color: "text-blue-600", label: t("Modules Completed"), value: "21", total: "/ 40" },
                        { icon: "fa-calendar", bg: "bg-green-100", color: "text-amber-600", label: t("Estimated Completion"), value: "October 2026" },
                        { icon: "fa-fire", bg: "bg-yellow-200", color: "text-rose-600", label: t("Study Streak"), value: "5", suffix: t("days") }
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color} flex-shrink-0`}>
                            <i className={`fas ${s.icon} text-sm`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{s.label}</p>
                            <p className="text-lg font-bold text-gray-800">
                              {s.value} {s.total && <span className="text-sm font-normal text-gray-400">{s.total}</span>}
                              {s.suffix && <span className="text-sm text-gray-400"> {s.suffix}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-award text-amber-500 text-sm" /> Recent Achievement
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: "Fast Learner", desc: "Completed 5 lessons in a week", date: "Earned May 20, 2026", color: "bg-amber-500", icon: "fa-trophy", highlight: true },
                      { title: "Quiz Master", desc: "Scored 90% on Communication Skills Quiz", date: "Earned May 15, 2026", color: "bg-blue-500", icon: "fa-star", highlight: false },
                      { title: "First Steps", desc: "Completed your first module", date: "Earned Jan 10, 2026", color: "bg-green-500", icon: "fa-leaf", highlight: false }
                    ].map((a) => (
                      <div key={a.title} className={`flex items-start gap-3 p-3 rounded-lg ${a.highlight ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"}`}>
                        <div className={`w-10 h-10 rounded-full ${a.color} flex items-center justify-center text-white text-lg`}>
                          <i className={`fas ${a.icon}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                          <p className={`text-[10px] mt-1 font-medium ${a.highlight ? "text-amber-600" : "text-blue-600"}`}>{a.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <i className="fas fa-award text-amber-500 text-sm" /> Badges <span className="text-sm font-normal text-gray-400">(21 earned)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[
                    { name: "Communication Skills I", badge: "⭐", color: "bg-yellow-100" },
                    { name: "Communication Skills II", badge: "🏆", color: "bg-amber-100" },
                    { name: "Scientific Literacy I", badge: "🔥", color: "bg-orange-100" },
                    { name: "Scientific Literacy II", badge: "💎", color: "bg-blue-100" },
                    { name: "Mathematical Reasoning I", badge: "👑", color: "bg-purple-100" },
                    { name: "Mathematical Reasoning II", badge: "🎯", color: "bg-red-100" },
                    { name: "Life & Career Skills I", badge: "🚀", color: "bg-indigo-100" },
                    { name: "Life & Career Skills II", badge: "🎖️", color: "bg-teal-100" },
                    { name: "English Language I", badge: "🏅", color: "bg-green-100" },
                    { name: "English Language II", badge: "✨", color: "bg-pink-100" },
                    { name: "Digital Literacy I", badge: "⚡", color: "bg-yellow-100" },
                    { name: "Digital Literacy II", badge: "🛡️", color: "bg-cyan-100" },
                    { name: "Physical Education I", badge: "💪", color: "bg-lime-100" },
                    { name: "Physical Education II", badge: "🏀", color: "bg-orange-100" },
                    { name: "Social Studies I", badge: "📜", color: "bg-amber-100" },
                    { name: "Social Studies II", badge: "🌍", color: "bg-emerald-100" },
                    { name: "Values Education I", badge: "🤝", color: "bg-rose-100" },
                    { name: "Values Education II", badge: "🌈", color: "bg-violet-100" },
                    { name: "Arts & Design I", badge: "🎨", color: "bg-fuchsia-100" },
                    { name: "Arts & Design II", badge: "🎵", color: "bg-sky-100" },
                    { name: "Technology & Livelihood", badge: "🔧", color: "bg-stone-100" }
                  ].slice(0, badgesExpanded ? undefined : 5).map((b) => (
                    <div key={b.name} className={`flex flex-col items-center text-center p-3 rounded-xl ${b.color} border border-gray-200/50`}>
                      <span className="text-3xl mb-1">{b.badge}</span>
                      <p className="text-[10px] font-semibold text-gray-700 leading-tight">{b.name}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-4">
                  <button onClick={() => setBadgesExpanded((p) => !p)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                    <i className={`fas fa-chevron-down text-gray-500 text-sm transition-transform duration-300 ${badgesExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-trophy text-amber-500 text-sm" /> Class Leaderboard
                  </h3>
                  {[
                    { rank: 1, initials: "JD", name: "Juan Dela Cruz", section: "Section A", score: "89%", scoreColor: "text-green-600", highlight: true, rankBg: "bg-yellow-400" },
                    { rank: 2, initials: "MP", name: "Maria Perez", section: "Section A", score: "76%", scoreColor: "text-green-600", highlight: false, rankBg: "bg-gray-400" },
                    { rank: 3, initials: "MS", name: "Maria Santos", section: "Section A", score: "52%", scoreColor: "text-green-600", highlight: true, rankBg: "bg-amber-700" },
                    { rank: 4, initials: "CR", name: "Carlos Reyes", section: "Section A", score: "48%", scoreColor: "text-amber-600", highlight: false, rankBg: "bg-gray-300" },
                    { rank: 5, initials: "AG", name: "Ana Gomez", section: "Section A", score: "35%", scoreColor: "text-rose-600", highlight: false, rankBg: "bg-gray-300" }
                  ].map((s) => (
                    <div key={s.name} className={`flex items-center gap-3 p-2 rounded-lg ${s.highlight ? (s.rank === 3 ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200") : "hover:bg-gray-50"}`}>
                      <span className={`w-6 h-6 rounded-full ${s.rankBg} text-white text-xs font-bold flex items-center justify-center`}>{s.rank}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">{s.initials}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.section}</p>
                      </div>
                      <span className={`text-sm font-semibold ${s.scoreColor}`}>{s.score}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-users text-navy-500 text-sm" /> Batch Leaderboard
                  </h3>
                  {[
                    { rank: 1, initials: "JD", name: "Juan Dela Cruz", section: "Section A", score: "89%", highlight: true, rankBg: "bg-yellow-400" },
                    { rank: 2, initials: "MP", name: "Maria Perez", section: "Section A", score: "76%", highlight: false, rankBg: "bg-gray-400" },
                    { rank: 3, initials: "MS", name: "Maria Santos", section: "Section A", score: "52%", highlight: true, rankBg: "bg-amber-700" },
                    { rank: 4, initials: "CR", name: "Carlos Reyes", section: "Section B", score: "48%", highlight: false, rankBg: "bg-gray-300" },
                    { rank: 5, initials: "AG", name: "Ana Gomez", section: "Section C", score: "35%", highlight: false, rankBg: "bg-gray-300" }
                  ].map((s) => (
                    <div key={s.name} className={`flex items-center gap-3 p-2 rounded-lg ${s.highlight ? (s.rank === 3 ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200") : "hover:bg-gray-50"}`}>
                      <span className={`w-6 h-6 rounded-full ${s.rankBg} text-white text-xs font-bold flex items-center justify-center`}>{s.rank}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">{s.initials}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.section}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          {activePage === "calendar" && (
            <div className="flex-1 flex flex-col min-h-0">
              <h2 className="text-2xl font-bold text-gray-800">{t("Calendar")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("View important dates and schedule events")}</p>
              <div className="flex-1 min-h-0">
                <CalendarWidget t={t} />
              </div>
            </div>
          )}

          {/* Profile */}
          {activePage === "profile" && (
            <div className="flex-1 flex flex-col min-h-0">
              <h2 className="text-2xl font-bold text-gray-800">{t("My Profile")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("Manage your personal information and account")}</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 flex flex-col">
                  <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center flex flex-col items-center flex-1">
                    <div className="relative">
                      <img id="profile-pic-img" src="" alt="Profile" className="w-32 h-32 rounded-full bg-primary object-cover mx-auto" style={{ display: "none" }} />
                      <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-bold mx-auto" id="profile-pic-fallback">M</div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById("profile-pic-input")?.click()}>
                        <i className="fas fa-camera text-gray-500 text-xs" />
                      </div>
                    </div>
                    <button onClick={() => document.getElementById("profile-pic-input")?.click()} className="mt-3 text-xs font-medium text-navy-500 hover:text-navy-600">Change Profile Picture</button>
                    <input id="profile-pic-input" type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (ev) => { const img = document.getElementById("profile-pic-img") as HTMLImageElement; const fallback = document.getElementById("profile-pic-fallback"); if (img && ev.target?.result) { img.src = ev.target.result as string; img.style.display = ""; if (fallback) fallback.style.display = "none"; } }; reader.readAsDataURL(e.target.files[0]); } }} />
                    <h3 className="text-xl font-bold text-gray-800 mt-4">{profile?.displayName || "Student"}</h3>
                    <p className="text-sm text-gray-400 capitalize">{profile?.role || "student"}</p>
                    <div className="mt-5 pt-5 border-t border-gray-100 w-full">
                      <div className="space-y-3 w-full">
                        {[
                          { icon: "fa-envelope", text: profile?.email || "" },
                          { icon: "fa-calendar", text: "Joined September 2025" },
                          { icon: "fa-map-pin", text: profile?.gradeLevel ? `${profile.gradeLevel} - ${profile.lrn || ""}` : "Section A - Grade 11" },
                          { icon: "fa-phone", text: "+63 912 345 6789" }
                        ].map((s) => (
                          <p key={s.text} className="text-sm text-gray-500 flex items-center justify-center gap-3">
                            <i className={`fas ${s.icon} text-gray-400 w-4 text-center`} /> {s.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800">{t("Student Information")}</h3>
                      <button onClick={() => setEditOpen(true)}
                        className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                        <i className="fas fa-pen text-xs" /> {t("Edit Profile")}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      {[
                        { label: "First Name", value: profile?.displayName?.split(" ")[0] || "" },
                        { label: "Last Name", value: profile?.displayName?.split(" ").slice(1).join(" ") || "" },
                        { label: "Email Address", value: profile?.email || "" },
                        { label: "Phone Number", value: "+63 912 345 6789" },
                        { label: "LRN", value: "123456789012" },
                        { label: "Grade Level", value: "Grade 11" },
                        { label: "Section", value: "Section A" },
                        { label: "Date of Birth", value: "March 15, 2009" },
                        { label: "Gender", value: "Female" },
                        { label: "Address", value: "Metro Manila, Philippines" }
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                          <p className="text-base font-medium text-gray-800">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          {activePage === "settings" && (
            <div className="flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-800">{t("Settings")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("Customize your preferences and account settings")}</p>
              <div className="space-y-4 flex-1">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">{t("Notifications")}</h3>
                  <div className="space-y-3">
                    {[t("Email notifications for new assignments"), t("Deadline reminders"), t("Progress report updates")].map((n, i) => (
                      <label key={n} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">{n}</span>
                        <input type="checkbox" defaultChecked={i < 2} className="rounded text-navy-500 focus:ring-navy-500/20" />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">{t("Account")}</h3>
                  <div className="space-y-3">
                    <button onClick={() => setPwdOpen(true)}
                      className="w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                      <i className="fas fa-key text-gray-400 w-4" /> {t("Change Password")}
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">{t("Languages")}</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-3 text-sm text-gray-700">
                        <i className="fas fa-language text-gray-400 w-4" /> {language === "tl" ? t("Tagalog") : t("English")}
                      </span>
                      <button onClick={() => setLanguage(l => l === "en" ? "tl" : "en")}
                        className="relative w-12 h-7 rounded-full transition-colors duration-300"
                        style={{ background: language === "tl" ? "#2563eb" : "#cbd5e1" }}>
                        <span className="absolute left-0.5 top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 text-xs"
                          style={{ transform: language === "tl" ? "translateX(20px)" : "translateX(0)" }}>
                          <i className={`fas fa-${language === "tl" ? "check text-blue-500" : "times text-gray-400"}`} />
                        </span>
                      </button>
                    </label>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">{t("Design")}</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-3 text-sm text-gray-700">
                        <i className="fas fa-moon text-gray-400 w-4" /> {t("Dark Mode")}
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
                <i className="fas fa-sign-out-alt" /> {t("Logout")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">{t("Edit Profile")}</h3>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setTimeout(() => { alert("Profile updated successfully!"); setEditOpen(false); }, 300); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" defaultValue={profile?.displayName?.split(" ")[0] || ""} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" defaultValue={profile?.displayName?.split(" ").slice(1).join(" ") || ""} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" defaultValue={profile?.email || ""} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input type="text" defaultValue="+63 912 345 6789" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">LRN</label><input type="text" defaultValue={profile?.lrn || ""} disabled className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label><select defaultValue={profile?.gradeLevel || "Grade 11"} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"><option>Grade 11</option><option>Grade 12</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Section</label><select defaultValue="Section A" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"><option>Section A</option><option>Section B</option><option>Section C</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><input type="date" defaultValue="2009-03-15" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select defaultValue="Female" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"><option>Female</option><option>Male</option><option>Prefer not to say</option></select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" defaultValue="Metro Manila, Philippines" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">{t("Cancel")}</button>
                <button type="submit" className="flex-1 py-2.5 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition">{t("Save Changes")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { logout(); navigate("/"); }} />
      <ChatWidget faqMode />
    </div>
  )
}

function ModuleCard({ module, onClick }: {
  module: { title: string; icon: string; color: string; lessons: string; pct: number; bar: string; btn: string; status: "start" | "continue" | "finished" }
  onClick: (type: "start" | "continue" | "finished") => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setAnimPct(module.pct), 200)
    return () => clearTimeout(timer)
  }, [visible, module.pct])

  const btnStyle: React.CSSProperties = {}
  let btnClass = "w-full py-2 text-sm font-medium rounded-lg transition "
  if (module.status === "start") {
    btnClass += "bg-gray-400 text-white hover:bg-gray-500"
  } else if (module.status === "finished") {
    btnClass += "bg-green-600 text-white hover:bg-green-700"
  } else {
    btnClass += "bg-navy-400 text-white hover:bg-navy-500"
  }

  return (
    <div ref={ref} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`w-12 h-12 rounded-xl ${module.color} flex items-center justify-center mb-3`}>
        <i className={`fas ${module.icon} text-xl`} />
      </div>
      <h3 className="font-semibold text-gray-800 text-lg mb-1">{module.title}</h3>
      <p className="text-sm text-gray-400 mb-3">{module.lessons}</p>
      <div className="progress-bar mb-3">
        <div className={`progress-fill ${module.bar}`}
          style={{ width: `${animPct}%`, transition: "width 0.8s ease-out" }} />
      </div>
      <button className={btnClass} style={btnStyle}
        onClick={() => onClick(module.status)}>
        {module.btn}
      </button>
    </div>
  )
}

function ModuleModal({ data, onClose, t }: {
  data: { title: string; type: "start" | "continue" | "finished" } | null
  onClose: () => void
  t: (text: string) => string
}) {
  if (!data) return null

  const modules = [
    { num: "Module 1.0", title: "Introduction & Basics" },
    { num: "Module 2.0", title: "Core Concepts" },
    { num: "Module 3.0", title: "Intermediate Topics" },
    { num: "Module 4.0", title: "Advanced Lessons" },
    { num: "Module 5.0", title: "Final Assessment" }
  ]

  let doneMap: boolean[]
  if (data.type === "start") {
    doneMap = [false, false, false, false, false]
  } else if (data.type === "continue") {
    doneMap = [true, true, true, false, false]
  } else {
    doneMap = [true, true, true, true, true]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{data.title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <i className="fas fa-times text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {modules.map((m, i) => (
              <div key={m.num}
                className={`flex items-center gap-3 p-3 rounded-lg ${doneMap[i] ? "bg-green-50" : "bg-gray-50"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${doneMap[i] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {doneMap[i] ? <i className="fas fa-check" /> : i + 1}
                </span>
                <span className={`text-sm font-medium ${doneMap[i] ? "text-green-700" : "text-gray-700"}`}>{m.num}: {m.title}</span>
                {doneMap[i] && <span className="text-xs text-green-500 ml-auto">{t("Done")}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${data.type === "finished" ? "bg-green-600 hover:bg-green-700" : "bg-navy-500 hover:bg-navy-600"}`}>
            {data.type === "start" ? t("Start Module") : data.type === "finished" ? t("Done") : t("Continue")}
          </button>
        </div>
      </div>
    </div>
  )
}

function CalendarWidget({ t }: { t: (text: string) => string }) {
  const [now, setNow] = useState(new Date())
  const today = now
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(today.getDate())

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const events: Record<string, { title: string; type: string; time?: string }[]> = {
    "15": [{ title: "Math Quiz", type: "assignment", time: "11:59 PM" }, { title: "Study Group", type: "meeting", time: "2:00 PM" }],
    "20": [{ title: "Module 4 Progress Check", type: "milestone" }],
    "22": [{ title: "Communication Skills Quiz 3", type: "assignment", time: "11:59 PM" }],
    "25": [{ title: "Scientific Literacy Portfolio", type: "assignment", time: "11:59 PM" }],

    "28": [{ title: "Math Module 2 Assessment", type: "assignment", time: "11:59 PM" }]
  }

  const typeStyles: Record<string, { bg: string; dot: string; label: string }> = {
    assignment: { bg: "bg-red-50 border-red-200", dot: "bg-red-500", label: t("Assignment") },
    meeting: { bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500", label: t("Meeting") },
    event: { bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500", label: t("Event") },
    milestone: { bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", label: t("Milestone") }
  }

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else { setMonth(m => m - 1) }; setSelected(null) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else { setMonth(m => m + 1) }; setSelected(null) }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const selectedKey = selected?.toString() ?? ""
  const selectedEvents = events[selectedKey] ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 bg-navy-500 -m-6 mb-5 p-4 rounded-t-xl">
          <button onClick={prev}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <i className="fas fa-chevron-left text-white text-sm" />
          </button>
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">{monthNames[month]} {year}</h3>
            <p className="text-xs text-white/60 mt-0.5">{daysInMonth} {t("days")}</p>
          </div>
          <button onClick={next}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <i className="fas fa-chevron-right text-white text-sm" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {dayNames.map(d => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSelected = day === selected
            const isPast = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth()) || (year === today.getFullYear() && month === today.getMonth() && day < today.getDate())
            return (
              <button key={day} onClick={() => !isPast && setSelected(day)} disabled={isPast}
                className={`flex flex-col items-center justify-center rounded-lg text-sm font-medium transition relative min-h-[48px]
                  ${isPast ? "text-gray-300 cursor-not-allowed" : isSelected ? "bg-navy-500 text-white shadow-md shadow-navy-500/25 z-10" : isToday ? "bg-navy-50 text-navy-700 font-bold ring-2 ring-navy-200" : "hover:bg-gray-50 text-gray-700"}`}>
                <span>{day}</span>

              </button>
            )
          })}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
        <div className="pb-4 border-b border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-800 text-base">
            {selected ? `${monthNames[month]} ${selected}, ${year}` : t("Select a date")}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {selectedEvents.length > 0 ? `${selectedEvents.length} ${selectedEvents.length > 1 ? t("events") : t("event")}` : t("No events")}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedEvents.map((e, i) => {
                const style = typeStyles[e.type] ?? { bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400", label: "" }
                return (
                  <div key={i} className={`p-4 rounded-xl border ${style.bg} transition hover:shadow-sm`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot} mt-1 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {e.time && <span className="text-xs text-gray-400"><i className="far fa-clock mr-1" />{e.time}</span>}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${style.dot.replace("bg-", "bg-").replace("500", "100")} ${style.dot.replace("bg-", "text-").replace("500", "600")}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <i className="fas fa-calendar-day text-gray-300 text-2xl" />
              </div>
              <p className="text-sm text-gray-400">{t("No events scheduled")}</p>
              <p className="text-xs text-gray-300 mt-1">{t("Click a date with a dot to view events")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

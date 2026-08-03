import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"
import ChatWidget from "../components/ChatWidget"
import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import AssessmentTaker from "../components/AssessmentTaker"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { db } from "../firebase"
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import type { NavItem, Resource, ModuleTask } from "../types"
import { getSubjectIcon } from "../utils/subjectIcons"
import ImageCarousel from "../components/ImageCarousel"

type LeaderboardEntry = {
  rank: number; initials: string; name: string; section: string
  score: string; scoreColor: string; highlight: boolean; rankBg: string
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "th-large" },
  { id: "modules", label: "My Modules", icon: "book-open" },
  { id: "finish-modules", label: "Module Progress", icon: "check-double" },
  { id: "assignments", label: "Assignments", icon: "tasks" },
  { id: "progress", label: "Progress", icon: "chart-line" },
  { id: "calendar", label: "Calendar", icon: "calendar-alt" },
  { id: "profile", label: "Profile", icon: "user-circle" }
]

export default function Student() {
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { logout, profile, user } = useAuth()
  const [activePage, setActivePage] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deadlinesExpanded, setDeadlinesExpanded] = useState(false)
  const [progressExpanded, setProgressExpanded] = useState(false)
  const [badgesExpanded, setBadgesExpanded] = useState(false)
  const [language, setLanguage] = useState<"en" | "tl">("en")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [submissionOpen, setSubmissionOpen] = useState<string | null>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set(["sci-lab-report"]))
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [submissionNote, setSubmissionNote] = useState("")
  const [taskFile, setTaskFile] = useState<File | null>(null)
  const [taskNote, setTaskNote] = useState("")
  const [resources, setResources] = useState<Resource[]>([])
  const [modalResource, setModalResource] = useState<Resource | null>(null)
  const [viewContent, setViewContent] = useState<{ resource: Resource; moduleIdx: number } | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, number[]>>({})
  const [activeAssessment, setActiveAssessment] = useState<{ resourceId: string } | null>(null)
  const [assessmentSubmissions, setAssessmentSubmissions] = useState<Record<string, { score: number; totalPoints: number }>>({})
  const [quizSubmissions, setQuizSubmissions] = useState<Record<string, { score: number; total: number; passed: boolean }>>({})
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [congratsTarget, setCongratsTarget] = useState<{ resourceId: string; moduleIdx: number } | null>(null)
  const [activeModuleTask, setActiveModuleTask] = useState<{ resource: Resource; moduleIdx: number; task: ModuleTask } | null>(null)
  const [remediationTarget, setRemediationTarget] = useState<{ resource: Resource; moduleIdx: number } | null>(null)
  const [accelMsg, setAccelMsg] = useState<string | null>(null)
  const [assignmentSubs, setAssignmentSubs] = useState<Record<string, { fileName: string; note: string; submittedAt: string }>>({})
  const [updatingSubKey, setUpdatingSubKey] = useState<string | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<{ classRanks: LeaderboardEntry[]; batchRanks: LeaderboardEntry[] }>({ classRanks: [], batchRanks: [] })
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [classPage, setClassPage] = useState(1)
  const [batchPage, setBatchPage] = useState(1)
  const PER_PAGE = 5

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
      "of": "sa",
      "modules": "modyul",
      "complete": "kumpleto",
      "Upcoming Deadlines": "Mga Paparating na Deadline",
      "View All Deadlines": "Tingnan Lahat ng Deadline",
      "Show Less": "Ipakita ang Mas Kaunti",
      "My Modules": "Aking Modyul",
      "Finish": "Tapos",
      "Start": "Simulan",
      "Module Progress": "Progreso ng Modyul",
      "Unlock Activities, Tasks, Quizzes, and Assignments by completing each module.": "I-unlock ang mga Aktibidad, Gawain, Pagsusulit, at Takdang-aralin sa pamamagitan ng pagkumpleto ng bawat modyul.",
      "Unlocked": "Completed",
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

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "resources"))
        const fetched: Resource[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            subject: data.subject || "",
            title: data.title || "",
            description: data.description || "",
            modules: data.modules || [],
            assessment: data.assessment || undefined,
            uploadedBy: data.uploadedBy || "",
            uploadedAt: data.uploadedAt || "",
          }
        })
        setResources(fetched)

        if (user?.uid && fetched.length > 0) {
          const pMap: Record<string, number[]> = {}
          await Promise.all(fetched.map(async (r) => {
            try {
              const pSnap = await getDoc(doc(db, "moduleProgress", `${user.uid}_${r.id}`))
              if (pSnap.exists()) {
                pMap[r.id] = pSnap.data().viewedModules || []
              }
            } catch { /* offline */ }
          }))
          setProgressMap(pMap)
        }

        if (user?.uid) {
          try {
            const subSnap = await getDocs(collection(db, "assessmentSubmissions"))
            const subs: Record<string, { score: number; totalPoints: number }> = {}
            subSnap.docs.forEach((d) => {
              const data = d.data()
              if (data.studentId === user.uid) {
                subs[data.resourceId] = { score: data.score, totalPoints: data.totalPoints }
              }
            })
            setAssessmentSubmissions(subs)
          } catch { /* offline */ }
          try {
            const qSnap = await getDocs(collection(db, "quizSubmissions"))
            const qsubs: Record<string, { score: number; total: number; passed: boolean }> = {}
            qSnap.docs.forEach((d) => {
              const data = d.data()
              if (data.studentId === user.uid) {
                const key = `${data.resourceId}_${data.moduleIdx}`
                if (!qsubs[key] || data.passed) {
                  qsubs[key] = { score: data.score, total: data.total, passed: data.passed }
                }
              }
            })
            setQuizSubmissions(qsubs)
          } catch { /* offline */ }
          try {
            const aSnap = await getDocs(collection(db, "assignmentSubmissions"))
            const asubs: Record<string, { fileName: string; note: string; submittedAt: string }> = {}
            aSnap.docs.forEach((d) => {
              const data = d.data()
              if (data.studentId === user.uid) {
                const key = `${data.resourceId}_${data.moduleIdx}_${data.taskId}`
                asubs[key] = { fileName: data.fileName || "", note: data.note || "", submittedAt: data.submittedAt || "" }
              }
            })
            setAssignmentSubs(asubs)
          } catch { /* offline */ }
        }
      } catch (err) {
        console.error("Failed to fetch resources:", err)
      }
    })()
  }, [user])

  useEffect(() => {
    if (congratsTarget && activePage === "finish-modules") {
      setExpandedCard(congratsTarget.resourceId)
      const timer = setTimeout(() => {
        const el = document.getElementById(`module-tasks-${congratsTarget.resourceId}-${congratsTarget.moduleIdx}`)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        setCongratsTarget(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [congratsTarget, activePage])

  useEffect(() => {
    if (resources.length === 0 || !user) return
    let cancelled = false
    ;(async () => {
      try {
        setLeaderboardLoading(true)
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")))
        const studentMap: Record<string, { displayName: string; gradeLevel: string }> = {}
        usersSnap.docs.forEach(d => {
          const data = d.data()
          studentMap[d.id] = { displayName: data.displayName || "Unknown", gradeLevel: data.gradeLevel || "Section A" }
        })

        const mpSnap = await getDocs(collection(db, "moduleProgress"))
        const moduleCounts: Record<string, number> = {}
        mpSnap.docs.forEach(d => {
          const data = d.data()
          const uid = data.userId
          if (uid) moduleCounts[uid] = (moduleCounts[uid] || 0) + (data.viewedModules?.length || 0)
        })

        const qSnap = await getDocs(collection(db, "quizSubmissions"))
        const quizStats: Record<string, { total: number; count: number }> = {}
        qSnap.docs.forEach(d => {
          const data = d.data()
          const uid = data.studentId
          if (uid) {
            if (!quizStats[uid]) quizStats[uid] = { total: 0, count: 0 }
            quizStats[uid].total += (data.score / data.total) * 100
            quizStats[uid].count++
          }
        })

        const totalMods = resources.reduce((sum, r) => sum + (r.modules?.length || 0), 0)
        if (totalMods === 0) return

        const entries: { uid: string; displayName: string; gradeLevel: string; overallScore: number }[] = []

        Object.entries(studentMap).forEach(([uid, info]) => {
          const viewed = moduleCounts[uid] || 0
          const completionPct = Math.round((viewed / totalMods) * 100)
          const qs = quizStats[uid]
          const avgQuizPct = qs && qs.count > 0 ? Math.round(qs.total / qs.count) : 0
          const overallScore = Math.round(completionPct * 0.50 + avgQuizPct * 0.30)
          entries.push({ uid, ...info, overallScore })
        })

        entries.sort((a, b) => b.overallScore - a.overallScore)

        const myGradeLevel = profile?.gradeLevel || ""

        const toEntry = (e: typeof entries[number], rank: number, isHighlight: boolean): LeaderboardEntry => ({
          rank,
          initials: e.displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "?",
          name: e.displayName,
          section: e.gradeLevel || "Section A",
          score: `${e.overallScore}%`,
          scoreColor: e.overallScore >= 70 ? "text-green-600" : e.overallScore >= 40 ? "text-amber-600" : "text-rose-600",
          highlight: isHighlight,
          rankBg: rank === 1 ? "bg-yellow-400" : rank === 2 ? "bg-gray-400" : rank === 3 ? "bg-amber-700" : "bg-gray-300"
        })

        if (!cancelled) {
          setLeaderboardData({
            classRanks: entries.filter(e => e.gradeLevel === myGradeLevel).map((e, i) => toEntry(e, i + 1, e.uid === user.uid)),
            batchRanks: entries.map((e, i) => toEntry(e, i + 1, e.uid === user.uid))
          })
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard data:", err)
      } finally {
        if (!cancelled) setLeaderboardLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [resources, user, profile])

  const markModuleViewed = async (resourceId: string, moduleIdx: number) => {
    if (!user?.uid) return
    const key = `${user.uid}_${resourceId}`
    const current = progressMap[resourceId] || []
    if (current.includes(moduleIdx)) return
    const updated = [...current, moduleIdx]
    setProgressMap(prev => ({ ...prev, [resourceId]: updated }))
    try {
      await setDoc(doc(db, "moduleProgress", key), {
        userId: user.uid,
        resourceId,
        viewedModules: updated,
        lastViewedAt: serverTimestamp(),
      })
    } catch { /* offline */ }
  }

  const markModuleUnread = async (resourceId: string, moduleIdx: number) => {
    if (!user?.uid) return
    const key = `${user.uid}_${resourceId}`
    const current = progressMap[resourceId] || []
    const updated = current.filter((i) => i !== moduleIdx)
    setProgressMap(prev => ({ ...prev, [resourceId]: updated }))
    try {
      await setDoc(doc(db, "moduleProgress", key), {
        userId: user.uid,
        resourceId,
        viewedModules: updated,
        lastViewedAt: serverTimestamp(),
      })
    } catch { /* offline */ }
  }

  const onQuizComplete = (resource: Resource, moduleIdx: number, result: { score: number; total: number; passed: boolean }) => {
    const key = `${resource.id}_${moduleIdx}`
    setQuizSubmissions(prev => ({ ...prev, [key]: result }))
    const mod = resource.modules?.[moduleIdx]
    const rules = mod?.adaptiveRules
    if (!rules) return
    const pct = (result.score / result.total) * 100

    // Remediation: if score below minScore and remediation is enabled, redirect
    if (!result.passed && rules.remediation.enabled) {
      const targetIdx = rules.remediation.moduleIdx
      if (targetIdx >= 0 && targetIdx < (resource.modules?.length || 0) && targetIdx !== moduleIdx) {
        setRemediationTarget({ resource, moduleIdx: targetIdx })
      }
    }

    // Acceleration (post-quiz mode): if score >= threshold, auto-mark next module
    if (rules.acceleration.enabled && rules.acceleration.mode === "postquiz" && pct >= rules.acceleration.threshold) {
      const nextIdx = moduleIdx + 1
      if (nextIdx < (resource.modules?.length || 0)) {
        markModuleViewed(resource.id, nextIdx)
        setAccelMsg(`Great work! You scored ${Math.round(pct)}% — Module ${nextIdx + 1} has been unlocked.`)
        setTimeout(() => setAccelMsg(null), 4000)
      }
    }
  }

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

              {(() => {
                const totalMods = resources.reduce((sum, r) => sum + (r.modules?.length || 0), 0)
                const viewedCount = resources.reduce((sum, r) => sum + (progressMap[r.id]?.length || 0), 0)
                const pct = totalMods > 0 ? Math.round((viewedCount / totalMods) * 100) : 0
                const remaining = totalMods - viewedCount
                const circumference = 2 * Math.PI * 42
                const dashoffset = circumference - (pct / 100) * circumference
                const completedResources = resources.filter(r => {
                  const viewed = progressMap[r.id] || []
                  return r.modules && r.modules.length > 0 && viewed.length >= r.modules.length
                })
                const subjectBadge: Record<string, string> = {
                  math: "🧮", algebra: "📐", geometry: "🔺", calculus: "∫",
                  english: "📚", grammar: "✍️", writing: "🖋️", reading: "📖", "oral communication": "🎤", research: "🔍",
                  filipino: "🏝️", tagalog: "🏝️", "pagbasa at pagsulat": "📜", komunikasyon: "🗣️",
                  science: "🧪", biology: "🧬", chemistry: "⚗️", physics: "⚛️", earth: "🌍",
                  "social studies": "🏛️", history: "📜", "araling panlipunan": "🏛️", politics: "🗳️", economics: "📊",
                  technology: "🖥️", ict: "🖥️", computer: "💻", empowerment: "🚀",
                  tle: "🛠️", livelihood: "🧰", cookery: "👨‍🍳", welding: "⚡",
                  mapeh: "🎭", arts: "🎨", "creative writing": "✒️", music: "🎵", "contemporary arts": "🎭",
                  pe: "🏃", sports: "🏀", health: "💪", "physical education": "🏅",
                  values: "🤝", "value education": "🤝", "personal development": "🌟", ethics: "⚖️",
                  business: "💼", abm: "💼", accountancy: "📊", management: "📋", entrepreneurship: "🚀",
                  philosophy: "🧠", logic: "🧠", psychology: "🧠",
                  environment: "🌱", agriculture: "🌾", ecology: "🌿",
                  language: "🌐", spanish: "💃", japanese: "⛩️", french: "🥖",
                  architecture: "🏗️", design: "🎯", engineering: "⚙️",
                }
                const getBadge = (s: string) => Object.entries(subjectBadge).find(([key]) => s.toLowerCase().includes(key))?.[1] || "🏆"
                return (
                  <div className="stat-card mb-5">
                    <p className="text-gray-500 text-sm font-medium mb-5">{t("Overall Progress Tracker")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="flex justify-center">
                        <div className="relative w-48 h-48">
                          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke={pct >= 100 ? "#22c55e" : "#1A73E8"} strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={circumference} strokeDashoffset={Math.max(0, dashoffset)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-800 -mb-0.5">{pct}%</span>
                            <span className="text-xs font-medium text-gray-400">{t("Complete")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-base font-medium text-gray-700">{t("Completed Modules")}</span>
                            <span className="text-base text-gray-500">{viewedCount}/{totalMods}</span>
                          </div>
                          <div className="progress-bar h-2.5">
                            <div className="progress-fill bg-green-500" style={{ width: `${pct}%`, transition: "width 0.8s ease" }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-base font-medium text-gray-700">{t("Remaining Modules")}</span>
                            <span className="text-base text-gray-500">{remaining}/{totalMods}</span>
                          </div>
                          <div className="progress-bar h-2.5">
                            <div className="progress-fill bg-green-300" style={{ width: `${remaining > 0 ? (remaining / totalMods) * 100 : 0}%`, transition: "width 0.8s ease" }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm pt-2">
                          <span className={`w-2 h-2 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`} />
                          <span className={`font-medium ${pct >= 100 ? "text-green-600" : "text-blue-600"}`}>{pct >= 100 ? t("All Complete!") : t("In Progress")}</span>
                          {pct < 100 && (
                            <><span className="text-gray-300">•</span><span className="text-gray-400">{remaining} {t("module" + (remaining !== 1 ? "s" : ""))} remaining</span></>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center mt-4">
                      <button onClick={() => setProgressExpanded((p) => !p)}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <i className={`fas fa-chevron-down text-gray-500 text-sm transition-transform duration-300 ${progressExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    <div className="overflow-hidden transition-all duration-500 ease-in-out"
                      style={{ maxHeight: progressExpanded ? "2000px" : "0", opacity: progressExpanded ? 1 : 0 }}>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {completedResources.length > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-gray-700 mb-3">{t(`Completed Courses (${completedResources.length})`)}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {completedResources.map((r, idx) => {
                                const badge = getBadge(r.subject)
                                const iconInfo = getSubjectIcon(r.subject)
                                const mods = r.modules || []
                                const taskCount = mods.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
                                return (
                                <div key={r.id} className="relative rounded-xl border border-gray-200 bg-white shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                  style={{ animation: `slideUp 0.4s ease-out ${idx * 0.05}s both` }}>
                                    <div className="p-4">
                                      <div className="flex items-start gap-3">
                                        <div className={`w-11 h-11 rounded-xl ${iconInfo.bg} ${iconInfo.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                          <i className={`fas ${iconInfo.icon} text-base`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{r.title}</p>
                                          <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{mods.length} module{mods.length !== 1 ? "s" : ""}</span>
                                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
                                          </div>
                                          <div className="flex items-center gap-1 mt-2">
                                            <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                              <i className="fas fa-check-circle text-[8px]" /> Completed
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                          <div className="relative"
                                            style={{ animation: `badgePop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.05 + 0.2}s both` }}>
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-200/50 group-hover:animate-gentlePulse transition-all duration-300 group-hover:shadow-xl group-hover:shadow-orange-300/50 group-hover:-translate-y-0.5">
                                              <span className="text-xl drop-shadow-sm">{badge}</span>
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                              <i className="fas fa-star text-[8px] text-amber-400" />
                                            </div>
                                          </div>
                                          <span className={`text-[8px] font-bold uppercase tracking-wider ${iconInfo.color}`}>{r.subject}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-sm text-gray-400">No modules completed yet. Start exploring!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {(() => {
                  const activeRes = resources
                    .map(r => ({
                      resource: r,
                      viewed: progressMap[r.id] || [],
                      total: r.modules?.length || 0,
                    }))
                    .filter(r => r.viewed.length > 0 && r.viewed.length < r.total)
                  const colorCycle = [
                    { color: "bg-navy-500", labelColor: "text-navy-600", bg: "bg-navy-100" },
                    { color: "bg-amber-500", labelColor: "text-amber-600", bg: "bg-amber-100" },
                    { color: "bg-purple-500", labelColor: "text-purple-600", bg: "bg-purple-100" },
                    { color: "bg-emerald-500", labelColor: "text-emerald-600", bg: "bg-emerald-100" },
                  ]
                  const firstUnviewedIdx = (r: typeof activeRes[number]) => {
                    for (let i = 0; i < r.total; i++) {
                      if (!r.viewed.includes(i)) return i
                    }
                    return 0
                  }
                  return (
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">{t("My Active Modules")}</h3>
                      {activeRes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10 rounded-xl border-2 border-dashed border-gray-200">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <i className="fas fa-book-open text-gray-300 text-2xl" />
                          </div>
                          <p className="font-medium text-gray-500">{t("No active modules")}</p>
                          <p className="text-xs text-gray-400 mt-1">{t("Start a module from My Modules page")}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto flex-1 -mx-1 px-1 scrollbar-thin"
                          style={{ scrollSnapType: "x mandatory" }}>
                          <div className="flex gap-4 pb-2">
                            {activeRes.map((r, i) => {
                              const c = colorCycle[i % colorCycle.length]
                              const pct = Math.round((r.viewed.length / r.total) * 100)
                              const currentMod = r.resource.modules[r.viewed.length] || r.resource.modules[r.total - 1]
                              const subjIcon = getSubjectIcon(r.resource.subject)
                              return (
                                <div key={r.resource.id} className="flex-shrink-0 w-72" style={{ scrollSnapAlign: "start" }}>
                                  <div className="module-card p-0 flex flex-col h-full overflow-hidden !border-0">
                                    <div className="p-5 flex flex-col flex-1">
                                      <div className="flex items-start gap-3 mb-3">
                                        <div className={`w-11 h-11 rounded-xl ${subjIcon.bg} ${subjIcon.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                          <i className={`fas ${subjIcon.icon} text-base`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-[10px] font-bold uppercase tracking-wider ${subjIcon.color}`}>{r.resource.subject}</p>
                                          <h4 className="font-semibold text-gray-800 text-base leading-tight truncate">{r.resource.title}</h4>
                                        </div>
                                        <span className={`text-xs font-bold ${c.labelColor} ${c.bg} px-2 py-0.5 rounded whitespace-nowrap`}>{pct}%</span>
                                      </div>
                                      <p className="text-sm text-gray-400 truncate mb-4">{t("Current:")} {currentMod?.name || `Module ${r.viewed.length + 1}`}</p>
                                      <div className="mt-auto">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-xs font-medium text-gray-500">{r.viewed.length} {t("of")} {r.total} {t("modules")}</span>
                                          <span className={`text-xs font-semibold ${c.labelColor}`}>{pct}% {t("complete")}</span>
                                        </div>
                                        <div className="progress-bar h-2.5 mb-4">
                                          <div className={`progress-fill ${c.color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                      <button onClick={() => {
                                        const idx = firstUnviewedIdx(r)
                                        setViewContent({ resource: r.resource, moduleIdx: idx })
                                        goTo("modules")
                                      }} className="w-full py-2.5 bg-navy-400 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-navy-500 transition">
                                        {t("Continue Lesson")} <i className="fas fa-arrow-right text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {(() => {
                  const allDeadlines = resources.flatMap(r =>
                    (r.modules || []).flatMap((m, mi) =>
                      (m.tasks || []).filter(t => t.dueDate).map(t => ({
                        title: t.title,
                        date: t.dueDate,
                        tag: t.type.charAt(0).toUpperCase() + t.type.slice(1),
                        resourceName: r.title,
                        moduleName: m.name || `Module ${mi + 1}`,
                        icon: t.type === "quiz" ? "fa-pen-alt" : t.type === "assignment" ? "fa-book-open" : t.type === "discussion" ? "fa-comments" : "fa-newspaper",
                      }))
                    )
                  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  const showAll = deadlinesExpanded
                  const visibleDeadlines = showAll ? allDeadlines : allDeadlines.slice(0, 3)
                  const tagColors: Record<string, string> = {
                    Quiz: "bg-blue-100 text-blue-600",
                    Assignment: "bg-purple-100 text-purple-600",
                    Discussion: "bg-amber-100 text-amber-600",
                    Material: "bg-gray-100 text-gray-600",
                  }
                  return (
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">{t("Upcoming Deadlines")}</h3>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col" style={{ maxHeight: "380px", overflowY: "auto" }}>
                        <div className="space-y-0">
                          {allDeadlines.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                <i className="fas fa-calendar-check text-gray-300 text-lg" />
                              </div>
                              <p className="text-sm text-gray-400">No upcoming deadlines</p>
                            </div>
                          ) : (
                            visibleDeadlines.map((d, i) => (
                              <div key={i} className="deadline-item">
                                <div className="flex items-start gap-3">
                                  <div className={`w-9 h-9 rounded-lg ${tagColors[d.tag] || "bg-gray-100 text-gray-600"} flex items-center justify-center flex-shrink-0`}>
                                    <i className={`fas ${d.icon} text-sm`} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">{d.tag}</span>
                              </div>
                            ))
                          )}
                        </div>
                        {allDeadlines.length > 3 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button onClick={() => setDeadlinesExpanded((p) => !p)}
                              className="w-full text-sm font-medium text-primary hover:text-primary-700 flex items-center justify-center gap-1">
                              <span>{deadlinesExpanded ? t("Show Less") : t("View All Deadlines")}</span>
                              <i className={`fas fa-arrow-${deadlinesExpanded ? "up" : "right"} text-xs`} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Recommended for You */}
              {(() => {
                const recommendations: { resourceId: string; moduleIdx: number; score: number; moduleName: string; resourceName: string }[] = []
                Object.entries(quizSubmissions).forEach(([key, sub]) => {
                  const [resId, modIdxStr] = key.split("_")
                  const modIdx = Number(modIdxStr)
                  const res = resources.find(r => r.id === resId)
                  if (!res || !res.modules?.[modIdx]) return
                  const pct = (sub.score / sub.total) * 100
                  if (pct < 50) {
                    recommendations.push({
                      resourceId: resId,
                      moduleIdx: modIdx,
                      score: Math.round(pct),
                      moduleName: res.modules[modIdx].name || `Module ${modIdx + 1}`,
                      resourceName: res.title,
                    })
                  }
                })
                if (recommendations.length === 0) return null
                return (
                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-800 mb-3"><i className="fas fa-lightbulb text-amber-500 mr-2" />Recommended for You</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recommendations.slice(0, 4).map((rec, i) => (
                        <div key={i} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:shadow-sm transition cursor-pointer"
                          onClick={() => {
                            const res = resources.find(r => r.id === rec.resourceId)
                            if (res) goTo("modules")
                            setModalResource(res || null)
                          }}>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <i className="fas fa-book-open text-amber-500 text-sm" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{rec.moduleName}</p>
                              <p className="text-xs text-gray-500 truncate">{rec.resourceName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600">{rec.score}%</span>
                                <span className="text-[10px] text-gray-400">Needs review</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* My Modules */}
          {activePage === "modules" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t("My Modules")}</h2>
              <p className="text-gray-500 mt-1 mb-6">{t("Access your learning materials and lessons")}</p>
              <ModuleModal resource={modalResource} viewedModules={modalResource ? (progressMap[modalResource.id] || []) : []} quizSubmissions={quizSubmissions} onClose={() => setModalResource(null)} onViewContent={(r, idx) => { setModalResource(null); setViewContent({ resource: r, moduleIdx: idx }) }} onToggleUnread={(resourceId, moduleIdx) => markModuleUnread(resourceId, moduleIdx)} t={t} />
              <ModuleViewer data={viewContent} viewedModules={viewContent ? (progressMap[viewContent.resource.id] || []) : []} onBack={() => { setViewContent(null) }} onNavigate={(idx) => { setViewContent(prev => prev ? { ...prev, moduleIdx: idx } : null) }} onMarkViewed={(resourceId, moduleIdx) => markModuleViewed(resourceId, moduleIdx)} onGoToProgress={(resourceId, moduleIdx) => { setViewContent(null); setCongratsTarget({ resourceId, moduleIdx }); setActivePage("finish-modules") }} user={user} t={t} quizSubmissions={quizSubmissions} assignmentSubs={assignmentSubs} />
              {resources.length === 0 ? (
                <div className="text-center py-20 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gray-100">
                    <i className="fas fa-book-open text-2xl text-gray-300" />
                  </div>
                  <p className="font-medium mb-1 text-gray-500">No modules available yet</p>
                  <p className="text-sm text-gray-400">Modules created by teachers will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-rows-[1fr]">
                  {resources.map((r) => {
                    const mods = r.modules || []
                    const subjIcon = getSubjectIcon(r.subject)
                    const viewed = progressMap[r.id] || []
                    const pct = mods.length > 0 ? Math.round((viewed.length / mods.length) * 100) : 0
                    const status: "start" | "continue" | "finished" = pct === 0 ? "start" : pct >= 100 ? "finished" : "continue"
                    const btnText = status === "start" ? t("Start") : status === "finished" ? t("Finish") : t("Continue Lesson")
                    return (
                      <ModuleCard
                        key={r.id}
                        title={r.title}
                        subtitle={r.subject}
                        icon={subjIcon.icon}
                        color={`${subjIcon.bg} ${subjIcon.color}`}
                        lessonsText={`${mods.length} module${mods.length !== 1 ? "s" : ""} • ${viewed.length}/${mods.length} viewed`}
                        pct={pct}
                        btnText={btnText}
                        status={status}
                        onClick={() => setModalResource(r)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Finish Modules */}
          {activePage === "finish-modules" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{t("Module Progress")}</h2>
              <p className="text-gray-500 text-sm mb-6">{t("View your progress and unlock tasks, quizzes, and assessments by completing each module.")}</p>
              {resources.length === 0 ? (
                <div className="text-center py-20 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="font-medium text-gray-500">No modules to finish yet</p>
                </div>
              ) : expandedCard ? (
                (() => {
                  const r = resources.find(res => res.id === expandedCard)
                  if (!r) return null
                  const subjIcon = getSubjectIcon(r.subject)
                  const mods = r.modules || []
                  const viewed = progressMap[r.id] || []
                  const allViewed = mods.length > 0 && viewed.length >= mods.length
                  const hasAssessment = !!(r.assessment && r.assessment.questions.length > 0)
                  const sub = assessmentSubmissions[r.id]
                  const totalTaskCount = mods.reduce((acc, m) => acc + (m.tasks || []).length, 0)
                  const taskTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
                    assignment: { icon: "fa-book-open", color: "#1A73E8", label: "Assignment" },
                    quiz: { icon: "fa-clipboard-list", color: "#0F9D58", label: "Quiz" },
                    discussion: { icon: "fa-comments", color: "#E67C13", label: "Discussion" },
                    material: { icon: "fa-newspaper", color: "#673AB7", label: "Material" },
                  }

                  return (
                    <div className="space-y-6">
                      {/* Back button + header */}
                      <div>
                        <button onClick={() => setExpandedCard(null)} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy-600 transition mb-4">
                          <i className="fas fa-arrow-left text-xs" />Back to Module Progress
                        </button>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl ${subjIcon.bg} ${subjIcon.color} flex items-center justify-center shrink-0`}>
                              <i className={`fas ${subjIcon.icon} text-xl`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-800">{r.title}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">{r.subject}</p>
                              {r.description && <p className="text-sm text-gray-500 mt-2">{r.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {allViewed ? (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-600">
                                  <i className="fas fa-unlock mr-1" />All Modules Completed
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-navy-50 text-navy-600">
                                  {viewed.length}/{mods.length} modules viewed
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {mods.map((mod, i) => {
                              const modTasks = mod.tasks || []
                              const isDone = viewed.includes(i) && modTasks.every(t => {
                                if (t.type === "quiz") return !!quizSubmissions[`${r.id}_${i}`]?.passed
                                if (t.type === "assignment") return !!assignmentSubs[`${r.id}_${i}_${t.id}`]
                                return true
                              })
                              const inProgress = viewed.includes(i) && !isDone
                              return (
                                <div key={i} className={`flex-1 h-2.5 rounded-full transition-colors ${isDone ? "bg-green-400" : inProgress ? "bg-orange-300" : "bg-gray-200"}`} title={`Module ${i + 1}${isDone ? " (done)" : inProgress ? " (in progress)" : ""}`} />
                              )
                            })}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {totalTaskCount > 0 && (
                              <span className="text-[11px] font-medium text-gray-500">
                                <i className="fas fa-list-check mr-1" />{totalTaskCount} task{totalTaskCount !== 1 ? "s" : ""}
                              </span>
                            )}
                            {hasAssessment && (
                              <span className="text-[11px] font-medium text-gray-500">
                                <i className="fas fa-clipboard-check mr-1" />assessment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Per-module tasks */}
                      {mods.map((mod, modIdx) => {
                        const modTasks = (mod.tasks || [])
                        if (modTasks.length === 0) return null
                        const isViewed = viewed.includes(modIdx)
                        const isComplete = isViewed && modTasks.every(t => {
                          if (t.type === "quiz") return !!quizSubmissions[`${r.id}_${modIdx}`]?.passed
                          if (t.type === "assignment") return !!assignmentSubs[`${r.id}_${modIdx}_${t.id}`]
                          return true
                        })
                        return (
                          <div key={modIdx} id={`module-tasks-${r.id}-${modIdx}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isComplete ? "bg-green-500 text-white" : isViewed ? "bg-orange-50 text-orange-600 border-2 border-dashed border-orange-400" : "bg-gray-200 text-gray-400"}`}>
                                {isComplete ? <i className="fas fa-check" /> : isViewed ? modIdx + 1 : <i className="fas fa-lock text-[9px]" />}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isViewed ? "text-navy-700" : "text-gray-400"}`}>{mod.name || `Module ${modIdx + 1}`}</p>
                              </div>
                              {!isViewed ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-400">
                                  <i className="fas fa-lock mr-1" />Locked
                                </span>
                              ) : isComplete ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-50 text-green-600">
                                  <i className="fas fa-check-circle mr-1" />Completed
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-600">
                                  <i className="fas fa-spinner mr-1" />In Progress
                                </span>
                              )}
                            </div>
                            <div className="space-y-2 pl-11">
                              {modTasks.map((task) => {
                                const tcfg = taskTypeConfig[task.type] || taskTypeConfig.assignment
                                const quizSub = task.type === "quiz" ? quizSubmissions[`${r.id}_${modIdx}`] : undefined
                                return (
                                  <div key={task.id}
                                    onClick={() => isViewed ? setActiveModuleTask({ resource: r, moduleIdx: modIdx, task }) : undefined}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${isViewed ? "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer" : "bg-gray-100/50 border-gray-200/50 opacity-50 cursor-not-allowed"}`}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: tcfg.color + "18" }}>
                                      <i className={`fas ${tcfg.icon} text-xs`} style={{ color: tcfg.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${isViewed ? "text-gray-800" : "text-gray-400"}`}>{task.title || `${tcfg.label}`}</p>
                                      <p className="text-[11px] text-gray-400">
                                        {tcfg.label}
                                        {task.dueDate && ` \u00B7 Due ${new Date(task.dueDate).toLocaleDateString()}`}
                                        {task.points !== undefined && ` \u00B7 ${task.points} pts`}
                                        {quizSub && ` \u00B7 ${quizSub.score}/${quizSub.total} (${Math.round((quizSub.score / quizSub.total) * 100)}%)`}
                                      </p>
                                    </div>
                                    {isViewed ? (
                                      quizSub ? (
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${quizSub.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                                          {quizSub.passed ? <><i className="fas fa-check-circle mr-0.5" />Passed</> : <><i className="fas fa-times-circle mr-0.5" />Failed</>}
                                        </span>
                                      ) : task.type === "assignment" && assignmentSubs[`${r.id}_${modIdx}_${task.id}`] ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-green-100 text-green-600">
                                          <i className="fas fa-check-circle mr-0.5" />Submitted
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: tcfg.color + "18", color: tcfg.color }}>
                                          {task.type === "material" ? "View" : "Open"}
                                        </span>
                                      )
                                    ) : (
                                      <i className="fas fa-lock text-gray-300 text-xs shrink-0" />
      )}

      {/* Remediation Modal */}
      {remediationTarget && (() => {
        const { resource: res, moduleIdx: targetIdx } = remediationTarget
        const targetMod = res.modules?.[targetIdx]
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRemediationTarget(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-8 text-center bg-amber-50">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-book-open text-amber-500 text-2xl" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Review Recommended</h3>
                <p className="text-sm text-gray-500">Let's review the material before retrying the quiz.</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-gray-600">
                  You'll be routed to <strong>{targetMod?.name || `Module ${targetIdx + 1}`}</strong> for review.
                  After reviewing, you can retake the quiz.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setRemediationTarget(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={() => {
                    const target = remediationTarget
                    setRemediationTarget(null)
                    setActiveModuleTask(null)
                    setViewContent({ resource: target.resource, moduleIdx: target.moduleIdx })
                  }} className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition">
                    <i className="fas fa-arrow-right mr-1" /> Go to Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Acceleration Toast */}
      {accelMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
          <i className="fas fa-rocket text-sm" />
          <span className="text-sm font-medium">{accelMsg}</span>
          <button onClick={() => setAccelMsg(null)} className="text-white/70 hover:text-white ml-2">
            <i className="fas fa-times text-xs" />
          </button>
        </div>
      )}
    </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}

                      {/* Final Assessment */}
                      {hasAssessment && (
                        <div className={`rounded-xl border p-5 ${allViewed ? "bg-amber-50/50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                          <p className={`text-sm font-semibold mb-3 ${allViewed ? "text-amber-700" : "text-gray-400"}`}>
                            <i className="fas fa-clipboard-check mr-1" />
                            {allViewed ? "Final Assessment" : "Complete all modules to unlock the final assessment"}
                          </p>
                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition ${sub ? "bg-green-50 border-green-200" : allViewed ? "bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm cursor-pointer" : "bg-gray-100 border-gray-200 opacity-60"}`}
                            onClick={() => { if (allViewed && !sub) setActiveAssessment({ resourceId: r.id }) }}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sub ? "bg-green-500 text-white" : allViewed ? "bg-amber-100 text-amber-600" : "bg-gray-200 text-gray-400"}`}>
                              {sub ? <i className="fas fa-check text-xs" /> : allViewed ? <i className="fas fa-play text-xs" /> : <i className="fas fa-lock text-xs" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${sub ? "text-green-700" : allViewed ? "text-gray-800" : "text-gray-400"}`}>{r.assessment!.title || `${r.title} Assessment`}</p>
                              <p className={`text-[11px] ${sub ? "text-green-600" : "text-gray-400"}`}>
                                {sub ? `${sub.score}/${sub.totalPoints} (${Math.round((sub.score / sub.totalPoints) * 100)}%)` : `${r.assessment!.questions.length} question${r.assessment!.questions.length !== 1 ? "s" : ""}`}
                              </p>
                            </div>
                            {sub ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-600 shrink-0">
                                <i className="fas fa-check-circle mr-0.5" />Submitted
                              </span>
                            ) : allViewed ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">
                                Start
                              </span>
                            ) : (
                              <i className="fas fa-lock text-gray-300 text-xs shrink-0" />
                            )}
                          </div>
                        </div>
                      )}

                      {totalTaskCount === 0 && !hasAssessment && (
                        <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4">
                          <p className="text-sm text-gray-400"><i className="fas fa-info-circle mr-1" />No tasks or assessments added to this resource yet</p>
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((r) => {
                    const subjIcon = getSubjectIcon(r.subject)
                    const mods = r.modules || []
                    const viewed = progressMap[r.id] || []
                    const allViewed = mods.length > 0 && viewed.length >= mods.length
                    const hasAssessment = !!(r.assessment && r.assessment.questions.length > 0)
                    const sub = assessmentSubmissions[r.id]
                    const totalTaskCount = mods.reduce((acc, m) => acc + (m.tasks || []).length, 0)
                    const canOpen = viewed.length > 0 && (mods.some(m => (m.tasks || []).length > 0) || hasAssessment)

                    return (
                      <div key={r.id}
                        className={`relative rounded-2xl overflow-hidden transition-all duration-300 border ${allViewed && canOpen ? "bg-gradient-to-br from-green-50 to-emerald-100 shadow-lg shadow-green-500/10 border-green-200" : viewed.length > 0 ? "bg-white shadow-md hover:shadow-lg border-gray-200" : "bg-white shadow-sm hover:shadow-md border-gray-200"}`}>
                        <div
                          className={`p-5 ${canOpen ? "cursor-pointer" : "cursor-not-allowed"}`}
                          onClick={() => canOpen ? setExpandedCard(r.id) : undefined}
                        >
                          <div className="flex items-start gap-3.5 mb-4">
                            <div className={`w-12 h-12 rounded-2xl ${subjIcon.bg} ${subjIcon.color} flex items-center justify-center shrink-0`}>
                              <i className={`fas ${subjIcon.icon} text-xl`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-800 text-sm leading-tight">{r.title}</h3>
                              <p className="text-[11px] text-gray-400 mt-0.5">{r.subject}</p>
                              {r.description && <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">{r.description}</p>}
                            </div>
                          </div>

                          {/* Module progress strip */}
                          <div className="flex items-center gap-1 mb-4">
                            {mods.map((mod, i) => {
                              const modTasks = mod.tasks || []
                              const isDone = viewed.includes(i) && modTasks.every(t => {
                                if (t.type === "quiz") return !!quizSubmissions[`${r.id}_${i}`]?.passed
                                if (t.type === "assignment") return !!assignmentSubs[`${r.id}_${i}_${t.id}`]
                                return true
                              })
                              const inProgress = viewed.includes(i) && !isDone
                              return (
                                <div key={i} className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${isDone ? "bg-green-500 text-white shadow-sm shadow-green-500/30" : inProgress ? "bg-orange-50 text-orange-600 border-2 border-dashed border-orange-400" : "bg-gray-100 text-gray-400"}`} title={`Module ${i + 1}${isDone ? " (done)" : inProgress ? " (in progress)" : ""}`}>
                                  {isDone ? <i className="fas fa-check text-[9px]" /> : i + 1}
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${allViewed ? "text-green-600" : viewed.length > 0 ? "text-gray-700" : "text-gray-400"}`}>{viewed.length}/{mods.length}</span>
                              <span className="text-[10px] text-gray-400">modules</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {totalTaskCount > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/80 text-navy-500 shadow-sm">
                                  <i className="fas fa-list-check mr-1" />{totalTaskCount} task{totalTaskCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              {hasAssessment && (
                                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg shadow-sm ${sub ? "bg-green-100 text-green-600" : "bg-white/80 text-amber-500"}`}>
                                  <i className="fas fa-clipboard-check mr-1" />Quiz
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {viewed.length === 0 && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-2xl pointer-events-none">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
                              <i className="fas fa-lock text-gray-300 text-base" />
                            </div>
                            <p className="text-[11px] font-semibold text-gray-500">No modules viewed yet</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Complete modules to unlock tasks</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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

              {(() => {
                const totalMods = resources.reduce((sum, r) => sum + (r.modules?.length || 0), 0)
                const viewedCount = resources.reduce((sum, r) => sum + (progressMap[r.id]?.length || 0), 0)
                const pct = totalMods > 0 ? Math.round((viewedCount / totalMods) * 100) : 0
                const circumference = 2 * Math.PI * 30
                const dashoffset = circumference - (pct / 100) * circumference
                const remaining = totalMods - viewedCount
                const qEntries = Object.entries(quizSubmissions)
                const quizzesTaken = qEntries.length
                const avgScore = quizzesTaken > 0 ? Math.round(qEntries.reduce((sum, [, s]) => sum + (s.score / s.total) * 100, 0) / quizzesTaken) : 0
                const passedCount = qEntries.filter(([, s]) => s.passed).length
                const passRate = quizzesTaken > 0 ? Math.round((passedCount / quizzesTaken) * 100) : 0
                const completedResources = resources.filter(r => {
                  const viewed = progressMap[r.id] || []
                  return r.modules?.length > 0 && viewed.length >= r.modules.length
                })
                const bestQuiz = qEntries.length > 0 ? qEntries.reduce((best, [, s]) => {
                  const pct = (s.score / s.total) * 100
                  return pct > best.pct ? { pct } : best
                }, { pct: 0 }) : null

                const subjectBadge: Record<string, string> = {
                  math: "🧮", algebra: "📐", geometry: "🔺", calculus: "∫",
                  english: "📚", grammar: "✍️", writing: "🖋️", reading: "📖", "oral communication": "🎤", research: "🔍",
                  filipino: "🏝️", tagalog: "🏝️", "pagbasa at pagsulat": "📜", komunikasyon: "🗣️",
                  science: "🧪", biology: "🧬", chemistry: "⚗️", physics: "⚛️", earth: "🌍",
                  "social studies": "🏛️", history: "📜", "araling panlipunan": "🏛️", politics: "🗳️", economics: "📊",
                  technology: "🖥️", ict: "🖥️", computer: "💻", empowerment: "🚀",
                  tle: "🛠️", livelihood: "🧰", cookery: "👨‍🍳", welding: "⚡",
                  mapeh: "🎭", arts: "🎨", "creative writing": "✒️", music: "🎵", "contemporary arts": "🎭",
                  pe: "🏃", sports: "🏀", health: "💪", "physical education": "🏅",
                  values: "🤝", ethics: "⚖️", philosophy: "🧠", logic: "🧠",
                  business: "💼", abm: "💼", accountancy: "📊", management: "📋", entrepreneurship: "🚀",
                  environment: "🌱", agriculture: "🌾", ecology: "🌿",
                  language: "🌐",
                }
                const getBadge = (s: string) => Object.entries(subjectBadge).find(([key]) => s.toLowerCase().includes(key))?.[1] || "🏆"

                const achievements: { title: string; desc: string; icon: string; color: string; highlight: boolean }[] = []
                if (completedResources.length >= 1) {
                  achievements.push({ title: "First Steps", desc: `Completed "${completedResources[0].title}"`, icon: "fa-leaf", color: "bg-green-500", highlight: false })
                }
                if (completedResources.length >= 3) {
                  achievements.push({ title: "Fast Learner", desc: `Completed ${completedResources.length} courses`, icon: "fa-trophy", color: "bg-amber-500", highlight: true })
                }
                if (bestQuiz && bestQuiz.pct >= 100) {
                  achievements.push({ title: "Perfect Score", desc: `Scored 100% on a quiz`, icon: "fa-star", color: "bg-blue-500", highlight: false })
                }
                if (passedCount >= 3) {
                  achievements.push({ title: "Quiz Master", desc: `Passed ${passedCount} quizzes`, icon: "fa-brain", color: "bg-purple-500", highlight: false })
                }

                return (
                  <>
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
                              <circle cx="36" cy="36" r="30" fill="none" stroke={pct >= 100 ? "#22c55e" : "#1A73E8"} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={circumference} strokeDashoffset={Math.max(0, dashoffset)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-gray-800 -mb-0.5">{pct}%</span>
                              <span className="text-[10px] font-medium text-gray-400">{t("Complete")}</span>
                            </div>
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <i className="fas fa-check-double text-sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{t("Modules Completed")}</p>
                                <p className="text-lg font-bold text-gray-800">
                                  {viewedCount} <span className="text-sm font-normal text-gray-400">/ {totalMods}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                                <i className="fas fa-clipboard-list text-sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{t("Quizzes Taken")}</p>
                                <p className="text-lg font-bold text-gray-800">{quizzesTaken}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                <i className="fas fa-percentage text-sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{t("Average Quiz Score")}</p>
                                <p className="text-lg font-bold text-gray-800">
                                  {avgScore}% <span className="text-sm font-normal text-gray-400">{"\u2022"} {passRate}% {t("pass rate")}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                                <i className="fas fa-clock text-sm" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{t("Remaining")}</p>
                                <p className="text-lg font-bold text-gray-800">{remaining} <span className="text-sm font-normal text-gray-400">{t("modules")}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <i className="fas fa-award text-amber-500 text-sm" /> {t("Achievements")}
                        </h3>
                        <div className="space-y-3">
                          {achievements.length === 0 ? (
                            <div className="text-center py-6">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                <i className="fas fa-flag-checkered text-gray-300 text-lg" />
                              </div>
                              <p className="text-xs text-gray-400">{t("Complete modules and quizzes to earn achievements")}</p>
                            </div>
                          ) : (
                            achievements.map((a) => (
                              <div key={a.title} className={`flex items-start gap-3 p-3 rounded-lg ${a.highlight ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"}`}>
                                <div className={`w-10 h-10 rounded-full ${a.color} flex items-center justify-center text-white text-lg shrink-0`}>
                                  <i className={`fas ${a.icon}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                        <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
                          <i className="fas fa-award text-amber-500 text-sm" /> {t("Badges")} <span className="text-sm font-normal text-gray-400">({completedResources.length} earned)</span>
                        </h3>
                        {completedResources.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-medal text-gray-300 text-xl" />
                            </div>
                            <p className="text-sm text-gray-400">{t("Complete a course to earn your first badge")}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {completedResources.map((r, i) => {
                              const badge = getBadge(r.subject)
                              const subjIcon = getSubjectIcon(r.subject)
                              const gradients = [
                                "from-amber-400 via-orange-400 to-red-400",
                                "from-blue-400 via-indigo-400 to-purple-400",
                                "from-emerald-400 via-teal-400 to-cyan-400",
                                "from-fuchsia-400 via-pink-400 to-rose-400",
                                "from-violet-400 via-purple-400 to-fuchsia-400",
                                "from-sky-400 via-blue-400 to-indigo-400",
                                "from-lime-400 via-green-400 to-emerald-400",
                                "from-rose-400 via-red-400 to-orange-400",
                                "from-cyan-400 via-teal-400 to-blue-400",
                                "from-yellow-400 via-amber-400 to-orange-400",
                                "from-pink-400 via-rose-400 to-red-400",
                                "from-teal-400 via-cyan-400 to-sky-400",
                                "from-orange-400 via-red-400 to-rose-400",
                                "from-indigo-400 via-violet-400 to-purple-400",
                                "from-green-400 via-emerald-400 to-teal-400",
                                "from-purple-400 via-fuchsia-400 to-pink-400",
                              ]
                              const gradient = gradients[i % gradients.length]
                              return (
                                <div key={r.id} className="group relative rounded-xl border border-gray-200/60 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                  style={{ animation: `fadeIn 0.4s ease-out ${i * 0.05}s both` }}>
                                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute -inset-full top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
                                  </div>
                                  <div className="relative p-4 flex flex-col items-center text-center">
                                    <div className="relative"
                                      style={{ animation: `badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05 + 0.15}s both` }}>
                                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-black/10 ring-2 ring-white/50 mb-3 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-black/20 transition-all duration-300`}>
                                        <span className="text-2xl drop-shadow-sm">{badge}</span>
                                      </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full ${subjIcon.bg} ${subjIcon.color} flex items-center justify-center text-xs ring-2 ring-white absolute top-2 right-2 shadow-sm`}>
                                      <i className={`fas ${subjIcon.icon}`} />
                                    </div>
                                    <p className="text-[11px] font-semibold text-gray-700 leading-tight truncate w-full">{r.title}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                      <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <i className="fas fa-star text-[7px]" /> Completed
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(() => {
                        const renderPagination = (total: number, page: number, setPage: (p: number) => void) => {
                          const totalPages = Math.ceil(total / PER_PAGE)
                          if (totalPages <= 1) return null
                          return (
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                                className="w-7 h-7 rounded flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                                <i className="fas fa-chevron-left" />
                              </button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                  <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[28px] h-7 rounded text-xs font-medium transition ${p === page ? "bg-navy-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                                    {p}
                                  </button>
                                ))}
                              </div>
                              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                                className="w-7 h-7 rounded flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                                <i className="fas fa-chevron-right" />
                              </button>
                            </div>
                          )
                        }

                        const classTotal = leaderboardData.classRanks.length
                        const classSlice = leaderboardData.classRanks.slice((classPage - 1) * PER_PAGE, classPage * PER_PAGE)
                        const batchTotal = leaderboardData.batchRanks.length
                        const batchSlice = leaderboardData.batchRanks.slice((batchPage - 1) * PER_PAGE, batchPage * PER_PAGE)

                        return (
                          <>
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
                              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-trophy text-amber-500 text-sm" /> {t("Class Leaderboard")}
                              </h3>
                              <div className="flex-1">
                                {leaderboardLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : classTotal === 0 ? (
                                  <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                      <i className="fas fa-users text-gray-300 text-lg" />
                                    </div>
                                    <p className="text-xs text-gray-400">{t("No other students in your class yet")}</p>
                                  </div>
                                ) : (
                                  classSlice.map((s) => (
                                    <div key={s.name} className={`flex items-center gap-3 p-2 rounded-lg ${s.highlight ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"}`}>
                                      <span className={`w-6 h-6 rounded-full ${s.rankBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{s.rank}</span>
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold shrink-0">{s.initials}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                                          {s.highlight && <span className="text-[9px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">You</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{s.section}</p>
                                      </div>
                                      <span className={`text-sm font-semibold shrink-0 ${s.scoreColor}`}>{s.score}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                              {renderPagination(classTotal, classPage, setClassPage)}
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
                              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-globe text-navy-500 text-sm" /> {t("Batch Leaderboard")}
                              </h3>
                              <div className="flex-1">
                                {leaderboardLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : batchTotal === 0 ? (
                                  <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                      <i className="fas fa-users text-gray-300 text-lg" />
                                    </div>
                                    <p className="text-xs text-gray-400">{t("No other students enrolled yet")}</p>
                                  </div>
                                ) : (
                                  batchSlice.map((s) => (
                                    <div key={s.name} className={`flex items-center gap-3 p-2 rounded-lg ${s.highlight ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"}`}>
                                      <span className={`w-6 h-6 rounded-full ${s.rankBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{s.rank}</span>
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold shrink-0">{s.initials}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                                          {s.highlight && <span className="text-[9px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">You</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{s.section}</p>
                                      </div>
                                      <span className="text-sm font-semibold text-green-600 shrink-0">{s.score}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                              {renderPagination(batchTotal, batchPage, setBatchPage)}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </>
                )
              })()}
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

      {activeAssessment && (() => {
        const r = resources.find(r => r.id === activeAssessment.resourceId)
        if (!r?.assessment) return null
        return (
          <AssessmentTaker
            resourceId={r.id}
            assessmentId={`${r.id}_final`}
            assessment={r.assessment}
            studentId={user?.uid || ""}
            studentName={profile?.displayName || "Student"}
            onClose={() => setActiveAssessment(null)}
          />
        )
      })()}

      {activeModuleTask && (() => {
        const { resource: r, moduleIdx, task } = activeModuleTask
        const taskTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
          assignment: { icon: "fa-book-open", color: "#1A73E8", label: "Assignment" },
          quiz: { icon: "fa-clipboard-list", color: "#0F9D58", label: "Quiz" },
          discussion: { icon: "fa-comments", color: "#E67C13", label: "Discussion" },
          material: { icon: "fa-newspaper", color: "#673AB7", label: "Material" },
        }
        const cfg = taskTypeConfig[task.type] || taskTypeConfig.assignment

        if (task.type === "quiz" && task.assessment) {
          const quizSub = quizSubmissions[`${r.id}_${moduleIdx}`]
          if (quizSub) {
            const pct = Math.round((quizSub.score / quizSub.total) * 100)
            const mod = r.modules?.[moduleIdx]
            const canRetake = !quizSub.passed && (mod?.adaptiveRules?.prerequisite?.enabled || mod?.adaptiveRules?.remediation?.enabled)
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveModuleTask(null)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className={`px-6 py-8 text-center ${quizSub.passed ? "bg-gradient-to-br from-green-50 to-emerald-50" : "bg-gradient-to-br from-red-50 to-orange-50"}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${quizSub.passed ? "bg-green-100" : "bg-red-100"}`}>
                      <i className={`fas ${quizSub.passed ? "fa-check text-green-500" : "fa-times text-red-500"} text-3xl`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{quizSub.passed ? "Quiz Passed!" : "Quiz Failed"}</h3>
                    <p className="text-sm text-gray-500">{task.title || "Quiz"}</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{quizSub.score}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Correct</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{quizSub.total}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${quizSub.passed ? "text-green-600" : "text-red-500"}`}>{pct}%</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Score</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canRetake && (
                        <button onClick={() => setActiveModuleTask({ resource: r, moduleIdx, task })}
                          className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                          <i className="fas fa-redo mr-1" />Retry
                        </button>
                      )}
                      <button onClick={() => setActiveModuleTask(null)}
                        className={`${canRetake ? "flex-1" : "w-full"} py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition`}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          return (
            <AssessmentTaker
              resourceId={r.id}
              assessmentId={`${r.id}_${moduleIdx}_${task.id}`}
              assessment={task.assessment}
              studentId={user?.uid || ""}
              studentName={profile?.displayName || "Student"}
              onClose={() => setActiveModuleTask(null)}
              context="quiz"
              moduleIdx={moduleIdx}
              allowRetake={!!(r.modules?.[moduleIdx]?.adaptiveRules?.prerequisite?.enabled || r.modules?.[moduleIdx]?.adaptiveRules?.remediation?.enabled)}
              onComplete={(result) => onQuizComplete(r, moduleIdx, result)}
            />
          )
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveModuleTask(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.color + "18" }}>
                    <i className={`fas ${cfg.icon} text-sm`} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                    <h3 className="text-sm font-bold text-gray-800">{task.title || cfg.label}</h3>
                  </div>
                </div>
                <button onClick={() => setActiveModuleTask(null)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <i className="fas fa-times text-gray-400 text-xs" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {task.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                    <div className="tiptap-preview prose prose-sm max-w-none text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: task.description }} />
                  </div>
                )}
                {(task.dueDate || task.points !== undefined) && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.dueDate && <span><i className="far fa-calendar mr-1" />Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                    {task.points !== undefined && <span><i className="far fa-star mr-1" />{task.points} points</span>}
                  </div>
                )}
                {task.attachments && task.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</p>
                    <div className="space-y-2">
                      {task.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <i className="fas fa-paperclip text-gray-400 text-xs" />
                          <span className="text-sm text-gray-600 truncate flex-1">{att.name || `Attachment ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {task.rubric && task.rubric.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rubric</p>
                    <div className="space-y-2">
                      {task.rubric.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{r.criterion}</p>
                            {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                          </div>
                          <span className="text-xs font-semibold text-gray-500 shrink-0">{r.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {task.type === "assignment" && (() => {
                  const subKey = `${r.id}_${moduleIdx}_${task.id}`
                  const existing = assignmentSubs[subKey]
                  const isEditing = updatingSubKey === subKey
                  if (existing && !isEditing) {
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                          <i className="fas fa-check-circle" /> Submitted
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
                          <i className="fas fa-file text-green-500" />
                          <span className="text-sm text-gray-700 font-medium truncate flex-1">{existing.fileName}</span>
                          <span className="text-xs text-gray-400">{existing.submittedAt ? new Date(existing.submittedAt).toLocaleDateString() : ""}</span>
                        </div>
                        {existing.note && (
                          <div className="bg-white rounded-lg border border-green-100 p-3">
                            <p className="text-xs text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{existing.note}</p>
                          </div>
                        )}
                        <button onClick={() => { setUpdatingSubKey(subKey); setTaskFile(null); setTaskNote(existing.note || "") }}
                          className="w-full mt-1 py-2 text-sm font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition flex items-center justify-center gap-2">
                          <i className="fas fa-exchange-alt text-xs" /> Change File
                        </button>
                      </div>
                    )
                  }
                  return (
                    <>
                      {isEditing && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm font-medium">
                          <i className="fas fa-pencil-alt text-xs" /> Updating submission — upload a new file to replace the old one
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attach file</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-navy-400 transition cursor-pointer"
                          onClick={() => document.getElementById("task-file-input")?.click()}>
                          {taskFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-600 flex items-center justify-center">
                                <i className="fas fa-file text-lg" />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-700">{taskFile.name}</p>
                                <p className="text-xs text-gray-400">{(taskFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setTaskFile(null) }}
                                className="text-xs text-red-500 hover:text-red-600 ml-2">Remove</button>
                            </div>
                          ) : (
                            <div>
                              <i className="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2" />
                              <p className="text-sm text-gray-500">{isEditing ? "Choose a new file" : "Choose File"}</p>
                              <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, or image files</p>
                            </div>
                          )}
                        </div>
                        <input id="task-file-input" type="file" className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) setTaskFile(e.target.files[0]) }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add notes</label>
                        <textarea value={taskNote} onChange={(e) => setTaskNote(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 resize-none"
                          rows={3} placeholder="Add notes" />
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                {task.type === "assignment" && (() => {
                  const subKey = `${r.id}_${moduleIdx}_${task.id}`
                  const existing = assignmentSubs[subKey]
                  const isEditing = updatingSubKey === subKey
                  if (existing && !isEditing) {
                    return (
                      <button onClick={() => { setUpdatingSubKey(subKey); setTaskFile(null); setTaskNote(existing.note || "") }}
                        className="px-5 py-2 border border-navy-200 text-navy-600 text-sm font-medium rounded-lg hover:bg-navy-50 transition flex items-center gap-2">
                        <i className="fas fa-eye text-xs" /> View Submission
                      </button>
                    )
                  }
                  return (
                    <>
                      {isEditing && (
                        <button onClick={() => { setUpdatingSubKey(null); setTaskFile(null); setTaskNote("") }}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      )}
                      <button onClick={async () => {
                        if (!taskFile) return
                        try {
                          const docId = `${user?.uid}_${r.id}_${moduleIdx}_${task.id}`
                          await setDoc(doc(db, "assignmentSubmissions", docId), {
                            studentId: user?.uid || "",
                            resourceId: r.id,
                            moduleIdx,
                            taskId: task.id,
                            fileName: taskFile.name,
                            note: taskNote,
                            submittedAt: new Date().toISOString(),
                          })
                          setAssignmentSubs(prev => ({ ...prev, [subKey]: { fileName: taskFile.name, note: taskNote, submittedAt: new Date().toISOString() } }))
                          setTaskFile(null)
                          setTaskNote("")
                          setUpdatingSubKey(null)
                        } catch (e) {
                          console.error("Failed to submit assignment:", e)
                        }
                      }}
                        className="px-5 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!taskFile}>
                        <i className="fas fa-paper-plane text-xs" /> {isEditing ? "Update Submission" : "Submit"}
                      </button>
                    </>
                  )
                })()}
                <button onClick={() => setActiveModuleTask(null)} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function ModuleCard({ title, subtitle, icon, color, lessonsText, pct, btnText, status, onClick }: {
  title: string
  subtitle: string
  icon: string
  color: string
  lessonsText: string
  pct: number
  btnText: string
  status: "start" | "continue" | "finished"
  onClick: () => void
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
    const timer = setTimeout(() => setAnimPct(pct), 200)
    return () => clearTimeout(timer)
  }, [visible, pct])

  let btnClass = "w-full py-2 text-sm font-medium rounded-lg transition "
  if (status === "start") {
    btnClass += "bg-navy-500 text-white hover:bg-navy-600 shadow-sm"
  } else if (status === "finished") {
    btnClass += "bg-green-600 text-white hover:bg-green-700"
  } else {
    btnClass += "bg-purple-500 text-white hover:bg-purple-600 shadow-sm"
  }

  return (
    <div ref={ref} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col relative overflow-hidden">
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-sm`}>
            <i className={`fas ${icon} text-2xl`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base leading-tight">{title}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${status === "finished" ? "bg-green-100" : "bg-amber-100"}`}>
            <i className={`fas ${status === "finished" ? "fa-check-circle text-green-500" : "fa-arrow-right text-amber-500"} text-sm`} />
          </div>
        </div>
        <p className="text-xs text-gray-500 font-medium mb-3">{lessonsText}</p>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
            <span className={`text-[11px] font-bold ${pct >= 100 ? "text-green-600" : pct > 0 ? "text-purple-600" : "text-gray-400"}`}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? "bg-green-500" : "bg-purple-500"}`}
              style={{ width: `${animPct}%` }} />
          </div>
        </div>
        <div className="mt-auto">
          <button className={btnClass} onClick={onClick}>
            {btnText}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleModal({ resource, viewedModules, quizSubmissions, onClose, onViewContent, onToggleUnread, t }: {
  resource: Resource | null
  viewedModules: number[]
  quizSubmissions: Record<string, { score: number; total: number; passed: boolean }>
  onClose: () => void
  onViewContent: (resource: Resource, moduleIdx: number) => void
  onToggleUnread: (resourceId: string, moduleIdx: number) => void
  t: (text: string) => string
}) {
  if (!resource) return null

  const mods = resource.modules || []
  const viewedCount = viewedModules.length
  const totalMods = mods.length
  const progressPct = totalMods > 0 ? Math.round((viewedCount / totalMods) * 100) : 0
  const subjIcon = getSubjectIcon(resource.subject)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${subjIcon.bg.includes("red") ? "from-red-50 to-red-100/50" : subjIcon.bg.includes("blue") ? "from-blue-50 to-blue-100/50" : subjIcon.bg.includes("purple") ? "from-purple-50 to-purple-100/50" : subjIcon.bg.includes("amber") ? "from-amber-50 to-amber-100/50" : subjIcon.bg.includes("cyan") ? "from-cyan-50 to-cyan-100/50" : subjIcon.bg.includes("pink") ? "from-pink-50 to-pink-100/50" : subjIcon.bg.includes("orange") ? "from-orange-50 to-orange-100/50" : subjIcon.bg.includes("rose") ? "from-rose-50 to-rose-100/50" : subjIcon.bg.includes("indigo") ? "from-indigo-50 to-indigo-100/50" : subjIcon.bg.includes("emerald") ? "from-emerald-50 to-emerald-100/50" : "from-navy-50 to-navy-100/50"}`} />
          <div className="relative px-6 py-6 flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${subjIcon.bg} ${subjIcon.color}`}>
              <i className={`fas ${subjIcon.icon} text-2xl`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-800 leading-tight">{resource.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{resource.subject}</p>
              {resource.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{resource.description}</p>}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 text-gray-600 shadow-sm">
                  <i className="fas fa-layer-group mr-1" />{mods.length} module{mods.length !== 1 ? "s" : ""}
                </span>
                {mods.reduce((acc, m) => acc + (m.blocks?.length || 0), 0) > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 text-gray-600 shadow-sm">
                    <i className="fas fa-th-large mr-1" />{mods.reduce((acc, m) => acc + (m.blocks?.length || 0), 0)} blocks
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition shrink-0">
              <i className="fas fa-times text-gray-500" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalMods > 0 && (
          <div className="px-6 pb-4 pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500">{viewedCount} of {totalMods} modules viewed</span>
              <span className="text-[11px] font-bold text-navy-600">{progressPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-green-500" : progressPct > 0 ? "bg-navy-500" : "bg-gray-300"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Module list */}
        <div className="p-4 max-h-[55vh] overflow-y-auto">
          {mods.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-gray-100">
                <i className="fas fa-book-open text-xl text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">No modules yet</p>
              <p className="text-xs text-gray-400 mt-1">Modules will appear here once created</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mods.map((m, i) => {
                const blockCount = m.blocks?.length || 0
                const hasContent = blockCount > 0
                const isViewed = viewedModules.includes(i)
                const prevMod = i > 0 ? mods[i - 1] : null
                const prevRules = prevMod?.adaptiveRules
                const prvEnabled = prevRules?.prerequisite?.enabled && prevMod?.tasks?.some(t => t.type === "quiz")
                const prvKey = prvEnabled ? `${resource.id}_${i - 1}` : null
                const prvSub = prvKey ? quizSubmissions[prvKey] : null
                const prvScore = prvSub ? (prvSub.score / prvSub.total) * 100 : 0
                const prvFailed = prvEnabled ? !prvSub || prvScore < prevRules!.prerequisite.minScore : false
                const seqLocked = !isViewed && i > 0 && !viewedModules.includes(i - 1)
                const prereqLocked = !isViewed && i > 0 && !seqLocked && prvFailed
                const isLocked = seqLocked || prereqLocked
                const lockReason = prereqLocked ? `Score ${Math.round(prvScore)}% — need ${prevRules!.prerequisite.minScore}% on "${prevMod!.name || `Module ${i}`}" quiz` : null
                return (
                  <button
                    key={i}
                    onClick={() => { if (!isLocked) onViewContent(resource, i) }}
                    className={`w-full text-left p-4 rounded-xl border transition-all group ${isLocked ? "border-gray-100 bg-gray-50/50 cursor-not-allowed opacity-60" : "border-gray-100 hover:border-navy-200 hover:bg-navy-50/50"}`}
                    disabled={isLocked}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition ${isLocked ? "bg-gray-200 text-gray-400" : isViewed ? "bg-green-500 text-white" : "bg-navy-500/10 text-navy-600 group-hover:bg-navy-500 group-hover:text-white"}`}>
                        {isLocked ? <i className="fas fa-lock text-xs" /> : isViewed ? <i className="fas fa-check" /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate transition ${isLocked ? "text-gray-400" : "text-gray-800 group-hover:text-navy-600"}`}>{m.name || `Module ${i + 1}`}</span>
                          {isLocked && !prereqLocked && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">
                              <i className="fas fa-lock mr-0.5" />Locked
                            </span>
                          )}
                          {prereqLocked && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 shrink-0" title={lockReason || ""}>
                              <i className="fas fa-exclamation-triangle mr-0.5" />Prerequisite
                            </span>
                          )}
                          {isViewed && (
                            <span
                              onClick={(e) => { e.stopPropagation(); onToggleUnread(resource.id, i) }}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-600 shrink-0 hover:bg-amber-50 hover:text-amber-600 transition cursor-pointer"
                              title="Mark as unread"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onToggleUnread(resource.id, i) } }}
                            >
                              <i className="fas fa-check-circle mr-0.5" />Viewed
                            </span>
                          )}
                          {!isViewed && hasContent && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">
                              <i className="fas fa-book-open mr-0.5" />New
                            </span>
                          )}
                          {!isViewed && !hasContent && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">
                              Empty
                            </span>
                          )}
                        </div>
                        {m.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{m.description}</p>}
                        {hasContent && (
                          <div className="flex items-center gap-2 mt-2">
                            {(() => {
                              const types = { content: 0, image: 0, table: 0 }
                              m.blocks!.forEach(b => { if (b.type in types) types[b.type as keyof typeof types]++ })
                              return (
                                <>
                                  {types.content > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium"><i className="fas fa-align-left mr-0.5" />{types.content}</span>}
                                  {types.image > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-500 font-medium"><i className="fas fa-image mr-0.5" />{types.image}</span>}
                                  {types.table > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 font-medium"><i className="fas fa-table mr-0.5" />{types.table}</span>}
                                </>
                              )
                            })()}
                            <span className="text-[10px] text-gray-400">{blockCount} block{blockCount !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                      <i className="fas fa-arrow-right text-gray-300 text-xs mt-3 group-hover:text-navy-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleViewer({ data, viewedModules, onBack, onNavigate, onMarkViewed, onGoToProgress, user, t, quizSubmissions, assignmentSubs }: {
  data: { resource: Resource; moduleIdx: number } | null
  viewedModules: number[]
  onBack: () => void
  onNavigate: (moduleIdx: number) => void
  onMarkViewed: (resourceId: string, moduleIdx: number) => void
  onGoToProgress: (resourceId: string, moduleIdx: number) => void
  user: { uid: string; displayName?: string | null; email?: string | null } | null
  t: (text: string) => string
  quizSubmissions: Record<string, { score: number; total: number; passed: boolean }>
  assignmentSubs: Record<string, { fileName: string; note: string; submittedAt: string }>
}) {
  const [confirmNav, setConfirmNav] = useState<null | { target: number | "back" }>(null)
  const [congratsState, setCongratsState] = useState<{ resourceId: string; moduleIdx: number; moduleName: string } | null>(null)

  if (!data) return null

  const mods = data.resource.modules || []
  const mod = mods[data.moduleIdx]
  if (!mod) return null

  const totalBlocks = (mod.blocks || []).length
  const blockTypeCounts = { content: 0, image: 0, table: 0 }
  ;(mod.blocks || []).forEach(b => { if (b.type in blockTypeCounts) blockTypeCounts[b.type as keyof typeof blockTypeCounts]++ })

  const areTasksComplete = (resource: Resource, moduleIdx: number): boolean => {
    const m = resource.modules?.[moduleIdx]
    if (!m || !m.tasks || m.tasks.length === 0) return true
    return m.tasks.every(t => {
      if (t.type === "quiz") return !!quizSubmissions[`${resource.id}_${moduleIdx}`]?.passed
      if (t.type === "assignment") return !!assignmentSubs[`${resource.id}_${moduleIdx}_${t.id}`]
      return true
    })
  }

  const handleConfirmMarkRead = () => {
    const navTarget = confirmNav ? confirmNav.target : null
    setConfirmNav(null)
    if (data && !viewedModules.includes(data.moduleIdx)) {
      onMarkViewed(data.resource.id, data.moduleIdx)
      setCongratsState({ resourceId: data.resource.id, moduleIdx: data.moduleIdx, moduleName: mod.name || `Module ${data.moduleIdx + 1}` })
    } else {
      if (data) onMarkViewed(data.resource.id, data.moduleIdx)
      if (navTarget !== null) {
        if (navTarget === "back") onBack()
        else onNavigate(navTarget)
      }
    }
  }

  const handleConfirmGoBackUnread = () => {
    setConfirmNav(null)
    onBack()
  }

  const handleCongratsViewTasks = () => {
    const state = congratsState
    setCongratsState(null)
    if (state) onGoToProgress(state.resourceId, state.moduleIdx)
  }

  const handleCongratsContinue = () => {
    const state = congratsState
    setCongratsState(null)
    if (data) {
      const nextIdx = data.moduleIdx + 1
      if (nextIdx < mods.length) onNavigate(nextIdx)
      else onBack()
    }
  }



  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <button onClick={() => viewedModules.includes(data.moduleIdx) ? onBack() : setConfirmNav({ target: "back" })} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
          <i className="fas fa-arrow-left text-gray-500 text-sm" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-0.5">
            <span className="truncate">{data.resource.title}</span>
            <i className="fas fa-chevron-right text-[8px] shrink-0" />
            <span className="font-medium text-navy-500 shrink-0">Module {data.moduleIdx + 1} of {mods.length}</span>
          </div>
          <h3 className="text-sm font-bold text-gray-800 truncate">{mod.name || `Module ${data.moduleIdx + 1}`}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {totalBlocks > 0 && (
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg hidden sm:inline">
              {totalBlocks} block{totalBlocks !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => viewedModules.includes(data.moduleIdx) ? onBack() : setConfirmNav({ target: "back" })} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <i className="fas fa-times text-gray-500 text-sm" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* Module header card */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-navy-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {data.moduleIdx + 1}
              </span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{mod.name || `Module ${data.moduleIdx + 1}`}</h1>
                {data.resource.subject && <p className="text-xs text-gray-400 mt-0.5">{data.resource.subject}</p>}
              </div>
            </div>
            {mod.description && (
              <p className="text-sm text-gray-500 leading-relaxed ml-[52px]">{mod.description}</p>
            )}
            {totalBlocks > 0 && (
              <div className="flex items-center gap-2 mt-4 ml-[52px]">
                {blockTypeCounts.content > 0 && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600"><i className="fas fa-align-left mr-1" />{blockTypeCounts.content} content</span>}
                {blockTypeCounts.image > 0 && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-600"><i className="fas fa-image mr-1" />{blockTypeCounts.image} image{blockTypeCounts.image !== 1 ? "s" : ""}</span>}
                {blockTypeCounts.table > 0 && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600"><i className="fas fa-table mr-1" />{blockTypeCounts.table} table{blockTypeCounts.table !== 1 ? "s" : ""}</span>}
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gray-200 mb-8" />

          {/* Blocks */}
          {(!mod.blocks || mod.blocks.length === 0) ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-gray-100">
                <i className="fas fa-file-alt text-3xl text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500 mb-1">{t("No content yet")}</p>
              <p className="text-sm text-gray-400">{t("This module is being prepared")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mod.blocks.map((block, blockIdx) => (
                <div key={block.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-x-auto overflow-y-hidden">
                  {/* Block header */}
                  {block.topic ? (
                    <div className="px-5 pt-4 pb-3 border-b border-gray-50">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          block.type === "content" ? "bg-blue-50 text-blue-600" :
                          block.type === "image" ? "bg-green-50 text-green-600" :
                          "bg-purple-50 text-purple-600"
                        }`}>
                          {blockIdx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-gray-800">{block.topic}</h4>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 pt-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        block.type === "content" ? "bg-blue-50 text-blue-500" :
                        block.type === "image" ? "bg-green-50 text-green-500" :
                        "bg-purple-50 text-purple-500"
                      }`}>
                        {block.type === "content" && <i className="fas fa-align-left" />}
                        {block.type === "image" && <i className="fas fa-image" />}
                        {block.type === "table" && <i className="fas fa-table" />}
                        {block.type}
                      </span>
                    </div>
                  )}

                  {/* Block body */}
                  <div className="px-5 pb-5 pt-3 overflow-x-auto">
                    {(() => {
                      const allImages: { src: string; alt: string }[] = []
                      let textHtml = block.description || ""
                      if (textHtml) {
                        const tmp = document.createElement("div")
                        tmp.innerHTML = textHtml
                        tmp.querySelectorAll("img").forEach((img) => {
                          allImages.push({ src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "" })
                          img.remove()
                        })
                        textHtml = tmp.innerHTML.trim()
                      }
                      if (block.type === "image" && block.imageData) {
                        allImages.push({ src: block.imageData, alt: "" })
                      }
                      return (
                        <>
                          {textHtml && (
                            <div
                              className="tiptap-preview prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: textHtml }}
                            />
                          )}
                          {allImages.length > 0 && (
                            <ImageCarousel images={allImages} />
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Module navigation */}
          {(() => {
            const tasksIncomplete = !areTasksComplete(data.resource, data.moduleIdx)
            const isOnLast = data.moduleIdx === mods.length - 1
            const nextDisabled = isOnLast || (viewedModules.includes(data.moduleIdx) && tasksIncomplete)
            return (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
              <button
                disabled={data.moduleIdx === 0}
                onClick={() => viewedModules.includes(data.moduleIdx) ? onNavigate(data.moduleIdx - 1) : setConfirmNav({ target: data.moduleIdx - 1 })}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i className="fas fa-chevron-left text-xs" />{t("Previous Module")}
              </button>
              <span className="text-xs text-gray-400">
                {data.moduleIdx + 1} / {mods.length}
              </span>
              <div className="relative group">
                <button
                  disabled={nextDisabled}
                  onClick={() => viewedModules.includes(data.moduleIdx) ? onNavigate(data.moduleIdx + 1) : setConfirmNav({ target: data.moduleIdx + 1 })}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-navy-500 rounded-xl hover:bg-navy-600 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {t("Next Module")}<i className="fas fa-chevron-right text-xs" />
                </button>
                {viewedModules.includes(data.moduleIdx) && tasksIncomplete && !isOnLast && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-lg">
                    Complete all tasks first
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                )}
              </div>
            </div>
            )
          })()}
        </div>
      </div>

      <style>{`
        .tiptap-preview img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }
        .tiptap-preview img[data-float="left"] { float: left; margin: 0.25rem 1rem 0.5rem 0; max-width: 50%; }
        .tiptap-preview img[data-float="right"] { float: right; margin: 0.25rem 0 0.5rem 1rem; max-width: 50%; }
        .tiptap-preview table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; table-layout: auto; }
        .tiptap-preview td, .tiptap-preview th { border: 1px solid #d1d5db; padding: 0.125rem 0.25rem; line-height: 1.4; }
        .tiptap-preview td p, .tiptap-preview th p { margin: 0; }
        .tiptap-preview th { background: #f3f4f6; font-weight: 600; }
        .tiptap-preview ul { list-style-type: disc; padding-left: 1.5rem; }
        .tiptap-preview ol { list-style-type: decimal; padding-left: 1.5rem; }
        .tiptap-preview blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75rem; color: #6b7280; font-style: italic; }
        .tiptap-preview a { color: #2563eb; text-decoration: underline; }
        .tiptap-preview p { margin: 0.25rem 0; }
      `}</style>

      {/* Congratulations Popup */}
      {congratsState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-8 pb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-5" style={{ animation: "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                <i className="fas fa-trophy text-3xl text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{(() => {
                const tc = (mods[congratsState.moduleIdx]?.tasks || []).length
                return tc > 0 ? "Well Done!" : "Amazing Work!"
              })()}</h3>
              <p className="text-sm text-gray-500 mb-1">{(() => {
                const tc = (mods[congratsState.moduleIdx]?.tasks || []).length
                const label = tc > 0 ? "You've finished reading" : "You've completed"
                return <>{label} <span className="font-semibold text-navy-600">{congratsState.moduleName}</span></>
              })()}</p>
              {(() => {
                const taskCount = (mods[congratsState.moduleIdx]?.tasks || []).length
                return taskCount > 0 ? (
                  <p className="text-sm text-gray-400 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-50 text-navy-600 text-xs font-semibold">
                      <i className="fas fa-list-check" />{taskCount} task{taskCount !== 1 ? "s" : ""} available
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">Keep going — your next module awaits!</p>
                )
              })()}
            </div>
            <div className="px-6 pb-6 space-y-2.5">
              {(() => {
                const taskCount = (mods[congratsState.moduleIdx]?.tasks || []).length
                const hasNext = data.moduleIdx + 1 < mods.length
                const tasksComplete = areTasksComplete(data.resource, congratsState.moduleIdx)
                return (
                  <>
                    {taskCount > 0 && (
                      <button onClick={handleCongratsViewTasks}
                        className="w-full py-3 bg-navy-500 text-white text-sm font-semibold rounded-xl hover:bg-navy-600 transition flex items-center justify-center gap-2 shadow-sm shadow-navy-500/20">
                        <i className="fas fa-list-check text-xs" />View Tasks
                      </button>
                    )}
                    {hasNext && tasksComplete ? (
                      <button onClick={handleCongratsContinue}
                        className={`w-full py-3 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${taskCount > 0 ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-navy-500 text-white hover:bg-navy-600 shadow-sm shadow-navy-500/20"}`}>
                        <i className="fas fa-arrow-right text-xs" />Continue to Next Module
                      </button>
                    ) : (
                      <button onClick={onBack}
                        className="w-full py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                        <i className="fas fa-arrow-left text-xs" />Back to Modules
                      </button>
                    )}
                    {hasNext && !tasksComplete && taskCount > 0 && (
                      <p className="text-center text-xs text-amber-600 font-medium">Complete all tasks to unlock the next module</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Navigation confirmation modal */}
      {confirmNav && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmNav(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-navy-500 to-navy-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <i className="fas fa-book-reader text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-medium opacity-70">Module {data.moduleIdx + 1} of {mods.length}</p>
                  <h3 className="text-base font-bold leading-tight">{mod.name || `Module ${data.moduleIdx + 1}`}</h3>
                </div>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{confirmNav?.target === "back" ? "Leave without completing? You can come back later to finish." : "You need to complete this module before moving on."}</p>
            </div>

            {/* Progress context */}
            <div className="px-6 py-4 bg-navy-50/50 border-b border-navy-100/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-500">Your progress in {data.resource.title}</span>
                <span className="text-[11px] font-bold text-navy-600">{viewedModules.length + 1}/{mods.length}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-navy-500 rounded-full transition-all duration-500" style={{ width: `${((viewedModules.length + (confirmNav ? 1 : 0)) / mods.length) * 100}%` }} />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-5">
              <div className="flex flex-col gap-2.5">
                {confirmNav?.target === "back" ? (
                  <button onClick={handleConfirmMarkRead}
                    className="w-full py-3 bg-navy-500 text-white text-sm font-semibold rounded-xl hover:bg-navy-600 transition flex items-center justify-center gap-2 shadow-sm shadow-navy-500/20">
                    <i className="fas fa-check-circle text-xs" /> Mark as Complete & Leave
                  </button>
                ) : (
                  <button onClick={handleConfirmMarkRead}
                    className="w-full py-3 bg-navy-500 text-white text-sm font-semibold rounded-xl hover:bg-navy-600 transition flex items-center justify-center gap-2 shadow-sm shadow-navy-500/20">
                    <i className="fas fa-check-circle text-xs" /> {viewedModules.includes(data.moduleIdx) ? "Continue" : "Complete & Continue"}
                  </button>
                )}
                {confirmNav?.target === "back" && (
                  <button onClick={handleConfirmGoBackUnread}
                    className="w-full py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                    <i className="fas fa-arrow-left text-xs text-gray-400" /> Go Back (Keep Unread)
                  </button>
                )}
                <button onClick={() => setConfirmNav(null)}
                  className="w-full py-2.5 text-gray-400 text-xs font-medium rounded-xl hover:text-gray-600 transition">
                  Stay on this module
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

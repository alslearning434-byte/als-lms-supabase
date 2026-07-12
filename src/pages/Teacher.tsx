import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"

import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { assignments } from "../data/assignments"
import { db } from "../firebase"
import { collection, getDocs, addDoc } from "firebase/firestore"
import type { NavItem, Resource } from "../types"

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "th-large" },
  { id: "cohorts", label: "My Cohorts", icon: "users" },
  { id: "submissions", label: "Submissions", icon: "tasks" },
  { id: "assessments", label: "Assessments", icon: "clipboard-list" },
  { id: "resources", label: "Resources", icon: "folder-open" },
  { id: "analytics", label: "Analytics", icon: "chart-line" },
  { id: "calendar", label: "Calendar", icon: "calendar-alt" },
  { id: "profile", label: "Profile", icon: "user-circle" }
]

export default function Teacher() {
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { logout, profile, updateProfile } = useAuth()
  const [activePage, setActivePage] = useState("dashboard")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calSelected, setCalSelected] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())
  const [cohortModal, setCohortModal] = useState(false)
  const [cohortLevel, setCohortLevel] = useState("")
  const [resourceUploadOpen, setResourceUploadOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [completionExpanded, setCompletionExpanded] = useState(false)
  const [assessments, setAssessments] = useState<{ title: string; description: string; questions: { text: string; type: string; options: string[] }[] }[]>([])
  const [assTitle, setAssTitle] = useState("")
  const [assDesc, setAssDesc] = useState("")
  const [assQuestions, setAssQuestions] = useState<{ text: string; type: string; options: string[] }[]>([])
  const [showPreview, setShowPreview] = useState<number | null>(null)
  const [newQText, setNewQText] = useState("")
  const [newQType, setNewQType] = useState("Multiple Choice")
  const [newQOptions, setNewQOptions] = useState<string[]>(["", ""])
  const [studentWorkModal, setStudentWorkModal] = useState<{ assignmentId: number; studentName: string } | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [aiChecking, setAiChecking] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [resSubject, setResSubject] = useState("")
  const [resTitle, setResTitle] = useState("")
  const [resFile, setResFile] = useState<File | null>(null)
  const [resUploading, setResUploading] = useState(false)
  const [resFileError, setResFileError] = useState("")
  const isDark = theme === "dark"

  const mockStudentWork: Record<string, string> = {
    "Juan Dela Cruz": "The quadratic formula is used to solve quadratic equations of the form ax² + bx + c = 0. The formula is x = (-b ± √(b² - 4ac)) / 2a. In this module, I learned how to apply this formula to various problems. For example, when solving x² + 5x + 6 = 0, we can factor it as (x + 2)(x + 3) = 0, giving us x = -2 and x = -3. I also practiced word problems involving quadratic equations, such as finding the dimensions of a rectangle given its area and perimeter. The key is to set up the equation correctly based on the problem statement. Understanding the discriminant b² - 4ac helps determine the nature of the roots. If it's positive, we get two real roots; if zero, one real root; if negative, complex roots.",
    "Maria Santos": "In this lab report I will discuss the experiment on plant growth. We placed three sets of bean seeds in different conditions: one with full sunlight, one with partial shade, and one in complete darkness. After two weeks, the seeds in full sunlight grew to an average height of 12cm with dark green leaves. The partial shade group grew to 8cm with lighter leaves. The group in complete darkness only reached 3cm and had pale yellow leaves. This shows that sunlight is essential for photosynthesis and plant growth. The chlorophyll in plants needs light to produce food through photosynthesis. Without light, plants cannot produce enough energy to grow properly. I also observed that the roots were less developed in the dark group, which means light also affects root growth indirectly.",
    "Pedro Reyes": "",
    "Anna Rivera": "I completed all my math exercises ahead of schedule. The module covered linear equations, inequalities, and systems of equations. I found the substitution method for solving systems of equations to be the most straightforward approach. For example, to solve the system x + y = 10 and 2x - y = 5, we can solve the first equation for y (y = 10 - x) and substitute into the second equation: 2x - (10 - x) = 5, which simplifies to 3x - 10 = 5, so x = 5 and y = 5. I also enjoyed the graphing method where we plot both lines on a coordinate plane and find their intersection point. The elimination method is useful when coefficients are already aligned. Overall, I feel confident about solving systems of linear equations in two variables.",
    "Luis Gomez": "The assignment asked us to solve 10 quadratic equations using the quadratic formula. I solved all of them correctly. The most challenging problem was 2x² - 7x + 3 = 0, where I had to carefully apply the formula. I checked my answers by substituting them back into the original equations. I also learned about completing the square method, which is another way to solve quadratic equations. This method involves adding a constant term to both sides to create a perfect square trinomial. For instance, x² + 6x + 5 = 0 can be rewritten as (x + 3)² = 4, giving x = -1 or x = -5. I think I am ready for the next module on rational expressions and equations.",
    "Elena Cruz": "",
    "Carlos Mendoza": "The lab experiment on chemical reactions was very informative. We mixed baking soda with vinegar and observed the release of carbon dioxide gas. The reaction equation is NaHCO₃ + CH₃COOH → CO₂ + H₂O + CH₃COONa. We measured the amount of gas produced and found that increasing the temperature accelerated the reaction rate. This is because the particles move faster at higher temperatures, increasing the frequency of successful collisions. We also tested the effect of concentration by using different amounts of vinegar. The reaction was faster with higher concentration, supporting the collision theory. I learned that catalysts can speed up reactions without being consumed. This experiment taught me the practical applications of chemical kinetics in everyday life, such as how baking powder works in cooking.",
    "Luzviminda Santos": "I finished the lab report on photosynthesis ahead of time. The experiment involved testing leaf samples for starch using iodine solution. Leaves exposed to sunlight turned blue-black, confirming the presence of starch produced during photosynthesis. The leaves kept in the dark showed no color change, meaning no starch was produced. This demonstrates that light is required for photosynthesis. The equation for photosynthesis is 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Plants use chlorophyll in their chloroplasts to capture light energy and convert it into chemical energy stored in glucose. Oxygen is released as a byproduct. I also learned about the factors affecting photosynthesis: light intensity, carbon dioxide concentration, and temperature. Understanding these factors helps farmers optimize crop growth in greenhouses.",
    "Ricardo Ramos": "I apologize for submitting this late. I had some technical issues with my computer. The lab experiment on chemical bonding was interesting. We studied ionic and covalent bonds. Ionic bonds form when electrons are transferred from a metal to a non-metal, like in NaCl. Covalent bonds form when atoms share electrons, like in H₂O. The properties of ionic compounds include high melting points and conductivity when dissolved in water. Covalent compounds have lower melting points and do not conduct electricity. I also learned about Lewis dot structures, which represent valence electrons as dots around the element symbol. Drawing these structures helps visualize how atoms bond together. I will make sure to submit my next assignment on time.",
    "Teresa Cruz": "",
    "Jose Rizal": "This essay discusses the theme of nationalism in Jose Rizal's novels Noli Me Tangere and El Filibusterismo. Rizal used his writings to expose the injustices of Spanish colonial rule in the Philippines. Through characters like Crisostomo Ibarra and Elias, he showed the suffering of the Filipino people under the friars and colonial officials. The novels also highlighted the importance of education and reform. Rizal believed that through knowledge and peaceful reform, the Filipino people could achieve their rights and freedom. His execution in 1896 sparked the Philippine Revolution. The novels remain relevant today as they remind us of the importance of critical thinking and standing up against oppression. I believe Rizal's message about education being the key to freedom is still important for modern Filipinos.",
    "Andres Bonifacio": "My essay on the Philippine Revolution is submitted early. The revolution of 1896 was a turning point in Philippine history. Andres Bonifacio founded the Katipunan, a secret society that aimed to gain independence from Spain through armed revolution. The Cry of Pugad Lawin marked the beginning of the revolution. Although Bonifacio was executed by his own countrymen, his legacy lives on. Emilio Aguinaldo later declared independence on June 12, 1898. The revolution showed the Filipino people's desire for freedom and self-governance. This topic taught me that unity is important for achieving common goals. The sacrifice of our heroes should not be forgotten. I also learned about the role of women in the revolution, such as Gabriela Silang and Melchora Aquino, who showed great bravery and patriotism.",
    "Gabriela Silang": "This paper analyzes the role of women in Philippine history. Women like Gabriela Silang, who led the Ilocano revolt after her husband's death, showed exceptional courage. Melchora Aquino, also known as Tandang Sora, provided shelter and support to Katipuneros despite her old age. Today, Filipino women continue to break barriers in various fields. The 1987 Constitution guarantees equal rights for women. The Magna Carta of Women (Republic Act 9710) further strengthens protection for women's rights. However, challenges remain such as gender-based violence and discrimination. I believe education is the key to achieving true gender equality. By learning about the contributions of women in history, we can appreciate their role in nation-building and work towards a more inclusive society.",
    "Emilio Aguinaldo": "",
    "Melchora Aquino": "I apologize for the late submission. The essay on the Katipunan and Philippine Revolution covers the founding of the secret society by Andres Bonifacio, the discovery of the Katipunan by the Spanish authorities, and the subsequent revolution. The Katipunan used a secret system of codes and symbols to communicate. Members were required to sign their names in their own blood as a sign of commitment. The society aimed for complete independence from Spain through armed struggle. The revolution spread across Luzon and eventually led to the declaration of independence in Kawit, Cavite. I learned that the Philippine Revolution was one of the first anti-colonial revolutions in Asia. It inspired other colonized nations to fight for their own freedom and independence.",
    "Antonio Luna": "The essay on Philippine nationalism discusses how the concept of nationhood developed in the Philippines during the Spanish colonial period. The propaganda movement led by Jose Rizal, Marcelo H. del Pilar, and Graciano Lopez Jaena advocated for reforms through their writings in La Solidaridad. The execution of the three Filipino priests - Gomez, Burgos, and Zamora - in 1872 sparked nationalist sentiments. Rizal's novels exposed the abuses of the colonial government and the Catholic Church. The Katipunan under Bonifacio took a more radical approach. I believe that understanding our history is important for developing a strong sense of national identity. The lessons from the revolution remind us of the value of freedom and democracy.",
    "Francisco Balagtas": "Ang Florante at Laura ay isang obra maestra ni Francisco Balagtas na isinulat noong 1838. Ito ay isang awit na may 399 na saknong at gumagamit ng sukat na lalabindalawahin. Ang kwento ay tungkol sa pag-iibigan nina Florante at Laura, ngunit sa likod nito ay may malalim na mensahe tungkol sa lipunan noong panahon ng Espanyol. Ang Albanya sa kwento ay sumisimbolo sa Pilipinas, at ang mga tauhan ay kumakatawan sa iba't ibang uri ng tao sa lipunan. Si Adolfo ang sumisimbolo sa mga mananakop at mapagpanggap na tao. Ipinakita ni Balagtas ang kanyang husay sa panitikan sa pamamagitan ng masining na paggamit ng mga tayutay at matatalinhagang salita. Ang akdang ito ay patunay ng angking talino ng mga Pilipino sa panitikan.",
    "Jose Garcia Villa": "Nai-submit ko ang aking sanaysay tungkol sa wika at panitikan ng Pilipinas. Ang wikang Filipino ay patuloy na umuunlad sa paglipas ng panahon. Maraming salita ang hiram mula sa Espanyol, Ingles, at iba pang mga wika. Ang Komisyon sa Wikang Filipino ay nagsusulong ng pagpapaunlad ng wikang pambansa. Ang panitikan naman ay sumasalamin sa kultura at karanasan ng mga Pilipino. Mula sa mga alamat at epiko noong sinaunang panahon, hanggang sa mga modernong kwento at tula, ang panitikan ay patuloy na nagbibigay-inspirasyon sa mga mambabasa. Mahalagang pag-aralan ang ating panitikan upang lubos nating maunawaan ang ating pagkakakilanlan bilang isang bansa.",
    "Nick Joaquin": "Pasensya na po sa late submission. Ang aking sanaysay ay tungkol kay Nick Joaquin at ang kanyang kontribusyon sa panitikang Pilipino. Si Joaquin ay isang Pambansang Alagad ng Sining sa Panitikan na sumulat sa wikang Ingles. Ang kanyang mga akda tulad ng The Woman Who Had Two Navels at ang kanyang mga maikling kwento ay nagpapakita ng kanyang husay sa pagsulat at malalim na pag-unawa sa kulturang Pilipino. Siya ay kilala rin bilang isang mamamahayag at mananalaysay. Ang kanyang estilo ng pagsulat ay naghahalo ng Ingles at Espanyol, na sumasalamin sa kolonyal na kasaysayan ng Pilipinas. Ang kanyang mga akda ay patuloy na pinag-aaralan sa mga paaralan at unibersidad.",
    "F. Sionil Jose": ""
  }

  useEffect(() => {
    const fetchResources = async () => {
      const snap = await getDocs(collection(db, "resources"))
      const items: Resource[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource))
      setResources(items)
    }
    fetchResources()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleResourceUpload = async () => {
    if (!resSubject.trim() || !resTitle.trim() || !resFile) return
    setResUploading(true)
    setResFileError("")
    try {
      const formData = new FormData()
      formData.append("file", resFile)
      const res = await fetch("http://localhost:3001/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const docRef = await addDoc(collection(db, "resources"), {
        subject: resSubject.trim(),
        title: resTitle.trim(),
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: profile?.displayName || "Teacher",
        uploadedAt: new Date().toISOString(),
      })
      setResources((prev) => [...prev, {
        id: docRef.id,
        subject: resSubject.trim(),
        title: resTitle.trim(),
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: profile?.displayName || "Teacher",
        uploadedAt: new Date().toISOString(),
      }])
      setResSubject("")
      setResTitle("")
      setResFile(null)
      setResourceUploadOpen(false)
    } catch {
      setResFileError("Upload failed. Make sure the server is running (npm run server).")
    } finally {
      setResUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return { icon: "fa-file-pdf", color: "bg-red-100 text-red-600" }
    if (fileType.includes("word") || fileType.includes("docx") || fileType.includes("doc")) return { icon: "fa-file-word", color: "bg-blue-100 text-blue-600" }
    return { icon: "fa-file", color: "bg-gray-100 text-gray-600" }
  }

  const goTo = (page: string) => {
    setActivePage(page)
    if (page === "submissions") setDetailId(null)
  }

  const showDetail = (id: number) => setDetailId(id)
  const backToGrid = () => setDetailId(null)

  const addQuestion = () => {
    if (!newQText.trim()) return
    const opts = newQType === "Multiple Choice" ? newQOptions.filter((o) => o.trim()) : []
    if (newQType === "Multiple Choice" && opts.length < 2) return
    setAssQuestions([...assQuestions, { text: newQText.trim(), type: newQType, options: newQType === "Multiple Choice" ? opts : newQType === "True/False" ? ["True", "False"] : [] }])
    setNewQText("")
    setNewQOptions(["", ""])
  }

  const saveAssessment = () => {
    if (!assTitle.trim() || assQuestions.length === 0) return
    setAssessments([...assessments, { title: assTitle.trim(), description: assDesc.trim(), questions: assQuestions }])
    setAssTitle(""); setAssDesc(""); setAssQuestions([]); setNewQText(""); setNewQType("Multiple Choice"); setNewQOptions(["", ""])
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { ahead: "bg-emerald-100 text-emerald-700", "on-time": "bg-blue-100 text-blue-700", late: "bg-orange-100 text-orange-700", missing: "bg-red-100 text-red-700" }
    return map[status] || "bg-gray-100 text-gray-700"
  }

  const colleagues = [
    { name: "Maria Santos", dept: "English", email: "maria.santos@als.edu", status: "Active", level: "Junior High School" },
    { name: "Juan Dela Cruz", dept: "STEM", email: "juan.dc@als.edu", status: "Active", level: "Senior High School" },
    { name: "Ana Gomez", dept: "Mathematics", email: "ana.gomez@als.edu", status: "Active", level: "Junior High School" },
    { name: "Carlos Tan", dept: "HUMSS", email: "carlos.tan@als.edu", status: "Inactive", level: "Senior High School" },
    { name: "Liza Santos", dept: "Science", email: "liza.santos@als.edu", status: "Active", level: "Junior High School" },
    { name: "Pedro Reyes", dept: "ABM", email: "pedro.reyes@als.edu", status: "Active", level: "Senior High School" },
    { name: "Rosa Mendoza", dept: "MAPEH", email: "rosa.mendoza@als.edu", status: "Active", level: "Junior High School" },
    { name: "Kevin Torres", dept: "TVL", email: "kevin.torres@als.edu", status: "Active", level: "Senior High School" }
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar title="ALS Learning" subtitle="Teacher Portal" items={navItems} activePage={activePage} onNavigate={goTo} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={profile?.displayName || "Teacher"} initials={profile?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "T"} userEmail={profile?.email || ""} notificationCount={5}
          onLogout={() => setLogoutOpen(true)} onProfile={() => goTo("profile")} onMenuToggle={() => setMobileMenuOpen(p => !p)} />

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Dashboard */}
          {activePage === "dashboard" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h2>
                <p className="text-gray-500 mt-1">Manage your cohorts and student progress</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {[
                  { label: "Total Enrolled Students", value: "247", icon: "fa-users", color: "bg-blue-100 text-blue-600" },
                  { label: "Pending Submissions", value: "18", icon: "fa-file-alt", color: "bg-amber-100 text-amber-600" },
                  { label: "Active Cohort", value: "4", icon: "fa-chalkboard", color: "bg-green-100 text-green-600" }
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className="text-4xl font-bold text-gray-800 mt-1">{s.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-full ${s.color} flex items-center justify-center`}>
                      <i className={`fas ${s.icon} text-2xl`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 bg-navy-500">
                  <h3 className="font-bold text-white">Class Cohorts Management</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Level", "Active Cohorts", "Last Updated", "Actions"].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        { level: "Junior High School", cohorts: 6, updated: "May 26, 2026" },
                        { level: "Senior High School", cohorts: 5, updated: "May 26, 2026" }
                      ].map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.level}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.cohorts} cohorts</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.updated}</td>
                          <td className="px-6 py-4 text-sm">
                            <button onClick={() => { setCohortLevel(c.level); setCohortModal(true) }} className="text-blue-600 hover:text-blue-800 font-medium bg-transparent border-none cursor-pointer">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-navy-500"><h3 className="font-bold text-white">Recent Submissions Activity Log</h3></div>
                <div className="divide-y divide-gray-200">
                  {[
                    { name: "Juan Dela Cruz", assignment: "Communication Skills - Essay Assignment", time: "May 18, 2026 - 10:30 AM", color: "bg-blue-100 text-blue-600" },
                    { name: "Maria Santos", assignment: "Scientific Literacy - Research Portfolio", time: "May 18, 2026 - 09:15 AM", color: "bg-green-100 text-green-600" },
                    { name: "Pedro Reyes", assignment: "Mathematical Reasoning - Problem Set 4", time: "May 17, 2026 - 04:45 PM", color: "bg-purple-100 text-purple-600" }
                  ].map((a) => (
                    <div key={a.name} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-full ${a.color} flex items-center justify-center flex-shrink-0`}>
                          <i className="fas fa-user-graduate text-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{a.name}</p>
                          <p className="text-sm text-gray-500">{a.assignment}</p>
                          <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition whitespace-nowrap">
                        <i className="fas fa-star text-xs mr-1" /> Review &amp; Grade
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cohorts */}
          {activePage === "cohorts" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Cohorts</h2>
                <p className="text-gray-500 mt-1">View and manage your fellow teachers</p>
              </div>
              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-navy-500">
                  <h3 className="font-bold text-white">My Cohorts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-navy-50 border-b border-gray-200">
                      <tr>
                        {["Name", "Department", "Email", "Status"].map((h) => (
                          <th key={h} className="px-6 py-3 text-xs font-semibold text-navy-700 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {colleagues.map((c, i) => (
                        <tr key={c.name} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.dept}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                          <td className="px-6 py-4 text-sm"><span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "Active" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Submissions */}
          {activePage === "submissions" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Assignments & Submissions</h2>
                <p className="text-gray-500 mt-1">Track and review student submissions</p>
              </div>

              {detailId === null ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignments.map((assign) => {
                    const submitted = assign.students.filter((s) => s.status !== "missing").length
                    const missing = assign.totalStudents - submitted
                    const ahead = assign.students.filter((s) => s.status === "ahead").length
                    const onTime = assign.students.filter((s) => s.status === "on-time").length
                    const late = assign.students.filter((s) => s.status === "late").length
                    return (
                      <div key={assign.id} onClick={() => showDetail(assign.id)}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 transition-all hover:shadow-md cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{assign.title}</h3>
                            <p className="text-sm text-gray-500">{assign.cohort} • Due: {assign.dueDate}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <i className="fas fa-file-alt" />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1"><i className="fas fa-check-circle text-green-500 text-xs" /><span className="text-gray-700">Submitted: {submitted}/{assign.totalStudents}</span></div>
                          <div className="flex items-center gap-1"><i className="fas fa-clock text-red-400 text-xs" /><span className="text-gray-700">Missing: {missing}</span></div>
                          <div className="flex items-center gap-1"><i className="fas fa-calendar-week text-blue-500 text-xs" /><span>Ahead: {ahead}</span></div>
                          <div className="flex items-center gap-1"><i className="fas fa-calendar-day text-green-600 text-xs" /><span>On time: {onTime}</span></div>
                          <div className="flex items-center gap-1"><i className="fas fa-hourglass-end text-orange-500 text-xs" /><span>Late: {late}</span></div>
                        </div>
                        <div className="mt-3 text-primary text-sm font-medium">Click to view student list →</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  {(() => {
                    const assign = assignments.find((a) => a.id === detailId)
                    if (!assign) return null
                    const submitted = assign.students.filter((s) => s.status !== "missing").length
                    const missing = assign.totalStudents - submitted
                    const ahead = assign.students.filter((s) => s.status === "ahead").length
                    const onTime = assign.students.filter((s) => s.status === "on-time").length
                    const late = assign.students.filter((s) => s.status === "late").length
                    return (
                      <div>
                        <button onClick={backToGrid} className="mb-4 flex items-center gap-2 text-primary hover:text-primary-700 transition">
                          <i className="fas fa-arrow-left" /> Back to Assignments
                        </button>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="p-5 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">{assign.title}</h3>
                            <p className="text-sm text-gray-500">{assign.cohort} • Due: {assign.dueDate}</p>
                          </div>
                          <div className="flex flex-col lg:flex-row">
                            <div className="flex-1 border-r border-gray-200 p-4">
                              <h4 className="font-semibold text-gray-800 mb-3">📋 Student List</h4>
                              <div className="max-h-96 overflow-y-auto">
                                {assign.students.map((s) => (
                                  <div key={s.name} className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="font-medium text-gray-800 cursor-pointer hover:text-primary transition" onClick={() => setStudentWorkModal({ assignmentId: assign.id, studentName: s.name })}>
                                      {s.name}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(s.status)}`}>
                                      {s.status === "ahead" ? "Ahead of time" : s.status === "on-time" ? "On time" : s.status === "late" ? "Late" : "Missing"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="w-full lg:w-80 p-4">
                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <h4 className="font-semibold text-gray-800 mb-3">📊 Submission Summary</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Submitted:</span>
                                    <span className="font-bold text-green-600">{submitted}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Missing:</span>
                                    <span className="font-bold text-red-600">{missing}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Students:</span>
                                    <span className="font-bold text-gray-800">{assign.totalStudents}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-800 mb-3">⏰ Submission Status</h4>
                                <div className="space-y-3">
                                  {[
                                    { label: "✅ Ahead of time", count: ahead, color: "bg-emerald-500", textColor: "text-emerald-600" },
                                    { label: "📅 On time", count: onTime, color: "bg-blue-500", textColor: "text-blue-600" },
                                    { label: "⚠️ Late", count: late, color: "bg-orange-500", textColor: "text-orange-600" },
                                    { label: "❌ Missing", count: missing, color: "bg-red-500", textColor: "text-red-600" }
                                  ].map((s) => (
                                    <div key={s.label}>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className={s.textColor}>{s.label}</span>
                                        <span className="font-medium">{s.count}</span>
                                      </div>
                                      <div className="progress-bar">
                                        <div className={`progress-fill ${s.color}`} style={{ width: `${(s.count / assign.totalStudents) * 100}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* Student Work Modal */}
          {studentWorkModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setStudentWorkModal(null); setAiScore(null); setAiChecking(false) }}>
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{studentWorkModal.studentName}</h3>
                    <p className="text-sm text-gray-500">{assignments.find(a => a.id === studentWorkModal.assignmentId)?.title}</p>
                  </div>
                  <button onClick={() => { setStudentWorkModal(null); setAiScore(null); setAiChecking(false) }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {(() => {
                    const work = mockStudentWork[studentWorkModal.studentName]
                    if (!work) {
                      return (
                        <div className="text-center py-16">
                          <i className="fas fa-exclamation-circle text-4xl text-gray-300 mb-3" />
                          <p className="text-gray-500">No submitted work found for this student.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-5">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fas fa-file-alt text-navy-500" /> Submitted Work
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{work}</p>
                        </div>
                        {aiScore !== null && (
                          <div className={`rounded-xl p-5 ${aiScore > 70 ? "bg-red-50 border border-red-200" : aiScore > 40 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <i className="fas fa-robot" /> AI Detection Result
                            </h4>
                            <div className="flex items-center gap-4">
                              <div className="relative w-20 h-20">
                                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={aiScore > 70 ? "#ef4444" : aiScore > 40 ? "#f59e0b" : "#22c55e"} strokeWidth="3" strokeDasharray={`${(aiScore / 100) * 97.4} 97.4`} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: aiScore > 70 ? "#ef4444" : aiScore > 40 ? "#f59e0b" : "#22c55e" }}>{aiScore}%</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{aiScore > 70 ? "High AI Probability" : aiScore > 40 ? "Moderate AI Probability" : "Low AI Probability"}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {aiScore > 70 ? "This submission appears to be largely AI-generated. Consider discussing with the student."
                                    : aiScore > 40 ? "Some parts may be AI-generated. Manual review recommended."
                                    : "This submission appears to be mostly original student work."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className="p-6 border-t border-gray-200 flex items-center justify-between shrink-0">
                  <span className="text-xs text-gray-400">
                    {mockStudentWork[studentWorkModal.studentName] ? `${mockStudentWork[studentWorkModal.studentName].split(" ").length} words` : "No content"}
                  </span>
                  {mockStudentWork[studentWorkModal.studentName] && (
                    <button onClick={() => {
                      if (aiChecking) return
                      setAiChecking(true)
                      setAiScore(null)
                      setTimeout(() => {
                        setAiScore(Math.floor(Math.random() * 60) + 20)
                        setAiChecking(false)
                      }, 1500 + Math.random() * 1000)
                    }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${aiChecking ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-navy-500 text-white hover:bg-navy-600"}`}>
                      {aiChecking ? (
                        <><i className="fas fa-spinner fa-spin text-xs" /> Checking...</>
                      ) : (
                        <><i className="fas fa-robot text-xs" /> Check AI</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assessments */}
          {activePage === "assessments" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Assessments</h2>
                <p className="text-gray-500 mt-1">Create and manage quizzes, exams, and activities</p>
              </div>

              {/* Create assessment form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-plus-circle text-navy-500" /> Create New Assessment
                </h3>

                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
                    <input type="text" value={assTitle} onChange={(e) => setAssTitle(e.target.value)}
                      placeholder="e.g., Quarter 1 Science Exam"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={assDesc} onChange={(e) => setAssDesc(e.target.value)} rows={2}
                      placeholder="Instructions or notes for this assessment"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 resize-none" />
                  </div>
                </div>

                {/* Questions */}
                {assQuestions.length > 0 && (
                  <div className="space-y-3 mb-5">
                    {assQuestions.map((q, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Question {i + 1} • {q.type}</span>
                          <button onClick={() => setAssQuestions(assQuestions.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 text-sm transition">
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-2">{q.text}</p>
                        {q.type === "Multiple Choice" && (
                          <ul className="space-y-1">
                            {q.options.map((o, j) => (
                              <li key={j} className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-400">{String.fromCharCode(65 + j)}</span>
                                {o}
                              </li>
                            ))}
                          </ul>
                        )}
                        {q.type === "True/False" && (
                          <div className="flex gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1"><i className="fas fa-check-circle text-green-500 text-xs" /> True</span>
                            <span className="flex items-center gap-1"><i className="fas fa-times-circle text-red-500 text-xs" /> False</span>
                          </div>
                        )}
                        {(q.type === "Short Answer" || q.type === "Essay") && (
                          <div className="h-8 rounded-lg border border-dashed border-gray-300 bg-white" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add question form */}
                <div className="bg-navy-500/5 rounded-xl p-4 border border-dashed border-navy-500/20">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Add a Question</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input type="text" value={newQText} onChange={(e) => setNewQText(e.target.value)}
                        placeholder="Enter question text"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                      <select value={newQType} onChange={(e) => setNewQType(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 appearance-none">
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="True/False">True/False</option>
                        <option value="Short Answer">Short Answer</option>
                        <option value="Essay">Essay</option>
                      </select>
                    </div>
                    {newQType === "Multiple Choice" && (
                      <div className="space-y-2">
                        {newQOptions.map((o, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 w-5">{String.fromCharCode(65 + j)}.</span>
                            <input type="text" value={o} onChange={(e) => {
                              const next = [...newQOptions]; next[j] = e.target.value; setNewQOptions(next)
                            }} placeholder={`Option ${String.fromCharCode(65 + j)}`}
                              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
                            {newQOptions.length > 2 && (
                              <button onClick={() => setNewQOptions(newQOptions.filter((_, k) => k !== j))}
                                className="text-red-400 hover:text-red-600 text-xs"><i className="fas fa-times" /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => setNewQOptions([...newQOptions, ""])}
                          className="text-xs text-navy-500 font-medium hover:text-navy-600 transition flex items-center gap-1">
                          <i className="fas fa-plus" /> Add option
                        </button>
                      </div>
                    )}
                    <button onClick={addQuestion}
                      disabled={!newQText.trim()}
                      className="px-5 py-2 bg-navy-500 text-white text-sm font-medium rounded-xl hover:bg-navy-600 transition disabled:opacity-50 flex items-center gap-2">
                      <i className="fas fa-plus-circle text-xs" /> Add Question
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={saveAssessment}
                    disabled={!assTitle.trim() || assQuestions.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <i className="fas fa-save text-xs" /> Save Assessment
                  </button>
                  <button onClick={() => { setAssTitle(""); setAssDesc(""); setAssQuestions([]); setNewQText(""); setNewQType("Multiple Choice"); setNewQOptions(["", ""]) }}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    Clear
                  </button>
                </div>
              </div>

              {/* Saved assessments */}
              {assessments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-history text-gray-400 text-sm" /> Saved Assessments ({assessments.length})
                  </h3>
                  {assessments.map((a, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800">{a.title}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{a.questions.length} question{a.questions.length > 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowPreview(i)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center gap-1">
                            <i className="fas fa-eye" /> Preview
                          </button>
                          <button onClick={() => {
                            setAssessments(assessments.filter((_, j) => j !== i))
                            if (showPreview === i) setShowPreview(null)
                          }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resources */}
          {activePage === "resources" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Teaching Resources</h2>
                  <p className="text-gray-500 mt-1">Browse and manage your teaching materials</p>
                </div>
                <button onClick={() => setResourceUploadOpen(true)} className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                  <i className="fas fa-upload text-xs" /> Upload
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "English — Grammar & Composition", desc: "Modules on sentence structure, essay writing, and oral communication", meta: "Updated May 2026 • 3.2 MB", icon: "fa-book-open", color: "bg-blue-100 text-blue-600" },
                  { title: "Mathematics — Algebra & Geometry", desc: "Lessons on linear equations, quadratic functions, and geometric proofs", meta: "Updated May 2026 • 4.1 MB", icon: "fa-square-root-variable", color: "bg-green-100 text-green-600" },
                  { title: "Science — Earth & Life Science", desc: "Topics on ecology, cell biology, geology, and weather systems", meta: "Updated April 2026 • 5.7 MB", icon: "fa-flask", color: "bg-purple-100 text-purple-600" },
                  { title: "Filipino — Wika at Panitikan", desc: "Mga modyul sa gramatika, pagbasa, at panitikang Pilipino", meta: "Updated May 2026 • 2.8 MB", icon: "fa-language", color: "bg-amber-100 text-amber-600" },
                  { title: "Araling Panlipunan — Kasaysayan", desc: "Modules on Philippine history, governance, and global geography", meta: "Updated May 2026 • 6.3 MB", icon: "fa-globe-asia", color: "bg-red-100 text-red-600" },
                  { title: "MAPEH — Physical Education & Health", desc: "Exercise routines, nutrition guides, and sports fundamentals", meta: "Updated April 2026 • 8.9 MB", icon: "fa-running", color: "bg-teal-100 text-teal-600" },
                  { title: "Values Education — GMRC", desc: "Good manners, values integration, and character development", meta: "Updated May 2026 • 1.5 MB", icon: "fa-hand-holding-heart", color: "bg-pink-100 text-pink-600" },
                  { title: "TLE — ICT & Entrepreneurship", desc: "Computer literacy, coding basics, and small business concepts", meta: "Updated April 2026 • 12.5 MB", icon: "fa-laptop-code", color: "bg-indigo-100 text-indigo-600" }
                ].map((r) => (
                  <div key={r.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 rounded-lg ${r.color} flex items-center justify-center`}>
                        <i className={`fas ${r.icon} text-xl`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{r.title}</h3>
                        <p className="text-xs text-gray-400">{r.meta}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{r.desc}</p>
                    <div className="flex items-center justify-between mt-2">
                      <button className="text-primary text-sm font-medium hover:text-primary-700 transition"><i className="fas fa-eye mr-1" /> Preview</button>
                      <i className="fas fa-download text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </div>
                  </div>
                ))}
                {resources.map((r) => {
                  const fi = getFileIcon(r.fileType)
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-lg ${fi.color} flex items-center justify-center`}>
                          <i className={`fas ${fi.icon} text-xl`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{r.title}</h3>
                          <p className="text-xs text-gray-400">{r.subject} • {formatFileSize(r.fileSize)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{r.fileName}</p>
                      <p className="text-xs text-gray-400 mb-3">Uploaded by {r.uploadedBy}</p>
                      <div className="flex items-center justify-between mt-2">
                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:text-primary-700 transition"><i className="fas fa-eye mr-1" /> Preview</a>
                        <a href={r.fileUrl} download={r.fileName} className="text-gray-400 hover:text-gray-600"><i className="fas fa-download" /></a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activePage === "analytics" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Class Analytics</h2>
                <p className="text-gray-500 mt-1">Monitor performance and completion metrics</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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
                    <div className="flex justify-end mt-4">
                      <button onClick={() => setAnalyticsModalOpen(true)} className="px-3 py-1.5 bg-navy-500 text-white text-xs font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-1.5">
                        View Details <i className="fas fa-arrow-right text-xs" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-trophy text-amber-500 text-sm" /> Class Leaderboard
                    </h3>
                    <div className="space-y-3">
                      {[
                        { rank: 1, name: "Maria Santos", cohort: "JHS Section A", score: "92%", color: "bg-yellow-400" },
                        { rank: 2, name: "Juan Dela Cruz", cohort: "SHS STEM", score: "89%", color: "bg-gray-400" },
                        { rank: 3, name: "Ana Gomez", cohort: "JHS Section B", score: "76%", color: "bg-amber-700" },
                        { rank: 4, name: "Carlos Tan", cohort: "JHS Section A", score: "71%", color: "bg-gray-300" },
                        { rank: 5, name: "Pedro Reyes", cohort: "SHS ABM", score: "62%", color: "bg-gray-300" },
                        { rank: 6, name: "Liza Santos", cohort: "JHS Section B", score: "55%", color: "bg-gray-300" },
                        { rank: 7, name: "Kevin Torres", cohort: "SHS STEM", score: "54%", color: "bg-gray-300" },
                        { rank: 8, name: "Rosa Mendoza", cohort: "JHS Section A", score: "50%", color: "bg-gray-300" },
                        { rank: 9, name: "Nina Perez", cohort: "SHS HUMSS", score: "48%", color: "bg-gray-300" },
                        { rank: 10, name: "Jose Lopez", cohort: "SHS ABM", score: "45%", color: "bg-gray-300" }
                      ].map((s) => (
                        <div key={s.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                          <span className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center text-xs font-bold text-white`}>{s.rank}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{s.name}</span>
                          <span className="text-xs text-gray-400 mr-2">{s.cohort}</span>
                          <span className="text-sm font-semibold text-green-600">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Submission Completion Rate</h3>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="56.5" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">70%</span>
                        <span className="text-[10px] text-gray-400">Submitted</span>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-3">42 out of 60 total assignments completed</p>
                  </div>
                  <div className="border-t border-gray-100">
                    <button onClick={() => setCompletionExpanded(!completionExpanded)} className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-navy-600 hover:bg-gray-50 transition rounded-b-xl">
                      <span>{completionExpanded ? "Hide" : "Show"} Details</span>
                      <i className={`fas fa-chevron-${completionExpanded ? "up" : "down"} text-xs transition-transform`} />
                    </button>
                    {completionExpanded && (
                      <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {assignments.map((a) => {
                            const completed = a.students.filter(s => s.status !== "missing").length
                            return (
                              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex-1 min-w-0 mr-3">
                                  <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                                  <p className="text-xs text-gray-400">{a.cohort}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-semibold text-green-600">{completed}/{a.students.length}</p>
                                  <p className="text-xs text-gray-400">completed</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          {activePage === "calendar" && (
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
                <p className="text-gray-500 mt-1">View important dates and schedule events</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5 bg-navy-500 -m-6 p-4 rounded-t-xl">
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
                      const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear()
                      const isSelected = day === calSelected
                      const isPast = calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth()) || (calYear === now.getFullYear() && calMonth === now.getMonth() && day < now.getDate())
                      return (
                        <button key={day} onClick={() => !isPast && setCalSelected(day)} disabled={isPast}
                          className={`flex items-center justify-center rounded-lg text-sm font-medium transition min-h-[48px]
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
                      {calSelected ? `${["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} ${calSelected}, ${calYear}` : "Select a date"}
                    </h3>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <i className={`fas ${calSelected ? "fa-calendar-check" : "fa-calendar-plus"} text-gray-300 text-2xl`} />
                    </div>
                    <p className="text-sm text-gray-400">{calSelected ? "Date selected" : "Click a date to view"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile */}
          {activePage === "profile" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
                <p className="text-gray-500 mt-1">Manage your personal information and account</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 h-full">
                  <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center h-full flex flex-col">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-bold mx-auto">
                        {profile?.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "T"}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mt-4">{profile?.displayName || "Teacher"}</h3>
                    <p className="text-sm text-gray-400 capitalize">{profile?.role || "teacher"}</p>
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500"><i className="fas fa-envelope w-4" /> {profile?.email || ""}</p>
                        {profile?.lrn && <p className="text-sm text-gray-500"><i className="fas fa-id-badge w-4" /> LRN: {profile.lrn}</p>}
                        {profile?.gradeLevel && <p className="text-sm text-gray-500"><i className="fas fa-chalkboard w-4" /> Grade: {profile.gradeLevel}</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                    <div className="flex justify-between mb-6">
                      <h3 className="text-lg font-bold">Account Information</h3>
                      <button onClick={() => {
                        const parts = (profile?.displayName || "").split(" ")
                        setEditFirstName(parts[0] || "")
                        setEditLastName(parts.slice(1).join(" ") || "")
                        setEditOpen(true)
                      }} className="px-4 py-2 bg-navy-500 text-white text-sm rounded-lg">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      {[
                        { label: "First Name", value: profile?.displayName?.split(" ")[0] || "—" },
                        { label: "Last Name", value: profile?.displayName?.split(" ").slice(1).join(" ") || "—" },
                        { label: "Email", value: profile?.email || "—" },
                        { label: "Role", value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "—" },
                      ].map((f) => (
                        <div key={f.label}><label className="text-xs text-gray-400">{f.label}</label><p className="font-medium">{f.value}</p></div>
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
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                <p className="text-gray-500 mt-1">Customize your preferences and account settings</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    {["Email notifications for new assignments", "Deadline reminders", "Progress report updates"].map((n, i) => (
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

      {/* Analytics Modal */}
      {analyticsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAnalyticsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Teachers Per Level</h3>
              <button onClick={() => setAnalyticsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <i className="fas fa-times text-gray-500 text-sm" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> Junior High School
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Name", "Department", "Status"].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {colleagues.filter(c => c.level === "Junior High School").map((c) => (
                        <tr key={c.name} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.dept}</td>
                          <td className="px-4 py-3 text-sm"><span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "Active" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500" /> Senior High School
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Name", "Department", "Status"].map((h) => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {colleagues.filter(c => c.level === "Senior High School").map((c) => (
                        <tr key={c.name} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.dept}</td>
                          <td className="px-4 py-3 text-sm"><span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "Active" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Modal */}
      {cohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCohortModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">{cohortLevel} — Colleagues</h3>
              <button onClick={() => setCohortModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <i className="fas fa-times text-gray-500 text-sm" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Name", "Department", "Email", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {colleagues.filter(c => c.level === cohortLevel).map((c) => (
                    <tr key={c.name} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{c.dept}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{c.email}</td>
                      <td className="px-5 py-3 text-sm"><span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "Active" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Resource Modal */}
      {resourceUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!resUploading) { setResourceUploadOpen(false); setResFile(null); setResFileError(""); } }}>
          <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Upload Resource</h3>
              {!resUploading && (
                <button onClick={() => { setResourceUploadOpen(false); setResFile(null); setResFileError(""); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <i className="fas fa-times text-gray-500 text-sm" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                <input type="text" value={resSubject} onChange={(e) => setResSubject(e.target.value)} placeholder="e.g. English — Grammar & Composition" disabled={resUploading}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Title</label>
                <input type="text" value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="e.g. Module 1: Sentence Structure" disabled={resUploading}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">File</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${resFile ? "border-green-300 bg-green-50/50" : "border-gray-200 hover:border-navy-500/50"}`}>
                  <input type="file" accept=".pdf,.docx,.doc" className="hidden" id="fileInput"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setResFileError("")
                      if (file) {
                        const ext = file.name.split(".").pop()?.toLowerCase()
                        if (ext !== "pdf" && ext !== "docx" && ext !== "doc") {
                          setResFileError("Only PDF and DOCX files are allowed.")
                          setResFile(null)
                          e.target.value = ""
                          return
                        }
                        setResFile(file)
                      } else {
                        setResFile(null)
                      }
                    }} />
                  {resFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <i className={`fas ${resFile.type.includes("pdf") ? "fa-file-pdf" : "fa-file-word"} text-green-600 text-xl`} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{resFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatFileSize(resFile.size)}</p>
                      {!resUploading && (
                        <button onClick={() => { setResFile(null); const input = document.getElementById("fileInput") as HTMLInputElement; if (input) input.value = "" }}
                          className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium">Remove file</button>
                      )}
                    </div>
                  ) : (
                    <label htmlFor="fileInput" className="cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-cloud-upload-alt text-navy-500 text-xl" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Click to browse files</p>
                      <p className="text-xs text-gray-400 mt-1">Supports PDF and DOCX only</p>
                    </label>
                  )}
                </div>
                {resFileError && <p className="text-red-500 text-xs mt-1.5">{resFileError}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {!resUploading && (
                <button onClick={() => { setResourceUploadOpen(false); setResFile(null); setResFileError(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
              )}
              <button onClick={handleResourceUpload} disabled={resUploading || !resSubject.trim() || !resTitle.trim() || !resFile}
                className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2 disabled:opacity-70">
                {resUploading ? <><i className="fas fa-spinner fa-spin text-xs" /> Uploading...</> : <><i className="fas fa-upload text-xs" /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!editSaving) setEditOpen(false) }}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Profile</h3>
              {!editSaving && <button onClick={() => setEditOpen(false)} className="text-2xl">&times;</button>}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setEditSaving(true)
              try {
                await updateProfile({ displayName: `${editFirstName} ${editLastName}`.trim() })
                setEditOpen(false)
              } catch {
                // silently fail
              } finally {
                setEditSaving(false)
              }
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">First Name</label>
                  <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required disabled={editSaving}
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
                  <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required disabled={editSaving}
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Email</label>
                  <input type="email" value={profile?.email || ""} disabled
                    className="w-full border rounded-lg p-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                {!editSaving && (
                  <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                )}
                <button type="submit" disabled={editSaving || !editFirstName.trim() || !editLastName.trim()}
                  className="flex-1 py-2 bg-navy-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {editSaving ? <><i className="fas fa-spinner fa-spin text-xs" /> Saving...</> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Preview Modal */}
      {showPreview !== null && assessments[showPreview] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPreview(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{assessments[showPreview].title}</h3>
                {assessments[showPreview].description && (
                  <p className="text-sm text-gray-500 mt-1">{assessments[showPreview].description}</p>
                )}
              </div>
              <button onClick={() => setShowPreview(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <i className="fas fa-times text-gray-500 text-sm" />
              </button>
            </div>
            <div className="text-xs text-gray-400 mb-4">{assessments[showPreview].questions.length} question{assessments[showPreview].questions.length > 1 ? "s" : ""}</div>
            <div className="space-y-4">
              {assessments[showPreview].questions.map((q, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. {q.text}</p>
                  {q.type === "Multiple Choice" && (
                    <div className="space-y-2">
                      {q.options.map((o, j) => (
                        <label key={j} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-100 cursor-pointer hover:bg-navy-500/5 transition">
                          <input type="radio" name={`preview-q-${i}`} className="text-navy-500 focus:ring-navy-500/20" />
                          <span className="text-sm text-gray-700">{o}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "True/False" && (
                    <div className="flex gap-3">
                      {["True", "False"].map((v) => (
                        <label key={v} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-100 cursor-pointer hover:bg-navy-500/5 transition">
                          <input type="radio" name={`preview-q-${i}`} className="text-navy-500 focus:ring-navy-500/20" />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {(q.type === "Short Answer" || q.type === "Essay") && (
                    <div className={q.type === "Essay" ? "h-24 rounded-lg border border-dashed border-gray-300 bg-white" : "h-10 rounded-lg border border-dashed border-gray-300 bg-white"} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { logout(); navigate("/"); }} />
    </div>
  )
}

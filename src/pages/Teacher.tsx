import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import BlockEditor from "../components/BlockEditor"
import AssessmentBuilder from "../components/AssessmentBuilder"
import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"

import LogoutModal from "../components/LogoutModal"
import ChangePasswordModal from "../components/ChangePasswordModal"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { assignments } from "../data/assignments"
import { db } from "../firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import type { NavItem, Resource, ModuleContent, ModuleBlock, TableData, ModuleAssessment } from "../types"
import { getSubjectIcon } from "../utils/subjectIcons"
import ImageCarousel from "../components/ImageCarousel"

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
  const makeEmptyModule = (): ModuleContent => ({
    name: "",
    description: "",
    blocks: [{ id: `blk_${Date.now()}_init`, type: "content", topic: "", description: "" }],
    tasks: [],
    adaptiveRules: {
      prerequisite: { enabled: false, minScore: 70, maxAttempts: 3 },
      remediation: { enabled: false, moduleIdx: 0 },
      acceleration: { enabled: false, mode: "postquiz", threshold: 90 },
      topics: [],
    },
  })

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
  const [editPhone, setEditPhone] = useState("")
  const [editEmployeeId, setEditEmployeeId] = useState("")
  const [editDepartment, setEditDepartment] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calSelected, setCalSelected] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())
  const [cohortModal, setCohortModal] = useState(false)
  const [cohortLevel, setCohortLevel] = useState("")
  const [cohortPage, setCohortPage] = useState(1)
  const [resourceUploadOpen, setResourceUploadOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [completionExpanded, setCompletionExpanded] = useState(false)
  const [cohortCounts, setCohortCounts] = useState({ jhs: 0, shs: 0 })
  const [colleagues, setColleagues] = useState<{ name: string; dept: string; email: string; status: string; level: string }[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [editingAssessmentResourceId, setEditingAssessmentResourceId] = useState<string | null>(null)
  const [assessmentSaving, setAssessmentSaving] = useState(false)
  const [assessmentSaved, setAssessmentSaved] = useState(false)
  const assessmentDraftRef = useRef<Record<string, any> | null>(null)
  const [studentWorkModal, setStudentWorkModal] = useState<{ assignmentId: number; studentName: string } | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [aiChecking, setAiChecking] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [resSubject, setResSubject] = useState("")
  const [resTitle, setResTitle] = useState("")
  const [resDesc, setResDesc] = useState("")
  const [resModules, setResModules] = useState<ModuleContent[]>([makeEmptyModule()])
  const resModulesHistoryRef = useRef<ModuleContent[][]>([])
  const resModulesHistoryIdxRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [resSaving, setResSaving] = useState(false)
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0)
  const moduleScrollRefs = useRef<(HTMLDivElement | null)[]>([])
  const moduleScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const sidebarItemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lastExplicitClickRef = useRef<number>(0)
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const forceFocusIdxRef = useRef<number | null>(null)
  const forceFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeContentId, setActiveContentId] = useState<string | null>(null)
  const activeContentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewResource, setPreviewResource] = useState<Resource | null>(null)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null)
  const isDark = theme === "dark"

  const modulesInsufficientTasks = resModules.filter(m => {
    const hasContent = m.name.trim() || m.blocks.length > 0
    const tasks = m.tasks || []
    const hasQuiz = tasks.some(t => t.type === "quiz" && t.assessment && t.assessment.questions.length > 0)
    return hasContent && (tasks.length < 2 || !hasQuiz)
  })

  const deepCloneModules = (modules: ModuleContent[]): ModuleContent[] =>
    modules.map(m => ({
      ...m,
      blocks: m.blocks.map(b => ({ ...b })),
      tasks: m.tasks.map(t => ({ ...t, attachments: [...t.attachments], rubric: [...t.rubric], assessment: t.assessment ? { ...t.assessment, questions: t.assessment.questions.map(q => ({ ...q })) } : undefined })),
    }))

  const pushToHistory = (modules: ModuleContent[]) => {
    const history = resModulesHistoryRef.current
    const idx = resModulesHistoryIdxRef.current
    const trimmed = history.slice(0, idx + 1)
    trimmed.push(deepCloneModules(modules))
    if (trimmed.length > 50) trimmed.shift()
    resModulesHistoryRef.current = trimmed
    resModulesHistoryIdxRef.current = trimmed.length - 1
    setCanUndo(trimmed.length > 1)
    setCanRedo(false)
  }

  const undo = () => {
    const history = resModulesHistoryRef.current
    const idx = resModulesHistoryIdxRef.current
    if (idx <= 0) return
    const newIdx = idx - 1
    resModulesHistoryIdxRef.current = newIdx
    setResModules(deepCloneModules(history[newIdx]))
    setCanUndo(newIdx > 0)
    setCanRedo(true)
  }

  const redo = () => {
    const history = resModulesHistoryRef.current
    const idx = resModulesHistoryIdxRef.current
    if (idx >= history.length - 1) return
    const newIdx = idx + 1
    resModulesHistoryIdxRef.current = newIdx
    setResModules(deepCloneModules(history[newIdx]))
    setCanUndo(true)
    setCanRedo(newIdx < history.length - 1)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!resourceUploadOpen) return
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo() }
      else if (isMod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [resourceUploadOpen])

  function stripUndefined(obj: any): any {
    if (obj === null || obj === undefined) return undefined
    if (Array.isArray(obj)) return obj.map(stripUndefined).filter(v => v !== undefined)
    if (typeof obj === "object") {
      const clean: Record<string, any> = {}
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) clean[k] = stripUndefined(v)
      }
      return clean
    }
    return obj
  }

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
      const items: Resource[] = snap.docs.map((d) => {
        const data = d.data() as Resource
        return {
          id: d.id,
          ...data,
          modules: (data.modules || []).map((m: any) => {
            if (m.blocks) {
              return { ...m, blocks: m.blocks.map((b: any) => ({ id: b.id, type: b.type, topic: b.topic, description: b.description, imageData: b.imageData })) }
            }
            const blocks: ModuleBlock[] = []
            if (m.content) blocks.push({ id: `mig_${d.id}_c`, type: "content", topic: "", description: m.content })
            if (m.images) (m.images as string[]).forEach((img, i) => blocks.push({ id: `mig_${d.id}_img_${i}`, type: "image", topic: "", description: "", imageData: img }))
            if (m.tables) {
              const tables = typeof m.tables === "string" ? JSON.parse(m.tables) : (m.tables || [])
              tables.forEach((t: TableData, i: number) => {
                let html = "<table><tbody>"
                t.cells.forEach(row => { html += "<tr>" + row.map(cell => `<td style="text-align:${t.textAlign || "left"}">${cell}</td>`).join("") + "</tr>" })
                html += "</tbody></table>"
                blocks.push({ id: `mig_${d.id}_tbl_${i}`, type: "table", topic: "", description: html })
              })
            }
            return { name: m.name || "", description: m.description || "", blocks, tasks: m.tasks || [] }
          }),
          assessment: data.assessment || undefined,
        }
      })
      setResources(items)
    }
    fetchResources()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchCohortData = async () => {
      const snap = await getDocs(collection(db, "users"))
      let jhs = 0, shs = 0, total = 0
      const teacherList: { name: string; dept: string; email: string; status: string; level: string }[] = []
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.role === "student") {
          total++
          const gl = data.gradeLevel || ""
          if (gl.startsWith("Grade") && !gl.startsWith("Senior")) jhs++
          else shs++
        } else if (data.role === "teacher" && data.uid !== profile?.uid) {
          const dept = data.department || ""
          let level = "Junior High School"
          if (["Senior High School", "ABM", "HUMSS", "STEM", "TVL"].includes(dept)) level = "Senior High School"
          teacherList.push({
            name: data.displayName || "",
            dept,
            email: data.email || "",
            status: "Active",
            level,
          })
        }
      })
      setCohortCounts({ jhs, shs })
      setTotalStudents(total)
      setColleagues(teacherList)
    }
    fetchCohortData()
  }, [profile?.uid])

  useEffect(() => {
    if (!resourceUploadOpen) return
    const container = moduleScrollContainerRef.current
    if (!container) return
    const handleUserScroll = () => {
      userScrollingRef.current = true
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current)
      userScrollTimerRef.current = setTimeout(() => { userScrollingRef.current = false }, 1500)
    }
    container.addEventListener("wheel", handleUserScroll, { passive: true })
    container.addEventListener("touchmove", handleUserScroll, { passive: true })
    const observer = new IntersectionObserver(
      (entries) => {
        if (!userScrollingRef.current) return
        if (forceFocusIdxRef.current !== null) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = moduleScrollRefs.current.indexOf(entry.target as HTMLDivElement)
            if (idx !== -1) {
              setSelectedModuleIdx(idx)
              break
            }
          }
        }
      },
      { root: container, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    )
    const timer = setTimeout(() => {
      moduleScrollRefs.current.forEach((el) => { if (el) observer.observe(el) })
    }, 100)
    return () => { clearTimeout(timer); observer.disconnect(); container.removeEventListener("wheel", handleUserScroll); container.removeEventListener("touchmove", handleUserScroll); if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current) }
  }, [resourceUploadOpen, resModules.length])

  useEffect(() => {
    if (!resourceUploadOpen) return
    sidebarItemRefs.current[selectedModuleIdx]?.scrollIntoView({ block: "nearest" })
  }, [selectedModuleIdx, resourceUploadOpen])

  const handleResourceUpload = async () => {
    if (!resSubject.trim() || !resTitle.trim() || resModules.every(m => !m.name.trim() && m.blocks.length === 0)) return
    if (modulesInsufficientTasks.length > 0) return
    setResSaving(true)
    try {
      const filteredModules = resModules.filter(m => m.name.trim() || m.blocks.length > 0 || (m.tasks && m.tasks.length > 0))
      const firestoreModules = filteredModules.map(m => {
        const mod: Record<string, any> = {
          name: m.name,
          description: m.description,
          blocks: m.blocks.map(b => {
            const clean: Record<string, any> = { id: b.id, type: b.type, topic: b.topic, description: b.description }
            if (b.type === "image" && b.imageData) clean.imageData = b.imageData
            return clean
          }),
          tasks: (m.tasks || []).map(t => {
            const clean: Record<string, any> = {
              id: t.id, type: t.type, title: t.title, description: t.description,
              attachments: t.attachments || [], rubric: t.rubric || [],
              allowLateSubmission: t.allowLateSubmission, anonymous: t.anonymous,
            }
            if (t.dueDate) clean.dueDate = t.dueDate
            if (t.points !== undefined) clean.points = t.points
            if (t.assessment) clean.assessment = stripUndefined(t.assessment)
            return clean
          }),
          adaptiveRules: m.adaptiveRules || {
            prerequisite: { enabled: false, minScore: 70, maxAttempts: 3 },
            remediation: { enabled: false, moduleIdx: 0 },
            acceleration: { enabled: false, mode: "postquiz", threshold: 90 },
            topics: [],
          },
        }
        return mod
      })
      const payload = {
        subject: resSubject.trim(),
        title: resTitle.trim(),
        description: resDesc.trim(),
        modules: firestoreModules,
      }
      if (editingResourceId) {
        const existing = resources.find(r => r.id === editingResourceId)
        const payloadWithAssessment: Record<string, any> = { ...payload }
        if (existing?.assessment) payloadWithAssessment.assessment = stripUndefined(existing.assessment)
        await updateDoc(doc(db, "resources", editingResourceId), payloadWithAssessment)
        setResources((prev) => prev.map(r => r.id === editingResourceId ? { ...r, ...payload, modules: filteredModules, assessment: existing?.assessment } : r))
      } else {
        const docRef = await addDoc(collection(db, "resources"), {
          ...payload,
          uploadedBy: profile?.displayName || "Teacher",
          uploadedAt: new Date().toISOString(),
        })
        setResources((prev) => [...prev, {
          id: docRef.id,
          ...payload,
          modules: filteredModules,
          uploadedBy: profile?.displayName || "Teacher",
          uploadedAt: new Date().toISOString(),
        }])
      }
      resetResourceForm()
    } catch (err) {
      console.error("Failed to save resource:", err)
    } finally {
      setResSaving(false)
    }
  }

  const addModule = () => {
    pushToHistory(resModules)
    setResModules((prev) => [...prev, makeEmptyModule()])
    setSelectedModuleIdx(resModules.length)
  }

  const removeModule = (index: number) => {
    pushToHistory(resModules)
    setResModules((prev) => prev.filter((_, i) => i !== index))
  }

  const updateModule = (index: number, updated: ModuleContent) => {
    const prev = resModules[index]
    if (prev && JSON.stringify(prev) !== JSON.stringify(updated)) {
      pushToHistory(resModules)
    }
    lastExplicitClickRef.current = Date.now()
    forceFocusIdxRef.current = index
    if (forceFocusTimerRef.current) clearTimeout(forceFocusTimerRef.current)
    forceFocusTimerRef.current = setTimeout(() => { forceFocusIdxRef.current = null }, 5000)
    setSelectedModuleIdx(index)
    setResModules((prevModules) => prevModules.map((m, i) => i === index ? updated : m))
    requestAnimationFrame(() => {
      moduleScrollRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
  }

  const openEditResource = (resource: Resource) => {
    setEditingResourceId(resource.id)
    setResSubject(resource.subject)
    setResTitle(resource.title)
    setResDesc(resource.description)
    const mods = resource.modules.length > 0 ? resource.modules.map(m => ({ ...m, tasks: m.tasks || [] })) : [makeEmptyModule()]
    setResModules(mods)
    resModulesHistoryRef.current = [deepCloneModules(mods)]
    resModulesHistoryIdxRef.current = 0
    setCanUndo(false)
    setCanRedo(false)
    setSelectedModuleIdx(0)
    setResourceUploadOpen(true)
  }

  const resetResourceForm = () => {
    setEditingResourceId(null)
    setResSubject("")
    setResTitle("")
    setResDesc("")
    setResModules([makeEmptyModule()])
    resModulesHistoryRef.current = []
    resModulesHistoryIdxRef.current = -1
    setCanUndo(false)
    setCanRedo(false)
    setSelectedModuleIdx(0)
    setResourceUploadOpen(false)
  }

  const handleDeleteResource = async () => {
    if (!deletingResourceId) return
    try {
      await deleteDoc(doc(db, "resources", deletingResourceId))
      setResources((prev) => prev.filter((r) => r.id !== deletingResourceId))
      if (previewResource?.id === deletingResourceId) setPreviewResource(null)
      if (editingAssessmentResourceId === deletingResourceId) setEditingAssessmentResourceId(null)
    } catch (err) {
      console.error("Failed to delete resource:", err)
    } finally {
      setDeletingResourceId(null)
    }
  }


  const goTo = (page: string) => {
    setActivePage(page)
    if (page === "submissions") setDetailId(null)
  }

  const showDetail = (id: number) => setDetailId(id)
  const backToGrid = () => setDetailId(null)

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { ahead: "bg-emerald-100 text-emerald-700", "on-time": "bg-blue-100 text-blue-700", late: "bg-orange-100 text-orange-700", missing: "bg-red-100 text-red-700" }
    return map[status] || "bg-gray-100 text-gray-700"
  }

  const cohortPageSize = 10
  const cohortTotalPages = Math.ceil(colleagues.length / cohortPageSize)
  const cohortPaginated = colleagues.slice((cohortPage - 1) * cohortPageSize, cohortPage * cohortPageSize)

  return (
    <div className="flex h-screen overflow-hidden">
      <style>{`
        .tiptap-preview img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }
        .tiptap-preview img[data-float="left"] { float: left; margin: 0.25rem 1rem 0.5rem 0; max-width: 50%; }
        .tiptap-preview img[data-float="right"] { float: right; margin: 0.25rem 0 0.5rem 1rem; max-width: 50%; }
        .tiptap-preview table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
        .tiptap-preview td, .tiptap-preview th { border: 1px solid #d1d5db; padding: 0.125rem 0.25rem; line-height: 1.4; }
        .tiptap-preview td p, .tiptap-preview th p { margin: 0; }
        .tiptap-preview th { background: #f3f4f6; font-weight: 600; }
        .tiptap-preview ul { list-style-type: disc; padding-left: 1.5rem; }
        .tiptap-preview ol { list-style-type: decimal; padding-left: 1.5rem; }
        .tiptap-preview blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75rem; color: #6b7280; font-style: italic; }
        .tiptap-preview a { color: #2563eb; text-decoration: underline; }
      `}</style>
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
                  { label: "Total Enrolled Students", value: String(totalStudents), icon: "fa-users", color: "bg-blue-100 text-blue-600" },
                  { label: "Pending Submissions", value: "18", icon: "fa-file-alt", color: "bg-amber-100 text-amber-600" },
                  { label: "Active Cohorts", value: String(cohortCounts.jhs + cohortCounts.shs), icon: "fa-chalkboard", color: "bg-green-100 text-green-600" }
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
                        { level: "Junior High School", cohorts: cohortCounts.jhs, updated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                        { level: "Senior High School", cohorts: cohortCounts.shs, updated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
                      ].map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.level}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.cohorts} students</td>
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
                      {cohortPaginated.map((c, i) => (
                        <tr key={c.name} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.dept}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                          <td className="px-6 py-4 text-sm"><span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === "Active" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{c.status}</span></td>
                        </tr>
                      ))}
                      {cohortPaginated.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No fellow teachers found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {colleagues.length > cohortPageSize && (
                  <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Showing {(cohortPage - 1) * cohortPageSize + 1}-{Math.min(cohortPage * cohortPageSize, colleagues.length)} of {colleagues.length} teachers</p>
                    <div className="flex gap-1">
                      <button onClick={() => setCohortPage((p) => Math.max(1, p - 1))} disabled={cohortPage === 1}
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                      {Array.from({ length: cohortTotalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setCohortPage(p)}
                          className={`px-3 py-1 text-sm border border-gray-200 rounded-lg transition ${cohortPage === p ? "bg-navy-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{p}</button>
                      ))}
                      <button onClick={() => setCohortPage((p) => Math.min(cohortTotalPages, p + 1))} disabled={cohortPage === cohortTotalPages}
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                    </div>
                  </div>
                )}
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
          {activePage === "assessments" && (() => {
            const activeResource = resources.find(r => r.id === editingAssessmentResourceId)
            return (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Final Assessments</h2>
                <p className="text-gray-500 mt-1">Create end-of-module assessments that students take after completing all blocks</p>
              </div>

              {resources.length === 0 ? (
                <div className={`text-center py-20 rounded-xl border-2 border-dashed ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <i className={`fas fa-clipboard-list text-2xl ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  </div>
                  <p className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>No resources yet</p>
                  <p className={`text-sm ${isDark ? "text-gray-600" : "text-gray-400"}`}>Create a resource first, then add a final assessment here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((r) => {
                    const mods = r.modules || []
                    const totalQuestions = r.assessment?.questions.length || 0
                    const hasAssessment = totalQuestions > 0
                    const subjIcon = getSubjectIcon(r.subject)
                    const taskCount = mods.reduce((sum, m) => sum + (m.tasks || []).filter(t => t.type !== "quiz").length, 0)
                    return (
                      <div key={r.id}
                        className={`rounded-2xl border overflow-hidden transition-all hover:shadow-md cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"}`}
                        onClick={() => { assessmentDraftRef.current = r.assessment || null; setAssessmentSaved(false); setEditingAssessmentResourceId(r.id) }}>
                        <div className={`flex items-center gap-3 p-4 ${isDark ? "" : ""}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-navy-400/20 text-navy-400" : "bg-gradient-to-br from-amber-500 to-orange-500 text-white"}`}>
                            <i className={`fas ${hasAssessment ? "fa-clipboard-check" : "fa-clipboard-list"} text-sm`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-gray-800"}`}>{r.title}</h3>
                              {hasAssessment ? (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 shrink-0">{totalQuestions}q</span>
                              ) : (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">Empty</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <i className={`fas ${subjIcon.icon} mr-0.5`} />{r.subject}
                              </span>
                              <span className={`w-0.5 h-0.5 rounded-full ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />
                              <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {mods.length} mod{mods.length !== 1 ? "s" : ""}
                              </span>
                              {taskCount > 0 && (
                                <>
                                  <span className={`w-0.5 h-0.5 rounded-full ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />
                                  <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    {taskCount} task{taskCount !== 1 ? "s" : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <i className={`fas fa-arrow-right text-[11px] ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Assessment Builder Modal */}
              {activeResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
                  onClick={() => setEditingAssessmentResourceId(null)}>
                  <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                  `}</style>
                  <div className={`rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-[modalIn_0.3s_ease-out] ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white"}`}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Modal header */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-navy-400/20 text-navy-400" : "bg-gradient-to-br from-amber-500 to-orange-500 text-white"}`}>
                          <i className="fas fa-clipboard-list text-sm" />
                        </div>
                        <div>
                          <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{activeResource.title}</h3>
                          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{activeResource.subject} &middot; Final Assessment</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingAssessmentResourceId(null)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${isDark ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}>
                        <i className="fas fa-times text-sm" />
                      </button>
                    </div>
                    {/* Modal body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <AssessmentBuilder
                        assessment={activeResource.assessment || null}
                        onChange={(ass) => {
                          assessmentDraftRef.current = ass
                          setAssessmentSaved(false)
                          setResources(prev => prev.map(res => res.id === activeResource.id ? { ...res, assessment: ass } : res))
                        }}
                        onRemove={() => {
                          assessmentDraftRef.current = null
                          setResources(prev => prev.map(res => res.id === activeResource.id ? { ...res, assessment: undefined } : res))
                        }}
                        isDark={isDark}
                        context="assessment"
                      />
                    </div>
                    {/* Modal footer */}
                    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      {assessmentSaved && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1.5 mr-auto">
                          <i className="fas fa-check-circle" /> Saved successfully
                        </span>
                      )}
                      <button onClick={() => { setEditingAssessmentResourceId(null); assessmentDraftRef.current = null; setAssessmentSaved(false) }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        Close
                      </button>
                      <button
                        disabled={assessmentSaving}
                        onClick={async () => {
                          setAssessmentSaving(true)
                          setAssessmentSaved(false)
                          try {
                            const draft = assessmentDraftRef.current ?? activeResource.assessment
                            const payload = stripUndefined(draft) ?? null
                            await updateDoc(doc(db, "resources", activeResource.id), { assessment: payload })
                            setResources(prev => prev.map(r => r.id === activeResource.id ? { ...r, assessment: draft } : r))
                            setAssessmentSaved(true)
                            setTimeout(() => setAssessmentSaved(false), 3000)
                          } catch (err) {
                            console.error("Failed to save assessment:", err)
                          } finally {
                            setAssessmentSaving(false)
                          }
                        }}
                        className="px-5 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition disabled:opacity-50 flex items-center gap-2">
                        {assessmentSaving ? <><i className="fas fa-spinner fa-spin text-xs" /> Saving...</> : <><i className="fas fa-save text-xs" /> Save Assessment</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )
          })()}

          {/* Resources */}
          {activePage === "resources" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Teaching Resources</h2>
                  <p className="text-gray-500 mt-1">Create and manage your module content</p>
                </div>
                <button onClick={() => {
                  const initModules = [makeEmptyModule()]
                  resModulesHistoryRef.current = [deepCloneModules(initModules)]
                  resModulesHistoryIdxRef.current = 0
                  setCanUndo(false)
                  setCanRedo(false)
                  setResourceUploadOpen(true)
                }} className="px-4 py-2 bg-navy-500 text-white text-sm font-medium rounded-lg hover:bg-navy-600 transition flex items-center gap-2">
                  <i className="fas fa-plus text-xs" /> Create Module
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grid-rows-[1fr]">
                {resources.length === 0 && (
                  <div className={`col-span-2 text-center py-20 rounded-xl border-2 border-dashed ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                      <i className={`fas fa-folder-open text-2xl ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    </div>
                    <p className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>No resources yet</p>
                    <p className={`text-sm ${isDark ? "text-gray-600" : "text-gray-400"}`}>Click "Create Module" to get started</p>
                  </div>
                )}
                {resources.map((r) => {
                  const date = new Date(r.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  const mods = r.modules || []
                  const blockCounts = { content: 0, image: 0, table: 0 }
                  mods.forEach(m => (m.blocks || []).forEach(b => { if (b.type in blockCounts) blockCounts[b.type as keyof typeof blockCounts]++ }))
                  const taskCount = mods.reduce((sum, m) => sum + (m.tasks || []).filter(t => t.type !== "quiz").length, 0)
                  const hasAssessment = (r.assessment?.questions.length || 0) > 0
                  const subjIcon = getSubjectIcon(r.subject)
                  return (
                    <div key={r.id} className={`group rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col ${isDark ? "bg-gray-800" : "bg-white"}`}>
                      <div className={`p-5 flex-1 flex flex-col ${isDark ? "bg-gradient-to-br from-navy-500/10 to-transparent" : "bg-gradient-to-br from-navy-50 to-transparent"}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-navy-400/20 text-navy-400" : `${subjIcon.bg} ${subjIcon.color}`}`}>
                            <i className={`fas ${subjIcon.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-base truncate ${isDark ? "text-white" : "text-gray-800"}`}>{r.title}</h3>
                            <p className={`text-xs mt-0.5 truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>{r.subject}</p>
                          </div>
                        </div>
                        {r.description && <p className={`text-xs mb-3 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>{r.description}</p>}
                        <div className={`flex items-center gap-2 text-[11px] mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          <span className="flex items-center gap-1"><i className="fas fa-user-circle" />{r.uploadedBy}</span>
                          <span className={`w-0.5 h-0.5 rounded-full ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />
                          <span className="flex items-center gap-1"><i className="fas fa-calendar-alt" />{date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                            <i className="fas fa-layer-group mr-1" />{mods.length} mod{mods.length !== 1 ? "s" : ""}
                          </span>
                          {taskCount > 0 && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600"><i className="fas fa-list-check mr-1" />{taskCount} task{taskCount !== 1 ? "s" : ""}</span>}
                          {hasAssessment ? (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-600"><i className="fas fa-clipboard-check mr-1" />Assessment</span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600"><i className="fas fa-clipboard mr-1" />No assessment</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                          <button onClick={() => setPreviewResource(r)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isDark ? "bg-navy-500/20 text-navy-400 hover:bg-navy-500/30" : "bg-navy-50 text-navy-600 hover:bg-navy-100"}`}>
                            <i className="fas fa-eye" /> Preview
                          </button>
                          <button onClick={() => openEditResource(r)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isDark ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}>
                            <i className="fas fa-edit" /> Edit
                          </button>
                          <button onClick={() => setDeletingResourceId(r.id)} className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center ${isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
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
                    <p className="text-sm text-gray-400">{profile?.department || "Senior Teacher"}</p>
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500"><i className="fas fa-envelope w-4" /> {profile?.email || ""}</p>
                        {profile?.phone && <p className="text-sm text-gray-500"><i className="fas fa-phone w-4" /> {profile.phone}</p>}
                        {profile?.employeeId && <p className="text-sm text-gray-500"><i className="fas fa-id-badge w-4" /> {profile.employeeId}</p>}
                        {profile?.department && <p className="text-sm text-gray-500"><i className="fas fa-chalkboard w-4" /> {profile.department}</p>}
                        {profile?.joinDate && <p className="text-sm text-gray-500"><i className="fas fa-calendar w-4" /> Joined {profile.joinDate}</p>}
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
                        setEditPhone(profile?.phone || "")
                        setEditEmployeeId(profile?.employeeId || "")
                        setEditDepartment(profile?.department || "")
                        setEditOpen(true)
                      }} className="px-4 py-2 bg-navy-500 text-white text-sm rounded-lg">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      {[
                        { label: "First Name", value: profile?.displayName?.split(" ")[0] || "—" },
                        { label: "Last Name", value: profile?.displayName?.split(" ").slice(1).join(" ") || "—" },
                        { label: "Email", value: profile?.email || "—" },
                        { label: "Phone", value: profile?.phone || "—" },
                        { label: "Employee ID", value: profile?.employeeId || "—" },
                        { label: "Department", value: profile?.department || "—" },
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

      {/* Create/Edit Module Content Modal */}
      {resourceUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!resSaving) resetResourceForm() }}>
          <div className={`rounded-2xl shadow-xl w-full max-w-6xl mx-4 max-h-[92vh] flex flex-col ${isDark ? "bg-gray-900" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-navy-600/20" : "bg-navy-500/10"}`}>
                  <i className={`fas fa-layer-group text-sm ${isDark ? "text-navy-400" : "text-navy-600"}`} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{editingResourceId ? "Edit Module Content" : "Create Module Content"}</h3>
                  <p className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{resModules.length} module{resModules.length !== 1 ? "s" : ""} &bull; {resSubject || "No subject"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!resSaving && (
                  <>
                    <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}>
                      <i className="fas fa-undo text-sm" />
                    </button>
                    <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className={`w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}>
                      <i className="fas fa-redo text-sm" />
                    </button>
                  </>
                )}
                {!resSaving && (
                  <button onClick={resetResourceForm} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}>
                    <i className={`fas fa-times text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Body: Sidebar + Main ── */}
            <div className="flex flex-1 min-h-0">

              {/* ── Sidebar ── */}
              <div className={`w-72 border-r flex flex-col shrink-0 ${isDark ? "bg-gray-950/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                {/* Resource info fields in sidebar */}
                <div className={`px-4 py-3 border-b space-y-2.5 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Subject</label>
                    <input type="text" value={resSubject} onChange={(e) => setResSubject(e.target.value)} placeholder="e.g. English" disabled={resSaving}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white"}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Title</label>
                    <input type="text" value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Resource title" disabled={resSaving}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white"}`} />
                  </div>
                </div>

                {/* Module tree */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Modules</span>
                    {!resSaving && (
                      <button onClick={addModule} className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition ${isDark ? "text-navy-400 hover:bg-gray-800" : "text-navy-600 hover:bg-gray-200"}`}>
                        <i className="fas fa-plus mr-0.5" />Add
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {resModules.map((mod, idx) => {
                      const isSelected = selectedModuleIdx === idx
                      const modName = mod.name.trim() || `Untitled Module ${idx + 1}`
                      const blockCount = mod.blocks.length
                      const taskCount = (mod.tasks || []).filter(t => t.type !== "quiz").length

                      return (
                        <div key={idx}>
                          {/* Module header */}
                          <button
                            ref={(el) => { sidebarItemRefs.current[idx] = el }}
                            onClick={() => {
                              lastExplicitClickRef.current = Date.now()
                              setSelectedModuleIdx(idx)
                              moduleScrollRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition group flex items-start gap-2 ${isSelected ? isDark ? "bg-navy-600/20 text-navy-300" : "bg-navy-50 text-navy-700" : isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${isSelected ? isDark ? "bg-navy-600 text-white" : "bg-navy-500 text-white" : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isSelected ? "" : ""}`}>{modName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {blockCount > 0 && (
                                  <span className={`inline-flex items-center gap-0.5 text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    <i className="fas fa-cube" />{blockCount}
                                  </span>
                                )}
                                {taskCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-500">
                                    <i className="fas fa-list-check" />{taskCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Nested content items */}
                          {isSelected && (
                            <div className={`ml-4 mt-1 mb-2 space-y-0.5 border-l pl-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                              {/* Blocks */}
                              {mod.blocks.map((b, bi) => {
                                const blockIcons: Record<string, string> = { content: "fa-align-left", image: "fa-image", table: "fa-table" }
                                const blockColors: Record<string, string> = { content: "text-blue-400", image: "text-green-400", table: "text-purple-400" }
                                return (
                                  <button key={bi} className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer transition hover:bg-navy-500/10 ${isDark ? "text-gray-400 hover:bg-gray-700/50" : "text-gray-500 hover:bg-navy-50"}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      lastExplicitClickRef.current = Date.now()
                                      forceFocusIdxRef.current = idx
                                      if (forceFocusTimerRef.current) clearTimeout(forceFocusTimerRef.current)
                                      forceFocusTimerRef.current = setTimeout(() => { forceFocusIdxRef.current = null }, 3000)
                                      setSelectedModuleIdx(idx)
                                      setActiveContentId(b.id)
                                      if (activeContentTimerRef.current) clearTimeout(activeContentTimerRef.current)
                                      activeContentTimerRef.current = setTimeout(() => setActiveContentId(null), 3000)
                                      const container = moduleScrollContainerRef.current
                                      const target = container?.querySelector(`[data-block-id="${b.id}"]`)
                                      target?.scrollIntoView({ behavior: "smooth", block: "center" })
                                    }}>
                                    <i className={`fas ${blockIcons[b.type] || "fa-cube"} ${blockColors[b.type] || "text-gray-400"} w-3 text-center`} />
                                    <span className="truncate">{b.topic || `Block ${bi + 1}`}</span>
                                  </button>
                                )
                              })}

                              {/* Tasks */}
                              {(mod.tasks || []).map((task) => {
                                const taskIcons: Record<string, string> = { assignment: "fa-book-open", quiz: "fa-clipboard-list", discussion: "fa-comments", material: "fa-newspaper" }
                                const taskColors: Record<string, string> = { assignment: "text-blue-400", quiz: "text-green-400", discussion: "text-orange-400", material: "text-purple-400" }
                                return (
                                  <button key={task.id} className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer transition hover:bg-navy-500/10 ${isDark ? "text-gray-400 hover:bg-gray-700/50" : "text-gray-500 hover:bg-navy-50"}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      lastExplicitClickRef.current = Date.now()
                                      forceFocusIdxRef.current = idx
                                      if (forceFocusTimerRef.current) clearTimeout(forceFocusTimerRef.current)
                                      forceFocusTimerRef.current = setTimeout(() => { forceFocusIdxRef.current = null }, 3000)
                                      setSelectedModuleIdx(idx)
                                      setActiveContentId(task.id)
                                      if (activeContentTimerRef.current) clearTimeout(activeContentTimerRef.current)
                                      activeContentTimerRef.current = setTimeout(() => setActiveContentId(null), 3000)
                                      const container = moduleScrollContainerRef.current
                                      const target = container?.querySelector(`[data-task-id="${task.id}"]`)
                                      target?.scrollIntoView({ behavior: "smooth", block: "center" })
                                    }}>
                                    <i className={`fas ${taskIcons[task.type] || "fa-list"} w-3 text-center`} style={{ color: taskColors[task.type] }} />
                                    <span className="truncate">{task.type === "quiz" ? (task.assessment?.title || "Quiz") : (task.title || task.type)}</span>
                                  </button>
                                )
                              })}

                              {blockCount === 0 && taskCount === 0 && (
                                <p className={`text-[10px] italic px-2 py-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>No content yet</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sidebar description field */}
                <div className={`px-4 py-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Description</label>
                  <textarea value={resDesc} onChange={(e) => setResDesc(e.target.value)} rows={2} placeholder="Brief description..." disabled={resSaving}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50 resize-none ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-gray-200 bg-white"}`} />
                </div>
              </div>

              {/* ── Main content area ── */}
              <div ref={moduleScrollContainerRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {resModules.map((mod, idx) => (
                  <div key={idx} ref={(el) => { moduleScrollRefs.current[idx] = el }} className="scroll-mt-4" onClick={() => { lastExplicitClickRef.current = Date.now(); setSelectedModuleIdx(idx) }}>
                    <BlockEditor
                      module={mod}
                      index={idx}
                      moduleCount={resModules.length}
                      onChange={(updated) => updateModule(idx, updated)}
                      onRemove={() => {
                        removeModule(idx)
                        if (selectedModuleIdx >= resModules.length - 1) setSelectedModuleIdx(Math.max(0, resModules.length - 2))
                      }}
                      isDark={isDark}
                      subject={resSubject}
                      isActive={selectedModuleIdx === idx}
                      activeContentId={activeContentId}
                    />
                  </div>
                ))}

                {/* Quick-add module at bottom */}
                {!resSaving && (
                  <button onClick={addModule}
                    className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2 ${isDark ? "border-gray-700 text-gray-400 hover:border-navy-500 hover:text-navy-400" : "border-gray-300 text-gray-500 hover:border-navy-500 hover:text-navy-600"}`}>
                    <i className="fas fa-plus text-xs" /> Add Module
                  </button>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className={`flex gap-3 px-6 py-4 border-t shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              {!resSaving && (
                <button onClick={resetResourceForm} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${isDark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  Cancel
                </button>
              )}
              <button onClick={handleResourceUpload} disabled={resSaving || !resSubject.trim() || !resTitle.trim() || resModules.every(m => !m.name.trim() && m.blocks.length === 0) || modulesInsufficientTasks.length > 0}
                className="flex-1 py-2.5 rounded-xl bg-navy-500 text-white text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2 disabled:opacity-70">
                {resSaving ? <><i className="fas fa-spinner fa-spin text-xs" /> Saving...</> : <><i className="fas fa-save text-xs" /> {editingResourceId ? "Update" : "Save"}</>}
              </button>
            </div>
            {modulesInsufficientTasks.length > 0 && (
              <div className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs mt-2 ${isDark ? "bg-amber-900/20 border border-amber-800/30 text-amber-300" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5" />
                <span>
                  <strong>Tasks required.</strong> Each module must have at least 2 tasks, including 1 quiz. The following module{modulesInsufficientTasks.length > 1 ? "s need" : " needs"} more tasks:
                  {" "}{modulesInsufficientTasks.map(m => m.name.trim() || "Untitled").join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!editSaving) setEditOpen(false) }}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Profile</h3>
              {!editSaving && <button onClick={() => setEditOpen(false)} className="text-2xl">&times;</button>}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              setEditSaving(true)
              try {
                await updateProfile({
                  displayName: `${editFirstName} ${editLastName}`.trim(),
                  phone: editPhone.trim(),
                  employeeId: editEmployeeId.trim(),
                  department: editDepartment.trim(),
                })
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
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="e.g. +63 917 654 3210" disabled={editSaving}
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Employee ID</label>
                  <input type="text" value={editEmployeeId} onChange={(e) => setEditEmployeeId(e.target.value)} placeholder="e.g. TCH-2018-0045" disabled={editSaving}
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Department</label>
                  <input type="text" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="e.g. Science & Mathematics" disabled={editSaving}
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 disabled:bg-gray-50" />
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

      {/* End modals */}

      {/* Resource Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewResource(null)}>
          <div className={`rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] flex overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
            {/* Sidebar */}
            <div className={`w-64 shrink-0 flex flex-col border-r ${isDark ? "bg-gray-950 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
              <div className={`p-5 border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                <h3 className={`text-sm font-bold leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>{previewResource.title}</h3>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{previewResource.subject}</p>
                <div className={`flex items-center gap-1.5 mt-3 text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  <i className="fas fa-user-circle" />
                  <span>{previewResource.uploadedBy}</span>
                  <span>&bull;</span>
                  <span>{new Date(previewResource.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className={`text-[10px] font-semibold uppercase tracking-wider px-2 mb-2 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Modules</p>
                {(previewResource.modules || []).map((mod, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      document.getElementById(`preview-mod-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2.5 ${isDark ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"}`}
                  >
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{mod.name || `Module ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
              <div className={`p-4 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                <div className={`flex items-center gap-3 text-[11px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                  <span><i className="fas fa-layer-group mr-1" />{(previewResource.modules || []).length} modules</span>
                  <span><i className="fas fa-th-large mr-1"/>{(previewResource.modules || []).reduce((acc, m) => acc + (m.blocks?.length || 0), 0)} blocks</span>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className={`p-5 border-b flex items-center justify-between shrink-0 ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                <div className="min-w-0">
                  <h2 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>{previewResource.title}</h2>
                  {previewResource.description && (
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{previewResource.description}</p>
                  )}
                </div>
                <button onClick={() => setPreviewResource(null)} className={`ml-4 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}>
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {(previewResource.modules || []).map((mod, modIdx) => (
                  <div key={modIdx} id={`preview-mod-${modIdx}`} className="scroll-mt-6">
                    {/* Module header */}
                    <div className={`rounded-xl p-5 mb-4 ${isDark ? "bg-gray-800/60" : "bg-gradient-to-r from-navy-500/5 to-transparent border border-navy-500/10"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isDark ? "bg-navy-500/20 text-navy-400" : "bg-navy-500 text-white"}`}>
                          {modIdx + 1}
                        </span>
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{mod.name || `Module ${modIdx + 1}`}</h3>
                          {mod.description && <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{mod.description}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Blocks */}
                    {(!mod.blocks || mod.blocks.length === 0) && (
                      <p className={`text-sm italic pl-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}>No content</p>
                    )}
                    <div className="space-y-5">
                      {mod.blocks && mod.blocks.map((block, blockIdx) => (
                        <div key={block.id} className={`rounded-xl border p-5 ${isDark ? "bg-gray-800/30 border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                          {block.topic && (
                            <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                              {block.type === "content" && <i className="fas fa-align-left text-blue-500 text-[10px]" />}
                              {block.type === "image" && <i className="fas fa-image text-green-500 text-[10px]" />}
                              {block.type === "table" && <i className="fas fa-table text-purple-500 text-[10px]" />}
                              {block.topic}
                            </h4>
                          )}
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
                                    className={`tiptap-preview prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}
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
                      ))}
                    </div>

                    {modIdx < (previewResource.modules || []).length - 1 && (
                      <div className={`mt-8 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { logout(); navigate("/"); }} />

      {deletingResourceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeletingResourceId(null)}>
          <div
            className={`rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 ${isDark ? "bg-gray-800" : "bg-white"}`}
            style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-trash-alt text-red-500 text-xl" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>Delete Resource?</h3>
              <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>This will permanently remove this resource and all its modules. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingResourceId(null)}
                  className={`flex-1 py-2.5 border text-sm font-medium rounded-xl transition ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  Cancel
                </button>
                <button onClick={handleDeleteResource}
                  className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import PocketBase from "pocketbase"
import { readFileSync } from "fs"

const PB_URL = "http://127.0.0.1:8090"
const SUPERUSER_EMAIL = "admin@local.test"
const SUPERUSER_PASSWORD = "admin12345"
const BACKUP_PATH = "backups/1786698000243.json"

const pb = new PocketBase(PB_URL)

const PASSWORD_BY_ROLE = {
  admin: "admin123",
  student: "ALSstudent123",
  teacher: "ALSteacher123",
}

const defaultPasswordFor = (role) => PASSWORD_BY_ROLE[role] || "ALSuser123"

async function ensureAuth() {
  await pb.collection("_superusers").authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD)
  console.log("Superuser authenticated")
}

async function patchUsersCollection() {
  const existing = await pb.collection("users").getFullList({ requestKey: null })
  const col = await fetch(`${PB_URL}/api/collections/users`, {
    headers: { Authorization: pb.authStore.token },
  }).then((r) => r.json())

  const fieldNames = col.fields.map((f) => f.name)
  const custom = []
  if (!fieldNames.includes("uid")) custom.push({ name: "uid", type: "text", required: false, presentable: false, hidden: false })
  if (!fieldNames.includes("role")) custom.push({ name: "role", type: "select", required: false, presentable: false, hidden: false, values: ["student", "teacher", "admin"] })
  for (const f of ["lrn", "gradeLevel", "phone", "employeeId", "department", "joinDate"]) {
    if (!fieldNames.includes(f)) custom.push({ name: f, type: "text", required: false, presentable: false, hidden: false })
  }

  if (custom.length > 0) {
    const body = {
      fields: [...col.fields, ...custom],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    }
    const res = await fetch(`${PB_URL}/api/collections/users`, {
      method: "PATCH",
      headers: { Authorization: pb.authStore.token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("PATCH users: " + (await res.text()))
    console.log("users collection patched with:", custom.map((f) => f.name).join(", "))
  } else {
    console.log("users collection already has custom fields")
  }

  // drop any pre-existing rows (e.g. from an earlier partial run) so re-seeding is idempotent
  for (const r of existing) {
    try { await pb.collection("users").delete(r.id) } catch {}
  }
}

const BASE_COLLECTIONS = {
  resources: [
    { name: "subject", type: "text" },
    { name: "title", type: "text" },
    { name: "description", type: "text" },
    { name: "modules", type: "json" },
    { name: "assessment", type: "json" },
    { name: "uploadedBy", type: "text" },
    { name: "uploadedAt", type: "text" },
    { name: "fileName", type: "text" },
    { name: "fileUrl", type: "text" },
    { name: "fileType", type: "text" },
    { name: "fileSize", type: "number" },
  ],
  moduleProgress: [
    { name: "userId", type: "text" },
    { name: "resourceId", type: "text" },
    { name: "viewedModules", type: "json" },
    { name: "lastViewedAt", type: "text" },
    { name: "progress", type: "number" },
    { name: "completedAt", type: "text" },
  ],
  quizSubmissions: [
    { name: "studentId", type: "text" },
    { name: "studentName", type: "text" },
    { name: "resourceId", type: "text" },
    { name: "moduleIdx", type: "number" },
    { name: "answers", type: "json" },
    { name: "score", type: "number" },
    { name: "total", type: "number" },
    { name: "passed", type: "bool" },
    { name: "submittedAt", type: "text" },
  ],
  assignmentSubmissions: [
    { name: "studentId", type: "text" },
    { name: "studentName", type: "text" },
    { name: "resourceId", type: "text" },
    { name: "taskId", type: "text" },
    { name: "moduleIdx", type: "number" },
    { name: "fileName", type: "text" },
    { name: "fileUrl", type: "text" },
    { name: "note", type: "text" },
    { name: "submittedAt", type: "text" },
  ],
  assessmentSubmissions: [
    { name: "studentId", type: "text" },
    { name: "studentName", type: "text" },
    { name: "resourceId", type: "text" },
    { name: "assessmentId", type: "text" },
    { name: "answers", type: "json" },
    { name: "score", type: "number" },
    { name: "totalPoints", type: "number" },
    { name: "submittedAt", type: "text" },
  ],
  backups: [
    { name: "date", type: "text" },
    { name: "time", type: "text" },
    { name: "type", type: "text" },
    { name: "size", type: "text" },
    { name: "status", type: "text" },
    { name: "fileId", type: "text" },
    { name: "createdAt", type: "text" },
    { name: "docCount", type: "number" },
    { name: "fileCount", type: "number" },
  ],
}

async function createOrReplaceBaseCollection(name, fields) {
  const list = await pb.collections.getList(1, 100, { requestKey: null })
  const existing = list.items.find((c) => c.name === name)
  if (existing) {
    await fetch(`${PB_URL}/api/collections/${existing.id}`, {
      method: "DELETE",
      headers: { Authorization: pb.authStore.token },
    })
    console.log(`Dropped existing ${name}`)
  }
  const body = {
    name,
    type: "base",
    fields,
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  }
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: "POST",
    headers: { Authorization: pb.authStore.token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`create ${name}: ` + (await res.text()))
  console.log(`Created collection ${name}`)
}

const tsToIso = (v) => {
  if (!v) return null
  if (typeof v === "object" && typeof v._seconds === "number") {
    return new Date(v._seconds * 1000).toISOString()
  }
  return v
}

async function main() {
  await ensureAuth()
  await patchUsersCollection()

  for (const [name, fields] of Object.entries(BASE_COLLECTIONS)) {
    await createOrReplaceBaseCollection(name, fields)
  }

  const backup = JSON.parse(readFileSync(BACKUP_PATH, "utf8"))
  const { users, resources, moduleProgress, quizSubmissions, assignmentSubmissions, assessmentSubmissions, activities } = backup.collections

  // --- users (auth collection) ---
  for (const u of users) {
    const d = u.data || {}
    const email = (d.email || "").toLowerCase()
    if (!email) continue
    const role = d.role || "student"
    try {
      await pb.collection("users").create({
        email,
        password: defaultPasswordFor(role),
        passwordConfirm: defaultPasswordFor(role),
        name: d.displayName || email.split("@")[0],
        uid: d.uid || u.id,
        role,
        lrn: d.lrn || "",
        gradeLevel: d.gradeLevel || "",
        phone: d.phone || "",
        employeeId: d.employeeId || "",
        department: d.department || "",
        joinDate: d.joinDate || "",
      })
    } catch (err) {
      console.error(`  user ${email} failed:`, err.message)
    }
  }
  console.log(`Seeded ${users.length} users`)

  // --- resources ---
  for (const r of resources) {
    const d = r.data || {}
    try {
      await pb.collection("resources").create({
        subject: d.subject || "",
        title: d.title || "",
        description: d.description || "",
        modules: d.modules || [],
        assessment: d.assessment || null,
        uploadedBy: d.uploadedBy || "",
        uploadedAt: tsToIso(d.uploadedAt) || "",
        fileName: d.fileName || "",
        fileUrl: d.fileUrl || "",
        fileType: d.fileType || "",
        fileSize: d.fileSize ?? null,
      })
    } catch (err) {
      console.error(`  resource ${d.title} failed:`, err.message)
    }
  }
  console.log(`Seeded ${resources.length} resources`)

  // --- moduleProgress ---
  for (const p of moduleProgress) {
    const d = p.data || {}
    try {
      await pb.collection("moduleProgress").create({
        userId: d.userId || "",
        resourceId: d.resourceId || "",
        viewedModules: d.viewedModules || [],
        lastViewedAt: tsToIso(d.lastViewedAt) || "",
        progress: d.progress ?? null,
        completedAt: tsToIso(d.completedAt) || "",
      })
    } catch (err) {
      console.error(`  progress failed:`, err.message)
    }
  }
  console.log(`Seeded ${moduleProgress.length} moduleProgress`)

  // --- quizSubmissions ---
  for (const s of quizSubmissions) {
    const d = s.data || {}
    try {
      await pb.collection("quizSubmissions").create({
        studentId: d.studentId || "",
        studentName: d.studentName || "",
        resourceId: d.resourceId || "",
        moduleIdx: d.moduleIdx ?? 0,
        answers: d.answers || {},
        score: d.score ?? 0,
        total: d.total ?? 0,
        passed: !!d.passed,
        submittedAt: tsToIso(d.submittedAt) || "",
      })
    } catch (err) {
      console.error(`  quiz submission failed:`, err.message)
    }
  }
  console.log(`Seeded ${quizSubmissions.length} quizSubmissions`)

  // --- assignmentSubmissions ---
  for (const s of assignmentSubmissions) {
    const d = s.data || {}
    try {
      await pb.collection("assignmentSubmissions").create({
        studentId: d.studentId || "",
        studentName: d.studentName || "",
        resourceId: d.resourceId || "",
        taskId: d.taskId || "",
        moduleIdx: d.moduleIdx ?? 0,
        fileName: d.fileName || "",
        fileUrl: d.fileUrl || "",
        note: d.note || "",
        submittedAt: tsToIso(d.submittedAt) || "",
      })
    } catch (err) {
      console.error(`  assignment submission failed:`, err.message)
    }
  }
  console.log(`Seeded ${assignmentSubmissions.length} assignmentSubmissions`)

  // --- assessmentSubmissions ---
  for (const s of assessmentSubmissions) {
    const d = s.data || {}
    try {
      await pb.collection("assessmentSubmissions").create({
        studentId: d.studentId || "",
        studentName: d.studentName || "",
        resourceId: d.resourceId || "",
        assessmentId: d.assessmentId || "",
        answers: d.answers || {},
        score: d.score ?? 0,
        totalPoints: d.totalPoints ?? 0,
        submittedAt: tsToIso(d.submittedAt) || "",
      })
    } catch (err) {
      console.error(`  assessment submission failed:`, err.message)
    }
  }
  console.log(`Seeded ${assessmentSubmissions.length} assessmentSubmissions`)

  // --- activities ---
  for (const a of activities) {
    const d = a.data || {}
    try {
      await pb.collection("activities").create({
        status: d.status || "Completed",
        user: d.user || "",
        action: d.action || "",
        detail: d.detail || "",
        createdAt: tsToIso(d.createdAt) || "",
      })
    } catch (err) {
      console.error(`  activity failed:`, err.message)
    }
  }
  console.log(`Seeded ${activities.length} activities`)

  console.log("MIGRATION DONE")
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err)
  process.exit(1)
})

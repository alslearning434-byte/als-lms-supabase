import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { resolve } from "path"

const serviceAccount = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../als-learning-database-firebase-adminsdk-fbsvc-b2db3e72d6.json"), "utf-8")
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function run() {
  const existing = await db.collection("activities").limit(1).get()
  if (!existing.empty) {
    console.log("Activities collection already has records — skipping seed.")
    return
  }

  const now = new Date()
  const at = (hoursAgo, minutes = 0) => {
    const d = new Date(now.getTime() - hoursAgo * 3600000 - minutes * 60000)
    return d.toISOString()
  }

  const records = [
    { status: "Completed", user: "admin@gmail.com", action: "User Provision", detail: "New teacher account created (Grace Lopez)", createdAt: at(5, 30) },
    { status: "Completed", user: "system", action: "Backup", detail: "Automatic database backup completed", createdAt: at(9) },
    { status: "Completed", user: "admin@gmail.com", action: "Backup", detail: "Manual database backup completed", createdAt: at(20, 45) },
    { status: "Completed", user: "juan.delacruz@gmail.com", action: "Login", detail: "Signed in to the system", createdAt: at(26, 15) },
    { status: "Completed", user: "maria.santos@gmail.com", action: "Registration", detail: "New student account registered", createdAt: at(30) },
    { status: "In Progress", user: "michael.reyes@gmail.com", action: "Curriculum Update", detail: "Science module revision pending", createdAt: at(44, 20) },
    { status: "Completed", user: "system", action: "Backup", detail: "Automatic database backup completed", createdAt: at(57) },
    { status: "Completed", user: "system", action: "Security Scan", detail: "Weekly vulnerability scan — no threats", createdAt: at(70, 10) },
    { status: "Completed", user: "ana.gomez@gmail.com", action: "Login", detail: "Signed in to the system", createdAt: at(78, 40) },
    { status: "Completed", user: "admin@gmail.com", action: "User Provision", detail: "New teacher account created (Hector Villanueva)", createdAt: at(92, 25) },
  ]

  for (const r of records) {
    await db.collection("activities").add(r)
    console.log(`Seeded: ${r.action} (${r.user}) — ${r.createdAt}`)
  }

  console.log(`\nDone! ${records.length} activity records created.`)
}

run().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})

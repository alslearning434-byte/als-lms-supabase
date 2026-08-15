import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { resolve } from "path"

const serviceAccount = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../als-learning-database-firebase-adminsdk-fbsvc-b2db3e72d6.json"), "utf-8")
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function formatDate(d) {
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

async function run() {
  const existing = await db.collection("backups").limit(1).get()
  if (!existing.empty) {
    console.log("Backups collection already has records — skipping seed.")
    return
  }

  const now = new Date()
  const records = []

  for (let i = 7; i >= 1; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(17, 0, 0, 0)
    records.push({
      date: formatDate(d),
      time: "05:00 PM",
      type: "Automatic",
      size: "1.2 GB",
      status: "Completed",
      createdAt: d.toISOString(),
    })
  }

  const manual = new Date(now)
  manual.setDate(manual.getDate() - 3)
  manual.setHours(10, 30, 0, 0)
  records.push({
    date: formatDate(manual),
    time: "10:30 AM",
    type: "Manual",
    size: "1.1 GB",
    status: "Completed",
    createdAt: manual.toISOString(),
  })

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  for (const r of records) {
    await db.collection("backups").add(r)
    console.log(`Seeded: ${r.date} at ${r.time} (${r.type})`)
  }

  console.log(`\nDone! ${records.length} backup records created.`)
}

run().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})

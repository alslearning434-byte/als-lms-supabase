import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const serviceAccount = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../als-learning-database-firebase-adminsdk-fbsvc-b2db3e72d6.json"), "utf-8")
)

initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth()
const db = getFirestore()

const PASSWORD = "ALSteacher123"

const teachers = [
  { first: "Maria", last: "Cruz", dept: "Junior High School", empId: "TCH-2026-001" },
  { first: "Jose", last: "Garcia", dept: "Senior High School", empId: "TCH-2026-002" },
  { first: "Anna", last: "Ramos", dept: "English", empId: "TCH-2026-003" },
  { first: "Ricardo", last: "Santos", dept: "Filipino", empId: "TCH-2026-004" },
  { first: "Elena", last: "Mendoza", dept: "Science & Mathematics", empId: "TCH-2026-005" },
  { first: "Fernando", last: "Torres", dept: "MAPEH", empId: "TCH-2026-006" },
  { first: "Grace", last: "Lopez", dept: "TLE", empId: "TCH-2026-007" },
  { first: "Hector", last: "Villanueva", dept: "ABM", empId: "TCH-2026-008" },
  { first: "Isabel", last: "Fernandez", dept: "HUMSS", empId: "TCH-2026-009" },
  { first: "Kenneth", last: "Aquino", dept: "STEM", empId: "TCH-2026-010" },
  { first: "Lorna", last: "Rivera", dept: "TVL", empId: "TCH-2026-011" },
  { first: "Miguel", last: "Gonzales", dept: "Junior High School", empId: "TCH-2026-012" },
]

const prefixes = ["0905","0906","0907","0908","0909","0910","0912","0915","0917","0918","0919","0920","0921","0926","0927","0928","0929","0930","0935","0936","0938","0939","0945","0946","0947","0948","0949","0950","0951","0953","0955","0956","0961","0966","0967","0968","0969","0970","0975","0977","0978","0979","0981","0985","0991","0992","0995","0997","0998","0999"]

function genPhone() {
  let p = prefixes[Math.floor(Math.random() * prefixes.length)]
  let r = ""
  for (let i = 0; i < 7; i++) r += Math.floor(Math.random() * 10)
  return p + r
}

async function run() {
  const credentials = []
  console.log("Seeding teachers...\n")

  for (const t of teachers) {
    const email = t.first.toLowerCase() + "." + t.last.toLowerCase() + "@gmail.com"
    const phone = genPhone()
    const joinDate = "July 2026"

    try {
      const u = await auth.createUser({
        email,
        password: PASSWORD,
        displayName: t.first + " " + t.last,
        emailVerified: false,
      })
      await db.collection("users").doc(u.uid).set({
        uid: u.uid,
        email,
        displayName: t.first + " " + t.last,
        role: "teacher",
        employeeId: t.empId,
        department: t.dept,
        phone,
        joinDate,
      })
      credentials.push({ name: t.first + " " + t.last, email, password: PASSWORD, phone, empId: t.empId, dept: t.dept })
      console.log("Created: " + t.first + " " + t.last + " (" + email + ")")
    } catch (e) {
      console.log("FAILED: " + t.first + " " + t.last + " (" + e.message + ")")
    }
  }

  let out = "ALS TEACHER CREDENTIALS\n"
  out += "=".repeat(70) + "\n"
  out += "Generated: " + new Date().toLocaleString() + "\n"
  out += "Total teachers: " + credentials.length + "\n"
  out += "Default password: ALSteacher123\n"
  out += "=".repeat(70) + "\n\n"

  credentials.forEach((c, i) => {
    out += String(i + 1).padStart(2, " ") + ". " + c.name + "\n"
    out += "    Email:       " + c.email + "\n"
    out += "    Password:    " + c.password + "\n"
    out += "    Phone:       " + c.phone + "\n"
    out += "    Employee ID: " + c.empId + "\n"
    out += "    Department:  " + c.dept + "\n\n"
  })

  out += "=".repeat(70) + "\nEND OF FILE\n"

  const outputPath = resolve(import.meta.dirname, "teacher-credentials.txt")
  writeFileSync(outputPath, out, "utf-8")

  console.log("\nDone! " + credentials.length + " teachers created.")
  console.log("Credentials saved to: " + outputPath)
}

run().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})

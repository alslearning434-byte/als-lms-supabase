import { initializeApp, cert, applicationDefault } from "firebase-admin/app"
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

const PASSWORD = "ALSstudent123"

const jhsStudents = [
  { first: "Juan", last: "Dela Cruz", grade: "Grade 7" },
  { first: "Maria", last: "Santos", grade: "Grade 7" },
  { first: "Pedro", last: "Reyes", grade: "Grade 7" },
  { first: "Ana", last: "Gomez", grade: "Grade 7" },
  { first: "Carlos", last: "Tan", grade: "Grade 7" },
  { first: "Liza", last: "Santos", grade: "Grade 8" },
  { first: "Ricardo", last: "Garcia", grade: "Grade 8" },
  { first: "Maria", last: "Flores", grade: "Grade 8" },
  { first: "Ben", last: "Mendoza", grade: "Grade 8" },
  { first: "Celia", last: "Villanueva", grade: "Grade 8" },
  { first: "Dante", last: "Aquino", grade: "Grade 9" },
  { first: "Elena", last: "Santiago", grade: "Grade 9" },
  { first: "Fernando", last: "Cruz", grade: "Grade 9" },
  { first: "Gina", last: "Villar", grade: "Grade 9" },
  { first: "Hector", last: "Santos", grade: "Grade 9" },
  { first: "Isabella", last: "Ramos", grade: "Grade 10" },
  { first: "Joel", last: "Bautista", grade: "Grade 10" },
  { first: "Karen", last: "Lim", grade: "Grade 10" },
  { first: "Leo", last: "Fernandez", grade: "Grade 10" },
  { first: "Mona", last: "Dela Torre", grade: "Grade 10" },
  { first: "Nestor", last: "Aguilar", grade: "Grade 7" },
  { first: "Olivia", last: "Manalo", grade: "Grade 7" },
  { first: "Paolo", last: "Ramirez", grade: "Grade 8" },
  { first: "Queenie", last: "Sison", grade: "Grade 8" },
  { first: "Rafael", last: "Torres", grade: "Grade 9" },
  { first: "Sofia", last: "Mercado", grade: "Grade 9" },
  { first: "Tomas", last: "Rivera", grade: "Grade 10" },
  { first: "Ursula", last: "David", grade: "Grade 10" },
  { first: "Victor", last: "Gonzales", grade: "Grade 7" },
  { first: "Wanda", last: "Pineda", grade: "Grade 8" },
]

const shsStudents = [
  { first: "Angela", last: "Pangilinan", grade: "Grade 11", strand: "STEM" },
  { first: "Bong", last: "Salazar", grade: "Grade 11", strand: "STEM" },
  { first: "Cathy", last: "Lopez", grade: "Grade 11", strand: "ABM" },
  { first: "Dexter", last: "Alcantara", grade: "Grade 11", strand: "ABM" },
  { first: "Eva", last: "Magtoto", grade: "Grade 11", strand: "HUMSS" },
  { first: "Freddie", last: "Natividad", grade: "Grade 11", strand: "HUMSS" },
  { first: "Grace", last: "Zamora", grade: "Grade 11", strand: "TVL" },
  { first: "Henry", last: "Tambong", grade: "Grade 11", strand: "TVL" },
  { first: "Iris", last: "Valenzuela", grade: "Grade 11", strand: "STEM" },
  { first: "Jeko", last: "Resurreccion", grade: "Grade 11", strand: "ABM" },
  { first: "Kyla", last: "Manansala", grade: "Grade 11", strand: "HUMSS" },
  { first: "Luis", last: "Catapang", grade: "Grade 11", strand: "TVL" },
  { first: "Mitch", last: "Araneta", grade: "Grade 12", strand: "STEM" },
  { first: "Noel", last: "Tengco", grade: "Grade 12", strand: "STEM" },
  { first: "Oscar", last: "Ramos", grade: "Grade 12", strand: "ABM" },
  { first: "Paula", last: "Martinez", grade: "Grade 12", strand: "ABM" },
  { first: "Quinn", last: "Cruz", grade: "Grade 12", strand: "HUMSS" },
  { first: "Ria", last: "Dimagiba", grade: "Grade 12", strand: "HUMSS" },
  { first: "Sam", last: "Jimenez", grade: "Grade 12", strand: "TVL" },
  { first: "Trisha", last: "Angeles", grade: "Grade 12", strand: "TVL" },
  { first: "Uriel", last: "Salvacion", grade: "Grade 12", strand: "STEM" },
  { first: "Vince", last: "Macapagal", grade: "Grade 12", strand: "ABM" },
  { first: "Wendy", last: "Corpuz", grade: "Grade 12", strand: "HUMSS" },
  { first: "Yanni", last: "Del Rosario", grade: "Grade 12", strand: "TVL" },
  { first: "Zandro", last: "Cabrera", grade: "Grade 11", strand: "STEM" },
  { first: "Kevin", last: "Torres", grade: "Grade 11", strand: "ABM" },
  { first: "Nina", last: "Perez", grade: "Grade 11", strand: "HUMSS" },
  { first: "Jose", last: "Lopez", grade: "Grade 12", strand: "TVL" },
  { first: "Rosa", last: "Navarro", grade: "Grade 12", strand: "STEM" },
  { first: "Maria", last: "Bautista", grade: "Grade 11", strand: "ABM" },
]

function generateLRN() {
  let lrn = ""
  for (let i = 0; i < 12; i++) lrn += Math.floor(Math.random() * 10)
  return lrn
}

function generatePhone() {
  const prefix = ["0905","0906","0907","0908","0909","0910","0912","0915","0917","0918","0919","0920","0921","0926","0927","0928","0929","0930","0935","0936","0938","0939","0945","0946","0947","0948","0949","0950","0951","0953","0955","0956","0961","0966","0967","0968","0969","0970","0975","0977","0978","0979","0981","0985","0991","0992","0995","0997","0998","0999"]
  const p = prefix[Math.floor(Math.random() * prefix.length)]
  let rest = ""
  for (let i = 0; i < 7; i++) rest += Math.floor(Math.random() * 10)
  return p + rest
}

function makeEmail(first, last) {
  return `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}@gmail.com`
}

async function run() {
  const credentials = []

  console.log("Seeding 60 students...\n")

  // Seed JHS students
  console.log("--- Junior High School (30 students) ---")
  for (let i = 0; i < jhsStudents.length; i++) {
    const s = jhsStudents[i]
    const email = makeEmail(s.first, s.last)
    const lrn = generateLRN()
    const phone = generatePhone()

    const userRecord = await auth.createUser({
      email,
      password: PASSWORD,
      displayName: `${s.first} ${s.last}`,
      emailVerified: false,
    })

    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: `${s.first} ${s.last}`,
      role: "student",
      lrn,
      gradeLevel: s.grade,
      phone,
    })

    credentials.push({
      name: `${s.first} ${s.last}`,
      email,
      password: PASSWORD,
      lrn,
      phone,
      gradeLevel: `${s.grade} - Junior High School`,
    })

    console.log(`  [${i + 1}/30] ${s.first} ${s.last} (${email})`)
  }

  // Seed SHS students
  console.log("\n--- Senior High School (30 students) ---")
  for (let i = 0; i < shsStudents.length; i++) {
    const s = shsStudents[i]
    const email = makeEmail(s.first, s.last)
    const lrn = generateLRN()
    const phone = generatePhone()

    const userRecord = await auth.createUser({
      email,
      password: PASSWORD,
      displayName: `${s.first} ${s.last}`,
      emailVerified: false,
    })

    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: `${s.first} ${s.last}`,
      role: "student",
      lrn,
      gradeLevel: "Senior High School",
      phone,
    })

    credentials.push({
      name: `${s.first} ${s.last}`,
      email,
      password: PASSWORD,
      lrn,
      phone,
      gradeLevel: `${s.grade} - Senior High School (${s.strand})`,
    })

    console.log(`  [${i + 1}/30] ${s.first} ${s.last} (${email})`)
  }

  // Write credentials file
  let output = "ALS STUDENT CREDENTIALS\n"
  output += "=".repeat(70) + "\n"
  output += `Generated: ${new Date().toLocaleString()}\n`
  output += `Total students: ${credentials.length}\n`
  output += `Default password: ${PASSWORD}\n`
  output += "=".repeat(70) + "\n\n"

  output += "JUNIOR HIGH SCHOOL STUDENTS\n"
  output += "-".repeat(70) + "\n"
  credentials.filter((c) => c.gradeLevel.includes("Junior")).forEach((c, i) => {
    output += `${String(i + 1).padStart(2, " ")}. ${c.name}\n`
    output += `    Email:    ${c.email}\n`
    output += `    Password: ${c.password}\n`
    output += `    LRN:      ${c.lrn}\n`
    output += `    Level:    ${c.gradeLevel}\n\n`
  })

  output += "\nSENIOR HIGH SCHOOL STUDENTS\n"
  output += "-".repeat(70) + "\n"
  credentials.filter((c) => c.gradeLevel.includes("Senior")).forEach((c, i) => {
    output += `${String(i + 1).padStart(2, " ")}. ${c.name}\n`
    output += `    Email:    ${c.email}\n`
    output += `    Password: ${c.password}\n`
    output += `    LRN:      ${c.lrn}\n`
    output += `    Level:    ${c.gradeLevel}\n\n`
  })

  output += "=".repeat(70) + "\n"
  output += "END OF FILE\n"

  const outputPath = resolve(import.meta.dirname, "student-credentials.txt")
  writeFileSync(outputPath, output, "utf-8")

  console.log(`\nDone! ${credentials.length} students created.`)
  console.log(`Credentials saved to: ${outputPath}`)
}

run().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})

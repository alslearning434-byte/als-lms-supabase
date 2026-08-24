import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://rvzinlsvuguyiogetbee.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2emlubHN2dWd1eWlvZ2V0YmVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzEyNjAxMSwiZXhwIjoyMTAyNzAyMDExfQ._dMR2Ba9fAVdtPNsc_rpun0giI3kDexQ1QuRdfVT1BQ"

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const users = [
  { email: "student@gmail.com", password: "ALSstudent123", name: "ALS Student", role: "student", lrn: "123456789012", grade_level: "11" },
  { email: "teacher@gmail.com", password: "ALSteacher123", name: "ALS Teacher", role: "teacher", employee_id: "T001", department: "Academic", join_date: "2024-01-15" },
  { email: "admin@gmail.com", password: "admin123", name: "ALS Admin", role: "admin", join_date: "2023-06-01" },
]

for (const u of users) {
  console.log(`Creating ${u.email}...`)
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name },
  })
  if (error) {
    if (error.message?.includes("already")) {
      console.log(`  ${u.email} already exists, skipping auth creation`)
      const { data: existing } = await admin.auth.admin.listUsers()
      const ex = existing?.users?.find((u2) => u2.email === u.email)
      if (ex) {
        await admin.from("profiles").upsert({
          id: ex.id,
          uid: ex.id,
          name: u.name,
          email: u.email,
          role: u.role,
          lrn: u.lrn || "",
          grade_level: u.grade_level || "",
          employee_id: u.employee_id || "",
          department: u.department || "",
          join_date: u.join_date || "",
        })
        console.log(`  Profile upserted for ${u.email}`)
      }
      continue
    }
    console.error(`  Error:`, error.message)
    continue
  }
  const userId = data.user.id
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    uid: userId,
    name: u.name,
    email: u.email,
    role: u.role,
    lrn: u.lrn || "",
    grade_level: u.grade_level || "",
    employee_id: u.employee_id || "",
    department: u.department || "",
    join_date: u.join_date || "",
  })
  if (profileError) {
    console.error(`  Profile error:`, profileError.message)
  } else {
    console.log(`  Done: ${u.email} (id: ${userId})`)
  }
}

console.log("\nSeed complete!")

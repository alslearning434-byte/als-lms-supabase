import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://rvzinlsvuguyiogetbee.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2emlubHN2dWd1eWlvZ2V0YmVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzEyNjAxMSwiZXhwIjoyMTAyNzAyMDExfQ._dMR2Ba9fAVdtPNsc_rpun0giI3kDexQ1QuRdfVT1BQ"

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const users = [
  { email: "student@gmail.com", password: "ALSstudent123", name: "ALS Student", role: "student", lrn: "123456789012", grade_level: "11" },
  { email: "maria.santos@gmail.com", password: "ALSstudent123", name: "Maria Santos", role: "student", lrn: "123456789013", grade_level: "12" },
  { email: "juan.dela.cruz@gmail.com", password: "ALSstudent123", name: "Juan Dela Cruz", role: "student", lrn: "123456789014", grade_level: "10" },
  { email: "anna.reyes@gmail.com", password: "ALSstudent123", name: "Anna Reyes", role: "student", lrn: "123456789015", grade_level: "9" },
  { email: "carlos.garcia@gmail.com", password: "ALSstudent123", name: "Carlos Garcia", role: "student", lrn: "123456789016", grade_level: "7" },
  { email: "sofia.mendoza@gmail.com", password: "ALSstudent123", name: "Sofia Mendoza", role: "student", lrn: "123456789017", grade_level: "8" },
  { email: "miguel.lim@gmail.com", password: "ALSstudent123", name: "Miguel Lim", role: "student", lrn: "123456789018", grade_level: "11" },
  { email: "teacher@gmail.com", password: "ALSteacher123", name: "ALS Teacher", role: "teacher", employee_id: "T001", department: "Academic", join_date: "2024-01-15" },
  { email: "teacher2@gmail.com", password: "ALSteacher123", name: "Prof. Rivera", role: "teacher", employee_id: "T002", department: "Science", join_date: "2024-06-01" },
  { email: "teacher3@gmail.com", password: "ALSteacher123", name: "Ms. Cruz", role: "teacher", employee_id: "T003", department: "English", join_date: "2025-01-10" },
  { email: "admin@gmail.com", password: "admin123", name: "ALS Admin", role: "admin", join_date: "2023-06-01" },
]

const userIds = {}
const studentIds = []
const teacherIds = []

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
        if (!userIds[u.role]) userIds[u.role] = ex.id
        if (u.role === "student") { studentIds.push(ex.id); }
        if (u.role === "teacher") { teacherIds.push(ex.id); }
        await admin.from("profiles").upsert({
          id: ex.id, uid: ex.id, name: u.name, email: u.email, role: u.role,
          lrn: u.lrn || "", grade_level: u.grade_level || "",
          employee_id: u.employee_id || "", department: u.department || "",
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
  if (!userIds[u.role]) userIds[u.role] = userId
  if (u.role === "student") studentIds.push(userId)
  if (u.role === "teacher") teacherIds.push(userId)
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId, uid: userId, name: u.name, email: u.email, role: u.role,
    lrn: u.lrn || "", grade_level: u.grade_level || "",
    employee_id: u.employee_id || "", department: u.department || "",
    join_date: u.join_date || "",
  })
  if (profileError) console.error(`  Profile error:`, profileError.message)
  else console.log(`  Done: ${u.email} (id: ${userId})`)
}

console.log(`\nUser IDs: admin=${userIds.admin}, teacher=${teacherIds.length} teachers, student=${studentIds.length} students`)

const teacherNames = ["ALS Teacher", "Prof. Rivera", "Ms. Cruz"]

console.log("\n--- Cleaning previous seed data ---")
for (const tbl of ["resources", "announcements", "activities", "module_progress", "assignment_submissions", "quiz_submissions", "assessment_submissions", "backups"]) {
  const { error } = await admin.from(tbl).delete().neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) console.error(`  Clean ${tbl} error:`, error.message)
  else console.log(`  Cleaned ${tbl}`)
}

console.log("\n--- Seeding resources ---")

const resources = [
  {
    subject: "Mathematics",
    title: "Introduction to Algebra",
    description: "Learn the fundamentals of algebra including variables, equations, and expressions. This module covers the building blocks of algebraic thinking.",
    target_grade: "11",
    uploaded_by: teacherNames[0],
    uploaded_at: "2026-07-15T08:00:00.000Z",
    modules: [
      {
        name: "Variables and Expressions",
        description: "Understanding variables, constants, and algebraic expressions",
        blocks: [
          { id: "blk-1a", type: "content", topic: "What is a Variable?", description: "<h2>Variables and Expressions</h2><p>A <strong>variable</strong> is a symbol (usually a letter) that represents an unknown value. For example, in the expression <em>2x + 3</em>, <strong>x</strong> is the variable.</p><p>Variables allow us to write general rules and solve problems where specific values aren't yet known.</p><p>Common variables include x, y, z, a, b, and c.</p>" },
          { id: "blk-1b", type: "content", topic: "Algebraic Expressions", description: "<h2>Algebraic Expressions</h2><p>An <strong>algebraic expression</strong> is a combination of variables, numbers, and operations. Examples:</p><ul><li>3x + 2y - 5</li><li>a² + b²</li><li>2(n + 4)</li></ul><p>Remember: an expression is NOT an equation — it doesn't have an equals sign.</p>" },
          { id: "blk-1c", type: "table", topic: "Order of Operations", description: '{"rows":4,"cols":3,"cells":[["Order","Operation","Example"],["1","Parentheses","(2 + 3)"],["2","Exponents","2³ = 8"],["3","Multiplication/Division","4 × 2 = 8"]],"textAlign":"left"}' }
        ],
        tasks: [
          {
            id: "task-1a", type: "quiz", title: "Variables Quiz", description: "Test your understanding of variables and expressions.",
            dueDate: "2026-09-05T23:59:00.000Z", points: 20,
            attachments: [], allowLateSubmission: true, anonymous: false, rubric: [],
            assessment: {
              title: "Variables Quiz", description: "Answer all questions", accentColor: "#673AB7",
              questions: [
                { id: "q1", text: "In the expression 3x + 5, what is the variable?", type: "Multiple Choice", options: ["3", "x", "5", "3x"], correctAnswer: "x", required: true },
                { id: "q2", text: "Which of the following is an algebraic expression?", type: "Multiple Choice", options: ["x = 5", "3x + 2", "2 + 3 = 5", "None of the above"], correctAnswer: "3x + 2", required: true },
                { id: "q3", text: "A variable represents a known value.", type: "True/False", options: ["True", "False"], correctAnswer: "False", required: true },
              ]
            }
          },
          {
            id: "task-1b", type: "assignment", title: "Expression Worksheet", description: "Write 5 algebraic expressions based on word problems provided.",
            dueDate: "2026-09-07T23:59:00.000Z", points: 15,
            attachments: [{ name: "worksheet.pdf", url: "", type: "pdf" }],
            allowLateSubmission: true, anonymous: false,
            rubric: [{ criterion: "Correct use of variables", points: 5 }, { criterion: "Proper notation", points: 5 }, { criterion: "Complete solutions", points: 5 }]
          }
        ]
      },
      {
        name: "Solving Linear Equations",
        description: "Learn to solve one-step and two-step linear equations",
        blocks: [
          { id: "blk-2a", type: "content", topic: "One-Step Equations", description: "<h2>Solving One-Step Equations</h2><p>To solve a one-step equation, you perform the <strong>inverse operation</strong> on both sides.</p><p><strong>Example:</strong> Solve x + 5 = 12</p><p>Subtract 5 from both sides: x + 5 - 5 = 12 - 5 → x = 7</p><p>Check: 7 + 5 = 12 ✓</p>" },
          { id: "blk-2b", type: "content", topic: "Two-Step Equations", description: "<h2>Two-Step Equations</h2><p>Two-step equations require two inverse operations. The general approach is:</p><ol><li>Undo addition/subtraction first</li><li>Then undo multiplication/division</li></ol><p><strong>Example:</strong> Solve 2x + 3 = 11</p><p>Step 1: 2x + 3 - 3 = 11 - 3 → 2x = 8</p><p>Step 2: 2x ÷ 2 = 8 ÷ 2 → x = 4</p>" }
        ],
        tasks: [
          {
            id: "task-2a", type: "quiz", title: "Equations Quiz", description: "Practice solving linear equations.",
            dueDate: "2026-09-12T23:59:00.000Z", points: 20,
            attachments: [], allowLateSubmission: true, anonymous: false, rubric: [],
            assessment: {
              title: "Equations Quiz", description: "Solve each equation", accentColor: "#1e3a5f",
              questions: [
                { id: "q1", text: "Solve: x + 7 = 15", type: "Short Answer", options: [], correctAnswer: "8", required: true },
                { id: "q2", text: "Solve: 3x = 21", type: "Short Answer", options: [], correctAnswer: "7", required: true },
                { id: "q3", text: "Solve: 2x + 4 = 14", type: "Short Answer", options: [], correctAnswer: "5", required: true },
                { id: "q4", text: "Which operation undoes addition?", type: "Multiple Choice", options: ["Multiplication", "Division", "Subtraction", "Exponent"], correctAnswer: "Subtraction", required: true },
              ]
            }
          }
        ]
      }
    ],
    assessment: {
      title: "Algebra Module Exam", description: "Comprehensive exam covering all algebra topics.", accentColor: "#1e3a5f",
      questions: [
        { id: "eq1", text: "Solve for x: 3x - 6 = 15", type: "Short Answer", options: [], correctAnswer: "7", required: true },
        { id: "eq2", text: "Which is an example of a variable?", type: "Multiple Choice", options: ["5", "x", "+", "="], correctAnswer: "x", required: true },
        { id: "eq3", text: "Simplify: 2(x + 3)", type: "Short Answer", options: [], correctAnswer: "2x + 6", required: true },
        { id: "eq4", text: "A variable represents a known value.", type: "True/False", options: ["True", "False"], correctAnswer: "False", required: true },
      ]
    }
  },
  {
    subject: "Science",
    title: "Earth Science: Weather Systems",
    description: "Explore weather patterns, climate systems, and meteorological phenomena. Understand how weather forecasting works.",
    target_grade: "11",
    uploaded_by: teacherNames[1],
    uploaded_at: "2026-07-20T09:30:00.000Z",
    modules: [
      {
        name: "Introduction to Weather",
        description: "Understanding weather vs climate and basic weather elements",
        blocks: [
          { id: "blk-s1a", type: "content", topic: "Weather vs Climate", description: "<h2>Weather vs Climate</h2><p><strong>Weather</strong> describes the short-term conditions of the atmosphere — temperature, humidity, precipitation, wind — at a specific time and place.</p><p><strong>Climate</strong> is the average weather pattern for a region over a long period (typically 30+ years).</p><p>A helpful saying: <em>'Climate is what you expect, weather is what you get.'</em></p>" },
          { id: "blk-s1b", type: "content", topic: "Weather Elements", description: "<h2>Key Weather Elements</h2><ul><li><strong>Temperature</strong> — measure of heat energy in the air</li><li><strong>Humidity</strong> — amount of water vapor in the air</li><li><strong>Air Pressure</strong> — force exerted by the weight of the atmosphere</li><li><strong>Wind</strong> — horizontal movement of air from high to low pressure</li><li><strong>Precipitation</strong> — water falling as rain, snow, sleet, or hail</li></ul>" }
        ],
        tasks: [
          {
            id: "task-s1a", type: "discussion", title: "Local Weather Discussion", description: "Describe the weather in your area today and compare it with a classmate from a different region.",
            dueDate: "2026-09-08T23:59:00.000Z", points: 10,
            attachments: [], allowLateSubmission: true, anonymous: false, rubric: []
          }
        ]
      },
      {
        name: "Air Masses and Fronts",
        description: "Learn about different air masses and how fronts create weather changes",
        blocks: [
          { id: "blk-s2a", type: "content", topic: "Air Masses", description: "<h2>Air Masses</h2><p>An <strong>air mass</strong> is a large body of air with uniform temperature and humidity characteristics.</p><p>Types of air masses:</p><ul><li><strong>Maritime Tropical (mT)</strong> — warm and humid, brings rain</li><li><strong>Continental Polar (cP)</strong> — cold and dry, brings clear skies</li><li><strong>Maritime Polar (mP)</strong> — cool and moist</li><li><strong>Continental Tropical (cT)</strong> — warm and dry</li></ul>" },
          { id: "blk-s2b", type: "content", topic: "Weather Fronts", description: "<h2>Weather Fronts</h2><p>A <strong>front</strong> is the boundary between two air masses.</p><ul><li><strong>Cold Front</strong> — cold air pushes under warm air → thunderstorms, rapid temperature drop</li><li><strong>Warm Front</strong> — warm air slides over cold air → gradual rain, clouds clearing</li><li><strong>Stationary Front</strong> — neither air mass moves → prolonged rain</li><li><strong>Occluded Front</strong> — cold front overtakes warm front → mixed weather</li></ul>" }
        ],
        tasks: [
          {
            id: "task-s2a", type: "quiz", title: "Weather Fronts Quiz", description: "Identify different air masses and fronts.",
            dueDate: "2026-09-15T23:59:00.000Z", points: 20,
            attachments: [], allowLateSubmission: true, anonymous: false, rubric: [],
            assessment: {
              title: "Weather Fronts Quiz", description: "Select the best answer for each question.", accentColor: "#2E7D32",
              questions: [
                { id: "sq1", text: "Which air mass brings warm, humid conditions?", type: "Multiple Choice", options: ["Continental Polar", "Maritime Tropical", "Continental Tropical", "Maritime Polar"], correctAnswer: "Maritime Tropical", required: true },
                { id: "sq2", text: "A cold front typically produces thunderstorms.", type: "True/False", options: ["True", "False"], correctAnswer: "True", required: true },
                { id: "sq3", text: "Which front occurs when a cold front overtakes a warm front?", type: "Multiple Choice", options: ["Cold front", "Warm front", "Stationary front", "Occluded front"], correctAnswer: "Occluded front", required: true },
              ]
            }
          }
        ]
      }
    ]
  },
  {
    subject: "English",
    title: "Creative Writing Workshop",
    description: "Develop your creative writing skills through storytelling techniques, poetry, and descriptive writing exercises.",
    target_grade: "11",
    uploaded_by: teacherNames[2],
    uploaded_at: "2026-08-01T10:00:00.000Z",
    modules: [
      {
        name: "Elements of Storytelling",
        description: "Master the core elements: character, setting, plot, and conflict",
        blocks: [
          { id: "blk-e1a", type: "content", topic: "Story Structure", description: "<h2>Elements of a Story</h2><p>Every good story contains these essential elements:</p><ol><li><strong>Character</strong> — the people (or beings) the story is about</li><li><strong>Setting</strong> — where and when the story takes place</li><li><strong>Plot</strong> — the sequence of events that make up the story</li><li><strong>Conflict</strong> — the central problem or challenge the characters face</li><li><strong>Theme</strong> — the underlying message or lesson of the story</li></ol>" },
          { id: "blk-e1b", type: "content", topic: "Show Don't Tell", description: "<h2>Show, Don't Tell</h2><p>One of the most important principles in creative writing. Instead of telling the reader what a character feels, <strong>show</strong> it through actions, dialogue, and sensory details.</p><p><strong>Tell:</strong> Maria was angry.</p><p><strong>Show:</strong> Maria slammed the door, her jaw tight and her hands balled into fists at her sides.</p><p>This technique draws readers into the story and makes the experience vivid and immersive.</p>" }
        ],
        tasks: [
          {
            id: "task-e1a", type: "assignment", title: "Character Sketch", description: "Write a 300-word character sketch of a fictional person. Use the 'show, don't tell' technique.",
            dueDate: "2026-09-10T23:59:00.000Z", points: 25,
            attachments: [], allowLateSubmission: true, anonymous: false,
            rubric: [
              { criterion: "Effective use of show don't tell", points: 10 },
              { criterion: "Descriptive language and sensory details", points: 8 },
              { criterion: "Grammar and spelling", points: 7 }
            ]
          }
        ]
      }
    ],
    assessment: {
      title: "Creative Writing Assessment", description: "Demonstrate your understanding of storytelling elements.", accentColor: "#E65100",
      questions: [
        { id: "eq-e1", text: "Name the 5 essential elements of a story.", type: "Paragraph", options: [], correctAnswer: "", required: true, placeholder: "List and briefly describe each element..." },
        { id: "eq-e2", text: "What is the difference between 'showing' and 'telling' in writing?", type: "Paragraph", options: [], correctAnswer: "", required: true, placeholder: "Explain with an example..." },
      ]
    }
  },
  {
    subject: "Filipino",
    title: "Pagbasa at Pagsulat",
    description: "Paghahasa sa kasanayan sa pagbasa at pagsulat sa wikang Filipino.",
    target_grade: "11",
    uploaded_by: teacherNames[0],
    uploaded_at: "2026-08-05T11:00:00.000Z",
    modules: [
      {
        name: "Mga Uri ng Teksto",
        description: "Pagkilala sa iba't ibang uri ng teksto sa Filipino",
        blocks: [
          { id: "blk-f1a", type: "content", topic: "Mga Teksto", description: "<h2>Mga Uri ng Teksto</h2><p>Ang mga teksto sa Filipino ay nahahati sa tatlong pangunahing uri:</p><ol><li><strong>Naratibo</strong> — nagsasalaysay ng kwento (maikling kwento, nobela)</li><li><strong>Ekspositori</strong> — nagpapaliwanag o nagbibigay impormasyon (sanaysay, balita)</li><li><strong>Persweysib</strong> — humihikayat o nagkukumbinsi (halalan, advertisement)</li></ol>" }
        ],
        tasks: []
      }
    ]
  },
  {
    subject: "Mathematics",
    title: "Geometry: Shapes and Space",
    description: "Study geometric shapes, their properties, area, perimeter, and spatial reasoning.",
    target_grade: "11",
    uploaded_by: teacherNames[1],
    uploaded_at: "2026-08-10T08:00:00.000Z",
    modules: [
      {
        name: "Basic Geometric Shapes",
        description: "Properties of triangles, quadrilaterals, and circles",
        blocks: [
          { id: "blk-g1a", type: "content", topic: "Triangles", description: "<h2>Triangles</h2><p>A <strong>triangle</strong> is a polygon with three sides and three angles. The sum of all angles in a triangle is always <strong>180°</strong>.</p><p>Types of triangles:</p><ul><li><strong>Equilateral</strong> — all sides and angles equal</li><li><strong>Isosceles</strong> — two sides equal</li><li><strong>Scalene</strong> — no sides equal</li></ul><p><strong>Area of a triangle</strong> = ½ × base × height</p>" }
        ],
        tasks: []
      }
    ]
  }
]

const resourceIds = []
for (const r of resources) {
  const { data, error } = await admin.from("resources").insert(r).select("id").single()
  if (error) console.error(`  Resource "${r.title}" error:`, error.message)
  else { resourceIds.push(data.id); console.log(`  Resource: ${r.title} (${data.id})`) }
}

console.log("\n--- Seeding announcements ---")
const today = new Date()
const fmt = (d) => d.toISOString().split("T")[0]

const announcements = [
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate())), text: "Welcome back to school! Classes resume today. Check your modules for updated content.", category: "General" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)), text: "Midterm examinations will begin next week. Prepare accordingly.", category: "Exam" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)), text: "School Holiday — Rizal Day celebration. No classes.", category: "Holiday" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)), text: "Parent-Teacher Conference scheduled. Parents are encouraged to attend.", category: "Meeting" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)), text: "Intramurals week! Represent your grade level with pride.", category: "Event" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)), text: "Orientation for new students held successfully. Welcome to ALS!", category: "General" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)), text: "System maintenance completed. All modules are now accessible.", category: "General" },
  { date: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 1)), text: "Final examinations schedule released. Check the admin portal for details.", category: "Exam" },
]

for (const a of announcements) {
  const { error } = await admin.from("announcements").insert(a)
  if (error) console.error(`  Announcement error:`, error.message)
  else console.log(`  Announcement: ${a.text.substring(0, 40)}...`)
}

console.log("\n--- Seeding activities ---")
const activities = [
  { status: "Completed", user_name: "ALS Teacher", action: "Created module", detail: "Introduction to Algebra" },
  { status: "Completed", user_name: "ALS Teacher", action: "Created module", detail: "Earth Science: Weather Systems" },
  { status: "Completed", user_name: "ALS Teacher", action: "Created module", detail: "Creative Writing Workshop" },
  { status: "Completed", user_name: "ALS Student", action: "Submitted assignment", detail: "Expression Worksheet" },
  { status: "Completed", user_name: "ALS Student", action: "Completed quiz", detail: "Variables Quiz — Score: 85%" },
  { status: "Completed", user_name: "ALS Admin", action: "System backup", detail: "Full backup completed" },
  { status: "In Progress", user_name: "Maria Santos", action: "Viewing module", detail: "Solving Linear Equations" },
  { status: "Completed", user_name: "ALS Teacher", action: "Graded submission", detail: "Character Sketch — 22/25" },
  { status: "Completed", user_name: "Juan Dela Cruz", action: "Completed quiz", detail: "Variables Quiz — Score: 80%" },
  { status: "Completed", user_name: "ALS Admin", action: "Created user", detail: "Registered new student accounts" },
  { status: "Completed", user_name: "Prof. Rivera", action: "Updated module", detail: "Added new content to Weather Systems" },
  { status: "Completed", user_name: "Anna Reyes", action: "Submitted assignment", detail: "Expression Worksheet — Mathematics" },
  { status: "Completed", user_name: "Ms. Cruz", action: "Created module", detail: "Creative Writing Workshop" },
  { status: "Completed", user_name: "Carlos Garcia", action: "Completed quiz", detail: "Weather Fronts Quiz — Score: 70%" },
  { status: "Completed", user_name: "Sofia Mendoza", action: "Viewing module", detail: "Elements of Storytelling" },
  { status: "Completed", user_name: "Miguel Lim", action: "Submitted assignment", detail: "Character Sketch — Creative Writing" },
  { status: "Completed", user_name: "ALS Teacher", action: "Graded submission", detail: "Expression Worksheet — 13/15" },
  { status: "In Progress", user_name: "Maria Santos", action: "Taking quiz", detail: "Equations Quiz" },
]

for (const a of activities) {
  a.created_at = new Date(Date.now() - Math.random() * 14 * 86400000).toISOString()
  const { error } = await admin.from("activities").insert(a)
  if (error) console.error(`  Activity error:`, error.message)
}
console.log(`  Inserted ${activities.length} activities`)

const studentNames = ["ALS Student", "Maria Santos", "Juan Dela Cruz", "Anna Reyes", "Carlos Garcia", "Sofia Mendoza", "Miguel Lim"]

console.log("\n--- Seeding module_progress ---")
if (studentIds.length > 0 && resourceIds.length > 0) {
  const progressRecords = []
  studentIds.forEach((sid, i) => {
    progressRecords.push({ user_id: sid, resource_id: resourceIds[0], viewed_modules: [0], last_viewed_at: new Date(Date.now() - (i + 1) * 86400000).toISOString() })
    if (i < 4) progressRecords.push({ user_id: sid, resource_id: resourceIds[1], viewed_modules: i < 2 ? [0, 1] : [0], last_viewed_at: new Date(Date.now() - i * 86400000).toISOString() })
    if (i < 3) progressRecords.push({ user_id: sid, resource_id: resourceIds[2], viewed_modules: [0], last_viewed_at: new Date(Date.now() - (i + 2) * 86400000).toISOString() })
    if (i === 0) progressRecords.push({ user_id: sid, resource_id: resourceIds[3], viewed_modules: [0], last_viewed_at: new Date(Date.now() - 3 * 86400000).toISOString() })
  })
  let inserted = 0
  for (const p of progressRecords) {
    const { error } = await admin.from("module_progress").insert(p)
    if (error) console.error(`  Progress error:`, error.message)
    else inserted++
  }
  console.log(`  Inserted ${inserted} progress records`)
}

console.log("\n--- Seeding assignment_submissions ---")
if (studentIds.length > 0 && resourceIds.length > 0) {
  const submissions = [
    { student_id: studentIds[0], student_name: studentNames[0], resource_id: resourceIds[0], module_idx: 0, task_id: "task-1b", file_name: "expression_worksheet.pdf", note: "Completed all 5 problems.", submitted_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { student_id: studentIds[0], student_name: studentNames[0], resource_id: resourceIds[2], module_idx: 0, task_id: "task-e1a", file_name: "character_sketch.docx", note: "Wrote about Elena.", submitted_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { student_id: studentIds[1], student_name: studentNames[1], resource_id: resourceIds[0], module_idx: 0, task_id: "task-1b", file_name: "maria_algebra_worksheet.pdf", note: "All problems completed with solutions.", submitted_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    { student_id: studentIds[1], student_name: studentNames[1], resource_id: resourceIds[2], module_idx: 0, task_id: "task-e1a", file_name: "maria_character_sketch.pdf", note: "A story about resilience.", submitted_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { student_id: studentIds[2], student_name: studentNames[2], resource_id: resourceIds[0], module_idx: 0, task_id: "task-1b", file_name: "juan_algebra.pdf", note: "Submitted late due to illness.", submitted_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { student_id: studentIds[3], student_name: studentNames[3], resource_id: resourceIds[0], module_idx: 0, task_id: "task-1b", file_name: "anna_worksheet.pdf", note: "Completed ahead of schedule.", submitted_at: new Date(Date.now() - 6 * 86400000).toISOString() },
    { student_id: studentIds[5], student_name: studentNames[5], resource_id: resourceIds[2], module_idx: 0, task_id: "task-e1a", file_name: "sofia_sketch.docx", note: "About a fictional hero.", submitted_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { student_id: studentIds[6], student_name: studentNames[6], resource_id: resourceIds[2], module_idx: 0, task_id: "task-e1a", file_name: "miguel_creative_writing.pdf", note: "Character analysis.", submitted_at: new Date().toISOString() },
  ]
  let inserted = 0
  for (const s of submissions) {
    const { error } = await admin.from("assignment_submissions").insert({ student_id: s.student_id, resource_id: s.resource_id, module_idx: s.module_idx, task_id: s.task_id, file_name: s.file_name, note: s.note, submitted_at: s.submitted_at })
    if (error) console.error(`  Submission error:`, error.message)
    else inserted++
  }
  console.log(`  Inserted ${inserted} assignment submissions`)
}

console.log("\n--- Seeding quiz_submissions ---")
if (studentIds.length > 0 && resourceIds.length > 0) {
  const quizSubs = [
    { resource_id: resourceIds[0], module_idx: 0, student_id: studentIds[0], student_name: studentNames[0], score: 3, total: 3, passed: true, answers: { q1: "x", q2: "3x + 2", q3: "False" }, submitted_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    { resource_id: resourceIds[1], module_idx: 1, student_id: studentIds[0], student_name: studentNames[0], score: 2, total: 3, passed: false, answers: { sq1: "Maritime Tropical", sq2: "True", sq3: "Cold front" }, submitted_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { resource_id: resourceIds[0], module_idx: 0, student_id: studentIds[1], student_name: studentNames[1], score: 3, total: 3, passed: true, answers: { q1: "x", q2: "3x + 2", q3: "False" }, submitted_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { resource_id: resourceIds[0], module_idx: 0, student_id: studentIds[2], student_name: studentNames[2], score: 2, total: 3, passed: false, answers: { q1: "x", q2: "x = 5", q3: "False" }, submitted_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { resource_id: resourceIds[0], module_idx: 0, student_id: studentIds[3], student_name: studentNames[3], score: 3, total: 3, passed: true, answers: { q1: "x", q2: "3x + 2", q3: "False" }, submitted_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { resource_id: resourceIds[1], module_idx: 0, student_id: studentIds[4], student_name: studentNames[4], score: 2, total: 3, passed: false, answers: { sq1: "Continental Polar", sq2: "True", sq3: "Occluded front" }, submitted_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { resource_id: resourceIds[1], module_idx: 1, student_id: studentIds[5], student_name: studentNames[5], score: 3, total: 3, passed: true, answers: { sq1: "Maritime Tropical", sq2: "True", sq3: "Occluded front" }, submitted_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { resource_id: resourceIds[0], module_idx: 0, student_id: studentIds[6], student_name: studentNames[6], score: 2, total: 3, passed: false, answers: { q1: "5", q2: "3x + 2", q3: "True" }, submitted_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  ]
  let inserted = 0
  for (const q of quizSubs) {
    const { error } = await admin.from("quiz_submissions").insert(q)
    if (error) console.error(`  Quiz sub error:`, error.message)
    else inserted++
  }
  console.log(`  Inserted ${inserted} quiz submissions`)
}

console.log("\n--- Seeding backups ---")
const backupData = [
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)), time: "02:00 AM", type: "Scheduled", size: "2.4 MB", bytes: 2516582, status: "Completed", doc_count: 24, file_count: 8 },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14)), time: "02:00 AM", type: "Scheduled", size: "2.1 MB", bytes: 2202009, status: "Completed", doc_count: 20, file_count: 6 },
  { date: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)), time: "03:45 PM", type: "Manual", size: "2.6 MB", bytes: 2726297, status: "Completed", doc_count: 28, file_count: 10 },
]
for (const b of backupData) {
  const { error } = await admin.from("backups").insert(b)
  if (error) console.error(`  Backup error:`, error.message)
  else console.log(`  Backup: ${b.date} (${b.size})`)
}

console.log("\n=== Seed complete! ===")
console.log("Summary:")
console.log(`  - ${users.length} users (${teacherIds.length} teachers, ${studentIds.length} students, 1 admin)`)
console.log(`  - ${resources.length} resources (modules with content, tasks, assessments)`)
console.log(`  - ${announcements.length} announcements (various categories)`)
console.log(`  - ${activities.length} activities`)
console.log(`  - Progress, submissions, and quiz results across all students`)
console.log(`  - ${backupData.length} backups`)

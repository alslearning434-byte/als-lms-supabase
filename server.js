import { config } from "dotenv"
config({ path: ".env.local" })
import express from "express"
import multer from "multer"
import cors from "cors"
import os from "os"
import { readdirSync, statSync, createWriteStream } from "fs"
import { mkdir, readFile, readdir, unlink, writeFile, rm } from "fs/promises"
import { fileURLToPath } from "url"
import { dirname, join, extname, basename } from "path"
import { createClient } from "@supabase/supabase-js"
import { createGzip, createGunzip } from "zlib"
import { pipeline } from "stream/promises"
import { Readable } from "stream"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: "5mb" }))

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`)
  next()
})

const GROQ_API_KEY = process.env.GROQ_API_KEY || null

// ── Supabase (server-side) ──

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rvzinlsvuguyiogetbee.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2emlubHN2dWd1eWlvZ2V0YmVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzEyNjAxMSwiZXhwIjoyMTAyNzAyMDExfQ._dMR2Ba9fAVdtPNsc_rpun0giI3kDexQ1QuRdfVT1BQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BACKUP_DIR = join(__dirname, "backups")
const BACKUP_TABLES = [
  "profiles", "resources", "module_progress", "assessment_submissions",
  "quiz_submissions", "assignment_submissions", "activities", "backups",
]
const RESTORE_TABLE_MAP = {
  users: "profiles",
  moduleProgress: "module_progress",
  assignmentSubmissions: "assignment_submissions",
  quizSubmissions: "quiz_submissions",
  assessmentSubmissions: "assessment_submissions",
}
const BACKUP_HOUR = 17
const BACKUP_RETENTION_DAYS = 30
const BACKUP_CHUNK_SIZE_MB = 50

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function formatDate(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

let backupInProgress = false
let nextBackupAt = null

async function logBackupActivity(action, detail) {
  try {
    await supabase.from("activities").insert({
      status: "Completed",
      user_name: "system",
      action,
      detail,
      created_at: new Date().toISOString(),
    })
  } catch { /* activity log is non-critical */ }
}

async function runBackup(type = "Manual") {
  if (backupInProgress) throw new Error("A backup is already in progress. Please wait for it to finish.")
  backupInProgress = true
  try {
    const now = new Date()
    const backupId = `${now.getTime()}`
    const collections = {}
    let docCount = 0
    for (const name of BACKUP_TABLES) {
      const { data } = await supabase.from(name).select("*")
      const records = data ?? []
      collections[name] = records.map((d) => ({ id: d.id, data: d }))
      docCount += records.length
    }

    const uploadsDir = join(__dirname, "uploads")
    const files = []
    let uploadBytes = 0
    try {
      const entries = await readdir(uploadsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const content = await readFile(join(uploadsDir, entry.name))
        files.push({
          name: entry.name,
          size: content.length,
          mimeType: "application/octet-stream",
          content: content.toString("base64"),
        })
        uploadBytes += content.length
      }
    } catch { /* uploads dir may not exist yet */ }

    const artifact = {
      backupId,
      type,
      createdAt: now.toISOString(),
      collections,
      uploads: files,
      stats: { docCount, uploadBytes, fileCount: files.length },
    }

    await mkdir(BACKUP_DIR, { recursive: true })
    const fileName = `${backupId}.json.gz`
    const filePath = join(BACKUP_DIR, fileName)
    const artifactJson = JSON.stringify(artifact)
    await pipeline(Readable.from([artifactJson]), createGzip(), createWriteStream(filePath))

    const artifactBytes = await statSync(filePath).size
    const record = {
      date: formatDate(now),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type,
      size: formatBytes(artifactBytes),
      bytes: artifactBytes,
      status: "Completed",
      created_at: now.toISOString(),
      file_id: fileName,
      doc_count: docCount,
      file_count: files.length,
    }
    const { data: ref, error: backupErr } = await supabase.from("backups").insert(record).select().single()
    if (backupErr) throw backupErr
    await logBackupActivity(
      type === "Manual" ? "Manual Backup" : "Automatic Backup",
      `Database backup completed (${docCount} docs, ${files.length} files, ${formatBytes(artifactBytes)})`
    )

    await cleanupOldBackups()

    return { id: ref.id, ...record }
  } finally {
    backupInProgress = false
  }
}

async function cleanupOldBackups() {
  const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000

  try {
    const entries = await readdir(BACKUP_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith(".json.gz")) continue
      const filePath = join(BACKUP_DIR, entry.name)
      const stats = await statSync(filePath)
      if (stats.mtimeMs < cutoff) {
        await unlink(filePath)
        console.log(`Deleted old backup: ${entry.name}`)
      }
    }
  } catch (err) {
    console.error("Local backup cleanup failed:", err.message)
  }

  try {
    const cutoffIso = new Date(cutoff).toISOString()
    const { data } = await supabase.from("backups").select("*")
    let count = 0
    for (const rec of data ?? []) {
      if (rec.created_at && rec.created_at < cutoffIso) {
        await supabase.from("backups").delete().eq("id", rec.id)
        count++
      }
    }
    if (count > 0) {
      console.log(`Deleted ${count} old backup records from Supabase`)
    }
  } catch (err) {
    console.error("Supabase backup cleanup failed:", err.message)
  }
}

function scheduleAutomaticBackup() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(BACKUP_HOUR, 0, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  nextBackupAt = next.toISOString()
  setTimeout(async () => {
    try {
      await runBackup("Automatic")
    } catch (err) {
      console.error("Automatic backup failed:", err.message)
    }
    scheduleAutomaticBackup()
  }, next.getTime() - now.getTime())
  console.log(`Automatic backup scheduled for ${next.toString()}`)
}

scheduleAutomaticBackup()

function dirSize(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) total += dirSize(p)
    else total += statSync(p).size
  }
  return total
}

async function getCpuPct() {
  const start = process.cpuUsage()
  await new Promise((r) => setTimeout(r, 100))
  const delta = process.cpuUsage(start)
  const micros = delta.user + delta.system
  const cores = os.cpus().length
  const wallMicros = 100 * 1000
  return Math.min(100, Math.round((micros / wallMicros / cores) * 100))
}

const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024

const storage = multer.diskStorage({
  destination: join(__dirname, "uploads"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".docx", ".doc"]
    const ext = extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"))
    }
  },
})

function stripHtml(html) {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function parseBlocks(blocks) {
  return blocks.map((b, i) => {
    const topic = b.topic || `Section ${i + 1}`
    const text = stripHtml(b.description)
    return `${topic}: ${text}`
  }).filter(p => p.split(": ")[1])
}

async function callGroq(prompt, maxTokens = 2048) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  })
  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Groq API error ${response.status}: ${errBody}`)
  }
  const data = await response.json()
  let text = data.choices?.[0]?.message?.content || ""
  text = text.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
  }
  return JSON.parse(text)
}

function extractTopics(contentParts) {
  return contentParts.map(cp => {
    const colonIdx = cp.indexOf(":")
    return colonIdx > -1 ? cp.substring(0, colonIdx).trim() : "the topic"
  })
}

function extractSentences(contentParts) {
  return contentParts
    .flatMap(cp => cp.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15))
}

app.use("/uploads", express.static(join(__dirname, "uploads")))

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" })
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
  return res.json({
    fileUrl,
    fileName: req.file.originalname,
    storedName: req.file.filename,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
  })
})

// ── Generate Quiz ──

app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { moduleTitle, moduleDescription, subject, blocks } = req.body
    if (!moduleTitle || !blocks || blocks.length === 0) {
      return res.status(400).json({ error: "Module title and blocks are required" })
    }

    const contentParts = parseBlocks(blocks)
    if (contentParts.length === 0) {
      return res.status(400).json({ error: "Module has no readable content to generate a quiz from" })
    }

    if (GROQ_API_KEY) {
      try {
        const questions = await generateAIQuiz(moduleTitle, moduleDescription, subject, contentParts)
        return res.json({ questions })
      } catch (aiErr) {
        console.error("AI quiz failed, falling back to mock:", aiErr.message)
      }
    }

    const questions = generateMockQuiz(moduleTitle, subject, contentParts)
    return res.json({ questions })
  } catch (err) {
    console.error("Quiz generation error:", err)
    return res.status(500).json({ error: "Failed to generate quiz. Please try again." })
  }
})

async function generateAIQuiz(moduleTitle, moduleDescription, subject, contentParts) {
  const contentText = contentParts.join("\n\n")

  const prompt = `You are an educational quiz generator for a${subject ? " " + subject : ""} course.
Generate exactly 10 multiple-choice and true/false questions to test the student's comprehension of the following module.

Module: "${moduleTitle}"
${moduleDescription ? "Description: " + moduleDescription + "\n" : ""}
Content:
${contentText}

RULES:
- Generate exactly 10 questions
- Mix "Multiple Choice" (4 options each) and "True/False" question types
- Questions should test understanding, not just recall
- Each question must have exactly one correct answer
- Make distractors plausible but clearly wrong when the content is understood
- Return ONLY a JSON array, no markdown, no extra text

Return format (JSON array):
[
  {
    "id": "q_1",
    "text": "Question text here?",
    "type": "Multiple Choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "required": true
  },
  {
    "id": "q_2",
    "text": "True or false: ...",
    "type": "True/False",
    "options": ["True", "False"],
    "correctAnswer": "True",
    "required": true
  }
]`

  const parsed = await callGroq(prompt)
  const questions = Array.isArray(parsed) ? parsed : parsed.questions || []
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned invalid quiz data")
  }

  return questions.map((q, i) => ({
    id: q.id || `q_${i + 1}`,
    text: q.text || "",
    type: q.type === "True/False" ? "True/False" : "Multiple Choice",
    options: Array.isArray(q.options) ? q.options : ["True", "False"],
    correctAnswer: q.correctAnswer || "",
    required: true,
  }))
}

// ── Generate Assignment ──

app.post("/api/generate-assignment", async (req, res) => {
  try {
    const { moduleTitle, moduleDescription, subject, blocks } = req.body
    if (!moduleTitle || !blocks || blocks.length === 0) {
      return res.status(400).json({ error: "Module title and blocks are required" })
    }

    const contentParts = parseBlocks(blocks)
    if (contentParts.length === 0) {
      return res.status(400).json({ error: "Module has no readable content to generate an assignment from" })
    }

    if (GROQ_API_KEY) {
      try {
        const result = await generateAIAssignment(moduleTitle, moduleDescription, subject, contentParts)
        return res.json(result)
      } catch (aiErr) {
        console.error("AI assignment failed, falling back to mock:", aiErr.message)
      }
    }

    return res.json(generateMockAssignment(moduleTitle, subject, contentParts))
  } catch (err) {
    console.error("Assignment generation error:", err)
    return res.status(500).json({ error: "Failed to generate assignment. Please try again." })
  }
})

async function generateAIAssignment(moduleTitle, moduleDescription, subject, contentParts) {
  const contentText = contentParts.join("\n\n")

  const prompt = `You are an educational assignment designer for a${subject ? " " + subject : ""} course.
Create an assignment based on the following module content.

Module: "${moduleTitle}"
${moduleDescription ? "Description: " + moduleDescription + "\n" : ""}
Content:
${contentText}

Generate a meaningful assignment that tests the student's understanding of the module content.

RULES:
- Title should be concise and descriptive (5-10 words)
- Description should include clear instructions, expectations, and submission guidelines (3-5 sentences)
- Rubric must have 4-5 criteria that total exactly 100 points
- Each criterion should be specific and measurable

Return ONLY a JSON object, no markdown, no extra text:
{
  "title": "Assignment Title",
  "description": "Clear instructions for students...",
  "rubric": [
    { "criterion": "Content Accuracy", "points": 30 },
    { "criterion": "Critical Analysis", "points": 25 },
    { "criterion": "Organization & Structure", "points": 20 },
    { "criterion": "Citations & Evidence", "points": 15 },
    { "criterion": "Grammar & Presentation", "points": 10 }
  ]
}`

  const parsed = await callGroq(prompt)
  const result = parsed.assignment || parsed
  if (!result.title && !result.description) {
    throw new Error("AI returned invalid assignment data")
  }
  return {
    title: result.title || "",
    description: result.description || "",
    rubric: Array.isArray(result.rubric) ? result.rubric.map(r => ({
      criterion: r.criterion || "",
      points: typeof r.points === "number" ? r.points : 0,
    })) : [],
  }
}

function generateMockAssignment(moduleTitle, subject, contentParts) {
  const topics = extractTopics(contentParts)
  const sentences = extractSentences(contentParts)
  const primaryTopic = topics[0] || moduleTitle
  const secondTopic = topics[1] || primaryTopic

  const detail = sentences.length > 0 ? pickOne(sentences) : `the concepts of ${primaryTopic}`

  const title = pickOne([
    `Analysis of ${primaryTopic}`,
    `Critical Review: ${moduleTitle}`,
    `Applied Exercise: ${primaryTopic}`,
    `Research Task: ${moduleTitle}`,
    `${subject ? subject + " " : ""}Assignment: ${primaryTopic}`,
  ])

  const description = pickOne([
    `Analyze and discuss the key concepts of ${primaryTopic} as covered in the module. Your response should demonstrate a clear understanding of the material, referencing specific examples from the content. Provide a well-structured analysis of at least 300 words, supported by evidence from the module.`,
    `Based on the module "${moduleTitle}", write a comprehensive review of ${primaryTopic}. Include your analysis of ${secondTopic} and how they relate to each other. Support your arguments with specific references to the module content. Minimum length: 300 words.`,
    `Examine the relationship between ${primaryTopic} and ${secondTopic} as presented in this module. Provide practical examples and critical analysis. Your submission should demonstrate both theoretical understanding and the ability to apply concepts. Minimum 300 words.`,
    `Complete the following exercise based on the module "${moduleTitle}": Research and analyze ${primaryTopic}. Discuss its significance, key principles, and real-world applications. Use evidence from the module content to support your analysis. Minimum 300 words.`,
  ])

  const rubric = [
    { criterion: "Content Accuracy & Understanding", points: 30 },
    { criterion: "Critical Analysis & Depth", points: 25 },
    { criterion: "Organization & Structure", points: 20 },
    { criterion: "Use of Evidence & Examples", points: 15 },
    { criterion: "Grammar & Presentation", points: 10 },
  ]

  return { title, description, rubric }
}

// ── Generate Discussion ──

app.post("/api/generate-discussion", async (req, res) => {
  try {
    const { moduleTitle, moduleDescription, subject, blocks } = req.body
    if (!moduleTitle || !blocks || blocks.length === 0) {
      return res.status(400).json({ error: "Module title and blocks are required" })
    }

    const contentParts = parseBlocks(blocks)
    if (contentParts.length === 0) {
      return res.status(400).json({ error: "Module has no readable content to generate a discussion from" })
    }

    if (GROQ_API_KEY) {
      try {
        const result = await generateAIDiscussion(moduleTitle, moduleDescription, subject, contentParts)
        return res.json(result)
      } catch (aiErr) {
        console.error("AI discussion failed, falling back to mock:", aiErr.message)
      }
    }

    return res.json(generateMockDiscussion(moduleTitle, subject, contentParts))
  } catch (err) {
    console.error("Discussion generation error:", err)
    return res.status(500).json({ error: "Failed to generate discussion. Please try again." })
  }
})

async function generateAIDiscussion(moduleTitle, moduleDescription, subject, contentParts) {
  const contentText = contentParts.join("\n\n")

  const prompt = `You are an educational discussion designer for a${subject ? " " + subject : ""} course.
Create a discussion topic based on the following module content.

Module: "${moduleTitle}"
${moduleDescription ? "Description: " + moduleDescription + "\n" : ""}
Content:
${contentText}

Generate a thought-provoking discussion prompt that encourages critical thinking, debate, and student interaction.

RULES:
- Title should be engaging and concise (5-10 words)
- Prompt should be open-ended with no single "right" answer
- Encourage students to share perspectives and respond to peers
- Reference specific concepts from the module content

Return ONLY a JSON object, no markdown, no extra text:
{ "title": "Discussion Title", "prompt": "Discussion prompt text..." }`

  const parsed = await callGroq(prompt)
  if (!parsed.title && !parsed.prompt) {
    throw new Error("AI returned invalid discussion data")
  }
  return { title: parsed.title || "", prompt: parsed.prompt || "" }
}

function generateMockDiscussion(moduleTitle, subject, contentParts) {
  const topics = extractTopics(contentParts)
  const primaryTopic = topics[0] || moduleTitle
  const secondTopic = topics[1] || primaryTopic

  const title = pickOne([
    `Discussion: ${primaryTopic}`,
    `Debate: ${moduleTitle}`,
    `Reflecting on ${primaryTopic}`,
    `${primaryTopic} in Practice`,
    `Exploring ${moduleTitle}`,
  ])

  const prompt = pickOne([
    `After reviewing the module "${moduleTitle}", share your thoughts on ${primaryTopic}. What are the key takeaways? How does ${primaryTopic} relate to ${secondTopic}? Provide specific examples from the module content to support your perspective. Respond to at least two classmates with thoughtful feedback.`,
    `The module "${moduleTitle}" explores the concepts of ${primaryTopic} and ${secondTopic}. Which of these concepts do you find most significant and why? Discuss how these ideas apply in real-world contexts. Support your argument with references from the module. Engage with at least two peers' responses.`,
    `Consider the relationship between ${primaryTopic} and ${secondTopic} as discussed in this module. Do you agree with the approaches presented? What alternative perspectives might exist? Back your reasoning with evidence from the content. Reply to at least two classmates.`,
    `Based on your understanding of ${moduleTitle}, what is the most challenging aspect of ${primaryTopic}? How might one overcome these challenges? Share practical strategies and learn from your classmates' experiences. Respond to at least two peers.`,
  ])

  return { title, prompt }
}

// ── Generate Material ──

app.post("/api/generate-material", async (req, res) => {
  try {
    const { moduleTitle, moduleDescription, subject, blocks } = req.body
    if (!moduleTitle || !blocks || blocks.length === 0) {
      return res.status(400).json({ error: "Module title and blocks are required" })
    }

    const contentParts = parseBlocks(blocks)
    if (contentParts.length === 0) {
      return res.status(400).json({ error: "Module has no readable content to generate material from" })
    }

    if (GROQ_API_KEY) {
      try {
        const result = await generateAIMaterial(moduleTitle, moduleDescription, subject, contentParts)
        return res.json(result)
      } catch (aiErr) {
        console.error("AI material failed, falling back to mock:", aiErr.message)
      }
    }

    return res.json(generateMockMaterial(moduleTitle, subject, contentParts))
  } catch (err) {
    console.error("Material generation error:", err)
    return res.status(500).json({ error: "Failed to generate material. Please try again." })
  }
})

async function generateAIMaterial(moduleTitle, moduleDescription, subject, contentParts) {
  const contentText = contentParts.join("\n\n")

  const prompt = `You are an educational content writer for a${subject ? " " + subject : ""} course.
Write a study material / reading resource based on the following module.

Module: "${moduleTitle}"
${moduleDescription ? "Description: " + moduleDescription + "\n" : ""}
Content:
${contentText}

Generate a title and well-structured supplementary reading material for students. The content should be 2-4 paragraphs, clearly written, and expand on the module topics.

RULES:
- Title should be descriptive (5-10 words)
- Content should be 2-4 paragraphs of educational text
- Use clear, accessible language appropriate for learners
- Reference and expand on the module's key concepts
- Do not use HTML tags — plain text with paragraph breaks only

Return ONLY a JSON object, no markdown, no extra text:
{ "title": "Material Title", "content": "Paragraph 1...\\n\\nParagraph 2..." }`

  const parsed = await callGroq(prompt)
  if (!parsed.title && !parsed.content) {
    throw new Error("AI returned invalid material data")
  }
  return { title: parsed.title || "", content: parsed.content || "" }
}

function generateMockMaterial(moduleTitle, subject, contentParts) {
  const topics = extractTopics(contentParts)
  const sentences = extractSentences(contentParts)
  const primaryTopic = topics[0] || moduleTitle
  const secondTopic = topics[1] || primaryTopic
  const detail1 = sentences.length > 0 ? pickOne(sentences) : `an overview of ${primaryTopic}`
  const detail2 = sentences.length > 1 ? pickOne(sentences.filter(s => s !== detail1)) : `the fundamentals of ${secondTopic}`

  const title = pickOne([
    `Study Guide: ${primaryTopic}`,
    `Reading Material: ${moduleTitle}`,
    `${subject ? subject + " " : ""}Resource: ${primaryTopic}`,
    `Supplementary Reading: ${moduleTitle}`,
  ])

  const content = pickOne([
    `${primaryTopic} is a fundamental concept covered in this module. ${detail1}. Understanding this topic provides a strong foundation for the more advanced concepts discussed throughout the course. Students should pay close attention to the key principles and how they relate to practical applications.\n\n${secondTopic} builds upon the concepts of ${primaryTopic}. ${detail2}. By studying these interconnected ideas, students can develop a comprehensive understanding of the subject matter. Take time to review the examples provided in the module and consider how they illustrate each concept in action.\n\nTo reinforce your learning, try summarizing the main points from each section of the module in your own words. This practice helps solidify your understanding and prepares you for the assessments ahead.`,
    `In this supplementary reading, we explore the key ideas presented in "${moduleTitle}" in greater detail. ${detail1}. This material is designed to complement the module content and provide additional context for students who wish to deepen their understanding.\n\n${primaryTopic} encompasses several important aspects. ${detail2}. When studying this material, focus on identifying the relationships between different concepts and how they work together as a cohesive framework.\n\nA useful study strategy is to create concept maps linking ${primaryTopic} and ${secondTopic}. This visual approach helps reveal connections that might not be immediately apparent from linear reading. Additionally, try explaining these concepts to a peer — teaching is one of the most effective ways to learn.`,
    `The subject of ${primaryTopic} is central to understanding ${moduleTitle}. ${detail1}. This reading material provides a structured overview that supplements the main module content, offering additional explanations and examples.\n\nMoving beyond the basics, ${secondTopic} introduces more nuanced aspects of the subject. ${detail2}. Students are encouraged to critically evaluate these concepts and consider their broader implications within the field of ${subject || "this subject"}.\n\nFor best results, read this material alongside the module content. Compare the explanations provided here with those in the module, and note any areas where one provides additional clarity. This comparative approach strengthens comprehension and retention of the material.`,
  ])

  return { title, content }
}

// ── Mock Quiz Generator ──

function generateMockQuiz(moduleTitle, subject, contentParts) {
  const topics = contentParts.map(cp => {
    const colonIdx = cp.indexOf(":")
    return {
      name: colonIdx > -1 ? cp.substring(0, colonIdx).trim() : `Section`,
      text: colonIdx > -1 ? cp.substring(colonIdx + 1).trim() : cp.trim(),
    }
  })

  const sentences = extractSentences(contentParts)

  const allTerms = []
  contentParts.forEach(cp => {
    const words = cp.split(/\s+/)
    words.forEach(w => {
      const clean = w.replace(/[^a-zA-Z0-9-]/g, "")
      if (clean.length > 4 && !allTerms.includes(clean)) allTerms.push(clean)
    })
  })

  const fillerDistractors = [
    "This information is not covered in the module",
    "None of the above options are correct",
    "This concept does not apply here",
    "This topic is outside the scope of the module",
    "Not enough information provided",
  ]

  const questions = []
  const shuffledTopics = [...topics].sort(() => Math.random() - 0.5)

  let qNum = 1

  shuffledTopics.forEach((topic, i) => {
    if (questions.length >= 10) return

    const relevantSentences = sentences.filter(s =>
      s.toLowerCase().includes(topic.name.toLowerCase()) ||
      topic.text.split(/\s+/).some(w => w.length > 4 && s.toLowerCase().includes(w.toLowerCase()))
    )
    const detail = relevantSentences.length > 0 ? pickOne(relevantSentences) : topic.text

    const shortAnswer = topic.name
    const otherTopics = shuffledTopics.filter(t => t.name !== topic.name).map(t => t.name)
    const randomTerms = pickRandom(allTerms.filter(t => t !== topic.name && !otherTopics.includes(t)), 3)
    const distractors = pickRandom([...otherTopics, ...fillerDistractors], 3)

    if (i % 3 !== 2) {
      const optionPool = [shortAnswer, ...distractors]
      const options = pickRandom(optionPool, Math.min(4, optionPool.length))
      if (!options.includes(shortAnswer)) options[Math.floor(Math.random() * options.length)] = shortAnswer
      const uniqueOptions = [...new Set(options)].slice(0, 4)
      while (uniqueOptions.length < 4) uniqueOptions.push(pickOne(fillerDistractors))

      const questionTemplates = [
        `Which topic is covered in the module "${moduleTitle}"?`,
        `Which of the following is discussed in this module?`,
        `According to the module content, which concept is covered?`,
        `${subject ? `In ${subject}, ` : ""}which of the following topics is addressed?`,
        `Which term is relevant to the content of this module?`,
      ]

      questions.push({
        id: `q_${qNum++}`,
        text: pickOne(questionTemplates),
        type: "Multiple Choice",
        options: uniqueOptions.sort(() => Math.random() - 0.5),
        correctAnswer: shortAnswer,
        required: true,
      })
    } else {
      const isTrue = Math.random() > 0.4
      let tfText
      if (isTrue) {
        tfText = pickOne([
          `True or false: The module "${moduleTitle}" covers the topic of ${topic.name}.`,
          `True or false: ${topic.name} is a concept discussed in this module.`,
          `True or false: The subject of ${topic.name} is addressed in this content.`,
        ])
      } else {
        const fakeTopic = randomTerms.length > 0 ? pickOne(randomTerms) : "Quantum Entanglement"
        tfText = pickOne([
          `True or false: The module "${moduleTitle}" primarily covers ${fakeTopic}.`,
          `True or false: ${fakeTopic} is the main focus of this module.`,
          `True or false: This module discusses ${fakeTopic} in detail.`,
        ])
      }
      questions.push({
        id: `q_${qNum++}`,
        text: tfText,
        type: "True/False",
        options: ["True", "False"],
        correctAnswer: isTrue ? "True" : "False",
        required: true,
      })
    }
  })

  while (questions.length < 10) {
    const topic = pickOne(topics)
    const fakeTopic = pickOne(allTerms.concat(["Advanced Theory", "Basic Principles", "Core Methods"]))
    questions.push({
      id: `q_${qNum++}`,
      text: `True or false: ${topic.name} is relevant to ${moduleTitle}.`,
      type: "True/False",
      options: ["True", "False"],
      correctAnswer: "True",
      required: true,
    })
  }

  return questions.slice(0, 10)
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/test-route", (_req, res) => {
  console.log("TEST ROUTE HIT!")
  res.json({ test: "works" })
})

// ── Database Backup ──

app.post("/api/backups/run", async (_req, res) => {
  try {
    const record = await runBackup("Manual")
    return res.json(record)
  } catch (err) {
    const conflict = typeof err.message === "string" && err.message.includes("already in progress")
    return res.status(conflict ? 409 : 500).json({ error: err.message || "Backup failed" })
  }
})

async function getBackupRecord(id) {
  const { data } = await supabase.from("backups").select("*").eq("id", id).maybeSingle()
  return data ?? null
}

app.get("/api/backups/:id/download", async (req, res) => {
  try {
    const record = await getBackupRecord(req.params.id)
    if (!record) return res.status(404).json({ error: "Backup record not found" })
    const fileName = record.file_id
    if (!fileName) return res.status(404).json({ error: "No artifact stored for this backup" })
    const filePath = join(BACKUP_DIR, basename(fileName))
    try {
      statSync(filePath)
    } catch {
      return res.status(404).json({ error: "Backup artifact file is missing" })
    }
    res.setHeader("Content-Type", "application/gzip")
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
    const readStream = Readable.from([await readFile(filePath)])
    return readStream.pipe(res)
  } catch (err) {
    return res.status(500).json({ error: err.message || "Download failed" })
  }
})

app.get("/api/backups/:id/preview", async (req, res) => {
  try {
    const record = await getBackupRecord(req.params.id)
    if (!record) return res.status(404).json({ error: "Backup record not found" })
    const fileName = record.file_id
    if (!fileName) return res.status(404).json({ error: "No artifact stored for this backup" })
    const filePath = join(BACKUP_DIR, basename(fileName))
    let raw
    try {
      const compressed = await readFile(filePath)
      const { gunzipSync } = await import("zlib")
      raw = gunzipSync(compressed).toString("utf-8")
    } catch {
      return res.status(404).json({ error: "Backup artifact file is missing" })
    }
    const artifact = JSON.parse(raw)
    return res.json({
      record: { id: record.id, ...record },
      artifact: {
        backupId: artifact.backupId,
        type: artifact.type,
        createdAt: artifact.createdAt,
        stats: artifact.stats,
        collections: Object.fromEntries(
          Object.entries(artifact.collections || {}).map(([name, docs]) => [
            name,
            { count: (docs || []).length, sample: (docs || []).slice(0, 3) }
          ])
        ),
        uploads: (artifact.uploads || []).map(f => ({ name: f.name, size: f.size, mimeType: f.mimeType }))
      }
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || "Preview failed" })
  }
})

app.post("/api/backups/:id/restore", async (req, res) => {
  try {
    const record = await getBackupRecord(req.params.id)
    if (!record) return res.status(404).json({ error: "Backup record not found" })
    const fileName = record.file_id
    if (!fileName) return res.status(400).json({ error: "No artifact stored for this backup" })
    const filePath = join(BACKUP_DIR, basename(fileName))
    let raw
    try {
      const compressed = await readFile(filePath)
      const { gunzipSync } = await import("zlib")
      raw = gunzipSync(compressed).toString("utf-8")
    } catch {
      return res.status(404).json({ error: "Backup artifact file is missing" })
    }
    const artifact = JSON.parse(raw)

    let restoredDocs = 0
    let restoredFiles = 0
    for (const [name, docs] of Object.entries(artifact.collections || {})) {
      const table = RESTORE_TABLE_MAP[name] || name
      if (table === "profiles") {
        // Auth-linked profile records cannot be safely restored out of band;
        // skip them during restore (re-seed via migration script instead).
        continue
      }
      for (const entry of docs) {
        if (!entry || !entry.id || !entry.data) continue
        try {
          const data = { ...entry.data }
          delete data.id
          delete data.collectionId
          delete data.collectionName
          const { data: updated } = await supabase.from(table).update(data).eq("id", entry.id).select().single()
          if (updated) {
            restoredDocs++
            continue
          }
          throw new Error("row not found")
        } catch {
          try {
            const data = { ...entry.data }
            delete data.id
            delete data.collectionId
            delete data.collectionName
            await supabase.from(table).insert({ ...data, id: entry.id })
            restoredDocs++
          } catch { /* record cannot be restored */ }
        }
      }
    }

    for (const f of artifact.uploads || []) {
      if (!f || !f.name) continue
      await writeFile(join(__dirname, "uploads", basename(f.name)), Buffer.from(f.content || "", "base64"))
      restoredFiles++
    }

    await logBackupActivity("Restore", `Database restored from backup ${req.params.id} (${restoredDocs} docs, ${restoredFiles} files)`)
    return res.json({ restoredDocs, restoredFiles })
  } catch (err) {
    return res.status(500).json({ error: err.message || "Restore failed" })
  }
})

app.delete("/api/backups/:id", async (req, res) => {
  try {
    const record = await getBackupRecord(req.params.id)
    if (!record) return res.status(404).json({ error: "Backup record not found" })
    if (record.file_id) {
      try { await unlink(join(BACKUP_DIR, basename(record.file_id))) } catch { /* already gone */ }
    }
    await supabase.from("backups").delete().eq("id", record.id)
    await logBackupActivity("Backup Deleted", `Backup from ${record.date} at ${record.time} was removed`)
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || "Delete failed" })
  }
})

// ── Status & Metrics ──

app.get("/api/status", async (_req, res) => {
  const uptimeSeconds = Math.floor(process.uptime())
  let cpu = 0
  let memory = 0
  let storage = 0
  let storageMB = 0
  try {
    cpu = await getCpuPct()
    memory = parseFloat(((process.memoryUsage().rss / os.totalmem()) * 100).toFixed(1))
    const uploadsDir = join(__dirname, "uploads")
    if (readdirSync(uploadsDir, { withFileTypes: true }).length) {
      const bytes = dirSize(uploadsDir)
      storage = Math.min(100, Math.round((bytes / STORAGE_QUOTA) * 100))
      storageMB = bytes / (1024 * 1024)
    }
  } catch { /* metrics unavailable */ }
  res.json({
    status: "Operational",
    uptimeSeconds,
    startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    version: "1.0.0",
    health: { cpu, memory, storage, storageMB },
    nextBackupAt,
  })
})

// ── Users ──

function toApiUser(rec) {
  return {
    id: rec.id,
    uid: rec.uid || rec.id,
    displayName: rec.name || "",
    email: rec.email || "",
    role: rec.role || "student",
    lrn: rec.lrn || "",
    gradeLevel: rec.grade_level || "",
    phone: rec.phone || "",
    employeeId: rec.employee_id || "",
    department: rec.department || "",
    joinDate: rec.join_date || "",
  }
}

async function findUserByUid(uid) {
  let { data } = await supabase.from("profiles").select("*").eq("id", uid).single()
  if (!data) {
    const res = await supabase.from("profiles").select("*").eq("uid", uid).maybeSingle()
    data = res.data
  }
  return data ?? null
}

app.get("/api/user/:uid", async (req, res) => {
  try {
    const rec = await findUserByUid(req.params.uid)
    if (!rec) return res.status(404).json({ error: "User not found" })
    res.json(toApiUser(rec))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/users/search", async (req, res) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ error: "Email query parameter required" })
    const { data: rec, error } = await supabase.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle()
    if (error) return res.status(500).json({ error: "User not found" })
    if (!rec) return res.status(404).json({ error: "User not found" })
    res.json(toApiUser(rec))
  } catch (err) {
    res.status(500).json({ error: "User not found" })
  }
})

app.post("/api/user/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const data = req.body
    const existing = await findUserByUid(uid)
    const payload = {
      name: data.displayName || data.name || "",
      email: data.email || "",
      role: data.role || "student",
      lrn: data.lrn || "",
      grade_level: data.gradeLevel || "",
      phone: data.phone || "",
      employee_id: data.employeeId || "",
      department: data.department || "",
      join_date: data.joinDate || "",
      uid,
    }
    let rec
    if (existing) {
      const { data: updated, error } = await supabase.from("profiles").update(payload).eq("id", existing.id).select().single()
      if (error) throw error
      rec = updated
    } else {
      const { data: inserted, error } = await supabase.from("profiles").insert(payload).select().single()
      if (error) throw error
      rec = inserted
    }
    res.json(toApiUser(rec))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch("/api/user/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const data = req.body
    const existing = await findUserByUid(uid)
    if (!existing) return res.status(404).json({ error: "User not found" })
    const fieldMap = { gradeLevel: "grade_level", employeeId: "employee_id", joinDate: "join_date" }
    const payload = {}
    if (data.displayName !== undefined) payload.name = data.displayName
    if (data.email !== undefined) payload.email = data.email
    for (const k of ["lrn", "gradeLevel", "phone", "employeeId", "department", "joinDate"]) {
      if (data[k] !== undefined) payload[fieldMap[k] || k] = data[k]
    }
    const { data: rec, error } = await supabase.from("profiles").update(payload).eq("id", existing.id).select().single()
    if (error) throw error
    res.json(toApiUser(rec))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/users", async (_req, res) => {
  try {
    const { data } = await supabase.from("profiles").select("*")
    res.json((data ?? []).map(toApiUser))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Collections API ──

app.get("/api/backups", async (_req, res) => {
  try {
    const { data } = await supabase.from("backups").select("*").order("created_at", { ascending: false })
    res.json((data ?? []).map((d) => ({ id: d.id, ...d })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/activities", async (_req, res) => {
  try {
    const { data } = await supabase.from("activities").select("*").order("created_at", { ascending: false })
    res.json((data ?? []).map((d) => ({ id: d.id, ...d })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/test-reports", (_req, res) => {
  console.log("TEST ROUTE HIT!")
  res.json({ test: "reports route works" })
})

// ── Reports API ──

function getCohortFromGrade(gradeLevel) {
  if (!gradeLevel) return null
  const normalized = String(gradeLevel).toLowerCase()
  if (normalized.includes("senior") || normalized.includes("grade 11") || normalized.includes("grade 12")) return "shs"
  if (normalized.includes("junior") || normalized.includes("grade 7") || normalized.includes("grade 8") || normalized.includes("grade 9") || normalized.includes("grade 10")) return "jhs"
  const grade = parseInt(normalized.replace(/\D/g, ""), 10)
  if (isNaN(grade)) return null
  return grade >= 11 ? "shs" : "jhs"
}

async function getAllResources() {
  const { data } = await supabase.from("resources").select("*")
  return (data ?? []).map((d) => ({ id: d.id, ...d }))
}

async function getAllUsers() {
  const { data } = await supabase.from("profiles").select("*")
  return (data ?? []).map(toApiUser)
}

function countTasksByType(resources, cohort) {
  const counts = { assignment: 0, quiz: 0, discussion: 0, material: 0 }
  resources.forEach((r) => {
    const resourceCohort = getCohortFromGrade(r.target_grade) || (r.subject?.toLowerCase().includes("shs") ? "shs" : "jhs")
    if (cohort && resourceCohort !== cohort) return
    r.modules?.forEach((m) => {
      m.tasks?.forEach((t) => {
        if (counts.hasOwnProperty(t.type)) counts[t.type]++
      })
    })
  })
  return counts
}

async function getSubmissionCounts(cohort = null) {
  const [assignmentsRes, quizzesRes, assessmentsRes, progressRes] = await Promise.all([
    supabase.from("assignment_submissions").select("*"),
    supabase.from("quiz_submissions").select("*"),
    supabase.from("assessment_submissions").select("*"),
    supabase.from("module_progress").select("*"),
  ])
  const assignments = assignmentsRes.data ?? []
  const quizzes = quizzesRes.data ?? []
  const assessments = assessmentsRes.data ?? []
  const progress = progressRes.data ?? []

  const discussions = assessments.filter((d) => d.type === "discussion")

  const studentCohorts = {}
  const users = await getAllUsers()
  users.forEach((u) => {
    if (u.role === "student" || !u.role) {
      studentCohorts[u.uid || u.id] = getCohortFromGrade(u.gradeLevel)
    }
  })

  const counts = { assignment: 0, quiz: 0, discussion: 0, material: 0 }
  const byStudent = {}

  assignments.forEach((data) => {
    const sc = studentCohorts[data.student_id]
    if (cohort && sc !== cohort) return
    counts.assignment++
    byStudent[data.student_id] = byStudent[data.student_id] || { assignment: 0, quiz: 0, discussion: 0, material: 0 }
    byStudent[data.student_id].assignment++
  })

  quizzes.forEach((data) => {
    const sc = studentCohorts[data.student_id]
    if (cohort && sc !== cohort) return
    counts.quiz++
    byStudent[data.student_id] = byStudent[data.student_id] || { assignment: 0, quiz: 0, discussion: 0, material: 0 }
    byStudent[data.student_id].quiz++
  })

  discussions.forEach((data) => {
    const sc = studentCohorts[data.student_id]
    if (cohort && sc !== cohort) return
    counts.discussion++
    byStudent[data.student_id] = byStudent[data.student_id] || { assignment: 0, quiz: 0, discussion: 0, material: 0 }
    byStudent[data.student_id].discussion++
  })

  progress.forEach((data) => {
    const sc = studentCohorts[data.user_id]
    if (cohort && sc !== cohort) return
    if (data.progress === 100 || data.completed_at) {
      counts.material++
      byStudent[data.user_id] = byStudent[data.user_id] || { assignment: 0, quiz: 0, discussion: 0, material: 0 }
      byStudent[data.user_id].material++
    }
  })

  return { counts, byStudent }
}

app.get("/api/reports/overview", async (req, res) => {
  try {
    const cohort = req.query.cohort || null
    const [resources, users, submissions] = await Promise.all([
      getAllResources(),
      getAllUsers(),
      getSubmissionCounts(cohort),
    ])

    const students = users.filter((u) => u.role === "student" || !u.role)
    const filteredStudents = cohort ? students.filter((s) => getCohortFromGrade(s.gradeLevel) === cohort) : students
    const totalStudents = filteredStudents.length

    const taskCounts = countTasksByType(resources, cohort)
    const totalTasksAssigned = Object.values(taskCounts).reduce((a, b) => a + b, 0) * totalStudents
    const totalTasksCompleted = Object.values(submissions.counts).reduce((a, b) => a + b, 0)

    const byType = {}
    Object.keys(taskCounts).forEach((type) => {
      const assigned = taskCounts[type] * totalStudents
      const completed = submissions.counts[type]
      byType[type] = {
        assigned,
        completed,
        rate: assigned > 0 ? parseFloat(((completed / assigned) * 100).toFixed(1)) : 0,
      }
    })

    const jhsStudents = students.filter((s) => getCohortFromGrade(s.gradeLevel) === "jhs")
    const shsStudents = students.filter((s) => getCohortFromGrade(s.gradeLevel) === "shs")

    const [jhsSubs, shsSubs] = await Promise.all([
      getSubmissionCounts("jhs"),
      getSubmissionCounts("shs"),
    ])

    const jhsTaskCounts = countTasksByType(resources, "jhs")
    const shsTaskCounts = countTasksByType(resources, "shs")

    const byCohort = {
      jhs: {
        students: jhsStudents.length,
        tasksAssigned: Object.values(jhsTaskCounts).reduce((a, b) => a + b, 0) * jhsStudents.length,
        tasksCompleted: Object.values(jhsSubs.counts).reduce((a, b) => a + b, 0),
        rate: 0,
      },
      shs: {
        students: shsStudents.length,
        tasksAssigned: Object.values(shsTaskCounts).reduce((a, b) => a + b, 0) * shsStudents.length,
        tasksCompleted: Object.values(shsSubs.counts).reduce((a, b) => a + b, 0),
        rate: 0,
      },
    }

    byCohort.jhs.rate = byCohort.jhs.tasksAssigned > 0 ? parseFloat(((byCohort.jhs.tasksCompleted / byCohort.jhs.tasksAssigned) * 100).toFixed(1)) : 0
    byCohort.shs.rate = byCohort.shs.tasksAssigned > 0 ? parseFloat(((byCohort.shs.tasksCompleted / byCohort.shs.tasksAssigned) * 100).toFixed(1)) : 0

    const completionRate = totalTasksAssigned > 0 ? parseFloat(((totalTasksCompleted / totalTasksAssigned) * 100).toFixed(1)) : 0

    res.json({
      totalStudents,
      totalTasksAssigned,
      totalTasksCompleted,
      completionRate,
      byType,
      byCohort,
    })
  } catch (err) {
    console.error("Reports overview error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/reports/leaderboard", async (req, res) => {
  try {
    const cohort = req.query.cohort || "jhs"
    const limit = parseInt(req.query.limit || "10", 10)

    const [resources, users, submissions] = await Promise.all([
      getAllResources(),
      getAllUsers(),
      getSubmissionCounts(cohort),
    ])

    const students = users
      .filter((u) => (u.role === "student" || !u.role) && getCohortFromGrade(u.gradeLevel) === cohort)
      .map((s) => ({
        id: s.id,
        uid: s.uid || s.id,
        name: s.displayName || "Unknown",
        email: s.email,
        gradeLevel: s.gradeLevel || "—",
      }))

    const taskCounts = countTasksByType(resources, cohort)
    const tasksPerStudent = Object.values(taskCounts).reduce((a, b) => a + b, 0)

    const leaderboard = students
      .map((s) => {
        const completed = submissions.byStudent[s.uid || s.id] || { assignment: 0, quiz: 0, discussion: 0, material: 0 }
        const totalCompleted = Object.values(completed).reduce((a, b) => a + b, 0)
        return {
          name: s.name,
          email: s.email,
          gradeLevel: s.gradeLevel,
          tasksAssigned: tasksPerStudent,
          tasksCompleted: totalCompleted,
          completionRate: tasksPerStudent > 0 ? parseFloat(((totalCompleted / tasksPerStudent) * 100).toFixed(1)) : 0,
        }
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, limit)
      .map((s, i) => ({ rank: i + 1, ...s }))

    res.json({ cohort, students: leaderboard })
  } catch (err) {
    console.error("Leaderboard error:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/reports/cohort-performance", async (req, res) => {
  try {
    const [resources, users, jhsSubs, shsSubs] = await Promise.all([
      getAllResources(),
      getAllUsers(),
      getSubmissionCounts("jhs"),
      getSubmissionCounts("shs"),
    ])

    const students = users.filter((u) => u.role === "student" || !u.role)
    const jhsStudents = students.filter((s) => getCohortFromGrade(s.gradeLevel) === "jhs")
    const shsStudents = students.filter((s) => getCohortFromGrade(s.gradeLevel) === "shs")

    const jhsTaskCounts = countTasksByType(resources, "jhs")
    const shsTaskCounts = countTasksByType(resources, "shs")

    const jhsAssigned = Object.values(jhsTaskCounts).reduce((a, b) => a + b, 0) * jhsStudents.length
    const shsAssigned = Object.values(shsTaskCounts).reduce((a, b) => a + b, 0) * shsStudents.length
    const jhsCompleted = Object.values(jhsSubs.counts).reduce((a, b) => a + b, 0)
    const shsCompleted = Object.values(shsSubs.counts).reduce((a, b) => a + b, 0)

    res.json({
      jhs: {
        students: jhsStudents.length,
        tasksAssigned: jhsAssigned,
        tasksCompleted: jhsCompleted,
        rate: jhsAssigned > 0 ? parseFloat(((jhsCompleted / jhsAssigned) * 100).toFixed(1)) : 0,
      },
      shs: {
        students: shsStudents.length,
        tasksAssigned: shsAssigned,
        tasksCompleted: shsCompleted,
        rate: shsAssigned > 0 ? parseFloat(((shsCompleted / shsAssigned) * 100).toFixed(1)) : 0,
      },
    })
  } catch (err) {
    console.error("Cohort performance error:", err)
    res.status(500).json({ error: err.message })
  }
})

// ── Serve React build in production ──
import { existsSync } from "fs"
const distPath = join(__dirname, "dist")
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"))
  })
}

app.listen(PORT, () => {
  console.log(`ALS LMS server running on http://localhost:${PORT}`)
})

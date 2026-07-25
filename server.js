import "dotenv/config"
import express from "express"
import multer from "multer"
import cors from "cors"
import { fileURLToPath } from "url"
import { dirname, join, extname } from "path"
import { GoogleGenAI } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: "5mb" }))

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

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

app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { moduleTitle, moduleDescription, subject, blocks } = req.body
    if (!moduleTitle || !blocks || blocks.length === 0) {
      return res.status(400).json({ error: "Module title and blocks are required" })
    }

    const contentParts = blocks.map((b, i) => {
      const topic = b.topic || `Section ${i + 1}`
      const text = stripHtml(b.description)
      return `${topic}: ${text}`
    }).filter(p => p.split(": ")[1]).join("\n\n")

    if (!contentParts.trim()) {
      return res.status(400).json({ error: "Module has no readable content to generate a quiz from" })
    }

    const prompt = `You are an educational quiz generator for a${subject ? " " + subject : ""} course.
Generate exactly 7 multiple-choice and true/false questions to test the student's comprehension of the following module.

Module: "${moduleTitle}"
${moduleDescription ? "Description: " + moduleDescription + "\n" : ""}
Content:
${contentParts}

RULES:
- Generate exactly 7 questions
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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    let text = response.text || ""
    text = text.trim()
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
    }

    const questions = JSON.parse(text)
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: "AI returned invalid quiz data" })
    }

    const cleaned = questions.map((q, i) => ({
      id: q.id || `q_${i + 1}`,
      text: q.text || "",
      type: q.type === "True/False" ? "True/False" : "Multiple Choice",
      options: Array.isArray(q.options) ? q.options : ["True", "False"],
      correctAnswer: q.correctAnswer || "",
      required: true,
    }))

    return res.json({ questions: cleaned })
  } catch (err) {
    console.error("Quiz generation error:", err)
    return res.status(500).json({ error: "Failed to generate quiz. Please try again." })
  }
})

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`)
})

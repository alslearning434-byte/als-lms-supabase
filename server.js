import { config } from "dotenv"
config({ path: ".env.local" })
import express from "express"
import multer from "multer"
import cors from "cors"
import { fileURLToPath } from "url"
import { dirname, join, extname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: "5mb" }))

const GROQ_API_KEY = process.env.GROQ_API_KEY || null

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
    }).filter(p => p.split(": ")[1])

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
      max_tokens: 2048,
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

  const questions = JSON.parse(text)
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

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockQuiz(moduleTitle, subject, contentParts) {
  const topics = contentParts.map(cp => {
    const colonIdx = cp.indexOf(":")
    return {
      name: colonIdx > -1 ? cp.substring(0, colonIdx).trim() : `Section`,
      text: colonIdx > -1 ? cp.substring(colonIdx + 1).trim() : cp.trim(),
    }
  })

  const sentences = contentParts
    .flatMap(cp => cp.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15))

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

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`)
})

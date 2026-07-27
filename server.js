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

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`)
})

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
app.use(express.json())

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`)
})

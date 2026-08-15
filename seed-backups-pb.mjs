import PocketBase from "pocketbase"
import { readFileSync } from "fs"

const pb = new PocketBase("http://127.0.0.1:8090")
await pb.collection("_superusers").authWithPassword("admin@local.test", "admin12345")

const backup = JSON.parse(readFileSync("backups/1786698000243.json", "utf8"))
const docs = backup.collections.backups || []
const existing = await pb.collection("backups").getFullList({ requestKey: null })
for (const r of existing) {
  try { await pb.collection("backups").delete(r.id) } catch {}
}
for (const b of docs) {
  const d = b.data || {}
  try {
    await pb.collection("backups").create({
      date: d.date || "",
      time: d.time || "",
      type: d.type || "",
      size: d.size || "",
      status: d.status || "",
      fileId: d.fileId || "",
      createdAt: d.createdAt || "",
      docCount: d.docCount ?? null,
      fileCount: d.fileCount ?? null,
    })
  } catch (err) {
    console.error("backup failed:", err.message)
  }
}
console.log("Seeded", docs.length, "backups")

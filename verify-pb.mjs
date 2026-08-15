import PocketBase from "pocketbase"

const pb = new PocketBase("http://127.0.0.1:8090")

try {
  const a = await pb.collection("users").authWithPassword("admin@gmail.com", "admin123")
  console.log("admin login OK uid=", a.record.uid, "role=", a.record.role, "name=", a.record.name)
} catch (e) {
  console.log("admin login FAIL:", e.message)
}
try {
  const s = await pb.collection("users").authWithPassword("dante.aquino@gmail.com", "ALSstudent123")
  console.log("student login OK uid=", s.record.uid, "role=", s.record.role)
} catch (e) {
  console.log("student login FAIL:", e.message)
}
pb.authStore.clear()
await pb.collection("_superusers").authWithPassword("admin@local.test", "admin12345")
const res = await pb.collection("resources").getFullList()
console.log("resources:", res.length, "| first title:", res[0].title.slice(0, 40), "| modules:", res[0].modules.length)
const mp = await pb.collection("moduleProgress").getFullList()
console.log("moduleProgress:", mp.length, "| sample userId:", mp[0].userId, "| viewed:", JSON.stringify(mp[0].viewedModules))
console.log("quizSubmissions:", (await pb.collection("quizSubmissions").getFullList()).length)
console.log("assignmentSubmissions:", (await pb.collection("assignmentSubmissions").getFullList()).length)
console.log("assessmentSubmissions:", (await pb.collection("assessmentSubmissions").getFullList()).length)
console.log("activities:", (await pb.collection("activities").getFullList()).length)
console.log("backups:", (await pb.collection("backups").getFullList()).length)
const u = await pb.collection("users").getFullList()
console.log("users total:", u.length, "| admins:", u.filter((x) => x.role === "admin").map((x) => x.email).join(","))

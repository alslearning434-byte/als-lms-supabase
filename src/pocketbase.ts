import PocketBase from "pocketbase"

export const PB_URL = (import.meta.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090").replace(/\/+$/, "")

export const pb = new PocketBase(PB_URL)

export interface ActivityRecord {
  id: string
  status: string
  user: string
  action: string
  detail: string
  createdAt: string
}

function mapActivity(r: Record<string, any>): ActivityRecord {
  return {
    id: r.id,
    status: r.status ?? "Completed",
    user: r.user ?? "",
    action: r.action ?? "",
    detail: r.detail ?? "",
    createdAt: r.createdAt ?? r.created ?? "",
  }
}

export async function getActivities(): Promise<ActivityRecord[]> {
  const res = await pb.collection("activities").getList(1, 200, { sort: "-createdAt" })
  return res.items.map(mapActivity)
}

export function subscribeActivities(onUpdate: (activities: ActivityRecord[]) => void): Promise<() => void> {
  return pb.collection("activities").subscribe("*", async () => {
    try {
      onUpdate(await getActivities())
    } catch { /* transient */ }
  })
}

export async function createActivity(data: { status?: string; user: string; action: string; detail: string }) {
  return pb.collection("activities").create({
    status: data.status ?? "Completed",
    user: data.user,
    action: data.action,
    detail: data.detail,
    createdAt: new Date().toISOString(),
  })
}

export async function upsertModuleProgress(userId: string, resourceId: string, viewedModules: number[]) {
  const existing = await pb
    .collection("moduleProgress")
    .getFirstListItem(pb.filter("userId = {:userId} && resourceId = {:resourceId}", { userId, resourceId }), {
      requestKey: null,
    })
    .catch(() => null)
  const payload = {
    userId,
    resourceId,
    viewedModules,
    lastViewedAt: new Date().toISOString(),
  }
  if (existing) return pb.collection("moduleProgress").update(existing.id, payload)
  return pb.collection("moduleProgress").create(payload)
}

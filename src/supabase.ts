import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rvzinlsvuguyiogetbee.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    user: r.user_name ?? r.user ?? "",
    action: r.action ?? "",
    detail: r.detail ?? "",
    createdAt: r.created_at ?? r.createdAt ?? "",
  }
}

export async function getActivities(): Promise<ActivityRecord[]> {
  const { data } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
  return (data ?? []).map(mapActivity)
}

export function subscribeActivities(onUpdate: (activities: ActivityRecord[]) => void): Promise<() => void> {
  const channel = supabase
    .channel("activities-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, async () => {
      try {
        onUpdate(await getActivities())
      } catch { /* transient */ }
    })
    .subscribe()
  return Promise.resolve(() => { supabase.removeChannel(channel) })
}

export async function createActivity(data: { status?: string; user: string; action: string; detail: string }) {
  return supabase.from("activities").insert({
    status: data.status ?? "Completed",
    user_name: data.user,
    action: data.action,
    detail: data.detail,
    created_at: new Date().toISOString(),
  })
}

export async function upsertModuleProgress(userId: string, resourceId: string, viewedModules: number[]) {
  const { data: existing } = await supabase
    .from("module_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("resource_id", resourceId)
    .maybeSingle()

  const payload = {
    user_id: userId,
    resource_id: resourceId,
    viewed_modules: viewedModules,
    last_viewed_at: new Date().toISOString(),
  }

  if (existing) return supabase.from("module_progress").update(payload).eq("id", existing.id)
  return supabase.from("module_progress").insert(payload)
}

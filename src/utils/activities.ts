import { createActivity } from "../supabase"

export interface ActivityRecord {
  id?: string
  status: string
  user: string
  action: string
  detail: string
  createdAt: string
}

export function logActivity(data: { status?: string; user: string; action: string; detail: string }) {
  const record: ActivityRecord = {
    status: data.status ?? "Completed",
    user: data.user,
    action: data.action,
    detail: data.detail,
    createdAt: new Date().toISOString(),
  }
  createActivity(record).catch(() => {})
}

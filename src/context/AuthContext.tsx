import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { pb } from "../pocketbase"
import { logActivity } from "../utils/activities"

export type UserRole = "student" | "teacher" | "admin"

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  lrn?: string
  gradeLevel?: string
  phone?: string
  employeeId?: string
  department?: string
  joinDate?: string
}

export interface AuthUser {
  uid: string
  email: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (data: {
    email: string
    password: string
    displayName: string
    lrn?: string
    gradeLevel?: string
  }) => Promise<UserProfile>
  logout: () => Promise<void>
  updateProfile: (data: Partial<Pick<UserProfile, "displayName" | "email" | "lrn" | "gradeLevel" | "phone" | "employeeId" | "department" | "joinDate">>) => Promise<void>
  sessionConflict: boolean
  resolveConflict: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  login: async () => { throw new Error("not implemented") },
  register: async () => { throw new Error("not implemented") },
  logout: async () => {},
  updateProfile: async () => {},
  sessionConflict: false,
  resolveConflict: () => {},
})

function recordToProfile(r: Record<string, any>): UserProfile {
  return {
    uid: r.uid || r.id,
    email: r.email || "",
    displayName: r.name || r.email?.split("@")[0] || "",
    role: r.role || "student",
    lrn: r.lrn || undefined,
    gradeLevel: r.gradeLevel || undefined,
    phone: r.phone || undefined,
    employeeId: r.employeeId || undefined,
    department: r.department || undefined,
    joinDate: r.joinDate || undefined,
  }
}

const CREDS_KEY = "als_credentials"

function saveCreds(email: string, password: string) {
  localStorage.setItem(CREDS_KEY, JSON.stringify({ email, password }))
}

function loadCreds(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearCreds() {
  localStorage.removeItem(CREDS_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionConflict, setSessionConflict] = useState(false)
  const recordId = useRef<string | null>(null)
  const currentEmail = useRef<string | null>(null)

  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const restore = async () => {
      if (pb.authStore.isValid) {
        try {
          const res = await pb.collection("users").authRefresh({ requestKey: null })
          const rec = res.record
          const p = recordToProfile(rec)
          recordId.current = rec.id
          currentEmail.current = p.email
          setUser({ uid: p.uid, email: p.email })
          setProfile(p)
        } catch (err) {
          const status = (err as { status?: number })?.status
          if (status === 401 || status === 403) pb.authStore.clear()
        }
      }
      setLoading(false)
    }
    restore()
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const creds = loadCreds()
      if (creds && creds.email !== currentEmail.current) {
        setSessionConflict(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [user])

  const resolveConflict = useCallback(() => {
    window.location.reload()
  }, [])

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const authData = await pb.collection("users").authWithPassword(email, password)
    const userProfile = recordToProfile(authData.record)
    recordId.current = authData.record.id
    setUser({ uid: userProfile.uid, email: userProfile.email })
    setProfile(userProfile)
    currentEmail.current = email
    saveCreds(email, password)
    try { logActivity({ user: email, action: "Login", detail: "Signed in to the system" }) } catch { /* offline */ }
    return userProfile
  }

  const register = async (data: {
    email: string
    password: string
    displayName: string
    lrn?: string
    gradeLevel?: string
  }): Promise<UserProfile> => {
    const rec = await pb.collection("users").create({
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      name: data.displayName,
      role: "student",
      lrn: data.lrn || "",
      gradeLevel: data.gradeLevel || "",
    })
    const uid = rec.id
    await pb.collection("users").update(uid, { uid })
    await pb.collection("users").authWithPassword(data.email, data.password)
    const userProfile: UserProfile = {
      uid,
      email: data.email,
      displayName: data.displayName,
      role: "student",
      lrn: data.lrn,
      gradeLevel: data.gradeLevel,
    }
    recordId.current = uid
    setUser({ uid, email: data.email })
    setProfile(userProfile)
    currentEmail.current = data.email
    saveCreds(data.email, data.password)
    logActivity({ user: data.email, action: "Registration", detail: "New student account registered" })
    return userProfile
  }

  const logout = async () => {
    clearCreds()
    currentEmail.current = null
    recordId.current = null
    pb.authStore.clear()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (data: Partial<Pick<UserProfile, "displayName" | "email" | "lrn" | "gradeLevel" | "phone" | "employeeId" | "department" | "joinDate">>) => {
    if (!user || !profile) return
    const updated = { ...profile, ...data }
    const id = recordId.current
    if (id) {
      await pb.collection("users").update(id, {
        name: data.displayName ?? profile.displayName,
        email: data.email ?? profile.email,
        lrn: data.lrn ?? profile.lrn ?? "",
        gradeLevel: data.gradeLevel ?? profile.gradeLevel ?? "",
        phone: data.phone ?? profile.phone ?? "",
        employeeId: data.employeeId ?? profile.employeeId ?? "",
        department: data.department ?? profile.department ?? "",
        joinDate: data.joinDate ?? profile.joinDate ?? "",
      })
    }
    setProfile(updated)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfile, sessionConflict, resolveConflict }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

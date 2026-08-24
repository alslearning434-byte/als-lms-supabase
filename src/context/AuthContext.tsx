import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { supabase } from "../supabase"
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

function mapProfile(row: Record<string, any>): UserProfile {
  return {
    uid: row.uid || row.id,
    email: row.email || "",
    displayName: row.name || row.email?.split("@")[0] || "",
    role: row.role || "student",
    lrn: row.lrn || undefined,
    gradeLevel: row.grade_level || row.gradeLevel || undefined,
    phone: row.phone || undefined,
    employeeId: row.employee_id || row.employeeId || undefined,
    department: row.department || undefined,
    joinDate: row.join_date || row.joinDate || undefined,
  }
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  return data ? mapProfile(data) : null
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
  const currentEmail = useRef<string | null>(null)
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          if (p) {
            setUser({ uid: p.uid, email: p.email })
            setProfile(p)
            currentEmail.current = p.email
          } else {
            await supabase.auth.signOut()
          }
        }
      } catch {
        await supabase.auth.signOut()
      }
      setLoading(false)
    }
    restore()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        currentEmail.current = null
      } else if (event === "SIGNED_IN" && session?.user) {
        const p = await fetchProfile(session.user.id)
        if (p) {
          setUser({ uid: p.uid, email: p.email })
          setProfile(p)
          currentEmail.current = p.email
        }
      }
    })
    return () => subscription.unsubscribe()
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const p = await fetchProfile(data.user.id)
    if (!p) throw new Error("Profile not found")
    setUser({ uid: p.uid, email: p.email })
    setProfile(p)
    currentEmail.current = email
    saveCreds(email, password)
    try { logActivity({ user: email, action: "Login", detail: "Signed in to the system" }) } catch { /* offline */ }
    return p
  }

  const register = async (data: {
    email: string
    password: string
    displayName: string
    lrn?: string
    gradeLevel?: string
  }): Promise<UserProfile> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.displayName } },
    })
    if (authError) throw authError
    if (!authData.user) throw new Error("Registration failed")

    await supabase.from("profiles").insert({
      id: authData.user.id,
      uid: authData.user.id,
      name: data.displayName,
      email: data.email,
      role: "student",
      lrn: data.lrn || "",
      grade_level: data.gradeLevel || "",
    })

    const userProfile: UserProfile = {
      uid: authData.user.id,
      email: data.email,
      displayName: data.displayName,
      role: "student",
      lrn: data.lrn,
      gradeLevel: data.gradeLevel,
    }
    setUser({ uid: authData.user.id, email: data.email })
    setProfile(userProfile)
    currentEmail.current = data.email
    saveCreds(data.email, data.password)
    logActivity({ user: data.email, action: "Registration", detail: "New student account registered" })
    return userProfile
  }

  const logout = async () => {
    clearCreds()
    currentEmail.current = null
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (data: Partial<Pick<UserProfile, "displayName" | "email" | "lrn" | "gradeLevel" | "phone" | "employeeId" | "department" | "joinDate">>) => {
    if (!user || !profile) return
    const updated = { ...profile, ...data }
    const id = user.uid
    await supabase.from("profiles").update({
      name: data.displayName ?? profile.displayName,
      email: data.email ?? profile.email,
      lrn: data.lrn ?? profile.lrn ?? "",
      grade_level: data.gradeLevel ?? profile.gradeLevel ?? "",
      phone: data.phone ?? profile.phone ?? "",
      employee_id: data.employeeId ?? profile.employeeId ?? "",
      department: data.department ?? profile.department ?? "",
      join_date: data.joinDate ?? profile.joinDate ?? "",
    }).eq("id", id)
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

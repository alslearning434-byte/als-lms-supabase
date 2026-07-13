import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../firebase"

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

interface AuthContextValue {
  user: User | null
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionConflict, setSessionConflict] = useState(false)
  const hasInitialized = useRef(false)
  const currentEmail = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (hasInitialized.current) return
      hasInitialized.current = true

      const creds = loadCreds()
      if (creds && firebaseUser && firebaseUser.email !== creds.email) {
        try {
          const cred = await signInWithEmailAndPassword(auth, creds.email, creds.password)
          setUser(cred.user)
          currentEmail.current = cred.user.email
          const snap = await getDoc(doc(db, "users", cred.user.uid))
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          }
        } catch {
          clearCreds()
          setUser(firebaseUser)
          currentEmail.current = firebaseUser.email
          const snap = await getDoc(doc(db, "users", firebaseUser.uid))
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          }
        }
      } else {
        setUser(firebaseUser)
        if (firebaseUser) {
          currentEmail.current = firebaseUser.email
          const snap = await getDoc(doc(db, "users", firebaseUser.uid))
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          }
        }
      }

      setLoading(false)
      unsubscribe()
    })
    return unsubscribe
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
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, "users", cred.user.uid))
    if (!snap.exists()) {
      throw new Error("User profile not found in Firestore. Please register first.")
    }
    const userProfile = snap.data() as UserProfile
    setUser(cred.user)
    setProfile(userProfile)
    currentEmail.current = email
    saveCreds(email, password)
    return userProfile
  }

  const register = async (data: {
    email: string
    password: string
    displayName: string
    lrn?: string
    gradeLevel?: string
  }): Promise<UserProfile> => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
    const userProfile: UserProfile = {
      uid: cred.user.uid,
      email: data.email,
      displayName: data.displayName,
      role: "student",
      lrn: data.lrn,
      gradeLevel: data.gradeLevel,
    }
    await setDoc(doc(db, "users", cred.user.uid), userProfile)
    setUser(cred.user)
    setProfile(userProfile)
    currentEmail.current = data.email
    saveCreds(data.email, data.password)
    return userProfile
  }

  const logout = async () => {
    clearCreds()
    currentEmail.current = null
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (data: Partial<Pick<UserProfile, "displayName" | "email" | "lrn" | "gradeLevel" | "phone" | "employeeId" | "department" | "joinDate">>) => {
    if (!user || !profile) return
    const updated = { ...profile, ...data }
    await updateDoc(doc(db, "users", user.uid), data)
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

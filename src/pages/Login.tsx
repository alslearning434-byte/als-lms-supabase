import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { login, register } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRegister, setShowRegister] = useState(false)

  const [regLrn, setRegLrn] = useState("")
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regGradeLevel, setRegGradeLevel] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regShowPwd, setRegShowPwd] = useState(false)
  const [regSuccess, setRegSuccess] = useState("")
  const [regError, setRegError] = useState("")

  const roleRedirect: Record<string, string> = {
    student: "/student",
    teacher: "/teacher",
    admin: "/admin",
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const profile = await login(email, password)
      navigate(roleRedirect[profile.role] || "/")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password."
      if (message.includes("invalid-credential") || message.includes("wrong-password") || message.includes("user-not-found")) {
        setError("Invalid email or password. Please try again.")
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError("")
    setRegSuccess("")

    if (!regLrn || regLrn.length < 10) {
      setRegError("Please enter a valid LRN (at least 10 digits).")
      return
    }
    if (!regName) {
      setRegError("Please enter your full name.")
      return
    }
    if (!regEmail || !regEmail.includes("@")) {
      setRegError("Please enter a valid email address.")
      return
    }
    if (!regGradeLevel) {
      setRegError("Please select your grade level.")
      return
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    try {
      await register({
        email: regEmail,
        password: regPassword,
        displayName: regName,
        lrn: regLrn,
        gradeLevel: regGradeLevel,
      })
      setRegSuccess("Account created successfully! You can now sign in.")
      setRegLrn("")
      setRegName("")
      setRegEmail("")
      setRegGradeLevel("")
      setRegPassword("")
      setShowRegister(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed."
      if (message.includes("email-already-in-use")) {
        setRegError("This email is already registered. Please sign in.")
      } else if (message.includes("weak-password")) {
        setRegError("Password is too weak. Use at least 6 characters.")
      } else {
        setRegError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="relative z-10 w-full flex flex-col items-center animate-fade">
        <div className="mb-8 animate-float">
          <img src="/img/logo.png" alt="ALS Learning" className="w-48 h-auto" />
        </div>

        <h1 className="text-navy-500 text-2xl font-bold mb-6 text-center lg:hidden">ALS Learning</h1>

          <div className="w-full max-w-lg bg-white force-white-bg force-light-mode rounded-2xl shadow-xl border border-gray-100 p-10 card-glow animate-fade-2">
          {!showRegister ? (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-gray-800">Welcome!</h2>
                <p className="text-gray-400 text-sm mt-1">Sign in to continue your learning journey</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative group">
                    <i className="fas fa-envelope text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type={showPwd ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                    <button type="button" onClick={() => setShowPwd((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <i className={`fas fa-${showPwd ? "eye-slash" : "eye"} text-sm`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-navy-500 focus:ring-navy-500/20" />
                    <span className="text-gray-500">Remember me</span>
                  </label>
                  <a href="#" className="text-navy-500 font-medium hover:text-navy-600 hover:underline">Forgot password?</a>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-navy-500 to-navy-600 text-white font-semibold rounded-xl hover:from-navy-600 hover:to-navy-700 transition flex items-center justify-center gap-2 shadow-lg shadow-navy-500/25 disabled:opacity-70">
                  <span>{loading ? "Signing in..." : "Sign In"}</span>
                  {loading && <i className="fas fa-spinner fa-spin text-sm" />}
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
              </form>

              <div className="mt-6 text-center text-sm text-gray-400">
                New here?{" "}
                <button onClick={() => setShowRegister(true)}
                  className="text-navy-500 font-semibold hover:text-navy-600 underline">
                  Create an account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="flex items-center mb-4">
                  <button onClick={() => setShowRegister(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mr-3 transition">
                    <i className="fas fa-arrow-left text-gray-500 text-sm" />
                  </button>
                  <h2 className="text-xl font-bold text-gray-800">Create Account</h2>
                </div>
                <p className="text-gray-400 text-sm mt-1">Register as a student to get started</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">LRN (Learner Reference Number)</label>
                  <div className="relative group">
                    <i className="fas fa-id-card text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type="text" value={regLrn} onChange={(e) => setRegLrn(e.target.value)} required
                      placeholder="Enter your LRN"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative group">
                    <i className="fas fa-user text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative group">
                    <i className="fas fa-envelope text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade Level</label>
                  <div className="relative group">
                    <i className="fas fa-graduation-cap text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <select value={regGradeLevel} onChange={(e) => setRegGradeLevel(e.target.value)} required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition appearance-none text-gray-500">
                      <option value="">Select your grade level</option>
                      <option value="Junior High School">Junior High School</option>
                      <option value="Senior High School">Senior High School</option>
                    </select>
                    <i className="fas fa-chevron-down text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm group-focus-within:text-navy-500 transition" />
                    <input type={regShowPwd ? "text" : "password"} value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)} required placeholder="Create a password (min. 6 characters)"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 force-gray-50-bg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 focus:bg-white transition" />
                    <button type="button" onClick={() => setRegShowPwd((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <i className={`fas fa-${regShowPwd ? "eye-slash" : "eye"} text-sm`} />
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-navy-500 to-navy-600 text-white font-semibold rounded-xl hover:from-navy-600 hover:to-navy-700 transition flex items-center justify-center gap-2 shadow-lg shadow-navy-500/25 disabled:opacity-70">
                  <span>{loading ? "Creating Account..." : "Create Account"}</span>
                  {loading && <i className="fas fa-spinner fa-spin text-sm" />}
                </button>

                {regSuccess && (
                  <p className="text-green-600 text-sm text-center">{regSuccess}</p>
                )}
                {regError && (
                  <p className="text-red-500 text-sm text-center">{regError}</p>
                )}
              </form>
            </>
          )}
        </div>

        <div className="mt-12 text-center animate-fade-3 max-w-2xl">
          <h1 className="text-navy-500 text-5xl sm:text-7xl font-bold mb-5 leading-tight">
            Unlock Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
              Learning Potential
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl mb-8 max-w-xl mx-auto">
            Your journey to knowledge starts here. Track progress, master courses, and achieve more than you thought possible.
          </p>
          <div className="grid grid-cols-3 gap-6 text-left max-w-2xl mx-auto">
            {[
              { icon: "rocket", color: "emerald", title: "Learn", desc: "At your pace" },
              { icon: "chart-line", color: "blue", title: "Track", desc: "Your progress" },
              { icon: "trophy", color: "amber", title: "Achieve", desc: "Your goals" }
            ].map((item) => (
              <div key={item.title} className="bg-navy-500/5 rounded-2xl p-6 border border-gray-100">
                <div className={`w-14 h-14 rounded-xl bg-${item.color}-500/10 flex items-center justify-center mb-3`}>
                  <i className={`fas fa-${item.icon} text-${item.color}-500 text-2xl`} />
                </div>
                <p className="text-gray-700 text-xl font-semibold">{item.title}</p>
                <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl mx-auto w-full">
            <div className="bg-navy-500/5 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-gray-700 text-xl font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-video text-blue-500" />
                Video Tutorial
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Watch this quick guide to get started with ALS Learning.
              </p>
              <div className="relative w-full aspect-video bg-gray-200 rounded-xl overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500/90 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition shadow-lg">
                    <i className="fas fa-play text-white text-xl ml-0.5" />
                  </div>
                </div>
                <img src="https://placehold.co/800x450/1e293b/94a3b8?text=ALS+Learning+Tutorial" alt="Video tutorial placeholder"
                  className="w-full h-full object-cover" />
              </div>
              <p className="text-gray-400 text-xs mt-2 text-center">
                <i className="far fa-clock mr-1" />Duration: ~5 minutes
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-gray-300 animate-fade-5">
          &copy; 2026 ALS Learning. All rights reserved.
        </div>
      </div>

      {/* Floating dark mode toggle */}
      <button onClick={toggleTheme}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-navy-500 text-white shadow-lg hover:bg-navy-600 transition flex items-center justify-center z-50">
        <i className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"} text-lg`} />
      </button>
    </div>
  )
}

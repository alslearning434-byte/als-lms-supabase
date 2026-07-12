import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/Login"
import Student from "./pages/Student"
import Teacher from "./pages/Teacher"
import Admin from "./pages/Admin"

function SessionBanner() {
  const { sessionConflict, resolveConflict } = useAuth()
  if (!sessionConflict) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <span className="text-sm font-medium">
        <i className="fas fa-exclamation-triangle mr-2" />
        Another session was opened in a different tab.
      </span>
      <button onClick={resolveConflict} className="px-4 py-1.5 bg-white text-amber-600 text-sm font-semibold rounded-lg hover:bg-amber-50 transition">
        Reload
      </button>
    </div>
  )
}

function AppShell() {
  return (
    <>
      <SessionBanner />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Student />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <Teacher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

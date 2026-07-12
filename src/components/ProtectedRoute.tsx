import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-navy-500 mb-3" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const redirectMap: Record<string, string> = {
      student: "/student",
      teacher: "/teacher",
      admin: "/admin",
    }
    return <Navigate to={redirectMap[profile.role] || "/"} replace />
  }

  return <>{children}</>
}

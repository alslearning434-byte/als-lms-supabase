import { useState, useRef, useEffect } from "react"

interface TopBarProps {
  userName: string
  initials: string
  userEmail: string
  notificationCount?: number
  onLogout: () => void
  onProfile?: () => void
  onMenuToggle?: () => void
}

export default function TopBar({ userName, initials, userEmail, notificationCount = 0, onLogout, onProfile, onMenuToggle }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden text-gray-600 text-xl"
          onClick={() => onMenuToggle?.()}
        >
          <i className="fas fa-bars" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer" ref={notifRef}>
          <i className="fas fa-bell text-gray-500 text-lg" onClick={() => setNotifOpen((p) => !p)} />
          {notificationCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">Notifications</p>
              </div>
              <div className="space-y-2 p-2">
                <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                    <i className="fas fa-tasks" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">New assignment posted</p>
                    <p className="text-xs text-gray-400">Communication Skills - Quiz 3</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">
                    <i className="fas fa-check-circle" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Assignment graded</p>
                    <p className="text-xs text-gray-400">Scientific Literacy - Lab Report</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm">
                    <i className="fas fa-exclamation-circle" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Deadline approaching</p>
                    <p className="text-xs text-gray-400">Math Module 2 Assessment</p>
                  </div>
                </a>
              </div>
              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <a href="#" className="text-sm text-primary hover:underline">View All Notifications</a>
              </div>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="relative" ref={userRef}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUserOpen((p) => !p)}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700">{userName}</span>
            <i className={`fas fa-chevron-down text-gray-400 text-xs transition ${userOpen ? "rotate-180" : ""}`} />
          </div>
          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-400">{userEmail}</p>
              </div>
              {onProfile && (
                <button onClick={onProfile}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                  <i className="fas fa-user-circle text-gray-400 w-4" /> Profile
                </button>
              )}
              <button onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
                <i className="fas fa-sign-out-alt text-red-400 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

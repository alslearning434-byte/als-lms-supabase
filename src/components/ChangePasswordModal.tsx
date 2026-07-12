import { useState } from "react"

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirm, setConfirm] = useState("")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (current !== "password123") {
      alert('Current password is incorrect. (Demo: use "password123")')
      return
    }
    if (newPwd.length < 6) {
      alert("New password must be at least 6 characters long.")
      return
    }
    if (newPwd !== confirm) {
      alert("New password and re-type password do not match.")
      return
    }
    alert("Password changed successfully!")
    setCurrent(""); setNewPwd(""); setConfirm("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4"
        style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">Change Password</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <i className="fas fa-times" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Re-type New Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-navy-500 text-white text-sm font-medium rounded-xl hover:bg-navy-600 transition">
            Save New Password
          </button>
        </form>
      </div>
    </div>
  )
}

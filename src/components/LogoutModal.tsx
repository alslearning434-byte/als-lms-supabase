interface LogoutModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function LogoutModal({ open, onCancel, onConfirm }: LogoutModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 modal-card"
        style={{ animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-sign-out-alt text-red-500 text-xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Leave already?</h3>
          <p className="text-sm text-gray-500 mb-6">Your progress will be saved. Come back anytime!</p>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
              Stay
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

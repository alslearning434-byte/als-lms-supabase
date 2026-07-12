import type { NavItem } from "../types"

interface SidebarProps {
  title: string
  subtitle: string
  items: NavItem[]
  activePage: string
  onNavigate: (id: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ title, subtitle, items, activePage, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const handleNav = (id: string) => {
    onNavigate(id)
    onMobileClose()
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-navy-500 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="px-6 pt-6 pb-4 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center mb-4">
            <img src="/img/logo.png" alt="ALS Learning Logo" className="w-28 h-28 object-contain" />
          </div>
        </div>
        <div className="px-6 pb-4 text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/50 text-sm font-medium mt-0.5">{subtitle}</p>
        </div>
        <hr className="border-white/10 mx-5" />
        <nav className="flex-1 overflow-y-auto p-2 pt-3 space-y-0.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`nav-item${activePage === item.id ? " active" : ""}`}
              onClick={() => handleNav(item.id)}
            >
              <i className={`fas fa-${item.icon} w-5 text-center`} /> {item.label}
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-white/10">
          <div
            className={`nav-item${activePage === "settings" ? " active" : ""}`}
            onClick={() => handleNav("settings")}
          >
            <i className="fas fa-cog w-5 text-center" /> Settings
          </div>
        </div>
      </aside>
    </>
  )
}

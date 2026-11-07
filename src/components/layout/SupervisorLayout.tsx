import { BookOpen, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSupervisor } from '../../context/SupervisorContext'

const navItems = [
  { label: 'Overview', to: '/supervisor', icon: <LayoutDashboard size={18} /> },
  { label: 'Lesson Plans', to: '/supervisor/lesson-plans', icon: <FileText size={18} /> },
  { label: 'Teachers', to: '/supervisor/teachers', icon: <Users size={18} /> },
  { label: 'Classes', to: '/supervisor/classes', icon: <BookOpen size={18} /> },
]

export default function SupervisorLayout() {
  const { supervisor, signOut } = useSupervisor()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!supervisor) navigate('/supervisor/login')
  }, [supervisor])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  if (!supervisor) return null

  const sidebar = (
    <aside className="flex flex-col w-60 h-full overflow-y-auto bg-indigo-900 text-white">
      <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-700">
        <div className="flex items-center gap-2">
          <GraduationCap size={24} className="text-indigo-300" />
          <span className="text-lg font-bold tracking-tight">SchoolLink</span>
        </div>
        <button onClick={() => setOpen(false)} className="sm:hidden text-indigo-300 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-indigo-700">
        <p className="text-xs text-indigo-400">Supervisor</p>
        <p className="text-sm font-medium text-white truncate">{supervisor?.name}</p>
        <p className="text-xs text-indigo-300 truncate">{supervisor?.institution}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-700 text-white font-medium' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-indigo-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
        >
          <LogOut size={18} /> Exit
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-50">{sidebar}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden sm:flex">{sidebar}</div>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto pt-16 sm:pt-6">
        <Outlet />
      </main>
    </div>
  )
}

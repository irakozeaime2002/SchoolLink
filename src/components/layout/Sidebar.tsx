import {
  Bell,
  BookOpen,
  BookText,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  School,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'

const navItems: Record<Role, { label: string; to: string; icon: React.ReactNode }[]> = {
  platform_admin: [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Schools', to: '/admin/schools', icon: <School size={18} /> },
  ],
  headteacher: [
    { label: 'Dashboard', to: '/headteacher', icon: <LayoutDashboard size={18} /> },
    { label: 'Academic Years', to: '/headteacher/academic-years', icon: <CalendarDays size={18} /> },
    { label: 'Teachers', to: '/headteacher/teachers', icon: <Users size={18} /> },
    { label: 'Classes', to: '/headteacher/classes', icon: <BookOpen size={18} /> },
    { label: 'Subjects', to: '/headteacher/subjects', icon: <BookText size={18} /> },
    { label: 'Students', to: '/headteacher/students', icon: <GraduationCap size={18} /> },
    { label: 'Messages', to: '/headteacher/messages', icon: <MessageSquare size={18} /> },
    { label: 'Announcements', to: '/headteacher/announcements', icon: <Bell size={18} /> },
    { label: 'Settings', to: '/headteacher/settings', icon: <Settings size={18} /> },
  ],

  teacher: [
    { label: 'Dashboard', to: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'My Classes', to: '/teacher/classes', icon: <BookOpen size={18} /> },
    { label: 'Students', to: '/teacher/students', icon: <GraduationCap size={18} /> },
    { label: 'Marks', to: '/teacher/marks', icon: <ClipboardList size={18} /> },
    { label: 'Attendance', to: '/teacher/attendance', icon: <CalendarCheck size={18} /> },
    { label: 'Messages', to: '/teacher/messages', icon: <MessageSquare size={18} /> },
    { label: 'Announcements', to: '/teacher/announcements', icon: <Bell size={18} /> },
  ],
  parent: [
    { label: 'Dashboard', to: '/parent', icon: <LayoutDashboard size={18} /> },
    { label: 'Progress', to: '/parent/progress', icon: <ClipboardList size={18} /> },
    { label: 'Attendance', to: '/parent/attendance', icon: <CalendarCheck size={18} /> },
    { label: 'Messages', to: '/parent/messages', icon: <MessageSquare size={18} /> },
    { label: 'Announcements', to: '/parent/announcements', icon: <Bell size={18} /> },
  ],
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null

  const items = navItems[user.role] ?? []

  const nav = (
    <aside className="flex flex-col w-60 min-h-screen bg-indigo-900 text-white">
      <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-700">
        <div className="flex items-center gap-2">
          <GraduationCap size={24} className="text-indigo-300" />
          <span className="text-lg font-bold tracking-tight">SchoolLink</span>
        </div>
        <button onClick={() => setOpen(false)} className="sm:hidden text-indigo-300 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-700 text-white font-medium' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`
            }>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-indigo-700">
        <div className="px-3 py-2 text-xs text-indigo-300 truncate">{user.full_name}</div>
        <button onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2 rounded-lg shadow-lg">
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-50">{nav}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden sm:flex">{nav}</div>
    </>
  )
}

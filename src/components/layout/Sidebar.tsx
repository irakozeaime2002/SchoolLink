import {
  Bell,
  BookOpen,
  BookText,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  School,
  Settings,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useChild } from '../../context/ChildContext'
import type { Role } from '../../types'

const navItems: Record<Role, { label: string; to: string; icon: React.ReactNode }[]> = {
  platform_admin: [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Schools', to: '/admin/schools', icon: <School size={18} /> },
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
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
    { label: 'Lesson Plans', to: '/headteacher/lesson-plans', icon: <FolderOpen size={18} /> },
    { label: 'Supervisors', to: '/headteacher/supervisors', icon: <UserCheck size={18} /> },
    { label: 'Settings', to: '/headteacher/settings', icon: <Settings size={18} /> },
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'My Classes', to: '/teacher/classes', icon: <BookOpen size={18} /> },
    { label: 'Students', to: '/teacher/students', icon: <GraduationCap size={18} /> },
    { label: 'Marks', to: '/teacher/marks', icon: <ClipboardList size={18} /> },
    { label: 'Attendance', to: '/teacher/attendance', icon: <CalendarCheck size={18} /> },
    { label: 'Assessments', to: '/teacher/assessments', icon: <ClipboardCheck size={18} /> },
    { label: 'Reports', to: '/teacher/reports', icon: <FileText size={18} /> },
    { label: 'Lesson Plans', to: '/teacher/lesson-plans', icon: <FolderOpen size={18} /> },
    { label: 'Messages', to: '/teacher/messages', icon: <MessageSquare size={18} /> },
    { label: 'Announcements', to: '/teacher/announcements', icon: <Bell size={18} /> },
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
  ],
  parent: [
    { label: 'Dashboard', to: '/parent', icon: <LayoutDashboard size={18} /> },
    { label: 'Progress', to: '/parent/progress', icon: <ClipboardList size={18} /> },
    { label: 'Attendance', to: '/parent/attendance', icon: <CalendarCheck size={18} /> },
    { label: 'Assessments', to: '/parent/assessments', icon: <ClipboardCheck size={18} /> },
    { label: 'Support', to: '/parent/support', icon: <TrendingUp size={18} /> },
    { label: 'Messages', to: '/parent/messages', icon: <MessageSquare size={18} /> },
    { label: 'Announcements', to: '/parent/announcements', icon: <Bell size={18} /> },
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
  ],
}

function NavItems({ items, iconOnly, onClose }: {
  items: { label: string; to: string; icon: React.ReactNode }[]
  iconOnly?: boolean
  onClose?: () => void
}) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          onClick={onClose}
          title={iconOnly ? item.label : undefined}
          className={({ isActive }) =>
            `flex items-center rounded-lg text-sm transition-colors ${
              iconOnly ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
            } ${isActive ? 'bg-indigo-700 text-white font-medium' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`
          }
        >
          {item.icon}
          {!iconOnly && item.label}
        </NavLink>
      ))}
    </>
  )
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { children: myChildren, activeChild, setActiveChild } = useChild()
  const [open, setOpen] = useState(false)
  if (!user) return null

  const items = navItems[user.role] ?? []

  const childSwitcher = user.role === 'parent' && myChildren.length > 1 ? (
    <div className="px-3 py-3 border-b border-indigo-700">
      <p className="text-xs text-indigo-400 px-1 mb-1.5">Viewing</p>
      <select
        value={activeChild?.student_id ?? ''}
        onChange={e => {
          const c = myChildren.find(x => x.student_id === e.target.value)
          if (c) setActiveChild(c)
        }}
        className="w-full bg-indigo-800 text-white text-xs rounded-lg px-2 py-1.5 border border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {myChildren.map(c => <option key={c.student_id} value={c.student_id}>{c.full_name}</option>)}
      </select>
    </div>
  ) : null

  // Icon-only sidebar for tablet (sm..md)
  const iconSidebar = (
    <aside className="hidden sm:flex md:hidden flex-col w-14 h-full overflow-y-auto bg-indigo-900 text-white">
      <div className="flex justify-center py-5 border-b border-indigo-700">
        <GraduationCap size={24} className="text-indigo-300" />
      </div>
      <nav className="flex-1 flex flex-col px-1 py-4 space-y-1">
        <NavItems items={items} iconOnly />
      </nav>
      <div className="flex flex-col items-center py-4 border-t border-indigo-700 space-y-1">
        <button
          onClick={signOut}
          title="Sign out"
          className="flex justify-center w-full py-2 rounded-lg text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )

  // Full sidebar for desktop (md+) and mobile drawer
  const fullSidebar = (
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
      {childSwitcher}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavItems items={items} onClose={() => setOpen(false)} />
      </nav>
      <div className="px-3 py-4 border-t border-indigo-700">
        <div className="px-3 py-2 text-xs text-indigo-300 truncate">{user.full_name}</div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
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
          <div className="relative z-50">{fullSidebar}</div>
        </div>
      )}

      {/* Tablet: icons only */}
      {iconSidebar}

      {/* Desktop: full sidebar */}
      <div className="hidden md:flex">{fullSidebar}</div>
    </>
  )
}

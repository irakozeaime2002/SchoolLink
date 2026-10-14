import { CalendarCheck, ChevronDown, KeyRound, MessageSquare, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Child {
  student_id: string
  full_name: string
  class_name: string
  school_name: string
  school_id: string
}

export default function ParentDashboard() {
  const { user, mustChangePassword, setMustChangePassword } = useAuth()
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [subjects, setSubjects] = useState<{ name: string; score: number }[]>([])
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    async function loadChildren() {
      const { data } = await supabase
        .from('parent_students')
        .select('student_id, students(full_name, classes(name), schools(name, id))')
        .eq('parent_id', user!.id)

      const list: Child[] = (data ?? []).map((r: any) => ({
        student_id: r.student_id,
        full_name: r.students?.full_name ?? '—',
        class_name: r.students?.classes?.name ?? '—',
        school_name: r.students?.schools?.name ?? '—',
        school_id: r.students?.schools?.id ?? '',
      }))
      setChildren(list)
      if (list.length > 0) setActiveChild(list[0])
      setLoading(false)
    }
    loadChildren()
  }, [user])

  useEffect(() => {
    if (!activeChild) return
    async function loadChildData() {
      setSubjects([])
      setAttendanceRate(null)

      const { data: marks } = await supabase
        .from('marks')
        .select('score, assessments(max_score, subjects(name))')
        .eq('student_id', activeChild!.student_id)

      if (marks && marks.length > 0) {
        const bySubject: Record<string, { total: number; count: number }> = {}
        marks.forEach((m: any) => {
          const name = m.assessments?.subjects?.name
          if (!name) return
          const pct = (m.score / m.assessments.max_score) * 100
          if (!bySubject[name]) bySubject[name] = { total: 0, count: 0 }
          bySubject[name].total += pct
          bySubject[name].count += 1
        })
        setSubjects(Object.entries(bySubject).map(([name, v]) => ({ name, score: Math.round(v.total / v.count) })))
      }

      const { data: att } = await supabase.from('attendance').select('status').eq('student_id', activeChild!.student_id)
      if (att && att.length > 0) {
        const present = att.filter((a: any) => a.status === 'present' || a.status === 'excused').length
        setAttendanceRate(Math.round((present / att.length) * 100))
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('read', false)
      setUnreadMessages(count ?? 0)

      const { data: ann } = await supabase
        .from('announcements')
        .select('title, created_at')
        .eq('school_id', activeChild!.school_id)
        .order('created_at', { ascending: false })
        .limit(3)
      setAnnouncements(ann ?? [])
    }
    loadChildData()
  }, [activeChild])

  async function handleChangePassword() {
    setPwError('')
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setPwLoading(false); return }
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user!.id)
    setMustChangePassword(false)
    setPwLoading(false)
  }

  const overallAvg = subjects.length > 0 ? Math.round(subjects.reduce((s, x) => s + x.score, 0) / subjects.length) : null

  // First login — force password change
  if (mustChangePassword) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><KeyRound size={20} /></div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Set your password</h2>
              <p className="text-xs text-gray-500">You must change your default password before continuing.</p>
            </div>
          </div>
          {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
          <div className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={pwLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {pwLoading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeChild ? `${activeChild.full_name}'s Progress` : 'Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.full_name}{activeChild ? ` · ${activeChild.class_name} · ${activeChild.school_name}` : ''}
          </p>
        </div>

        {/* Child switcher */}
        {children.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(d => !d)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-indigo-300 transition-colors bg-white"
            >
              Switch Child <ChevronDown size={14} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                {children.map(c => (
                  <button
                    key={c.student_id}
                    onClick={() => { setActiveChild(c); setShowDropdown(false) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 ${activeChild?.student_id === c.student_id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.class_name} · {c.school_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && children.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child linked to your account yet. Please contact the school.
        </div>
      )}

      {activeChild && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Overall Average" value={loading ? '…' : overallAvg !== null ? `${overallAvg}%` : '—'} icon={<TrendingUp size={20} />} color="bg-indigo-50 text-indigo-600" />
            <StatCard label="Attendance Rate" value={loading ? '…' : attendanceRate !== null ? `${attendanceRate}%` : '—'} icon={<CalendarCheck size={20} />} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Unread Messages" value={loading ? '…' : unreadMessages} icon={<MessageSquare size={20} />} color="bg-amber-50 text-amber-600" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Subjects This Term</h2>
            {subjects.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No marks recorded yet.</p>
              : <div className="space-y-2">
                  {subjects.map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${s.score}%` }} />
                        </div>
                        <Badge label={`${s.score}%`} variant={s.score >= 75 ? 'green' : s.score >= 60 ? 'yellow' : 'red'} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Announcements</h2>
            {announcements.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">No announcements yet.</p>
              : <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.title} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700">{a.title}</span>
                      <span className="text-gray-400 text-xs">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {children.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">All Your Children</h2>
              <div className="space-y-2">
                {children.map(c => (
                  <button
                    key={c.student_id}
                    onClick={() => setActiveChild(c)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left ${activeChild?.student_id === c.student_id ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50'}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{c.class_name} · {c.school_name}</p>
                    </div>
                    {activeChild?.student_id === c.student_id && (
                      <span className="text-xs text-indigo-600 font-medium">Viewing</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

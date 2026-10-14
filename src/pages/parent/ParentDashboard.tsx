import { CalendarCheck, MessageSquare, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ParentDashboard() {
  const { user } = useAuth()
  const [child, setChild] = useState<any>(null)
  const [subjects, setSubjects] = useState<{ name: string; score: number }[]>([])
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      // Get linked child
      const { data: link } = await supabase
        .from('parent_students')
        .select('student_id, students(full_name, class_id, classes(name))')
        .eq('parent_id', user!.id)
        .limit(1)
        .single()

      if (!link) { setLoading(false); return }
      setChild(link.students)
      const studentId = link.student_id

      // Subject averages
      const { data: marks } = await supabase
        .from('marks')
        .select('score, assessments(max_score, subjects(name))')
        .eq('student_id', studentId)

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

      // Attendance rate
      const { data: att } = await supabase.from('attendance').select('status').eq('student_id', studentId)
      if (att && att.length > 0) {
        const present = att.filter((a: any) => a.status === 'present' || a.status === 'excused').length
        setAttendanceRate(Math.round((present / att.length) * 100))
      }

      // Unread messages
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('read', false)
      setUnreadMessages(count ?? 0)

      // Announcements
      const { data: ann } = await supabase
        .from('announcements')
        .select('title, created_at')
        .eq('school_id', user!.school_id)
        .order('created_at', { ascending: false })
        .limit(3)
      setAnnouncements(ann ?? [])

      setLoading(false)
    }
    load()
  }, [user])

  const overallAvg = subjects.length > 0 ? Math.round(subjects.reduce((s, x) => s + x.score, 0) / subjects.length) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {child ? `${child.full_name}'s Progress` : 'Dashboard'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome, {user?.full_name}{child ? ` · ${child.classes?.name}` : ''}
        </p>
      </div>

      {!loading && !child && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child linked to your account yet. Please contact the school.
        </div>
      )}

      {child && (
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
        </>
      )}
    </div>
  )
}

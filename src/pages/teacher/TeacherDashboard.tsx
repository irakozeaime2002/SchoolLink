import { BookOpen, CalendarCheck, ClipboardList } from 'lucide-react'
import { useEffect, useState } from 'react'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, assessments: 0, attendanceRate: null as number | null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      // Classes assigned to this teacher
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user!.id)

      const classIds = (classes ?? []).map((c: any) => c.id)

      if (classIds.length === 0) { setLoading(false); return }

      // Student count
      const { count: students } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)

      // Assessment count
      const { count: assessments } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user!.id)

      // Attendance rate
      const { data: att } = await supabase
        .from('attendance')
        .select('status')
        .eq('teacher_id', user!.id)

      let attendanceRate = null
      if (att && att.length > 0) {
        const present = att.filter((a: any) => a.status === 'present' || a.status === 'excused').length
        attendanceRate = Math.round((present / att.length) * 100)
      }

      setStats({ students: students ?? 0, assessments: assessments ?? 0, attendanceRate })
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Students" value={loading ? '…' : stats.students} icon={<BookOpen size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Assessments This Term" value={loading ? '…' : stats.assessments} icon={<ClipboardList size={20} />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Attendance Rate" value={loading ? '…' : stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '—'} icon={<CalendarCheck size={20} />} color="bg-amber-50 text-amber-600" />
      </div>

      {!loading && stats.students === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No classes assigned yet. Ask your headteacher to assign you to a class.
        </div>
      )}
    </div>
  )
}

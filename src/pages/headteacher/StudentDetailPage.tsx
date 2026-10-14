import { ArrowLeft, CalendarCheck, GraduationCap, Phone, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'

function scoreVariant(s: number): 'green' | 'yellow' | 'red' {
  return s >= 75 ? 'green' : s >= 60 ? 'yellow' : 'red'
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<any>(null)
  const [subjects, setSubjects] = useState<{ name: string; average: number }[]>([])
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [{ data: s }, { data: parentLinks }] = await Promise.all([
        supabase.from('students').select('*, classes(name)').eq('id', id).single(),
        supabase.from('parent_students').select('profiles(full_name, phone)').eq('student_id', id),
      ])
      setStudent(s ? { ...s, parent_students: parentLinks ?? [] } : null)

      // Subject averages from marks
      const { data: studentMarks } = await supabase
        .from('marks')
        .select('score, assessment_id')
        .eq('student_id', id)

      if (studentMarks && studentMarks.length > 0) {
        const assessmentIds = studentMarks.map((m: any) => m.assessment_id)
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id, max_score, subjects(name)')
          .in('id', assessmentIds)
        const aMap = Object.fromEntries((assessments ?? []).map((a: any) => [a.id, a]))
        const bySubject: Record<string, { total: number; count: number }> = {}
        studentMarks.forEach((m: any) => {
          const a = aMap[m.assessment_id]
          const name = (a?.subjects as any)?.name
          if (!name) return
          const pct = (m.score / a.max_score) * 100
          if (!bySubject[name]) bySubject[name] = { total: 0, count: 0 }
          bySubject[name].total += pct
          bySubject[name].count += 1
        })
        setSubjects(Object.entries(bySubject).map(([name, v]) => ({ name, average: Math.round(v.total / v.count) })))
      }

      // Attendance
      const { data: att } = await supabase.from('attendance').select('status').eq('student_id', id)
      if (att) {
        const counts = { present: 0, absent: 0, late: 0, excused: 0, total: att.length }
        att.forEach((a: any) => { counts[a.status as keyof typeof counts]++ })
        setAttendance(counts)
      }

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!student) return (
    <div className="text-center py-20 text-gray-400">
      <p>Student not found.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 text-sm hover:underline">Go back</button>
    </div>
  )

  const overallAvg = subjects.length > 0 ? Math.round(subjects.reduce((s, x) => s + x.average, 0) / subjects.length) : null
  const attendanceRate = attendance.total > 0 ? Math.round(((attendance.present + attendance.excused) / attendance.total) * 100) : null
  const parent = student.parent_students?.[0]?.profiles

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> Back to Students
      </button>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-5">
        <div className="bg-indigo-100 text-indigo-600 rounded-full p-4">
          <GraduationCap size={28} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{student.full_name}</h1>
            <Badge label={student.status} variant={student.status === 'active' ? 'green' : 'yellow'} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><User size={14} /> {student.classes?.name ?? '—'}</span>
            {student.date_of_birth && <span className="flex items-center gap-1"><CalendarCheck size={14} /> Born {student.date_of_birth}</span>}
            {parent && <span className="flex items-center gap-1"><Phone size={14} /> {parent.full_name} · {parent.phone ?? '—'}</span>}
          </div>
        </div>
        {overallAvg !== null && (
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-indigo-600">{overallAvg}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Overall average</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Subject Performance</h2>
          {subjects.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No marks recorded yet.</p>
            : <div className="space-y-3">
                {subjects.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 w-28">{s.name}</span>
                    <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${s.average}%` }} />
                    </div>
                    <Badge label={`${s.average}%`} variant={scoreVariant(s.average)} />
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Attendance Summary</h2>
          {attendance.total === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No attendance records yet.</p>
            : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Rate', value: `${attendanceRate}%`, color: 'bg-green-50 text-green-700' },
                  { label: 'Present', value: attendance.present, color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Absent', value: attendance.absent, color: 'bg-red-50 text-red-700' },
                  { label: 'Late', value: attendance.late, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Excused', value: attendance.excused, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Total Days', value: attendance.total, color: 'bg-gray-50 text-gray-700' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

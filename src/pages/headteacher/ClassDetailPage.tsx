import { ArrowLeft, CalendarCheck, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { supabase } from '../../lib/supabase'

function scoreVariant(s: number): 'green' | 'yellow' | 'red' {
  return s >= 75 ? 'green' : s >= 60 ? 'yellow' : 'red'
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cls, setCls] = useState<any>(null)
  const [students, setStudents] = useState<{ id: string; full_name: string; avg: number | null; attendance: number | null }[]>([])
  const [subjectData, setSubjectData] = useState<{ subject: string; average: number }[]>([])
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      // Class info
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, profiles(full_name)')
        .eq('id', id)
        .single()
      setCls(classData)

      const { data: studentRows } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('class_id', id)
        .order('full_name')
      const studentList = studentRows ?? []
      const studentIds = studentList.map((s: any) => s.id)

      // Marks for all students in class
      const { data: marks } = await supabase
        .from('marks')
        .select('score, student_id, assessments(max_score, subjects(name))')
        .in('student_id', studentIds)

      // Per-student averages
      const studentScores: Record<string, { total: number; count: number }> = {}
      // Per-subject averages
      const subjectScores: Record<string, { total: number; count: number }> = {}

      for (const m of marks ?? []) {
        const pct = (m.score / (m.assessments as any).max_score) * 100
        const subjectName = (m.assessments as any).subjects?.name
        if (!studentScores[m.student_id]) studentScores[m.student_id] = { total: 0, count: 0 }
        studentScores[m.student_id].total += pct
        studentScores[m.student_id].count += 1
        if (subjectName) {
          if (!subjectScores[subjectName]) subjectScores[subjectName] = { total: 0, count: 0 }
          subjectScores[subjectName].total += pct
          subjectScores[subjectName].count += 1
        }
      }

      setSubjectData(
        Object.entries(subjectScores).map(([subject, v]) => ({ subject, average: Math.round(v.total / v.count) }))
      )

      // Attendance per student
      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', id)

      const studentAtt: Record<string, { present: number; total: number }> = {}
      const totals = { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
      for (const a of attData ?? []) {
        if (!studentAtt[a.student_id]) studentAtt[a.student_id] = { present: 0, total: 0 }
        studentAtt[a.student_id].total += 1
        if (a.status === 'present' || a.status === 'excused') studentAtt[a.student_id].present += 1
        totals[a.status as keyof typeof totals] += 1
        totals.total += 1
      }
      setAttendance(totals)

      setStudents(
        studentList.map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          avg: studentScores[s.id] ? Math.round(studentScores[s.id].total / studentScores[s.id].count) : null,
          attendance: studentAtt[s.id]?.total
            ? Math.round((studentAtt[s.id].present / studentAtt[s.id].total) * 100)
            : null,
        }))
      )

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!cls) return (
    <div className="text-center py-20 text-gray-400">
      <p>Class not found.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 text-sm hover:underline">Go back</button>
    </div>
  )

  const classAvg = students.length > 0
    ? Math.round(students.filter(s => s.avg !== null).reduce((sum, s) => sum + (s.avg ?? 0), 0) / students.filter(s => s.avg !== null).length)
    : null
  const attRate = attendance.total > 0 ? Math.round(((attendance.present + attendance.excused) / attendance.total) * 100) : null

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> Back to Classes
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-600 rounded-xl p-3">
            <GraduationCap size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Class Teacher: <span className="font-medium text-gray-700">{cls.profiles?.full_name ?? 'Unassigned'}</span>
            </p>
          </div>
        </div>
        {classAvg !== null && (
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-indigo-600">{classAvg}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Class average</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Students" value={students.length} icon={<Users size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Class Average" value={classAvg !== null ? `${classAvg}%` : '—'} icon={<GraduationCap size={20} />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Attendance Rate" value={attRate !== null ? `${attRate}%` : '—'} icon={<CalendarCheck size={20} />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject performance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Average by Subject</h2>
          {subjectData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Attendance breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Attendance Breakdown</h2>
          {attendance.total === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No attendance records yet.</p>
            : <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Present', value: attendance.present, color: 'bg-green-50 text-green-700' },
                  { label: 'Absent', value: attendance.absent, color: 'bg-red-50 text-red-700' },
                  { label: 'Late', value: attendance.late, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Excused', value: attendance.excused, color: 'bg-blue-50 text-blue-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Students table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Students ({students.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Average Score</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No students in this class.</td></tr>
              : students.map((s, i) => (
                <tr key={s.id} onClick={() => navigate(`/headteacher/students/${s.id}`)}
                  className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                  <td className="px-5 py-3">
                    {s.avg !== null
                      ? <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${s.avg}%` }} />
                          </div>
                          <Badge label={`${s.avg}%`} variant={scoreVariant(s.avg)} />
                        </div>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {s.attendance !== null
                      ? <Badge label={`${s.attendance}%`} variant={s.attendance >= 80 ? 'green' : s.attendance >= 60 ? 'yellow' : 'red'} />
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

const ATTENDANCE_COLORS = ['#059669', '#d97706', '#dc2626', '#0891b2']
function avg(vals: number[]) {
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export default function SupervisorClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const { supervisor } = useSupervisor()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [className, setClassName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([])
  const [assessments, setAssessments] = useState<{ id: string; subject_id: string; max_score: number; title: string }[]>([])
  const [marks, setMarks] = useState<{ assessment_id: string; student_id: string; score: number }[]>([])
  const [attendance, setAttendance] = useState<{ student_id: string; status: string }[]>([])

  useEffect(() => {
    if (!supervisor || !classId) return
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('classes').select('id, name, teacher_id').eq('id', classId).single(),
      supabase.from('students').select('id, full_name').eq('class_id', classId).eq('status', 'active').order('full_name'),
      supabase.from('subjects').select('id, name').eq('school_id', sid),
      supabase.from('assessments').select('id, subject_id, max_score, title').eq('class_id', classId),
      supabase.from('attendance').select('student_id, status').eq('class_id', classId),
    ]).then(async ([{ data: cl }, { data: st }, { data: su }, { data: as_ }, { data: at }]) => {
      setClassName(cl?.name ?? '')
      setStudents(st ?? [])
      setSubjects(su ?? [])
      setAssessments(as_ ?? [])
      setAttendance(at ?? [])
      // fetch teacher name
      if (cl?.teacher_id) {
        const { data: tp } = await supabase.from('profiles').select('full_name').eq('id', cl.teacher_id).single()
        setTeacherName(tp?.full_name ?? '')
      }
      const ids = (as_ ?? []).map((a: any) => a.id)
      if (!ids.length) { setLoading(false); return }
      const { data: mk } = await supabase.from('marks').select('assessment_id, student_id, score').in('assessment_id', ids)
      setMarks(mk ?? [])
      setLoading(false)
    })
  }, [supervisor, classId])

  const charts = useMemo(() => {
    const assessmentMap = new Map(assessments.map(a => [a.id, a]))
    const subjectScores = new Map<string, number[]>()
    const studentScores = new Map<string, number[]>()

    for (const m of marks) {
      const a = assessmentMap.get(m.assessment_id)
      if (!a || a.max_score <= 0) continue
      const pct = (m.score / a.max_score) * 100
      subjectScores.set(a.subject_id, [...(subjectScores.get(a.subject_id) ?? []), pct])
      studentScores.set(m.student_id, [...(studentScores.get(m.student_id) ?? []), pct])
    }

    const subjectByAvg = subjects
      .map(s => ({ name: s.name, average: avg(subjectScores.get(s.id) ?? []) }))
      .filter(s => s.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    const studentRows = students.map(s => ({
      id: s.id,
      name: s.full_name,
      average: avg(studentScores.get(s.id) ?? []),
    })).sort((a, b) => (b.average ?? -1) - (a.average ?? -1))

    const counts = { present: 0, late: 0, absent: 0, excused: 0 }
    for (const r of attendance) {
      const k = r.status as keyof typeof counts
      if (k in counts) counts[k]++
    }
    const attendanceBreakdown = [
      { name: 'Present', value: counts.present },
      { name: 'Late', value: counts.late },
      { name: 'Absent', value: counts.absent },
      { name: 'Excused', value: counts.excused },
    ].filter(x => x.value > 0)
    const eligible = counts.present + counts.late + counts.absent
    const attendanceRate = eligible ? Math.round(((counts.present + counts.late) / eligible) * 100) : null

    return { subjectByAvg, studentRows, attendanceBreakdown, attendanceRate }
  }, [subjects, students, assessments, marks, attendance])

  if (!supervisor) return null

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/supervisor/classes')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={15} /> Back to classes
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{loading ? '…' : className}</h1>
        {teacherName && <p className="text-gray-500 text-sm mt-1">Class teacher: {teacherName}</p>}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Subject averages */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Average by subject</h2>
              <p className="text-xs text-gray-500 mb-4">Mark average per subject for this class</p>
              {charts.subjectByAvg.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No marks recorded yet.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.subjectByAvg}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" width={36} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Average']} />
                      <Bar dataKey="average" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Attendance breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Attendance breakdown</h2>
              <p className="text-xs text-gray-500 mb-4">
                Overall rate: {charts.attendanceRate === null ? '—' : `${charts.attendanceRate}%`}
              </p>
              {charts.attendanceBreakdown.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No attendance records yet.</p>
              ) : (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.attendanceBreakdown} dataKey="value" nameKey="name"
                          innerRadius={44} outerRadius={70} paddingAngle={3}>
                          {charts.attendanceBreakdown.map((_, i) => (
                            <Cell key={i} fill={ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {charts.attendanceBreakdown.map((item, i) => (
                      <span key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length] }} />
                        {item.name} ({item.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Student performance table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Student performance</h2>
              <p className="text-xs text-gray-500 mt-0.5">{students.length} active student{students.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Average</th>
                    <th className="px-5 py-3 font-medium">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {charts.studentRows.map(s => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-5 py-3 text-gray-600">{s.average === null ? '—' : `${s.average}%`}</td>
                      <td className="px-5 py-3">
                        {s.average === null ? <span className="text-gray-400 text-xs">No marks</span> : (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${s.average >= 70 ? 'bg-emerald-500' : s.average >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${s.average}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${s.average >= 70 ? 'text-emerald-600' : s.average >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {s.average >= 70 ? 'Good' : s.average >= 50 ? 'Average' : 'Needs support'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {charts.studentRows.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No students found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

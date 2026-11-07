import { BookOpen, ClipboardList, GraduationCap, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

const ATTENDANCE_COLORS = ['#059669', '#d97706', '#dc2626', '#0891b2']

function avg(vals: number[]) {
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export default function SupervisorOverviewPage() {
  const { supervisor } = useSupervisor()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<{ id: string; class_id: string }[]>([])
  const [teacherCount, setTeacherCount] = useState(0)
  const [assessments, setAssessments] = useState<{ id: string; class_id: string; subject_id: string; max_score: number }[]>([])
  const [marks, setMarks] = useState<{ assessment_id: string; score: number }[]>([])
  const [attendance, setAttendance] = useState<{ date: string; status: string }[]>([])

  useEffect(() => {
    if (!supervisor) return
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('classes').select('id, name').eq('school_id', sid),
      supabase.from('subjects').select('id, name').eq('school_id', sid),
      supabase.from('students').select('id, class_id').eq('school_id', sid).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', sid).eq('role', 'teacher'),
      supabase.from('assessments').select('id, class_id, subject_id, max_score').eq('school_id', sid),
      supabase.from('attendance').select('date, status').eq('school_id', sid),
    ]).then(([{ data: cl, error: e1 }, { data: su, error: e2 }, { data: st, error: e3 }, { count: tc, error: e4 }, { data: as_, error: e5 }, { data: at, error: e6 }]) => {
      console.log('classes:', cl?.length, e1?.message)
      console.log('subjects:', su?.length, e2?.message)
      console.log('students:', st?.length, e3?.message)
      console.log('teachers:', tc, e4?.message)
      console.log('assessments:', as_?.length, e5?.message)
      console.log('attendance:', at?.length, e6?.message)
      setClasses(cl ?? [])
      setSubjects(su ?? [])
      setStudents(st ?? [])
      setTeacherCount(tc ?? 0)
      setAttendance(at ?? [])
      const ids = (as_ ?? []).map((a: any) => a.id)
      setAssessments(as_ ?? [])
      if (!ids.length) { setLoading(false); return }
      supabase.from('marks').select('assessment_id, score').in('assessment_id', ids)
        .then(({ data: mk, error: e7 }) => {
          console.log('marks:', mk?.length, e7?.message)
          setMarks(mk ?? []); setLoading(false)
        })
    })
  }, [supervisor])

  const charts = useMemo(() => {
    const assessmentMap = new Map(assessments.map(a => [a.id, a]))
    const classScores = new Map<string, number[]>()
    const subjectScores = new Map<string, number[]>()

    for (const m of marks) {
      const a = assessmentMap.get(m.assessment_id)
      if (!a || a.max_score <= 0) continue
      const pct = (m.score / a.max_score) * 100
      classScores.set(a.class_id, [...(classScores.get(a.class_id) ?? []), pct])
      subjectScores.set(a.subject_id, [...(subjectScores.get(a.subject_id) ?? []), pct])
    }

    const classByAvg = classes
      .map(c => ({ name: c.name, average: avg(classScores.get(c.id) ?? []) }))
      .filter(c => c.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    const subjectByAvg = subjects
      .map(s => ({ name: s.name, average: avg(subjectScores.get(s.id) ?? []) }))
      .filter(s => s.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    const allPcts = marks.map(m => {
      const a = assessmentMap.get(m.assessment_id)
      return a && a.max_score > 0 ? (m.score / a.max_score) * 100 : null
    }).filter((v): v is number => v !== null)
    const overallAvg = avg(allPcts)

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

    const byDate = new Map<string, { present: number; absent: number; late: number }>()
    for (const r of attendance) {
      const d = byDate.get(r.date) ?? { present: 0, absent: 0, late: 0 }
      if (r.status === 'present') d.present++
      else if (r.status === 'absent') d.absent++
      else if (r.status === 'late') d.late++
      byDate.set(r.date, d)
    }
    const attendanceTrend = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-20)
      .map(([date, d]) => {
        const el = d.present + d.absent + d.late
        return {
          date: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          rate: el ? Math.round(((d.present + d.late) / el) * 100) : 0,
        }
      })

    return { classByAvg, subjectByAvg, overallAvg, attendanceBreakdown, attendanceRate, attendanceTrend }
  }, [classes, subjects, assessments, marks, attendance])

  if (!supervisor) return null

  const expiresAt = new Date(supervisor.expires_at)
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Read-only supervisor view</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        Access expires {expiresAt.toLocaleString()} · {hoursLeft}h remaining
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><GraduationCap size={20} /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : students.length}</p>
            <p className="text-xs text-gray-500">Active students</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><Users size={20} /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : teacherCount}</p>
            <p className="text-xs text-gray-500">Teachers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-amber-50 text-amber-600 p-2 rounded-lg"><BookOpen size={20} /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : classes.length}</p>
            <p className="text-xs text-gray-500">Classes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-sky-50 text-sky-600 p-2 rounded-lg"><ClipboardList size={20} /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : charts.overallAvg === null ? '—' : `${charts.overallAvg}%`}</p>
            <p className="text-xs text-gray-500">School average</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Average by class */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Average by class</h2>
            <p className="text-xs text-gray-500 mb-4">Mark average as a percentage per class</p>
            {charts.classByAvg.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No marks recorded yet.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.classByAvg}>
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

          {/* Average by subject */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Average by subject</h2>
            <p className="text-xs text-gray-500 mb-4">Mark average as a percentage per subject</p>
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
                    <Bar dataKey="average" fill="#059669" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Attendance trend */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Attendance trend</h2>
            <p className="text-xs text-gray-500 mb-4">Daily attendance rate — last 20 days</p>
            {charts.attendanceTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No attendance records yet.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" width={36} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                    <Line type="monotone" dataKey="rate" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.attendanceBreakdown} dataKey="value" nameKey="name"
                        innerRadius={48} outerRadius={76} paddingAngle={3}>
                        {charts.attendanceBreakdown.map((_, i) => (
                          <Cell key={i} fill={ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {charts.attendanceBreakdown.map((item, i) => (
                    <span key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ATTENDANCE_COLORS[i % ATTENDANCE_COLORS.length] }} />
                      {item.name} ({item.value})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

import { BookOpen, CalendarCheck, FileText, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ParentReportPage() {
  const { user } = useAuth()
  const [student, setStudent] = useState<any>(null)
  const [subjectData, setSubjectData] = useState<{ name: string; average: number }[]>([])
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    async function load() {
      const { data: link } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', user.id)
        .limit(1)
        .single()

      if (!link) {
        setLoading(false)
        return
      }

      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, status, classes(name)')
        .eq('id', link.student_id)
        .single()
      setStudent(studentData)

      const { data: marksData } = await supabase
        .from('marks')
        .select('score, assessment_id')
        .eq('student_id', link.student_id)

      if (marksData && marksData.length > 0) {
        const assessmentIds = marksData.map((m: any) => m.assessment_id)
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id, max_score, subjects(name)')
          .in('id', assessmentIds)

        const assessmentMap = Object.fromEntries((assessments ?? []).map((a: any) => [a.id, a]))
        const bySubject: Record<string, { total: number; count: number }> = {}

        marksData.forEach((mark: any) => {
          const assessment = assessmentMap[mark.assessment_id]
          const subjectName = (assessment?.subjects as any)?.name
          if (!subjectName) return

          const percent = (mark.score / assessment.max_score) * 100
          if (!bySubject[subjectName]) bySubject[subjectName] = { total: 0, count: 0 }
          bySubject[subjectName].total += percent
          bySubject[subjectName].count += 1
        })

        setSubjectData(
          Object.entries(bySubject).map(([name, value]) => ({
            name,
            average: Math.round(value.total / value.count),
          }))
        )
      }

      const { data: attData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', link.student_id)

      if (attData && attData.length > 0) {
        const counts = { present: 0, absent: 0, late: 0, excused: 0, total: attData.length }
        attData.forEach((item: any) => {
          if (item.status in counts) counts[item.status as keyof typeof counts] += 1
        })
        setAttendance(counts)
      }

      setLoading(false)
    }

    load()
  }, [user])

  const overallAverage = subjectData.length > 0
    ? Math.round(subjectData.reduce((total, item) => total + item.average, 0) / subjectData.length)
    : null

  const attendanceRate = attendance.total > 0
    ? Math.round(((attendance.present + attendance.excused) / attendance.total) * 100)
    : null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Card</h1>
        <p className="text-gray-500 text-sm mt-1">
          {student ? `${student.full_name} · ${student.classes?.name ?? 'Class Overview'}` : 'Student performance overview'}
        </p>
      </div>

      {!student && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No student is linked to your account yet.
        </div>
      )}

      {student && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Overall Average</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{overallAverage !== null ? `${overallAverage}%` : '—'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Attendance</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-xl font-bold text-gray-800 mt-2 capitalize">{student.status}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Subject Performance</h2>
            {subjectData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No marks recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {subjectData.map((subject) => (
                  <div key={subject.name} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                        <span className="text-sm font-semibold text-gray-800">{subject.average}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${subject.average}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Present', value: attendance.present, color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Absent', value: attendance.absent, color: 'bg-red-50 text-red-700' },
                { label: 'Late', value: attendance.late, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Excused', value: attendance.excused, color: 'bg-emerald-50 text-emerald-700' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

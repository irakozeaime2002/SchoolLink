import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeacherReportsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const teacherId = user?.id

    if (!teacherId) {
      setLoading(false)
      return
    }

    async function load() {
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', teacherId)

      const classIds = (classes ?? []).map((item: any) => item.id)
      if (classIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name, class_id, classes(name)')
        .in('class_id', classIds)

      const studentIds = (studentsData ?? []).map((student: any) => student.id)

      if (studentIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: marksData } = await supabase
        .from('marks')
        .select('student_id, score, assessment_id')
        .in('student_id', studentIds)

      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, max_score, subjects(name)')
        .in('id', (marksData ?? []).map((mark: any) => mark.assessment_id))

      const assessmentMap = Object.fromEntries((assessments ?? []).map((a: any) => [a.id, a]))
      const scoreMap: Record<string, { total: number; count: number }> = {}

      for (const mark of marksData ?? []) {
        const assessment = assessmentMap[mark.assessment_id]
        const subjectName = (assessment?.subjects as any)?.name
        if (!subjectName) continue

        if (!scoreMap[mark.student_id]) scoreMap[mark.student_id] = { total: 0, count: 0 }
        scoreMap[mark.student_id].total += (mark.score / assessment.max_score) * 100
        scoreMap[mark.student_id].count += 1
      }

      setStudents((studentsData ?? []).map((student: any) => {
        const sum = scoreMap[student.id]
        return {
          ...student,
          average: sum ? Math.round(sum.total / sum.count) : null,
          needsSupport: sum ? Math.round(sum.total / sum.count) < 60 : true,
        }
      }))

      setLoading(false)
    }

    load()
  }, [user?.id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Performance overview across your classes.</p>
      </div>

      {students.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No students found in your assigned classes yet.
        </div>
      )}

      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Student</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Class</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Average</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{student.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{student.classes?.name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-800">
                      {student.average !== null ? `${student.average}%` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {student.needsSupport ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                        Needs support
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                        On track
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
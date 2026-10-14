import { ArrowLeft, BookOpen, ClipboardList, GraduationCap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { supabase } from '../../lib/supabase'

function scoreVariant(s: number): 'green' | 'yellow' | 'red' {
  return s >= 75 ? 'green' : s >= 60 ? 'yellow' : 'red'
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [subject, setSubject] = useState<any>(null)
  const [classData, setClassData] = useState<{ class: string; average: number }[]>([])
  const [assessments, setAssessments] = useState<{ title: string; type: string; avg: number; max_score: number }[]>([])
  const [topStudents, setTopStudents] = useState<{ name: string; avg: number }[]>([])
  const [stats, setStats] = useState({ overall: 0, totalAssessments: 0, totalStudents: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('id', id)
        .single()
      setSubject(subjectData)

      // All assessments for this subject
      const { data: assessmentRows } = await supabase
        .from('assessments')
        .select('id, title, type, max_score, classes(name)')
        .eq('subject_id', id)

      if (!assessmentRows || assessmentRows.length === 0) { setLoading(false); return }

      const assessmentIds = assessmentRows.map((a: any) => a.id)

      // All marks for these assessments
      const { data: marks } = await supabase
        .from('marks')
        .select('score, assessment_id, student_id, students(full_name)')
        .in('assessment_id', assessmentIds)

      // Per-assessment averages
      const assessmentScores: Record<string, { total: number; count: number; max_score: number; title: string; type: string }> = {}
      for (const a of assessmentRows) {
        assessmentScores[a.id] = { total: 0, count: 0, max_score: a.max_score, title: a.title, type: a.type }
      }

      // Per-class averages
      const classScores: Record<string, { total: number; count: number }> = {}

      // Per-student averages
      const studentScores: Record<string, { total: number; count: number; name: string }> = {}

      let overallTotal = 0, overallCount = 0

      for (const m of marks ?? []) {
        const assessment = assessmentRows.find((a: any) => a.id === m.assessment_id) as any
        if (!assessment) continue
        const pct = (m.score / assessment.max_score) * 100
        const className = assessment.classes?.name

        assessmentScores[m.assessment_id].total += pct
        assessmentScores[m.assessment_id].count += 1

        if (className) {
          if (!classScores[className]) classScores[className] = { total: 0, count: 0 }
          classScores[className].total += pct
          classScores[className].count += 1
        }

        if (!studentScores[m.student_id]) studentScores[m.student_id] = { total: 0, count: 0, name: (m.students as any)?.full_name ?? '—' }
        studentScores[m.student_id].total += pct
        studentScores[m.student_id].count += 1

        overallTotal += pct
        overallCount += 1
      }

      setClassData(
        Object.entries(classScores).map(([cls, v]) => ({ class: cls, average: Math.round(v.total / v.count) }))
      )

      setAssessments(
        Object.entries(assessmentScores)
          .filter(([, v]) => v.count > 0)
          .map(([, v]) => ({ title: v.title, type: v.type, avg: Math.round(v.total / v.count), max_score: v.max_score }))
          .sort((a, b) => b.avg - a.avg)
      )

      const sorted = Object.values(studentScores)
        .map(v => ({ name: v.name, avg: Math.round(v.total / v.count) }))
        .sort((a, b) => b.avg - a.avg)
      setTopStudents(sorted.slice(0, 5))

      setStats({
        overall: overallCount > 0 ? Math.round(overallTotal / overallCount) : 0,
        totalAssessments: assessmentRows.length,
        totalStudents: Object.keys(studentScores).length,
      })

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!subject) return (
    <div className="text-center py-20 text-gray-400">
      <p>Subject not found.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 text-sm hover:underline">Go back</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> Back to Subjects
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
        <div className="bg-indigo-100 text-indigo-600 rounded-xl p-3">
          <BookOpen size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          {subject.code && <p className="text-sm text-gray-400 mt-0.5">Code: {subject.code}</p>}
        </div>
        {stats.overall > 0 && (
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-indigo-600">{stats.overall}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Overall average</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Overall Average" value={stats.overall > 0 ? `${stats.overall}%` : '—'} icon={<BookOpen size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Total Assessments" value={stats.totalAssessments} icon={<ClipboardList size={20} />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Students Assessed" value={stats.totalStudents} icon={<GraduationCap size={20} />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average by class */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Average by Class</h2>
          {classData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={classData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Top 5 students */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Top 5 Students</h2>
          {topStudents.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <div className="space-y-3">
                {topStudents.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${s.avg}%` }} />
                    </div>
                    <Badge label={`${s.avg}%`} variant={scoreVariant(s.avg)} />
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Assessments breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Assessments ({assessments.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Title</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Max Score</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assessments.length === 0
              ? <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No assessments yet.</td></tr>
              : assessments.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{a.title}</td>
                  <td className="px-5 py-3"><Badge label={a.type} variant="blue" /></td>
                  <td className="px-5 py-3 text-gray-500">{a.max_score}</td>
                  <td className="px-5 py-3"><Badge label={`${a.avg}%`} variant={scoreVariant(a.avg)} /></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

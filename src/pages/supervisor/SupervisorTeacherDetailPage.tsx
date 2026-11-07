import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

function avg(vals: number[]) {
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export default function SupervisorTeacherDetailPage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const { supervisor } = useSupervisor()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [teacherName, setTeacherName] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [assessments, setAssessments] = useState<{ id: string; class_id: string; subject_id: string; max_score: number }[]>([])
  const [marks, setMarks] = useState<{ assessment_id: string; score: number }[]>([])
  const [lessonPlanCount, setLessonPlanCount] = useState(0)

  useEffect(() => {
    if (!supervisor || !teacherId) return
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', teacherId).single(),
      supabase.from('classes').select('id, name').eq('school_id', sid).eq('teacher_id', teacherId),
      supabase.from('subjects').select('id, name').eq('school_id', sid),
      supabase.from('assessments').select('id, class_id, subject_id, max_score').eq('school_id', sid).eq('teacher_id', teacherId),
      supabase.from('lesson_plans').select('id', { count: 'exact', head: true }).eq('school_id', sid).eq('teacher_id', teacherId),
    ]).then(async ([{ data: pr }, { data: cl }, { data: su }, { data: as_ }, { count: lp }]) => {
      setTeacherName(pr?.full_name ?? '')
      setTeacherEmail(pr?.email ?? '')
      setClasses(cl ?? [])
      setSubjects(su ?? [])
      setAssessments(as_ ?? [])
      setLessonPlanCount(lp ?? 0)
      const ids = (as_ ?? []).map((a: any) => a.id)
      if (!ids.length) { setLoading(false); return }
      const { data: mk } = await supabase.from('marks').select('assessment_id, score').in('assessment_id', ids)
      setMarks(mk ?? [])
      setLoading(false)
    })
  }, [supervisor, teacherId])

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

    const subjectByAvg = subjects
      .map(s => ({ name: s.name, average: avg(subjectScores.get(s.id) ?? []) }))
      .filter(s => s.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    const allPcts = marks.map(m => {
      const a = assessmentMap.get(m.assessment_id)
      return a && a.max_score > 0 ? (m.score / a.max_score) * 100 : null
    }).filter((v): v is number => v !== null)

    return { classByAvg, subjectByAvg, overallAvg: avg(allPcts) }
  }, [classes, subjects, assessments, marks])

  if (!supervisor) return null

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/supervisor/teachers')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-3">
          <ArrowLeft size={15} /> Back to teachers
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{loading ? '…' : teacherName}</h1>
        {teacherEmail && <p className="text-gray-500 text-sm mt-1">{teacherEmail}</p>}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Classes assigned</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{charts.overallAvg === null ? '—' : `${charts.overallAvg}%`}</p>
              <p className="text-xs text-gray-500 mt-0.5">Overall average</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{lessonPlanCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lesson plans uploaded</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Average by class */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Average by class</h2>
              <p className="text-xs text-gray-500 mb-4">Mark average for each class this teacher leads</p>
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
              <p className="text-xs text-gray-500 mb-4">Mark average across subjects this teacher assessed</p>
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
          </div>

          {/* Classes table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Assigned classes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {classes.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400">No classes assigned.</p>
              ) : classes.map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <button onClick={() => navigate(`/supervisor/classes/${c.id}`)}
                    className="text-xs text-indigo-600 hover:underline">View class →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

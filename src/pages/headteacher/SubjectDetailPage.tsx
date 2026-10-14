import { ArrowLeft, BookOpen, ClipboardList, GraduationCap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { supabase } from '../../lib/supabase'

function scoreVariant(s: number): 'green' | 'yellow' | 'red' {
  return s >= 75 ? 'green' : s >= 60 ? 'yellow' : 'red'
}

interface RawMark {
  score: number
  assessment_id: string
  student_id: string
  student_name: string
  class_name: string
  max_score: number
  title: string
  type: string
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [subject, setSubject] = useState<any>(null)
  const [rawMarks, setRawMarks] = useState<RawMark[]>([])
  const [allClasses, setAllClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: subjectData } = await supabase
        .from('subjects').select('id, name, code, school_id').eq('id', id).single()
      setSubject(subjectData)

      const { data: assessmentRows } = await supabase
        .from('assessments')
        .select('id, title, type, max_score, class_id')
        .eq('subject_id', id)

      // Get school_id from subject (already fetched)
      const schoolId = subjectData?.school_id

      // Fetch ALL classes in this school directly
      const { data: allSchoolClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name')

      const classNameMap: Record<string, string> = Object.fromEntries(
        (allSchoolClasses ?? []).map((c: any) => [c.id, c.name])
      )

      // Classes that have assessments for this subject
      const assessmentClassIds = new Set((assessmentRows ?? []).map((a: any) => a.class_id))
      const classesFromLinks = (allSchoolClasses ?? [])
        .filter((c: any) => assessmentClassIds.has(c.id))
        .map((c: any) => c.name)

      if (!assessmentRows || assessmentRows.length === 0) {
        setAllClasses(classesFromLinks)
        setLoading(false)
        return
      }

      const assessmentIds = assessmentRows.map((a: any) => a.id)
      const { data: marks } = await supabase
        .from('marks')
        .select('score, assessment_id, student_id, students(full_name)')
        .in('assessment_id', assessmentIds)

      const raw: RawMark[] = []
      for (const m of marks ?? []) {
        const assessment = assessmentRows.find((a: any) => a.id === m.assessment_id) as any
        if (!assessment) continue
        raw.push({
          score: m.score,
          assessment_id: m.assessment_id,
          student_id: m.student_id,
          student_name: (m.students as any)?.full_name ?? '—',
          class_name: classNameMap[assessment.class_id] ?? '—',
          max_score: assessment.max_score,
          title: assessment.title,
          type: assessment.type,
        })
      }

      setRawMarks(raw)
      setAllClasses(classesFromLinks)
      setLoading(false)
    }
    load()
  }, [id])

  // All derived data computed from rawMarks filtered by selectedClass
  const filtered = useMemo(() =>
    selectedClass === 'All' ? rawMarks : rawMarks.filter(m => m.class_name === selectedClass),
    [rawMarks, selectedClass]
  )

  const classData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    for (const m of filtered) {
      const pct = (m.score / m.max_score) * 100
      if (!map[m.class_name]) map[m.class_name] = { total: 0, count: 0 }
      map[m.class_name].total += pct
      map[m.class_name].count += 1
    }
    return Object.entries(map).map(([cls, v]) => ({ class: cls, average: Math.round(v.total / v.count) }))
  }, [filtered])

  const assessmentData = useMemo(() => {
    const map: Record<string, { total: number; count: number; max_score: number; title: string; type: string; class_name: string }> = {}
    for (const m of filtered) {
      const pct = (m.score / m.max_score) * 100
      if (!map[m.assessment_id]) map[m.assessment_id] = { total: 0, count: 0, max_score: m.max_score, title: m.title, type: m.type, class_name: m.class_name }
      map[m.assessment_id].total += pct
      map[m.assessment_id].count += 1
    }
    return Object.values(map)
      .map(v => ({ title: v.title, type: v.type, avg: Math.round(v.total / v.count), max_score: v.max_score, class_name: v.class_name }))
      .sort((a, b) => a.class_name.localeCompare(b.class_name))
  }, [filtered])

  const topStudents = useMemo(() => {
    const byClass: Record<string, Record<string, { total: number; count: number; name: string }>> = {}
    for (const m of filtered) {
      const pct = (m.score / m.max_score) * 100
      if (!byClass[m.class_name]) byClass[m.class_name] = {}
      if (!byClass[m.class_name][m.student_id]) byClass[m.class_name][m.student_id] = { total: 0, count: 0, name: m.student_name }
      byClass[m.class_name][m.student_id].total += pct
      byClass[m.class_name][m.student_id].count += 1
    }
    return Object.entries(byClass).map(([className, students]) => ({
      className,
      students: Object.values(students)
        .map(v => ({ name: v.name, avg: Math.round(v.total / v.count) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3),
    }))
  }, [filtered])

  const stats = useMemo(() => {
    if (filtered.length === 0) return { overall: 0, totalAssessments: 0, totalStudents: 0 }
    const total = filtered.reduce((s, m) => s + (m.score / m.max_score) * 100, 0)
    return {
      overall: Math.round(total / filtered.length),
      totalAssessments: new Set(filtered.map(m => m.assessment_id)).size,
      totalStudents: new Set(filtered.map(m => m.student_id)).size,
    }
  }, [filtered])

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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 flex-wrap">
        <div className="bg-indigo-100 text-indigo-600 rounded-xl p-3">
          <BookOpen size={26} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          {subject.code && <p className="text-sm text-gray-400 mt-0.5">Code: {subject.code}</p>}
        </div>

        {/* Class filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium">Class:</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="All">All Classes</option>
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {stats.overall > 0 && (
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-600">{stats.overall}%</p>
            <p className="text-xs text-gray-400 mt-0.5">{selectedClass === 'All' ? 'Overall' : selectedClass} average</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Average" value={stats.overall > 0 ? `${stats.overall}%` : '—'} icon={<BookOpen size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Assessments" value={stats.totalAssessments} icon={<ClipboardList size={20} />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Students" value={stats.totalStudents} icon={<GraduationCap size={20} />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average by class (hidden when a specific class is selected) */}
        {selectedClass === 'All' && (
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
        )}

        {/* Top students */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Top Students {selectedClass === 'All' ? 'per Class' : `· ${selectedClass}`}
          </h2>
          {topStudents.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <div className="space-y-5">
                {topStudents.map(({ className, students }) => (
                  <div key={className}>
                    {selectedClass === 'All' && (
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">{className}</p>
                    )}
                    <div className="space-y-2">
                      {students.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${s.avg}%` }} />
                          </div>
                          <Badge label={`${s.avg}%`} variant={scoreVariant(s.avg)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Assessments */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Assessments ({assessmentData.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Title</th>
              {selectedClass === 'All' && <th className="text-left px-5 py-3 text-gray-500 font-medium">Class</th>}
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Max Score</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assessmentData.length === 0
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No assessments yet.</td></tr>
              : assessmentData.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{a.title}</td>
                  {selectedClass === 'All' && <td className="px-5 py-3 text-gray-500">{a.class_name}</td>}
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

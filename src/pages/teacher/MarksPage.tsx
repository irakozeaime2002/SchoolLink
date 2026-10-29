import { Plus, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import { assessmentTypeLabel, formatAssessmentDate } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

interface Student { id: string; full_name: string }
interface Assessment { id: string; title: string; max_score: number; type: string; date: string; subjectName: string }

export default function MarksPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  // Preselection coming from the Assessments page ("Enter marks")
  const requested = useRef({ classId: searchParams.get('class'), assessmentId: searchParams.get('assessment') })
  const { classes } = useTeacherClasses()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [scores, setScores] = useState<Record<string, string>>({})
  // student_id -> existing marks row id (marks has no unique key on assessment+student)
  const [markIds, setMarkIds] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (classes.length === 0 || selectedClass) return
    const wanted = requested.current.classId
    setSelectedClass(classes.some((c) => c.id === wanted) ? wanted! : classes[0].id)
  }, [classes, selectedClass])

  useEffect(() => {
    if (!selectedClass || !user?.id) return
    supabase.from('assessments').select('id, title, max_score, type, date, subjects(name)')
      .eq('class_id', selectedClass).eq('teacher_id', user.id)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        const list: Assessment[] = (data ?? []).map((a: any) => ({
          id: a.id, title: a.title, max_score: a.max_score, type: a.type, date: a.date, subjectName: a.subjects?.name ?? '',
        }))
        setAssessments(list)
        const wanted = requested.current.assessmentId
        requested.current.assessmentId = null
        setSelectedAssessment(list.some((a) => a.id === wanted) ? wanted! : list[0]?.id ?? '')
      })
    supabase.from('students').select('id, full_name').eq('class_id', selectedClass).order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [selectedClass, user?.id])

  const loadMarks = useCallback(async (assessmentId: string) => {
    const { data } = await supabase.from('marks').select('id, student_id, score').eq('assessment_id', assessmentId)
    const existing: Record<string, string> = {}
    const ids: Record<string, string> = {}
    ;(data ?? []).forEach((m: any) => {
      existing[m.student_id] = String(m.score)
      ids[m.student_id] = m.id
    })
    setScores(existing)
    setMarkIds(ids)
  }, [])

  useEffect(() => {
    setScores({})
    setMarkIds({})
    if (selectedAssessment) loadMarks(selectedAssessment)
  }, [selectedAssessment, loadMarks])

  const assessment = assessments.find((a) => a.id === selectedAssessment)

  async function handleSave() {
    if (!selectedAssessment) return
    setSaving(true)
    setSaveError('')
    const now = new Date().toISOString()
    const entries = Object.entries(scores).filter(([, v]) => v !== '')
    const updates = entries
      .filter(([studentId]) => markIds[studentId])
      .map(([student_id, score]) => ({
        id: markIds[student_id], assessment_id: selectedAssessment, student_id, score: Number(score), updated_at: now,
      }))
    const inserts = entries
      .filter(([studentId]) => !markIds[studentId])
      .map(([student_id, score]) => ({ assessment_id: selectedAssessment, student_id, score: Number(score) }))

    const [updateResult, insertResult] = await Promise.all([
      updates.length ? supabase.from('marks').upsert(updates, { onConflict: 'id' }) : Promise.resolve({ error: null }),
      inserts.length ? supabase.from('marks').insert(inserts) : Promise.resolve({ error: null }),
    ])
    const error = updateResult.error ?? insertResult.error
    // Refresh ids so a second save updates instead of inserting duplicates
    await loadMarks(selectedAssessment)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enter Marks</h1>
          <p className="text-gray-500 text-sm mt-1">
            {assessment
              ? `${assessment.title}${assessment.subjectName ? ` · ${assessment.subjectName}` : ''} · ${formatAssessmentDate(assessment.date)} · Max: ${assessment.max_score}`
              : 'Select a class and assessment'}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || !selectedAssessment}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
          <Save size={16} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Marks'}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {classes.length === 0 && <option>No classes assigned</option>}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {assessments.length === 0 && <option value="">No assessments yet</option>}
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}{a.subjectName ? ` · ${a.subjectName}` : ''} ({assessmentTypeLabel(a.type)})
            </option>
          ))}
        </select>
        <Link to="/teacher/assessments"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors">
          <Plus size={16} /> New assessment
        </Link>
      </div>

      {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Student</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Score / {assessment?.max_score ?? '—'}</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No students in this class.</td></tr>
              : students.map((s, i) => {
                  const pct = scores[s.id] && assessment ? Math.round((Number(scores[s.id]) / assessment.max_score) * 100) : null
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                      <td className="px-5 py-3">
                        <input type="number" min={0} max={assessment?.max_score ?? 100}
                          value={scores[s.id] ?? ''}
                          onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="—" />
                      </td>
                      <td className="px-5 py-3 text-gray-500">{pct !== null ? `${pct}%` : '—'}</td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

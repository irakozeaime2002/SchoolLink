import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Student { id: string; full_name: string }
interface Assessment { id: string; title: string; max_score: number; type: string }
interface ClassOption { id: string; name: string }

export default function MarksPage() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [scores, setScores] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('classes').select('id, name').eq('teacher_id', user.id).then(({ data }) => {
      setClasses(data ?? [])
      if (data && data.length > 0) setSelectedClass(data[0].id)
    })
  }, [user])

  useEffect(() => {
    if (!selectedClass || !user?.id) return
    supabase.from('assessments').select('id, title, max_score, type').eq('class_id', selectedClass).eq('teacher_id', user.id)
      .then(({ data }) => {
        setAssessments(data ?? [])
        if (data && data.length > 0) setSelectedAssessment(data[0].id)
        else setSelectedAssessment('')
      })
    supabase.from('students').select('id, full_name').eq('class_id', selectedClass).order('full_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [selectedClass])

  useEffect(() => {
    if (!selectedAssessment) return
    supabase.from('marks').select('student_id, score').eq('assessment_id', selectedAssessment)
      .then(({ data }) => {
        const existing: Record<string, string> = {}
        ;(data ?? []).forEach((m: any) => { existing[m.student_id] = String(m.score) })
        setScores(existing)
      })
  }, [selectedAssessment])

  const assessment = assessments.find((a) => a.id === selectedAssessment)

  async function handleSave() {
    if (!selectedAssessment) return
    setSaving(true)
    const upserts = Object.entries(scores)
      .filter(([, v]) => v !== '')
      .map(([student_id, score]) => ({ assessment_id: selectedAssessment, student_id, score: Number(score) }))
    await supabase.from('marks').upsert(upserts, { onConflict: 'assessment_id,student_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enter Marks</h1>
          <p className="text-gray-500 text-sm mt-1">
            {assessment ? `${assessment.title} · Max: ${assessment.max_score}` : 'Select a class and assessment'}
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
          {assessments.length === 0 && <option>No assessments yet</option>}
          {assessments.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)}
        </select>
      </div>

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

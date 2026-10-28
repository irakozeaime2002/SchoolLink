import { BookOpen, CalendarClock, CheckCircle, FileText, MessageSquareText, Plus, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Intervention {
  id: string
  problem: string
  action: string
  responsible: string
  review_date: string | null
  status: 'open' | 'in_progress' | 'resolved'
  score_before: number | null
  score_after: number | null
  created_at: string
}

const statusClasses: Record<Intervention['status'], string> = {
  open: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const statusLabels: Record<Intervention['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export default function ParentInterventionPage() {
  const { user } = useAuth()
  const [child, setChild] = useState<any>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
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
        .select('id, full_name, classes(name)')
        .eq('id', link.student_id)
        .single()
      setChild(studentData)

      const { data } = await supabase
        .from('interventions')
        .select('*')
        .eq('student_id', link.student_id)
        .order('created_at', { ascending: false })

      setInterventions((data ?? []) as Intervention[])
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support & Interventions</h1>
        <p className="text-gray-500 text-sm mt-1">
          {child ? `${child.full_name} · ${child.classes?.name ?? 'Class'}` : 'Your child’s support plan'}
        </p>
      </div>

      {!child && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child is linked to your account yet.
        </div>
      )}

      {child && interventions.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No support plans have been created for {child.full_name} yet.
        </div>
      )}

      {interventions.length > 0 && (
        <div className="space-y-4">
          {interventions.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mt-0.5">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{item.problem}</h3>
                    <p className="text-sm text-gray-600 mt-2">Action: {item.action}</p>
                    <p className="text-xs text-gray-400 mt-2">Responsible: {item.responsible}</p>
                  </div>
                </div>

                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[item.status]}`}>
                  {statusLabels[item.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                {item.review_date && (
                  <span className="inline-flex items-center gap-1.5"><CalendarClock size={12} /> Review: {item.review_date}</span>
                )}
                {item.score_before !== null && item.score_before !== undefined && (
                  <span className="inline-flex items-center gap-1.5"><BookOpen size={12} /> Before: {item.score_before}%</span>
                )}
                {item.score_after !== null && item.score_after !== undefined && (
                  <span className="inline-flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> After: {item.score_after}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



















































































































import { CalendarClock, CheckCircle, FileText, MessageSquareText, Plus, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Intervention {
  id: string
  problem: string
  action: string
  responsible: string
  review_date: string | null
  status: 'open' | 'in_progress' | 'resolved'
  score_before: number | null
  score_after: number | null
  created_at: string
}

const statusClasses: Record<Intervention['status'], string> = {
  open: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const statusLabels: Record<Intervention['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export default function TeacherStudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [student, setStudent] = useState<any>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ problem: '', action: '', responsible: '', reviewDate: '', scoreBefore: '' })
  const [loading, setLoading] = useState(true)

  async function loadInterventions() {
    const { data } = await supabase.from('interventions').select('*').eq('student_id', id).order('created_at', { ascending: false })
    setInterventions(data ?? [])
  }

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: s } = await supabase.from('students').select('*, classes(name)').eq('id', id).single()
      setStudent(s)

      const { data: teacherAssessments } = await supabase
        .from('assessments')
        .select('id, title, max_score, type, subject_id, subjects(name)')
        .eq('teacher_id', user?.id)

      const assessmentIds = (teacherAssessments ?? []).map((a: any) => a.id)
      const assessmentMap = Object.fromEntries((teacherAssessments ?? []).map((a: any) => [a.id, a]))

      const { data: marksData } = assessmentIds.length
        ? await supabase.from('marks').select('score, assessment_id').eq('student_id', id).in('assessment_id', assessmentIds)
        : { data: [] }

      setAssessments((marksData ?? []).map((m: any) => ({
        score: m.score,
        assessments: assessmentMap[m.assessment_id],
      })))

      await loadInterventions()
      setLoading(false)
    }
    load()
  }, [id])

  async function handleAdd() {
    if (!form.problem.trim() || !form.action.trim()) return
    await supabase.from('interventions').insert({
      school_id: user!.school_id,
      student_id: id,
      teacher_id: user!.id,
      problem: form.problem,
      action: form.action,
      responsible: form.responsible,
      review_date: form.reviewDate || null,
      status: 'open',
      score_before: form.scoreBefore ? Number(form.scoreBefore) : null,
    })
    setForm({ problem: '', action: '', responsible: '', reviewDate: '', scoreBefore: '' })
    setOpen(false)
    loadInterventions()
  }

  async function cycleStatus(intId: string, current: string) {
    const next: Record<string, string> = { open: 'in_progress', in_progress: 'resolved', resolved: 'open' }
    await supabase.from('interventions').update({ status: next[current] }).eq('id', intId)
    loadInterventions()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!student) return <div className="text-center py-20 text-gray-400">Student not found.</div>

  const trendData = assessments.map((m: any) => ({
    label: m.assessments?.title ?? '—',
    score: Math.round((m.score / m.assessments?.max_score) * 100),
  }))

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <Plus size={16} /> Back
      </button>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h1 className="text-xl font-bold text-gray-900">{student.full_name}</h1>
        <p className="text-sm text-gray-500 mt-1">{student.classes?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Assessment Scores</h2>
          {assessments.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">No marks recorded yet.</p>
            : <div className="space-y-2">
                {assessments.map((m: any, i: number) => {
                  const pct = Math.round((m.score / m.assessments?.max_score) * 100)
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-700">{m.assessments?.title}</span>
                        <span className="text-gray-400 text-xs ml-2">({m.assessments?.subjects?.name})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{m.score}/{m.assessments?.max_score}</span>
                        <Badge label={`${pct}%`} variant={pct >= 75 ? 'green' : pct >= 60 ? 'yellow' : 'red'} />
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Score Trend</h2>
          {trendData.length < 2
            ? <p className="text-sm text-gray-400 text-center py-6">Not enough data for a trend yet.</p>
            : <div className="h-52"><svg viewBox="0 0 300 180" className="w-full h-full"><polyline fill="none" stroke="#6366f1" strokeWidth="3" points="" /></svg></div>
          }
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Intervention Tracking</h2>
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Add Intervention
          </button>
        </div>

        {interventions.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">No interventions recorded yet.</p>
          : <div className="space-y-3">
              {interventions.map((iv) => (
                <div key={iv.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{iv.problem}</p>
                      <p className="text-sm text-gray-500 mt-1">Action: {iv.action}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        <span>Responsible: {iv.responsible}</span>
                        {iv.review_date && <span>Review: {iv.review_date}</span>}
                        {iv.score_before !== undefined && iv.score_before !== null && (
                          <span>
                            Before: <strong>{iv.score_before}%</strong>
                            {iv.score_after !== undefined && iv.score_after !== null && (
                              <> → After: <strong className="text-green-600">{iv.score_after}%</strong></>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => cycleStatus(iv.id, iv.status)} className="flex items-center gap-1.5 shrink-0" title="Click to advance status">
                      {iv.status === 'resolved' ? <CheckCircle size={16} className="text-green-500" /> : <CheckCircle size={16} className="text-gray-300" />}
                      <Badge label={statusLabels[iv.status]} variant={iv.status === 'resolved' ? 'green' : iv.status === 'in_progress' ? 'blue' : 'yellow'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Intervention</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problem identified</label>
                <input type="text" value={form.problem} onChange={(e) => setForm((p) => ({ ...p, problem: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Electricity scores declining" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action plan</label>
                <textarea rows={3} value={form.action} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe the support action…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsible</label>
                  <input type="text" value={form.responsible} onChange={(e) => setForm((p) => ({ ...p, responsible: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Teacher name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Review date</label>
                  <input type="date" value={form.reviewDate} onChange={(e) => setForm((p) => ({ ...p, reviewDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score before intervention (%)</label>
                <input type="number" min={0} max={100} value={form.scoreBefore} onChange={(e) => setForm((p) => ({ ...p, scoreBefore: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 54" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { ArrowLeft, CheckCircle, Circle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Intervention {
  id: string; problem: string; action: string; responsible: string
  review_date: string; status: 'open' | 'in_progress' | 'resolved'
  score_before?: number; score_after?: number
}

const statusVariant: Record<string, 'yellow' | 'blue' | 'green'> = {
  open: 'yellow', in_progress: 'blue', resolved: 'green',
}
const statusLabel: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
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

      const { data: marks } = await supabase
        .from('marks')
        .select('score, assessments(title, max_score, type, subjects(name))')
        .eq('student_id', id)
        .eq('assessments.teacher_id', user?.id)
      setAssessments(marks ?? [])

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
        <ArrowLeft size={16} /> Back
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
            : <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
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
                      {iv.status === 'resolved' ? <CheckCircle size={16} className="text-green-500" /> : <Circle size={16} className="text-gray-300" />}
                      <Badge label={statusLabel[iv.status]} variant={statusVariant[iv.status]} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {open && (
        <Modal title="Add Intervention" onClose={() => setOpen(false)}>
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
        </Modal>
      )}
    </div>
  )
}

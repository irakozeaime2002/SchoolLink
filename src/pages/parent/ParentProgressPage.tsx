import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Badge from '../../components/ui/Badge'
import { useChild } from '../../context/ChildContext'
import { supabase } from '../../lib/supabase'

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red'
}

export default function ParentProgressPage() {
  const { activeChild, children, setActiveChild, loading: childLoading } = useChild()
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeChild) return
    setSubjects([])
    setLoading(true)
    async function load() {
      const { data: marksData } = await supabase.from('marks').select('score, assessment_id').eq('student_id', activeChild!.student_id)
      if (marksData && marksData.length > 0) {
        const aIds = marksData.map((m: any) => m.assessment_id)
        const { data: assessments } = await supabase.from('assessments').select('id, title, max_score, subjects(name)').in('id', aIds)
        const aMap = Object.fromEntries((assessments ?? []).map((a: any) => [a.id, a]))
        const bySubject: Record<string, { assessments: any[]; total: number; count: number }> = {}
        marksData.forEach((m: any) => {
          const a = aMap[m.assessment_id]
          const name = (a?.subjects as any)?.name
          if (!name) return
          if (!bySubject[name]) bySubject[name] = { assessments: [], total: 0, count: 0 }
          const pct = Math.round((m.score / a.max_score) * 100)
          bySubject[name].assessments.push({ title: a.title, score: m.score, max: a.max_score, pct })
          bySubject[name].total += pct
          bySubject[name].count += 1
        })
        setSubjects(Object.entries(bySubject).map(([name, v]) => ({ name, average: Math.round(v.total / v.count), assessments: v.assessments })))
      } else {
        setSubjects([])
      }
      setLoading(false)
    }
    load()
  }, [activeChild])

  if (childLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activeChild ? `${activeChild.full_name}'s Progress` : 'Progress'}</h1>
          <p className="text-gray-500 text-sm mt-1">{activeChild?.class_name ?? '—'}</p>
        </div>
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button key={c.student_id} onClick={() => setActiveChild(c)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  activeChild?.student_id === c.student_id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {c.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && subjects.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No marks have been recorded yet.
        </div>
      )}

      <div className="space-y-5">
        {subjects.map((s) => (
          <div key={s.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">{s.name}</h2>
              <Badge label={`${s.average}%`} variant={scoreVariant(s.average)} />
            </div>
            <div className="space-y-2">
              {s.assessments.map((a: any) => (
                <div key={a.title} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{a.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{a.score}/{a.max}</span>
                    <Badge label={`${a.pct}%`} variant={scoreVariant(a.pct)} />
                  </div>
                </div>
              ))}
            </div>
            {s.assessments.length > 1 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Trend</p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={s.assessments.map((a: any) => ({ name: a.title, score: a.pct }))} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

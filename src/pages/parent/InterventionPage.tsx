import { BookOpen, CalendarClock, CheckCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useChild } from '../../context/ChildContext'
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
  const { activeChild, children, setActiveChild, loading: childLoading } = useChild()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeChild) return
    setLoading(true)
    supabase.from('interventions').select('*')
      .eq('student_id', activeChild.student_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInterventions((data ?? []) as Intervention[]); setLoading(false) })
  }, [activeChild])

  if (childLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support & Interventions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeChild ? `${activeChild.full_name} · ${activeChild.class_name}` : "Your child's support plan"}
          </p>
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

      {!activeChild && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child is linked to your account yet.
        </div>
      )}

      {!loading && activeChild && interventions.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No support plans have been created for {activeChild.full_name} yet.
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

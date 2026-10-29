import { CalendarClock, ClipboardCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Badge, { type BadgeVariant } from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { assessmentTypeLabel, assessmentTypeVariant, formatAssessmentDate, todayISO } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

interface ChildOption { id: string; full_name: string; class_id: string; class_name: string }

interface ChildAssessment {
  id: string
  title: string
  type: string
  date: string
  max_score: number
  subjectName: string
  score: number | null
}

function scoreVariant(pct: number): BadgeVariant {
  return pct >= 75 ? 'green' : pct >= 60 ? 'yellow' : 'red'
}

export default function ParentAssessmentsPage() {
  const { user } = useAuth()
  const userId = user?.id
  const [children, setChildren] = useState<ChildOption[]>([])
  const [childId, setChildId] = useState('')
  const [items, setItems] = useState<ChildAssessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function loadChildren() {
      const { data: links } = await supabase.from('parent_students').select('student_id').eq('parent_id', userId!)
      const ids = (links ?? []).map((l: any) => l.student_id)
      if (ids.length === 0) { setLoading(false); return }
      const { data } = await supabase.from('students').select('id, full_name, class_id, classes(name)').in('id', ids)
      const list: ChildOption[] = (data ?? []).map((s: any) => ({
        id: s.id, full_name: s.full_name, class_id: s.class_id, class_name: s.classes?.name ?? '—',
      }))
      setChildren(list)
      setChildId(list[0]?.id ?? '')
      if (list.length === 0) setLoading(false)
    }
    loadChildren()
  }, [userId])

  const child = children.find((c) => c.id === childId)

  useEffect(() => {
    if (!child) return
    let cancelled = false
    async function loadAssessments() {
      setLoading(true)
      const [{ data: assessments }, { data: marks }] = await Promise.all([
        supabase.from('assessments').select('id, title, type, date, max_score, subjects(name)')
          .eq('class_id', child!.class_id).order('date', { ascending: false }),
        supabase.from('marks').select('assessment_id, score').eq('student_id', child!.id),
      ])
      if (cancelled) return
      const scoreById = Object.fromEntries((marks ?? []).map((m: any) => [m.assessment_id, Number(m.score)]))
      setItems((assessments ?? []).map((a: any) => ({
        id: a.id, title: a.title, type: a.type, date: a.date, max_score: Number(a.max_score),
        subjectName: a.subjects?.name ?? '—', score: scoreById[a.id] ?? null,
      })))
      setLoading(false)
    }
    loadAssessments()
    return () => { cancelled = true }
  }, [child])

  const { upcoming, past } = useMemo(() => {
    const today = todayISO()
    return {
      upcoming: items.filter((i) => i.date > today && i.score === null).sort((a, b) => a.date.localeCompare(b.date)),
      past: items.filter((i) => i.date <= today || i.score !== null),
    }
  }, [items])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {child ? `${child.full_name} · ${child.class_name}` : 'Quizzes, tests and assignments for your child'}
          </p>
        </div>
        {children.length > 1 && (
          <select
            aria-label="Choose child"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      {!loading && children.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child linked to your account yet. Please contact the school.
        </div>
      )}

      {loading && children.length > 0 && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && child && (
        <>
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No upcoming assessments.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><CalendarClock size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.subjectName} · Out of {a.max_score}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge label={assessmentTypeLabel(a.type)} variant={assessmentTypeVariant(a.type)} />
                      <span className="text-sm text-gray-600 whitespace-nowrap">{formatAssessmentDate(a.date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <h2 className="text-base font-semibold text-gray-800 px-5 pt-5 pb-3">Results</h2>
            {past.length === 0 ? (
              <div className="px-5 pb-8 pt-2 text-center">
                <ClipboardCheck size={28} className="mx-auto text-gray-300" />
                <p className="text-sm text-gray-400 mt-2">No assessments have taken place yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Assessment</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {past.map((a) => {
                    const pct = a.score !== null && a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : null
                    return (
                      <tr key={a.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.subjectName}</p>
                        </td>
                        <td className="px-5 py-3">
                          <Badge label={assessmentTypeLabel(a.type)} variant={assessmentTypeVariant(a.type)} />
                        </td>
                        <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatAssessmentDate(a.date)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {pct === null ? (
                            <span className="text-xs text-gray-400">Not marked yet</span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-gray-700">{a.score}/{a.max_score}</span>
                              <Badge label={`${pct}%`} variant={scoreVariant(pct)} />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}

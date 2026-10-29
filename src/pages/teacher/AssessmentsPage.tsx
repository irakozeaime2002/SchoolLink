import { CheckCircle2, ClipboardCheck, PenLine, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import AssessmentForm, { type CreatedAssessment, type TermOption } from '../../components/assessments/AssessmentForm'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import {
  ASSESSMENT_TYPES,
  assessmentTypeLabel,
  assessmentTypeVariant,
  formatAssessmentDate,
  type AssessmentType,
} from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

interface AssessmentRow {
  id: string
  title: string
  type: AssessmentType
  max_score: number
  date: string
  class_id: string
  className: string
  subjectName: string
  markedCount: number
}

const marksLink = (classId: string, assessmentId: string) =>
  `/teacher/marks?class=${classId}&assessment=${assessmentId}`

export default function TeacherAssessmentsPage() {
  const { user } = useAuth()
  const userId = user?.id
  const schoolId = user?.school_id
  const { classes, loading: classesLoading } = useTeacherClasses()

  const [rows, setRows] = useState<AssessmentRow[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])
  const [classSizes, setClassSizes] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [justCreated, setJustCreated] = useState<CreatedAssessment | null>(null)
  const [classFilter, setClassFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<AssessmentType | 'all'>('all')

  const loadAssessments = useCallback(async () => {
    if (!userId) return
    const { data, error: loadError } = await supabase
      .from('assessments')
      .select('id, title, type, max_score, date, class_id, classes(name), subjects(name), marks(count)')
      .eq('teacher_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (loadError) setError(loadError.message)
    setRows(
      (data ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        max_score: a.max_score,
        date: a.date,
        class_id: a.class_id,
        className: a.classes?.name ?? '—',
        subjectName: a.subjects?.name ?? '—',
        markedCount: a.marks?.[0]?.count ?? 0,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadAssessments()
  }, [loadAssessments])

  // Terms of the school, most recent first
  useEffect(() => {
    if (!schoolId) return
    supabase
      .from('terms')
      .select('id, name, is_current, start_date, end_date, academic_years!inner(school_id, is_current)')
      .eq('academic_years.school_id', schoolId)
      .eq('academic_years.is_current', true)
      .order('start_date')
      .then(({ data }) =>
        setTerms(
          (data ?? []).map((t: any) => ({
            id: t.id, name: t.name, is_current: !!t.is_current, start_date: t.start_date, end_date: t.end_date,
          })),
        ),
      )
  }, [schoolId])

  // Active students per class, for the "marked" progress column
  useEffect(() => {
    if (classes.length === 0) return
    supabase
      .from('students')
      .select('class_id')
      .in('class_id', classes.map((c) => c.id))
      .eq('status', 'active')
      .then(({ data }) => {
        const sizes: Record<string, number> = {}
        ;(data ?? []).forEach((s: any) => { sizes[s.class_id] = (sizes[s.class_id] ?? 0) + 1 })
        setClassSizes(sizes)
      })
  }, [classes])

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (classFilter === 'all' || r.class_id === classFilter) && (typeFilter === 'all' || r.type === typeFilter),
      ),
    [rows, classFilter, typeFilter],
  )

  async function handleCreated(created: CreatedAssessment) {
    setShowForm(false)
    setJustCreated(created)
    await loadAssessments()
  }

  async function handleDelete(row: AssessmentRow) {
    const warning = row.markedCount > 0 ? ` The ${row.markedCount} mark(s) entered for it will also be deleted.` : ''
    if (!window.confirm(`Delete "${row.title}"?${warning}`)) return
    // marks.assessment_id has no ON DELETE CASCADE, so remove the marks first
    const { error: marksError } = await supabase.from('marks').delete().eq('assessment_id', row.id)
    const { error: deleteError } = marksError
      ? { error: marksError }
      : await supabase.from('assessments').delete().eq('id', row.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    if (justCreated?.id === row.id) setJustCreated(null)
    setRows((current) => current.filter((r) => r.id !== row.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-500 text-sm mt-1">Create quizzes, tests and assignments, then enter marks for them.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={classesLoading || classes.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          New Assessment
        </button>
      </div>

      {!classesLoading && classes.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No classes assigned yet. Ask your headteacher to assign you to a class before creating assessments.
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss error" className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {justCreated && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 size={16} />
            <span><span className="font-medium">{justCreated.title}</span> was created and is now available in Marks.</span>
          </p>
          <div className="flex items-center gap-2">
            <Link
              to={marksLink(justCreated.class_id, justCreated.id)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <PenLine size={14} /> Enter marks
            </Link>
            <button onClick={() => setJustCreated(null)} aria-label="Dismiss" className="text-emerald-500 hover:text-emerald-700 p-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <label className="sr-only" htmlFor="assessment-class-filter">Filter by class</label>
        <select
          id="assessment-class-filter"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
          {[{ value: 'all' as const, label: 'All' }, ...ASSESSMENT_TYPES].map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              aria-pressed={typeFilter === t.value}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                typeFilter === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Assessment</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Max</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Marked</th>
              <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <ClipboardCheck size={28} className="mx-auto text-gray-300" />
                  <p className="text-gray-500 mt-2">
                    {rows.length === 0 ? 'No assessments yet.' : 'No assessments match these filters.'}
                  </p>
                  {rows.length === 0 && classes.length > 0 && (
                    <button onClick={() => setShowForm(true)} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-1">
                      Create your first assessment
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const total = classSizes[r.class_id] ?? 0
                const pct = total > 0 ? Math.min(100, Math.round((r.markedCount / total) * 100)) : 0
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.subjectName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={assessmentTypeLabel(r.type)} variant={assessmentTypeVariant(r.type)} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r.className}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatAssessmentDate(r.date)}</td>
                    <td className="px-5 py-3 text-gray-600">{r.max_score}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={clsx('h-1.5 rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{r.markedCount}/{total || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={marksLink(r.class_id, r.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <PenLine size={14} /> Enter marks
                        </Link>
                        <button
                          onClick={() => handleDelete(r)}
                          aria-label={`Delete ${r.title}`}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Assessment" onClose={() => setShowForm(false)}>
          <AssessmentForm
            classes={classes}
            terms={terms}
            defaultClassId={classFilter !== 'all' ? classFilter : undefined}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}

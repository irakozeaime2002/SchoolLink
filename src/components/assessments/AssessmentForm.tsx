import { useEffect, useId, useState } from 'react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import type { TeacherClass } from '../../hooks/useTeacherClasses'
import { ASSESSMENT_TYPES, todayISO, type AssessmentType } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

export interface TermOption {
  id: string
  name: string
  is_current: boolean
  start_date: string
  end_date: string
}

/** The term whose dates include `date`, if any. */
function termForDate(terms: TermOption[], date: string) {
  return terms.find((t) => t.start_date <= date && date <= t.end_date)
}

export interface CreatedAssessment {
  id: string
  title: string
  class_id: string
}

interface AssessmentFormProps {
  classes: TeacherClass[]
  terms: TermOption[]
  defaultClassId?: string
  onCreated: (assessment: CreatedAssessment) => void
  onCancel: () => void
}

type FieldErrors = Partial<Record<'title' | 'classId' | 'subjectId' | 'termId' | 'date' | 'maxScore', string>>

export default function AssessmentForm({ classes, terms, defaultClassId, onCreated, onCancel }: AssessmentFormProps) {
  const { user } = useAuth()
  const id = useId()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AssessmentType>('test')
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? '')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [termId, setTermId] = useState(
    () => (termForDate(terms, todayISO()) ?? terms.find((t) => t.is_current) ?? terms[0])?.id ?? '',
  )

  function handleDateChange(value: string) {
    setDate(value)
    const match = value ? termForDate(terms, value) : undefined
    if (match) setTermId(match.id)
  }
  const [maxScore, setMaxScore] = useState('100')
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Subjects this teacher can assess in the selected class
  useEffect(() => {
    if (!classId || !user) return
    let cancelled = false
    const selectedClass = classes.find((c) => c.id === classId)

    async function loadSubjects() {
      setSubjectsLoading(true)
      const { data } = await supabase
        .from('class_subjects')
        .select('teacher_id, subjects(id, name)')
        .eq('class_id', classId)

      let list = (data ?? [])
        .filter((row: any) => selectedClass?.isClassTeacher || row.teacher_id === user!.id)
        .map((row: any) => row.subjects)
        .filter(Boolean) as { id: string; name: string }[]

      // No subjects mapped to the class yet: fall back to the school's subject list
      if (list.length === 0 && user!.school_id) {
        const { data: schoolSubjects } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('school_id', user!.school_id)
          .order('name')
        list = schoolSubjects ?? []
      }

      if (cancelled) return
      list.sort((a, b) => a.name.localeCompare(b.name))
      setSubjects(list)
      setSubjectId((current) => (list.some((s) => s.id === current) ? current : list[0]?.id ?? ''))
      setSubjectsLoading(false)
    }

    loadSubjects()
    return () => {
      cancelled = true
    }
  }, [classId, classes, user])

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!title.trim()) next.title = 'Enter a title.'
    if (!classId) next.classId = 'Choose a class.'
    if (!subjectId) next.subjectId = 'Choose a subject.'
    if (!termId) next.termId = 'Choose a term.'
    if (!date) next.date = 'Choose a date.'
    const max = Number(maxScore)
    if (!maxScore || Number.isNaN(max) || max <= 0) next.maxScore = 'Enter a score greater than 0.'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!user?.school_id) {
      setSubmitError('Your account is not linked to a school.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        school_id: user.school_id,
        class_id: classId,
        subject_id: subjectId,
        term_id: termId,
        teacher_id: user.id,
        title: title.trim(),
        type,
        max_score: Number(maxScore),
        date,
      })
      .select('id, title, class_id')
      .single()
    setSubmitting(false)

    if (error || !data) {
      setSubmitError(error?.message ?? 'Could not save the assessment.')
      return
    }
    onCreated(data)
  }

  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className="text-xs text-red-600 mt-1">
        {errors[key]}
      </p>
    ) : null

  const describedBy = (key: keyof FieldErrors) => (errors[key] ? `${id}-${key}-error` : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>}

      <div>
        <label htmlFor={`${id}-title`} className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          id={`${id}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => !title.trim() && setErrors((p) => ({ ...p, title: 'Enter a title.' }))}
          aria-invalid={!!errors.title}
          aria-describedby={describedBy('title')}
          className="input"
          placeholder="Chapter 4 quiz: quadratic equations"
          autoFocus
        />
        {fieldError('title')}
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-1.5">Type</legend>
        <div className="flex flex-wrap gap-2">
          {ASSESSMENT_TYPES.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-type`}
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  'inline-block px-3 py-1.5 rounded-lg border text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300',
                  type === t.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300',
                )}
              >
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${id}-class`} className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select
            id={`${id}-class`}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-invalid={!!errors.classId}
            aria-describedby={describedBy('classId')}
            className="input"
          >
            {classes.length === 0 && <option value="">No classes assigned</option>}
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {fieldError('classId')}
        </div>

        <div>
          <label htmlFor={`${id}-subject`} className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            id={`${id}-subject`}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjectsLoading}
            aria-invalid={!!errors.subjectId}
            aria-describedby={describedBy('subjectId')}
            className="input disabled:bg-gray-50"
          >
            {subjectsLoading && <option value="">Loading…</option>}
            {!subjectsLoading && subjects.length === 0 && <option value="">No subjects found</option>}
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {fieldError('subjectId')}
        </div>

        <div>
          <label htmlFor={`${id}-term`} className="block text-sm font-medium text-gray-700 mb-1">Term</label>
          <select
            id={`${id}-term`}
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            aria-invalid={!!errors.termId}
            aria-describedby={describedBy('termId')}
            className="input"
          >
            {terms.length === 0 && <option value="">No term dates set in School Settings</option>}
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (current)' : ''}</option>
            ))}
          </select>
          {fieldError('termId')}
        </div>

        <div>
          <label htmlFor={`${id}-date`} className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy('date')}
            className="input"
          />
          {fieldError('date')}
        </div>

        <div>
          <label htmlFor={`${id}-max`} className="block text-sm font-medium text-gray-700 mb-1">Max score</label>
          <input
            id={`${id}-max`}
            type="number"
            min={1}
            inputMode="decimal"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            aria-invalid={!!errors.maxScore}
            aria-describedby={describedBy('maxScore')}
            className="input"
          />
          {fieldError('maxScore')}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create Assessment'}
        </button>
      </div>
    </form>
  )
}

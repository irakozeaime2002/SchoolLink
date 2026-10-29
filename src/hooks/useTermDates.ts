import { useCallback, useEffect, useState } from 'react'
import { todayISO } from '../lib/assessments'
import { supabase } from '../lib/supabase'

export const TERM_NAMES = ['Term 1', 'Term 2', 'Term 3'] as const

export interface TermDraft {
  /** Existing term row id, undefined until first saved. */
  id?: string
  name: string
  start_date: string
  end_date: string
}

export interface CurrentYear {
  id: string
  name: string
}

const emptyTerms = (): TermDraft[] => TERM_NAMES.map((name) => ({ name, start_date: '', end_date: '' }))

/** Loads and saves Term 1–3 dates for the school's current academic year. */
export function useTermDates(schoolId: string | null | undefined) {
  const [year, setYear] = useState<CurrentYear | null>(null)
  const [terms, setTerms] = useState<TermDraft[]>(emptyTerms)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!schoolId) return
    const { data: current } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .maybeSingle()

    setYear(current ?? null)
    if (!current) {
      setTerms(emptyTerms())
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('terms')
      .select('id, name, start_date, end_date')
      .eq('academic_year_id', current.id)
      .order('start_date')

    const existing = data ?? []
    setTerms(
      TERM_NAMES.map((name, i) => {
        // Match by name first, fall back to chronological order
        const row = existing.find((t) => t.name.trim().toLowerCase() === name.toLowerCase()) ?? existing[i]
        return row ? { id: row.id, name, start_date: row.start_date, end_date: row.end_date } : { name, start_date: '', end_date: '' }
      }),
    )
    setLoading(false)
  }, [schoolId])

  useEffect(() => {
    load()
  }, [load])

  function updateTerm(index: number, field: 'start_date' | 'end_date', value: string) {
    setTerms((current) => current.map((t, i) => (i === index ? { ...t, [field]: value } : t)))
  }

  /** Returns an error message per term index (empty object when valid). */
  function validate(): Record<number, string> {
    const errors: Record<number, string> = {}
    let previousEnd = ''
    terms.forEach((t, i) => {
      const filled = t.start_date || t.end_date
      if (!filled) {
        if (t.id) errors[i] = 'This term is already in use. Enter both dates.'
        return
      }
      if (!t.start_date || !t.end_date) errors[i] = 'Enter both a start and an end date.'
      else if (t.end_date <= t.start_date) errors[i] = 'End date must be after the start date.'
      else if (previousEnd && t.start_date <= previousEnd) errors[i] = `Must start after ${TERM_NAMES[i - 1]} ends.`
      if (t.end_date) previousEnd = t.end_date
    })
    return errors
  }

  async function save(): Promise<string | null> {
    if (!year) return null
    const today = todayISO()
    const filled = terms.filter((t) => t.start_date && t.end_date)

    for (const t of filled) {
      const values = {
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        is_current: t.start_date <= today && today <= t.end_date,
      }
      const { error } = t.id
        ? await supabase.from('terms').update(values).eq('id', t.id)
        : await supabase.from('terms').insert({ ...values, academic_year_id: year.id })
      if (error) return error.message
    }
    await load()
    return null
  }

  return { year, terms, loading, updateTerm, validate, save }
}

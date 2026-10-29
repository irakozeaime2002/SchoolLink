import { Link } from 'react-router-dom'
import type { CurrentYear, TermDraft } from '../../hooks/useTermDates'
import { todayISO } from '../../lib/assessments'

interface TermDatesFieldsProps {
  year: CurrentYear | null
  terms: TermDraft[]
  errors: Record<number, string>
  onChange: (index: number, field: 'start_date' | 'end_date', value: string) => void
}

export default function TermDatesFields({ year, terms, errors, onChange }: TermDatesFieldsProps) {
  if (!year) {
    return (
      <p className="text-sm text-gray-500">
        No current academic year.{' '}
        <Link to="/headteacher/academic-years" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Set one in Academic Years
        </Link>{' '}
        to add term dates.
      </p>
    )
  }

  const today = todayISO()

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Academic year {year.name}</p>
      {terms.map((t, i) => {
        const isCurrent = !!t.start_date && !!t.end_date && t.start_date <= today && today <= t.end_date
        const errorId = `term-${i}-error`
        return (
          <div key={t.name}>
            <div className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-3">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                {t.name}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Current term" />}
              </span>
              <input
                type="date"
                aria-label={`${t.name} start date`}
                aria-invalid={!!errors[i]}
                aria-describedby={errors[i] ? errorId : undefined}
                className="input"
                value={t.start_date}
                onChange={(e) => onChange(i, 'start_date', e.target.value)}
              />
              <input
                type="date"
                aria-label={`${t.name} end date`}
                aria-invalid={!!errors[i]}
                aria-describedby={errors[i] ? errorId : undefined}
                className="input"
                min={t.start_date || undefined}
                value={t.end_date}
                onChange={(e) => onChange(i, 'end_date', e.target.value)}
              />
            </div>
            {errors[i] && <p id={errorId} className="text-xs text-red-600 mt-1 pl-[6.25rem]">{errors[i]}</p>}
          </div>
        )
      })}
      <p className="text-xs text-gray-400">The term that includes today's date is marked as the current term.</p>
    </div>
  )
}

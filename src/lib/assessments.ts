import type { BadgeVariant } from '../components/ui/Badge'
import type { Assessment } from '../types'

export type AssessmentType = Assessment['type']

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string; variant: BadgeVariant }[] = [
  { value: 'quiz', label: 'Quiz', variant: 'blue' },
  { value: 'assignment', label: 'Assignment', variant: 'gray' },
  { value: 'test', label: 'Test', variant: 'yellow' },
  { value: 'exam', label: 'Exam', variant: 'red' },
  { value: 'project', label: 'Project', variant: 'green' },
  { value: 'practical', label: 'Practical', variant: 'blue' },
]

const TYPE_LOOKUP = Object.fromEntries(ASSESSMENT_TYPES.map((t) => [t.value, t])) as Record<
  AssessmentType,
  (typeof ASSESSMENT_TYPES)[number]
>

export function assessmentTypeLabel(type: string): string {
  return TYPE_LOOKUP[type as AssessmentType]?.label ?? type
}

export function assessmentTypeVariant(type: string): BadgeVariant {
  return TYPE_LOOKUP[type as AssessmentType]?.variant ?? 'gray'
}

/** Today's date as YYYY-MM-DD in local time (suitable for <input type="date">). */
export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Formats a Postgres `date` (YYYY-MM-DD) without timezone shifting. */
export function formatAssessmentDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

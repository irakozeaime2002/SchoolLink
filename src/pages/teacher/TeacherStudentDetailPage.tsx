import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  Circle,
  ClipboardList,
  GraduationCap,
  Plus,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Student {
  id: string
  full_name: string
  class_id: string
  school_id: string
  status: string
  date_of_birth: string | null
  guardian_name: string | null
  guardian_phone: string | null
}

interface ClassRow {
  id: string
  name: string
  academic_year_id: string
}

interface SubjectAssignment {
  subject_id: string
}

interface Subject {
  id: string
  name: string
}

interface Term {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean | null
}

interface Assessment {
  id: string
  title: string
  type: string
  subject_id: string
  term_id: string
  max_score: number
  date: string
}

interface Mark {
  id: string
  assessment_id: string
  student_id: string
  score: number
  created_at: string | null
  updated_at: string | null
}

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

interface Intervention {
  id: string
  problem: string
  action: string
  responsible: string
  review_date: string | null
  status: 'open' | 'in_progress' | 'resolved'
  score_before: number | null
  score_after: number | null
}

interface SubjectAnalytics {
  id: string
  name: string
  average: number | null
  classAverage: number | null
  assessments: {
    id: string
    title: string
    type: string
    date: string
    score: number | null
    percentage: number | null
    classAverage: number | null
  }[]
  trend: {
    label: string
    date: string
    studentScore: number | null
    classAverage: number | null
  }[]
}

const statusVariant: Record<
  Intervention['status'],
  'yellow' | 'blue' | 'green'
> = {
  open: 'yellow',
  in_progress: 'blue',
  resolved: 'green',
}

const statusLabel: Record<Intervention['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const initialForm = {
  problem: '',
  action: '',
  responsible: '',
  reviewDate: '',
  scoreBefore: '',
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red'
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

export default function TeacherStudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [student, setStudent] = useState<Student | null>(null)
  const [className, setClassName] = useState('')
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTermId, setSelectedTermId] = useState('current')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interventionError, setInterventionError] = useState('')
  const [open, setOpen] = useState(false)
  const [savingIntervention, setSavingIntervention] = useState(false)
  const [form, setForm] = useState(initialForm)

  const loadInterventions = useCallback(async () => {
    if (!id || !user?.id) return

    const { data, error: loadError } = await supabase
      .from('interventions')
      .select(
        'id, problem, action, responsible, review_date, status, score_before, score_after',
      )
      .eq('student_id', id)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (loadError) throw loadError
    setInterventions((data ?? []) as Intervention[])
  }, [id, user?.id])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id || !user?.id) {
        setLoading(false)
        setError('Student or teacher account could not be identified.')
        return
      }

      setLoading(true)
      setError('')

      try {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(
            'id, full_name, class_id, school_id, status, date_of_birth, guardian_name, guardian_phone',
          )
          .eq('id', id)
          .maybeSingle()

        if (studentError) throw studentError
        if (!studentData) throw new Error('Student not found.')

        const studentRow = studentData as Student

        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, academic_year_id')
          .eq('id', studentRow.class_id)
          .maybeSingle()

        if (classError) throw classError
        if (!classData) throw new Error('The student’s class could not be found.')

        const classRow = classData as ClassRow

        const { data: assignmentData, error: assignmentError } = await supabase
          .from('class_subjects')
          .select('subject_id')
          .eq('class_id', classRow.id)
          .eq('teacher_id', user.id)

        if (assignmentError) throw assignmentError

        const subjectIds = [
          ...new Set(
            ((assignmentData ?? []) as SubjectAssignment[]).map(
              (assignment) => assignment.subject_id,
            ),
          ),
        ]

        if (subjectIds.length === 0) {
          throw new Error(
            'You are not assigned to teach any subjects in this student’s class.',
          )
        }

        const [
          subjectsResult,
          termsResult,
          attendanceResult,
          assessmentResult,
        ] = await Promise.all([
          supabase
            .from('subjects')
            .select('id, name')
            .in('id', subjectIds)
            .order('name'),
          supabase
            .from('terms')
            .select('id, name, start_date, end_date, is_current')
            .eq('academic_year_id', classRow.academic_year_id)
            .order('start_date'),
          supabase
            .from('attendance')
            .select('date, status')
            .eq('student_id', studentRow.id)
            .eq('class_id', classRow.id)
            .order('date'),
          supabase
            .from('assessments')
            .select('id, title, type, subject_id, term_id, max_score, date')
            .eq('teacher_id', user.id)
            .eq('class_id', classRow.id)
            .in('subject_id', subjectIds)
            .order('date'),
        ])

        if (subjectsResult.error) throw subjectsResult.error
        if (termsResult.error) throw termsResult.error
        if (attendanceResult.error) throw attendanceResult.error
        if (assessmentResult.error) throw assessmentResult.error

        const assessmentRows = (assessmentResult.data ?? []) as Assessment[]
        const assessmentIds = assessmentRows.map((assessment) => assessment.id)

        const marksResult = assessmentIds.length
          ? await supabase
              .from('marks')
              .select(
                'id, assessment_id, student_id, score, created_at, updated_at',
              )
              .in('assessment_id', assessmentIds)
          : { data: [], error: null }

        if (marksResult.error) throw marksResult.error

        if (cancelled) return

        setStudent(studentRow)
        setClassName(classRow.name)
        setSubjects((subjectsResult.data ?? []) as Subject[])
        setTerms((termsResult.data ?? []) as Term[])
        setAssessments(assessmentRows)
        setMarks((marksResult.data ?? []) as Mark[])
        setAttendance((attendanceResult.data ?? []) as AttendanceRecord[])

        const termRows = (termsResult.data ?? []) as Term[]
        setSelectedTermId((current) => {
          if (
            current !== 'current' &&
            (current === 'all' || termRows.some((term) => term.id === current))
          ) {
            return current
          }

          return termRows.find((term) => term.is_current)?.id ?? 'all'
        })

        await loadInterventions()
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, loadInterventions, user?.id])

  const selectedTerm =
    selectedTermId === 'all'
      ? null
      : terms.find((term) => term.id === selectedTermId) ?? null

  const selectedAssessments = useMemo(
    () =>
      selectedTerm
        ? assessments.filter(
            (assessment) => assessment.term_id === selectedTerm.id,
          )
        : assessments,
    [assessments, selectedTerm],
  )

  const selectedAttendance = useMemo(
    () =>
      selectedTerm
        ? attendance.filter(
            (record) =>
              record.date >= selectedTerm.start_date &&
              record.date <= selectedTerm.end_date,
          )
        : attendance,
    [attendance, selectedTerm],
  )

  const subjectAnalytics = useMemo<SubjectAnalytics[]>(() => {
    const relevantAssessmentIds = new Set(
      selectedAssessments.map((assessment) => assessment.id),
    )

    // Ignore duplicate student/assessment rows by using the most recently updated mark.
    const newestMarkByPair = new Map<string, Mark>()
    for (const mark of marks) {
      if (!relevantAssessmentIds.has(mark.assessment_id)) continue

      const key = `${mark.assessment_id}:${mark.student_id}`
      const existing = newestMarkByPair.get(key)
      const markDate = mark.updated_at ?? mark.created_at ?? ''
      const existingDate = existing?.updated_at ?? existing?.created_at ?? ''

      if (!existing || markDate >= existingDate) {
        newestMarkByPair.set(key, mark)
      }
    }

    const uniqueMarks = [...newestMarkByPair.values()]

    return subjects.map((subject) => {
      const subjectAssessments = selectedAssessments
        .filter((assessment) => assessment.subject_id === subject.id)
        .sort((a, b) => a.date.localeCompare(b.date))

      const subjectMarks = uniqueMarks.filter((mark) =>
        subjectAssessments.some(
          (assessment) => assessment.id === mark.assessment_id,
        ),
      )

      const assessmentRows = subjectAssessments.map((assessment) => {
        const assessmentMarks = subjectMarks.filter(
          (mark) => mark.assessment_id === assessment.id,
        )
        const studentMark = assessmentMarks.find(
          (mark) => mark.student_id === student?.id,
        )
        const maxScore = Number(assessment.max_score)
        const classScores =
          maxScore > 0
            ? assessmentMarks.map(
                (mark) => (Number(mark.score) / maxScore) * 100,
              )
            : []

        return {
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          date: assessment.date,
          score: studentMark ? Number(studentMark.score) : null,
          percentage:
            studentMark && maxScore > 0
              ? Math.round((Number(studentMark.score) / maxScore) * 100)
              : null,
          classAverage: average(classScores),
        }
      })

      const studentPercentages = assessmentRows
        .filter((assessment) => assessment.percentage !== null)
        .map((assessment) => assessment.percentage as number)

      const allClassPercentages = subjectMarks.flatMap((mark) => {
        const assessment = subjectAssessments.find(
          (item) => item.id === mark.assessment_id,
        )
        if (!assessment || Number(assessment.max_score) <= 0) return []

        return [(Number(mark.score) / Number(assessment.max_score)) * 100]
      })

      const trend = assessmentRows.map((assessment) => ({
        label: assessment.title,
        date: assessment.date,
        studentScore: assessment.percentage,
        classAverage: assessment.classAverage,
      }))

      return {
        id: subject.id,
        name: subject.name,
        average: average(studentPercentages),
        classAverage: average(allClassPercentages),
        assessments: assessmentRows,
        trend,
      }
    })
  }, [marks, selectedAssessments, student?.id, subjects])

  const studentAverage = useMemo(() => {
    const scores = subjectAnalytics.flatMap((subject) =>
      subject.assessments.flatMap((assessment) =>
        assessment.percentage === null ? [] : [assessment.percentage],
      ),
    )
    return average(scores)
  }, [subjectAnalytics])

  const attendanceSummary = useMemo(() => {
    const countable = selectedAttendance.filter(
      (record) => record.status !== 'excused',
    )
    const attended = countable.filter(
      (record) => record.status === 'present' || record.status === 'late',
    ).length

    const byStatus = selectedAttendance.reduce(
      (result, record) => {
        result[record.status] += 1
        return result
      },
      { present: 0, absent: 0, late: 0, excused: 0 },
    )

    const rate = countable.length
      ? Math.round((attended / countable.length) * 100)
      : null

    return { rate, ...byStatus }
  }, [selectedAttendance])

  const termLabel = selectedTerm?.name ?? 'All terms'

  async function handleAdd() {
    if (!user?.id || !user.school_id || !student) {
      setInterventionError('Your account or school is not available.')
      return
    }

    if (!form.problem.trim() || !form.action.trim() || !form.responsible.trim()) {
      setInterventionError('Enter the problem, action plan, and responsible person.')
      return
    }

    setSavingIntervention(true)
    setInterventionError('')

    const { error: insertError } = await supabase.from('interventions').insert({
      school_id: user.school_id,
      student_id: student.id,
      teacher_id: user.id,
      problem: form.problem.trim(),
      action: form.action.trim(),
      responsible: form.responsible.trim(),
      review_date: form.reviewDate || null,
      status: 'open',
      score_before: form.scoreBefore ? Number(form.scoreBefore) : null,
    })

    if (insertError) {
      setInterventionError(insertError.message)
      setSavingIntervention(false)
      return
    }

    try {
      await loadInterventions()
      setForm(initialForm)
      setOpen(false)
    } catch (loadError) {
      setInterventionError(errorMessage(loadError))
    } finally {
      setSavingIntervention(false)
    }
  }

  async function cycleStatus(intervention: Intervention) {
    const nextStatus: Record<Intervention['status'], Intervention['status']> = {
      open: 'in_progress',
      in_progress: 'resolved',
      resolved: 'open',
    }

    setInterventionError('')
    const { error: updateError } = await supabase
      .from('interventions')
      .update({ status: nextStatus[intervention.status] })
      .eq('id', intervention.id)
      .eq('teacher_id', user?.id ?? '')

    if (updateError) {
      setInterventionError(updateError.message)
      return
    }

    try {
      await loadInterventions()
    } catch (loadError) {
      setInterventionError(errorMessage(loadError))
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading student analytics…</div>
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error || 'Student not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {className} · {student.status}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {student.date_of_birth ? `Date of birth: ${formatDate(student.date_of_birth)}` : ''}
            {student.guardian_name ? ` · Guardian: ${student.guardian_name}` : ''}
            {student.guardian_phone ? ` · ${student.guardian_phone}` : ''}
          </p>
        </div>

        <label className="text-sm font-medium text-gray-700">
          Analysis period
          <select
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
            className="mt-1 block min-w-44 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}{term.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects you teach"
          value={subjects.length}
          icon={<GraduationCap size={20} />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Student average"
          value={studentAverage === null ? '—' : `${studentAverage}%`}
          icon={<ClipboardList size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Attendance rate"
          value={attendanceSummary.rate === null ? '—' : `${attendanceSummary.rate}%`}
          icon={<CalendarCheck size={20} />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Assessments"
          value={selectedAssessments.length}
          icon={<ClipboardList size={20} />}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">Subject performance</h2>
          <p className="text-sm text-gray-500">
            Student and class averages use only your subjects in {termLabel}.
          </p>
        </div>

        {subjectAnalytics.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No subjects are assigned to you in this class.
          </p>
        ) : (
          <div className="space-y-6">
            {subjectAnalytics.map((subject) => (
              <article
                key={subject.id}
                className="rounded-xl border border-gray-100 p-4"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {subject.assessments.length} assessment
                      {subject.assessments.length === 1 ? '' : 's'} in {termLabel}
                    </p>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Student average</p>
                      <p className="font-semibold text-gray-900">
                        {subject.average === null ? '—' : `${subject.average}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Class average</p>
                      <p className="font-semibold text-gray-900">
                        {subject.classAverage === null
                          ? '—'
                          : `${subject.classAverage}%`}
                      </p>
                    </div>
                  </div>
                </div>

                {subject.trend.some((point) => point.studentScore !== null || point.classAverage !== null) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={subject.trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip
                          formatter={(value) =>
                            value === null ? ['—', ''] : [`${Number(value)}%`]
                          }
                          labelFormatter={(label) => String(label)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="studentScore"
                          name="Student"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          connectNulls
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="classAverage"
                          name="Class average"
                          stroke="#0891b2"
                          strokeWidth={2}
                          connectNulls
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">
                    No marks are available for this subject in {termLabel}.
                  </p>
                )}

                {subject.assessments.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Assessment</th>
                          <th className="px-4 py-2 font-medium">Type</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Student score</th>
                          <th className="px-4 py-2 font-medium">Class average</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {subject.assessments.map((assessment) => (
                          <tr key={assessment.id}>
                            <td className="px-4 py-2 font-medium text-gray-800">
                              {assessment.title}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {assessment.type}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {formatDate(assessment.date)}
                            </td>
                            <td className="px-4 py-2">
                              {assessment.score === null ||
                              assessment.percentage === null ? (
                                <span className="text-gray-400">Not marked</span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <span className="text-gray-600">
                                    {assessment.score}
                                  </span>
                                  <Badge
                                    label={`${assessment.percentage}%`}
                                    variant={scoreVariant(assessment.percentage)}
                                  />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {assessment.classAverage === null
                                ? '—'
                                : `${assessment.classAverage}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900">Attendance summary</h2>
        <p className="mb-4 text-sm text-gray-500">
          Attendance recorded for this student in {termLabel}. Excused days are
          excluded from the attendance rate.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Present', value: attendanceSummary.present, color: 'text-emerald-700' },
            { label: 'Absent', value: attendanceSummary.absent, color: 'text-red-700' },
            { label: 'Late', value: attendanceSummary.late, color: 'text-amber-700' },
            { label: 'Excused', value: attendanceSummary.excused, color: 'text-sky-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`mt-1 text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Intervention tracking</h2>
            <p className="text-sm text-gray-500">
              Support plans created by you for this student.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setInterventionError('')
              setOpen(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus size={14} /> Add intervention
          </button>
        </div>

        {interventionError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {interventionError}
          </p>
        )}

        {interventions.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No interventions recorded by you yet.
          </p>
        ) : (
          <div className="space-y-3">
            {interventions.map((intervention) => (
              <article
                key={intervention.id}
                className="rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {intervention.problem}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Action: {intervention.action}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>Responsible: {intervention.responsible}</span>
                      {intervention.review_date && (
                        <span>Review: {formatDate(intervention.review_date)}</span>
                      )}
                      {intervention.score_before !== null && (
                        <span>
                          Before: <strong>{intervention.score_before}%</strong>
                          {intervention.score_after !== null && (
                            <>
                              {' → '}After:{' '}
                              <strong className="text-green-600">
                                {intervention.score_after}%
                              </strong>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void cycleStatus(intervention)}
                    className="flex shrink-0 items-center gap-1.5"
                    title="Click to advance status"
                  >
                    {intervention.status === 'resolved' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <Circle size={16} className="text-gray-300" />
                    )}
                    <Badge
                      label={statusLabel[intervention.status]}
                      variant={statusVariant[intervention.status]}
                    />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {open && (
        <Modal
          title="Add Intervention"
          onClose={() => {
            if (!savingIntervention) setOpen(false)
          }}
        >
          <div className="space-y-4">
            {interventionError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {interventionError}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Problem identified
              </label>
              <input
                type="text"
                value={form.problem}
                onChange={(event) =>
                  setForm((current) => ({ ...current, problem: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe the learning or attendance concern"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Action plan
              </label>
              <textarea
                rows={3}
                value={form.action}
                onChange={(event) =>
                  setForm((current) => ({ ...current, action: event.target.value }))
                }
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe the support action"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Responsible person
                </label>
                <input
                  type="text"
                  value={form.responsible}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsible: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Teacher or guardian"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Review date
                </label>
                <input
                  type="date"
                  value={form.reviewDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reviewDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Score before intervention (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.scoreBefore}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoreBefore: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0–100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={savingIntervention}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={savingIntervention}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingIntervention ? 'Saving…' : 'Save intervention'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
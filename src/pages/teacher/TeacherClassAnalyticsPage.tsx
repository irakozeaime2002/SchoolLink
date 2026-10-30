import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, ClipboardList, GraduationCap } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface ClassRow {
  id: string
  name: string
  academic_year_id: string
}

interface SubjectRow {
  id: string
  name: string
}

interface StudentRow {
  id: string
  full_name: string
}

interface TermRow {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean | null
}

interface AssessmentRow {
  id: string
  title: string
  type: string
  date: string
  max_score: number
  term_id: string
}

interface MarkRow {
  assessment_id: string
  student_id: string
  score: number
}

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red'
}

export default function TeacherClassAnalyticsPage() {
  const { classId, subjectId } = useParams<{
    classId: string
    subjectId: string
  }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [className, setClassName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [terms, setTerms] = useState<TermRow[]>([])
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [marks, setMarks] = useState<MarkRow[]>([])
  const [selectedTerm, setSelectedTerm] = useState('current')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id || !classId || !subjectId) {
        setError('The class or subject could not be identified.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, academic_year_id')
          .eq('id', classId)
          .single()

        if (classError) throw classError
        const classRow = classData as ClassRow

        const { data: assignment, error: assignmentError } = await supabase
          .from('class_subjects')
          .select('class_id')
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('teacher_id', user.id)
          .maybeSingle()

        if (assignmentError) throw assignmentError
        if (!assignment) {
          throw new Error('You are not assigned to teach this subject in this class.')
        }

        const [
          subjectResult,
          studentsResult,
          termsResult,
          assessmentsResult,
        ] = await Promise.all([
          supabase.from('subjects').select('id, name').eq('id', subjectId).single(),
          supabase
            .from('students')
            .select('id, full_name')
            .eq('class_id', classId)
            .eq('status', 'active')
            .order('full_name'),
          supabase
            .from('terms')
            .select('id, name, start_date, end_date, is_current')
            .eq('academic_year_id', classRow.academic_year_id)
            .order('start_date'),
          supabase
            .from('assessments')
            .select('id, title, type, date, max_score, term_id')
            .eq('teacher_id', user.id)
            .eq('class_id', classId)
            .eq('subject_id', subjectId)
            .order('date', { ascending: false }),
        ])

        if (subjectResult.error) throw subjectResult.error
        if (studentsResult.error) throw studentsResult.error
        if (termsResult.error) throw termsResult.error
        if (assessmentsResult.error) throw assessmentsResult.error

        const assessmentRows = (assessmentsResult.data ?? []) as AssessmentRow[]
        const assessmentIds = assessmentRows.map((item) => item.id)

        const marksResult = assessmentIds.length
          ? await supabase
              .from('marks')
              .select('assessment_id, student_id, score')
              .in('assessment_id', assessmentIds)
          : { data: [], error: null }

        if (marksResult.error) throw marksResult.error
        if (cancelled) return

        const termRows = (termsResult.data ?? []) as TermRow[]

        setClassName(classRow.name)
        setSubjectName((subjectResult.data as SubjectRow).name)
        setStudents((studentsResult.data ?? []) as StudentRow[])
        setTerms(termRows)
        setAssessments(assessmentRows)
        setMarks((marksResult.data ?? []) as MarkRow[])
        setSelectedTerm((current) => {
          if (current !== 'current' && termRows.some((term) => term.id === current)) {
            return current
          }
          return termRows.find((term) => term.is_current)?.id ?? 'all'
        })
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load class analytics.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [classId, subjectId, user?.id])

  const analytics = useMemo(() => {
    const filteredAssessments =
      selectedTerm === 'all'
        ? assessments
        : assessments.filter((assessment) => assessment.term_id === selectedTerm)

    const assessmentIds = new Set(filteredAssessments.map((assessment) => assessment.id))
    const filteredMarks = marks.filter((mark) => assessmentIds.has(mark.assessment_id))
    const studentIds = new Set(students.map((student) => student.id))
    const marksByStudent = new Map<string, number[]>()
    const marksByAssessment = new Map<string, MarkRow[]>()

    for (const mark of filteredMarks) {
      if (!studentIds.has(mark.student_id)) continue

      const assessmentMarks = marksByAssessment.get(mark.assessment_id) ?? []
      assessmentMarks.push(mark)
      marksByAssessment.set(mark.assessment_id, assessmentMarks)

      const assessment = filteredAssessments.find(
        (item) => item.id === mark.assessment_id,
      )
      if (!assessment || Number(assessment.max_score) <= 0) continue

      const scores = marksByStudent.get(mark.student_id) ?? []
      scores.push((Number(mark.score) / Number(assessment.max_score)) * 100)
      marksByStudent.set(mark.student_id, scores)
    }

    const average = (scores: number[]) =>
      scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null

    const assessmentResults = filteredAssessments.map((assessment) => {
      const assessmentMarks = marksByAssessment.get(assessment.id) ?? []
      const percentages =
        Number(assessment.max_score) > 0
          ? assessmentMarks.map(
              (mark) => (Number(mark.score) / Number(assessment.max_score)) * 100,
            )
          : []

      return {
        ...assessment,
        average: average(percentages),
        markedCount: new Set(assessmentMarks.map((mark) => mark.student_id)).size,
        classSize: students.length,
      }
    })

    const studentResults = students.map((student) => {
      const scores = marksByStudent.get(student.id) ?? []
      return {
        ...student,
        average: average(scores),
        marksEntered: scores.length,
      }
    })

    const allScores = [...marksByStudent.values()].flat()
    const classAverage = average(allScores)
    const expectedMarks = students.length * filteredAssessments.length
    const enteredMarks = filteredMarks.filter((mark) =>
      studentIds.has(mark.student_id),
    ).length
    const coverage = expectedMarks
      ? Math.min(100, Math.round((enteredMarks / expectedMarks) * 100))
      : null

    return {
      assessments: assessmentResults,
      students: studentResults,
      classAverage,
      coverage,
    }
  }, [assessments, marks, selectedTerm, students])

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading analytics…</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/teacher/classes')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back to My Classes
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/teacher/classes')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} /> Back to My Classes
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {className} · {subjectName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analytics for your subject in this class.
          </p>
        </div>

        <label className="text-sm font-medium text-gray-700">
          Term
          <select
            value={selectedTerm}
            onChange={(event) => setSelectedTerm(event.target.value)}
            className="mt-1 block min-w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}{term.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active students"
          value={students.length}
          icon={<UsersIcon />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Subject average"
          value={analytics.classAverage === null ? '—' : `${analytics.classAverage}%`}
          icon={<GraduationCap size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Mark entry coverage"
          value={analytics.coverage === null ? '—' : `${analytics.coverage}%`}
          icon={<ClipboardList size={20} />}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-gray-900">Assessment averages</h2>
        <p className="mb-4 text-sm text-gray-500">
          Average student score for each assessment, converted to a percentage.
        </p>

        {analytics.assessments.some((assessment) => assessment.average !== null) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.assessments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Average']}
                />
                <Bar dataKey="average" name="Average" fill="#4f46e5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            No marks have been recorded for this subject and term yet.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-5">
          <ClipboardList size={18} className="text-indigo-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Assessment results</h2>
            <p className="text-sm text-gray-500">
              Mark entry progress for each assessment in this subject.
            </p>
          </div>
        </div>

        {analytics.assessments.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No assessments found for this subject and term.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Assessment</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Average</th>
                  <th className="px-5 py-3 font-medium">Marks entered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {assessment.title}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{assessment.type}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(`${assessment.date}T00:00:00`).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {assessment.average === null ? (
                        '—'
                      ) : (
                        <Badge
                          label={`${assessment.average}%`}
                          variant={scoreVariant(assessment.average)}
                        />
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {assessment.markedCount}/{assessment.classSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-5">
          <BookOpen size={18} className="text-indigo-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Student performance</h2>
            <p className="text-sm text-gray-500">
              Student averages use only marked assessments for this subject.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Subject average</th>
                <th className="px-5 py-3 font-medium">Marks recorded</th>
                <th className="px-5 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.students.map((student) => (
                <tr key={student.id}>
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {student.full_name}
                  </td>
                  <td className="px-5 py-3">
                    {student.average === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <Badge
                        label={`${student.average}%`}
                        variant={scoreVariant(student.average)}
                      />
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {student.marksEntered}/{analytics.assessments.length}
                  </td>
                  <td className="px-5 py-3">
                    {student.average === null ? (
                      <span className="text-gray-400">No marks yet</span>
                    ) : student.average < 60 ? (
                      <span className="text-amber-700">Needs support</span>
                    ) : (
                      <span className="text-emerald-700">On track</span>
                    )}
                  </td>
                </tr>
              ))}
              {analytics.students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No active students are enrolled in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function UsersIcon() {
  return <BookOpen size={20} />
}
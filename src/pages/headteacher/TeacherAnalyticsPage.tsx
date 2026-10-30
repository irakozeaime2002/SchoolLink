import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

interface TeacherProfile {
  id: string
  full_name: string
  phone: string | null
}

interface Assignment {
  class_id: string
  subject_id: string
}

interface ClassRow {
  id: string
  name: string
  academic_year_id: string
}

interface SubjectRow {
  id: string
  name: string
}

interface AcademicYear {
  id: string
  name: string
  is_current: boolean | null
}

interface Term {
  id: string
  academic_year_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean | null
}

interface Student {
  id: string
  full_name: string
  class_id: string
  status: string
}

interface Assessment {
  id: string
  class_id: string
  subject_id: string
  term_id: string
  title: string
  type: string
  date: string
  max_score: number
}

interface Mark {
  id: string
  assessment_id: string
  student_id: string
  score: number
  created_at: string | null
  updated_at: string | null
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red'
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TeacherAnalyticsPage() {
  const { id: teacherId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [yearId, setYearId] = useState('')
  const [termId, setTermId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!teacherId || !user?.school_id) {
        setError('Teacher or school could not be identified.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const { data: teacherData, error: teacherError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', teacherId)
          .eq('school_id', user.school_id)
          .eq('role', 'teacher')
          .maybeSingle()

        if (teacherError) throw teacherError
        if (!teacherData) throw new Error('Teacher was not found in your school.')

        const { data: assignmentData, error: assignmentError } = await supabase
          .from('class_subjects')
          .select('class_id, subject_id')
          .eq('teacher_id', teacherId)

        if (assignmentError) throw assignmentError

        const assignmentRows = (assignmentData ?? []) as Assignment[]
        const classIds = [...new Set(assignmentRows.map((row) => row.class_id))]
        const subjectIds = [...new Set(assignmentRows.map((row) => row.subject_id))]

        if (!classIds.length || !subjectIds.length) {
          if (!cancelled) {
            setTeacher(teacherData as TeacherProfile)
            setAssignments(assignmentRows)
            setClasses([])
            setSubjects([])
            setYears([])
            setTerms([])
            setStudents([])
            setAssessments([])
            setMarks([])
          }
          return
        }

        const [classesResult, subjectsResult] = await Promise.all([
          supabase
            .from('classes')
            .select('id, name, academic_year_id')
            .eq('school_id', user.school_id)
            .in('id', classIds),
          supabase
            .from('subjects')
            .select('id, name')
            .eq('school_id', user.school_id)
            .in('id', subjectIds),
        ])

        if (classesResult.error) throw classesResult.error
        if (subjectsResult.error) throw subjectsResult.error

        const classRows = (classesResult.data ?? []) as ClassRow[]
        const subjectRows = (subjectsResult.data ?? []) as SubjectRow[]
        const yearIds = [...new Set(classRows.map((row) => row.academic_year_id))]

        const [yearsResult, studentsResult] = await Promise.all([
          yearIds.length
            ? supabase
                .from('academic_years')
                .select('id, name, is_current')
                .eq('school_id', user.school_id)
                .in('id', yearIds)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('students')
            .select('id, full_name, class_id, status')
            .in('class_id', classRows.map((row) => row.id))
            .eq('status', 'active')
            .order('full_name'),
        ])

        if (yearsResult.error) throw yearsResult.error
        if (studentsResult.error) throw studentsResult.error

        const yearRows = (yearsResult.data ?? []) as AcademicYear[]
        const loadedTermsResult = yearIds.length
          ? await supabase
              .from('terms')
              .select('id, academic_year_id, name, start_date, end_date, is_current')
              .in('academic_year_id', yearIds)
              .order('start_date')
          : { data: [], error: null }

        if (loadedTermsResult.error) throw loadedTermsResult.error

        const termRows = (loadedTermsResult.data ?? []) as Term[]
        const teacherClassIds = classRows.map((row) => row.id)

        const assessmentResult = teacherClassIds.length
          ? await supabase
              .from('assessments')
              .select('id, class_id, subject_id, term_id, title, type, date, max_score')
              .eq('school_id', user.school_id)
              .eq('teacher_id', teacherId)
              .in('class_id', teacherClassIds)
              .in('subject_id', subjectRows.map((row) => row.id))
              .order('date')
          : { data: [], error: null }

        if (assessmentResult.error) throw assessmentResult.error

        const validPairs = new Set(
          assignmentRows.map((row) => `${row.class_id}:${row.subject_id}`),
        )
        const assessmentRows = (assessmentResult.data ?? [])
          .filter((assessment) =>
            validPairs.has(`${assessment.class_id}:${assessment.subject_id}`),
          ) as Assessment[]

        const assessmentIds = assessmentRows.map((row) => row.id)
        const marksResult = assessmentIds.length
          ? await supabase
              .from('marks')
              .select('id, assessment_id, student_id, score, created_at, updated_at')
              .in('assessment_id', assessmentIds)
          : { data: [], error: null }

        if (marksResult.error) throw marksResult.error
        if (cancelled) return

        setTeacher(teacherData as TeacherProfile)
        setAssignments(assignmentRows)
        setClasses(classRows)
        setSubjects(subjectRows)
        setYears(yearRows)
        setTerms(termRows)
        setStudents((studentsResult.data ?? []) as Student[])
        setAssessments(assessmentRows)
        setMarks((marksResult.data ?? []) as Mark[])

        const currentYear = yearRows.find((year) => year.is_current) ?? yearRows[0]
        const currentTerm = currentYear
          ? termRows.find(
              (term) =>
                term.academic_year_id === currentYear.id && term.is_current,
            )
          : undefined

        setYearId(currentYear?.id ?? '')
        setTermId(currentTerm?.id ?? 'all')
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load teacher analytics.',
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
  }, [teacherId, user?.school_id])

  const yearTerms = terms.filter((term) => term.academic_year_id === yearId)

  const analytics = useMemo(() => {
    const classById = new Map(classes.map((row) => [row.id, row]))
    const subjectById = new Map(subjects.map((row) => [row.id, row.name]))
    const assignedPairs = assignments.filter((assignment) => {
      const classRow = classById.get(assignment.class_id)
      return classRow?.academic_year_id === yearId
    })

    const selectedAssessments = assessments.filter((assessment) => {
      const classRow = classById.get(assessment.class_id)
      if (!classRow || classRow.academic_year_id !== yearId) return false
      return termId === 'all' || assessment.term_id === termId
    })

    const assessmentById = new Map(
      selectedAssessments.map((assessment) => [assessment.id, assessment]),
    )
    const assessmentIds = new Set(assessmentById.keys())
    const activeStudents = students.filter((student) =>
      assignedPairs.some((assignment) => assignment.class_id === student.class_id),
    )
    const activeStudentIds = new Set(activeStudents.map((student) => student.id))

    const newestMarkByPair = new Map<string, Mark>()
    for (const mark of marks) {
      if (!assessmentIds.has(mark.assessment_id)) continue
      if (!activeStudentIds.has(mark.student_id)) continue

      const key = `${mark.assessment_id}:${mark.student_id}`
      const previous = newestMarkByPair.get(key)
      const currentDate = mark.updated_at ?? mark.created_at ?? ''
      const previousDate = previous?.updated_at ?? previous?.created_at ?? ''

      if (!previous || currentDate >= previousDate) {
        newestMarkByPair.set(key, mark)
      }
    }

    const uniqueMarks = [...newestMarkByPair.values()]
    const pairRows = assignedPairs.map((assignment) => {
      const classRow = classById.get(assignment.class_id)
      const subjectName = subjectById.get(assignment.subject_id) ?? 'Subject'
      const pairAssessments = selectedAssessments.filter(
        (assessment) =>
          assessment.class_id === assignment.class_id &&
          assessment.subject_id === assignment.subject_id,
      )
      const assessmentIdsForPair = new Set(
        pairAssessments.map((assessment) => assessment.id),
      )
      const pairMarks = uniqueMarks.filter((mark) =>
        assessmentIdsForPair.has(mark.assessment_id),
      )

      const percentages = pairMarks.flatMap((mark) => {
        const assessment = assessmentById.get(mark.assessment_id)
        if (!assessment || Number(assessment.max_score) <= 0) return []
        return [(Number(mark.score) / Number(assessment.max_score)) * 100]
      })

      const studentCount = activeStudents.filter(
        (student) => student.class_id === assignment.class_id,
      ).length
      const expectedMarks = studentCount * pairAssessments.length
      const coverage = expectedMarks
        ? Math.min(100, Math.round((pairMarks.length / expectedMarks) * 100))
        : null

      return {
        key: `${assignment.class_id}:${assignment.subject_id}`,
        className: classRow?.name ?? 'Class',
        subjectName,
        average: average(percentages),
        assessmentCount: pairAssessments.length,
        studentCount,
        coverage,
      }
    })

    const bySubject = new Map<string, number[]>()
    for (const row of pairRows) {
      if (row.average === null) continue
      bySubject.set(row.subjectName, [
        ...(bySubject.get(row.subjectName) ?? []),
        row.average,
      ])
    }

    const subjectChartData = [...bySubject.entries()]
      .map(([subject, values]) => ({
        subject,
        average: average(values) ?? 0,
      }))
      .sort((a, b) => b.average - a.average)

    const overallScores = uniqueMarks.flatMap((mark) => {
      const assessment = assessmentById.get(mark.assessment_id)
      if (!assessment || Number(assessment.max_score) <= 0) return []
      return [(Number(mark.score) / Number(assessment.max_score)) * 100]
    })

    const studentResults = activeStudents.map((student) => {
      const studentMarks = uniqueMarks.filter((mark) => mark.student_id === student.id)
      const scores = studentMarks.flatMap((mark) => {
        const assessment = assessmentById.get(mark.assessment_id)
        if (!assessment || Number(assessment.max_score) <= 0) return []
        return [(Number(mark.score) / Number(assessment.max_score)) * 100]
      })

      return {
        id: student.id,
        name: student.full_name,
        className: classById.get(student.class_id)?.name ?? 'Class',
        average: average(scores),
        markCount: studentMarks.length,
      }
    })

    const assessmentRows = selectedAssessments.map((assessment) => {
      const subjectMarks = uniqueMarks.filter(
        (mark) => mark.assessment_id === assessment.id,
      )
      const expected = activeStudents.filter(
        (student) => student.class_id === assessment.class_id,
      ).length
      const classAverage = average(
        subjectMarks.flatMap((mark) => {
          if (Number(assessment.max_score) <= 0) return []
          return [(Number(mark.score) / Number(assessment.max_score)) * 100]
        }),
      )

      return {
        id: assessment.id,
        title: assessment.title,
        className: classById.get(assessment.class_id)?.name ?? 'Class',
        subjectName: subjectById.get(assessment.subject_id) ?? 'Subject',
        type: assessment.type,
        date: assessment.date,
        average: classAverage,
        entered: subjectMarks.length,
        expected,
        coverage: expected
          ? Math.min(100, Math.round((subjectMarks.length / expected) * 100))
          : 0,
      }
    })

    const supportStudents = studentResults
      .filter((student) => student.average !== null && student.average < 60)
      .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))
      .slice(0, 10)

    return {
      pairRows,
      subjectChartData,
      assessmentRows,
      studentResults,
      supportStudents,
      studentCount: activeStudents.length,
      classCount: new Set(assignedPairs.map((row) => row.class_id)).size,
      subjectCount: new Set(assignedPairs.map((row) => row.subject_id)).size,
      overallAverage: average(overallScores),
      markCoverage:
        selectedAssessments.length && activeStudents.length
          ? Math.min(
              100,
              Math.round(
                (uniqueMarks.length /
                  selectedAssessments.reduce(
                    (total, assessment) =>
                      total +
                      activeStudents.filter(
                        (student) => student.class_id === assessment.class_id,
                      ).length,
                    0,
                  )) *
                  100,
              ),
            )
          : null,
    }
  }, [
    assignments,
    assessments,
    classes,
    marks,
    students,
    subjects,
    termId,
    yearId,
  ])

  function changeYear(nextYearId: string) {
    setYearId(nextYearId)
    const currentTerm = terms.find(
      (term) =>
        term.academic_year_id === nextYearId && term.is_current,
    )
    setTermId(currentTerm?.id ?? 'all')
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading teacher analytics…</div>
  }

  if (error || !teacher) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/headteacher/teachers')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back to Teachers
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error || 'Teacher not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/headteacher/teachers')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} /> Back to Teachers
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{teacher.full_name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Teaching performance for assigned subjects and classes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-gray-700">
            Academic year
            <select
              value={yearId}
              onChange={(event) => changeYear(event.target.value)}
              className="mt-1 block min-w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Term
            <select
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
              disabled={!yearId}
              className="mt-1 block min-w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All terms</option>
              {yearTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}{term.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Classes"
          value={analytics.classCount}
          icon={<BookOpen size={20} />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Subjects"
          value={analytics.subjectCount}
          icon={<GraduationCap size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Students reached"
          value={analytics.studentCount}
          icon={<Users size={20} />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Average mark"
          value={
            analytics.overallAverage === null
              ? '—'
              : `${analytics.overallAverage}%`
          }
          icon={<ClipboardList size={20} />}
          color="bg-sky-50 text-sky-600"
        />
        <StatCard
          label="Mark coverage"
          value={
            analytics.markCoverage === null
              ? '—'
              : `${analytics.markCoverage}%`
          }
          icon={<ClipboardList size={20} />}
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {analytics.pairRows.length === 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          No class and subject assignments were found for this teacher in the selected academic year.
        </div>
      )}

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900">Average by subject</h2>
        <p className="mb-4 text-sm text-gray-500">
          Averages combine this teacher’s assigned classes for the selected period.
        </p>

        {analytics.subjectChartData.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.subjectChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => [`${Number(value)}%`, 'Average']} />
                <Bar dataKey="average" name="Average" fill="#4f46e5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            No marks are recorded for this period.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900">Class and subject performance</h2>
          <p className="text-sm text-gray-500">
            Each row represents one subject assignment in one class.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Students</th>
                <th className="px-5 py-3 font-medium">Assessments</th>
                <th className="px-5 py-3 font-medium">Average</th>
                <th className="px-5 py-3 font-medium">Mark coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.pairRows.map((row) => (
                <tr key={row.key}>
                  <td className="px-5 py-3 font-medium text-gray-800">{row.className}</td>
                  <td className="px-5 py-3 text-gray-600">{row.subjectName}</td>
                  <td className="px-5 py-3 text-gray-600">{row.studentCount}</td>
                  <td className="px-5 py-3 text-gray-600">{row.assessmentCount}</td>
                  <td className="px-5 py-3">
                    {row.average === null ? (
                      '—'
                    ) : (
                      <Badge
                        label={`${row.average}%`}
                        variant={scoreVariant(row.average)}
                      />
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {row.coverage === null ? '—' : `${row.coverage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900">Assessment results</h2>
          <p className="text-sm text-gray-500">
            Class averages and mark-entry progress for assessments created by this teacher.
          </p>
        </div>
        {analytics.assessmentRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Assessment</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Average</th>
                  <th className="px-5 py-3 font-medium">Marks entered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.assessmentRows.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {assessment.title}
                      <span className="ml-2 text-xs text-gray-400">{assessment.type}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{assessment.className}</td>
                    <td className="px-5 py-3 text-gray-600">{assessment.subjectName}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(assessment.date)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {assessment.average === null ? '—' : `${assessment.average}%`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {assessment.entered}/{assessment.expected} ({assessment.coverage}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-gray-500">
            No assessments found for this teacher in the selected period.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900">Students needing support</h2>
          <p className="text-sm text-gray-500">
            Students with a recorded average below 60% across this teacher’s assessments.
          </p>
        </div>
        {analytics.supportStudents.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Average</th>
                  <th className="px-5 py-3 font-medium">Marks recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.supportStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-5 py-3 font-medium text-gray-800">{student.name}</td>
                    <td className="px-5 py-3 text-gray-600">{student.className}</td>
                    <td className="px-5 py-3">
                      {student.average === null ? '—' : (
                        <Badge
                          label={`${student.average}%`}
                          variant={scoreVariant(student.average)}
                        />
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{student.markCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-gray-500">
            No students fall below the support indicator in this period.
          </p>
        )}
      </section>
    </div>
  )
}
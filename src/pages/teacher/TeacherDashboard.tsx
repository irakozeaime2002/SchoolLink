import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type ClassRow = {
  id: string
  name: string
  academic_year_id: string
  teacher_id: string | null
}

type ClassSubjectRow = {
  class_id: string
  subject_id: string
  teacher_id: string | null
}

type SubjectRow = {
  id: string
  name: string
}

type TermRow = {
  id: string
  academic_year_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean | null
}

type AcademicYearRow = {
  id: string
  name: string
}

type StudentRow = {
  id: string
  full_name: string
  class_id: string
  status: string
}

type AssessmentRow = {
  id: string
  class_id: string
  subject_id: string
  term_id: string
  title: string
  type: string
  max_score: number
  date: string
}

type MarkRow = {
  assessment_id: string
  student_id: string
  score: number
}

type AttendanceRow = {
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

type DashboardData = {
  classes: ClassRow[]
  classSubjects: ClassSubjectRow[]
  subjects: SubjectRow[]
  terms: TermRow[]
  academicYears: AcademicYearRow[]
  students: StudentRow[]
  assessments: AssessmentRow[]
  marks: MarkRow[]
  attendance: AttendanceRow[]
}

const EMPTY_DATA: DashboardData = {
  classes: [],
  classSubjects: [],
  subjects: [],
  terms: [],
  academicYears: [],
  students: [],
  assessments: [],
  marks: [],
  attendance: [],
}

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706']

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

function attendanceRate(records: AttendanceRow[]) {
  const eligible = records.filter((record) => record.status !== 'excused')
  if (eligible.length === 0) return null

  const attended = eligible.filter(
    (record) => record.status === 'present' || record.status === 'late',
  ).length

  return Math.round((attended / eligible.length) * 100)
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [selectedTerm, setSelectedTerm] = useState('current')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const teacherId = user?.id

    if (!teacherId) {
      setData(EMPTY_DATA)
      setLoading(false)
      return
    }

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const { data: classAssignments, error: classError } = await supabase
          .from('classes')
          .select('id, name, academic_year_id, teacher_id')
          .eq('teacher_id', teacherId)

        if (classError) throw classError

        const { data: subjectAssignments, error: subjectAssignmentError } =
          await supabase
            .from('class_subjects')
            .select('class_id, subject_id, teacher_id')
            .eq('teacher_id', teacherId)

        if (subjectAssignmentError) throw subjectAssignmentError

        const assignedClassIds = new Set([
          ...(classAssignments ?? []).map((item) => item.id),
          ...(subjectAssignments ?? []).map((item) => item.class_id),
        ])
        const classIds = [...assignedClassIds]

        if (classIds.length === 0) {
          if (!cancelled) {
            setData(EMPTY_DATA)
            setLoading(false)
          }
          return
        }

        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, name, academic_year_id, teacher_id')
          .in('id', classIds)

        if (classesError) throw classesError

        const classRows = (classes ?? []) as ClassRow[]
        const classSubjectRows = (subjectAssignments ?? []) as ClassSubjectRow[]
        const yearIds = [...new Set(classRows.map((item) => item.academic_year_id))]
        const subjectIds = [
          ...new Set(classSubjectRows.map((item) => item.subject_id)),
        ]

        const [
          subjectsResult,
          termsResult,
          yearsResult,
          studentsResult,
          assessmentsResult,
          attendanceResult,
        ] = await Promise.all([
          subjectIds.length
            ? supabase.from('subjects').select('id, name').in('id', subjectIds)
            : Promise.resolve({ data: [], error: null }),
          yearIds.length
            ? supabase
                .from('terms')
                .select('id, academic_year_id, name, start_date, end_date, is_current')
                .in('academic_year_id', yearIds)
            : Promise.resolve({ data: [], error: null }),
          yearIds.length
            ? supabase.from('academic_years').select('id, name').in('id', yearIds)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('students')
            .select('id, full_name, class_id, status')
            .in('class_id', classIds)
            .eq('status', 'active'),
          supabase
            .from('assessments')
            .select('id, class_id, subject_id, term_id, title, type, max_score, date')
            .eq('teacher_id', teacherId)
            .in('class_id', classIds),
          supabase
            .from('attendance')
            .select('student_id, class_id, date, status')
            .eq('teacher_id', teacherId)
            .in('class_id', classIds),
        ])

        if (subjectsResult.error) throw subjectsResult.error
        if (termsResult.error) throw termsResult.error
        if (yearsResult.error) throw yearsResult.error
        if (studentsResult.error) throw studentsResult.error
        if (assessmentsResult.error) throw assessmentsResult.error
        if (attendanceResult.error) throw attendanceResult.error

        const assessmentRows = (assessmentsResult.data ?? []) as AssessmentRow[]
        const assessmentIds = assessmentRows.map((item) => item.id)

        const marksResult = assessmentIds.length
          ? await supabase
              .from('marks')
              .select('assessment_id, student_id, score')
              .in('assessment_id', assessmentIds)
          : { data: [], error: null }

        if (marksResult.error) throw marksResult.error

        const loadedData: DashboardData = {
          classes: classRows,
          classSubjects: classSubjectRows,
          subjects: (subjectsResult.data ?? []) as SubjectRow[],
          terms: (termsResult.data ?? []) as TermRow[],
          academicYears: (yearsResult.data ?? []) as AcademicYearRow[],
          students: (studentsResult.data ?? []) as StudentRow[],
          assessments: assessmentRows,
          marks: (marksResult.data ?? []) as MarkRow[],
          attendance: (attendanceResult.data ?? []) as AttendanceRow[],
        }

        if (!cancelled) {
          setData(loadedData)
          setSelectedTerm((current) => {
            if (current !== 'current') return current
            return (
              loadedData.terms.find((term) => term.is_current)?.id ?? 'all'
            )
          })
        }
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const selectedAssessments = useMemo(
    () =>
      selectedTerm === 'all'
        ? data.assessments
        : data.assessments.filter((item) => item.term_id === selectedTerm),
    [data.assessments, selectedTerm],
  )

  const selectedAssessmentIds = useMemo(
    () => new Set(selectedAssessments.map((item) => item.id)),
    [selectedAssessments],
  )

  const selectedMarks = useMemo(
    () => data.marks.filter((mark) => selectedAssessmentIds.has(mark.assessment_id)),
    [data.marks, selectedAssessmentIds],
  )

  const selectedTermRow = data.terms.find((term) => term.id === selectedTerm)

  const selectedAttendance = useMemo(() => {
    if (selectedTerm === 'all') return data.attendance
    if (!selectedTermRow) return []

    return data.attendance.filter(
      (record) =>
        record.date >= selectedTermRow.start_date &&
        record.date <= selectedTermRow.end_date,
    )
  }, [data.attendance, selectedTerm, selectedTermRow])

  const analysis = useMemo(() => {
    const classesById = new Map(data.classes.map((item) => [item.id, item]))
    const subjectsById = new Map(data.subjects.map((item) => [item.id, item.name]))
    const studentsById = new Map(data.students.map((item) => [item.id, item]))
    const assessmentsById = new Map(
      selectedAssessments.map((item) => [item.id, item]),
    )

    const studentScores = new Map<string, number[]>()
    const classScores = new Map<string, number[]>()
    const subjectScores = new Map<string, number[]>()

    for (const mark of selectedMarks) {
      const assessment = assessmentsById.get(mark.assessment_id)
      if (!assessment || assessment.max_score <= 0) continue

      const percentage = (Number(mark.score) / Number(assessment.max_score)) * 100
      const student = studentsById.get(mark.student_id)
      if (!student) continue

      studentScores.set(mark.student_id, [
        ...(studentScores.get(mark.student_id) ?? []),
        percentage,
      ])
      classScores.set(student.class_id, [
        ...(classScores.get(student.class_id) ?? []),
        percentage,
      ])
      subjectScores.set(assessment.subject_id, [
        ...(subjectScores.get(assessment.subject_id) ?? []),
        percentage,
      ])
    }

    const average = (scores: number[]) =>
      scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null

    const classPerformance = data.classes.map((classRow) => {
      const roster = data.students.filter(
        (student) => student.class_id === classRow.id,
      )
      const records = selectedAttendance.filter(
        (record) => record.class_id === classRow.id,
      )
      const assignedSubjects = data.classSubjects
        .filter((assignment) => assignment.class_id === classRow.id)
        .map((assignment) => subjectsById.get(assignment.subject_id))
        .filter((name): name is string => Boolean(name))

      return {
        id: classRow.id,
        name: classRow.name,
        studentCount: roster.length,
        average: average(classScores.get(classRow.id) ?? []),
        attendanceRate: attendanceRate(records),
        subjectCount: new Set(assignedSubjects).size,
        isClassTeacher: classRow.teacher_id === user?.id,
      }
    })

    const subjectPerformance = [...subjectScores.entries()]
      .map(([subjectId, scores]) => ({
        name: subjectsById.get(subjectId) ?? 'Subject',
        average: average(scores) ?? 0,
      }))
      .sort((a, b) => b.average - a.average)

    const supportStudents = data.students
      .map((student) => {
        const scores = studentScores.get(student.id) ?? []
        const studentAttendance = selectedAttendance.filter(
          (record) => record.student_id === student.id,
        )
        const averageMark = average(scores)
        const absences = studentAttendance.filter(
          (record) => record.status === 'absent',
        ).length

        if (!((averageMark !== null && averageMark < 60) || absences >= 2)) {
          return null
        }

        const reasons: string[] = []
        if (averageMark !== null && averageMark < 60) {
          reasons.push('Low assessment average')
        }
        if (absences >= 2) reasons.push(`${absences} absences`)

        return {
          id: student.id,
          name: student.full_name,
          className: classesById.get(student.class_id)?.name ?? '—',
          average: averageMark,
          absences,
          reason: reasons.join(' · '),
        }
      })
      .filter((student): student is NonNullable<typeof student> => student !== null)
      .sort((a, b) => {
        if (a.average === null) return 1
        if (b.average === null) return -1
        return a.average - b.average
      })

    const assessmentCoverage = selectedAssessments.map((assessment) => {
      const rosterCount = data.students.filter(
        (student) => student.class_id === assessment.class_id,
      ).length
      const markedStudentIds = new Set(
        selectedMarks
          .filter((mark) => mark.assessment_id === assessment.id)
          .map((mark) => mark.student_id),
      )

      return {
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        date: assessment.date,
        className: classesById.get(assessment.class_id)?.name ?? '—',
        subjectName: subjectsById.get(assessment.subject_id) ?? '—',
        submitted: markedStudentIds.size,
        expected: rosterCount,
        coverage:
          rosterCount > 0
            ? Math.round((markedStudentIds.size / rosterCount) * 100)
            : 0,
      }
    })

    const attendanceByDate = new Map<
      string,
      { present: number; absent: number; late: number; excused: number }
    >()

    for (const record of selectedAttendance) {
      const daily = attendanceByDate.get(record.date) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      }
      daily[record.status] += 1
      attendanceByDate.set(record.date, daily)
    }

    const attendanceTrend = [...attendanceByDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-14)
      .map(([date, counts]) => {
        const eligible = counts.present + counts.absent + counts.late
        return {
          date: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          rate: eligible
            ? Math.round(((counts.present + counts.late) / eligible) * 100)
            : 0,
        }
      })

    const attendanceCounts = selectedAttendance.reduce(
      (counts, record) => {
        counts[record.status] += 1
        return counts
      },
      { present: 0, absent: 0, late: 0, excused: 0 },
    )

    const eligibleAttendance =
      attendanceCounts.present + attendanceCounts.absent + attendanceCounts.late

    const attendanceBreakdown = [
      { name: 'Present', value: attendanceCounts.present },
      { name: 'Late', value: attendanceCounts.late },
      { name: 'Absent', value: attendanceCounts.absent },
      { name: 'Excused', value: attendanceCounts.excused },
    ].filter((item) => item.value > 0)

    const overallAverage = average(
      [...studentScores.values()].flat(),
    )

    const markedPairs = new Set(
      selectedMarks.map((mark) => `${mark.assessment_id}:${mark.student_id}`),
    )
    const expectedPairs = selectedAssessments.reduce(
      (count, assessment) =>
        count +
        data.students.filter(
          (student) => student.class_id === assessment.class_id,
        ).length,
      0,
    )
    const coverageRate = expectedPairs
      ? Math.round((markedPairs.size / expectedPairs) * 100)
      : 0

    const today = new Date().toISOString().slice(0, 10)
    const upcomingAssessments = assessmentCoverage
      .filter((assessment) => assessment.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
    const recentAssessments = assessmentCoverage
      .filter((assessment) => assessment.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)

    return {
      classPerformance,
      subjectPerformance,
      supportStudents: supportStudents.slice(0, 8),
      assessmentCoverage,
      attendanceTrend,
      attendanceBreakdown,
      attendanceRate: eligibleAttendance
        ? Math.round(
            ((attendanceCounts.present + attendanceCounts.late) /
              eligibleAttendance) *
              100,
          )
        : null,
      absenceCount: attendanceCounts.absent,
      lateCount: attendanceCounts.late,
      overallAverage,
      coverageRate,
      upcomingAssessments,
      recentAssessments,
    }
  }, [
    data,
    selectedAssessments,
    selectedAttendance,
    selectedMarks,
    user?.id,
  ])

  const termLabel = (term: TermRow) => {
    const yearName = data.academicYears.find(
      (year) => year.id === term.academic_year_id,
    )?.name
    return yearName ? `${term.name} · ${yearName}` : term.name
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading dashboard…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.full_name}. Here is your teaching overview.
          </p>
        </div>

        <label className="text-sm font-medium text-gray-700">
          Analysis period
          <select
            value={selectedTerm}
            onChange={(event) => setSelectedTerm(event.target.value)}
            className="mt-1 block w-full min-w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All terms</option>
            {data.terms.map((term) => (
              <option key={term.id} value={term.id}>
                {termLabel(term)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load the dashboard.</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={data.students.length}
          icon={<BookOpen size={20} />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Class average"
          value={analysis.overallAverage !== null ? `${analysis.overallAverage}%` : '—'}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Attendance rate"
          value={analysis.attendanceRate !== null ? `${analysis.attendanceRate}%` : '—'}
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

      {data.classes.length === 0 && !error && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          No classes or subjects are assigned to you yet. Ask your headteacher to
          assign your teaching responsibilities.
        </div>
      )}

      {data.classes.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Performance by class</h2>
                <p className="text-sm text-gray-500">
                  Average percentage from recorded marks in the selected period.
                </p>
              </div>
              {analysis.classPerformance.some((item) => item.average !== null) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.classPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Average']} />
                      <Bar dataKey="average" name="Average" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No marks are available for this period.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Performance by subject</h2>
                <p className="text-sm text-gray-500">
                  Results from assessments you created for your assigned classes.
                </p>
              </div>
              {analysis.subjectPerformance.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.subjectPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Average']} />
                      <Bar dataKey="average" name="Average" fill="#0891b2" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No subject marks are available for this period.
                </p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Attendance trend</h2>
                <p className="text-sm text-gray-500">
                  Attendance by recorded school day; excused records are excluded.
                </p>
              </div>
              {analysis.attendanceTrend.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysis.attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Attendance"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No attendance records are available for this period.
                </p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                {analysis.absenceCount} absences · {analysis.lateCount} late arrivals
              </p>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Attendance breakdown</h2>
                <p className="text-sm text-gray-500">
                  Recorded attendance statuses for your classes.
                </p>
              </div>
              {analysis.attendanceBreakdown.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis.attendanceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label
                      >
                        {analysis.attendanceBreakdown.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No attendance records are available for this period.
                </p>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-5">
              <AlertCircle size={18} className="text-amber-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Students needing support</h2>
                <p className="text-sm text-gray-500">
                  Flagged for an average below 60% or at least two recorded absences.
                </p>
              </div>
            </div>
            {analysis.supportStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Student</th>
                      <th className="px-5 py-3 font-medium">Class</th>
                      <th className="px-5 py-3 font-medium">Average</th>
                      <th className="px-5 py-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.supportStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {student.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{student.className}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {student.average === null ? '—' : `${student.average}%`}
                        </td>
                        <td className="px-5 py-3 text-amber-700">{student.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-gray-500">
                No students meet these support indicators for the selected period.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-5">
              <GraduationCap size={19} className="text-indigo-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Class overview</h2>
                <p className="text-sm text-gray-500">
                  Enrolment, subject assignments, performance, and attendance.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Class</th>
                    <th className="px-5 py-3 font-medium">Students</th>
                    <th className="px-5 py-3 font-medium">Subjects</th>
                    <th className="px-5 py-3 font-medium">Average</th>
                    <th className="px-5 py-3 font-medium">Attendance</th>
                    <th className="px-5 py-3 font-medium">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analysis.classPerformance.map((classRow) => (
                    <tr key={classRow.id}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {classRow.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.studentCount}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.subjectCount}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.average === null ? '—' : `${classRow.average}%`}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.attendanceRate === null
                          ? '—'
                          : `${classRow.attendanceRate}%`}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.isClassTeacher ? 'Class teacher' : 'Subject teacher'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AssessmentList
              title="Upcoming assessments"
              assessments={analysis.upcomingAssessments}
              emptyMessage="No upcoming assessments in this period."
            />
            <AssessmentList
              title="Recent assessment coverage"
              assessments={analysis.recentAssessments}
              emptyMessage="No completed assessments in this period."
            />
          </div>

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-600" />
              <h2 className="font-semibold text-gray-900">Mark entry coverage</h2>
            </div>
            <p className="text-sm text-gray-600">
              {analysis.coverageRate}% of expected student marks have been entered
              across the selected assessments.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-sky-600"
                style={{ width: `${analysis.coverageRate}%` }}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

type AssessmentListItem = {
  id: string
  title: string
  type: string
  date: string
  className: string
  subjectName: string
  submitted: number
  expected: number
  coverage: number
}

function AssessmentList({
  title,
  assessments,
  emptyMessage,
}: {
  title: string
  assessments: AssessmentListItem[]
  emptyMessage: string
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {assessments.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {assessments.map((assessment) => (
            <li
              key={assessment.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-800">{assessment.title}</p>
                <p className="text-xs text-gray-500">
                  {assessment.className} · {assessment.subjectName} · {assessment.type}
                </p>
              </div>
              <div className="text-sm text-gray-600">
                {new Date(`${assessment.date}T00:00:00`).toLocaleDateString()} ·{' '}
                {assessment.submitted}/{assessment.expected} marks ({assessment.coverage}%)
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
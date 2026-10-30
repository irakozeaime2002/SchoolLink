import {
  AlertCircle,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
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

interface SchoolClass {
  id: string
  name: string
  academic_year_id: string
  teacher_id: string | null
}

interface Teacher {
  id: string
  full_name: string
}

interface SchoolSubject {
  id: string
  name: string
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
  teacher_id: string
  title: string
  type: string
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
  id: string
  class_id: string
  student_id: string
  teacher_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  created_at: string | null
}

interface TeacherRequest {
  id: string
  teacher_name: string
  teacher_email: string
  created_at: string
}

interface DashboardData {
  academicYears: AcademicYear[]
  terms: Term[]
  classes: SchoolClass[]
  teachers: Teacher[]
  subjects: SchoolSubject[]
  students: Student[]
  assessments: Assessment[]
  marks: Mark[]
  attendance: AttendanceRecord[]
}

const EMPTY_DATA: DashboardData = {
  academicYears: [],
  terms: [],
  classes: [],
  teachers: [],
  subjects: [],
  students: [],
  assessments: [],
  marks: [],
  attendance: [],
}

const ATTENDANCE_COLORS = ['#059669', '#d97706', '#dc2626', '#0891b2']

function getAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function getAttendanceRate(records: AttendanceRecord[]): number | null {
  const countable = records.filter((record) => record.status !== 'excused')
  if (countable.length === 0) return null

  const attended = countable.filter(
    (record) => record.status === 'present' || record.status === 'late',
  ).length

  return Math.round((attended / countable.length) * 100)
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function HeadteacherDashboard() {
  const { user } = useAuth()
  const schoolId = user?.school_id

  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [requests, setRequests] = useState<TeacherRequest[]>([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedTermId, setSelectedTermId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!schoolId) {
        setData(EMPTY_DATA)
        setRequests([])
        setError('Your account is not linked to a school.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setRequestError('')

      try {
        const [
          yearsResult,
          classesResult,
          teachersResult,
          subjectsResult,
          studentsResult,
          requestsResult,
        ] = await Promise.all([
          supabase
            .from('academic_years')
            .select('id, name, start_date, end_date, is_current')
            .eq('school_id', schoolId)
            .order('start_date', { ascending: false }),
          supabase
            .from('classes')
            .select('id, name, academic_year_id, teacher_id')
            .eq('school_id', schoolId),
          supabase
            .from('profiles')
            .select('id, full_name')
            .eq('school_id', schoolId)
            .eq('role', 'teacher')
            .order('full_name'),
          supabase
            .from('subjects')
            .select('id, name')
            .eq('school_id', schoolId)
            .order('name'),
          supabase
            .from('students')
            .select('id, full_name, class_id, status')
            .eq('school_id', schoolId),
          supabase
            .from('teacher_requests')
            .select('id, created_at, full_name, email')
            .eq('school_id', schoolId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ])

        if (yearsResult.error) throw yearsResult.error
        if (classesResult.error) throw classesResult.error
        if (teachersResult.error) throw teachersResult.error
        if (subjectsResult.error) throw subjectsResult.error
        if (studentsResult.error) throw studentsResult.error
        if (requestsResult.error) throw requestsResult.error

        const years = (yearsResult.data ?? []) as AcademicYear[]
        const yearIds = years.map((year) => year.id)

        const termsResult = yearIds.length
          ? await supabase
              .from('terms')
              .select('id, academic_year_id, name, start_date, end_date, is_current')
              .in('academic_year_id', yearIds)
              .order('start_date')
          : { data: [], error: null }

        if (termsResult.error) throw termsResult.error

        const classRows = (classesResult.data ?? []) as SchoolClass[]
        const classIds = classRows.map((classRow) => classRow.id)

        const assessmentsResult = classIds.length
          ? await supabase
              .from('assessments')
              .select(
                'id, class_id, subject_id, term_id, teacher_id, title, type, max_score, date',
              )
              .eq('school_id', schoolId)
              .in('class_id', classIds)
          : { data: [], error: null }

        if (assessmentsResult.error) throw assessmentsResult.error

        const assessmentRows = (assessmentsResult.data ?? []) as Assessment[]
        const assessmentIds = assessmentRows.map((assessment) => assessment.id)

        const [marksResult, attendanceResult] = await Promise.all([
          assessmentIds.length
            ? supabase
                .from('marks')
                .select('id, assessment_id, student_id, score, created_at, updated_at')
                .in('assessment_id', assessmentIds)
            : Promise.resolve({ data: [], error: null }),
          classIds.length
            ? supabase
                .from('attendance')
                .select('id, class_id, student_id, teacher_id, date, status, created_at')
                .eq('school_id', schoolId)
                .in('class_id', classIds)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (marksResult.error) throw marksResult.error
        if (attendanceResult.error) throw attendanceResult.error

        const loadedData: DashboardData = {
          academicYears: years,
          terms: (termsResult.data ?? []) as Term[],
          classes: classRows,
          teachers: (teachersResult.data ?? []) as Teacher[],
          subjects: (subjectsResult.data ?? []) as SchoolSubject[],
          students: (studentsResult.data ?? []) as Student[],
          assessments: assessmentRows,
          marks: (marksResult.data ?? []) as Mark[],
          attendance: (attendanceResult.data ?? []) as AttendanceRecord[],
        }

        const pendingRequests = (requestsResult.data ?? []).map((request) => ({
          id: request.id,
          teacher_name: request.full_name ?? 'Unknown',
          teacher_email: request.email ?? '',
          created_at: request.created_at,
        }))

        if (cancelled) return

        setData(loadedData)
        setRequests(pendingRequests)

        const currentYear =
          years.find((year) => year.is_current) ?? years[0] ?? null

        setSelectedYearId((current) =>
          years.some((year) => year.id === current)
            ? current
            : currentYear?.id ?? '',
        )

        const initialYearId = currentYear?.id
        const currentTerm = loadedData.terms.find(
          (term) => term.academic_year_id === initialYearId && term.is_current,
        )
        setSelectedTermId(currentTerm?.id ?? 'all')
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load school analytics.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [schoolId])

  const selectedYear = data.academicYears.find(
    (year) => year.id === selectedYearId,
  )

  const yearTerms = data.terms.filter(
    (term) => term.academic_year_id === selectedYearId,
  )

  const selectedTerm =
    selectedTermId === 'all'
      ? null
      : yearTerms.find((term) => term.id === selectedTermId) ?? null

  const analytics = useMemo(() => {
    const yearClasses = data.classes.filter(
      (classRow) => classRow.academic_year_id === selectedYearId,
    )
    const yearClassIds = new Set(yearClasses.map((classRow) => classRow.id))
    const activeStudents = data.students.filter(
      (student) =>
        student.status === 'active' && yearClassIds.has(student.class_id),
    )
    const activeStudentIds = new Set(activeStudents.map((student) => student.id))
    const classById = new Map(yearClasses.map((classRow) => [classRow.id, classRow]))
    const teacherById = new Map(data.teachers.map((teacher) => [teacher.id, teacher]))
    const subjectById = new Map(data.subjects.map((subject) => [subject.id, subject]))

    const yearAssessments = data.assessments.filter((assessment) => {
      if (!yearClassIds.has(assessment.class_id)) return false
      return selectedTermId === 'all' || assessment.term_id === selectedTermId
    })

    const assessmentById = new Map(
      yearAssessments.map((assessment) => [assessment.id, assessment]),
    )
    const assessmentIds = new Set(assessmentById.keys())

    // Keep only the newest row if the database contains duplicate marks.
    const newestMarkByPair = new Map<string, Mark>()
    for (const mark of data.marks) {
      if (!assessmentIds.has(mark.assessment_id)) continue
      if (!activeStudentIds.has(mark.student_id)) continue

      const key = `${mark.assessment_id}:${mark.student_id}`
      const existing = newestMarkByPair.get(key)
      const markDate = mark.updated_at ?? mark.created_at ?? ''
      const existingDate = existing?.updated_at ?? existing?.created_at ?? ''

      if (!existing || markDate >= existingDate) {
        newestMarkByPair.set(key, mark)
      }
    }

    const selectedMarks = [...newestMarkByPair.values()]
    const classScores = new Map<string, number[]>()
    const subjectScores = new Map<string, number[]>()
    const studentScores = new Map<string, number[]>()
    const teacherScores = new Map<string, number[]>()

    for (const mark of selectedMarks) {
      const assessment = assessmentById.get(mark.assessment_id)
      if (!assessment || Number(assessment.max_score) <= 0) continue

      const percentage =
        (Number(mark.score) / Number(assessment.max_score)) * 100
      const student = data.students.find((item) => item.id === mark.student_id)
      if (!student) continue

      classScores.set(student.class_id, [
        ...(classScores.get(student.class_id) ?? []),
        percentage,
      ])
      subjectScores.set(assessment.subject_id, [
        ...(subjectScores.get(assessment.subject_id) ?? []),
        percentage,
      ])
      studentScores.set(mark.student_id, [
        ...(studentScores.get(mark.student_id) ?? []),
        percentage,
      ])

      const classTeacherId = classById.get(student.class_id)?.teacher_id
      if (classTeacherId) {
        teacherScores.set(classTeacherId, [
          ...(teacherScores.get(classTeacherId) ?? []),
          percentage,
        ])
      }
    }

    const classPerformance = yearClasses.map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      average: getAverage(classScores.get(classRow.id) ?? []),
      studentCount: activeStudents.filter(
        (student) => student.class_id === classRow.id,
      ).length,
      teacherName: classRow.teacher_id
        ? teacherById.get(classRow.teacher_id)?.full_name ?? 'Assigned teacher'
        : 'Unassigned',
    }))

    const classChartData = classPerformance
      .filter((classRow) => classRow.average !== null)
      .map((classRow) => ({
        className: classRow.name,
        average: classRow.average,
      }))

    const subjectChartData = [...subjectScores.entries()]
      .map(([subjectId, scores]) => ({
        subject: subjectById.get(subjectId)?.name ?? 'Subject',
        average: getAverage(scores) ?? 0,
      }))
      .sort((a, b) => b.average - a.average)

    const teacherChartData = [...teacherScores.entries()]
      .map(([teacherId, scores]) => ({
        teacherName: teacherById.get(teacherId)?.full_name ?? 'Teacher',
        average: getAverage(scores) ?? 0,
      }))
      .sort((a, b) => b.average - a.average)

    const periodAttendance = data.attendance.filter((record) => {
      const classRow = classById.get(record.class_id)
      if (!classRow) return false

      if (selectedTerm) {
        return record.date >= selectedTerm.start_date && record.date <= selectedTerm.end_date
      }

      return Boolean(
        selectedYear &&
          record.date >= selectedYear.start_date &&
          record.date <= selectedYear.end_date,
      )
    })

    const attendanceByDate = new Map<
      string,
      { present: number; absent: number; late: number; excused: number }
    >()

    for (const record of periodAttendance) {
      const count = attendanceByDate.get(record.date) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      }
      count[record.status] += 1
      attendanceByDate.set(record.date, count)
    }

    const attendanceTrend = [...attendanceByDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-20)
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

    const statusCounts = periodAttendance.reduce(
      (counts, record) => {
        counts[record.status] += 1
        return counts
      },
      { present: 0, absent: 0, late: 0, excused: 0 },
    )

    const attendanceBreakdown = [
      { name: 'Present', value: statusCounts.present },
      { name: 'Late', value: statusCounts.late },
      { name: 'Absent', value: statusCounts.absent },
      { name: 'Excused', value: statusCounts.excused },
    ].filter((item) => item.value > 0)

    const attendanceRate = getAttendanceRate(periodAttendance)

    const supportStudents = activeStudents
      .map((student) => {
        const average = getAverage(studentScores.get(student.id) ?? [])
        const absenceCount = periodAttendance.filter(
          (record) =>
            record.student_id === student.id && record.status === 'absent',
        ).length

        if (!((average !== null && average < 60) || absenceCount >= 2)) {
          return null
        }

        const reasons: string[] = []
        if (average !== null && average < 60) reasons.push('Low marks')
        if (absenceCount >= 2) reasons.push(`${absenceCount} absences`)

        return {
          id: student.id,
          name: student.full_name,
          className: classById.get(student.class_id)?.name ?? '—',
          average,
          reasons: reasons.join(' · '),
        }
      })
      .filter((student): student is NonNullable<typeof student> => student !== null)
      .sort((a, b) => {
        if (a.average === null) return 1
        if (b.average === null) return -1
        return a.average - b.average
      })

    const assessmentCoverage = yearAssessments.map((assessment) => {
      const expected = activeStudents.filter(
        (student) => student.class_id === assessment.class_id,
      ).length
      const entered = new Set(
        selectedMarks
          .filter((mark) => mark.assessment_id === assessment.id)
          .map((mark) => mark.student_id),
      ).size

      return {
        id: assessment.id,
        title: assessment.title,
        className: classById.get(assessment.class_id)?.name ?? '—',
        subjectName: subjectById.get(assessment.subject_id)?.name ?? '—',
        date: assessment.date,
        expected,
        entered,
        coverage: expected ? Math.round((entered / expected) * 100) : 0,
      }
    })

    const expectedMarks = yearAssessments.reduce(
      (total, assessment) =>
        total +
        activeStudents.filter(
          (student) => student.class_id === assessment.class_id,
        ).length,
      0,
    )
    const enteredMarks = selectedMarks.length
    const overallCoverage = expectedMarks
      ? Math.min(100, Math.round((enteredMarks / expectedMarks) * 100))
      : null

    const allPercentages = [...classScores.values()].flat()
    const overallAverage = getAverage(allPercentages)

    return {
      classPerformance,
      classChartData,
      subjectChartData,
      teacherChartData,
      attendanceTrend,
      attendanceBreakdown,
      attendanceRate,
      absenceCount: statusCounts.absent,
      lateCount: statusCounts.late,
      supportStudents: supportStudents.slice(0, 10),
      assessmentCoverage: assessmentCoverage
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      overallCoverage,
      overallAverage,
      activeStudents,
      periodAttendance,
    }
  }, [
    data,
    selectedTerm,
    selectedTermId,
    selectedYear,
    selectedYearId,
  ])

  async function handleRequest(
    requestId: string,
    action: 'approve' | 'reject',
  ) {
    setActionLoading(requestId)
    setRequestError('')

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-teacher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ request_id: requestId, action }),
        },
      )

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Request failed with status ${response.status}.`)
      }

      const { data: requestRows, error: requestsLoadError } = await supabase
        .from('teacher_requests')
        .select('id, created_at, full_name, email')
        .eq('school_id', schoolId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (requestsLoadError) throw requestsLoadError

      setRequests(
        (requestRows ?? []).map((request) => ({
          id: request.id,
          teacher_name: request.full_name ?? 'Unknown',
          teacher_email: request.email ?? '',
          created_at: request.created_at,
        })),
      )
    } catch (requestActionError) {
      setRequestError(
        requestActionError instanceof Error
          ? requestActionError.message
          : 'Could not process the teacher request.',
      )
    } finally {
      setActionLoading(null)
    }
  }

  function handleYearChange(yearId: string) {
    setSelectedYearId(yearId)
    const currentTerm = data.terms.find(
      (term) => term.academic_year_id === yearId && term.is_current,
    )
    setSelectedTermId(currentTerm?.id ?? 'all')
  }

  const periodLabel = selectedTerm
    ? `${selectedTerm.name} · ${selectedYear?.name ?? ''}`
    : selectedYear?.name ?? 'Selected academic year'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.full_name}. Analytics for {periodLabel}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-gray-700">
            Academic year
            <select
              value={selectedYearId}
              onChange={(event) => handleYearChange(event.target.value)}
              disabled={data.academicYears.length === 0}
              className="mt-1 block min-w-44 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {data.academicYears.length === 0 && (
                <option value="">No academic years</option>
              )}
              {data.academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Term
            <select
              value={selectedTermId}
              onChange={(event) => setSelectedTermId(event.target.value)}
              disabled={!selectedYearId}
              className="mt-1 block min-w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
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

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load school analytics.</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={loading ? '…' : analytics.activeStudents.length}
          icon={<GraduationCap size={20} />}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Teachers"
          value={loading ? '…' : data.teachers.length}
          icon={<Users size={20} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Classes"
          value={loading ? '…' : analytics.classPerformance.length}
          icon={<BookOpen size={20} />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="School average"
          value={
            loading || analytics.overallAverage === null
              ? loading
                ? '…'
                : '—'
              : `${analytics.overallAverage}%`
          }
          icon={<ClipboardList size={20} />}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      {!loading && !error && !selectedYearId && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          Add an academic year and classes to see school analytics.
        </div>
      )}

      {selectedYearId && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Average by subject</h2>
              <p className="mb-4 text-sm text-gray-500">
                Mark percentages in {periodLabel}.
              </p>

              {analytics.subjectChartData.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, 'Average']}
                      />
                      <Bar
                        dataKey="average"
                        name="Average"
                        fill="#4f46e5"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No marks are recorded for this period.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Average by class</h2>
              <p className="mb-4 text-sm text-gray-500">
                Results across subjects for the selected period.
              </p>

              {analytics.classChartData.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.classChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, 'Average']}
                      />
                      <Bar
                        dataKey="average"
                        name="Average"
                        fill="#059669"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No class results are available for this period.
                </p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Attendance trend</h2>
              <p className="mb-4 text-sm text-gray-500">
                Recorded school days; excused records are excluded.
              </p>

              {analytics.attendanceTrend.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, 'Attendance']}
                      />
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
                {analytics.absenceCount} absences · {analytics.lateCount} late arrivals
              </p>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Attendance breakdown</h2>
              <p className="mb-4 text-sm text-gray-500">
                Recorded attendance statuses for {periodLabel}.
              </p>

              {analytics.attendanceBreakdown.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.attendanceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {analytics.attendanceBreakdown.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">
                  No attendance records are available for this period.
                </p>
              )}

              <p className="text-center text-sm text-gray-600">
                Attendance rate:{' '}
                {analytics.attendanceRate === null
                  ? '—'
                  : `${analytics.attendanceRate}%`}
              </p>
            </section>
          </div>

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Teacher comparison</h2>
            <p className="mb-4 text-sm text-gray-500">
              Average marks for classes led by each class teacher. This is a
              class-level comparison, not a measure of an individual teacher’s
              teaching quality.
            </p>

            {analytics.teacherChartData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.teacherChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="teacherName"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value)}%`, 'Class average']}
                    />
                    <Bar
                      dataKey="average"
                      name="Class average"
                      fill="#0891b2"
                      radius={[0, 5, 5, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-gray-400">
                No class-teacher comparison is available for this period.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-5">
              <AlertCircle size={18} className="text-amber-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Students needing support</h2>
                <p className="text-sm text-gray-500">
                  Flagged for an average below 60% or at least two recorded
                  absences in the selected period.
                </p>
              </div>
            </div>

            {analytics.supportStudents.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Student</th>
                      <th className="px-5 py-3 font-medium">Class</th>
                      <th className="px-5 py-3 font-medium">Average</th>
                      <th className="px-5 py-3 font-medium">Indicator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.supportStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {student.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {student.className}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {student.average === null ? '—' : `${student.average}%`}
                        </td>
                        <td className="px-5 py-3 text-amber-700">
                          {student.reasons}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-gray-500">
                No students meet these support indicators for this period.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-5">
              <BookOpen size={18} className="text-indigo-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Class overview</h2>
                <p className="text-sm text-gray-500">
                  Enrolment, class teacher, and recorded average.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Class</th>
                    <th className="px-5 py-3 font-medium">Active students</th>
                    <th className="px-5 py-3 font-medium">Class teacher</th>
                    <th className="px-5 py-3 font-medium">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.classPerformance.map((classRow) => (
                    <tr key={classRow.id}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {classRow.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.studentCount}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.teacherName}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {classRow.average === null
                          ? '—'
                          : `${classRow.average}%`}
                      </td>
                    </tr>
                  ))}
                  {analytics.classPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                        No classes are assigned to this academic year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-5">
              <ClipboardList size={18} className="text-sky-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Assessment and mark coverage</h2>
                <p className="text-sm text-gray-500">
                  {analytics.overallCoverage === null
                    ? 'No assessments to measure in this period.'
                    : `${analytics.overallCoverage}% of expected student marks are recorded.`}
                </p>
              </div>
            </div>

            {analytics.assessmentCoverage.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Assessment</th>
                      <th className="px-5 py-3 font-medium">Class</th>
                      <th className="px-5 py-3 font-medium">Subject</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Marks entered</th>
                      <th className="px-5 py-3 font-medium">Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.assessmentCoverage.map((assessment) => (
                      <tr key={assessment.id}>
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {assessment.title}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {assessment.className}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {assessment.subjectName}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {formatDate(assessment.date)}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {assessment.entered}/{assessment.expected}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {assessment.coverage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-gray-500">
                No assessments are recorded for this period.
              </p>
            )}
          </section>
        </>
      )}

      {requestError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {requestError}
        </p>
      )}

      {requests.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <h2 className="font-semibold text-gray-800">
              Pending Teacher Requests ({requests.length})
            </h2>
          </div>

          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {request.teacher_name}
                  </p>
                  <p className="text-xs text-gray-500">{request.teacher_email}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(request.created_at.slice(0, 10))}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleRequest(request.id, 'approve')}
                    disabled={actionLoading === request.id}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === request.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => void handleRequest(request.id, 'reject')}
                    disabled={actionLoading === request.id}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && analytics.activeStudents.length === 0 && selectedYearId && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          No active students were found in classes for this academic year.
        </div>
      )}
    </div>
  )
}
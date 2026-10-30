import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import { todayISO } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'

interface Student {
  id: string
  full_name: string
}

interface AttendanceRow {
  id: string
  student_id: string
  status: Status
}

const statusOptions: { value: Status; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
]

const badgeVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'yellow',
  excused: 'blue',
}

export default function AttendancePage() {
  const { user } = useAuth()
  const { classes: assignedClasses, loading: classesLoading } = useTeacherClasses()

  // Attendance is only recorded for classes where this teacher is the class teacher.
  const classes = assignedClasses.filter((classOption) => classOption.isClassTeacher)

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, Status>>({})
  const [recordIds, setRecordIds] = useState<Record<string, string>>({})
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClass('')
      setStudents([])
      setAttendance({})
      setRecordIds({})
      return
    }

    if (!classes.some((classOption) => classOption.id === selectedClass)) {
      setSelectedClass(classes[0].id)
    }
  }, [classes, selectedClass])

  useEffect(() => {
    if (!selectedClass || !selectedDate) {
      setStudents([])
      setAttendance({})
      setRecordIds({})
      setLoadingRecords(false)
      return
    }

    let cancelled = false

    async function loadRecords() {
      setLoadingRecords(true)
      setError('')
      setSaveError('')
      setSaved(false)

      const [studentsResult, attendanceResult] = await Promise.all([
        supabase
          .from('students')
          .select('id, full_name')
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .order('full_name'),
        supabase
          .from('attendance')
          .select('id, student_id, status')
          .eq('class_id', selectedClass)
          .eq('date', selectedDate),
      ])

      if (cancelled) return

      if (studentsResult.error || attendanceResult.error) {
        setError(
          studentsResult.error?.message ??
            attendanceResult.error?.message ??
            'Could not load attendance records.',
        )
        setStudents([])
        setAttendance({})
        setRecordIds({})
        setLoadingRecords(false)
        return
      }

      const loadedStudents = (studentsResult.data ?? []) as Student[]
      const statuses: Record<string, Status> = {}
      const ids: Record<string, string> = {}

      for (const student of loadedStudents) {
        statuses[student.id] = 'present'
      }

      for (const record of (attendanceResult.data ?? []) as AttendanceRow[]) {
        statuses[record.student_id] = record.status
        ids[record.student_id] = record.id
      }

      setStudents(loadedStudents)
      setAttendance(statuses)
      setRecordIds(ids)
      setLoadingRecords(false)
    }

    void loadRecords()

    return () => {
      cancelled = true
    }
  }, [selectedClass, selectedDate])

  async function handleSave() {
    if (!selectedClass || !selectedDate || !user?.id || !user.school_id) {
      setSaveError('Your account or school is not available. Please sign in again.')
      return
    }

    if (!classes.some((classOption) => classOption.id === selectedClass)) {
      setSaveError('Attendance can only be recorded for a class where you are the class teacher.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaved(false)

    const rows = students.map((student) => ({
      school_id: user.school_id,
      class_id: selectedClass,
      student_id: student.id,
      teacher_id: user.id,
      date: selectedDate,
      status: attendance[student.id] ?? 'present',
    }))

    const updates = rows
      .filter((row) => recordIds[row.student_id])
      .map((row) => ({
        ...row,
        id: recordIds[row.student_id],
      }))

    const inserts = rows.filter((row) => !recordIds[row.student_id])

    const [updateResult, insertResult] = await Promise.all([
      updates.length
        ? supabase.from('attendance').upsert(updates, { onConflict: 'id' })
        : Promise.resolve({ error: null }),
      inserts.length
        ? supabase.from('attendance').insert(inserts)
        : Promise.resolve({ error: null }),
    ])

    const saveErrorResult = updateResult.error ?? insertResult.error
    setSaving(false)

    if (saveErrorResult) {
      setSaveError(saveErrorResult.message)
      return
    }

    setSaved(true)

    const { data: refreshedRecords, error: refreshError } = await supabase
      .from('attendance')
      .select('id, student_id, status')
      .eq('class_id', selectedClass)
      .eq('date', selectedDate)

    if (refreshError) {
      setSaveError(
        `Attendance was saved, but refreshing the records failed: ${refreshError.message}`,
      )
      return
    }

    const refreshedIds: Record<string, string> = {}
    for (const record of (refreshedRecords ?? []) as AttendanceRow[]) {
      refreshedIds[record.student_id] = record.id
    }

    setRecordIds(refreshedIds)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a class and date to record or update attendance.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loadingRecords || students.length === 0}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="block text-sm font-medium text-gray-700">
          Class
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            disabled={classesLoading || classes.length === 0}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.length === 0 && (
              <option value="">No class-teacher assignments</option>
            )}
            {classes.map((classOption) => (
              <option key={classOption.id} value={classOption.id}>
                {classOption.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Attendance date
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {saveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </p>
      )}

      {loadingRecords && (
        <p className="text-sm text-gray-400">Loading attendance…</p>
      )}

      {!classesLoading && classes.length === 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          You can record attendance only for classes where you are the class
          teacher. No such classes are currently assigned to you.
        </div>
      )}

      {classes.length > 0 && !loadingRecords && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">
                  Student
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No active students in this class.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => {
                  const status = attendance[student.id] ?? 'present'

                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {student.full_name}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={status}
                          onChange={(event) =>
                            setAttendance((current) => ({
                              ...current,
                              [student.id]: event.target.value as Status,
                            }))
                          }
                          className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge label={status} variant={badgeVariant[status]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
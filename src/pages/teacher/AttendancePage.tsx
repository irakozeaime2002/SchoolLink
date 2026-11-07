import { History, Save, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import { todayISO } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'
type Tab = 'record' | 'history'

interface Student {
  id: string
  full_name: string
}

interface AttendanceRow {
  id: string
  student_id: string
  status: Status
}

interface HistoryRecord {
  student_id: string
  student_name: string
  byDate: Record<string, Status>
}

const statusOptions: { value: Status; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
]

const badgeVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green', absent: 'red', late: 'yellow', excused: 'blue',
}

const SUMMARY_KEYS: { key: Status; label: string; color: string }[] = [
  { key: 'present', label: 'Present', color: 'bg-indigo-50 text-indigo-700' },
  { key: 'absent', label: 'Absent', color: 'bg-red-50 text-red-700' },
  { key: 'late', label: 'Late', color: 'bg-yellow-50 text-yellow-700' },
  { key: 'excused', label: 'Excused', color: 'bg-emerald-50 text-emerald-700' },
]

export default function AttendancePage() {
  const { user } = useAuth()
  const { classes: assignedClasses, loading: classesLoading } = useTeacherClasses()
  const [tab, setTab] = useState<Tab>('record')

  // --- Record tab state ---
  const classes = assignedClasses.filter((c) => c.isClassTeacher)
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
  const [alerting, setAlerting] = useState(false)
  const [alertResult, setAlertResult] = useState<string>('')

  // --- History tab state ---
  const [histClass, setHistClass] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [histRecords, setHistRecords] = useState<HistoryRecord[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [histDates, setHistDates] = useState<string[]>([])

  // Sync record-tab class selection
  useEffect(() => {
    if (classes.length === 0) { setSelectedClass(''); setStudents([]); setAttendance({}); setRecordIds({}); return }
    if (!classes.some((c) => c.id === selectedClass)) setSelectedClass(classes[0].id)
  }, [classes, selectedClass])

  // Sync history-tab class selection
  useEffect(() => {
    if (!classesLoading && assignedClasses.length > 0 && !histClass) setHistClass(assignedClasses[0].id)
  }, [assignedClasses, classesLoading])

  // Load record-tab data
  useEffect(() => {
    if (!selectedClass || !selectedDate) { setStudents([]); setAttendance({}); setRecordIds({}); setLoadingRecords(false); return }
    let cancelled = false
    async function loadRecords() {
      setLoadingRecords(true); setError(''); setSaveError(''); setSaved(false)
      const [studentsResult, attendanceResult] = await Promise.all([
        supabase.from('students').select('id, full_name').eq('class_id', selectedClass).eq('status', 'active').order('full_name'),
        supabase.from('attendance').select('id, student_id, status').eq('class_id', selectedClass).eq('date', selectedDate),
      ])
      if (cancelled) return
      if (studentsResult.error || attendanceResult.error) {
        setError(studentsResult.error?.message ?? attendanceResult.error?.message ?? 'Could not load attendance records.')
        setStudents([]); setAttendance({}); setRecordIds({}); setLoadingRecords(false); return
      }
      const loadedStudents = (studentsResult.data ?? []) as Student[]
      const statuses: Record<string, Status> = {}
      const ids: Record<string, string> = {}
      for (const s of loadedStudents) statuses[s.id] = 'present'
      for (const r of (attendanceResult.data ?? []) as AttendanceRow[]) { statuses[r.student_id] = r.status; ids[r.student_id] = r.id }
      setStudents(loadedStudents); setAttendance(statuses); setRecordIds(ids); setLoadingRecords(false)
    }
    void loadRecords()
    return () => { cancelled = true }
  }, [selectedClass, selectedDate])

  // Load history-tab data
  useEffect(() => {
    if (!histClass) return
    let cancelled = false
    setHistLoading(true)
    async function load() {
      let query = supabase.from('attendance').select('date, status, student_id, students(full_name)')
        .eq('class_id', histClass).order('date', { ascending: true })
      if (from) query = query.gte('date', from)
      if (to) query = query.lte('date', to)
      const { data } = await query
      if (cancelled) return
      const dates = [...new Set((data ?? []).map((r: any) => r.date as string))].sort()
      const byStudent = new Map<string, HistoryRecord>()
      for (const r of (data ?? []) as any[]) {
        if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, { student_id: r.student_id, student_name: r.students?.full_name ?? '—', byDate: {} })
        byStudent.get(r.student_id)!.byDate[r.date] = r.status
      }
      setHistDates(dates)
      setHistRecords(Array.from(byStudent.values()).sort((a, b) => a.student_name.localeCompare(b.student_name)))
      setHistLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [histClass, from, to])

  async function handleSendAlerts() {
    const absentOrLate = students
    if (absentOrLate.length === 0) { setAlertResult('No students to alert.'); return }
    setAlerting(true); setAlertResult('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    // Get parent IDs for these students
    const studentIds = absentOrLate.map(s => s.id)
    const { data: links } = await supabase.from('parent_students').select('parent_id, student_id').in('student_id', studentIds)
    if (!links || links.length === 0) { setAlertResult('No parents linked to absent/late students.'); setAlerting(false); return }
    let sent = 0; let failed = 0
    await Promise.all(links.map(async (link: any) => {
      const student = absentOrLate.find(s => s.id === link.student_id)
      const status = attendance[link.student_id]
      const statusRw: Record<Status, string> = { present: 'ahari', absent: 'adahari', late: 'yaje guhera', excused: 'yemerewe kutitabira' }
      const body = `Your child ${student?.full_name} was marked ${status} on ${selectedDate}.\nUmwana wawe ${student?.full_name} yanditswe ko ${statusRw[status as Status]} ku wa ${selectedDate}.`
      const res = await supabase.functions.invoke('send-sms', { body: { recipient_id: link.parent_id, body } })
      if (res.error || res.data?.error) failed++ ; else sent++
    }))
    setAlertResult(`Alerts sent: ${sent}${failed > 0 ? `, failed: ${failed}` : ''}.`)
    setAlerting(false)
  }

  async function handleSave() {
    if (!selectedClass || !selectedDate || !user?.id || !user.school_id) { setSaveError('Your account or school is not available. Please sign in again.'); return }
    if (!classes.some((c) => c.id === selectedClass)) { setSaveError('Attendance can only be recorded for a class where you are the class teacher.'); return }
    setSaving(true); setSaveError(''); setSaved(false)
    const rows = students.map((s) => ({ school_id: user.school_id, class_id: selectedClass, student_id: s.id, teacher_id: user.id, date: selectedDate, status: attendance[s.id] ?? 'present' }))
    const updates = rows.filter((r) => recordIds[r.student_id]).map((r) => ({ ...r, id: recordIds[r.student_id] }))
    const inserts = rows.filter((r) => !recordIds[r.student_id])
    const [updateResult, insertResult] = await Promise.all([
      updates.length ? supabase.from('attendance').upsert(updates, { onConflict: 'id' }) : Promise.resolve({ error: null }),
      inserts.length ? supabase.from('attendance').insert(inserts) : Promise.resolve({ error: null }),
    ])
    const saveErrorResult = updateResult.error ?? insertResult.error
    setSaving(false)
    if (saveErrorResult) { setSaveError(saveErrorResult.message); return }
    setSaved(true)
    const { data: refreshed, error: refreshError } = await supabase.from('attendance').select('id, student_id, status').eq('class_id', selectedClass).eq('date', selectedDate)
    if (refreshError) { setSaveError(`Attendance was saved, but refreshing failed: ${refreshError.message}`); return }
    const refreshedIds: Record<string, string> = {}
    for (const r of (refreshed ?? []) as AttendanceRow[]) refreshedIds[r.student_id] = r.id
    setRecordIds(refreshedIds)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const histCounts = histRecords.reduce((acc, r) => {
    Object.values(r.byDate).forEach(s => { acc[s] = (acc[s] ?? 0) + 1 })
    return acc
  }, {} as Record<Status, number>)

  const statusCell: Record<Status, string> = {
    present: 'bg-indigo-100 text-indigo-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-yellow-100 text-yellow-700',
    excused: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tab === 'record' ? 'Choose a class and date to record or update attendance.' : 'View all recorded attendance across your classes.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'record' && (
            <>
              <button
                onClick={handleSave}
                disabled={saving || loadingRecords || students.length === 0}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Attendance'}
              </button>
              <button
                onClick={handleSendAlerts}
                disabled={alerting || students.length === 0}
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <Bell size={16} />
                {alerting ? 'Sending…' : 'Alert Parents'}
              </button>
            </>
          )}
          <button
            onClick={() => setTab(tab === 'record' ? 'history' : 'record')}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            <History size={16} />
            {tab === 'record' ? 'View History' : 'Record Attendance'}
          </button>
        </div>
      </div>

      {/* Record tab */}
      {tab === 'record' && (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Class
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={classesLoading || classes.length === 0}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {classes.length === 0 && <option value="">No class-teacher assignments</option>}
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Attendance date
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {saveError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>}
          {alertResult && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{alertResult}</p>}
          {loadingRecords && <p className="text-sm text-gray-400">Loading attendance…</p>}

          {!classesLoading && classes.length === 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
              You can record attendance only for classes where you are the class teacher. No such classes are currently assigned to you.
            </div>
          )}

          {classes.length > 0 && !loadingRecords && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">#</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">Student</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No active students in this class.</td></tr>
                  ) : (
                    students.map((student, index) => {
                      const status = attendance[student.id] ?? 'present'
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-400">{index + 1}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{student.full_name}</td>
                          <td className="px-5 py-3">
                            <select value={status} onChange={(e) => setAttendance((cur) => ({ ...cur, [student.id]: e.target.value as Status }))}
                              className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </td>
                          <td className="px-5 py-3"><Badge label={status} variant={badgeVariant[status]} /></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Class
              <select value={histClass} onChange={(e) => setHistClass(e.target.value)} disabled={classesLoading || assignedClasses.length === 0}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {assignedClasses.length === 0 && <option value="">No classes</option>}
                {assignedClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
          </div>

          {!histLoading && histRecords.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUMMARY_KEYS.map(({ key, label, color }) => (
                <div key={key} className={`rounded-xl p-4 ${color}`}>
                  <p className="text-2xl font-bold">{histCounts[key] ?? 0}</p>
                  <p className="text-sm mt-0.5 opacity-80">{label}</p>
                </div>
              ))}
            </div>
          )}

          {histLoading && <p className="text-sm text-gray-400">Loading…</p>}

          {!histLoading && histRecords.length === 0 && histClass && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
              No attendance records found for the selected filters.
            </div>
          )}

          {!histLoading && histRecords.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Student</th>
                    {histDates.map(d => (
                      <th key={d} className="px-3 py-3 text-center font-medium text-gray-500 whitespace-nowrap">
                        {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {histRecords.map((r) => (
                    <tr key={r.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">{r.student_name}</td>
                      {histDates.map(d => {
                        const s = r.byDate[d]
                        return (
                          <td key={d} className="px-3 py-3 text-center">
                            {s ? (
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${statusCell[s]}`} title={s}>
                                {s[0].toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

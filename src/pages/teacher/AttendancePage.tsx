import { Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { todayISO } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'
interface Student { id: string; full_name: string }
interface ClassOption { id: string; name: string }

const statusOptions: { value: Status; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
]
const badgeVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green', absent: 'red', late: 'yellow', excused: 'blue',
}

export default function AttendancePage() {
  const { user } = useAuth()
  // Local date, so early-morning entries aren't recorded against yesterday (UTC)
  const today = todayISO()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, Status>>({})
  // student_id -> existing attendance row id for today (attendance has no unique key on student+date)
  const [recordIds, setRecordIds] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const loadExisting = useCallback(async (classId: string) => {
    const { data } = await supabase.from('attendance').select('id, student_id, status')
      .eq('class_id', classId).eq('date', today)
    const existing: Record<string, Status> = {}
    const ids: Record<string, string> = {}
    ;(data ?? []).forEach((a: any) => {
      existing[a.student_id] = a.status
      ids[a.student_id] = a.id
    })
    setAttendance((prev) => ({ ...prev, ...existing }))
    setRecordIds(ids)
  }, [today])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('classes').select('id, name').eq('teacher_id', user.id).then(({ data }) => {
      setClasses(data ?? [])
      if (data && data.length > 0) setSelectedClass(data[0].id)
    })
  }, [user])

  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('students').select('id, full_name').eq('class_id', selectedClass).order('full_name')
      if (cancelled) return
      setStudents(data ?? [])
      const defaults: Record<string, Status> = {}
      ;(data ?? []).forEach((s: any) => { defaults[s.id] = 'present' })
      setAttendance(defaults)
      setRecordIds({})
      // Existing attendance for today overrides the defaults
      await loadExisting(selectedClass)
    }
    load()
    return () => { cancelled = true }
  }, [selectedClass, loadExisting])

  async function handleSave() {
    if (!selectedClass || !user?.id) return
    setSaving(true)
    setSaveError('')
    const rows = students.map((s) => ({
      school_id: user.school_id,
      class_id: selectedClass,
      student_id: s.id,
      teacher_id: user.id,
      date: today,
      status: attendance[s.id] ?? 'present',
    }))
    const updates = rows.filter((r) => recordIds[r.student_id]).map((r) => ({ ...r, id: recordIds[r.student_id] }))
    const inserts = rows.filter((r) => !recordIds[r.student_id])

    const [updateResult, insertResult] = await Promise.all([
      updates.length ? supabase.from('attendance').upsert(updates, { onConflict: 'id' }) : Promise.resolve({ error: null }),
      inserts.length ? supabase.from('attendance').insert(inserts) : Promise.resolve({ error: null }),
    ])
    const error = updateResult.error ?? insertResult.error
    // Refresh ids so saving again updates instead of creating duplicates
    await loadExisting(selectedClass)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>
        <button onClick={handleSave} disabled={saving || students.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
          <Save size={16} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        {classes.length === 0 && <option>No classes assigned</option>}
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Student</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No students in this class.</td></tr>
              : students.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                  <td className="px-5 py-3">
                    <select value={attendance[s.id] ?? 'present'}
                      onChange={(e) => setAttendance((prev) => ({ ...prev, [s.id]: e.target.value as Status }))}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <Badge label={attendance[s.id] ?? 'present'} variant={badgeVariant[attendance[s.id] ?? 'present']} />
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

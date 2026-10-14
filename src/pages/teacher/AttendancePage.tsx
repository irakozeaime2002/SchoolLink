import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
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
  const today = new Date().toISOString().split('T')[0]
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, Status>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('classes').select('id, name').eq('teacher_id', user.id).then(({ data }) => {
      setClasses(data ?? [])
      if (data && data.length > 0) setSelectedClass(data[0].id)
    })
  }, [user])

  useEffect(() => {
    if (!selectedClass) return
    supabase.from('students').select('id, full_name').eq('class_id', selectedClass).order('full_name')
      .then(({ data }) => {
        setStudents(data ?? [])
        const defaults: Record<string, Status> = {}
        ;(data ?? []).forEach((s: any) => { defaults[s.id] = 'present' })
        setAttendance(defaults)
      })

    // Load existing attendance for today
    supabase.from('attendance').select('student_id, status').eq('class_id', selectedClass).eq('date', today)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const existing: Record<string, Status> = {}
          data.forEach((a: any) => { existing[a.student_id] = a.status })
          setAttendance((prev) => ({ ...prev, ...existing }))
        }
      })
  }, [selectedClass])

  async function handleSave() {
    if (!selectedClass || !user?.id) return
    setSaving(true)
    const upserts = students.map((s) => ({
      school_id: user.school_id,
      class_id: selectedClass,
      student_id: s.id,
      teacher_id: user.id,
      date: today,
      status: attendance[s.id] ?? 'present',
    }))
    await supabase.from('attendance').upsert(upserts, { onConflict: 'student_id,date' })
    setSaving(false)
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

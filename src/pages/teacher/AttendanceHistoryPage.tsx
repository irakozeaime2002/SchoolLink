import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'

const badgeVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green', absent: 'red', late: 'yellow', excused: 'blue',
}

interface Record {
  id: string
  date: string
  student_name: string
  status: Status
  note: string | null
}

const SUMMARY_KEYS: { key: Status; label: string; color: string }[] = [
  { key: 'present', label: 'Present', color: 'bg-indigo-50 text-indigo-700' },
  { key: 'absent', label: 'Absent', color: 'bg-red-50 text-red-700' },
  { key: 'late', label: 'Late', color: 'bg-yellow-50 text-yellow-700' },
  { key: 'excused', label: 'Excused', color: 'bg-emerald-50 text-emerald-700' },
]

export default function AttendanceHistoryPage() {
  const { classes, loading: classesLoading } = useTeacherClasses()
  const [selectedClass, setSelectedClass] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classesLoading && classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id)
    }
  }, [classes, classesLoading])

  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    setLoading(true)
    async function load() {
      let query = supabase
        .from('attendance')
        .select('id, date, status, note, students(full_name)')
        .eq('class_id', selectedClass)
        .order('date', { ascending: false })
        .order('students(full_name)', { ascending: true })
      if (from) query = query.gte('date', from)
      if (to) query = query.lte('date', to)
      const { data } = await query
      if (cancelled) return
      setRecords((data ?? []).map((r: any) => ({
        id: r.id,
        date: r.date,
        student_name: r.students?.full_name ?? '—',
        status: r.status,
        note: r.note,
      })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [selectedClass, from, to])

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {} as Record<Status, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
        <p className="text-gray-500 text-sm mt-1">View all recorded attendance across your classes.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="block text-sm font-medium text-gray-700">
          Class
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            disabled={classesLoading || classes.length === 0}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.length === 0 && <option value="">No classes</option>}
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          From
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          To
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
      </div>

      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUMMARY_KEYS.map(({ key, label, color }) => (
            <div key={key} className={`rounded-xl p-4 ${color}`}>
              <p className="text-2xl font-bold">{counts[key] ?? 0}</p>
              <p className="text-sm mt-0.5 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && records.length === 0 && selectedClass && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          No attendance records found for the selected filters.
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Student</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{r.student_name}</td>
                  <td className="px-5 py-3"><Badge label={r.status} variant={badgeVariant[r.status]} /></td>
                  <td className="px-5 py-3 text-gray-400">{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

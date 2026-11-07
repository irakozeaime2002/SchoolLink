import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useChild } from '../../context/ChildContext'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'
const statusVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green', absent: 'red', late: 'yellow', excused: 'blue',
}

export default function ParentAttendancePage() {
  const { activeChild, children, setActiveChild, loading: childLoading } = useChild()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeChild) return
    setRecords([])
    setLoading(true)
    supabase.from('attendance').select('date, status, note')
      .eq('student_id', activeChild.student_id)
      .order('date', { ascending: false })
      .then(({ data }) => { setRecords(data ?? []); setLoading(false) })
  }, [activeChild])

  const present = records.filter((r) => r.status === 'present').length
  const absent = records.filter((r) => r.status === 'absent').length
  const late = records.filter((r) => r.status === 'late').length
  const excused = records.filter((r) => r.status === 'excused').length
  const total = records.length
  const rate = total > 0 ? Math.round(((present + excused) / total) * 100) : null

  if (childLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activeChild ? `${activeChild.full_name}'s Attendance` : 'Attendance'}</h1>
          <p className="text-gray-500 text-sm mt-1">{activeChild?.class_name ?? '—'}</p>
        </div>
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button key={c.student_id} onClick={() => setActiveChild(c)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  activeChild?.student_id === c.student_id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {c.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!activeChild && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child linked to your account yet.
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && activeChild && records.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No attendance records yet.
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Attendance Rate', value: rate !== null ? `${rate}%` : '—', color: 'bg-green-50 text-green-700' },
              { label: 'Days Present', value: present, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Days Absent', value: absent, color: 'bg-red-50 text-red-700' },
              { label: 'Late / Excused', value: late + excused, color: 'bg-amber-50 text-amber-700' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          {absent >= 2 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <CalendarCheck size={16} className="mt-0.5 shrink-0" />
              <span>{activeChild!.full_name} has been absent {absent} times. If you have concerns, please contact the school.</span>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.date} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.date}</td>
                    <td className="px-5 py-3"><Badge label={r.status} variant={statusVariant[r.status as Status]} /></td>
                    <td className="px-5 py-3 text-gray-400">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

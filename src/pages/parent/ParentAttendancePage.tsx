import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type Status = 'present' | 'absent' | 'late' | 'excused'
const statusVariant: Record<Status, 'green' | 'red' | 'yellow' | 'blue'> = {
  present: 'green', absent: 'red', late: 'yellow', excused: 'blue',
}

export default function ParentAttendancePage() {
  const { user } = useAuth()
  const [child, setChild] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      const { data: link } = await supabase
        .from('parent_students')
        .select('student_id, students(full_name, classes(name))')
        .eq('parent_id', user!.id)
        .limit(1)
        .single()

      if (!link) { setLoading(false); return }
      setChild(link.students)

      const { data: att } = await supabase
        .from('attendance')
        .select('date, status, note')
        .eq('student_id', link.student_id)
        .order('date', { ascending: false })

      setRecords(att ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const present = records.filter((r) => r.status === 'present').length
  const absent = records.filter((r) => r.status === 'absent').length
  const late = records.filter((r) => r.status === 'late').length
  const excused = records.filter((r) => r.status === 'excused').length
  const total = records.length
  const rate = total > 0 ? Math.round(((present + excused) / total) * 100) : null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{child ? `${child.full_name}'s Attendance` : 'Attendance'}</h1>
        <p className="text-gray-500 text-sm mt-1">{child?.classes?.name ?? '—'}</p>
      </div>

      {!child && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No child linked to your account yet.
        </div>
      )}

      {child && records.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No attendance records yet.
        </div>
      )}

      {records.length > 0 && (
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
              <span>{child.full_name} has been absent {absent} times. If you have concerns, please contact the school.</span>
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

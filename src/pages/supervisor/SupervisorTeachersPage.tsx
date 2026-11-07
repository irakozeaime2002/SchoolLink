import { useEffect, useState } from 'react'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

interface Teacher { id: string; full_name: string; email: string }

export default function SupervisorTeachersPage() {
  const { supervisor } = useSupervisor()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supervisor) return
    supabase.from('profiles')
      .select('id, full_name, email')
      .eq('school_id', supervisor.school_id)
      .eq('role', 'teacher')
      .order('full_name')
      .then(({ data }) => { setTeachers(data ?? []); setLoading(false) })
  }, [supervisor])

  if (!supervisor) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <p className="text-gray-500 text-sm mt-1">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No teachers found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {teachers.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">
                {t.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-800">{t.full_name}</p>
                <p className="text-xs text-gray-500">{t.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

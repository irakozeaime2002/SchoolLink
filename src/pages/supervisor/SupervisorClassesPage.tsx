import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

interface ClassRow { id: string; name: string; teacher_name: string | null; student_count: number }

export default function SupervisorClassesPage() {
  const { supervisor } = useSupervisor()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supervisor) return
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('classes').select('id, name, teacher_id').eq('school_id', sid).order('name'),
      supabase.from('profiles').select('id, full_name').eq('school_id', sid).eq('role', 'teacher'),
      supabase.from('students').select('id, class_id').eq('school_id', sid).eq('status', 'active'),
    ]).then(([{ data: cData }, { data: tData }, { data: sData }]) => {
      const teacherMap = new Map((tData ?? []).map(t => [t.id, t.full_name]))
      const studentCounts = new Map<string, number>()
      ;(sData ?? []).forEach((s: any) => studentCounts.set(s.class_id, (studentCounts.get(s.class_id) ?? 0) + 1))
      setClasses((cData ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        teacher_name: c.teacher_id ? (teacherMap.get(c.teacher_id) ?? null) : null,
        student_count: studentCounts.get(c.id) ?? 0,
      })))
      setLoading(false)
    })
  }, [supervisor])

  if (!supervisor) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-500 text-sm mt-1">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No classes found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {classes.map(c => (
            <button
  key={c.id}
  type="button"
  onClick={() => navigate(`/supervisor/classes/${c.id}`)}
  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
>
  <div>
    <p className="font-medium text-gray-800">{c.name}</p>
    <p className="text-xs text-gray-500">
      {c.teacher_name ?? 'No class teacher assigned'}
    </p>
  </div>
  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
    {c.student_count} student{c.student_count !== 1 ? 's' : ''}
  </span>
</button>
          ))}
        </div>
      )}
    </div>
  )
}

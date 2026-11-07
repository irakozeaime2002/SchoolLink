import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

interface LessonPlan {
  id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  plan_date: string | null
  teacher_id: string
  subjects: { name: string }[] | null
profiles: { full_name: string }[] | null
lesson_plan_classes: {
  class_id: string
  classes: { name: string }[] | null
}[]
}

interface ClassRow { id: string; name: string }
interface TeacherRow { id: string; full_name: string }

function getViewUrl(fileUrl: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return fileUrl
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
}

export default function SupervisorLessonPlansPage() {
  const { supervisor } = useSupervisor()
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTeacher, setFilterTeacher] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  useEffect(() => {
    if (!supervisor) return
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('lesson_plans')
        .select('id, title, description, file_url, file_name, plan_date, teacher_id, subjects(name), profiles(full_name), lesson_plan_classes(class_id, classes(name))')
        .eq('school_id', sid)
        .order('plan_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('school_id', sid).eq('role', 'teacher').order('full_name'),
      supabase.from('classes').select('id, name').eq('school_id', sid).order('name'),
    ]).then(([{ data: pData }, { data: tData }, { data: cData }]) => {
      setPlans((pData ?? []) as LessonPlan[])
      setTeachers(tData ?? [])
      setClasses(cData ?? [])
      setLoading(false)
    })
  }, [supervisor])

  if (!supervisor) return null

  const filtered = plans.filter(p =>
    (filterTeacher === 'all' || p.teacher_id === filterTeacher) &&
    (filterClass === 'all' || p.lesson_plan_classes?.some(lpc => lpc.class_id === filterClass))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lesson Plans</h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="all">All Teachers</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No lesson plans found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {filtered.map(p => (
            <div key={p.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{p.title}</p>
                  {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1">
                   {p.profiles?.[0] && (
  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
    {p.profiles[0].full_name}
  </span>
)}
{p.subjects?.[0] && (
  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
    {p.subjects[0].name}
  </span>
)}
{p.lesson_plan_classes?.map(lpc => (
  <span key={lpc.class_id} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
    {lpc.classes?.[0]?.name}
  </span>
))}
                    {p.plan_date && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{p.plan_date}</span>}
                    <span className="text-xs text-gray-400">{p.file_name}</span>
                  </div>
                </div>
              </div>
              <a href={getViewUrl(p.file_url, p.file_name)} target="_blank" rel="noopener noreferrer"
                className="ml-4 shrink-0 text-xs text-indigo-600 hover:underline">View</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { BookOpen, FileText, GraduationCap, LogOut, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupervisor, type SupervisorSession } from '../../context/SupervisorContext'
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

export default function SupervisorDashboard() {
  const { signOut } = useSupervisor()
  const navigate = useNavigate()

  // Read directly from localStorage so we don't depend on React state timing
  const [supervisor] = useState<SupervisorSession | null>(() => {
    try {
      const raw = localStorage.getItem('sl_supervisor')
      if (!raw) return null
      const parsed: SupervisorSession = JSON.parse(raw)
      if (new Date(parsed.expires_at) < new Date()) {
        localStorage.removeItem('sl_supervisor')
        return null
      }
      return parsed
    } catch { return null }
  })

  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [studentCount, setStudentCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const [filterTeacher, setFilterTeacher] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  useEffect(() => {
    if (!supervisor) { navigate('/supervisor/login'); return }
    const sid = supervisor.school_id
    Promise.all([
      supabase.from('lesson_plans')
        .select('id, title, description, file_url, file_name, plan_date, teacher_id, subjects(name), profiles(full_name), lesson_plan_classes(class_id, classes(name))')
        .eq('school_id', sid)
        .order('plan_date', { ascending: false }),
      supabase.from('classes').select('id, name').eq('school_id', sid).order('name'),
      supabase.from('profiles').select('id, full_name').eq('school_id', sid).eq('role', 'teacher').order('full_name'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', sid).eq('status', 'active'),
    ]).then(([{ data: pData }, { data: cData }, { data: tData }, { count }]) => {
      setPlans((pData ?? []) as LessonPlan[])
      setClasses(cData ?? [])
      setTeachers(tData ?? [])
      setStudentCount(count ?? 0)
      setLoading(false)
    })
  }, [supervisor])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  const filteredPlans = plans.filter(p =>
    (filterTeacher === 'all' || p.teacher_id === filterTeacher) &&
    (filterClass === 'all' || p.lesson_plan_classes?.some(lpc => lpc.class_id === filterClass))
  )

  if (!supervisor) return null

  const expiresAt = new Date(supervisor.expires_at)
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap size={24} className="text-indigo-300" />
          <div>
            <span className="text-lg font-bold tracking-tight">SchoolLink</span>
            <span className="ml-3 text-xs bg-indigo-700 text-indigo-200 px-2 py-0.5 rounded-full">Supervisor View</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{supervisor.name}</p>
            <p className="text-xs text-indigo-300">{supervisor.institution}</p>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-indigo-200 hover:text-white text-sm">
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Expiry notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Access expires {expiresAt.toLocaleString()} ({hoursLeft}h remaining)
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><GraduationCap size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : studentCount}</p>
              <p className="text-xs text-gray-500">Active students</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><Users size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : teachers.length}</p>
              <p className="text-xs text-gray-500">Teachers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg"><BookOpen size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : classes.length}</p>
              <p className="text-xs text-gray-500">Classes</p>
            </div>
          </div>
        </div>

        {/* Lesson Plans */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lesson Plans</h2>
              <p className="text-sm text-gray-500">{filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : filteredPlans.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              No lesson plans found.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {filteredPlans.map(p => (
                <div key={p.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <FileText size={20} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{p.title}</p>
                      {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {p.profiles && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.profiles?.[0]?.full_name}</span>}
                        {p.subjects && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{p.subjects?.[0]?.name}</span>}
                        {p.lesson_plan_classes?.map(lpc => (
                          <span key={lpc.class_id} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{lpc.classes?.[0]?.name}</span>
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
        </section>

        {/* Teachers list */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Teachers</h2>
          {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {teachers.length === 0 ? (
                <p className="p-5 text-sm text-gray-400">No teachers found.</p>
              ) : teachers.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                    {t.full_name.charAt(0)}
                  </div>
                  <p className="text-sm text-gray-800">{t.full_name}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Classes list */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Classes</h2>
          {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-400 col-span-full">No classes found.</p>
              ) : classes.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

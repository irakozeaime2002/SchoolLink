import { BookOpen, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface TeacherRequest { id: string; teacher_name: string; teacher_email: string; created_at: string }

export default function HeadteacherDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 })
  const [subjectData, setSubjectData] = useState<{ subject: string; average: number }[]>([])
  const [classData, setClassData] = useState<{ class: string; average: number }[]>([])
  const [requests, setRequests] = useState<TeacherRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.school_id) return
    async function load() {
      const schoolId = user!.school_id

      const [{ count: students }, { count: teachers }, { count: classes }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      ])
      setStats({ students: students ?? 0, teachers: teachers ?? 0, classes: classes ?? 0 })

      // Subject averages — fetch assessments for this school, then join marks
      const { data: schoolAssessments } = await supabase
        .from('assessments')
        .select('id, max_score, subject:subjects(name)')
        .eq('school_id', schoolId)

      if (schoolAssessments && schoolAssessments.length > 0) {
        const assessmentIds = schoolAssessments.map((a: any) => a.id)
        const { data: marks } = await supabase
          .from('marks')
          .select('score, assessment_id')
          .in('assessment_id', assessmentIds)

        if (marks && marks.length > 0) {
          const assessmentMap = Object.fromEntries(schoolAssessments.map((a: any) => [a.id, a]))
          const bySubject: Record<string, { total: number; count: number }> = {}
          marks.forEach((m: any) => {
            const assessment = assessmentMap[m.assessment_id]
            const name = (assessment?.subject as any)?.name
            if (!name) return
            const pct = (m.score / assessment.max_score) * 100
            if (!bySubject[name]) bySubject[name] = { total: 0, count: 0 }
            bySubject[name].total += pct
            bySubject[name].count += 1
          })
          setSubjectData(Object.entries(bySubject).map(([subject, v]) => ({ subject, average: Math.round(v.total / v.count) })))
        }
      }

      // Class averages
      const { data: classRows } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)

      if (classRows && classRows.length > 0) {
        const classIds = classRows.map((c: any) => c.id)
        const { data: classAssessments } = await supabase
          .from('assessments')
          .select('id, max_score, class_id')
          .in('class_id', classIds)

        if (classAssessments && classAssessments.length > 0) {
          const caIds = classAssessments.map((a: any) => a.id)
          const { data: allMarks } = await supabase
            .from('marks')
            .select('score, assessment_id')
            .in('assessment_id', caIds)

          const caMap = Object.fromEntries(classAssessments.map((a: any) => [a.id, a]))
          const scoreMap: Record<string, { total: number; count: number }> = {}
          for (const m of allMarks ?? []) {
            const a = caMap[m.assessment_id]
            if (!a) continue
            if (!scoreMap[a.class_id]) scoreMap[a.class_id] = { total: 0, count: 0 }
            scoreMap[a.class_id].total += (m.score / a.max_score) * 100
            scoreMap[a.class_id].count += 1
          }
          setClassData(
            classRows
              .filter((c: any) => scoreMap[c.id])
              .map((c: any) => ({ class: c.name, average: Math.round(scoreMap[c.id].total / scoreMap[c.id].count) }))
          )
        }
      }

      setLoading(false)
    }
    async function loadRequests() {
      if (!user?.school_id) return
      const { data } = await supabase
        .from('teacher_requests')
        .select('id, created_at, full_name, email')
        .eq('school_id', user.school_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setRequests((data ?? []).map((r: any) => ({
        id: r.id,
        teacher_name: r.full_name ?? 'Unknown',
        teacher_email: r.email ?? '',
        created_at: r.created_at,
      })))
    }
    load()
    loadRequests()
  }, [user])

  async function handleRequest(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-teacher`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ request_id: requestId, action }),
      }
    )
    setActionLoading(null)
    // Reload requests
    const { data } = await supabase
      .from('teacher_requests')
      .select('id, created_at, full_name, email')
      .eq('school_id', user!.school_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests((data ?? []).map((r: any) => ({
      id: r.id,
      teacher_name: r.full_name ?? 'Unknown',
      teacher_email: r.email ?? '',
      created_at: r.created_at,
    })))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Students" value={loading ? '…' : stats.students} icon={<GraduationCap size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Teachers" value={loading ? '…' : stats.teachers} icon={<Users size={20} />} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Classes" value={loading ? '…' : stats.classes} icon={<BookOpen size={20} />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Average by Subject</h2>
          {subjectData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Average by Class</h2>
          {classData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">No marks recorded yet.</p>
            : <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {!loading && stats.students === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          Get started by adding <strong>classes</strong>, <strong>students</strong> and <strong>teachers</strong> from the sidebar.
        </div>
      )}

      {requests.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <h2 className="text-base font-semibold text-gray-800">Pending Teacher Requests ({requests.length})</h2>
          </div>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.teacher_name}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(r.id, 'approve')}
                    disabled={actionLoading === r.id}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === r.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRequest(r.id, 'reject')}
                    disabled={actionLoading === r.id}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

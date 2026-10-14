import { BookOpen, ChevronRight, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface MyClass { id: string; name: string; subject: string; subjectId: string; students: number; avgScore: number | null }

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 65 ? 'yellow' : 'red'
}

export default function TeacherClassesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<MyClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user!.id)

      if (!cls || cls.length === 0) { setLoading(false); return }

      const result: MyClass[] = []
      for (const c of cls) {
        const { count: students } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', c.id)

        const { data: subjects } = await supabase
          .from('assessments')
          .select('subject_id, subjects(name)')
          .eq('class_id', c.id)
          .eq('teacher_id', user!.id)

        const uniqueSubjects = Array.from(new Map((subjects ?? []).map((s: any) => [s.subject_id, s.subjects?.name])).entries())

        for (const [subjectId, subjectName] of uniqueSubjects) {
          const { data: marks } = await supabase
            .from('marks')
            .select('score, assessments(max_score)')
            .eq('assessments.class_id', c.id)
            .eq('assessments.subject_id', subjectId)

          let avgScore = null
          if (marks && marks.length > 0) {
            const pcts = marks.map((m: any) => (m.score / m.assessments.max_score) * 100)
            avgScore = Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length)
          }

          result.push({ id: c.id, name: c.name, subject: subjectName ?? '—', subjectId, students: students ?? 0, avgScore })
        }

        if (uniqueSubjects.length === 0) {
          result.push({ id: c.id, name: c.name, subject: '—', subjectId: '', students: students ?? 0, avgScore: null })
        }
      }

      setClasses(result)
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-500 text-sm mt-1">{classes.length} class–subject assignments this term</p>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && classes.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No classes assigned yet. Ask your headteacher to assign you to a class.
        </div>
      )}

      <div className="space-y-3">
        {classes.map((c, i) => (
          <div key={`${c.id}-${i}`} onClick={() => navigate('/teacher/marks')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl"><BookOpen size={20} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{c.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600 text-sm">{c.subject}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users size={12} />{c.students} students</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {c.avgScore !== null && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Class avg</p>
                  <Badge label={`${c.avgScore}%`} variant={scoreVariant(c.avgScore)} />
                </div>
              )}
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

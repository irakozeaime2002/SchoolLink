import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Users } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface ClassRow {
  id: string
  name: string
}

interface SubjectAssignment {
  class_id: string
  subject_id: string
}

interface SubjectRow {
  id: string
  name: string
}

interface AssessmentRow {
  id: string
  class_id: string
  subject_id: string
  max_score: number
}

interface MarkRow {
  assessment_id: string
  score: number
}

interface MyClass {
  id: string
  name: string
  subject: string
  subjectId: string
  students: number
  avgScore: number | null
}

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  return score >= 75 ? 'green' : score >= 65 ? 'yellow' : 'red'
}

export default function TeacherClassesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<MyClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setClasses([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('class_subjects')
          .select('class_id, subject_id')
          .eq('teacher_id', user.id)

        if (assignmentError) throw assignmentError

        const assignments = (assignmentData ?? []) as SubjectAssignment[]
        const classIds = [...new Set(assignments.map((item) => item.class_id))]
        const subjectIds = [...new Set(assignments.map((item) => item.subject_id))]

        if (classIds.length === 0 || subjectIds.length === 0) {
          if (!cancelled) setClasses([])
          return
        }

        const [classResult, subjectResult, studentResult, assessmentResult] =
          await Promise.all([
            supabase.from('classes').select('id, name').in('id', classIds),
            supabase.from('subjects').select('id, name').in('id', subjectIds),
            supabase
              .from('students')
              .select('id, class_id')
              .in('class_id', classIds)
              .eq('status', 'active'),
            supabase
              .from('assessments')
              .select('id, class_id, subject_id, max_score')
              .eq('teacher_id', user.id)
              .in('class_id', classIds)
              .in('subject_id', subjectIds),
          ])

        if (classResult.error) throw classResult.error
        if (subjectResult.error) throw subjectResult.error
        if (studentResult.error) throw studentResult.error
        if (assessmentResult.error) throw assessmentResult.error

        const classRows = (classResult.data ?? []) as ClassRow[]
        const subjectRows = (subjectResult.data ?? []) as SubjectRow[]
        const assessmentRows = (assessmentResult.data ?? []) as AssessmentRow[]
        const assessmentIds = assessmentRows.map((assessment) => assessment.id)

        const marksResult = assessmentIds.length
          ? await supabase
              .from('marks')
              .select('assessment_id, score')
              .in('assessment_id', assessmentIds)
          : { data: [], error: null }

        if (marksResult.error) throw marksResult.error

        const marksByAssessment = new Map<string, number[]>()
        for (const mark of (marksResult.data ?? []) as MarkRow[]) {
          const scores = marksByAssessment.get(mark.assessment_id) ?? []
          scores.push(Number(mark.score))
          marksByAssessment.set(mark.assessment_id, scores)
        }

        const classById = new Map(classRows.map((item) => [item.id, item]))
        const subjectById = new Map(subjectRows.map((item) => [item.id, item.name]))
        const studentCounts = new Map<string, number>()

        for (const student of studentResult.data ?? []) {
          studentCounts.set(
            student.class_id,
            (studentCounts.get(student.class_id) ?? 0) + 1,
          )
        }

        const result: MyClass[] = assignments.flatMap((assignment) => {
          const classRow = classById.get(assignment.class_id)
          const subjectName = subjectById.get(assignment.subject_id)

          if (!classRow || !subjectName) return []

          const scores = assessmentRows
            .filter(
              (assessment) =>
                assessment.class_id === assignment.class_id &&
                assessment.subject_id === assignment.subject_id &&
                Number(assessment.max_score) > 0,
            )
            .flatMap((assessment) =>
              (marksByAssessment.get(assessment.id) ?? []).map(
                (score) => (score / Number(assessment.max_score)) * 100,
              ),
            )

          const avgScore = scores.length
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : null

          return [{
            id: classRow.id,
            name: classRow.name,
            subject: subjectName,
            subjectId: assignment.subject_id,
            students: studentCounts.get(classRow.id) ?? 0,
            avgScore,
          }]
        })

        result.sort(
          (a, b) =>
            a.name.localeCompare(b.name) || a.subject.localeCompare(b.subject),
        )

        if (!cancelled) setClasses(result)
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your class assignments.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {classes.length} class and subject assignments
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load classes: {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && !error && classes.length === 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          No subject classes are assigned to you yet. Ask your headteacher to
          assign you a subject in a class.
        </div>
      )}

      <div className="space-y-3">
        {classes.map((classItem) => (
          <button
            key={`${classItem.id}-${classItem.subjectId}`}
            type="button"
            onClick={() =>
              navigate(
                `/teacher/classes/${classItem.id}/subjects/${classItem.subjectId}`,
              )
            }
            className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex items-center gap-4">
              <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <BookOpen size={20} />
              </span>
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {classItem.name}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-gray-600">
                    {classItem.subject}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <Users size={12} />
                  {classItem.students} active students
                </span>
              </span>
            </span>

            <span className="flex items-center gap-3">
              {classItem.avgScore !== null && (
                <span className="text-right">
                  <span className="block text-xs text-gray-400">
                    Subject average
                  </span>
                  <Badge
                    label={`${classItem.avgScore}%`}
                    variant={scoreVariant(classItem.avgScore)}
                  />
                </span>
              )}
              <ChevronRight size={18} className="text-gray-300" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
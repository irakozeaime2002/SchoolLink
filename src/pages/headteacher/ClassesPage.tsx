import { BookOpen, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'

interface ClassRow {
  id: string
  name: string
  teacher_id: string | null
  teacher_name: string | null
  student_count: number
  avg_score: number | null
}

interface Teacher {
  id: string
  full_name: string
}

const emptyForm = { name: '', teacher_id: '' }

function scoreVariant(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 75) return 'green'
  if (score >= 65) return 'yellow'
  return 'red'
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    if (!profile?.school_id) { setLoading(false); return }
    setSchoolId(profile.school_id)

    const { data: year } = await supabase
      .from('academic_years')
      .select('id')
      .eq('school_id', profile.school_id)
      .eq('is_current', true)
      .single()

    setAcademicYearId(year?.id ?? null)

    const [{ data: classRows }, { data: teacherRows }] = await Promise.all([
      supabase
        .from('classes')
        .select('id, name, teacher_id, profiles(full_name), students(id)')
        .eq('school_id', profile.school_id),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('school_id', profile.school_id)
        .eq('role', 'teacher'),
    ])

    if (classRows) {
      // fetch avg scores per class from marks → assessments
      const classIds = classRows.map((c: any) => c.id)
      const { data: marksData } = classIds.length
        ? await supabase
            .from('marks')
            .select('score, assessments!inner(class_id, max_score)')
            .in('assessments.class_id', classIds)
        : { data: [] }

      const scoreMap: Record<string, { total: number; count: number }> = {}
      for (const m of marksData ?? []) {
        const cid = (m.assessments as any).class_id
        if (!scoreMap[cid]) scoreMap[cid] = { total: 0, count: 0 }
        const pct = ((m.score as number) / (m.assessments as any).max_score) * 100
        scoreMap[cid].total += pct
        scoreMap[cid].count += 1
      }

      setClasses(
        classRows.map((c: any) => ({
          id: c.id,
          name: c.name,
          teacher_id: c.teacher_id,
          teacher_name: c.profiles?.full_name ?? null,
          student_count: Array.isArray(c.students) ? c.students.length : 0,
          avg_score: scoreMap[c.id]
            ? Math.round(scoreMap[c.id].total / scoreMap[c.id].count)
            : null,
        }))
      )
    }

    setTeachers(teacherRows ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.name.trim()) { setFormError('Class name is required.'); return }
    if (classes.some((c) => c.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setFormError('A class with this name already exists.')
      return
    }
    if (!academicYearId || !schoolId) { setFormError('No current academic year found.'); return }

    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      name: form.name.trim(),
      teacher_id: form.teacher_id || null,
      school_id: schoolId,
      academic_year_id: academicYearId,
    })
    setSaving(false)

    if (error) { setFormError(error.message); return }
    setForm(emptyForm)
    setFormError('')
    setOpen(false)
    loadData()
  }

  function handleClose() {
    setForm(emptyForm)
    setFormError('')
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 text-sm mt-1">{classes.length} classes</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Class
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading classes…</p>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p>No classes yet. Add your first class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                    <BookOpen size={18} />
                  </div>
                  <span className="text-lg font-bold text-gray-800">{c.name}</span>
                </div>
                {c.avg_score != null
                  ? <Badge label={`${c.avg_score}%`} variant={scoreVariant(c.avg_score)} />
                  : <Badge label="New" variant="blue" />
                }
              </div>

              <div className="space-y-1.5 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{c.student_count} students</span>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Class teacher: {c.teacher_name ?? 'Unassigned'}
                </p>
              </div>

              {c.avg_score != null && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${c.avg_score}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Average score</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Add Class" onClose={handleClose}>
          <div className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. S4 A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
              <select
                value={form.teacher_id}
                onChange={(e) => setForm((p) => ({ ...p, teacher_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Unassigned —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Class'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface Teacher { id: string; full_name: string }

const emptyForm = { name: '', teacher_id: '' }

function scoreVariant(s: number): 'green' | 'yellow' | 'red' {
  return s >= 75 ? 'green' : s >= 65 ? 'yellow' : 'red'
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassRow | null>(null)
  const [deleteClass, setDeleteClass] = useState<ClassRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) { setLoading(false); return }
    setSchoolId(profile.school_id)

    const { data: year } = await supabase.from('academic_years').select('id').eq('school_id', profile.school_id).eq('is_current', true).single()
    setAcademicYearId(year?.id ?? null)

    const [{ data: classRows }, { data: teacherRows }] = await Promise.all([
      supabase.from('classes').select('id, name, teacher_id, profiles(full_name), students(id)').eq('school_id', profile.school_id).order('name'),
      supabase.from('profiles').select('id, full_name').eq('school_id', profile.school_id).eq('role', 'teacher').order('full_name'),
    ])

    if (classRows) {
      const classIds = classRows.map((c: any) => c.id)
      const { data: marksData } = classIds.length
        ? await supabase.from('marks').select('score, assessments!inner(class_id, max_score)').in('assessments.class_id', classIds)
        : { data: [] }

      const scoreMap: Record<string, { total: number; count: number }> = {}
      for (const m of marksData ?? []) {
        const cid = (m.assessments as any).class_id
        if (!scoreMap[cid]) scoreMap[cid] = { total: 0, count: 0 }
        scoreMap[cid].total += ((m.score as number) / (m.assessments as any).max_score) * 100
        scoreMap[cid].count += 1
      }

      setClasses(classRows.map((c: any) => ({
        id: c.id,
        name: c.name,
        teacher_id: c.teacher_id,
        teacher_name: c.profiles?.full_name ?? null,
        student_count: Array.isArray(c.students) ? c.students.length : 0,
        avg_score: scoreMap[c.id] ? Math.round(scoreMap[c.id].total / scoreMap[c.id].count) : null,
      })))
    }

    setTeachers(teacherRows ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditClass(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  function openEdit(c: ClassRow) {
    setEditClass(c)
    setForm({ name: c.name, teacher_id: c.teacher_id ?? '' })
    setFormError('')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Class name is required.'); return }
    setSaving(true)

    if (editClass) {
      const { error } = await supabase.from('classes').update({
        name: form.name.trim(),
        teacher_id: form.teacher_id || null,
      }).eq('id', editClass.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      if (!academicYearId || !schoolId) { setFormError('No current academic year found.'); setSaving(false); return }
      if (classes.some(c => c.name.toLowerCase() === form.name.trim().toLowerCase())) {
        setFormError('A class with this name already exists.'); setSaving(false); return
      }
      const { error } = await supabase.from('classes').insert({
        name: form.name.trim(),
        teacher_id: form.teacher_id || null,
        school_id: schoolId,
        academic_year_id: academicYearId,
      })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setOpen(false)
    setEditClass(null)
    setForm(emptyForm)
    loadData()
  }

  async function handleDelete() {
    if (!deleteClass) return
    setDeleting(true)
    await supabase.from('classes').delete().eq('id', deleteClass.id)
    setDeleting(false)
    setDeleteClass(null)
    loadData()
  }

  function handleClose() {
    setForm(emptyForm)
    setFormError('')
    setEditClass(null)
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 text-sm mt-1">{classes.length} classes</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Add Class
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class Name</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class Teacher</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Students</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Avg Score</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              : classes.length === 0
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No classes yet.</td></tr>
              : classes.map((c, i) => (
                <tr key={c.id} onClick={() => navigate(`/headteacher/classes/${c.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.teacher_name ?? <span className="text-gray-300">Unassigned</span>}</td>
                  <td className="px-5 py-3 text-gray-500">
                    <span className="flex items-center gap-1"><Users size={13} />{c.student_count}</span>
                  </td>
                  <td className="px-5 py-3">
                    {c.avg_score != null
                      ? <Badge label={`${c.avg_score}%`} variant={scoreVariant(c.avg_score)} />
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteClass(c) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {open && (
        <Modal title={editClass ? 'Edit Class' : 'Add Class'} onClose={handleClose}>
          <div className="space-y-4">
            {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. S4 A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher</label>
              <select value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Unassigned —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editClass ? 'Save Changes' : 'Add Class'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteClass && (
        <Modal title="Delete Class" onClose={() => setDeleteClass(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteClass.name}</span>? This will also remove all students assigned to this class.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteClass(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

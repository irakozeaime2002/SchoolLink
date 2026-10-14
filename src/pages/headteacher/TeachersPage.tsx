import { Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'

interface Teacher {
  id: string
  full_name: string
  phone: string | null
  classes: string[]
  subjects: string[]
}

interface ClassOption { id: string; name: string }
interface SubjectOption { id: string; name: string }
interface Assignment { class_id: string; subject_ids: string[] }

const emptyForm = { full_name: '', email: '', password: '', phone: '' }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [assignments, setAssignments] = useState<Assignment[]>([{ class_id: '', subject_ids: [] }])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) { setLoading(false); return }
    setSchoolId(profile.school_id)

    const [{ data: teacherRows }, { data: classRows }, { data: subjectRows }, { data: csRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone').eq('school_id', profile.school_id).eq('role', 'teacher'),
      supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
      supabase.from('subjects').select('id, name').eq('school_id', profile.school_id).order('name'),
      supabase.from('class_subjects').select('teacher_id, classes(name), subjects(name)'),
    ])

    setClasses(classRows ?? [])
    setSubjects(subjectRows ?? [])
    setTeachers(
      (teacherRows ?? []).map((r: any) => {
        const cs = (csRows ?? []).filter((x: any) => x.teacher_id === r.id)
        return {
          id: r.id,
          full_name: r.full_name,
          phone: r.phone,
          classes: [...new Set(cs.map((x: any) => x.classes?.name).filter(Boolean))] as string[],
          subjects: [...new Set(cs.map((x: any) => x.subjects?.name).filter(Boolean))] as string[],
        }
      })
    )
    setLoading(false)
  }

  function openAdd() {
    setEditTeacher(null)
    setForm(emptyForm)
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    setOpen(true)
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t)
    setForm({ full_name: t.full_name, email: '', password: '', phone: t.phone ?? '' })
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    setOpen(true)
  }

  function addAssignmentRow() { setAssignments(p => [...p, { class_id: '', subject_ids: [] }]) }
  function removeAssignmentRow(i: number) { setAssignments(p => p.filter((_, idx) => idx !== i)) }
  function setAssignmentClass(i: number, class_id: string) {
    setAssignments(p => p.map((a, idx) => idx === i ? { class_id, subject_ids: [] } : a))
  }
  function toggleSubject(i: number, subject_id: string) {
    setAssignments(p => p.map((a, idx) => {
      if (idx !== i) return a
      const has = a.subject_ids.includes(subject_id)
      return { ...a, subject_ids: has ? a.subject_ids.filter(s => s !== subject_id) : [...a.subject_ids, subject_id] }
    }))
  }

  async function handleSave() {
    setSaving(true)

    if (editTeacher) {
      if (!form.full_name.trim()) { setFormError('Name is required.'); setSaving(false); return }
      const updates: any = { full_name: form.full_name.trim(), phone: form.phone.trim() || null }
      await supabase.from('profiles').update(updates).eq('id', editTeacher.id)

      // Update assignments if any were set
      const validAssignments = assignments.filter(a => a.class_id && a.subject_ids.length > 0)
      if (validAssignments.length > 0) {
        await supabase.from('class_subjects').delete().eq('teacher_id', editTeacher.id)
        const rows = validAssignments.flatMap(({ class_id, subject_ids }) =>
          subject_ids.map(subject_id => ({ class_id, subject_id, teacher_id: editTeacher.id }))
        )
        await supabase.from('class_subjects').upsert(rows, { onConflict: 'class_id,subject_id' })
      }
    } else {
      if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
        setFormError('Name, email and password are required.'); setSaving(false); return
      }
      const validAssignments = assignments.filter(a => a.class_id && a.subject_ids.length > 0)
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
          assignments: validAssignments,
        }),
      })
      const result = await response.json()
      if (!response.ok) { setFormError(result?.error ?? `Error ${response.status}`); setSaving(false); return }
    }

    setSaving(false)
    setOpen(false)
    setEditTeacher(null)
    setForm(emptyForm)
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    loadData()
  }

  async function handleDelete() {
    if (!deleteTeacher || !schoolId) return
    setDeleting(true)
    await supabase.from('class_subjects').delete().eq('teacher_id', deleteTeacher.id)
    await supabase.from('classes').update({ teacher_id: null }).eq('teacher_id', deleteTeacher.id).eq('school_id', schoolId)
    await supabase.from('profiles').update({ school_id: null }).eq('id', deleteTeacher.id)
    setDeleting(false)
    setDeleteTeacher(null)
    loadData()
  }

  function handleClose() {
    setForm(emptyForm)
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    setEditTeacher(null)
    setOpen(false)
  }

  const filtered = teachers.filter(t => t.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} teachers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Phone</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Classes</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Subjects</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              : filtered.length === 0
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">{search ? 'No teachers match your search.' : 'No teachers yet.'}</td></tr>
              : filtered.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{t.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {t.phone ? <span className="flex items-center gap-1"><Phone size={12} />{t.phone}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.classes.length > 0 ? t.classes.map(c => <Badge key={c} label={c} variant="gray" />) : <span className="text-gray-300">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.length > 0 ? t.subjects.map(s => <Badge key={s} label={s} variant="blue" />) : <span className="text-gray-300">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTeacher(t)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        <Modal title={editTeacher ? 'Edit Teacher' : 'Add Teacher'} onClose={handleClose}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Mr. John Doe" />
            </div>
            {!editTeacher && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="teacher@school.rw" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Min. 6 characters" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+250 788 000 000" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">{editTeacher ? 'Update Assignments' : 'Class & Subject Assignments'}</label>
                <button type="button" onClick={addAssignmentRow} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add class</button>
              </div>
              <div className="space-y-3">
                {assignments.map((a, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <select value={a.class_id} onChange={e => setAssignmentClass(i, e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="">— Select class —</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {assignments.length > 1 && (
                        <button type="button" onClick={() => removeAssignmentRow(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    {a.class_id && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Subjects to teach:</p>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={a.subject_ids.includes(s.id)} onChange={() => toggleSubject(i, s.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              {s.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editTeacher ? 'Save Changes' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTeacher && (
        <Modal title="Remove Teacher" onClose={() => setDeleteTeacher(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to remove <span className="font-semibold text-gray-800">{deleteTeacher.full_name}</span> from your school? Their account will remain but they will lose access.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteTeacher(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

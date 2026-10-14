import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Subject { id: string; name: string; code: string | null }

const emptyForm = { name: '', code: '' }

export default function SubjectsPage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('school_id', user.school_id)
      .order('name')
    setSubjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function openAdd() {
    setEditSubject(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  function openEdit(s: Subject) {
    setEditSubject(s)
    setForm({ name: s.name, code: s.code ?? '' })
    setFormError('')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Subject name is required.'); return }
    setSaving(true)

    if (editSubject) {
      const { error } = await supabase.from('subjects').update({
        name: form.name.trim(),
        code: form.code.trim() || null,
      }).eq('id', editSubject.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('subjects').insert({
        school_id: user!.school_id,
        name: form.name.trim(),
        code: form.code.trim() || null,
      })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setOpen(false)
    setEditSubject(null)
    setForm(emptyForm)
    load()
  }

  async function handleDelete() {
    if (!deleteSubject) return
    setDeleting(true)
    await supabase.from('subjects').delete().eq('id', deleteSubject.id)
    setDeleting(false)
    setDeleteSubject(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">{subjects.length} subjects in your school</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Add Subject
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading…</p>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <BookOpen size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">No subjects yet. Add your first subject.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Subject Name</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subjects.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-500">{s.code ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteSubject(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {open && (
        <Modal title={editSubject ? 'Edit Subject' : 'Add Subject'} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Mathematics" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. MATH101" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editSubject ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteSubject && (
        <Modal title="Delete Subject" onClose={() => setDeleteSubject(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteSubject.name}</span>? This may affect assessments linked to this subject.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteSubject(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
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

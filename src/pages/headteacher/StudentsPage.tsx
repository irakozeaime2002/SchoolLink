import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Student {
  id: string
  full_name: string
  class_id: string
  class_name: string
  date_of_birth: string | null
  status: string
  guardian_name: string | null
  guardian_phone: string | null
}

interface ClassOption { id: string; name: string }

const emptyForm = { full_name: '', class_id: '', date_of_birth: '', status: 'active', guardian_name: '', guardian_phone: '' }

export default function StudentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [open, setOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!user?.school_id) return
    const [{ data }, { data: cls }] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, class_id, date_of_birth, status, guardian_name, guardian_phone')
        .eq('school_id', user.school_id)
        .order('full_name'),
      supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name'),
    ])
    const classMap = Object.fromEntries((cls ?? []).map((c: any) => [c.id, c.name]))
    setStudents((data ?? []).map((s: any) => ({ ...s, class_name: classMap[s.class_id] ?? '—' })))
    setClasses(cls ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const allClassNames = ['All', ...Array.from(new Set(students.map((s) => s.class_name))).sort()]
  const filtered = students.filter((s) => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchClass = classFilter === 'All' || s.class_name === classFilter
    return matchSearch && matchClass
  })

  function openAdd() {
    setEditStudent(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  function openEdit(s: Student, e: React.MouseEvent) {
    e.stopPropagation()
    setEditStudent(s)
    setForm({
      full_name: s.full_name,
      class_id: s.class_id,
      date_of_birth: s.date_of_birth ?? '',
      status: s.status,
      guardian_name: s.guardian_name ?? '',
      guardian_phone: s.guardian_phone ?? '',
    })
    setFormError('')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.class_id) {
      setFormError('Name and class are required.')
      return
    }
    setSaving(true)

    if (editStudent) {
      // Edit
      const { error } = await supabase.from('students').update({
        full_name: form.full_name.trim(),
        class_id: form.class_id,
        date_of_birth: form.date_of_birth || null,
        status: form.status,
        guardian_name: form.guardian_name.trim() || null,
        guardian_phone: form.guardian_phone.trim() || null,
      }).eq('id', editStudent.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      // Add
      const { data: student, error } = await supabase.from('students').insert({
        school_id: user!.school_id,
        full_name: form.full_name.trim(),
        class_id: form.class_id,
        date_of_birth: form.date_of_birth || null,
        status: form.status,
        guardian_name: form.guardian_name.trim() || null,
        guardian_phone: form.guardian_phone.trim() || null,
      }).select('id').single()
      if (error) { setFormError(error.message); setSaving(false); return }

      // Auto-create or link parent — non-blocking
      if (form.guardian_phone.trim() && student?.id) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              student_id: student.id,
              guardian_name: form.guardian_name.trim() || null,
              guardian_phone: form.guardian_phone.trim(),
            }),
          }).catch(() => {})
        })
      }
    }

    setSaving(false)
    setOpen(false)
    setEditStudent(null)
    setForm(emptyForm)
    setFormError('')
    load()
  }

  async function handleDelete() {
    if (!deleteStudent) return
    setDeleting(true)
    await supabase.from('parent_students').delete().eq('student_id', deleteStudent.id)
    await supabase.from('students').delete().eq('id', deleteStudent.id)
    setDeleting(false)
    setDeleteStudent(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students enrolled</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {allClassNames.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Date of Birth</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Guardian</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              : filtered.length === 0
              ? <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No students found.</td></tr>
              : filtered.map((s, i) => (
                <tr key={s.id} onClick={() => navigate(`/headteacher/students/${s.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                  <td className="px-5 py-3"><Badge label={s.class_name} variant="blue" /></td>
                  <td className="px-5 py-3 text-gray-500">{s.date_of_birth ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.guardian_name
                      ? <div><p>{s.guardian_name}</p><p className="text-xs text-gray-400">{s.guardian_phone ?? ''}</p></div>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <Badge label={s.status} variant={s.status === 'active' ? 'green' : s.status === 'transferred' ? 'yellow' : 'gray'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => openEdit(s, e)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteStudent(s) }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
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
        <Modal title={editStudent ? 'Edit Student' : 'Add Student'} onClose={() => { setOpen(false); setFormError('') }}>
          <div className="space-y-4">
            {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Jean Mugisha" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
              <select value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
              <input type="text" value={form.guardian_name} onChange={(e) => setForm((p) => ({ ...p, guardian_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Marie Uwimana" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
              <input type="text" value={form.guardian_phone} onChange={(e) => setForm((p) => ({ ...p, guardian_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+250 788 000 000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="active">Active</option>
                <option value="transferred">Transferred</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setOpen(false); setFormError('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editStudent ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStudent && (
        <Modal title="Delete Student" onClose={() => setDeleteStudent(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteStudent.full_name}</span>? This will also remove all their marks and attendance records.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteStudent(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
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

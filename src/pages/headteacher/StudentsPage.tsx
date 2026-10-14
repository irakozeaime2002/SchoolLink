import { Plus, Search } from 'lucide-react'
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
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('students')
      .select('id, full_name, class_id, date_of_birth, status, guardian_name, guardian_phone, classes(name)')
      .eq('school_id', user.school_id)
      .order('full_name')
    setStudents((data ?? []).map((s: any) => ({ ...s, class_name: s.classes?.name ?? '—' })))

    const { data: cls } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', user.school_id)
      .order('name')
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

  async function handleAdd() {
    if (!form.full_name.trim() || !form.class_id) {
      setFormError('Name and class are required.')
      return
    }
    const { error } = await supabase.from('students').insert({
      school_id: user!.school_id,
      full_name: form.full_name.trim(),
      class_id: form.class_id,
      date_of_birth: form.date_of_birth || null,
      status: form.status,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
    })
    if (error) { setFormError(error.message); return }
    setForm(emptyForm)
    setFormError('')
    setOpen(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students enrolled</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              : filtered.length === 0
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No students found.</td></tr>
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
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Add Student" onClose={() => { setOpen(false); setFormError('') }}>
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
              <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Add Student</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

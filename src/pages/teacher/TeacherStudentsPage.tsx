import { GraduationCap, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface MyClass { id: string; name: string }
interface Student { id: string; full_name: string; date_of_birth: string | null; status: string; class_name: string; guardian_name: string | null; guardian_phone: string | null }

const emptyForm = { full_name: '', date_of_birth: '', class_id: '', guardian_name: '', guardian_phone: '' }

export default function TeacherStudentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myClasses, setMyClasses] = useState<MyClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user?.id) loadData() }, [user])

  async function loadData() {
    setLoading(true)

    // Get classes where this teacher is the class teacher
    const { data: classRows } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', user!.id)
      .order('name')

    const classes = classRows ?? []
    setMyClasses(classes)

    if (classes.length === 0) { setLoading(false); return }

    const classIds = classes.map((c) => c.id)
    const { data: studentRows } = await supabase
      .from('students')
      .select('id, full_name, date_of_birth, status, class_id, guardian_name, guardian_phone')
      .in('class_id', classIds)
      .order('full_name')

    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]))
    setStudents(
      (studentRows ?? []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        date_of_birth: s.date_of_birth,
        status: s.status,
        class_name: classMap[s.class_id] ?? '—',
        guardian_name: s.guardian_name,
        guardian_phone: s.guardian_phone,
      }))
    )
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.full_name.trim()) { setFormError('Full name is required.'); return }
    if (!form.class_id) { setFormError('Please select a class.'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user!.id)
      .single()

    if (!profile?.school_id) { setFormError('Could not determine school.'); return }

    setSaving(true)
    const { error } = await supabase.from('students').insert({
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth || null,
      class_id: form.class_id,
      school_id: profile.school_id,
      status: 'active',
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
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
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students in your class(es)</p>
        </div>
        {myClasses.length > 0 && (
          <button
            onClick={() => { setForm({ ...emptyForm, class_id: myClasses[0].id }); setOpen(true) }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Student
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : myClasses.length === 0 ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          You are not assigned as a class teacher. Ask your headteacher to assign you to a class.
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
          <p>No students yet. Add your first student.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Class</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Date of Birth</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Guardian</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/teacher/students/${s.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-800">{s.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{s.class_name}</td>
                  <td className="px-5 py-3 text-gray-500">{s.date_of_birth ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.guardian_name
                      ? <div><p>{s.guardian_name}</p><p className="text-xs text-gray-400">{s.guardian_phone ?? ''}</p></div>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <Badge label={s.status} variant={s.status === 'active' ? 'green' : 'gray'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Add Student" onClose={handleClose}>
          <div className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Jean Paul Uwimana"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
              <select
                value={form.class_id}
                onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
              <input
                type="text"
                value={form.guardian_name}
                onChange={(e) => setForm((p) => ({ ...p, guardian_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Marie Uwimana"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
              <input
                type="text"
                value={form.guardian_phone}
                onChange={(e) => setForm((p) => ({ ...p, guardian_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+250 788 000 000"
              />
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
                {saving ? 'Saving…' : 'Add Student'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

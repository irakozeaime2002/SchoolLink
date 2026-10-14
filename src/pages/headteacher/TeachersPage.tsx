import { Phone, Plus, Search } from 'lucide-react'
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

// One assignment row: a class + selected subjects
interface Assignment { class_id: string; subject_ids: string[] }

const emptyForm = { full_name: '', email: '', password: '', phone: '' }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [assignments, setAssignments] = useState<Assignment[]>([{ class_id: '', subject_ids: [] }])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

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

    const [{ data: teacherRows }, { data: classRows }, { data: subjectRows }, { data: csRows }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('school_id', profile.school_id)
        .eq('role', 'teacher'),
      supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .order('name'),
      supabase
        .from('subjects')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .order('name'),
      supabase
        .from('class_subjects')
        .select('teacher_id, classes(name), subjects(name)'),
    ])

    setClasses(classRows ?? [])
    setSubjects(subjectRows ?? [])

    setTeachers(
      (teacherRows ?? []).map((r: any) => {
        const cs = (csRows ?? []).filter((x: any) => x.teacher_id === r.id)
        const classNames = [...new Set(cs.map((x: any) => x.classes?.name).filter(Boolean))] as string[]
        const subjectNames = [...new Set(cs.map((x: any) => x.subjects?.name).filter(Boolean))] as string[]
        return { id: r.id, full_name: r.full_name, phone: r.phone, classes: classNames, subjects: subjectNames }
      })
    )
    setLoading(false)
  }

  function addAssignmentRow() {
    setAssignments((prev) => [...prev, { class_id: '', subject_ids: [] }])
  }

  function removeAssignmentRow(i: number) {
    setAssignments((prev) => prev.filter((_, idx) => idx !== i))
  }

  function setAssignmentClass(i: number, class_id: string) {
    setAssignments((prev) => prev.map((a, idx) => idx === i ? { class_id, subject_ids: [] } : a))
  }

  function toggleSubject(i: number, subject_id: string) {
    setAssignments((prev) => prev.map((a, idx) => {
      if (idx !== i) return a
      const has = a.subject_ids.includes(subject_id)
      return { ...a, subject_ids: has ? a.subject_ids.filter((s) => s !== subject_id) : [...a.subject_ids, subject_id] }
    }))
  }

  async function handleAdd() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Name, email and password are required.')
      return
    }
    const validAssignments = assignments.filter((a) => a.class_id && a.subject_ids.length > 0)
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`,
      {
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
      }
    )
    const result = await response.json()
    setSaving(false)
    if (!response.ok) {
      setFormError(result?.error ?? result?.message ?? `Error ${response.status}`)
      return
    }
    setForm(emptyForm)
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    setOpen(false)
    loadData()
  }

  function handleClose() {
    setForm(emptyForm)
    setAssignments([{ class_id: '', subject_ids: [] }])
    setFormError('')
    setOpen(false)
  }

  const filtered = teachers.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} teachers registered</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Teacher
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading teachers…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Classes</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{t.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {t.phone
                      ? <span className="flex items-center gap-1"><Phone size={12} />{t.phone}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.classes.length > 0
                        ? t.classes.map((c) => <Badge key={c} label={c} variant="gray" />)
                        : <span className="text-gray-300">—</span>
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.length > 0
                        ? t.subjects.map((s) => <Badge key={s} label={s} variant="blue" />)
                        : <span className="text-gray-300">—</span>
                      }
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    {search ? 'No teachers match your search.' : 'No teachers yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Add Teacher" onClose={handleClose}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>
            )}

            {/* Basic info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Mr. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="teacher@school.rw"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+250 788 000 000"
              />
            </div>

            {/* Class + Subject assignments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Class & Subject Assignments</label>
                <button
                  type="button"
                  onClick={addAssignmentRow}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add another class
                </button>
              </div>

              <div className="space-y-3">
                {assignments.map((a, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <select
                        value={a.class_id}
                        onChange={(e) => setAssignmentClass(i, e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">— Select class —</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {assignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAssignmentRow(i)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {a.class_id && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Subjects to teach:</p>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((s) => (
                            <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={a.subject_ids.includes(s.id)}
                                onChange={() => toggleSubject(i, s.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
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
              <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

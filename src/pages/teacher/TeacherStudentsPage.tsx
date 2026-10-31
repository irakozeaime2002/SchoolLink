import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface MyClass {
  id: string
  name: string
}

interface Student {
  id: string
  full_name: string
  class_id: string
  date_of_birth: string | null
  status: string
  class_name: string
  guardian_name: string | null
  guardian_phone: string | null
}

const emptyForm = {
  full_name: '',
  date_of_birth: '',
  class_id: '',
  guardian_name: '',
  guardian_phone: '',
}

export default function TeacherStudentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myClasses, setMyClasses] = useState<MyClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [open, setOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user?.id) {
      void loadData()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  async function loadData() {
    if (!user?.id) return

    setLoading(true)
    setPageError('')

    const { data: classRows, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', user.id)
      .order('name')

    if (classError) {
      setPageError(`Could not load your classes: ${classError.message}`)
      setMyClasses([])
      setStudents([])
      setLoading(false)
      return
    }

    const classes = classRows ?? []
    setMyClasses(classes)

    if (classes.length === 0) {
      setStudents([])
      setLoading(false)
      return
    }

    const classIds = classes.map((classRow) => classRow.id)
    const { data: studentRows, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, date_of_birth, status, class_id, guardian_name, guardian_phone')
      .in('class_id', classIds)
      .order('full_name')

    if (studentError) {
      setPageError(`Could not load students: ${studentError.message}`)
      setStudents([])
      setLoading(false)
      return
    }

    const classNames = new Map(classes.map((classRow) => [classRow.id, classRow.name]))

    setStudents(
      (studentRows ?? []).map((student) => ({
        id: student.id,
        full_name: student.full_name,
        class_id: student.class_id,
        date_of_birth: student.date_of_birth,
        status: student.status,
        class_name: classNames.get(student.class_id) ?? '—',
        guardian_name: student.guardian_name,
        guardian_phone: student.guardian_phone,
      })),
    )
    setLoading(false)
  }

  function openAdd() {
    setEditStudent(null)
    setForm({ ...emptyForm, class_id: myClasses[0]?.id ?? '' })
    setFormError('')
    setOpen(true)
  }

  function openEdit(student: Student, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setEditStudent(student)
    setForm({
      full_name: student.full_name,
      date_of_birth: student.date_of_birth ?? '',
      class_id: student.class_id,
      guardian_name: student.guardian_name ?? '',
      guardian_phone: student.guardian_phone ?? '',
    })
    setFormError('')
    setOpen(true)
  }

  function handleClose() {
    setForm(emptyForm)
    setFormError('')
    setEditStudent(null)
    setOpen(false)
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      setFormError('Full name is required.')
      return
    }

    if (!form.class_id) {
      setFormError('Please select a class.')
      return
    }

    setSaving(true)
    setFormError('')

    const studentValues = {
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth || null,
      class_id: form.class_id,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
    }

    if (editStudent) {
      const { data, error } = await supabase
        .from('students')
        .update(studentValues)
        .eq('id', editStudent.id)
        .select('id')
        .maybeSingle()

      setSaving(false)

      if (error) {
        setFormError(`Could not update student: ${error.message}`)
        return
      }

      if (!data) {
        setFormError('Student was not updated. Check that they are still in your class.')
        return
      }
    } else {
      if (!user?.school_id) {
        setSaving(false)
        setFormError('Your account is not linked to a school.')
        return
      }

      const { error } = await supabase.from('students').insert({
        ...studentValues,
        school_id: user.school_id,
        status: 'active',
      })

      setSaving(false)

      if (error) {
        setFormError(`Could not add student: ${error.message}`)
        return
      }
    }

    handleClose()
    await loadData()
  }

  async function handleDelete() {
    if (!deleteStudent) return

    setDeleting(true)
    setFormError('')

    const { data, error } = await supabase
      .from('students')
      .delete()
      .eq('id', deleteStudent.id)
      .select('id')
      .maybeSingle()

    setDeleting(false)

    if (error) {
      setFormError(`Could not delete student: ${error.message}`)
      return
    }

    if (!data) {
      setFormError('Student was not deleted. Check that they are still in your class.')
      return
    }

    setDeleteStudent(null)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            {students.length} students in your class(es)
          </p>
        </div>

        {myClasses.length > 0 && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Student
          </button>
        )}
      </div>

      {pageError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : myClasses.length === 0 ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          You are not assigned as a class teacher. Ask your headteacher to assign you to a class.
        </div>
      ) : students.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
          <p>No students yet. Add your first student.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Class</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Date of Birth</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Guardian</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/teacher/students/${student.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {student.full_name}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{student.class_name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {student.date_of_birth ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {student.guardian_name ? (
                      <div>
                        <p>{student.guardian_name}</p>
                        <p className="text-xs text-gray-400">
                          {student.guardian_phone ?? ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      label={student.status}
                      variant={student.status === 'active' ? 'green' : 'gray'}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${student.full_name}`}
                        onClick={(event) => openEdit(student, event)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${student.full_name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setFormError('')
                          setDeleteStudent(student)
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          title={editStudent ? 'Edit Student' : 'Add Student'}
          onClose={handleClose}
        >
          <div className="space-y-4">
            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, full_name: event.target.value }))
                }
                className="input"
                placeholder="e.g. Jean Paul Uwimana"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Class <span className="text-red-500">*</span>
              </span>
              <select
                value={form.class_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, class_id: event.target.value }))
                }
                className="input"
              >
                {myClasses.map((classRow) => (
                  <option key={classRow.id} value={classRow.id}>
                    {classRow.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Date of Birth
              </span>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date_of_birth: event.target.value }))
                }
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Guardian Name
              </span>
              <input
                type="text"
                value={form.guardian_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guardian_name: event.target.value }))
                }
                className="input"
                placeholder="e.g. Marie Uwimana"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Guardian Phone
              </span>
              <input
                type="tel"
                value={form.guardian_phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guardian_phone: event.target.value }))
                }
                className="input"
                placeholder="+250 788 000 000"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editStudent ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteStudent && (
        <Modal
          title="Delete Student"
          onClose={() => {
            if (!deleting) {
              setDeleteStudent(null)
              setFormError('')
            }
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Permanently delete <strong>{deleteStudent.full_name}</strong>? This
              cannot be undone. If related school records prevent deletion, an
              error will be shown and the student will remain.
            </p>

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteStudent(null)
                  setFormError('')
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
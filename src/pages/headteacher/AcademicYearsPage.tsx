import { CalendarDays, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

const emptyForm = { name: '', start_date: '', end_date: '' }

export default function AcademicYearsPage() {
  const { user } = useAuth()
  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_current')
      .eq('school_id', user.school_id)
      .order('start_date', { ascending: false })
    setYears(data ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      setFormError('All fields are required.')
      return
    }
    if (form.end_date <= form.start_date) {
      setFormError('End date must be after start date.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('academic_years').insert({
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      school_id: user!.school_id,
      is_current: years.length === 0, // first year is auto-current
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setForm(emptyForm)
    setFormError('')
    setOpen(false)
    load()
  }

  async function setAsCurrent(id: string) {
    if (!user?.school_id) return
    // unset all, then set selected
    await supabase.from('academic_years').update({ is_current: false }).eq('school_id', user.school_id)
    await supabase.from('academic_years').update({ is_current: true }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <p className="text-gray-500 text-sm mt-1">Set the current academic year before adding classes</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Year
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : years.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
          <p>No academic years yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Start</th>
                <th className="px-5 py-3 text-left">End</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{y.name}</td>
                  <td className="px-5 py-3 text-gray-500">{y.start_date}</td>
                  <td className="px-5 py-3 text-gray-500">{y.end_date}</td>
                  <td className="px-5 py-3">
                    {y.is_current
                      ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Current</span>
                      : <span className="text-gray-400 text-xs">Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!y.is_current && (
                      <button
                        onClick={() => setAsCurrent(y.id)}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Set as Current
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Add Academic Year" onClose={() => { setOpen(false); setForm(emptyForm); setFormError('') }}>
          <div className="space-y-4">
            {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 2024-2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setOpen(false); setForm(emptyForm); setFormError('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Year'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

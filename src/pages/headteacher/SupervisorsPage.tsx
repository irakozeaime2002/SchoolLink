import { Copy, Plus, Trash2, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Supervisor {
  id: string
  name: string
  institution: string
  access_code: string
  expires_at: string
  created_at: string
}

function generateCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const all = letters + digits
  // Guarantee at least 3 letters and 3 digits, fill rest randomly
  const parts = [
    ...Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]),
    ...Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * digits.length)]),
    ...Array.from({ length: 2 }, () => all[Math.floor(Math.random() * all.length)]),
  ]
  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]]
  }
  return parts.join('')
}

export default function SupervisorsPage() {
  const { user } = useAuth()
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [days, setDays] = useState(7)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('supervisors')
      .select('id, name, institution, access_code, expires_at, created_at')
      .eq('school_id', user.school_id)
      .order('created_at', { ascending: false })
    setSupervisors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.school_id])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.school_id) return
    setError('')
    setSaving(true)
    const code = generateCode()
    const expires = new Date(Date.now() + days * 86400_000).toISOString()
    const { error: err } = await supabase.from('supervisors').insert({
      school_id: user.school_id,
      name: name.trim(),
      institution: institution.trim(),
      access_code: code,
      expires_at: expires,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setName('')
    setInstitution('')
    setDays(7)
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('supervisors').delete().eq('id', id)
    setSupervisors(prev => prev.filter(s => s.id !== id))
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function isExpired(expires_at: string) {
    return new Date(expires_at) < new Date()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supervisors</h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate temporary access codes for external supervisors visiting your school.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={16} /> Add Supervisor
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Supervisor name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
            <input
              required
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. Ministry of Education"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access valid for</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Generating…' : 'Generate access code'}
            </button>
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        </form>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : supervisors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No supervisors added yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {supervisors.map(s => {
            const expired = isExpired(s.expires_at)
            return (
              <div key={s.id} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <UserCheck size={20} className={expired ? 'text-gray-300' : 'text-indigo-400'} />
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.institution}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Expires: {new Date(s.expires_at).toLocaleString()}
                      {expired && <span className="ml-2 text-red-500 font-medium">Expired</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`font-mono text-lg font-bold tracking-widest px-3 py-1.5 rounded-lg ${expired ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700'}`}>
                    {s.access_code}
                  </div>
                  <button
                    onClick={() => copyCode(s.access_code)}
                    title="Copy code"
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Copy size={16} />
                  </button>
                  {copied === s.access_code && <span className="text-xs text-green-600">Copied!</span>}
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Delete"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

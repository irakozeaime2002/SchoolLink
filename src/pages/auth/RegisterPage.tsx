import { GraduationCap, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Tab = 'headteacher' | 'teacher'
interface School { id: string; name: string; code: string }

const emptyHT = { full_name: '', email: '', password: '', phone: '', school_name: '', school_code: '', school_address: '' }
const emptyT = { full_name: '', email: '', password: '', phone: '', school_id: '', school_name: '' }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('headteacher')
  const [htForm, setHtForm] = useState(emptyHT)
  const [tForm, setTForm] = useState(emptyT)
  const [schools, setSchools] = useState<School[]>([])
  const [schoolSearch, setSchoolSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('schools').select('id, name, code').order('name').then(({ data }) => setSchools(data ?? []))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(schoolSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const body = tab === 'headteacher'
      ? { type: 'headteacher', ...htForm }
      : { type: 'teacher', full_name: tForm.full_name, email: tForm.email, password: tForm.password, phone: tForm.phone, school_id: tForm.school_id }

    const pw = tab === 'headteacher' ? htForm.password : tForm.password
    if (pw.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }
    if (tab === 'teacher' && !tForm.school_id) {
      setError('Please select a school.')
      setLoading(false)
      return
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      }
    )
    const result = await res.json()
    setLoading(false)

    if (!res.ok) { setError(result?.error ?? `Error ${res.status}`); return }

    if (tab === 'headteacher') {
      setSuccess('School registered! You can now sign in.')
    } else {
      setSuccess('Request sent! Wait for the headteacher to approve your access.')
    }
    setHtForm(emptyHT)
    setTForm(emptyT)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate('/')} className="flex flex-col items-center group">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl mb-3 group-hover:bg-indigo-700 transition-colors">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SchoolLink</h1>
          </button>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setTab('headteacher'); setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'headteacher' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Register School
            </button>
            <button
              onClick={() => { setTab('teacher'); setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'teacher' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Join as Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}

            {/* Common fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" required
                value={tab === 'headteacher' ? htForm.full_name : tForm.full_name}
                onChange={(e) => tab === 'headteacher' ? setHtForm((p) => ({ ...p, full_name: e.target.value })) : setTForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" required
                value={tab === 'headteacher' ? htForm.email : tForm.email}
                onChange={(e) => tab === 'headteacher' ? setHtForm((p) => ({ ...p, email: e.target.value })) : setTForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@school.rw" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" required
                value={tab === 'headteacher' ? htForm.password : tForm.password}
                onChange={(e) => tab === 'headteacher' ? setHtForm((p) => ({ ...p, password: e.target.value })) : setTForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel"
                value={tab === 'headteacher' ? htForm.phone : tForm.phone}
                onChange={(e) => tab === 'headteacher' ? setHtForm((p) => ({ ...p, phone: e.target.value })) : setTForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+250 788 000 000" />
            </div>

            {/* Headteacher: school info */}
            {tab === 'headteacher' && (
              <>
                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">School Information</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={htForm.school_name}
                    onChange={(e) => setHtForm((p) => ({ ...p, school_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. GS Kigali" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Code <span className="text-red-500">*</span></label>
                  <input type="text" required value={htForm.school_code}
                    onChange={(e) => setHtForm((p) => ({ ...p, school_code: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. GSK001 (must be unique)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                  <input type="text" value={htForm.school_address}
                    onChange={(e) => setHtForm((p) => ({ ...p, school_address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. KG 123 St, Kigali" />
                </div>
              </>
            )}

            {/* Teacher: school picker */}
            {tab === 'teacher' && (
              <>
                <hr className="border-gray-100" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Select Your School</p>
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School <span className="text-red-500">*</span></label>
                  <div
                    onClick={() => setShowDropdown(true)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <span className={tForm.school_name ? 'text-gray-800' : 'text-gray-400'}>
                      {tForm.school_name || 'Search and select a school…'}
                    </span>
                    <Search size={14} className="text-gray-400 shrink-0" />
                  </div>

                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          autoFocus
                          value={schoolSearch}
                          onChange={(e) => setSchoolSearch(e.target.value)}
                          placeholder="Search by name or code…"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredSchools.length === 0
                          ? <p className="text-sm text-gray-400 text-center py-4">No schools found.</p>
                          : filteredSchools.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { setTForm((p) => ({ ...p, school_id: s.id, school_name: `${s.name} (${s.code})` })); setShowDropdown(false); setSchoolSearch('') }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors border-b border-gray-50"
                            >
                              <p className="font-medium text-gray-800">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.code}</p>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Your request will be sent to the headteacher for approval before you can access the school.
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Submitting…' : tab === 'headteacher' ? 'Register School' : 'Send Request'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-indigo-600 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

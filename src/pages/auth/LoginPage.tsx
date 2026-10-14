import { useAuth } from '../../context/AuthContext'
import { GraduationCap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Tab = 'staff' | 'parent'

export default function LoginPage() {
  const { loginError } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('staff')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (loginError) setLoading(false) }, [loginError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (tab === 'staff') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      // Navigation handled by AuthContext
    } else {
      // Parent: look up email by phone via Edge Function
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-email-by-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ phone: phone.trim() }),
        }
      )
      const result = await res.json()
      if (!res.ok) { setError(result?.error ?? 'Phone number not found'); setLoading(false); return }

      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password })
      if (error) { setError(error.message); setLoading(false) }
      // Navigation handled by AuthContext
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate('/')} className="flex flex-col items-center group">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl mb-3 group-hover:bg-indigo-700 transition-colors">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SchoolLink</h1>
          </button>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setTab('staff'); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'staff' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Staff
            </button>
            <button
              onClick={() => { setTab('parent'); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'parent' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Parent
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {(error || loginError) && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error || loginError}</div>
            )}

            {tab === 'staff' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@school.rw"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+250 788 000 000"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {tab === 'parent' && (
              <p className="text-xs text-center text-gray-400">
                Use the phone number registered by your school
              </p>
            )}

            <p className="text-center text-sm text-gray-500">
              New school or teacher?{' '}
              <button type="button" onClick={() => navigate('/register')} className="text-indigo-600 hover:underline font-medium">
                Register here
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

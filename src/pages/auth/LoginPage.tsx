import { GraduationCap } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type Tab = 'staff' | 'parent'

export default function LoginPage() {
  const { loginError } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('staff')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (loginError) setLoading(false)
  }, [loginError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const value = identifier.trim()
      let loginEmail = value

      if (tab === 'parent' && !value.includes('@')) {
        const { data, error: lookupError } = await supabase.functions.invoke(
          'get-email-by-phone',
          { body: { phone: value } },
        )

        if (lookupError) throw lookupError

        if (typeof data?.email !== 'string' || !data.email) {
          throw new Error('No parent account was found with that phone number.')
        }

        loginEmail = data.email
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (signInError) throw signInError

      // AuthContext handles navigation after a successful sign-in.
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to sign in. Please try again.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <button
            onClick={() => navigate('/')}
            className="group flex flex-col items-center"
            type="button"
          >
            <div className="mb-3 rounded-2xl bg-indigo-600 p-3 text-white transition-colors group-hover:bg-indigo-700">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SchoolLink</h1>
          </button>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => {
                setTab('staff')
                setError('')
                setIdentifier('')
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'staff'
                  ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              type="button"
            >
              Staff
            </button>
            <button
              onClick={() => {
                setTab('parent')
                setError('')
                setIdentifier('')
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'parent'
                  ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              type="button"
            >
              Parent
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-8">
            {(error || loginError) && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error || loginError}
              </div>
            )}

            <div>
              <label
                htmlFor="login-identifier"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {tab === 'staff' ? 'Email' : 'Email or phone number'}
              </label>
              <input
                id="login-identifier"
                type={tab === 'staff' ? 'email' : 'text'}
                required
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={
                  tab === 'staff'
                    ? 'you@school.rw'
                    : 'parent@example.com or +250 788 000 000'
                }
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {tab === 'parent' && (
              <p className="text-center text-xs text-gray-400">
                Use the email address or phone number registered by your school.
              </p>
            )}

            <p className="text-center text-sm text-gray-500">
              New school or teacher?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-indigo-600 hover:underline"
              >
                Register here
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
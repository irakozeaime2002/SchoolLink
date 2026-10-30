import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [helpMessage, setHelpMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (loginError) setLoading(false)
  }, [loginError])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setHelpMessage('')
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

  function changeTab(nextTab: Tab) {
    setTab(nextTab)
    setIdentifier('')
    setPassword('')
    setError('')
    setHelpMessage('')
  }

  return (
    <main className="login-page">
      <button
        className="login-back"
        type="button"
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={17} />
        Back to home
      </button>

      <section className="login-card" aria-labelledby="login-title">
        <button
          className="login-brand"
          type="button"
          onClick={() => navigate('/')}
          aria-label="SchoolLink home"
        >
          <span className="login-brand-icon">
            <GraduationCap size={27} />
          </span>
          <span>School<span>Link</span></span>
        </button>

        <div className="login-heading">
          <span className="login-secure-badge">
            <ShieldCheck size={14} />
            SECURE SCHOOL ACCESS
          </span>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to stay connected with your school community.</p>
        </div>

        <div className="login-tabs" role="tablist" aria-label="Account type">
          <button
            className={tab === 'staff' ? 'login-tab login-tab-active' : 'login-tab'}
            type="button"
            role="tab"
            aria-selected={tab === 'staff'}
            onClick={() => changeTab('staff')}
          >
            School staff
          </button>
          <button
            className={tab === 'parent' ? 'login-tab login-tab-active' : 'login-tab'}
            type="button"
            role="tab"
            aria-selected={tab === 'parent'}
            onClick={() => changeTab('parent')}
          >
            Parent
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {(error || loginError) && (
            <div className="login-message login-error" role="alert">
              {error || loginError}
            </div>
          )}

          {helpMessage && (
            <div className="login-message login-help" role="status">
              {helpMessage}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-identifier">
              {tab === 'staff' ? 'Email address' : 'Email or phone number'}
            </label>
            <input
              id="login-identifier"
              type={tab === 'staff' ? 'email' : 'text'}
              required
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={
                tab === 'staff'
                  ? 'you@school.rw'
                  : 'Email address or registered phone'
              }
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
              <button
                className="login-password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <span className="login-option-note">
              Use the account details provided by your school.
            </span>
            <button
              className="login-help-link"
              type="button"
              onClick={() =>
                setHelpMessage(
                  'Please contact your school administrator for help accessing or resetting your password.',
                )
              }
            >
              Need help?
            </button>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && <ArrowRight size={18} />}
          </button>

          {tab === 'parent' && (
            <p className="login-parent-note">
              Use the email address or phone number registered by your school.
            </p>
          )}
        </form>

        <div className="login-divider">
          <span />
          <span>NEW TO SCHOOLLINK?</span>
          <span />
        </div>

        <p className="login-register">
          New school or teacher?{' '}
          <button type="button" onClick={() => navigate('/register')}>
            Register here
          </button>
        </p>

        <p className="login-footer-note">
          Your school information is protected with secure account access.
        </p>
      </section>

      <p className="login-page-caption">
        SchoolLink <span>·</span> Bringing school communities together
      </p>
    </main>
  )
}
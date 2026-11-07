import { ArrowRight, GraduationCap, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupervisor } from '../../context/SupervisorContext'
import { supabase } from '../../lib/supabase'

export default function SupervisorLoginPage() {
  const { setSupervisor } = useSupervisor()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const trimmed = code.trim().toUpperCase()

    const { data, error: err } = await supabase
      .from('supervisors')
      .select('id, name, institution, school_id, expires_at, access_code')
      .eq('access_code', trimmed)
      .maybeSingle()

    if (err) {
      setError(`Query error: ${err.message}`)
      setLoading(false)
      return
    }
    if (!data) {
      setError('Invalid access code. Please check and try again.')
      setLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setError('This access code has expired. Please contact the school.')
      setLoading(false)
      return
    }

    const session = {
      id: data.id,
      name: data.name,
      institution: data.institution,
      school_id: data.school_id,
      expires_at: data.expires_at,
    }
    localStorage.setItem('sl_supervisor', JSON.stringify(session))
    setSupervisor(session)
    navigate('/supervisor')
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="sup-login-title">
        <div className="login-brand">
          <span className="login-brand-icon"><GraduationCap size={27} /></span>
          <span>School<span>Link</span></span>
        </div>

        <div className="login-heading">
          <span className="login-secure-badge">
            <ShieldCheck size={14} /> SUPERVISOR ACCESS
          </span>
          <h1 id="sup-login-title">Enter your access code</h1>
          <p>Use the code provided by the school headteacher.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-message login-error" role="alert">{error}</div>
          )}
          <div className="login-field">
            <label htmlFor="sup-code">Access code</label>
            <input
              id="sup-code"
              type="text"
              required
              autoComplete="off"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3X7YZ2"
              style={{ fontFamily: 'monospace', letterSpacing: '0.15em', fontSize: '1.1rem', textTransform: 'uppercase' }}
              maxLength={8}
            />
          </div>
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Access school'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="login-footer-note">
          Access codes are temporary and provided by the school.
        </p>
      </section>
    </main>
  )
}

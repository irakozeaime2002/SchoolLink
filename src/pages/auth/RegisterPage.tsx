import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Tab = 'headteacher' | 'teacher'

interface School {
  id: string
  name: string
  code: string
}

const emptyHT = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  school_name: '',
  school_code: '',
  school_address: '',
}

const emptyT = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  school_id: '',
  school_name: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('headteacher')
  const [htForm, setHtForm] = useState(emptyHT)
  const [tForm, setTForm] = useState(emptyT)
  const [schools, setSchools] = useState<School[]>([])
  const [schoolSearch, setSchoolSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [schoolsError, setSchoolsError] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSchools() {
      const { data, error: queryError } = await supabase
        .from('schools')
        .select('id, name, code')
        .order('name')

      if (queryError) {
        setSchoolsError('Unable to load schools. Please try again later.')
        console.error('School list error:', queryError)
        return
      }

      setSchools(data ?? [])
    }

    void loadSchools()
  }, [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredSchools = schools.filter((school) => {
    const search = schoolSearch.toLowerCase()
    return (
      school.name.toLowerCase().includes(search) ||
      school.code.toLowerCase().includes(search)
    )
  })

  function changeTab(nextTab: Tab) {
    setTab(nextTab)
    setError('')
    setSuccess('')
    setShowDropdown(false)
    setShowPassword(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const password = tab === 'headteacher' ? htForm.password : tForm.password

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (tab === 'teacher' && !tForm.school_id) {
      setError('Please select a school.')
      return
    }

    const body =
      tab === 'headteacher'
        ? { type: 'headteacher', ...htForm }
        : {
            type: 'teacher',
            full_name: tForm.full_name,
            email: tForm.email,
            password: tForm.password,
            phone: tForm.phone,
            school_id: tForm.school_id,
          }

    setLoading(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        },
      )

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? `Registration failed (${response.status}).`)
      }

      if (tab === 'headteacher') {
        setSuccess('School registered! You can now sign in.')
      } else {
        setSuccess(
          'Request sent! Wait for the headteacher to approve your access.',
        )
      }

      setHtForm(emptyHT)
      setTForm(emptyT)
      setSchoolSearch('')
      setShowPassword(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to register. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page register-page">
      <button
        className="login-back"
        type="button"
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={17} />
        Back to home
      </button>

      <section className="login-card register-card" aria-labelledby="register-title">
        <button
          className="login-brand"
          type="button"
          onClick={() => navigate('/')}
          aria-label="SchoolLink home"
        >
          <span className="login-brand-icon">
            <GraduationCap size={27} />
          </span>
          <span>
            School<span>Link</span>
          </span>
        </button>

        <div className="login-heading register-heading">
          <span className="login-secure-badge">
            <ShieldCheck size={14} />
            JOIN YOUR SCHOOL COMMUNITY
          </span>
          <h1 id="register-title">Create your account</h1>
          <p>Set up a school or request access to an existing one.</p>
        </div>

        <div className="login-tabs" role="tablist" aria-label="Registration type">
          <button
            className={
              tab === 'headteacher' ? 'login-tab login-tab-active' : 'login-tab'
            }
            type="button"
            role="tab"
            aria-selected={tab === 'headteacher'}
            onClick={() => changeTab('headteacher')}
          >
            Register a school
          </button>
          <button
            className={
              tab === 'teacher' ? 'login-tab login-tab-active' : 'login-tab'
            }
            type="button"
            role="tab"
            aria-selected={tab === 'teacher'}
            onClick={() => changeTab('teacher')}
          >
            Join as teacher
          </button>
        </div>

        <form className="login-form register-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-message login-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="login-message register-success" role="status">
              {success}
            </div>
          )}

          {schoolsError && tab === 'teacher' && (
            <div className="login-message login-error" role="alert">
              {schoolsError}
            </div>
          )}

          <div className="register-field-grid">
            <div className="login-field">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={tab === 'headteacher' ? htForm.full_name : tForm.full_name}
                onChange={(event) =>
                  tab === 'headteacher'
                    ? setHtForm((form) => ({
                        ...form,
                        full_name: event.target.value,
                      }))
                    : setTForm((form) => ({
                        ...form,
                        full_name: event.target.value,
                      }))
                }
                placeholder="Your full name"
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-phone">Phone number</label>
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                value={tab === 'headteacher' ? htForm.phone : tForm.phone}
                onChange={(event) =>
                  tab === 'headteacher'
                    ? setHtForm((form) => ({
                        ...form,
                        phone: event.target.value,
                      }))
                    : setTForm((form) => ({
                        ...form,
                        phone: event.target.value,
                      }))
                }
                placeholder="+250 788 000 000"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={tab === 'headteacher' ? htForm.email : tForm.email}
              onChange={(event) =>
                tab === 'headteacher'
                  ? setHtForm((form) => ({
                      ...form,
                      email: event.target.value,
                    }))
                  : setTForm((form) => ({
                      ...form,
                      email: event.target.value,
                    }))
              }
              placeholder="you@school.rw"
            />
          </div>

          <div className="login-field">
            <label htmlFor="register-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={tab === 'headteacher' ? htForm.password : tForm.password}
                onChange={(event) =>
                  tab === 'headteacher'
                    ? setHtForm((form) => ({
                        ...form,
                        password: event.target.value,
                      }))
                    : setTForm((form) => ({
                        ...form,
                        password: event.target.value,
                      }))
                }
                placeholder="At least 6 characters"
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

          <div className="register-section-title">
            <span>
              {tab === 'headteacher' ? 'School information' : 'Choose your school'}
            </span>
          </div>

          {tab === 'headteacher' ? (
            <>
              <div className="login-field">
                <label htmlFor="school-name">School name</label>
                <input
                  id="school-name"
                  type="text"
                  required
                  value={htForm.school_name}
                  onChange={(event) =>
                    setHtForm((form) => ({
                      ...form,
                      school_name: event.target.value,
                    }))
                  }
                  placeholder="e.g. GS Kigali"
                />
              </div>

              <div className="register-field-grid">
                <div className="login-field">
                  <label htmlFor="school-code">School code</label>
                  <input
                    id="school-code"
                    type="text"
                    required
                    value={htForm.school_code}
                    onChange={(event) =>
                      setHtForm((form) => ({
                        ...form,
                        school_code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. GSK001"
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="school-address">School address</label>
                  <input
                    id="school-address"
                    type="text"
                    value={htForm.school_address}
                    onChange={(event) =>
                      setHtForm((form) => ({
                        ...form,
                        school_address: event.target.value,
                      }))
                    }
                    placeholder="District or address"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="login-field" ref={dropdownRef}>
                <label htmlFor="school-search">School</label>
                <div className="register-school-picker">
                  <button
                    id="school-search"
                    className="register-school-trigger"
                    type="button"
                    aria-expanded={showDropdown}
                    onClick={() => setShowDropdown((visible) => !visible)}
                  >
                    <span className={tForm.school_name ? '' : 'register-placeholder'}>
                      {tForm.school_name || 'Search and select your school'}
                    </span>
                    <Search size={17} />
                  </button>

                  {showDropdown && (
                    <div className="register-school-dropdown">
                      <input
                        className="register-search-input"
                        type="search"
                        autoFocus
                        value={schoolSearch}
                        onChange={(event) => setSchoolSearch(event.target.value)}
                        placeholder="Search by school name or code"
                        aria-label="Search schools"
                      />

                      <div className="register-school-results">
                        {filteredSchools.length === 0 ? (
                          <p className="register-no-schools">
                            {schools.length === 0
                              ? 'No schools are available yet.'
                              : 'No matching schools found.'}
                          </p>
                        ) : (
                          filteredSchools.map((school) => (
                            <button
                              key={school.id}
                              className="register-school-option"
                              type="button"
                              onClick={() => {
                                setTForm((form) => ({
                                  ...form,
                                  school_id: school.id,
                                  school_name: `${school.name} (${school.code})`,
                                }))
                                setShowDropdown(false)
                                setSchoolSearch('')
                              }}
                            >
                              <span>{school.name}</span>
                              <small>{school.code}</small>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="register-approval-note">
                Your request will be sent to the headteacher for approval before
                you can access the school.
              </p>
            </>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading
              ? 'Submitting…'
              : tab === 'headteacher'
                ? 'Register school'
                : 'Send access request'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-divider">
          <span />
          <span>ALREADY HAVE AN ACCOUNT?</span>
          <span />
        </div>

        <p className="login-register">
          Welcome back?{' '}
          <button type="button" onClick={() => navigate('/login')}>
            Sign in
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
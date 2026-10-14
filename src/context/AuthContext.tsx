import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  loginError: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  loginError: '',
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Profile fetch error:', error)
      setLoading(false)
      return
    }

    // Block unapproved teachers
    if (data.role === 'teacher' && !data.school_id) {
      await supabase.auth.signOut()
      setLoginError('Your account is pending approval by the headteacher.')
      setLoading(false)
      return
    }

    setLoginError('')
    setUser(data)
    setLoading(false)

    // Navigate to the correct dashboard based on role
    const role = data.role
    const current = window.location.pathname
    if (current === '/login' || current === '/' || current === '') {
      if (role === 'headteacher') navigate('/headteacher')
      else if (role === 'teacher') navigate('/teacher')
      else if (role === 'parent') navigate('/parent')
      else if (role === 'platform_admin') navigate('/admin/dashboard')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, loginError, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

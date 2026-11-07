import { createContext, useContext, useEffect, useRef, useState } from 'react'

export interface SupervisorSession {
  id: string
  name: string
  institution: string
  school_id: string
  expires_at: string
}

interface SupervisorContextType {
  supervisor: SupervisorSession | null
  setSupervisor: (s: SupervisorSession | null) => void
  signOut: () => void
}

const KEY = 'sl_supervisor'

function readFromStorage(): SupervisorSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: SupervisorSession = JSON.parse(raw)
    if (new Date(parsed.expires_at) < new Date()) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const SupervisorContext = createContext<SupervisorContextType>({
  supervisor: null,
  setSupervisor: () => {},
  signOut: () => {},
})

export function SupervisorProvider({ children }: { children: React.ReactNode }) {
  const [supervisor, setSupervisorState] = useState<SupervisorSession | null>(readFromStorage)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setSupervisor(s: SupervisorSession | null) {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
    setSupervisorState(s)
  }

  function signOut() {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(KEY)
    setSupervisorState(null)
  }

  useEffect(() => {
    if (!supervisor) return
    const ms = new Date(supervisor.expires_at).getTime() - Date.now()
    if (ms <= 0) { signOut(); return }
    // setTimeout overflows (fires immediately) for ms > 2^31 (~24.8 days)
    if (ms > 2_147_483_647) return
    timerRef.current = setTimeout(signOut, ms)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [supervisor?.expires_at])

  return (
    <SupervisorContext.Provider value={{ supervisor, setSupervisor, signOut }}>
      {children}
    </SupervisorContext.Provider>
  )
}

export const useSupervisor = () => useContext(SupervisorContext)

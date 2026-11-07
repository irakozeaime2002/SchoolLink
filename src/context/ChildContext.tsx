import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

export interface Child {
  student_id: string
  full_name: string
  class_id: string
  class_name: string
  school_id: string
  school_name: string
  status: string
}

interface ChildContextType {
  children: Child[]
  activeChild: Child | null
  setActiveChild: (c: Child) => void
  loading: boolean
}

const ChildContext = createContext<ChildContextType>({
  children: [], activeChild: null, setActiveChild: () => {}, loading: true,
})

export function ChildProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || user.role !== 'parent') { setLoading(false); return }
    async function load() {
      const { data: links } = await supabase.from('parent_students').select('student_id').eq('parent_id', user!.id)
      const ids = (links ?? []).map((r: any) => r.student_id)
      if (ids.length === 0) { setLoading(false); return }
      const { data } = await supabase
        .from('students')
        .select('id, full_name, status, class_id, school_id, classes(name), schools(name)')
        .in('id', ids)
      const list: Child[] = (data ?? []).map((s: any) => ({
        student_id: s.id,
        full_name: s.full_name ?? '—',
        class_id: s.class_id,
        class_name: s.classes?.name ?? '—',
        school_id: s.school_id ?? '',
        school_name: s.schools?.name ?? '—',
        status: s.status ?? '—',
      }))
      setChildren(list)
      setActiveChild(list[0] ?? null)
      setLoading(false)
    }
    load()
  }, [user?.id])

  return (
    <ChildContext.Provider value={{ children, activeChild, setActiveChild, loading }}>
      {reactChildren}
    </ChildContext.Provider>
  )
}

export const useChild = () => useContext(ChildContext)

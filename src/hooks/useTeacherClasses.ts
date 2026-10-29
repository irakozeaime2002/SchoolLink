import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export interface TeacherClass {
  id: string
  name: string
  /** True when the teacher is the class (form) teacher, false when they only teach a subject in it. */
  isClassTeacher: boolean
}

/** Classes the signed-in teacher can create assessments and enter marks for. */
export function useTeacherClasses() {
  const { user } = useAuth()
  const userId = user?.id
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const [own, taught] = await Promise.all([
        supabase.from('classes').select('id, name').eq('teacher_id', userId!),
        supabase.from('class_subjects').select('classes(id, name)').eq('teacher_id', userId!),
      ])
      if (cancelled) return

      const byId = new Map<string, TeacherClass>()
      ;(own.data ?? []).forEach((c: any) => byId.set(c.id, { id: c.id, name: c.name, isClassTeacher: true }))
      ;(taught.data ?? []).forEach((row: any) => {
        const c = row.classes
        if (c && !byId.has(c.id)) byId.set(c.id, { id: c.id, name: c.name, isClassTeacher: false })
      })

      setClasses(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { classes, loading }
}

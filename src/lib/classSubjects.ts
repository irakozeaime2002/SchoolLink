import { supabase } from './supabase'

export interface SubjectAssignment {
  class_id: string
  subject_id: string
}

/**
 * Assigns `teacherId` to each class+subject pair. class_subjects has no unique key on
 * (class_id, subject_id), so existing rows are reassigned by id and only missing pairs are inserted.
 */
export async function assignClassSubjects(teacherId: string, pairs: SubjectAssignment[]): Promise<string | null> {
  if (pairs.length === 0) return null
  const classIds = [...new Set(pairs.map((p) => p.class_id))]
  const { data: existing, error: loadError } = await supabase
    .from('class_subjects')
    .select('id, class_id, subject_id')
    .in('class_id', classIds)
  if (loadError) return loadError.message

  const idByPair = new Map<string, string>()
  ;(existing ?? []).forEach((row) => {
    const key = `${row.class_id}:${row.subject_id}`
    if (!idByPair.has(key)) idByPair.set(key, row.id)
  })

  const toUpdate: string[] = []
  const toInsert: (SubjectAssignment & { teacher_id: string })[] = []
  pairs.forEach((p) => {
    const id = idByPair.get(`${p.class_id}:${p.subject_id}`)
    if (id) toUpdate.push(id)
    else toInsert.push({ ...p, teacher_id: teacherId })
  })

  const [updateResult, insertResult] = await Promise.all([
    toUpdate.length
      ? supabase.from('class_subjects').update({ teacher_id: teacherId }).in('id', toUpdate)
      : Promise.resolve({ error: null }),
    toInsert.length ? supabase.from('class_subjects').insert(toInsert) : Promise.resolve({ error: null }),
  ])
  return updateResult.error?.message ?? insertResult.error?.message ?? null
}

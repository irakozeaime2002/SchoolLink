import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth header' }), { status: 401, headers: corsHeaders })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) return new Response(JSON.stringify({ error: 'Invalid token', detail: userError?.message }), { status: 401, headers: corsHeaders })

    // Fetch caller profile using service role (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    if (profileError) return new Response(JSON.stringify({ error: 'Profile not found', detail: profileError.message }), { status: 500, headers: corsHeaders })
    if (!profile || !['headteacher', 'platform_admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden', role: profile?.role }), { status: 403, headers: corsHeaders })
    }

    const { full_name, email, password, phone, assignments } = await req.json()
    if (!full_name || !email || !password) {
      return new Response(JSON.stringify({ error: 'full_name, email and password are required' }), { status: 400, headers: corsHeaders })
    }

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'teacher' },
    })
    if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders })

    const teacherId = newUser.user.id

    // Upsert profile — trigger may have created it with null school_id, so force update
    const { error: profileUpsertError } = await adminClient
      .from('profiles')
      .upsert({ id: teacherId, full_name, role: 'teacher', school_id: profile.school_id, phone: phone ?? null })
    if (profileUpsertError) return new Response(JSON.stringify({ error: profileUpsertError.message }), { status: 400, headers: corsHeaders })

    // Also explicitly update in case upsert didn't overwrite
    await adminClient
      .from('profiles')
      .update({ full_name, role: 'teacher', school_id: profile.school_id, phone: phone ?? null })
      .eq('id', teacherId)

    // Insert class_subjects assignments
    if (Array.isArray(assignments) && assignments.length > 0) {
      const rows = assignments.flatMap(({ class_id, subject_ids }: { class_id: string; subject_ids: string[] }) =>
        (subject_ids ?? []).map((subject_id: string) => ({ class_id, subject_id, teacher_id: teacherId }))
      )
      if (rows.length > 0) {
        // class_subjects has no unique key on (class_id, subject_id): reassign existing rows, insert the rest
        const classIds = [...new Set(rows.map((r: { class_id: string }) => r.class_id))]
        const { data: existing, error: loadError } = await adminClient
          .from('class_subjects')
          .select('id, class_id, subject_id')
          .in('class_id', classIds)
        if (loadError) return new Response(JSON.stringify({ error: loadError.message }), { status: 400, headers: corsHeaders })

        const idByPair = new Map<string, string>()
        for (const row of existing ?? []) {
          const key = `${row.class_id}:${row.subject_id}`
          if (!idByPair.has(key)) idByPair.set(key, row.id)
        }
        const toUpdate: string[] = []
        const toInsert: typeof rows = []
        for (const r of rows) {
          const id = idByPair.get(`${r.class_id}:${r.subject_id}`)
          if (id) toUpdate.push(id)
          else toInsert.push(r)
        }

        if (toUpdate.length > 0) {
          const { error } = await adminClient.from('class_subjects').update({ teacher_id: teacherId }).in('id', toUpdate)
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
        }
        if (toInsert.length > 0) {
          const { error } = await adminClient.from('class_subjects').insert(toInsert)
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
        }
      }

      if (assignments.length === 1) {
        await adminClient.from('classes').update({ teacher_id: teacherId }).eq('id', assignments[0].class_id)
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

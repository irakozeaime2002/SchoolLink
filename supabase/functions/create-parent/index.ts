import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: caller } = await adminClient.from('profiles').select('role, school_id').eq('id', user.id).single()
    if (!caller || !['headteacher', 'teacher'].includes(caller.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { student_id, guardian_name, guardian_phone, guardian_email } = await req.json()
    if (!student_id) return new Response(JSON.stringify({ error: 'student_id is required' }), { status: 400, headers: corsHeaders })

    const phone = guardian_phone?.trim() || null
    const email = guardian_email?.trim().toLowerCase() || null
    if (!phone && !email) {
      return new Response(JSON.stringify({ error: 'guardian_phone or guardian_email required' }), { status: 400, headers: corsHeaders })
    }

    // Login email: use real email if given, else derive from phone
    const loginEmail = email ?? `${phone!.replace(/[^a-zA-Z0-9]/g, '')}@schoollink.app`

    // Look up existing parent — by phone OR by login email stored in auth.users
    let parentId: string | null = null

    // 1. Try phone lookup in profiles
    if (phone) {
      const { data } = await adminClient.from('profiles').select('id').eq('phone', phone).eq('role', 'parent').maybeSingle()
      if (data) parentId = data.id
    }

    // 2. Try email lookup via auth admin (single user, not full scan)
    if (!parentId) {
      const { data: authData } = await adminClient.auth.admin.getUserByEmail(loginEmail)
      if (authData?.user) parentId = authData.user.id
    }

    if (parentId) {
      // Existing parent found — just update and link, never create duplicate
      await adminClient.from('profiles').update({
        ...(guardian_name ? { full_name: guardian_name } : {}),
        ...(phone ? { phone } : {}),
        school_id: caller.school_id,
      }).eq('id', parentId)
    } else {
      // No existing parent — create new auth user + profile
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        password: '123456',
        email_confirm: true,
        user_metadata: { full_name: guardian_name ?? 'Parent', role: 'parent' },
      })
      if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders })

      parentId = newUser.user.id

      await adminClient.from('profiles').upsert({
        id: parentId,
        full_name: guardian_name ?? 'Parent',
        role: 'parent',
        school_id: caller.school_id,
        phone,
        must_change_password: true,
      })
    }

    // Link parent to student (upsert — safe to call multiple times)
    const { error: linkError } = await adminClient
      .from('parent_students')
      .upsert({ parent_id: parentId, student_id }, { onConflict: 'parent_id,student_id' })

    if (linkError) return new Response(JSON.stringify({ error: linkError.message }), { status: 400, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true, parent_id: parentId, login_email: loginEmail }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

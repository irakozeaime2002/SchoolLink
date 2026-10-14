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

    // Verify caller is headteacher
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: caller } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!caller || caller.role !== 'headteacher') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { student_id, guardian_name, guardian_phone } = await req.json()
    if (!student_id || !guardian_phone) {
      return new Response(JSON.stringify({ error: 'student_id and guardian_phone are required' }), { status: 400, headers: corsHeaders })
    }

    // Normalize phone
    const phone = guardian_phone.trim()

    // Check if parent account already exists with this phone
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .eq('role', 'parent')
      .single()

    let parentId: string

    if (existingProfile) {
      // Parent already exists — just reuse
      parentId = existingProfile.id
    } else {
      // Create new auth user — use phone as email base
      const sanitized = phone.replace(/[^a-zA-Z0-9]/g, '')
      const email = `${sanitized}@schoollink.app`

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
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
        school_id: null,
        phone,
        must_change_password: true,
      })
    }

    // Link parent to student (ignore if already linked)
    const { error: linkError } = await adminClient
      .from('parent_students')
      .upsert({ parent_id: parentId, student_id }, { onConflict: 'parent_id,student_id' })

    if (linkError) return new Response(JSON.stringify({ error: linkError.message }), { status: 400, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true, parent_id: parentId }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

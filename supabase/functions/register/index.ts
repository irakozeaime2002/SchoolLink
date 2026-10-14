import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { type } = body

    // ── HEADTEACHER REGISTRATION ──────────────────────────────────────────
    if (type === 'headteacher') {
      const { full_name, email, password, phone, school_name, school_code, school_address } = body

      if (!full_name || !email || !password || !school_name || !school_code) {
        return new Response(JSON.stringify({ error: 'full_name, email, password, school_name and school_code are required' }), { status: 400, headers: corsHeaders })
      }

      // Check school code uniqueness
      const { data: existing } = await adminClient.from('schools').select('id').eq('code', school_code).single()
      if (existing) return new Response(JSON.stringify({ error: 'School code already taken' }), { status: 400, headers: corsHeaders })

      // Create auth user
      const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, role: 'headteacher' },
      })
      if (userError) return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders })

      const userId = newUser.user.id

      // Create school
      const { data: school, error: schoolError } = await adminClient.from('schools').insert({
        name: school_name, code: school_code, address: school_address ?? null,
      }).select('id').single()
      if (schoolError) return new Response(JSON.stringify({ error: schoolError.message }), { status: 400, headers: corsHeaders })

      // Upsert profile
      await adminClient.from('profiles').upsert({
        id: userId, full_name, role: 'headteacher',
        school_id: school.id, phone: phone ?? null,
      })

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    // ── TEACHER REGISTRATION ──────────────────────────────────────────────
    if (type === 'teacher') {
      const { full_name, email, password, phone, school_id } = body

      if (!full_name || !email || !password || !school_id) {
        return new Response(JSON.stringify({ error: 'full_name, email, password and school_id are required' }), { status: 400, headers: corsHeaders })
      }

      // Create auth user
      const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, role: 'teacher' },
      })
      if (userError) return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders })

      const userId = newUser.user.id

      // Upsert profile with no school_id yet (pending approval)
      await adminClient.from('profiles').upsert({
        id: userId, full_name, role: 'teacher',
        school_id: null, phone: phone ?? null,
      })

      // Insert teacher request
      const { error: reqError } = await adminClient.from('teacher_requests').insert({
        teacher_id: userId, school_id, full_name, email,
      })
      if (reqError) return new Response(JSON.stringify({ error: reqError.message }), { status: 400, headers: corsHeaders })

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

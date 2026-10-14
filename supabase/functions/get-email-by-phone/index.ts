import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone } = await req.json()
    if (!phone) return new Response(JSON.stringify({ error: 'Phone is required' }), { status: 400, headers: corsHeaders })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find profile by phone with role = parent
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .eq('role', 'parent')
      .single()

    if (error || !profile) {
      return new Response(JSON.stringify({ error: 'No parent account found with this phone number' }), { status: 404, headers: corsHeaders })
    }

    // Get email from auth.users via admin API
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.id)
    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ email: authUser.user.email }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

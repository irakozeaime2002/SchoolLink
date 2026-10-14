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

    const { data: profile } = await adminClient.from('profiles').select('role, school_id').eq('id', user.id).single()
    if (!profile || profile.role !== 'headteacher') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { request_id, action } = await req.json() // action: 'approve' | 'reject'
    if (!request_id || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'request_id and action (approve|reject) are required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch the request and verify it belongs to this headteacher's school
    const { data: request } = await adminClient
      .from('teacher_requests')
      .select('id, teacher_id, school_id')
      .eq('id', request_id)
      .eq('school_id', profile.school_id)
      .eq('status', 'pending')
      .single()

    if (!request) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders })

    if (action === 'approve') {
      // Update teacher profile with school_id
      await adminClient.from('profiles').update({ school_id: profile.school_id }).eq('id', request.teacher_id)
      // Update request status
      await adminClient.from('teacher_requests').update({ status: 'approved' }).eq('id', request_id)
    } else {
      await adminClient.from('teacher_requests').update({ status: 'rejected' }).eq('id', request_id)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

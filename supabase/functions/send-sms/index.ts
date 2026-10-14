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

    // Verify caller
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, school_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['headteacher', 'teacher'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { recipient_id, body } = await req.json()
    if (!recipient_id || !body) {
      return new Response(JSON.stringify({ error: 'recipient_id and body are required' }), { status: 400, headers: corsHeaders })
    }

    // Get recipient phone
    const { data: recipient } = await adminClient
      .from('profiles')
      .select('phone, full_name')
      .eq('id', recipient_id)
      .single()

    if (!recipient?.phone) {
      return new Response(JSON.stringify({ error: 'Recipient has no phone number on record' }), { status: 400, headers: corsHeaders })
    }

    // Send SMS via Africa's Talking
    const AT_API_KEY = Deno.env.get('AT_API_KEY')!
    const AT_USERNAME = Deno.env.get('AT_USERNAME')!

    const formData = new URLSearchParams()
    formData.append('username', AT_USERNAME)
    formData.append('to', recipient.phone)
    formData.append('message', `SchoolLink: ${body}`)
    formData.append('from', 'SchoolLink')

    const smsRes = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    })

    const smsData = await smsRes.json()
    if (!smsRes.ok) {
      return new Response(JSON.stringify({ error: 'SMS failed', detail: smsData }), { status: 400, headers: corsHeaders })
    }

    // Save to messages table with channel = sms
    await adminClient.from('messages').insert({
      school_id: profile.school_id,
      sender_id: user.id,
      recipient_id,
      body,
      channel: 'sms',
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})

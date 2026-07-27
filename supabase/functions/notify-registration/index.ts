// Supabase Edge Function: register-student
//
// Called from the admin dashboard after the client has already inserted
// the student row (client insert uses the RLS "students_insert_admin"
// policy). This function's job is narrower and simpler than a full
// atomic write: it sends the SMS notifications to the parent and the
// admin, and logs the outcome to the notifications table using the
// service role key (so it bypasses RLS by design).
//
// Deploy with:
//   supabase functions deploy notify-registration
//
// Required secrets (set with `supabase secrets set`):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SMS_GATEWAY_URL       -- your local SMS gateway's send endpoint
//   SMS_GATEWAY_API_KEY   -- auth token/key for that gateway
//   ADMIN_NOTIFY_PHONE    -- phone number that receives admin copies

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface NotifyPayload {
  student_id: string
  full_name: string
  admission_number: string
  class_name: string
  parent_name: string
  parent_phone: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SMS_GATEWAY_URL = Deno.env.get('SMS_GATEWAY_URL')!
const SMS_GATEWAY_API_KEY = Deno.env.get('SMS_GATEWAY_API_KEY')!
const ADMIN_NOTIFY_PHONE = Deno.env.get('ADMIN_NOTIFY_PHONE')!

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function sendSms(to: string, message: string): Promise<{ ok: boolean; response: string }> {
  try {
    const res = await fetch(SMS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SMS_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({ to, message }),
    })
    const text = await res.text()
    return { ok: res.ok, response: text }
  } catch (err) {
    return { ok: false, response: String(err) }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: NotifyPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { student_id, full_name, admission_number, class_name, parent_name, parent_phone } = payload

  if (!student_id || !full_name || !parent_phone) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  const parentMessage = `Dear ${parent_name}, ${full_name} (Adm No: ${admission_number}) has been successfully registered in ${class_name}. - School Admin`
  const adminMessage = `New registration: ${full_name} (Adm No: ${admission_number}) added to ${class_name}. Parent: ${parent_name}, ${parent_phone}.`

  const [parentResult, adminResult] = await Promise.all([
    sendSms(parent_phone, parentMessage),
    sendSms(ADMIN_NOTIFY_PHONE, adminMessage),
  ])

  await supabaseAdmin.from('notifications').insert([
    {
      student_id,
      recipient_type: 'parent',
      recipient_phone: parent_phone,
      message: parentMessage,
      status: parentResult.ok ? 'sent' : 'failed',
      provider_response: parentResult.response,
    },
    {
      student_id,
      recipient_type: 'admin',
      recipient_phone: ADMIN_NOTIFY_PHONE,
      message: adminMessage,
      status: adminResult.ok ? 'sent' : 'failed',
      provider_response: adminResult.response,
    },
  ])

  return new Response(
    JSON.stringify({
      parent_sent: parentResult.ok,
      admin_sent: adminResult.ok,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

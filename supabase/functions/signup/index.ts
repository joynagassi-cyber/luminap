import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firstName, lastName, email, password } = await req.json()

    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      'https://hhgovvrnalibhgpakswi.supabase.co',
      'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh'
    )

    // Sign up with Supabase
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'TREASURER',
        },
      },
    })

    if (signUpError) {
      if (signUpError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Cet email est déjà utilisé' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw signUpError
    }

    // Confirm the email by updating the auth.users table directly
    if (signUpData.user) {
      const supabaseAdmin = createClient(
        'https://hhgovvrnalibhgpakswi.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      )
      
      await supabaseAdmin.auth.admin.updateUserById(
        signUpData.user.id,
        { email_confirm: true }
      )
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        user: {
          id: signUpData.user?.id,
          email: signUpData.user?.email,
          firstName,
          lastName,
          role: 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[signup-edge] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur d\'inscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
